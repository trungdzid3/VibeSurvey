/**
 * Bộ kiểm thử Tầng 11: Free Trial Surveys & New Creator Welcome Suite
 * Kiểm tra tính năng "Lượt khảo sát miễn phí cho người mới":
 * 1. Đăng ký người dùng mới -> Có sẵn 1 lượt dùng thử miễn phí (free_trial_surveys_available = 1)
 * 2. Xuất bản khảo sát 25 mẫu thành công khi số dư Credit = 0đ (Sàn tài trợ 100% Escrow)
 * 3. Người dùng bị trừ lượt dùng thử (free_trial_surveys_available = 0)
 * 4. Đáp viên làm bài khảo sát free trial vẫn nhận được điểm thưởng bình thường từ quỹ sàn
 * 5. Chặn lạm dụng dùng thử lần 2 khi đã hết lượt
 * 6. Chặn dùng thử nếu số mẫu vượt quá giới hạn an toàn (> 25 mẫu)
 * 7. Khi đóng khảo sát dùng thử, quỹ tài trợ được thu hồi an toàn về sàn, không hoàn tiền bừa vào ví user
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const app = require('../server/app');
const db = require('../server/db/database');

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

async function runFreeTrialTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: KHẢO SÁT DÙNG THỬ MIỄN PHÍ (FIRST SURVEY FREE TRIAL)');
  console.log('===============================================================');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const creatorEmail = `new_creator_${uniqueSuffix}@vibesurvey.com`;
  const respondentEmail = `resp_trial_${uniqueSuffix}@vibesurvey.com`;
  const password = 'Password@123456';

  let creatorToken = null;
  let creatorId = null;
  let respondentToken = null;
  let respondentId = null;
  let freeSurveyId = null;

  try {
    // 1. Đăng ký tài khoản người mới
    await runTest('1. Đăng ký tài khoản mới tự động nhận 1 lượt khảo sát dùng thử miễn phí', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: creatorEmail,
          password,
          name: 'Bạn Mới Tạo Form',
          role: 'RESPONDENT'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.free_trial_surveys_available, 1);
      assert.strictEqual(data.user.credit_balance, 0);

      creatorToken = data.token;
      creatorId = data.user.id;

      // Đăng ký cả 1 respondent để test làm bài
      const respRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: respondentEmail,
          password,
          name: 'Đáp Viên Trải Nghiệm',
          role: 'RESPONDENT'
        })
      });
      const respData = await respRes.json();
      respondentToken = respData.token;
      respondentId = respData.user.id;
    });

    // 2. Tạo khảo sát 25 mẫu
    await runTest('2. Tạo khảo sát mới 25 mẫu khi số dư Credit = 0đ', async () => {
      const res = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          title: 'Khảo sát đầu tay trải nghiệm người dùng',
          description: 'Khảo sát 25 mẫu đầu tiên được sàn tài trợ 100%.',
          category: 'Công nghệ',
          target_responses: 25,
          reward_points_per_response: 200,
          questions: [
            {
              id: 'q1',
              type: 'SINGLE_CHOICE',
              content: 'Bạn cảm nhận dịch vụ thế nào?',
              options: ['Rất tốt', 'Bình thường', 'Kém'],
              is_attention_check: false
            }
          ]
        })
      });

      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
      assert.ok(data.surveyId);
      freeSurveyId = data.surveyId;
    });

    // 3. Xuất bản khảo sát với use_free_trial = true
    await runTest('3. Xuất bản khảo sát miễn phí: Ký quỹ 0đ, Sàn tài trợ Escrow thành công', async () => {
      // Xác thực email để thỏa mãn điều kiện bảo mật
      await fetch(`${baseUrl}/auth/verify-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creatorToken}` }
      });

      const res = await fetch(`${baseUrl}/surveys/${freeSurveyId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({ use_free_trial: true })
      });

      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.isFreeTrial, true);
      assert.strictEqual(data.totalEscrowVnd, 0);
      assert.ok(data.sponsoredEscrowVnd > 0);

      // Kiểm tra DB
      const surveyInDb = db.prepare('SELECT is_free_trial, escrow_locked_balance, status FROM surveys WHERE id = ?').get(freeSurveyId);
      assert.strictEqual(surveyInDb.is_free_trial, 1);
      assert.strictEqual(surveyInDb.status, 'ACTIVE');
      assert.ok(surveyInDb.escrow_locked_balance > 0);

      // Kiểm tra lượt dùng thử của creator đã về 0
      const creatorInDb = db.prepare('SELECT free_trial_surveys_available, credit_balance FROM users WHERE id = ?').get(creatorId);
      assert.strictEqual(creatorInDb.free_trial_surveys_available, 0);
      assert.strictEqual(creatorInDb.credit_balance, 0);
    });

    // 4. Đáp viên làm bài khảo sát free trial vẫn nhận thưởng bình thường
    await runTest('4. Đáp viên làm bài khảo sát free trial nhận điểm thưởng đầy đủ từ quỹ sàn', async () => {
      // Bắt đầu phiên
      const startRes = await fetch(`${baseUrl}/surveys/${freeSurveyId}/start-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${respondentToken}` }
      });
      const startData = await startRes.json();
      assert.strictEqual(startRes.status, 200);

      // Cập nhật started_at lùi lại 25 giây để vượt qua Speed Trap của Anti-Fraud
      db.prepare("UPDATE responses SET started_at = datetime('now', '-25 seconds') WHERE survey_id = ? AND respondent_id = ?").run(freeSurveyId, respondentId);

      // Nộp bài hợp lệ
      const submitRes = await fetch(`${baseUrl}/surveys/${freeSurveyId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${respondentToken}`
        },
        body: JSON.stringify({
          answers: { q1: 'Rất tốt' },
          duration_sec: 25
        })
      });

      const submitData = await submitRes.json();
      assert.strictEqual(submitRes.status, 200);
      assert.strictEqual(submitData.status, 'VALIDATED');
      assert.ok(submitData.pointsEarned > 0);

      // Số dư điểm của respondent tăng lên
      const respInDb = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(respondentId);
      assert.ok(respInDb.point_balance > 0);
    });

    // 5. Chặn lạm dụng dùng thử lần 2 khi đã hết lượt
    await runTest('5. Chặn lạm dụng: Từ chối áp dụng free trial khi đã hết lượt miễn phí', async () => {
      // Tạo bài thứ 2
      const res = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          title: 'Khảo sát lần 2',
          target_responses: 20,
          reward_points_per_response: 200,
          questions: [{ id: 'q1', type: 'SINGLE_CHOICE', content: 'C2', options: ['A', 'B'] }]
        })
      });
      const data = await res.json();
      const secondSurveyId = data.surveyId;

      // Cố publish với use_free_trial = true
      const pubRes = await fetch(`${baseUrl}/surveys/${secondSurveyId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({ use_free_trial: true })
      });
      const pubData = await pubRes.json();
      assert.strictEqual(pubRes.status, 400);
      assert.strictEqual(pubData.success, false);
      assert.ok(pubData.message.includes('hết lượt khảo sát dùng thử miễn phí'));
    });

    // 6. Chặn dùng thử nếu vượt quá 25 phản hồi
    await runTest('6. Chặn lạm dụng: Gói dùng thử chỉ cho phép tối đa 25 phản hồi', async () => {
      // Tạo user mới chưa dùng
      const freshEmail = `fresh_${uniqueSuffix}@vibesurvey.com`;
      const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: freshEmail, password, name: 'Fresh User' })
      });
      const regData = await regRes.json();

      // Xác thực email để đủ điều kiện
      await fetch(`${baseUrl}/auth/verify-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${regData.token}` }
      });

      // Tạo bài 100 mẫu
      const surRes = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${regData.token}`
        },
        body: JSON.stringify({
          title: 'Khảo sát 100 mẫu',
          target_responses: 100,
          reward_points_per_response: 200,
          questions: [{ id: 'q1', type: 'SINGLE_CHOICE', content: 'C100', options: ['A', 'B'] }]
        })
      });
      const surData = await surRes.json();

      // Cố tình chọn free trial cho bài 100 mẫu
      const pubRes = await fetch(`${baseUrl}/surveys/${surData.surveyId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${regData.token}`
        },
        body: JSON.stringify({ use_free_trial: true })
      });
      const pubData = await pubRes.json();
      assert.strictEqual(pubRes.status, 400);
      assert.strictEqual(pubData.success, false);
      assert.ok(pubData.message.includes('tối đa 25 lượt phản hồi'));
    });

    // 7. Khi đóng bài khảo sát dùng thử, thu hồi về sàn, không hoàn bừa tiền mặt vào ví user
    await runTest('7. Đóng bài khảo sát dùng thử: Thu hồi quỹ tài trợ về sàn, ví user giữ nguyên 0đ', async () => {
      const closeRes = await fetch(`${baseUrl}/surveys/${freeSurveyId}/close`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${creatorToken}` }
      });
      const closeData = await closeRes.json();
      assert.strictEqual(closeRes.status, 200);
      assert.strictEqual(closeData.success, true);

      // Ví của creator vẫn là 0, không bị rút tiền bừa
      const creatorInDb = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(creatorId);
      assert.strictEqual(creatorInDb.credit_balance, 0);

      // Trạng thái khảo sát đã CLOSED
      const surveyInDb = db.prepare('SELECT status, escrow_locked_balance FROM surveys WHERE id = ?').get(freeSurveyId);
      assert.strictEqual(surveyInDb.status, 'CLOSED');
      assert.strictEqual(surveyInDb.escrow_locked_balance, 0);
    });

  } finally {
    server.close();
  }

  console.log('---------------------------------------------------------------');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI THÀNH CÔNG (100% PASS)`);
  console.log('🎁 TÍNH NĂNG KHẢO SÁT DÙNG THỬ MIỄN PHÍ ĐÃ ĐẠT CHUẨN AN TOÀN TUYỆT ĐỐI!');
  console.log('===============================================================\n');
}

if (require.main === module) {
  runFreeTrialTests().catch((err) => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  });
}

module.exports = runFreeTrialTests;
