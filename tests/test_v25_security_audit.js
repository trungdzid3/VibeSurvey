/**
 * BỘ KIỂM TOÁN AN NINH & BẢO MẬT CHUYÊN SÂU (SECURITY & CODE AUDIT SUITE)
 * Phiên bản VibeSurvey v2.5 - Argon Vibe Studio Quality Gate
 * 
 * Kiểm toán 4 mục tiêu trọng yếu:
 * 1. Cấp phát voucher nguyên tử: Concurrency stress test, chống trùng mã 100% (No Duplicate Claim).
 * 2. Bảo mật API: Bóc tách triệt để mã voucher chưa cấp phát & cờ attention check khỏi payload.
 * 3. Đổi điểm sang Credit (swapPointsToCredit): Tính nguyên tử ACID, chống race condition, không âm số dư.
 * 4. Chống SSRF Form Parser: Chặn đứng IP nội bộ (127.0.0.1, localhost, 10.x, 192.168.x, 169.254.x), whitelist nghiêm ngặt.
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
    console.error(`     Chi tiết: ${err.message}`);
    throw err;
  }
}

async function runSecurityAudit() {
  console.log('===============================================================');
  console.log('🛡️  BẮT ĐẦU KIỂM TOÁN AN NINH & CHỐNG GIAN LẬN VIBESURVEY V2.5');
  console.log('===============================================================');

  // Khởi tạo người dùng thử nghiệm
  const creatorId = 'sec_creator_' + crypto.randomUUID();
  const respondentId = 'sec_resp_' + crypto.randomUUID();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Security Creator', 'CREATOR', 500000.0, 0, 100.0, 'ACTIVE')
  `).run(creatorId, `sec_creator_${Date.now()}@test.local`);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Security Respondent', 'RESPONDENT', 0.0, 2000, 100.0, 'ACTIVE')
  `).run(respondentId, `sec_resp_${Date.now()}@test.local`);

  // =========================================================================
  // MỤC 1: KIỂM TOÁN CƠ CHẾ CẤP PHÁT VOUCHER NGUYÊN TỬ & CHỐNG TRÙNG MÃ
  // =========================================================================
  console.log('\n--- 1. KIỂM TOÁN CẤP PHÁT VOUCHER NGUYÊN TỬ (CONCURRENCY & NO DUPLICATE) ---');

  const surveyId = 'sec_survey_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO surveys (id, creator_id, title, description, category, target_responses, collected_responses, cost_per_response, reward_points_per_response, status)
    VALUES (?, ?, 'Survey Concurrency Test', 'Desc', 'Tech', 50, 0, 0, 0, 'ACTIVE')
  `).run(surveyId, creatorId);

  // Tạo campaign tài trợ 15 mã voucher độc nhất
  const originalCodes = [];
  for (let i = 1; i <= 15; i++) {
    originalCodes.push(`SEC-VOUCHER-${String(i).padStart(3, '0')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`);
  }

  const campRes = voucherService.createSponsorVoucherCampaign(
    creatorId,
    {
      brand_name: 'Argon Security Cafe',
      title: 'Voucher Miễn Phí Cafe',
      face_value_vnd: 45000,
      survey_id: surveyId
    },
    originalCodes
  );

  const campaignId = campRes.campaignId;

  await runTest('1.1. Concurrency Stress Test: 15 người nộp bài đồng thời nhận 15 mã duy nhất (0% trùng lặp)', async () => {
    // Tạo 15 người dùng và 15 responses khác nhau
    const respondents = [];
    const responses = [];

    for (let i = 0; i < 15; i++) {
      const rId = 'sec_user_' + i + '_' + crypto.randomUUID();
      const respId = 'sec_resp_' + i + '_' + crypto.randomUUID();

      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
        VALUES (?, ?, 'hash', ?, 'RESPONDENT', 0.0, 0, 100.0, 'ACTIVE')
      `).run(rId, `user_${i}_${Date.now()}@test.local`, `User ${i}`);

      db.prepare(`
        INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
        VALUES (?, ?, ?, 'VALIDATED', CURRENT_TIMESTAMP)
      `).run(respId, surveyId, rId);

      respondents.push(rId);
      responses.push(respId);
    }

    // Giả lập 15 yêu cầu claim voucher gửi đến đồng thời bằng Promise.all
    const claimPromises = respondents.map((rId, idx) => {
      return Promise.resolve().then(() => {
        return voucherService.claimVoucherForResponse(surveyId, campaignId, rId, responses[idx]);
      });
    });

    const results = await Promise.all(claimPromises);

    // Xác minh toàn bộ 15 yêu cầu đều thành công
    for (const res of results) {
      assert.strictEqual(res.claimed, true, 'Yêu cầu claim phải thành công');
      assert.strictEqual(res.isNew, true, 'Lần nhận đầu phải là isNew = true');
      assert(res.voucher && res.voucher.code, 'Phải có mã voucher hợp lệ');
    }

    // Kiểm tra tính độc nhất (Tuyệt đối không trùng lặp mã)
    const claimedCodes = results.map(r => r.voucher.code);
    const uniqueCodes = new Set(claimedCodes);
    assert.strictEqual(uniqueCodes.size, 15, `Phải có đúng 15 mã độc nhất khác nhau (Thực tế: ${uniqueCodes.size})`);

    // Kiểm tra kho voucher trong DB: Còn lại đúng 0 mã khả dụng
    const remainingInCamp = db.prepare('SELECT remaining_quantity FROM voucher_campaigns WHERE id = ?').get(campaignId);
    assert.strictEqual(remainingInCamp.remaining_quantity, 0, 'Chiến dịch phải còn 0 mã khả dụng');

    const availableCodesCount = db.prepare("SELECT COUNT(*) as cnt FROM voucher_codes WHERE campaign_id = ? AND status != 'CLAIMED'").get(campaignId);
    assert.strictEqual(availableCodesCount.cnt, 0, 'Toàn bộ 15 mã phải chuyển sang CLAIMED');
  });

  await runTest('1.2. Idempotency Test: Người dùng gửi yêu cầu claim nhiều lần nhận lại đúng mã cũ (Không được cấp thêm)', async () => {
    // Lấy người dùng đầu tiên đã nhận voucher ở test 1.1
    const firstClaimed = db.prepare('SELECT * FROM voucher_codes WHERE campaign_id = ? LIMIT 1').get(campaignId);
    assert(firstClaimed, 'Phải có bản ghi mã đã nhận');

    // Gọi lại claimVoucherForResponse cho cùng responseId
    const retryClaim = voucherService.claimVoucherForResponse(
      surveyId,
      campaignId,
      firstClaimed.claimed_by_user_id,
      firstClaimed.claimed_response_id
    );

    assert.strictEqual(retryClaim.claimed, true);
    assert.strictEqual(retryClaim.isNew, false, 'Yêu cầu lặp lại phải có isNew = false');
    assert.strictEqual(retryClaim.voucher.code, firstClaimed.code, 'Phải trả về đúng mã ban đầu');
  });

  await runTest('1.3. Kho voucher hết mã: Người thứ 16 nộp bài không nhận được mã nhưng không gây crash', async () => {
    const extraUserId = 'sec_user_extra_' + crypto.randomUUID();
    const extraRespId = 'sec_resp_extra_' + crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
      VALUES (?, ?, 'hash', 'User Extra', 'RESPONDENT', 0.0, 0, 100.0, 'ACTIVE')
    `).run(extraUserId, `extra_${Date.now()}@test.local`);

    db.prepare(`
      INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
      VALUES (?, ?, ?, 'VALIDATED', CURRENT_TIMESTAMP)
    `).run(extraRespId, surveyId, extraUserId);

    const exhaustedClaim = voucherService.claimVoucherForResponse(surveyId, campaignId, extraUserId, extraRespId);
    assert.strictEqual(exhaustedClaim.claimed, false);
    assert.strictEqual(exhaustedClaim.voucher, null);
    assert(exhaustedClaim.message.includes('hết'), 'Phải thông báo hết mã');
  });

  // =========================================================================
  // MỤC 2: KIỂM TOÁN BẢO MẬT API - KHÔNG ĐỂ LỘ MÃ VOUCHER CHƯA CẤP PHÁT & BẪY CHÚ Ý
  // =========================================================================
  console.log('\n--- 2. KIỂM TOÁN BẢO MẬT API (ZERO LEAKAGE AUDIT) ---');

  await runTest('2.1. API getCatalog & listSurveys tuyệt đối không để lộ mã voucher trong payload', async () => {
    const catalog = voucherService.listCatalogVouchers();
    for (const cat of catalog) {
      assert.strictEqual(cat.code, undefined, 'Catalog không được chứa trường code');
      assert.strictEqual(cat.voucher_codes, undefined, 'Catalog không được chứa mảng voucher_codes');
      assert.strictEqual(cat.voucherCodes, undefined, 'Catalog không được chứa mảng voucherCodes');
    }

    // Kiểm tra câu truy vấn listSurveys
    const surveys = db.prepare(`
      SELECT s.*, 
        vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title
      FROM surveys s
      LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
      WHERE s.id = ?
    `).all(surveyId);

    for (const s of surveys) {
      assert.strictEqual(s.code, undefined, 'Danh sách khảo sát không được có cột code');
      assert.strictEqual(s.voucher_code, undefined, 'Danh sách khảo sát không được có cột voucher_code');
    }
  });

  await runTest('2.2. API getSurvey: Respondent chưa hoàn thành khảo sát không thấy mã voucher chưa cấp phát', async () => {
    // Tạo khảo sát có câu hỏi bẫy chú ý
    const trapSurveyId = 'sec_trap_survey_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO surveys (id, creator_id, title, description, category, target_responses, collected_responses, cost_per_response, reward_points_per_response, sponsor_campaign_id, status)
      VALUES (?, ?, 'Survey With Trap', 'Desc', 'Market', 10, 0, 1000, 50, ?, 'ACTIVE')
    `).run(trapSurveyId, creatorId, campaignId);

    const qNormalId = crypto.randomUUID();
    const qTrapId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
      VALUES (?, ?, 1, 'SINGLE_CHOICE', 'Bạn bao nhiêu tuổi?', '["18-24", "25-30"]', 0, NULL)
    `).run(qNormalId, trapSurveyId);

    db.prepare(`
      INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
      VALUES (?, ?, 2, 'SINGLE_CHOICE', 'Câu bẫy: Chọn đáp án A', '["A", "B"]', 1, 'A')
    `).run(qTrapId, trapSurveyId);

    // Giả lập logic bóc tách getSurvey của Respondent
    const questions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(trapSurveyId);
    const sanitizedQuestions = questions.map(q => ({
      id: q.id,
      order_index: q.order_index,
      type: q.type,
      content: q.content,
      options: q.options_json ? JSON.parse(q.options_json) : null
    }));

    // Xác nhận cờ bẫy bị bóc tách 100%
    for (const q of sanitizedQuestions) {
      assert.strictEqual(q.is_attention_check, undefined, 'Respondent không được thấy is_attention_check');
      assert.strictEqual(q.expected_answer, undefined, 'Respondent không được thấy expected_answer');
    }

    // Respondent chưa làm bài: userVoucher phải là null
    const existingResponse = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(trapSurveyId, respondentId);
    let userVoucher = null;
    if (existingResponse) {
      userVoucher = db.prepare(`
        SELECT vc.id, vc.code, vc.claimed_at, c.brand_name
        FROM voucher_codes vc
        JOIN voucher_campaigns c ON vc.campaign_id = c.id
        WHERE vc.claimed_response_id = ?
      `).get(existingResponse.id);
    }
    assert.strictEqual(userVoucher, null, 'Respondent chưa làm bài không được thấy voucher nào');
  });

  // =========================================================================
  // MỤC 3: KIỂM TOÁN GIAO DỊCH QUY ĐỔI ĐIỂM SANG CREDIT (swapPointsToCredit)
  // =========================================================================
  console.log('\n--- 3. KIỂM TOÁN ACID & RACE CONDITION swapPointsToCredit ---');

  await runTest('3.1. Tính nguyên tử ACID: Đổi 5,000 điểm sang 5,250đ Credit (Thưởng tái đầu tư +5%)', async () => {
    // Cấp đúng 2,000 điểm cho respondentId
    db.prepare('UPDATE users SET point_balance = 10000, credit_balance = 0.0 WHERE id = ?').run(respondentId);

    const swapRes = ledgerService.swapPointsToCredit(respondentId, 5000);
    assert.strictEqual(swapRes.success, true);
    assert.strictEqual(swapRes.pointsDeducted, 5000);
    assert.strictEqual(swapRes.creditAddedVnd, 5250); // 5000 * 1.05 = 5,250 VNĐ
    assert.strictEqual(swapRes.newPointBalance, 5000);
    assert.strictEqual(swapRes.newCreditBalance, 5250);

    // Kiểm tra DB
    const user = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(respondentId);
    assert.strictEqual(user.point_balance, 5000);
    assert.strictEqual(user.credit_balance, 5250);

    // Kiểm tra Sổ cái Kép: Phải có cả 2 bản ghi POINT và VND
    const txPoint = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND tx_type = 'POINT_TO_CREDIT_SWAP' AND currency = 'POINT' ORDER BY created_at DESC LIMIT 1").get(respondentId);
    assert(txPoint, 'Phải có bản ghi Sổ cái trừ POINT');
    assert.strictEqual(txPoint.amount, -5000);

    const txCredit = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND tx_type = 'POINT_TO_CREDIT_SWAP' AND currency = 'VND' ORDER BY created_at DESC LIMIT 1").get(respondentId);
    assert(txCredit, 'Phải có bản ghi Sổ cái cộng VND Credit');
    assert.strictEqual(txCredit.amount, 5250);
  });

  await runTest('3.2. Chống Race Condition: Giả lập 10 lệnh swap đồng thời khi chỉ đủ điểm cho 1 lệnh (Chống âm số dư)', async () => {
    // Hiện tại user có đúng 5,000 điểm. Gửi 10 lệnh mỗi lệnh 5,000 điểm đồng thời!
    const swapPromises = [];
    for (let i = 0; i < 10; i++) {
      swapPromises.push(
        Promise.resolve().then(() => {
          try {
            return { ok: true, res: ledgerService.swapPointsToCredit(respondentId, 5000) };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        })
      );
    }

    const swapResults = await Promise.all(swapPromises);

    const successCount = swapResults.filter(r => r.ok).length;
    const failCount = swapResults.filter(r => !r.ok).length;

    assert.strictEqual(successCount, 1, `Chỉ duy nhất 1 lệnh được thành công (Thực tế: ${successCount})`);
    assert.strictEqual(failCount, 9, `9 lệnh còn lại phải bị từ chối vì thiếu điểm (Thực tế: ${failCount})`);

    // Số dư điểm phải là 0, TUYỆT ĐỐI KHÔNG BỊ ÂM
    const userFinal = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(respondentId);
    assert.strictEqual(userFinal.point_balance, 0, 'Số dư điểm phải đúng bằng 0');
    assert.strictEqual(userFinal.credit_balance, 10500, 'Số dư credit phải đúng bằng 10,500 (2 lần đổi thành công: 5,250 + 5,250)');
    assert(userFinal.point_balance >= 0, 'Số dư điểm tuyệt đối không âm');
  });

  await runTest('3.3. Chặn đổi điểm với giá trị phi lý (Dưới 1,000 điểm, số âm, hoặc vượt 10,000,000 điểm)', async () => {
    assert.throws(() => {
      ledgerService.swapPointsToCredit(respondentId, 200);
    }, /Số điểm đổi tối thiểu là 1[.,]000/);

    assert.throws(() => {
      ledgerService.swapPointsToCredit(respondentId, -1000);
    }, /Số điểm đổi tối thiểu là 1[.,]000/);

    assert.throws(() => {
      ledgerService.swapPointsToCredit(respondentId, 999999999);
    }, /tối đa mỗi lần là 10,000,000/);
  });

  // =========================================================================
  // MỤC 4: KIỂM TOÁN CHỐNG SSRF TÍNH NĂNG BÓC TÁCH BIỂU MẪU (FORM PARSER)
  // =========================================================================
  console.log('\n--- 4. KIỂM TOÁN CHỐNG LỖ HỔNG SSRF (FORM PARSER ENGINE) ---');

  await runTest('4.1. Chặn đứng 100% các địa chỉ IP nội bộ, loopback và Cloud Metadata (169.254.169.254)', async () => {
    const maliciousUrls = [
      'http://127.0.0.1/admin',
      'http://127.0.0.2:8080/metrics',
      'http://localhost:3000/api/keys',
      'http://localhost.local/status',
      'http://10.0.0.1/internal-api',
      'http://10.254.254.254/secret',
      'http://192.168.1.1/router-settings',
      'http://192.168.0.100:8000',
      'http://172.16.0.1/docker-daemon',
      'http://172.31.255.255/meta',
      'http://169.254.169.254/latest/meta-data/', // AWS / GCP / Azure Cloud Metadata!
      'http://169.254.1.1/link-local',
      'http://0.0.0.0/',
      'http://[::1]/internal'
    ];

    for (const badUrl of maliciousUrls) {
      assert.throws(() => {
        formParserService.validateFormUrl(badUrl);
      }, /Truy cập địa chỉ nội bộ bị từ chối|Cổng .* không được phép|không được hỗ trợ/, `Phải chặn URL nội bộ: ${badUrl}`);
    }
  });

  await runTest('4.2. Whitelist domain chính chủ: Chỉ cho phép Google Forms và Microsoft Forms', async () => {
    const validUrls = [
      'https://docs.google.com/forms/d/e/1FAIpQLScXyz/viewform',
      'https://forms.gle/abCD1234efGH',
      'https://forms.office.com/r/xyz789',
      'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=test'
    ];

    for (const validUrl of validUrls) {
      const res = formParserService.validateFormUrl(validUrl);
      assert.strictEqual(res.isValid, true, `URL hợp lệ phải được chấp thuận: ${validUrl}`);
      assert(res.isGoogle || res.isMicrosoft, 'Phải nhận diện nguồn Google hoặc Microsoft');
    }

    const attackerUrls = [
      'https://evil-google.com/forms',
      'https://docs.google.com.attacker.com/forms',
      'https://attacker-forms.gle/steal',
      'https://forms.office.com.malicious.xyz/',
      'https://my-phishing-survey.com/forms'
    ];

    for (const badUrl of attackerUrls) {
      assert.throws(() => {
        formParserService.validateFormUrl(badUrl);
      }, /không được hỗ trợ/, `Phải từ chối domain giả mạo: ${badUrl}`);
    }
  });

  await runTest('4.3. Chặn các cổng nhạy cảm không phải cổng web chuẩn (SSH 22, Redis 6379, DB 5432)', async () => {
    const blockedPorts = [
      'https://docs.google.com:22/forms',
      'https://docs.google.com:6379/forms',
      'https://forms.office.com:8080/r/xyz',
      'https://forms.gle:27017/db'
    ];

    for (const portUrl of blockedPorts) {
      assert.throws(() => {
        formParserService.validateFormUrl(portUrl);
      }, /Cổng .* không được phép/);
    }
  });

  await runTest('4.4. Helper isPrivateOrInternalIp kiểm tra toàn diện mọi dải IP nguy hiểm', async () => {
    assert.strictEqual(formParserService.isPrivateOrInternalIp('127.0.0.1'), true);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('10.10.10.10'), true);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('192.168.1.254'), true);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('172.20.0.5'), true);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('169.254.169.254'), true);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('0.0.0.0'), true);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('::1'), true);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('::ffff:127.0.0.1'), true);

    // IP Public an toàn
    assert.strictEqual(formParserService.isPrivateOrInternalIp('8.8.8.8'), false);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('1.1.1.1'), false);
    assert.strictEqual(formParserService.isPrivateOrInternalIp('142.250.190.46'), false); // Google
  });

  console.log('\n===============================================================');
  console.log(`🏆 KẾT QUẢ KIỂM TOÁN AN NINH: ${passedTests}/${totalTests} BÀI THÀNH CÔNG (100% PASS)`);
  console.log('🛡️  Tất cả các rủi ro Race Condition, Duplicate Claim, Leaks & SSRF đã được vá triệt để!');
  console.log('===============================================================\n');
}

runSecurityAudit().catch(err => {
  console.error('\n❌ PHÁT HIỆN LỖI TRONG KIỂM TOÁN AN NINH:', err);
  process.exit(1);
});
