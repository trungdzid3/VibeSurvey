/**
 * Bộ kiểm thử Tầng 7: Google Sheets Webhook Sync Engine Test
 * Kiểm tra khả năng gửi Webhook bất đồng bộ (Non-blocking), chịu lỗi kết nối,
 * cấu hình URL qua API và tự động kích hoạt đồng bộ khi bài làm VALIDATED.
 */

const http = require('node:http');
const assert = require('node:assert');
const crypto = require('node:crypto');
const app = require('../server/app');
const db = require('../server/db/database');
const webhookService = require('../server/services/webhookService');

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

async function runWebhookTests() {
  console.log('===============================================================');
  console.log('📊 BẮT ĐẦU KIỂM THỬ TẦNG 7: GOOGLE SHEETS WEBHOOK SYNC ENGINE');
  console.log('===============================================================');

  // 1. Khởi tạo Mock Google Apps Script Webhook Receiver Server
  const receivedPayloads = [];
  let mockServerResponseCode = 200;

  const mockWebhookServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let parsed = null;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = body;
      }
      receivedPayloads.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: parsed
      });

      res.writeHead(mockServerResponseCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: mockServerResponseCode === 200 ? 'success' : 'error' }));
    });
  });

  await new Promise(resolve => mockWebhookServer.listen(0, '127.0.0.1', resolve));
  const webhookPort = mockWebhookServer.address().port;
  const mockWebhookUrl = `http://127.0.0.1:${webhookPort}/exec`;

  // 2. Khởi tạo Backend Express API Server
  const apiServer = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const apiPort = apiServer.address().port;
  const baseUrl = `http://127.0.0.1:${apiPort}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const creatorEmail = `creator_webhook_${uniqueSuffix}@sync-test.com`;
  const respondentEmail = `respondent_webhook_${uniqueSuffix}@sync-test.com`;
  const spammerEmail = `spammer_webhook_${uniqueSuffix}@sync-test.com`;
  const password = 'SecurePassword123!';

  let creatorToken = null;
  let respondentToken = null;
  let spammerToken = null;
  let surveyId = null;

  try {
    // === TEST 1: Unit Test Validation & Payload Formatting ===
    await runTest('1. Kiểm định URL Webhook và Chuẩn hóa Payload theo Mục 12', async () => {
      assert.strictEqual(webhookService.isValidUrl('https://script.google.com/macros/s/AKfycby.../exec'), true);
      assert.strictEqual(webhookService.isValidUrl('http://127.0.0.1:8080/webhook'), true);
      assert.strictEqual(webhookService.isValidUrl('javascript:alert(1)'), false);
      assert.strictEqual(webhookService.isValidUrl('not-a-url'), false);
      assert.strictEqual(webhookService.isValidUrl(''), false);
      assert.strictEqual(webhookService.isValidUrl(null), false);

      const raw = {
        survey_id: 'srv_123',
        response_id: 'resp_456',
        duration_sec: '45',
        quality_score: 0.9482,
        answers: { q1: 'Nam', q2: 'Hà Nội' }
      };
      const formatted = webhookService.formatPayload(raw);
      assert.strictEqual(formatted.survey_id, 'srv_123');
      assert.strictEqual(formatted.response_id, 'resp_456');
      assert.strictEqual(formatted.duration_sec, 45);
      assert.strictEqual(formatted.quality_score, 0.95);
      assert.deepStrictEqual(formatted.answers, { q1: 'Nam', q2: 'Hà Nội' });
      assert.ok(formatted.submitted_at);
    });

    // === TEST 2: Gửi Webhook trực tiếp tới Mock Receiver Server ===
    await runTest('2. Gửi Webhook POST thành công sang Mock Google Apps Script Server', async () => {
      receivedPayloads.length = 0;
      const testData = {
        survey_id: 'survey_unit_test',
        response_id: 'resp_unit_test',
        duration_sec: 120,
        quality_score: 1.0,
        answers: {
          q1: 'Đại học Bách Khoa',
          q2: 'Rất hài lòng'
        }
      };

      const result = await webhookService.dispatchGoogleSheetsSync(mockWebhookUrl, testData);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, 200);

      // Chờ mock server nhận request
      assert.strictEqual(receivedPayloads.length, 1);
      const reqReceived = receivedPayloads[0];
      assert.strictEqual(reqReceived.method, 'POST');
      assert.strictEqual(reqReceived.body.survey_id, 'survey_unit_test');
      assert.strictEqual(reqReceived.body.answers.q1, 'Đại học Bách Khoa');
      assert.strictEqual(reqReceived.body.answers.q2, 'Rất hài lòng');
    });

    // === TEST 3: Chịu lỗi khi Webhook URL trả về 500 hoặc rớt mạng ===
    await runTest('3. Tính chịu lỗi (Fault-Tolerance): Webhook chết hoặc lỗi HTTP không gây sập hệ thống', async () => {
      // Giả lập mock server trả về HTTP 500
      mockServerResponseCode = 500;
      const res500 = await webhookService.dispatchGoogleSheetsSync(mockWebhookUrl, {
        survey_id: 'srv_500',
        response_id: 'resp_500'
      });
      assert.strictEqual(res500.success, false);
      assert.strictEqual(res500.status, 500);

      // Phục hồi lại 200
      mockServerResponseCode = 200;

      // Endpoint không thể kết nối (Port không có ai lắng nghe)
      const resDead = await webhookService.dispatchGoogleSheetsSync('http://127.0.0.1:59999/dead-endpoint', {
        survey_id: 'srv_dead',
        response_id: 'resp_dead'
      });
      assert.strictEqual(resDead.success, false);
    });

    // === TEST 4: Đăng ký Creator, Respondent và Kiểm tra Lưu/Cập nhật Webhook URL qua API ===
    await runTest('4. Lưu và Cập nhật google_sheets_webhook_url qua createSurvey & updateSurvey API', async () => {
      // 4.1 Đăng ký Creator & Respondent
      const regCreator = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creatorEmail, password, name: 'Creator Webhook', role: 'CREATOR' })
      }).then(r => r.json());
      creatorToken = regCreator.token;

      const regResp = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: respondentEmail, password, name: 'Respondent Webhook', role: 'RESPONDENT' })
      }).then(r => r.json());
      respondentToken = regResp.token;

      const regSpam = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: spammerEmail, password, name: 'Spammer Webhook', role: 'RESPONDENT' })
      }).then(r => r.json());
      spammerToken = regSpam.token;

      // 4.2 Tạo khảo sát với google_sheets_webhook_url
      const createRes = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          title: 'Khảo sát Đồng bộ Google Sheets Tự Động',
          description: 'Kiểm thử gửi câu trả lời về Apps Script Webhook',
          category: 'Công nghệ',
          target_responses: 10,
          google_sheets_webhook_url: mockWebhookUrl,
          questions: [
            {
              order_index: 1,
              type: 'SINGLE_CHOICE',
              content: 'Bạn đang sử dụng hệ điều hành nào?',
              options: ['Windows', 'macOS', 'Linux']
            },
            {
              order_index: 2,
              type: 'SINGLE_CHOICE',
              content: 'Câu hỏi kiểm tra: Vui lòng chọn Đúng để tiếp tục',
              options: ['Đúng', 'Sai'],
              is_attention_check: 1,
              expected_answer: 'Đúng'
            },
            {
              order_index: 3,
              type: 'OPEN_TEXT',
              content: 'Góp ý thêm về sản phẩm của chúng tôi:'
            }
          ]
        })
      }).then(r => r.json());

      assert.strictEqual(createRes.success, true);
      surveyId = createRes.surveyId;

      // 4.3 Kiểm tra GET survey trả về google_sheets_webhook_url cho Creator
      const getRes = await fetch(`${baseUrl}/surveys/${surveyId}`, {
        headers: { 'Authorization': `Bearer ${creatorToken}` }
      }).then(r => r.json());
      assert.strictEqual(getRes.survey.google_sheets_webhook_url, mockWebhookUrl);

      // 4.4 Kiểm tra UPDATE survey (PUT /api/v1/surveys/:id)
      const newWebhookUrl = `http://127.0.0.1:${webhookPort}/updated-exec`;
      const updateRes = await fetch(`${baseUrl}/surveys/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          google_sheets_webhook_url: newWebhookUrl
        })
      }).then(r => r.json());

      assert.strictEqual(updateRes.success, true);
      assert.strictEqual(updateRes.survey.google_sheets_webhook_url, newWebhookUrl);

      // Trả lại mockWebhookUrl ban đầu để kiểm thử luồng submit
      await fetch(`${baseUrl}/surveys/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          google_sheets_webhook_url: mockWebhookUrl
        })
      });

      // 4.5 Cập nhật với URL không hợp lệ -> Phải bị từ chối 400
      const badUpdateRes = await fetch(`${baseUrl}/surveys/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({
          google_sheets_webhook_url: 'ftp://invalid-url.com'
        })
      });
      assert.strictEqual(badUpdateRes.status, 400);
    });

    // === TEST 5: Nộp bài hợp lệ kích hoạt Webhook Sync tự động sang Google Sheets ===
    await runTest('5. Bài làm VALIDATED tự động kích hoạt bắn dữ liệu sang Google Sheets Webhook', async () => {
      receivedPayloads.length = 0;

      // Nạp tiền cho Creator và xuất bản khảo sát
      await fetch(`${baseUrl}/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${creatorToken}`
        },
        body: JSON.stringify({ amount_vnd: 200000 })
      });

      const pubRes = await fetch(`${baseUrl}/surveys/${surveyId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${creatorToken}` }
      }).then(r => r.json());
      assert.strictEqual(pubRes.success, true);

      // Respondent bắt đầu phiên làm bài
      const sessionRes = await fetch(`${baseUrl}/surveys/${surveyId}/start-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${respondentToken}` }
      }).then(r => r.json());
      assert.strictEqual(sessionRes.success, true);

      // Lấy câu hỏi để chuẩn bị câu trả lời
      const qList = sessionRes.questions;
      const qId1 = qList[0].id;
      const qId2 = qList[1].id;
      const qId3 = qList[2].id;

      const validAnswers = {
        [qId1]: 'Windows',
        [qId2]: 'Đúng', // Trả lời đúng câu bẫy attention check
        [qId3]: 'Dịch vụ rất tốt và trải nghiệm mượt mà không bị giật lag.'
      };

      // Respondent nộp bài hợp lệ với thời gian đủ chuẩn (16s)
      const submitRes = await fetch(`${baseUrl}/surveys/${surveyId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${respondentToken}`
        },
        body: JSON.stringify({
          answers: validAnswers,
          duration_sec: 25,
          device_fingerprint: 'desktop_chrome_v120'
        })
      }).then(r => r.json());

      assert.strictEqual(submitRes.success, true);
      assert.strictEqual(submitRes.status, 'VALIDATED');
      assert.ok(submitRes.pointsEarned > 0);

      // Chờ trong tích tắc (do Non-blocking setImmediate) để mock receiver server nhận payload
      await new Promise(r => setTimeout(r, 100));

      assert.strictEqual(receivedPayloads.length, 1, 'Mock Webhook Server phải nhận được đúng 1 payload từ bài làm VALIDATED');
      const received = receivedPayloads[0].body;
      assert.strictEqual(received.survey_id, surveyId);
      assert.strictEqual(received.duration_sec, 25);
      assert.strictEqual(received.answers[qId1], 'Windows');
      assert.strictEqual(received.answers[qId2], 'Đúng');
      assert.strictEqual(received.answers[qId3], 'Dịch vụ rất tốt và trải nghiệm mượt mà không bị giật lag.');
    });

    // === TEST 6: Bài làm vi phạm chống gian lận (REJECTED_FRAUD) KHÔNG được gửi sang Google Sheets ===
    await runTest('6. Bài làm gian lận REJECTED_FRAUD tuyệt đối KHÔNG kích hoạt bắn Webhook', async () => {
      const beforeCount = receivedPayloads.length;

      // Spammer bắt đầu phiên
      const sessionRes = await fetch(`${baseUrl}/surveys/${surveyId}/start-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${spammerToken}` }
      }).then(r => r.json());
      assert.strictEqual(sessionRes.success, true);

      const qList = sessionRes.questions;
      // Trả lời sai câu bẫy attention check
      const spamAnswers = {
        [qList[0].id]: 'Linux',
        [qList[1].id]: 'Sai', // Vi phạm câu bẫy!
        [qList[2].id]: 'bad'
      };

      const submitRes = await fetch(`${baseUrl}/surveys/${surveyId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${spammerToken}`
        },
        body: JSON.stringify({
          answers: spamAnswers,
          duration_sec: 2, // Thời gian quá ngắn
          device_fingerprint: 'bot_fingerprint'
        })
      }).then(r => r.json());

      assert.strictEqual(submitRes.status, 'REJECTED_FRAUD');

      // Chờ một khoảng thời gian ngắn để đảm bảo không có webhook nào được bắn ra ngoài ý muốn
      await new Promise(r => setTimeout(r, 100));

      assert.strictEqual(
        receivedPayloads.length, 
        beforeCount, 
        'Số lượng webhook nhận được không được tăng lên khi bài làm bị REJECTED_FRAUD'
      );
    });

  } finally {
    // Dọn dẹp tài nguyên
    await new Promise(resolve => mockWebhookServer.close(resolve));
    await new Promise(resolve => apiServer.close(resolve));
  }

  console.log('---------------------------------------------------------------');
  console.log(`🎉 TẦNG 7 KẾT THÚC: ${passedTests}/${totalTests} BÀI KIỂM THỬ THÀNH CÔNG (100% PASS)`);
  console.log('===============================================================\n');
}

// Chạy trực tiếp nếu file được gọi độc lập
if (require.main === module) {
  runWebhookTests().catch(err => {
    console.error('Lỗi thực thi kiểm thử Tầng 7 Webhook:', err);
    process.exit(1);
  });
}

module.exports = { runWebhookTests };
