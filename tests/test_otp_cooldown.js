const db = require('../server/db/database');
const authController = require('../server/controllers/authController');

async function testOtpCooldown() {
  console.log('--- TEST COOLDOWN 60S VÀ CƠ CHẾ HỦY MÃ CŨ ---');
  const email = 'cooldown_test_' + Date.now() + '@example.com';
  
  // Lần 1: Gửi mã OTP
  const mockReq1 = { body: { email, name: 'Tester' } };
  let resData1 = null;
  const mockRes1 = {
    status: (code) => ({ json: (d) => { resData1 = { code, ...d }; } }),
    json: (d) => { resData1 = { code: 200, ...d }; }
  };
  await authController.sendRegistrationOtp(mockReq1, mockRes1);
  console.log('Lần 1 gửi OTP:', resData1.code, resData1.message);
  
  const rec1 = db.prepare('SELECT otp, expires_at FROM registration_otps WHERE email = ?').get(email);
  const otp1 = rec1.otp;
  console.log('Mã OTP lần 1 trong DB là:', otp1);

  // Lần 2: Gửi ngay lập tức (chưa đủ 60s) -> Phải bị chặn 429
  let resData2 = null;
  const mockRes2 = {
    status: (code) => ({ json: (d) => { resData2 = { code, ...d }; } }),
    json: (d) => { resData2 = { code: 200, ...d }; }
  };
  await authController.sendRegistrationOtp(mockReq1, mockRes2);
  console.log('Lần 2 gửi ngay lập tức:', resData2.code, resData2.message);

  if (resData2.code === 429) {
    console.log('✅ PASS: Cooldown 60s chặn spam bấm liên tục thành công!');
  } else {
    console.error('❌ FAIL: Không chặn được cooldown!');
  }

  // Giả lập tua nhanh 65s trong DB để test cơ chế hủy mã cũ
  db.prepare("UPDATE registration_otps SET created_at = datetime('now', '-65 seconds') WHERE email = ?").run(email);
  
  let resData3 = null;
  const mockRes3 = {
    status: (code) => ({ json: (d) => { resData3 = { code, ...d }; } }),
    json: (d) => { resData3 = { code: 200, ...d }; }
  };
  await authController.sendRegistrationOtp(mockReq1, mockRes3);
  console.log('Lần 3 (sau khi hết cooldown 60s):', resData3.code, resData3.message);
  
  const rec2 = db.prepare('SELECT otp, expires_at FROM registration_otps WHERE email = ?').get(email);
  const otp2 = rec2.otp;
  console.log('Mã OTP mới lần 2 trong DB là:', otp2);

  if (otp1 !== otp2) {
    console.log('✅ PASS: Mã cũ [' + otp1 + '] đã bị HỦY HOÀN TOÀN và thay thế bằng mã mới [' + otp2 + ']!');
  } else {
    console.error('❌ FAIL: Mã cũ chưa bị hủy!');
  }

  // Dọn dẹp
  db.prepare('DELETE FROM registration_otps WHERE email = ?').run(email);
  console.log('--- HOÀN TẤT KIỂM THỬ ---');
}

testOtpCooldown();
