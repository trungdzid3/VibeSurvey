/**
 * Bộ kiểm thử Tầng 12: Anti-Abuse, Anti-Sybil & Device/IP Guardrails Suite
 * Kiểm tra các chốt chặn an ninh tối cao:
 * 1. Lọc trùng link biểu mẫu (Anti-Duplicate Form URL): Chuẩn hóa và chặn dùng lại link form đã có
 * 2. Điều kiện nhận ưu đãi Free Trial: Bắt buộc liên kết Google hoặc xác thực Email
 * 3. Chặn trùng lặp Google ID: Một tài khoản Google không thể liên kết cho nhiều tài khoản VibeSurvey
 * 4. Giám sát IP/Thiết bị: Gửi cảnh báo Khả Nghi về Admin khi có >= 3 tài khoản trên 1 thiết bị
 * 5. Tự động BAN IP khi có >= 5 tài khoản trên cùng 1 IP/thiết bị
 * 6. Chặn toàn cục mọi request từ IP đã bị Ban
 * 7. Admin xem danh sách IP bị Ban và gỡ Ban thành công
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('../server/config');
const app = require('../server/app');
const db = require('../server/db/database');
const antiFraudService = require('../server/services/antiFraudService');

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

async function runAntiAbuseTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: AN NINH TÀI KHOẢN, LỌC TRÙNG FORM & AUTO BAN IP');
  console.log('===============================================================');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const user1Email = `user1_guard_${uniqueSuffix}@vibesurvey.com`;
  const user2Email = `user2_guard_${uniqueSuffix}@vibesurvey.com`;
  const adminEmail = 'admin@vibesurvey.com';
  const password = 'Password@123456';

  // Dọn dẹp dữ liệu IP kiểm thử cũ nếu có để khởi tạo môi trường sạch
  db.prepare("DELETE FROM banned_ips WHERE ip_address LIKE '198.51.%'").run();
  db.prepare("DELETE FROM device_ip_logs WHERE ip_address LIKE '198.51.%'").run();

  const cleanIp1 = `198.51.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200) + 10}`;
  const cleanIp2 = `198.51.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200) + 10}`;
  const cleanFingerprint1 = `device_clean_1_${uniqueSuffix}`;
  const cleanFingerprint2 = `device_clean_2_${uniqueSuffix}`;

  let user1Token = null;
  let user1Id = null;
  let user2Token = null;
  let user2Id = null;
  let adminToken = null;

  try {
    // 0. Tạo token Admin chuẩn từ database để dùng cho các endpoint quản trị
    const adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 1. Đăng ký tài khoản 1
    await runTest('1. Đăng ký tài khoản 1: Nhận diện ban đầu chưa liên kết Google / Email', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': cleanIp1,
          'X-Device-Fingerprint': cleanFingerprint1
        },
        body: JSON.stringify({ email: user1Email, password, name: 'Người Dùng 1' })
      });
      const data = await res.json();
      if (res.status !== 201) {
        console.error('Test 1 thất bại:', res.status, data);
      }
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.user.is_google_linked, 0);
      assert.strictEqual(data.user.is_email_verified, 0);
      assert.strictEqual(data.user.free_trial_surveys_available, 1);
      user1Token = data.token;
      user1Id = data.user.id;
    });

    // 2. Kiểm tra điều kiện nhận ưu đãi Free Trial
    let survey1Id = null;
    await runTest('2. Chặn xuất bản Free Trial khi tài khoản chưa liên kết Google hoặc Email', async () => {
      // Tạo bài khảo sát 25 mẫu
      const surRes = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({
          title: 'Khảo sát cần liên kết bảo mật',
          target_responses: 25,
          reward_points_per_response: 200,
          questions: [{ id: 'q1', type: 'SINGLE_CHOICE', content: 'C1', options: ['A', 'B'] }]
        })
      });
      const surData = await surRes.json();
      survey1Id = surData.surveyId;

      // Thử xuất bản free trial
      const pubRes = await fetch(`${baseUrl}/surveys/${survey1Id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({ use_free_trial: true })
      });
      const pubData = await pubRes.json();
      assert.strictEqual(pubRes.status, 400);
      assert.strictEqual(pubData.requireVerification, true);
      assert.ok(pubData.message.includes('liên kết tài khoản Google hoặc xác thực Email'));
    });

    // 3. Liên kết tài khoản Google thành công
    const googleId1 = `google_sub_${uniqueSuffix}`;
    await runTest('3. Liên kết tài khoản Google thành công -> Đủ điều kiện kích hoạt Free Trial', async () => {
      const linkRes = await fetch(`${baseUrl}/auth/link-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({ google_id: googleId1, google_email: 'google_user@gmail.com' })
      });
      const linkData = await linkRes.json();
      assert.strictEqual(linkRes.status, 200);
      assert.strictEqual(linkData.success, true);
      assert.strictEqual(linkData.user.is_google_linked, 1);

      // Thử xuất bản lại -> Thành công 0đ!
      const pubRes = await fetch(`${baseUrl}/surveys/${survey1Id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({ use_free_trial: true })
      });
      const pubData = await pubRes.json();
      assert.strictEqual(pubRes.status, 200);
      assert.strictEqual(pubData.isFreeTrial, true);
    });

    // 4. Chặn dùng lại Google ID cho tài khoản thứ 2
    await runTest('4. Chống tạo acc clone: Chặn liên kết Google ID đã được dùng trước đó', async () => {
      // Đăng ký user 2
      const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': cleanIp2,
          'X-Device-Fingerprint': cleanFingerprint2
        },
        body: JSON.stringify({ email: user2Email, password, name: 'Người Dùng 2' })
      });
      const regData = await regRes.json();
      user2Token = regData.token;
      user2Id = regData.user.id;

      // Cố tình liên kết lại googleId1
      const linkRes = await fetch(`${baseUrl}/auth/link-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user2Token}`
        },
        body: JSON.stringify({ google_id: googleId1 })
      });
      const linkData = await linkRes.json();
      assert.strictEqual(linkRes.status, 409);
      assert.strictEqual(linkData.success, false);
      assert.ok(linkData.message.includes('đã được liên kết với một tài khoản khác'));
    });

    // 5. Lọc trùng link biểu mẫu (Anti-Duplicate Form URL)
    await runTest('5. Lọc trùng biểu mẫu: Chặn tạo khảo sát sử dụng lại đường link Google Forms đã có', async () => {
      const testFormUrl = `https://docs.google.com/forms/d/e/1FAIpQLSc_DUPLICATE_TEST_${uniqueSuffix}/viewform?usp=sf_link`;

      // User 1 tạo form với link này
      const sur1Res = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({
          title: 'Khảo sát link gốc',
          external_form_url: testFormUrl,
          target_responses: 20,
          reward_points_per_response: 200,
          questions: [{ id: 'q1', type: 'SINGLE_CHOICE', content: 'C1', options: ['A', 'B'] }]
        })
      });
      assert.strictEqual(sur1Res.status, 201);

      // User 2 cố tình tạo một form khác nhưng dùng cùng link này (thậm chí thay đổi query param)
      const modifiedUrl = `https://docs.google.com/forms/d/e/1FAIpQLSc_DUPLICATE_TEST_${uniqueSuffix}/viewform?usp=sharing&fbclid=xyz123`;
      const sur2Res = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user2Token}`
        },
        body: JSON.stringify({
          title: 'Khảo sát cố tình dùng lại link cũ',
          external_form_url: modifiedUrl,
          target_responses: 20,
          reward_points_per_response: 200,
          questions: [{ id: 'q1', type: 'SINGLE_CHOICE', content: 'C1', options: ['A', 'B'] }]
        })
      });

      const sur2Data = await sur2Res.json();
      assert.strictEqual(sur2Res.status, 400);
      assert.strictEqual(sur2Data.isDuplicateForm, true);
      assert.ok(sur2Data.message.includes('Đường link biểu mẫu này đã được sử dụng trong hệ thống'));
    });

    // 6. Giám sát IP/Thiết bị: Cảnh báo Khả Nghi khi có >= 3 tài khoản trên 1 IP
    const targetSybilIp = `203.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 200) + 10}`;
    const targetDeviceFingerprint = `sybil_device_id_${uniqueSuffix}_${Date.now()}`;

    await runTest('6. Giám sát đa tài khoản: Kích hoạt Cảnh Báo Khả Nghi khi có 3 tài khoản trên 1 IP/thiết bị', async () => {
      // Tạo 3 acc liên tiếp trên cùng 1 IP
      for (let i = 1; i <= 3; i++) {
        const email = `sybil_user_${i}_${uniqueSuffix}@vibesurvey.com`;
        const res = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': targetSybilIp,
            'X-Device-Fingerprint': targetDeviceFingerprint
          },
          body: JSON.stringify({ email, password, name: `Sybil User ${i}` })
        });
        assert.strictEqual(res.status, 201);
      }

      // Kiểm tra trong fraud_logs có ghi nhận CANH_BAO_KHA_NGHI_MULTI_ACCOUNT
      const alertLog = db.prepare(`
        SELECT * FROM fraud_logs 
        WHERE ip_address = ? AND reason = 'CANH_BAO_KHA_NGHI_MULTI_ACCOUNT'
      `).get(targetSybilIp);

      assert.ok(alertLog, 'Hệ thống phải tự động gửi cảnh báo khả nghi về bảng fraud_logs cho Admin');
    });

    // 7. Tự động BAN IP khi đạt ngưỡng 5 tài khoản trên 1 IP/thiết bị
    await runTest('7. Tự động BAN IP: Khi có >= 5 tài khoản trên 1 IP, hệ thống tự động khóa IP và từ chối 403', async () => {
      // Tạo tiếp acc thứ 4
      const res4 = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': targetSybilIp,
          'X-Device-Fingerprint': targetDeviceFingerprint
        },
        body: JSON.stringify({ email: `sybil_user_4_${uniqueSuffix}@vibesurvey.com`, password, name: 'Sybil User 4' })
      });
      assert.strictEqual(res4.status, 201);

      // Tạo acc thứ 5 -> Kích hoạt Auto-Ban IP!
      const res5 = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': targetSybilIp,
          'X-Device-Fingerprint': targetDeviceFingerprint
        },
        body: JSON.stringify({ email: `sybil_user_5_${uniqueSuffix}@vibesurvey.com`, password, name: 'Sybil User 5' })
      });
      const data5 = await res5.json();
      assert.strictEqual(res5.status, 403);
      assert.strictEqual(data5.isBanned, true);

      // Kiểm tra IP đã nằm trong bảng banned_ips
      const bannedRow = db.prepare('SELECT * FROM banned_ips WHERE ip_address = ?').get(targetSybilIp);
      assert.ok(bannedRow, 'IP mục tiêu phải nằm trong bảng banned_ips');

      // Mọi request tiếp theo từ IP này gửi lên đều bị Middleware chặn đứng (403)
      const blockRes = await fetch(`${baseUrl}/surveys`, {
        headers: {
          'X-Forwarded-For': targetSybilIp,
          'Authorization': `Bearer ${user1Token}`
        }
      });
      const blockData = await blockRes.json();
      assert.strictEqual(blockRes.status, 403);
      assert.strictEqual(blockData.isBanned, true);
    });

    // 8. Admin xem danh sách IP bị Ban và Gỡ Ban (Unban IP)
    await runTest('8. Quyền Quản Trị: Admin tra cứu danh sách Banned IPs và gỡ cấm IP thành công', async () => {
      // 1. Lấy danh sách banned IPs
      const listRes = await fetch(`${baseUrl}/admin/banned-ips`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const listData = await listRes.json();
      assert.strictEqual(listRes.status, 200);
      assert.ok(Array.isArray(listData.bannedIps));
      const found = listData.bannedIps.some(b => b.ip_address === targetSybilIp);
      assert.strictEqual(found, true);

      // 2. Gỡ cấm IP
      const unbanRes = await fetch(`${baseUrl}/admin/unban-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ip_address: targetSybilIp })
      });
      const unbanData = await unbanRes.json();
      assert.strictEqual(unbanRes.status, 200);
      assert.strictEqual(unbanData.success, true);

      // Kiểm tra IP không còn trong banned_ips
      const checkBanned = db.prepare('SELECT * FROM banned_ips WHERE ip_address = ?').get(targetSybilIp);
      assert.strictEqual(checkBanned, undefined);
    });

  } finally {
    server.close();
  }

  console.log('---------------------------------------------------------------');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI THÀNH CÔNG (100% PASS)`);
  console.log('🛡️ HỆ THỐNG AN NINH ĐA TẦNG, LỌC TRÙNG FORM & AUTO-BAN IP HOÀN THIỆN XUẤT SẮC!');
  console.log('===============================================================\n');
}

if (require.main === module) {
  runAntiAbuseTests().catch((err) => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  });
}

module.exports = runAntiAbuseTests;
