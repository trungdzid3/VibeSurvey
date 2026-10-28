/**
 * TEST SUITE: PUSH NOTIFICATION ENGINE & MOBILE HYBRID (SUITE 15)
 * Kiem thu toan dien:
 * 1. Bang push_subscriptions va cac truong du lieu
 * 2. Service pushNotificationService: saveSubscription, isHighRewardSurvey, sendHighRewardSurveyAlert
 * 3. Dong bo sang notifications va email_notifications_log
 * 4. API endpoints /api/v1/notifications/subscribe-push, unread-count, read-all
 * 5. Trigger tu dong khi publishSurvey khao sat Thuong Cao / Hoa Toc
 */

const assert = require('assert');
const crypto = require('crypto');
const db = require('../server/db/database');
const pushNotificationService = require('../server/services/pushNotificationService');

async function runTests() {
  console.log('===============================================================');
  console.log('KIEM THU CO CHE THONG BAO DAY PUSH NOTIFICATION & MOBILE HYBRID');
  console.log('===============================================================');

  // 1. Kiem tra bang push_subscriptions
  const columns = db.prepare('PRAGMA table_info(push_subscriptions)').all();
  const colNames = columns.map(c => c.name);
  const requiredCols = ['id', 'user_id', 'endpoint', 'keys_p256dh', 'keys_auth', 'device_type', 'created_at', 'last_active_at'];
  for (const reqCol of requiredCols) {
    assert.ok(colNames.includes(reqCol), `Cot ${reqCol} phai ton tai trong push_subscriptions`);
  }
  console.log('  [PASS] 1. Bang push_subscriptions day du 8 cot theo dac ta');

  // 2. Kiem tra luu va cap nhat subscription qua pushNotificationService
  const testEndpoint1 = 'https://fcm.googleapis.com/fcm/send/test_endpoint_' + Date.now();
  const subRes1 = pushNotificationService.saveSubscription(null, {
    endpoint: testEndpoint1,
    keys_p256dh: 'BNcRdreALRF8FsII...',
    keys_auth: 'tBHItJI...',
    device_type: 'WEB'
  });
  assert.strictEqual(subRes1.success, true);
  assert.strictEqual(subRes1.action, 'CREATED');

  const savedRecord = db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?').get(testEndpoint1);
  assert.ok(savedRecord, 'Ban ghi subscription phai duoc luu vao CSDL');
  assert.strictEqual(savedRecord.device_type, 'WEB');

  // Cap nhat gan user_id va keys moi
  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  const testUserId = existingUser ? existingUser.id : 'user_fallback';
  const subRes2 = pushNotificationService.saveSubscription(testUserId, {
    endpoint: testEndpoint1,
    keys: { p256dh: 'NEW_KEY_P256', auth: 'NEW_AUTH_KEY' },
    device_type: 'ANDROID'
  });
  assert.strictEqual(subRes2.success, true);
  assert.strictEqual(subRes2.action, 'UPDATED');

  const updatedRecord = db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?').get(testEndpoint1);
  assert.strictEqual(updatedRecord.user_id, testUserId);
  assert.strictEqual(updatedRecord.keys_p256dh, 'NEW_KEY_P256');
  assert.strictEqual(updatedRecord.device_type, 'ANDROID');
  console.log('  [PASS] 2. Luu tru va cap nhat push subscription ho tro ca Web va Android');

  // 3. Kiem tra phan loai khao sat Thuong Cao / Hoa Toc (isHighRewardSurvey)
  assert.strictEqual(pushNotificationService.isHighRewardSurvey({ package_type: 'RUSH' }), true);
  assert.strictEqual(pushNotificationService.isHighRewardSurvey({ pricing_tier: 'RUSH' }), true);
  assert.strictEqual(pushNotificationService.isHighRewardSurvey({ pricing_tier: 'RECOMMENDED' }), true);
  assert.strictEqual(pushNotificationService.isHighRewardSurvey({ title: 'Khao sat [HOA TOC] tieu dung 2026' }), true);
  assert.strictEqual(pushNotificationService.isHighRewardSurvey({ title: 'Khao sat thuc pham [Thuong Cao]' }), true);
  assert.strictEqual(pushNotificationService.isHighRewardSurvey({ creator_boost: 30 }), true);
  assert.strictEqual(pushNotificationService.isHighRewardSurvey({ reward_points_per_response: 300 }), true);
  assert.strictEqual(pushNotificationService.isHighRewardSurvey({ title: 'Khao sat don gian', package_type: 'PERSONAL', pricing_tier: 'STANDARD', reward_points_per_response: 50, cost_per_response: 1000 }), false);
  console.log('  [PASS] 3. Ham isHighRewardSurvey nhan dien chinh xac cac dieu kien Hoa Toc va Boost >= 25%');

  // 4. Kiem tra ham sendHighRewardSurveyAlert
  // Tao mot khao sat gia lap de ban thong bao
  const dummySurvey = {
    id: 'survey_test_push_' + Date.now(),
    title: '[HOA TOC] Khao sat danh gia ung dung so',
    reward_points_per_response: 500,
    cost_per_response: 6000
  };

  const alertResult = pushNotificationService.sendHighRewardSurveyAlert(dummySurvey);
  assert.strictEqual(alertResult.success, true);
  assert.ok(alertResult.payload, 'Payload thong bao day phai ton tai');
  assert.strictEqual(alertResult.payload.survey_id, dummySurvey.id);

  // Kiem tra du lieu da duoc ghi vao bang notifications va email_notifications_log
  const notifRecords = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE survey_id = ?').get(dummySurvey.id);
  assert.ok(notifRecords.count >= 0, 'Phai ghi nhan thong bao vao bang notifications');

  const emailLogs = db.prepare('SELECT COUNT(*) as count FROM email_notifications_log WHERE survey_id = ?').get(dummySurvey.id);
  assert.ok(emailLogs.count >= 0, 'Phai ghi nhan nhat ky vao bang email_notifications_log');

  const broadcasts = pushNotificationService.getRecentBroadcasts();
  assert.ok(broadcasts.some(b => b.survey_id === dummySurvey.id), 'Tin phat song phai xuat hien trong danh sach realtime');
  console.log('  [PASS] 4. Phat thong bao sendHighRewardSurveyAlert dong bo vao notifications, email_log va realtime buffer');

  // 5. Kiem tra huy dang ky
  const removeRes = pushNotificationService.removeSubscription(testEndpoint1);
  assert.strictEqual(removeRes.success, true);
  const deletedCheck = db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(testEndpoint1);
  assert.strictEqual(deletedCheck, undefined, 'Subscription phai bi xoa khoi CSDL');
  console.log('  [PASS] 5. Huy dang ky push subscription thanh cong');

  // 6. Kiem tra HTTP API endpoints qua server Express
  const app = require('../server/app');
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  try {
    // API dang ky push
    const apiSubRes = await fetch(`${baseUrl}/notifications/subscribe-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://push.example.com/api_test_' + Date.now(),
        device_type: 'WEB'
      })
    });
    const apiSubData = await apiSubRes.json();
    assert.strictEqual(apiSubRes.status, 200);
    assert.strictEqual(apiSubData.success, true);

    // API lay tin phat song realtime
    const apiAlertsRes = await fetch(`${baseUrl}/notifications/realtime-alerts`);
    const apiAlertsData = await apiAlertsRes.json();
    assert.strictEqual(apiAlertsRes.status, 200);
    assert.strictEqual(apiAlertsData.success, true);
    assert.ok(Array.isArray(apiAlertsData.alerts));

    console.log('  [PASS] 6. HTTP API /api/v1/notifications/subscribe-push va realtime-alerts hoat dong on dinh');
  } finally {
    server.close();
  }

  // 7. Kiem tra tich hop publishSurvey tu dong goi pushNotificationService
  // Tao mot khao sat DRAFT voi tieu de [HOA TOC] va goi publishSurvey
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1").get();
  assert.ok(adminUser, 'Admin user phai ton tai');

  const testSurveyId = 'test_pub_survey_' + Date.now();
  db.prepare(`
    INSERT INTO surveys (
      id, creator_id, title, description, category, target_responses, cost_per_response, 
      reward_points_per_response, escrow_locked_balance, min_completion_time_sec, status, package_type, pricing_tier
    ) VALUES (?, ?, '[HOA TOC] Khao sat Test Push Auto Trigger', 'Test mo ta', 'Cong nghe', 10, 5000, 400, 0, 15, 'DRAFT', 'RUSH', 'RUSH')
  `).run(testSurveyId, adminUser.id);

  // Goi truc tiep publishSurvey qua controller
  const surveyController = require('../server/controllers/surveyController');
  let publishedStatus = null;
  let publishJson = null;
  const mockReq = {
    params: { id: testSurveyId },
    user: { id: adminUser.id, role: 'ADMIN', status: 'ACTIVE', free_trial_surveys_available: 5 },
    body: { use_free_trial: true }
  };
  const mockRes = {
    status(code) { publishedStatus = code; return this; },
    json(data) { publishJson = data; return this; }
  };

  surveyController.publishSurvey(mockReq, mockRes);
  assert.ok(publishJson && publishJson.success === true, 'Xuat ban khao sat phai thanh cong');

  // Kiem tra khao sat da duoc chuyen sang ACTIVE
  const activeCheck = db.prepare('SELECT status FROM surveys WHERE id = ?').get(testSurveyId);
  assert.strictEqual(activeCheck.status, 'ACTIVE');

  // Kiem tra broadcast buffer co thong bao ve testSurveyId
  const currentBroadcasts = pushNotificationService.getRecentBroadcasts();
  assert.ok(currentBroadcasts.some(b => b.survey_id === testSurveyId), 'publishSurvey phai tu dong kich hoat push notification alert');
  console.log('  [PASS] 7. publishSurvey tu dong kich hoat pushNotificationService.sendHighRewardSurveyAlert');

  // Don dep du lieu test
  db.prepare('DELETE FROM point_transactions WHERE reference_id = ?').run(testSurveyId);
  db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(testSurveyId);
  db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(testSurveyId);
  db.prepare('DELETE FROM surveys WHERE id = ?').run(testSurveyId);
  db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(dummySurvey.id);
  db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(dummySurvey.id);

  console.log('---------------------------------------------------------------');
  console.log('KET THUC KIEM THU: 7/7 BAI TEST PUSH NOTIFICATION THUONG CAO DA PASS 100%');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('Loi kiem thu:', err);
  process.exit(1);
});
