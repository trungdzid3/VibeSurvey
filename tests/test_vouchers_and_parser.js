/**
 * Bộ kiểm thử Tầng 3: Voucher System & Form Parser Engine Test
 * Kiểm tra Toàn vẹn Chợ Voucher, Tài trợ Zero Cash Model, Cấp phát Atomic,
 * Sổ cái quy đổi Điểm -> Credit và Chống gian lận / SSRF Biểu mẫu
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
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Chi tiết lỗi: ${err.message}`);
    throw err;
  }
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('🎁 BẮT ĐẦU KIỂM THỬ: HỆ THỐNG VOUCHER & FORM PARSER V2.5');
  console.log('===============================================================');

  // Khởi tạo các tài khoản thử nghiệm
  const testCreatorId = 'vtest_creator_' + crypto.randomUUID();
  const testRespondentId = 'vtest_respondent_' + crypto.randomUUID();
  const testSurveyId = 'vtest_survey_' + crypto.randomUUID();
  const testZeroCashSurveyId = 'vtest_survey_zerocash_' + crypto.randomUUID();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Voucher Tester Creator', 'CREATOR', 100000.0, 0, 100.0, 'ACTIVE')
  `).run(testCreatorId, `creator_v_${Date.now()}@test.local`);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Voucher Tester Respondent', 'RESPONDENT', 0.0, 15000, 100.0, 'ACTIVE')
  `).run(testRespondentId, `respondent_v_${Date.now()}@test.local`);

  // ==========================================
  // KHỐI 1: CHỢ VOUCHER CATALOG THƯƠNG HIỆU
  // ==========================================
  console.log('\n--- KHỐI 1: CHỢ VOUCHER CATALOG THƯƠNG HIỆU ---');

  await runTest('1. Khởi tạo Catalog Voucher tự động (6 Thương hiệu lớn)', async () => {
    const catalog = voucherService.listCatalogVouchers();
    assert(Array.isArray(catalog), 'Catalog phải là danh sách mảng');
    assert(catalog.length >= 6, `Catalog phải có ít nhất 6 thương hiệu (Hiện có: ${catalog.length})`);

    const brands = catalog.map(c => c.brand_name);
    assert(brands.includes('Shopee'), 'Thiếu thương hiệu Shopee');
    assert(brands.includes('Grab'), 'Thiếu thương hiệu Grab');
    assert(brands.includes('Highlands Coffee'), 'Thiếu thương hiệu Highlands Coffee');
    assert(brands.includes('Phúc Long'), 'Thiếu thương hiệu Phúc Long');
    assert(brands.includes('CGV Cinemas'), 'Thiếu thương hiệu CGV Cinemas');
    assert(brands.includes('Starbucks'), 'Thiếu thương hiệu Starbucks');

    // Kiểm tra số lượng còn lại
    for (const item of catalog) {
      assert(item.remaining_quantity > 0, `Thương hiệu ${item.brand_name} phải có mã sẵn sàng`);
      assert(item.points_cost > 0, `Voucher catalog phải có điểm quy đổi`);
    }
  });

  await runTest('2. Đổi Voucher Catalog thành công & Ghi sổ cái Double-Entry', async () => {
    const initialUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(testRespondentId);
    const initialPoints = initialUser.point_balance; // 15,000

    const grabCampaign = db.prepare("SELECT id, points_cost, remaining_quantity FROM voucher_campaigns WHERE id = 'cat_grab_30k'").get();
    assert(grabCampaign, 'Phải có chiến dịch Grab');

    const result = voucherService.redeemCatalogVoucher(testRespondentId, grabCampaign.id);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.pointsDeducted, grabCampaign.points_cost); // 3,000
    assert.strictEqual(result.newPointBalance, initialPoints - grabCampaign.points_cost); // 12,000
    assert(result.voucher && result.voucher.code, 'Phải nhận được mã voucher');

    // Kiểm tra DB người dùng bị trừ điểm
    const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(testRespondentId);
    assert.strictEqual(updatedUser.point_balance, initialPoints - grabCampaign.points_cost);

    // Kiểm tra mã voucher chuyển trạng thái CLAIMED và gán đúng user_id
    const codeRow = db.prepare('SELECT * FROM voucher_codes WHERE code = ?').get(result.voucher.code);
    assert.strictEqual(codeRow.status, 'CLAIMED');
    assert.strictEqual(codeRow.claimed_by_user_id, testRespondentId);

    // Kiểm tra số lượng còn lại giảm 1
    const updatedCampaign = db.prepare('SELECT remaining_quantity FROM voucher_campaigns WHERE id = ?').get(grabCampaign.id);
    assert.strictEqual(updatedCampaign.remaining_quantity, grabCampaign.remaining_quantity - 1);

    // Kiểm tra sổ cái kế toán ghi nhận
    const tx = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND reference_id = ? AND tx_type = 'PAYOUT_DEDUCT'").get(testRespondentId, codeRow.id);
    assert(tx, 'Phải ghi sổ cái khấu trừ điểm đổi voucher');
    assert.strictEqual(tx.amount, -grabCampaign.points_cost);
    assert.strictEqual(tx.balance_after, updatedUser.point_balance);
  });

  await runTest('3. Chặn đổi Voucher khi số dư điểm không đủ', async () => {
    // Tạo user nghèo điểm
    const poorUserId = 'vtest_poor_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
      VALUES (?, ?, 'hash', 'Poor User', 'RESPONDENT', 0, 500, 100.0, 'ACTIVE')
    `).run(poorUserId, `poor_${Date.now()}@test.local`);

    // Thử đổi voucher CGV 100K cần 10,000 điểm
    assert.throws(() => {
      voucherService.redeemCatalogVoucher(poorUserId, 'cat_cgv_100k');
    }, /Bạn cần .* điểm để đổi voucher này/);

    // Số dư điểm người dùng không đổi
    const user = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(poorUserId);
    assert.strictEqual(user.point_balance, 500);
  });

  // ==========================================
  // KHỐI 2: CREATOR TÀI TRỢ VOUCHER (ZERO CASH)
  // ==========================================
  console.log('\n--- KHỐI 2: TÀI TRỢ VOUCHER (ZERO CASH MODEL) ---');

  let testSponsorCampaignId = null;

  await runTest('4. Creator tải lên danh sách mã tài trợ (Zero Cash Model)', async () => {
    const codes = [
      'LINH-FASHION-50K-01',
      'LINH-FASHION-50K-02',
      'LINH-FASHION-50K-03',
      'LINH-FASHION-50K-04',
      'LINH-FASHION-50K-05'
    ];

    const campaignData = {
      brand_name: 'Linh Fashion Store',
      brand_logo: '👗',
      title: 'Voucher Giảm 50K cho đơn hàng thời trang từ 200K',
      face_value_vnd: 50000,
      instructions: 'Nhập mã tại website linhfashion.vn hoặc đọc mã tại cửa hàng.',
      expiry_date: '2026-12-31'
    };

    const res = voucherService.createSponsorVoucherCampaign(testCreatorId, campaignData, codes);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalCodes, 5);
    testSponsorCampaignId = res.campaignId;

    // Kiểm tra DB
    const campaign = db.prepare('SELECT * FROM voucher_campaigns WHERE id = ?').get(testSponsorCampaignId);
    assert.strictEqual(campaign.voucher_type, 'CREATOR_SPONSORED');
    assert.strictEqual(campaign.points_cost, 0); // Quà tặng miễn phí kèm khảo sát
    assert.strictEqual(campaign.total_quantity, 5);
    assert.strictEqual(campaign.remaining_quantity, 5);

    const codeCount = db.prepare('SELECT COUNT(*) as cnt FROM voucher_codes WHERE campaign_id = ? AND status = ?').get(testSponsorCampaignId, 'AVAILABLE');
    assert.strictEqual(codeCount.cnt, 5);
  });

  await runTest('5. Cấp phát NGUYÊN TỬ (Atomic) voucher cho người làm bài khảo sát', async () => {
    // Tạo khảo sát thử nghiệm
    db.prepare(`
      INSERT INTO surveys (id, creator_id, title, description, category, target_responses, collected_responses, cost_per_response, reward_points_per_response, status)
      VALUES (?, ?, 'Survey For Voucher Test', 'Desc', 'Test', 10, 0, 0, 0, 'ACTIVE')
    `).run(testSurveyId, testCreatorId);

    // Tạo 2 bản ghi responses hợp lệ trong CSDL để tuân thủ khóa ngoại Foreign Key
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

    // Người làm bài 1 nhận voucher
    const claim1 = voucherService.claimVoucherForResponse(testSurveyId, testSponsorCampaignId, testRespondentId, fakeResponseId1);
    assert.strictEqual(claim1.claimed, true);
    assert.strictEqual(claim1.isNew, true);
    assert(claim1.voucher && claim1.voucher.code.startsWith('LINH-FASHION-50K-'));

    // Chống cấp trùng (Idempotency): Gọi lại cho responseId1 phải trả về cùng mã cũ
    const claim1Again = voucherService.claimVoucherForResponse(testSurveyId, testSponsorCampaignId, testRespondentId, fakeResponseId1);
    assert.strictEqual(claim1Again.claimed, true);
    assert.strictEqual(claim1Again.isNew, false);
    assert.strictEqual(claim1Again.voucher.code, claim1.voucher.code);

    // Người làm bài 2 nhận voucher -> phải nhận mã khác hoàn toàn (100% không trùng)
    const claim2 = voucherService.claimVoucherForResponse(testSurveyId, testSponsorCampaignId, anotherRespondentId, fakeResponseId2);
    assert.strictEqual(claim2.claimed, true);
    assert.strictEqual(claim2.isNew, true);
    assert.notStrictEqual(claim2.voucher.code, claim1.voucher.code);

    // Số lượng còn lại phải là 3 (5 ban đầu - 2 đã phát)
    const updatedCamp = db.prepare('SELECT remaining_quantity FROM voucher_campaigns WHERE id = ?').get(testSponsorCampaignId);
    assert.strictEqual(updatedCamp.remaining_quantity, 3);
  });

  await runTest('6. Lấy danh sách Voucher người dùng sở hữu (getUserVouchers)', async () => {
    const myVouchers = voucherService.getUserVouchers(testRespondentId);
    assert(Array.isArray(myVouchers), 'Phải là mảng');
    assert(myVouchers.length >= 2, `Phải có ít nhất 2 voucher đã nhận (Hiện có: ${myVouchers.length})`);

    const hasGrab = myVouchers.some(v => v.brand_name === 'Grab');
    const hasLinhFashion = myVouchers.some(v => v.brand_name === 'Linh Fashion Store');
    assert(hasGrab, 'Thiếu voucher Grab trong ví');
    assert(hasLinhFashion, 'Thiếu voucher Linh Fashion trong ví');
  });

  // ==========================================
  // KHỐI 3: FORM PARSER SERVICE (SSRF & SMART PASTE)
  // ==========================================
  console.log('\n--- KHỐI 3: FORM PARSER & SMART PASTE ENGINE ---');

  await runTest('7. Whitelist an toàn chống SSRF (SSRF Protection)', async () => {
    // 1. Tên miền hợp lệ
    const validGoogle = formParserService.validateFormUrl('https://docs.google.com/forms/d/e/1FAIpQLScXYZ/viewform');
    assert.strictEqual(validGoogle.isValid, true);
    assert.strictEqual(validGoogle.isGoogle, true);

    const validOffice = formParserService.validateFormUrl('https://forms.office.com/r/ABC1234');
    assert.strictEqual(validOffice.isValid, true);
    assert.strictEqual(validOffice.isMicrosoft, true);

    // 2. Chặn các URL nguy hiểm, IP nội bộ và domain lạ
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

  await runTest('8. Smart Text Paste Parser: Tự động nhận diện cấu trúc câu hỏi đa dạng', async () => {
    const rawDocumentText = `
Khảo Sát Hành Vi Trà Sữa Giới Trẻ 2026
Mô tả: Nghiên cứu thói quen tiêu dùng thức uống tại khu vực TP. Hồ Chí Minh

Câu 1. Bạn thuộc nhóm tuổi nào?
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

3. Đánh giá mức độ hài lòng của bạn về giá cả đồ uống hiện nay (thang điểm 1 đến 5)

4. Bạn có góp ý gì để các quán trà sữa nâng cao trải nghiệm khách hàng không?
    `.trim();

    const parsed = formParserService.parseSmartText(rawDocumentText);

    assert.strictEqual(parsed.source, 'SMART_PASTE');
    assert.strictEqual(parsed.title, 'Khảo Sát Hành Vi Trà Sữa Giới Trẻ 2026');
    assert.strictEqual(parsed.description, 'Nghiên cứu thói quen tiêu dùng thức uống tại khu vực TP. Hồ Chí Minh');
    assert.strictEqual(parsed.questionCount, 4);

    // Câu 1: SINGLE_CHOICE
    const q1 = parsed.questions[0];
    assert.strictEqual(q1.order_index, 1);
    assert.strictEqual(q1.type, 'SINGLE_CHOICE');
    assert.strictEqual(q1.content, 'Bạn thuộc nhóm tuổi nào?');
    assert.strictEqual(q1.options.length, 4);

    // Câu 2: MULTIPLE_CHOICE
    const q2 = parsed.questions[1];
    assert.strictEqual(q2.order_index, 2);
    assert.strictEqual(q2.type, 'MULTIPLE_CHOICE');
    assert(q2.content.includes('thương hiệu nào'));
    assert.strictEqual(q2.options.length, 5);

    // Câu 3: LIKERT_SCALE
    const q3 = parsed.questions[2];
    assert.strictEqual(q3.order_index, 3);
    assert.strictEqual(q3.type, 'LIKERT_SCALE');
    assert.strictEqual(q3.options.length, 5);

    // Câu 4: OPEN_TEXT
    const q4 = parsed.questions[3];
    assert.strictEqual(q4.order_index, 4);
    assert.strictEqual(q4.type, 'OPEN_TEXT');
    assert.strictEqual(q4.options, null);
  });

  // ==========================================
  // KHỐI 4: QUY ĐỔI ĐIỂM SANG CREDIT (POINT-TO-CREDIT SWAP)
  // ==========================================
  console.log('\n--- KHỐI 4: VÍ ĐIỂM SANG CREDIT TẠO KHẢO SÁT ---');

  await runTest('9. Quy đổi Điểm sang Credit tạo khảo sát (Chiết khấu sàn 30%, nhận 70%)', async () => {
    // testRespondentId hiện đang có điểm
    const userBefore = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(testRespondentId);
    const swapPoints = 2000;

    const swapRes = ledgerService.swapPointsToCredit(testRespondentId, swapPoints);
    assert.strictEqual(swapRes.success, true);
    assert.strictEqual(swapRes.pointsDeducted, 2000);
    // 2000 điểm * 10 đ * 0.70 = 14,000 VND credit
    assert.strictEqual(swapRes.creditAddedVnd, 14000);
    assert.strictEqual(swapRes.newPointBalance, userBefore.point_balance - 2000);
    assert.strictEqual(swapRes.newCreditBalance, userBefore.credit_balance + 14000);

    // Kiểm tra DB
    const userAfter = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(testRespondentId);
    assert.strictEqual(userAfter.point_balance, userBefore.point_balance - 2000);
    assert.strictEqual(userAfter.credit_balance, userBefore.credit_balance + 14000);

    // Kiểm tra Sổ cái
    const tx = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND tx_type = 'POINT_TO_CREDIT_SWAP' ORDER BY created_at DESC LIMIT 1").get(testRespondentId);
    assert(tx, 'Phải có giao dịch POINT_TO_CREDIT_SWAP trong sổ cái');
    assert.strictEqual(tx.amount, -2000);
  });

  console.log('\n===============================================================');
  console.log(`🎉 TẤT CẢ ${passedTests}/${totalTests} BÀI KIỂM THỬ ĐÃ VƯỢT QUA XUẤT SẮC!`);
  console.log('===============================================================\n');
}

runAllTests().catch((err) => {
  console.error('\n❌ BỘ KIỂM THỬ GẶP LỖI:', err);
  process.exit(1);
});
