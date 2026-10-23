/**
 * Bộ kiểm thử Tự hành VibeSurvey v2.5
 * Autonomous QA & Chaos Bot - Argon Vibe Studio
 * 
 * Kiểm thử đa tầng các tính năng nâng cao v2.5:
 * 1. Form Ingestion Parser (Google Forms, Microsoft Forms, Smart Text Paste)
 * 2. SSRF Protection (Chặn đứng URL nội bộ và domain trái phép 400 Bad Request)
 * 3. Chợ Voucher (Đổi điểm lấy voucher thương hiệu, trừ điểm & lưu ví voucher)
 * 4. Voucher Tài Trợ (Sponsor Vouchers Concurrency Test - 10 submissions đồng thời 0% trùng lặp)
 * 5. Đổi Điểm Sang Credit (+10% thưởng tuần hoàn kinh tế)
 * 6. Matching Engine (Gợi ý khảo sát mục tiêu HUST / NEU hiển thị '🔥 Phù hợp 100%')
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const app = require('../server/app');
const db = require('../server/db/database');
const formParserService = require('../server/services/formParserService');
const voucherService = require('../server/services/voucherService');
const matchingService = require('../server/services/matchingService');
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

async function runV25Tests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ VIBESURVEY V2.5: TÍNH NĂNG MỞ RỘNG & NGOẠI VI');
  console.log('===============================================================');

  // Khởi động server nội bộ trên port ngẫu nhiên
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const creatorEmail = `creator_v25_${uniqueSuffix}@vibetest.vn`;
  const respondentEmail = `respondent_v25_${uniqueSuffix}@vibetest.vn`;
  const password = 'PasswordV25!@#';

  let creatorToken = null;
  let creatorId = null;
  let respondentToken = null;
  let respondentId = null;

  try {
    // 0. Chuẩn bị tài khoản kiểm thử
    const resCreator = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creatorEmail, password, name: 'Creator V25', role: 'CREATOR' })
    });
    const dataCreator = await resCreator.json();
    assert.strictEqual(resCreator.status, 201);
    creatorToken = dataCreator.token;
    creatorId = dataCreator.user.id;

    const resResp = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: respondentEmail, password, name: 'Respondent V25', role: 'RESPONDENT' })
    });
    const dataResp = await resResp.json();
    assert.strictEqual(resResp.status, 201);
    respondentToken = dataResp.token;
    respondentId = dataResp.user.id;

    // =========================================================================
    // TEST 1: Form Ingestion Parser
    // =========================================================================
    await runTest('1. Form Ingestion Parser: Bóc tách Google Forms, Microsoft Forms & Smart Text', async () => {
      // 1.1 Google Forms HTML Mocking (có cấu trúc dữ liệu FB_PUBLIC_LOAD_DATA_)
      const sampleGoogleHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:title" content="Khảo sát Nghiên cứu Tiêu dùng Sinh viên - Google Forms">
          <meta property="og:description" content="Đề tài nghiên cứu hành vi mua sắm online năm 2026">
        </head>
        <body>
          <script>
            var FB_PUBLIC_LOAD_DATA_ = [null, [
              "Đề tài nghiên cứu hành vi mua sắm online năm 2026",
              [
                [101, "Bạn đang học năm thứ mấy?", null, 2, [[null, [["Năm 1"], ["Năm 2"], ["Năm 3"], ["Năm 4"]]]]],
                [102, "Những sàn TMĐT bạn thường mua sắm? (chọn nhiều)", null, 4, [[null, [["Shopee"], ["Lazada"], ["TikTok Shop"], ["Tiki"]]]]],
                [103, "Mức độ hài lòng về tốc độ giao hàng (1 đến 5)", null, 5, null],
                [104, "Đóng góp ý kiến thêm cho đề tài nghiên cứu", null, 0, null]
              ],
              null, null, null, null, null,
              "Khảo sát Nghiên cứu Tiêu dùng Sinh viên"
            ]];
          </script>
        </body>
        </html>
      `;

      const gResult = formParserService.parseGoogleFormsHtml(sampleGoogleHtml, 'https://docs.google.com/forms/d/e/sample/viewform');
      assert.strictEqual(gResult.source, 'GOOGLE_FORM');
      assert.strictEqual(gResult.title, 'Khảo sát Nghiên cứu Tiêu dùng Sinh viên');
      assert.strictEqual(gResult.questionCount, 4);
      assert.strictEqual(gResult.questions[0].type, 'SINGLE_CHOICE');
      assert.strictEqual(gResult.questions[1].type, 'MULTIPLE_CHOICE');
      assert.strictEqual(gResult.questions[2].type, 'LIKERT_SCALE');
      assert.strictEqual(gResult.questions[3].type, 'OPEN_TEXT');
      assert.ok(gResult.embedUrl.includes('embedded=true'));

      // 1.2 Microsoft Forms HTML Mocking
      const sampleMsHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Đánh giá chất lượng dịch vụ căn tin - Microsoft Forms</title>
          <meta property="og:description" content="Khảo sát nội bộ sinh viên trường">
        </head>
        <body><div id="app"></div></body>
        </html>
      `;
      const msResult = formParserService.parseMicrosoftFormsHtml(sampleMsHtml, 'https://forms.office.com/r/sample123');
      assert.strictEqual(msResult.source, 'MICROSOFT_FORM');
      assert.strictEqual(msResult.title, 'Đánh giá chất lượng dịch vụ căn tin');
      assert.ok(msResult.embedUrl.includes('embed=true'));

      // 1.3 Smart Text Paste Parser (Văn bản thô từ Word/Notion)
      const rawText = `
        Khảo sát Thói quen Đọc Sách & Học Tập 2026
        Khảo sát nhằm tìm hiểu thời gian tự học của sinh viên các trường đại học

        Câu 1: Bạn thường đọc sách vào thời gian nào trong ngày?
        A. Buổi sáng sớm
        B. Giờ nghỉ trưa
        C. Buổi tối trước khi ngủ
        D. Bất kỳ lúc nào rảnh

        Câu 2: Bạn thường đọc những thể loại sách nào? (Chọn nhiều)
        - Sách chuyên ngành & học thuật
        - Kỹ năng phát triển bản thân
        - Tiểu thuyết & văn học
        - Truyện tranh / Manga

        Câu 3: Đánh giá mức độ hài lòng về không gian tự học tại thư viện theo thang điểm từ 1 đến 5 sao
        1 - Rất không hài lòng
        5 - Rất hài lòng

        Câu 4: Hãy chia sẻ cuốn sách yêu thích nhất gần đây của bạn và lý do bạn tâm đắc
      `;

      const textResult = formParserService.parseSmartText(rawText);
      assert.strictEqual(textResult.source, 'SMART_PASTE');
      assert.strictEqual(textResult.title, 'Khảo sát Thói quen Đọc Sách & Học Tập 2026');
      assert.strictEqual(textResult.questionCount, 4);
      assert.strictEqual(textResult.questions[0].type, 'SINGLE_CHOICE');
      assert.strictEqual(textResult.questions[0].options.length, 4);
      assert.strictEqual(textResult.questions[1].type, 'MULTIPLE_CHOICE');
      assert.strictEqual(textResult.questions[1].options.length, 4);
      assert.strictEqual(textResult.questions[2].type, 'LIKERT_SCALE');
      assert.strictEqual(textResult.questions[3].type, 'OPEN_TEXT');
    });

    // =========================================================================
    // TEST 2: SSRF Protection
    // =========================================================================
    await runTest('2. SSRF Protection: Chặn đứng URL nội bộ (localhost, 127.0.0.1) trả về 400 Bad Request', async () => {
      const maliciousUrls = [
        'http://localhost/api/v1/admin/fraud-logs',
        'http://localhost:3000/api/v1/admin/fraud-logs',
        'http://127.0.0.1/metrics',
        'http://127.0.0.1:8080/metrics',
        'http://192.168.1.1/admin',
        'http://10.0.0.1/secrets',
        'https://attacker-stealer.xyz/harvest-tokens'
      ];

      for (const badUrl of maliciousUrls) {
        // Kiểm tra qua API endpoint POST /api/v1/surveys/parse-external
        const res = await fetch(`${baseUrl}/surveys/parse-external`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${creatorToken}`
          },
          body: JSON.stringify({ url: badUrl })
        });

        assert.strictEqual(
          res.status,
          400,
          `URL độc hại "${badUrl}" phải bị chặn đứng với HTTP 400 Bad Request, nhưng nhận được ${res.status}`
        );
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.ok(
          data.message.includes('nội bộ') ||
          data.message.includes('không được hỗ trợ') ||
          data.message.includes('an toàn mạng') ||
          data.message.includes('Cổng'),
          `Thông báo lỗi SSRF không đúng: ${data.message}`
        );
      }
    });

    // =========================================================================
    // TEST 3: Chợ Voucher (Catalog Redemption & Wallet Integration)
    // =========================================================================
    await runTest('3. Chợ Voucher: Đổi điểm lấy voucher thương hiệu, trừ điểm & lưu vào ví voucher', async () => {
      // Nạp điểm cho Respondent: 15,000 điểm
      db.prepare('UPDATE users SET point_balance = point_balance + 15000 WHERE id = ?').run(respondentId);

      // 3.1 Xem danh mục voucher thương hiệu
      const resCatalog = await fetch(`${baseUrl}/vouchers/catalog`, {
        headers: { 'Authorization': `Bearer ${respondentToken}` }
      });
      assert.strictEqual(resCatalog.status, 200);
      const dataCatalog = await resCatalog.json();
      assert.strictEqual(dataCatalog.success, true);
      assert.ok(Array.isArray(dataCatalog.vouchers));
      assert.ok(dataCatalog.vouchers.length >= 3, 'Chợ voucher phải có ít nhất 3 thương hiệu');

      // Chọn 1 voucher (ví dụ: Highlands Coffee 50K hoặc Shopee 50K)
      const targetVoucher = dataCatalog.vouchers.find(v => v.points_cost <= 10000 && v.remaining_quantity > 0);
      assert.ok(targetVoucher, 'Phải có voucher khả dụng để đổi');
      const pointsToDeduct = targetVoucher.points_cost;

      const userBefore = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(respondentId);
      const initialPoints = userBefore.point_balance;

      // 3.2 Gọi API đổi voucher
      const resRedeem = await fetch(`${baseUrl}/vouchers/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${respondentToken}`
        },
        body: JSON.stringify({ campaign_id: targetVoucher.id })
      });

      assert.strictEqual(resRedeem.status, 200);
      const dataRedeem = await resRedeem.json();
      assert.strictEqual(dataRedeem.success, true);
      assert.ok(dataRedeem.voucher && dataRedeem.voucher.code, 'Phải nhận được mã voucher hợp lệ');

      // 3.3 Xác nhận trừ điểm chính xác
      const userAfter = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(respondentId);
      assert.strictEqual(userAfter.point_balance, initialPoints - pointsToDeduct);

      // 3.4 Xác nhận voucher đã được lưu vào ví cá nhân (GET /vouchers/my-vouchers)
      const resMyVouchers = await fetch(`${baseUrl}/vouchers/my-vouchers`, {
        headers: { 'Authorization': `Bearer ${respondentToken}` }
      });
      assert.strictEqual(resMyVouchers.status, 200);
      const dataMyVouchers = await resMyVouchers.json();
      assert.strictEqual(dataMyVouchers.success, true);
      const owned = dataMyVouchers.vouchers.find(v => v.code === dataRedeem.voucher.code);
      assert.ok(owned, 'Mã voucher vừa đổi phải xuất hiện trong ví cá nhân');
      assert.strictEqual(owned.status, 'CLAIMED');
    });

    // =========================================================================
    // TEST 4: Voucher Tài Trợ (Sponsor Vouchers) Concurrency Safe
    // =========================================================================
    await runTest('4. Voucher Tài Trợ: Creator nạp 10 mã, 10 người nộp bài đồng thời -> 10 mã khác nhau (0% trùng lặp)', async () => {
      // 4.1 Creator tạo bài khảo sát có quà tặng tài trợ
      const sponsorCodes = [
        'VOUCHER-SPON-001', 'VOUCHER-SPON-002', 'VOUCHER-SPON-003', 'VOUCHER-SPON-004', 'VOUCHER-SPON-005',
        'VOUCHER-SPON-006', 'VOUCHER-SPON-007', 'VOUCHER-SPON-008', 'VOUCHER-SPON-009', 'VOUCHER-SPON-010'
      ];

      const resCreate = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          title: `Khảo sát Nhận Voucher Trà Sữa ${uniqueSuffix}`,
          description: 'Hoàn thành nhận ngay voucher giảm 50%',
          category: 'Ẩm thực & Tiêu dùng',
          target_responses: 10,
          reward_mode: 'VOUCHER_ONLY',
          voucher_data: {
            brand_name: 'Mixue & Phúc Long',
            brand_logo: '🧋',
            title: 'Mã giảm 50% Trà sữa',
            face_value_vnd: 30000,
            instructions: 'Áp dụng tại mọi chi nhánh',
            voucher_codes: sponsorCodes
          },
          questions: [
            {
              order_index: 1,
              type: 'SINGLE_CHOICE',
              content: 'Bạn thích uống trà sữa hay cà phê?',
              options: ['Trà sữa', 'Cà phê', 'Nước ép']
            },
            {
              order_index: 2,
              type: 'SINGLE_CHOICE',
              content: 'Câu hỏi kiểm tra chú ý: Chọn Trà sữa',
              options: ['Trà sữa', 'Cà phê', 'Bia'],
              is_attention_check: 1,
              expected_answer: 'Trà sữa'
            }
          ]
        })
      });

      assert.strictEqual(resCreate.status, 201);
      const dataCreate = await resCreate.json();
      const surveyId = dataCreate.surveyId || (dataCreate.survey && dataCreate.survey.id);

      // Xuất bản khảo sát
      const resPub = await fetch(`${baseUrl}/surveys/${surveyId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${creatorToken}` }
      });
      assert.strictEqual(resPub.status, 200);

      // 4.2 Tạo 10 người dùng làm bài riêng biệt
      const respondents = [];
      for (let i = 1; i <= 10; i++) {
        const uEmail = `resp_concur_${i}_${uniqueSuffix}@vibetest.vn`;
        const resU = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: uEmail, password, name: `Respondent Concur ${i}` })
        });
        const dU = await resU.json();
        respondents.push({ id: dU.user.id, token: dU.token });
      }

      // 4.3 10 người cùng bắt đầu phiên làm bài (start-session)
      const sessionPromises = respondents.map(r =>
        fetch(`${baseUrl}/surveys/${surveyId}/start-session`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${r.token}` }
        }).then(res => res.json())
      );
      const sessionResults = await Promise.all(sessionPromises);
      for (const s of sessionResults) {
        assert.strictEqual(s.success, true, 'Phiên làm bài phải khởi tạo thành công');
      }

      // Lấy ID các câu hỏi để điền đáp án hợp lệ
      const qRes = await fetch(`${baseUrl}/surveys/${surveyId}`, {
        headers: { 'Authorization': `Bearer ${respondents[0].token}` }
      });
      const qData = await qRes.json();
      const q1Id = qData.questions[0].id;
      const q2Id = qData.questions[1].id;

      const validAnswers = {
        [q1Id]: 'Trà sữa',
        [q2Id]: 'Trà sữa' // Đúng câu bẫy
      };

      // 4.4 Giả lập 10 người dùng đồng thời nộp bài (Concurrency Burst)
      const submitPromises = respondents.map(r =>
        fetch(`${baseUrl}/surveys/${surveyId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${r.token}`
          },
          body: JSON.stringify({
            answers: validAnswers,
            duration_sec: 25, // Vượt qua T_min
            device_fingerprint: `fingerprint_${r.id}`
          })
        }).then(res => res.json())
      );

      const submitResults = await Promise.all(submitPromises);

      // 4.5 Kiểm tra kết quả cấp phát voucher
      const claimedCodes = [];
      for (let i = 0; i < submitResults.length; i++) {
        const res = submitResults[i];
        assert.strictEqual(res.success, true, `Bài nộp số ${i + 1} phải thành công: ${res.message}`);
        assert.strictEqual(res.status, 'VALIDATED');
        assert.ok(res.voucherReward, `Người làm ${i + 1} phải nhận được voucher`);
        claimedCodes.push(res.voucherReward.code);
      }

      // Xác nhận 10 người nhận 10 mã KHÁC NHAU (0% trùng lặp)
      const uniqueCodes = new Set(claimedCodes);
      assert.strictEqual(
        uniqueCodes.size,
        10,
        `Phải có 10 mã voucher độc nhất khác nhau, nhưng phát hiện bị trùng lặp: chỉ có ${uniqueCodes.size}/10 mã`
      );

      // Xác nhận kho mã của khảo sát đã cạn (remaining_quantity === 0)
      const surveyCheck = db.prepare('SELECT sponsor_campaign_id FROM surveys WHERE id = ?').get(surveyId);
      const campCheck = db.prepare('SELECT remaining_quantity FROM voucher_campaigns WHERE id = ?').get(surveyCheck.sponsor_campaign_id);
      assert.strictEqual(campCheck.remaining_quantity, 0, 'Kho voucher tài trợ phải còn 0 mã khả dụng');
    });

    // =========================================================================
    // TEST 5: Đổi Điểm Sang Credit (Chiết khấu sàn 30%, nhận ít hơn giá trị gốc: 1 Point = 7 VND Credit)
    // =========================================================================
    await runTest('5. Đổi Điểm Sang Credit: 1,000 điểm đổi thành 7,000đ Credit tạo khảo sát (Chiết khấu sàn 30%)', async () => {
      // Cấp thêm 5,000 điểm cho Respondent
      db.prepare('UPDATE users SET point_balance = point_balance + 5000 WHERE id = ?').run(respondentId);

      const beforeUser = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(respondentId);
      const pointsToSwap = 1000;

      // Gọi API đổi điểm sang credit
      const resSwap = await fetch(`${baseUrl}/wallet/swap-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${respondentToken}`
        },
        body: JSON.stringify({ points_amount: pointsToSwap })
      });

      assert.strictEqual(resSwap.status, 200);
      const dataSwap = await resSwap.json();
      assert.strictEqual(dataSwap.success, true);
      assert.strictEqual(dataSwap.pointsDeducted, 1000);
      // 1,000 điểm * 10 * 0.70 = 7,000 VNĐ Credit
      assert.strictEqual(dataSwap.creditAddedVnd, 7000);

      // Kiểm tra trong DB
      const afterUser = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(respondentId);
      assert.strictEqual(afterUser.point_balance, beforeUser.point_balance - 1000);
      assert.strictEqual(afterUser.credit_balance, beforeUser.credit_balance + 7000);

      // Kiểm tra Sổ cái kế toán ghi nhận
      const tx = db.prepare(`
        SELECT * FROM point_transactions 
        WHERE user_id = ? AND tx_type = 'POINT_TO_CREDIT_SWAP' 
        ORDER BY created_at DESC LIMIT 1
      `).get(respondentId);
      assert.ok(tx, 'Sổ cái phải ghi nhận giao dịch POINT_TO_CREDIT_SWAP');
      assert.ok(tx.description.includes('Chiết khấu sàn 30%') || tx.description.includes('nhận 70%'));
    });

    // =========================================================================
    // TEST 6: Thuật toán Gợi ý Mục tiêu (Matching Engine - HUST / NEU)
    // =========================================================================
    await runTest('6. Matching Engine: Người dùng chọn trường HUST/NEU thấy huy hiệu "🔥 Phù hợp 100%"', async () => {
      // 6.1 Tạo một khảo sát nhắm đích trường Bách Khoa (HUST) và Kinh Tế Quốc Dân (NEU)
      const resCreateTarget = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          title: `Nghiên cứu Việc làm Sinh viên Khối Kỹ thuật & Kinh tế ${uniqueSuffix}`,
          description: 'Dành riêng cho sinh viên Đại học Bách Khoa Hà Nội và Kinh Tế Quốc Dân',
          category: 'Học đường & Nghề nghiệp',
          target_responses: 50,
          reward_mode: 'POINTS_ONLY',
          academic_tags: ['ĐH Bách Khoa', 'Kinh Tế Quốc Dân', 'Khoá luận tốt nghiệp'],
          target_demographics: {
            universities: ['HUST', 'NEU'],
            majors: ['IT_TECH', 'ECONOMICS']
          },
          questions: [
            {
              order_index: 1,
              type: 'SINGLE_CHOICE',
              content: 'Bạn dự định làm việc ở đâu sau khi ra trường?',
              options: ['Doanh nghiệp trong nước', 'Tập đoàn đa quốc gia', 'Khởi nghiệp', 'Du học']
            }
          ]
        })
      });

      assert.strictEqual(resCreateTarget.status, 201);
      const dataCreateTarget = await resCreateTarget.json();
      const targetSurveyId = dataCreateTarget.surveyId || (dataCreateTarget.survey && dataCreateTarget.survey.id);

      // Nạp tiền cho Creator và xuất bản khảo sát sang ACTIVE
      db.prepare('UPDATE users SET credit_balance = credit_balance + 500000 WHERE id = ?').run(creatorId);
      const resPubTarget = await fetch(`${baseUrl}/surveys/${targetSurveyId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${creatorToken}` }
      });
      assert.strictEqual(resPubTarget.status, 200);

      // 6.2 Cập nhật hồ sơ sinh viên Đại học Bách Khoa Hà Nội (HUST)
      const resProfileHust = await fetch(`${baseUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${respondentToken}`
        },
        body: JSON.stringify({
          name: 'Sinh viên Bách Khoa HUST',
          demographics: {
            university_code: 'HUST',
            major_category: 'IT_TECH',
            province_code: 'HN'
          }
        })
      });
      assert.strictEqual(resProfileHust.status, 200);

      // Lấy danh sách khảo sát bằng token của sinh viên HUST
      const resListHust = await fetch(`${baseUrl}/surveys`, {
        headers: { 'Authorization': `Bearer ${respondentToken}` }
      });
      assert.strictEqual(resListHust.status, 200);
      const dataListHust = await resListHust.json();
      const hustSurvey = dataListHust.surveys.find(s => s.id === targetSurveyId);
      assert.ok(hustSurvey, 'Khảo sát mục tiêu phải xuất hiện trên bảng tin');
      assert.strictEqual(
        hustSurvey.matchScore,
        100,
        `Sinh viên HUST phải có matchScore = 100, hiện tại là: ${hustSurvey.matchScore}`
      );
      assert.strictEqual(
        hustSurvey.matchLabel,
        '🔥 Phù hợp 100%',
        `Sinh viên HUST phải nhìn thấy huy hiệu '🔥 Phù hợp 100%', hiện tại là: ${hustSurvey.matchLabel}`
      );

      // 6.3 Tạo tài khoản sinh viên NEU và kiểm tra
      const neuEmail = `neu_student_${uniqueSuffix}@vibetest.vn`;
      const resNeuReg = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: neuEmail,
          password,
          name: 'Sinh viên Kinh Tế NEU',
          role: 'RESPONDENT',
          demographics: {
            university_code: 'NEU',
            major_category: 'ECONOMICS',
            province_code: 'HN'
          }
        })
      });
      const dataNeuReg = await resNeuReg.json();
      assert.strictEqual(resNeuReg.status, 201);
      const neuToken = dataNeuReg.token;

      const resListNeu = await fetch(`${baseUrl}/surveys`, {
        headers: { 'Authorization': `Bearer ${neuToken}` }
      });
      const dataListNeu = await resListNeu.json();
      const neuSurvey = dataListNeu.surveys.find(s => s.id === targetSurveyId);
      assert.ok(neuSurvey, 'Khảo sát phải hiển thị cho sinh viên NEU');
      assert.strictEqual(neuSurvey.matchScore, 100);
      assert.strictEqual(neuSurvey.matchLabel, '🔥 Phù hợp 100%');

      // 6.4 Kiểm tra sinh viên trường khác (không phải HUST/NEU)
      const otherEmail = `fpt_student_${uniqueSuffix}@vibetest.vn`;
      const resFptReg = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otherEmail,
          password,
          name: 'Sinh viên FPT',
          role: 'RESPONDENT',
          demographics: {
            university_code: 'FPT',
            major_category: 'LANGUAGES',
            province_code: 'DN'
          }
        })
      });
      const dataFpt = await resFptReg.json();
      const resListFpt = await fetch(`${baseUrl}/surveys`, {
        headers: { 'Authorization': `Bearer ${dataFpt.token}` }
      });
      const dataListFpt = await resListFpt.json();
      const fptSurvey = dataListFpt.surveys.find(s => s.id === targetSurveyId);
      assert.ok(fptSurvey);
      assert.notStrictEqual(fptSurvey.matchLabel, '🔥 Phù hợp 100%', 'Sinh viên FPT không được hiển thị Phù hợp 100%');
    });

  } finally {
    server.close();
  }

  console.log('---------------------------------------------------------------');
  console.log(`🎉 KIỂM THỬ V2.5 KẾT THÚC: ${passedTests}/${totalTests} BÀI THÀNH CÔNG (100% PASS)`);
  console.log('===============================================================');
}

runV25Tests().catch(err => {
  console.error('\n💥 LỖI KIỂM THỬ V2.5:', err);
  process.exit(1);
});
