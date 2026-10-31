const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const app = require('../server/app');
const db = require('../server/db/database');

async function runTestSuite() {
  console.log('===============================================================');
  console.log('KIỂM THỬ: XÓA KHẢO SÁT CHỐNG LỖI FOREIGN KEY CONSTRAINT FAILED');
  console.log('===============================================================');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  try {
    // 1. Tạo tài khoản Creator test và đăng nhập
    const email = `creator_del_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
        name: 'Creator Delete Test',
        role: 'CREATOR'
      })
    });
    const regData = await regRes.json();
    assert.strictEqual(regRes.status, 201);
    const token = regData.token;
    const userId = regData.user.id;
    console.log('  [PASS] 1. Đăng ký tài khoản Creator thành công');

    // Nạp tiền ví Creator để có thể ký quỹ
    db.prepare('UPDATE users SET credit_balance = 500000 WHERE id = ?').run(userId);

    // 2. Tạo một khảo sát phức tạp có câu hỏi
    const surveyPayload = {
      title: 'Khảo sát kiểm thử xóa liên kết chéo',
      description: 'Mô tả test',
      target_responses: 10,
      cost_per_response: 2000,
      reward_points_per_response: 1200,
      questions: [
        {
          type: 'SINGLE_CHOICE',
          content: 'Bạn thích ngôn ngữ nào?',
          options: ['JavaScript', 'Python', 'Go']
        }
      ]
    };
    const createRes = await fetch(`${baseUrl}/surveys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(surveyPayload)
    });
    const createData = await createRes.json();
    if (createRes.status !== 201) {
      console.error('Create survey failed:', createData);
    }
    assert.strictEqual(createRes.status, 201);
    const surveyId = createData.surveyId;
    console.log('  [PASS] 2. Tạo khảo sát thành công');

    // 3. Xuất bản khảo sát
    const pubRes = await fetch(`${baseUrl}/surveys/${surveyId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(pubRes.status, 200);
    console.log('  [PASS] 3. Xuất bản khảo sát thành công');

    // 4. Giả lập tạo các liên kết chéo toàn diện (Forum post, Response, Voucher Claimed, Fraud log, Warranty)
    const campaignId = db.prepare('SELECT id FROM voucher_campaigns LIMIT 1').get()?.id;

    // A. Tạo response
    const respId = 'resp_test_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
      VALUES (?, ?, ?, 'VALIDATED', CURRENT_TIMESTAMP)
    `).run(respId, surveyId, userId);

    // B. Tạo voucher code có claimed_response_id
    const vcId = 'vc_test_' + crypto.randomUUID();
    if (campaignId) {
      db.prepare(`
        INSERT INTO voucher_codes (id, campaign_id, survey_id, code, status, claimed_by_user_id, claimed_response_id)
        VALUES (?, ?, ?, 'CODE_' || hex(randomblob(6)), 'CLAIMED', ?, ?)
      `).run(vcId, campaignId, surveyId, userId, respId);
    }

    // C. Tạo bài đăng diễn đàn đính kèm survey_id
    const postId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO forum_posts (id, user_id, survey_id, title, content)
      VALUES (?, ?, ?, 'Bài đăng đính kèm khảo sát', 'Nội dung chia sẻ')
    `).run(postId, userId, surveyId);

    // D. Tạo bình luận và lượt thích diễn đàn
    db.prepare(`
      INSERT INTO forum_comments (id, post_id, user_id, content)
      VALUES (?, ?, ?, 'Bình luận test')
    `).run(crypto.randomUUID(), postId, userId);

    db.prepare(`
      INSERT INTO forum_post_likes (post_id, user_id)
      VALUES (?, ?)
    `).run(postId, userId);

    // E. Tạo fraud log và warranty claim
    db.prepare(`
      INSERT INTO fraud_logs (id, survey_id, user_id, reason)
      VALUES (?, ?, ?, 'Test fraud')
    `).run(crypto.randomUUID(), surveyId, userId);

    db.prepare(`
      INSERT INTO warranty_claims (id, survey_id, creator_id, response_ids_json, replaced_count, reason)
      VALUES (?, ?, ?, '[]', 1, 'Bảo hành mẫu')
    `).run(crypto.randomUUID(), surveyId, userId);

    console.log('  [PASS] 4. Đã gắn đầy đủ Forum post, Voucher claimed, Responses, Fraud logs, Warranty claims vào khảo sát');

    // 5. Gửi request DELETE /surveys/:id qua HTTP API
    const delRes = await fetch(`${baseUrl}/surveys/${surveyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const delData = await delRes.json();

    assert.strictEqual(delRes.status, 200, `Xóa thất bại với status ${delRes.status}: ${JSON.stringify(delData)}`);
    assert.strictEqual(delData.success, true);
    console.log('  [PASS] 5. DELETE /api/v1/surveys/:id trả về 200 OK thành công mỹ mãn!');

    // 6. Xác nhận không còn vết tích và không còn bất kỳ vi phạm FOREIGN KEY nào
    const checkSurvey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
    assert.strictEqual(checkSurvey, undefined, 'Khảo sát phải được xóa khỏi bảng surveys');

    const checkPost = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(postId);
    assert.strictEqual(checkPost, undefined, 'Bài đăng diễn đàn liên quan phải được dọn dẹp sạch sẽ');

    const checkResp = db.prepare('SELECT * FROM responses WHERE id = ?').get(respId);
    assert.strictEqual(checkResp, undefined, 'Responses phải được xóa');

    if (campaignId) {
      const checkVc = db.prepare('SELECT * FROM voucher_codes WHERE id = ?').get(vcId);
      assert(checkVc, 'Voucher đã phát cho người dùng phải được bảo toàn trong ví');
      assert.strictEqual(checkVc.survey_id, null, 'survey_id của voucher phải được gỡ bỏ an toàn');
      assert.strictEqual(checkVc.claimed_response_id, null, 'claimed_response_id phải được gỡ bỏ an toàn');
    }
    console.log('  [PASS] 6. Dữ liệu khảo sát và các liên kết khóa ngoại được giải phóng 100%');

    // Dọn dẹp voucher test
    if (campaignId) {
      db.prepare('DELETE FROM voucher_codes WHERE id = ?').run(vcId);
    }

    console.log('---------------------------------------------------------------');
    console.log('KẾT QUẢ: 6/6 BÀI KIỂM THỬ XÓA KHẢO SÁT CHỐNG LỖI FK PASS 100%');
    console.log('===============================================================');
  } finally {
    server.close();
  }
}

runTestSuite().catch(err => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
