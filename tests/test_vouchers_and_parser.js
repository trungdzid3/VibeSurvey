/**
 * Bo kiem thu Tang 3: Voucher System & Form Parser Engine Test
 * Kiem tra Toan ven Cho Voucher, Tai tro Zero Cash Model, Cap phat Atomic,
 * So cai quy doi Diem -> Credit va Chinh sach Form Parser 12 Dinh Dang, SSRF Protection
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const db = require('../server/db/database');
const voucherService = require('../server/services/voucherService');
const formParserService = require('../server/services/formParserService');
const ledgerService = require('../server/services/ledgerService');

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`     Chi tiet loi: ${err.message}`);
    throw err;
  }
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('BAT DAU KIEM THU: HE THONG VOUCHER & FORM PARSER V2.5');
  console.log('===============================================================');

  // Dam bao tat ca cac chien dich PLATFORM_CATALOG co san ma AVAILABLE truoc khi test
  const catalogList = db.prepare("SELECT id, brand_name, remaining_quantity FROM voucher_campaigns WHERE voucher_type = 'PLATFORM_CATALOG'").all();
  for (const cat of catalogList) {
    const availCount = db.prepare("SELECT COUNT(*) as cnt FROM voucher_codes WHERE campaign_id = ? AND status = 'AVAILABLE'").get(cat.id);
    if (!availCount || availCount.cnt === 0) {
      for (let i = 1; i <= 20; i++) {
        const codeStr = `TEST-${cat.brand_name.replace(/\s+/g, '').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        db.prepare("INSERT INTO voucher_codes (id, campaign_id, code, status) VALUES (?, ?, ?, 'AVAILABLE')").run('vc_' + crypto.randomUUID(), cat.id, codeStr);
      }
      db.prepare("UPDATE voucher_campaigns SET remaining_quantity = 20 WHERE id = ?").run(cat.id);
    }
  }

  // Khoi tao cac tai khoan thu nghiem
  const testCreatorId = 'vtest_creator_' + crypto.randomUUID();
  const testRespondentId = 'vtest_respondent_' + crypto.randomUUID();
  const testSurveyId = 'vtest_survey_' + crypto.randomUUID();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Voucher Tester Creator', 'CREATOR', 100000.0, 0, 100.0, 'ACTIVE')
  `).run(testCreatorId, `creator_v_${Date.now()}@test.local`);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Voucher Tester Respondent', 'RESPONDENT', 0.0, 15000, 100.0, 'ACTIVE')
  `).run(testRespondentId, `respondent_v_${Date.now()}@test.local`);

  // ==========================================
  // KHOI 1: CHO VOUCHER CATALOG THUONG HIEU
  // ==========================================
  console.log('\n--- KHOI 1: CHO VOUCHER CATALOG THUONG HIEU ---');

  await runTest('1. Khoi tao Catalog Voucher tu dong (6 Thuong hieu lon)', async () => {
    const catalog = voucherService.listCatalogVouchers();
    assert(Array.isArray(catalog), 'Catalog phai la danh sach mang');
    assert(catalog.length >= 6, `Catalog phai co it nhat 6 thuong hieu (Hien co: ${catalog.length})`);

    const brands = catalog.map(c => c.brand_name);
    assert(brands.includes('Shopee'), 'Thieu thuong hieu Shopee');
    assert(brands.includes('Grab'), 'Thieu thuong hieu Grab');
    assert(brands.includes('Highlands Coffee'), 'Thieu thuong hieu Highlands Coffee');
    assert(brands.includes('Phuc Long') || brands.includes('Phúc Long'), 'Thieu thuong hieu Phuc Long');
    assert(brands.includes('CGV Cinemas'), 'Thieu thuong hieu CGV Cinemas');
    assert(brands.includes('Starbucks'), 'Thieu thuong hieu Starbucks');

    // Kiem tra so luong con lai
    for (const item of catalog) {
      assert(item.remaining_quantity > 0, `Thuong hieu ${item.brand_name} phai co ma san sang`);
      assert(item.points_cost > 0, 'Voucher catalog phai co diem quy doi');
    }
  });

  await runTest('2. Doi Voucher Catalog thanh cong & Ghi so cai Double-Entry', async () => {
    const initialUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(testRespondentId);
    const initialPoints = initialUser.point_balance; // 15,000

    const grabCampaign = db.prepare("SELECT id, points_cost, remaining_quantity FROM voucher_campaigns WHERE id = 'cat_grab_30k' OR (brand_name = 'Grab' AND voucher_type = 'PLATFORM_CATALOG') LIMIT 1").get();
    assert(grabCampaign, 'Phai co chien dich Grab');

    const result = voucherService.redeemCatalogVoucher(testRespondentId, grabCampaign.id);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.pointsDeducted, grabCampaign.points_cost);
    assert.strictEqual(result.newPointBalance, initialPoints - grabCampaign.points_cost);
    assert(result.voucher && result.voucher.code, 'Phai nhan duoc ma voucher');

    // Kiem tra DB nguoi dung bi tru diem
    const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(testRespondentId);
    assert.strictEqual(updatedUser.point_balance, initialPoints - grabCampaign.points_cost);

    // Kiem tra ma voucher chuyen trang thai CLAIMED va gan dung user_id
    const codeRow = db.prepare('SELECT * FROM voucher_codes WHERE code = ?').get(result.voucher.code);
    assert.strictEqual(codeRow.status, 'CLAIMED');
    assert.strictEqual(codeRow.claimed_by_user_id, testRespondentId);

    // Kiem tra so luong con lai giam 1
    const updatedCampaign = db.prepare('SELECT remaining_quantity FROM voucher_campaigns WHERE id = ?').get(grabCampaign.id);
    assert.strictEqual(updatedCampaign.remaining_quantity, grabCampaign.remaining_quantity - 1);

    // Kiem tra so cai ke toan ghi nhan
    const tx = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND reference_id = ? AND tx_type = 'PAYOUT_DEDUCT'").get(testRespondentId, codeRow.id);
    assert(tx, 'Phai ghi so cai khau tru diem doi voucher');
    assert.strictEqual(tx.amount, -grabCampaign.points_cost);
    assert.strictEqual(tx.balance_after, updatedUser.point_balance);
  });

  await runTest('3. Chan doi Voucher khi so du diem khong du', async () => {
    const poorUserId = 'vtest_poor_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
      VALUES (?, ?, 'hash', 'Poor User', 'RESPONDENT', 0, 500, 100.0, 'ACTIVE')
    `).run(poorUserId, `poor_${Date.now()}@test.local`);

    const cgvCampaign = db.prepare("SELECT id FROM voucher_campaigns WHERE id = 'cat_cgv_100k' OR (brand_name = 'CGV Cinemas' AND voucher_type = 'PLATFORM_CATALOG') LIMIT 1").get();
    assert.throws(() => {
      voucherService.redeemCatalogVoucher(poorUserId, cgvCampaign.id);
    }, /Bạn cần .* điểm để đổi voucher này/);

    const user = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(poorUserId);
    assert.strictEqual(user.point_balance, 500);
  });

  // ==========================================
  // KHOI 2: CREATOR TAI TRO VOUCHER (ZERO CASH)
  // ==========================================
  console.log('\n--- KHOI 2: TAI TRO VOUCHER (ZERO CASH MODEL) ---');

  let testSponsorCampaignId = null;

  await runTest('4. Creator tai len danh sach ma tai tro (Zero Cash Model)', async () => {
    const codes = [
      'LINH-FASHION-50K-01',
      'LINH-FASHION-50K-02',
      'LINH-FASHION-50K-03',
      'LINH-FASHION-50K-04',
      'LINH-FASHION-50K-05'
    ];

    const campaignData = {
      brand_name: 'Linh Fashion Store',
      brand_logo: '/assets/logos/linh-fashion.png',
      title: 'Voucher Giam 50K cho don hang thoi trang tu 200K',
      face_value_vnd: 50000,
      instructions: 'Nhap ma tai website linhfashion.vn hoac doc ma tai cua hang.',
      expiry_date: '2026-12-31'
    };

    const res = voucherService.createSponsorVoucherCampaign(testCreatorId, campaignData, codes);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalCodes, 5);
    testSponsorCampaignId = res.campaignId;

    // Kiem tra DB
    const campaign = db.prepare('SELECT * FROM voucher_campaigns WHERE id = ?').get(testSponsorCampaignId);
    assert.strictEqual(campaign.voucher_type, 'CREATOR_SPONSORED');
    assert.strictEqual(campaign.points_cost, 0);
    assert.strictEqual(campaign.total_quantity, 5);
    assert.strictEqual(campaign.remaining_quantity, 5);

    const codeCount = db.prepare('SELECT COUNT(*) as cnt FROM voucher_codes WHERE campaign_id = ? AND status = ?').get(testSponsorCampaignId, 'AVAILABLE');
    assert.strictEqual(codeCount.cnt, 5);
  });

  await runTest('5. Cap phat NGUYEN TU (Atomic) voucher cho nguoi lam bai khao sat', async () => {
    db.prepare(`
      INSERT INTO surveys (id, creator_id, title, description, category, target_responses, collected_responses, cost_per_response, reward_points_per_response, status)
      VALUES (?, ?, 'Survey For Voucher Test', 'Desc', 'Test', 10, 0, 0, 0, 'ACTIVE')
    `).run(testSurveyId, testCreatorId);

    const fakeResponseId1 = 'resp_' + crypto.randomUUID();
    const fakeResponseId2 = 'resp_' + crypto.randomUUID();

    const anotherRespondentId = 'vtest_resp2_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
      VALUES (?, ?, 'hash', 'Voucher Tester Respondent 2', 'RESPONDENT', 0.0, 0, 100.0, 'ACTIVE')
    `).run(anotherRespondentId, `respondent2_v_${Date.now()}@test.local`);

    db.prepare(`
      INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
      VALUES (?, ?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)
    `).run(fakeResponseId1, testSurveyId, testRespondentId);

    db.prepare(`
      INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
      VALUES (?, ?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)
    `).run(fakeResponseId2, testSurveyId, anotherRespondentId);

    // Nguoi 1 nhan voucher
    const claim1 = voucherService.claimVoucherForResponse(testSurveyId, testSponsorCampaignId, testRespondentId, fakeResponseId1);
    assert.strictEqual(claim1.claimed, true);
    assert.strictEqual(claim1.isNew, true);
    assert(claim1.voucher && claim1.voucher.code.startsWith('LINH-FASHION-50K-'));

    // Chon cap trung (Idempotency)
    const claim1Again = voucherService.claimVoucherForResponse(testSurveyId, testSponsorCampaignId, testRespondentId, fakeResponseId1);
    assert.strictEqual(claim1Again.claimed, true);
    assert.strictEqual(claim1Again.isNew, false);
    assert.strictEqual(claim1Again.voucher.code, claim1.voucher.code);

    // Nguoi 2 nhan voucher -> ma khac biet hoan toan
    const claim2 = voucherService.claimVoucherForResponse(testSurveyId, testSponsorCampaignId, anotherRespondentId, fakeResponseId2);
    assert.strictEqual(claim2.claimed, true);
    assert.strictEqual(claim2.isNew, true);
    assert.notStrictEqual(claim2.voucher.code, claim1.voucher.code);

    const updatedCamp = db.prepare('SELECT remaining_quantity FROM voucher_campaigns WHERE id = ?').get(testSponsorCampaignId);
    assert.strictEqual(updatedCamp.remaining_quantity, 3);
  });

  await runTest('6. Lay danh sach Voucher nguoi dung so huu (getUserVouchers)', async () => {
    const myVouchers = voucherService.getUserVouchers(testRespondentId);
    assert(Array.isArray(myVouchers), 'Phai la mang');
    assert(myVouchers.length >= 2, `Phai co it nhat 2 voucher da nhan (Hien co: ${myVouchers.length})`);

    const hasGrab = myVouchers.some(v => v.brand_name === 'Grab');
    const hasLinhFashion = myVouchers.some(v => v.brand_name === 'Linh Fashion Store');
    assert(hasGrab, 'Thieu voucher Grab trong vi');
    assert(hasLinhFashion, 'Thieu voucher Linh Fashion trong vi');
  });

  // ==========================================
  // KHOI 3: FORM PARSER SERVICE (SSRF & SMART PASTE)
  // ==========================================
  console.log('\n--- KHOI 3: FORM PARSER SERVICE & 12 DINH DANG ---');

  await runTest('7. Whitelist an toan chong SSRF (SSRF Protection)', async () => {
    const validGoogle = formParserService.validateFormUrl('https://docs.google.com/forms/d/e/1FAIpQLScXYZ/viewform');
    assert.strictEqual(validGoogle.isValid, true);
    assert.strictEqual(validGoogle.isGoogle, true);

    const validOffice = formParserService.validateFormUrl('https://forms.office.com/r/ABC1234');
    assert.strictEqual(validOffice.isValid, true);
    assert.strictEqual(validOffice.isMicrosoft, true);

    assert.throws(() => {
      formParserService.validateFormUrl('http://localhost/admin');
    }, /Truy cập địa chỉ nội bộ bị từ chối/);

    assert.throws(() => {
      formParserService.validateFormUrl('http://127.0.0.1:3000');
    }, /Cổng .* không được phép|Truy cập địa chỉ nội bộ bị từ chối/);

    assert.throws(() => {
      formParserService.validateFormUrl('http://192.168.1.1/router');
    }, /Truy cập địa chỉ nội bộ bị từ chối/);

    assert.throws(() => {
      formParserService.validateFormUrl('https://evil-hacker.com/malicious-form');
    }, /không được hỗ trợ/);
  });

  await runTest('8. Google Forms: Boc tach FB_PUBLIC_LOAD_DATA_ nhan dien day du 12 dang cau hoi & co is_required', async () => {
    const sampleGoogleHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Khao Sat Nghiên Cứu Tổng Hợp 12 Định Dạng - Google Forms">
        <meta property="og:description" content="Khao sat do luong chat luong nghien cuu">
      </head>
      <body>
        <script>
          var FB_PUBLIC_LOAD_DATA_ = [null, [
            "Mô tả khảo sát nghiên cứu khoa học",
            [
              [1, "Họ và tên của bạn?", null, 0, [[10, null, 1]]],
              [2, "Mô tả chi tiết quá trình học tập của bạn", null, 1, [[11, null, 0]]],
              [3, "Giới tính của bạn?", null, 2, [[12, [["Nam"], ["Nữ"], ["Khác"]], 1]]],
              [4, "Chọn tỉnh thành bạn đang sinh sống", null, 3, [[13, [["Hà Nội"], ["TP.HCM"], ["Đà Nẵng"]], 1]]],
              [5, "Các thiết bị bạn sở hữu (chọn nhiều)", null, 4, [[14, [["Laptop"], ["Điện thoại"], ["Tablet"]], 0]]],
              [6, "Mức độ hài lòng chung (1 đến 5)", null, 5, [[15, [["1"], ["2"], ["3"], ["4"], ["5"]], 1, ["Rất tệ", "Rất tốt"]]]],
              [7, "Ma trận đánh giá tiêu chí dịch vụ (Lưới trắc nghiệm)", null, 7, [
                [21, [["Kém"], ["Đạt"], ["Tốt"]], 1, ["Thái độ phục vụ"]],
                [22, [["Kém"], ["Đạt"], ["Tốt"]], 1, ["Tốc độ giao hàng"]]
              ]],
              [8, "Ma trận tiện ích sử dụng theo buổi (Lưới hộp kiểm)", null, 7, [
                [31, [["Sáng"], ["Trưa"], ["Tối"]], 0, ["Đọc sách"], null, null, null, null, null, null, null, 1],
                [32, [["Sáng"], ["Trưa"], ["Tối"]], 0, ["Tập gym"], null, null, null, null, null, null, null, 1]
              ]],
              [9, "Ngày bắt đầu kỳ học", null, 9, [[16, null, 1]]],
              [10, "Khung giờ bạn rảnh rỗi nhất", null, 10, [[17, null, 0]]],
              [11, "Tải lên ảnh thẻ sinh viên hoặc bảng điểm", null, 13, [[18, null, 1]]],
              [12, "Xếp hạng chất lượng ứng dụng theo số sao", null, 18, [[19, null, 1]]]
            ],
            null, null, null, null, null,
            "Khao Sat Nghiên Cứu Tổng Hợp 12 Định Dạng"
          ]];
        </script>
      </body>
      </html>
    `;

    const result = formParserService.parseGoogleFormsHtml(sampleGoogleHtml, 'https://docs.google.com/forms/d/e/1FAIpQLScMock/viewform');

    assert.strictEqual(result.source, 'GOOGLE_FORM');
    assert.strictEqual(result.title, 'Khao Sat Nghiên Cứu Tổng Hợp 12 Định Dạng');
    assert.strictEqual(result.questionCount, 12);

    // 0 -> SHORT_TEXT (required = 1)
    assert.strictEqual(result.questions[0].type, 'SHORT_TEXT');
    assert.strictEqual(result.questions[0].is_required, 1);

    // 1 -> PARAGRAPH (required = 0)
    assert.strictEqual(result.questions[1].type, 'PARAGRAPH');
    assert.strictEqual(result.questions[1].is_required, 0);

    // 2 -> SINGLE_CHOICE
    assert.strictEqual(result.questions[2].type, 'SINGLE_CHOICE');
    assert.strictEqual(result.questions[2].options.length, 3);
    assert.strictEqual(result.questions[2].is_required, 1);

    // 3 -> DROPDOWN
    assert.strictEqual(result.questions[3].type, 'DROPDOWN');
    assert.strictEqual(result.questions[3].options.length, 3);
    assert.strictEqual(result.questions[3].is_required, 1);

    // 4 -> MULTIPLE_CHOICE
    assert.strictEqual(result.questions[4].type, 'MULTIPLE_CHOICE');
    assert.strictEqual(result.questions[4].options.length, 3);
    assert.strictEqual(result.questions[4].is_required, 0);

    // 5 -> LINEAR_SCALE
    assert.strictEqual(result.questions[5].type, 'LINEAR_SCALE');
    assert.strictEqual(result.questions[5].options.length, 5);
    assert.strictEqual(result.questions[5].is_required, 1);

    // 7 -> CHOICE_GRID (Luoi trac nghiem)
    assert.strictEqual(result.questions[6].type, 'CHOICE_GRID');
    assert.deepStrictEqual(result.questions[6].rows, ['Thái độ phục vụ', 'Tốc độ giao hàng']);
    assert.deepStrictEqual(result.questions[6].columns, ['Kém', 'Đạt', 'Tốt']);
    assert.strictEqual(result.questions[6].is_required, 1);

    // 7 -> CHECKBOX_GRID (Luoi hop kiem, item[4][0][11] === 1)
    assert.strictEqual(result.questions[7].type, 'CHECKBOX_GRID');
    assert.deepStrictEqual(result.questions[7].rows, ['Đọc sách', 'Tập gym']);
    assert.deepStrictEqual(result.questions[7].columns, ['Sáng', 'Trưa', 'Tối']);
    assert.strictEqual(result.questions[7].is_required, 0);

    // 9 -> DATE_INPUT
    assert.strictEqual(result.questions[8].type, 'DATE_INPUT');
    assert.strictEqual(result.questions[8].is_required, 1);

    // 10 -> TIME_INPUT
    assert.strictEqual(result.questions[9].type, 'TIME_INPUT');
    assert.strictEqual(result.questions[9].is_required, 0);

    // 13 -> FILE_UPLOAD
    assert.strictEqual(result.questions[10].type, 'FILE_UPLOAD');
    assert.strictEqual(result.questions[10].is_required, 1);

    // 18 -> RATING_STARS
    assert.strictEqual(result.questions[11].type, 'RATING_STARS');
    assert.strictEqual(result.questions[11].is_required, 1);
  });

  await runTest('9. Microsoft Forms: Boc tach runtimeForms/OfficeFormServerInfo (Choice, TextField, Rating, Matrix/Likert, DateTime, FileUpload)', async () => {
    const sampleMsHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Khảo sát ý kiến sinh viên NEU - Microsoft Forms</title>
        <meta property="og:description" content="Khao sat danh gia chat luong dao tao">
      </head>
      <body>
        <script>
          var runtimeForms = {
            title: "Khảo sát ý kiến sinh viên NEU",
            description: "Khao sat danh gia chat luong dao tao",
            questions: [
              {
                title: "Năm học hiện tại của bạn?",
                type: "Question.Choice",
                required: true,
                choices: [{ description: "Năm 1" }, { description: "Năm 2" }, { description: "Năm 3" }, { description: "Năm 4" }]
              },
              {
                title: "Các môn học bạn yêu thích? (Chọn nhiều)",
                type: "Question.Choice",
                multiSelection: true,
                required: false,
                choices: [{ description: "Toán cao cấp" }, { description: "Kinh tế vi mô" }, { description: "Lập trình" }]
              },
              {
                title: "Góp ý chi tiết về giảng viên",
                type: "Question.TextField",
                isMultiline: true,
                required: false
              },
              {
                title: "Đánh giá chất lượng cơ sở vật chất (Sao)",
                type: "Question.Rating",
                ratingType: "Star",
                required: true
              },
              {
                title: "Ma trận đánh giá các phòng ban",
                type: "Question.MatrixChoiceGroup",
                required: true,
                rows: ["Phòng đào tạo", "Căn tin", "Thư viện"],
                columns: ["Rất kém", "Trung bình", "Rất tốt"]
              },
              {
                title: "Ngày dự kiến tốt nghiệp",
                type: "Question.DateTime",
                required: true
              },
              {
                title: "Tải lên chứng chỉ ngoại ngữ",
                type: "Question.FileUpload",
                required: false
              }
            ]
          };
        </script>
      </body>
      </html>
    `;

    const result = formParserService.parseMicrosoftFormsHtml(sampleMsHtml, 'https://forms.office.com/r/MockOffice123');

    assert.strictEqual(result.source, 'MICROSOFT_FORM');
    assert.strictEqual(result.title, 'Khảo sát ý kiến sinh viên NEU');
    assert.strictEqual(result.questionCount, 7);

    // Question 1: Choice single
    assert.strictEqual(result.questions[0].type, 'SINGLE_CHOICE');
    assert.strictEqual(result.questions[0].is_required, 1);
    assert.strictEqual(result.questions[0].options.length, 4);

    // Question 2: Choice multi
    assert.strictEqual(result.questions[1].type, 'MULTIPLE_CHOICE');
    assert.strictEqual(result.questions[1].is_required, 0);
    assert.strictEqual(result.questions[1].options.length, 3);

    // Question 3: TextField multiline -> PARAGRAPH
    assert.strictEqual(result.questions[2].type, 'PARAGRAPH');
    assert.strictEqual(result.questions[2].is_required, 0);

    // Question 4: Rating Star -> RATING_STARS
    assert.strictEqual(result.questions[3].type, 'RATING_STARS');
    assert.strictEqual(result.questions[3].is_required, 1);

    // Question 5: MatrixChoiceGroup -> CHOICE_GRID
    assert.strictEqual(result.questions[4].type, 'CHOICE_GRID');
    assert.strictEqual(result.questions[4].is_required, 1);
    assert.deepStrictEqual(result.questions[4].rows, ['Phòng đào tạo', 'Căn tin', 'Thư viện']);
    assert.deepStrictEqual(result.questions[4].columns, ['Rất kém', 'Trung bình', 'Rất tốt']);

    // Question 6: DateTime -> DATE_INPUT
    assert.strictEqual(result.questions[5].type, 'DATE_INPUT');
    assert.strictEqual(result.questions[5].is_required, 1);

    // Question 7: FileUpload -> FILE_UPLOAD
    assert.strictEqual(result.questions[6].type, 'FILE_UPLOAD');
    assert.strictEqual(result.questions[6].is_required, 0);
  });

  await runTest('10. Smart Text Paste Parser: Nhan dien trac nghiem, hop kiem, ma tran Hang x Cot va co bat buoc (*)', async () => {
    const rawDocumentText = `
Khảo Sát Hành Vi Trà Sữa Giới Trẻ 2026
Mô tả: Nghiên cứu thói quen tiêu dùng thức uống tại khu vực TP. Hồ Chí Minh

Câu 1. Bạn thuộc nhóm tuổi nào? *
A. Dưới 18 tuổi
B. 18 đến 24 tuổi
C. 25 đến 30 tuổi
D. Trên 30 tuổi

Câu 2. Bạn thường uống trà sữa của những thương hiệu nào? (chọn nhiều đáp án)
- Phúc Long
- Highlands Coffee
- Gong Cha
- Koi Thé
- Khác

3. Đánh giá mức độ hài lòng của bạn về giá cả đồ uống hiện nay (thang điểm 1 đến 5) *

4. Bạn có góp ý gì để các quán trà sữa nâng cao trải nghiệm khách hàng không?

Câu 5: Đánh giá chất lượng dịch vụ theo từng tiêu chí *
Hàng:
- Không gian quán
- Thái độ nhân viên
- Tốc độ phục vụ
Cột:
- Rất kém
- Kém
- Hài lòng
- Rất hài lòng

Câu 6: Tiện ích bạn mong muốn bổ sung (Lưới hộp kiểm chọn nhiều)
Hàng: Quán A, Quán B | Cột: Giao hàng tận nơi, Chỗ đậu xe, Wi-Fi mạnh
    `.trim();

    const parsed = formParserService.parseSmartText(rawDocumentText);

    assert.strictEqual(parsed.source, 'SMART_PASTE');
    assert.strictEqual(parsed.title, 'Khảo Sát Hành Vi Trà Sữa Giới Trẻ 2026');
    assert.strictEqual(parsed.description, 'Nghiên cứu thói quen tiêu dùng thức uống tại khu vực TP. Hồ Chí Minh');
    assert.strictEqual(parsed.questionCount, 6);

    // Câu 1: SINGLE_CHOICE co dau * -> is_required = 1
    const q1 = parsed.questions[0];
    assert.strictEqual(q1.order_index, 1);
    assert.strictEqual(q1.type, 'SINGLE_CHOICE');
    assert.strictEqual(q1.content, 'Bạn thuộc nhóm tuổi nào?');
    assert.strictEqual(q1.is_required, 1);
    assert.strictEqual(q1.options.length, 4);

    // Câu 2: MULTIPLE_CHOICE khong co dau * -> is_required = 0
    const q2 = parsed.questions[1];
    assert.strictEqual(q2.order_index, 2);
    assert.strictEqual(q2.type, 'MULTIPLE_CHOICE');
    assert(q2.content.includes('thương hiệu nào'));
    assert.strictEqual(q2.is_required, 0);
    assert.strictEqual(q2.options.length, 5);

    // Câu 3: LINEAR_SCALE co dau * -> is_required = 1
    const q3 = parsed.questions[2];
    assert.strictEqual(q3.order_index, 3);
    assert.strictEqual(q3.type, 'LINEAR_SCALE');
    assert.strictEqual(q3.is_required, 1);

    // Câu 4: SHORT_TEXT
    const q4 = parsed.questions[3];
    assert.strictEqual(q4.order_index, 4);
    assert.strictEqual(q4.type, 'SHORT_TEXT');
    assert.strictEqual(q4.is_required, 0);
    assert.strictEqual(q4.options, null);

    // Câu 5: CHOICE_GRID ma tran hang x cot co dau * -> is_required = 1
    const q5 = parsed.questions[4];
    assert.strictEqual(q5.order_index, 5);
    assert.strictEqual(q5.type, 'CHOICE_GRID');
    assert.strictEqual(q5.is_required, 1);
    assert.deepStrictEqual(q5.rows, ['Không gian quán', 'Thái độ nhân viên', 'Tốc độ phục vụ']);
    assert.deepStrictEqual(q5.columns, ['Rất kém', 'Kém', 'Hài lòng', 'Rất hài lòng']);

    // Câu 6: CHECKBOX_GRID ma tran hop kiem inline
    const q6 = parsed.questions[5];
    assert.strictEqual(q6.order_index, 6);
    assert.strictEqual(q6.type, 'CHECKBOX_GRID');
    assert.deepStrictEqual(q6.rows, ['Quán A', 'Quán B']);
    assert.deepStrictEqual(q6.columns, ['Giao hàng tận nơi', 'Chỗ đậu xe', 'Wi-Fi mạnh']);
  });

  // ==========================================
  // KHOI 4: QUY DOI DIEM SANG CREDIT
  // ==========================================
  console.log('\n--- KHOI 4: VI DIEM SANG CREDIT TAO KHAO SAT ---');

  await runTest('11. Quy doi Diem sang Credit tao khao sat (Chuan 1:1 VND, thuong tai dau tu +5%)', async () => {
    const userBefore = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(testRespondentId);
    const swapPoints = 5000;

    const swapRes = ledgerService.swapPointsToCredit(testRespondentId, swapPoints);
    assert.strictEqual(swapRes.success, true);
    assert.strictEqual(swapRes.pointsDeducted, 5000);
    assert.strictEqual(swapRes.creditAddedVnd, 5250);
    assert.strictEqual(swapRes.newPointBalance, userBefore.point_balance - 5000);
    assert.strictEqual(swapRes.newCreditBalance, userBefore.credit_balance + 5250);

    const userAfter = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(testRespondentId);
    assert.strictEqual(userAfter.point_balance, userBefore.point_balance - 5000);
    assert.strictEqual(userAfter.credit_balance, userBefore.credit_balance + 5250);

    const tx = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND tx_type = 'POINT_TO_CREDIT_SWAP' ORDER BY created_at DESC LIMIT 1").get(testRespondentId);
    assert(tx, 'Phai co giao dich POINT_TO_CREDIT_SWAP trong so cai');
    assert.strictEqual(tx.amount, -5000);
  });

  console.log('\n===============================================================');
  console.log(`TAT CA ${passedTests}/${totalTests} BAI KIEM THU DA VUOT QUA XUAT SAC!`);
  console.log('===============================================================\n');
}

runAllTests().catch((err) => {
  console.error('\nBO KIEM THU GAP LOI:', err);
  process.exit(1);
});
