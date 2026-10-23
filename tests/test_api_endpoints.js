/**
 * Bộ kiểm thử Tầng 3: REST API Endpoints & Security Auditing Test
 * Kiểm tra các endpoint Auth, bảo mật chống rò rỉ câu bẫy attention check, luồng nộp bài và nhận điểm qua API
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

async function runApiTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TẦNG 3: REST API ENDPOINTS & SECURITY AUDIT');
  console.log('===============================================================');

  // Khởi động server nội bộ trên port ngẫu nhiên
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const creatorEmail = `creator_${uniqueSuffix}@api-test.com`;
  const respondentEmail = `respondent_${uniqueSuffix}@api-test.com`;
  const spammerEmail = `spammer_${uniqueSuffix}@api-test.com`;
  const password = 'SecurePassword123!';

  let creatorToken = null;
  let creatorId = null;
  let respondentToken = null;
  let respondentId = null;
  let spammerToken = null;
  let testSurveyId = null;

  try {
    // 1. Kiểm tra Register & Login Auth Endpoints
    await runTest('1. Đăng ký & Đăng nhập các tài khoản Creator và Respondent qua API', async () => {
      // Đăng ký Creator
      const resCreatorReg = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: creatorEmail,
          password,
          name: 'Doanh Nghiệp ABC',
          role: 'CREATOR'
        })
      });
      const dataCreatorReg = await resCreatorReg.json();
      assert.strictEqual(resCreatorReg.status, 201);
      assert.strictEqual(dataCreatorReg.success, true);
      assert(dataCreatorReg.token);
      creatorToken = dataCreatorReg.token;
      creatorId = dataCreatorReg.user.id;

      // Đăng ký Respondent
      const resRespReg = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: respondentEmail,
          password,
          name: 'Nguyễn Văn Người Thật',
          role: 'RESPONDENT'
        })
      });
      const dataRespReg = await resRespReg.json();
      assert.strictEqual(resRespReg.status, 201);
      assert.strictEqual(dataRespReg.success, true);
      assert(dataRespReg.token);
      respondentToken = dataRespReg.token;
      respondentId = dataRespReg.user.id;

      // Đăng ký Spammer Respondent
      const resSpamReg = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: spammerEmail,
          password,
          name: 'Trần Văn Làm Ẩu',
          role: 'RESPONDENT'
        })
      });
      const dataSpamReg = await resSpamReg.json();
      assert.strictEqual(resSpamReg.status, 201);
      spammerToken = dataSpamReg.token;

      // Kiểm tra chặn đăng ký trùng email -> 409 Conflict
      const resDup = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: creatorEmail,
          password,
          name: 'Trùng Email',
          role: 'CREATOR'
        })
      });
      assert.strictEqual(resDup.status, 409);

      // Kiểm tra Đăng nhập
      const resLogin = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creatorEmail, password })
      });
      const dataLogin = await resLogin.json();
      assert.strictEqual(resLogin.status, 200);
      assert.strictEqual(dataLogin.success, true);
      assert(dataLogin.token);

      // Kiểm tra đăng nhập sai mật khẩu -> 401
      const resWrongPw = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creatorEmail, password: 'WrongPassword!' })
      });
      assert.strictEqual(resWrongPw.status, 401);
    });

    // 2. Kiểm tra GET /auth/me
    await runTest('2. Lấy thông tin phiên người dùng hiện tại (GET /auth/me)', async () => {
      const resMe = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${creatorToken}` }
      });
      const dataMe = await resMe.json();
      assert.strictEqual(resMe.status, 200);
      assert.strictEqual(dataMe.user.email, creatorEmail);
      assert.strictEqual(dataMe.user.role, 'CREATOR');

      // Thử gọi không có token -> 401 Unauthorized
      const resNoAuth = await fetch(`${baseUrl}/auth/me`);
      assert.strictEqual(resNoAuth.status, 401);
    });

    // 3. Creator nạp tiền & tạo khảo sát kèm câu hỏi bẫy (Attention Check)
    await runTest('3. Creator nạp tiền ví, tạo khảo sát có câu hỏi bẫy và xuất bản (Escrow Lock)', async () => {
      // Nạp 1,000,000 VND vào tài khoản Creator
      const resDeposit = await fetch(`${baseUrl}/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          amount_vnd: 1000000,
          description: 'Nạp quỹ chiến dịch qua ngân hàng'
        })
      });
      const dataDeposit = await resDeposit.json();
      assert.strictEqual(resDeposit.status, 200);
      assert.strictEqual(dataDeposit.success, true);

      // Tạo khảo sát có câu bẫy attention check
      const resCreate = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          title: 'Khảo sát thói quen thanh toán không tiền mặt',
          description: 'Nghiên cứu thị trường thanh toán số tại Việt Nam',
          category: 'Tài chính công nghệ',
          target_responses: 50,
          questions: [
            {
              type: 'SINGLE_CHOICE',
              content: 'Bạn sử dụng ứng dụng thanh toán nào thường xuyên nhất?',
              options: ['MoMo', 'ZaloPay', 'VNPay', 'Viettel Money', 'Khác'],
              is_attention_check: false
            },
            {
              type: 'LIKERT_SCALE',
              content: 'Mức độ tiện lợi khi thanh toán qua mã QR',
              options: ['1', '2', '3', '4', '5'],
              is_attention_check: false
            },
            {
              type: 'SINGLE_CHOICE',
              content: 'Để kiểm tra bạn đang đọc kỹ câu hỏi, vui lòng chọn phương án Cam kết bảo mật',
              options: ['Bỏ qua', 'Không rõ', 'Cam kết bảo mật', 'Khác'],
              is_attention_check: true,
              expected_answer: 'Cam kết bảo mật'
            },
            {
              type: 'OPEN_TEXT',
              content: 'Hãy mô tả trải nghiệm gần đây nhất của bạn khi gặp sự cố thanh toán quét mã',
              is_attention_check: false
            }
          ]
        })
      });

      const dataCreate = await resCreate.json();
      assert.strictEqual(resCreate.status, 201);
      assert.strictEqual(dataCreate.success, true);
      assert(dataCreate.surveyId);
      testSurveyId = dataCreate.surveyId;

      // Xuất bản & Khóa ký quỹ khảo sát
      const resPublish = await fetch(`${baseUrl}/surveys/${testSurveyId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creatorToken}` }
      });
      const dataPublish = await resPublish.json();
      assert.strictEqual(resPublish.status, 200);
      assert.strictEqual(dataPublish.success, true);
      assert(dataPublish.totalEscrowVnd > 0);
    });

    // 4. KIỂM TRA BẢO MẬT BẤT KHẢ XÂM PHẠM: Respondent KHÔNG BAO GIỜ nhận được trường 'is_attention_check' hoặc 'expected_answer'
    await runTest('4. Kiểm toán Bảo Mật API: Bóc tách 100% câu bẫy khỏi payload trả về cho Respondent', async () => {
      // 1. Kiểm tra qua endpoint GET /surveys/:id
      const resDetail = await fetch(`${baseUrl}/surveys/${testSurveyId}`, {
        headers: { Authorization: `Bearer ${respondentToken}` }
      });
      const dataDetail = await resDetail.json();
      assert.strictEqual(resDetail.status, 200);
      assert.strictEqual(dataDetail.success, true);
      assert(Array.isArray(dataDetail.questions));

      for (const q of dataDetail.questions) {
        assert.strictEqual(
          q.is_attention_check,
          undefined,
          `LỖ HỔNG BẢO MẬT: Phát hiện trường 'is_attention_check' bị rò rỉ trong câu hỏi id: ${q.id} tại GET /surveys/:id`
        );
        assert.strictEqual(
          q.expected_answer,
          undefined,
          `LỖ HỔNG BẢO MẬT: Phát hiện đáp án mẫu 'expected_answer' bị rò rỉ trong câu hỏi id: ${q.id} tại GET /surveys/:id`
        );
      }

      // 2. Kiểm tra qua endpoint POST /surveys/:id/start-session
      const resSession = await fetch(`${baseUrl}/surveys/${testSurveyId}/start-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${respondentToken}` }
      });
      const dataSession = await resSession.json();
      assert.strictEqual(resSession.status, 200);
      assert.strictEqual(dataSession.success, true);
      assert(Array.isArray(dataSession.questions));

      for (const q of dataSession.questions) {
        assert.strictEqual(
          q.is_attention_check,
          undefined,
          `LỖ HỔNG BẢO MẬT: Phát hiện trường 'is_attention_check' bị rò rỉ tại POST /start-session`
        );
        assert.strictEqual(
          q.expected_answer,
          undefined,
          `LỖ HỔNG BẢO MẬT: Phát hiện trường 'expected_answer' bị rò rỉ tại POST /start-session`
        );
      }

      console.log('     -> Xác nhận: 100% thuộc tính bí mật bẫy câu hỏi đã được thanh lọc hoàn toàn khỏi Client payload!');
    });

    // 5. Luồng làm bài hợp lệ và nhận điểm thưởng thực tế qua API
    await runTest('5. Respondent làm bài hợp lệ, đạt chuẩn Anti-Fraud và nhận điểm thưởng qua API', async () => {
      // Lấy danh sách câu hỏi để map ID
      const surveyDetail = await (await fetch(`${baseUrl}/surveys/${testSurveyId}`, {
        headers: { Authorization: `Bearer ${respondentToken}` }
      })).json();

      const questions = surveyDetail.questions;
      const qChoice = questions[0].id;
      const qScale = questions[1].id;
      const qAttention = questions[2].id;
      const qText = questions[3].id;

      // Nộp bài hợp lệ: đúng câu bẫy, thời gian đủ lâu (35 giây), tự luận nghiêm túc
      const submitBody = {
        answers: {
          [qChoice]: 'MoMo',
          [qScale]: '4',
          [qAttention]: 'Cam kết bảo mật',
          [qText]: 'Hôm trước tôi quét mã ở quán ăn thì mạng bị chậm, sau 10 giây giao dịch đã xác nhận thành công.'
        },
        duration_sec: 35,
        device_fingerprint: 'device_honest_android_test'
      };

      const resSubmit = await fetch(`${baseUrl}/surveys/${testSurveyId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${respondentToken}`
        },
        body: JSON.stringify(submitBody)
      });

      const dataSubmit = await resSubmit.json();
      assert.strictEqual(resSubmit.status, 200);
      assert.strictEqual(dataSubmit.success, true);
      assert.strictEqual(dataSubmit.status, 'VALIDATED');
      assert(dataSubmit.pointsEarned > 0, 'Phải nhận được điểm thưởng');
      assert(dataSubmit.qualityScore >= 0.8, 'Điểm chất lượng phải >= 0.8');

      // Kiểm tra ví Respondent đã được cộng điểm
      const resWallet = await fetch(`${baseUrl}/wallet`, {
        headers: { Authorization: `Bearer ${respondentToken}` }
      });
      const dataWallet = await resWallet.json();
      assert.strictEqual(resWallet.status, 200);
      assert.strictEqual(dataWallet.wallet.point_balance, dataSubmit.pointsEarned);
      console.log(`     -> Respondent nhận thành công: ${dataSubmit.pointsEarned} điểm thưởng (Số dư ví: ${dataWallet.wallet.point_balance} điểm)`);
    });

    // 6. Luồng làm bài gian lận (sai câu bẫy attention check) bị chặn đứng
    await runTest('6. Spammer làm ẩu sai câu bẫy: API chặn đứng (REJECTED_FRAUD), từ chối trả thưởng', async () => {
      // Bắt đầu session cho spammer
      await fetch(`${baseUrl}/surveys/${testSurveyId}/start-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${spammerToken}` }
      });

      const surveyDetail = await (await fetch(`${baseUrl}/surveys/${testSurveyId}`, {
        headers: { Authorization: `Bearer ${spammerToken}` }
      })).json();

      const questions = surveyDetail.questions;
      const qChoice = questions[0].id;
      const qScale = questions[1].id;
      const qAttention = questions[2].id;
      const qText = questions[3].id;

      // Nộp bài ẩu: trả lời sai câu bẫy ("Bỏ qua")
      const submitSpamBody = {
        answers: {
          [qChoice]: 'VNPay',
          [qScale]: '3',
          [qAttention]: 'Bỏ qua', // SAI CÂU BẪY
          [qText]: 'Không có ý kiến gì hết.'
        },
        duration_sec: 25,
        device_fingerprint: 'device_spammer_fingerprint'
      };

      const resSubmitSpam = await fetch(`${baseUrl}/surveys/${testSurveyId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${spammerToken}`
        },
        body: JSON.stringify(submitSpamBody)
      });

      const dataSubmitSpam = await resSubmitSpam.json();
      assert.strictEqual(resSubmitSpam.status, 400);
      assert.strictEqual(dataSubmitSpam.success, false);
      assert.strictEqual(dataSubmitSpam.status, 'REJECTED_FRAUD');
      assert.strictEqual(dataSubmitSpam.qualityScore, 0.0);
      assert(dataSubmitSpam.reasons.some(r => r.includes('độ tập trung') || r.includes('độ chú ý')));

      // Kiểm tra ví Spammer: Điểm thưởng vẫn bằng 0, trust score bị trừ
      const resSpamWallet = await fetch(`${baseUrl}/wallet`, {
        headers: { Authorization: `Bearer ${spammerToken}` }
      });
      const dataSpamWallet = await resSpamWallet.json();
      assert.strictEqual(dataSpamWallet.wallet.point_balance, 0, 'Spammer tuyệt đối không nhận được điểm');
      assert(dataSpamWallet.wallet.trust_score < 100.0, 'Điểm uy tín phải bị trừ sau khi gian lận');
    });

  } finally {
    // Đóng server để giải phóng port
    server.close();
  }

  console.log('---------------------------------------------------------------');
  console.log(`🎉 TẦNG 3 KẾT THÚC: ${passedTests}/${totalTests} BÀI KIỂM THỬ THÀNH CÔNG (100% PASS)`);
  console.log('===============================================================\n');

  return { passedTests, totalTests };
}

if (require.main === module) {
  runApiTests().catch(err => {
    console.error('Lỗi kiểm thử Tầng 3:', err);
    process.exit(1);
  });
}

module.exports = runApiTests;
