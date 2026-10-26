const fs = require('fs');
const path = require('path');

// 1. Cập nhật server/services/notificationService.js
const notifFile = path.join(__dirname, '..', 'server', 'services', 'notificationService.js');
let notifContent = fs.readFileSync(notifFile, 'utf8');

const helperMethod = `  /**
   * Tạo mẫu email OTP chuẩn Master Template tương thích 100% với Gmail Action Card
   * Tự động kích hoạt widget "Cần nhập mã" [Mã OTP] [Sao chép mã] trên Gmail Android/iOS/Web
   */
  buildOtpEmailTemplate({
    title = 'XÁC THỰC TÀI KHOẢN',
    subtitle = 'Bảo mật tài khoản VibeSurvey',
    name = 'bạn',
    otp,
    validMinutes = 10,
    actionDescription = 'xác thực tài khoản',
    note = 'Tuyệt đối không chia sẻ mã này cho bất kỳ ai.'
  }) {
    const brandDark = '#0F172A';
    const brandAccent = '#D97706';

    return \`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${title} - \${otp}</title>
  <!-- Schema.org Markup cho Google Email Actions -->
  <script type="application/ld+json">
  {
    "@context": "http://schema.org",
    "@type": "EmailMessage",
    "description": "\${title}: \${otp}"
  }
  </script>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <!-- Hidden Preheader: Gmail Heuristic đọc chính xác câu này để dựng widget "Cần nhập mã" + "Sao chép mã" -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    Mã xác thực của bạn là \${otp}. Mã này có hiệu lực trong \${validMinutes} phút. Tuyệt đối không chia sẻ mã xác thực này cho người khác.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header Thương hiệu -->
          <tr>
            <td style="background: \${brandDark}; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">VIBESURVEY</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">\${title}</p>
            </td>
          </tr>

          <!-- Nội dung chính -->
          <tr>
            <td style="padding: 32px 28px; text-align: center;">
              <p style="font-size: 15px; color: #334155; margin-top: 0; text-align: left;">
                Xin chào <strong>\${name}</strong>,
              </p>
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: left; margin: 12px 0 24px;">
                Bạn vừa yêu cầu \${actionDescription} trên nền tảng VibeSurvey. Dưới đây là mã xác thực 6 chữ số One-Time Password (OTP) của bạn:
              </p>

              <!-- Khung Mã OTP Tối ưu cho Gmail Android Heuristic Copy -->
              <div style="margin: 24px auto; background: #F8FAFC; border: 2px dashed \${brandAccent}; border-radius: 12px; padding: 20px 24px; display: inline-block;">
                <span class="verification-code" style="font-size: 38px; font-weight: 800; font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace; letter-spacing: 10px; color: \${brandAccent}; display: inline-block; padding-left: 10px;">\${otp}</span>
              </div>

              <p style="font-size: 13px; color: #64748b; margin: 20px 0 6px;">
                Mã xác thực có hiệu lực trong vòng <strong>\${validMinutes} phút</strong>.
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                \${note}
              </p>
            </td>
          </tr>

          <!-- Footer Hợp chuẩn CAN-SPAM & Google Sender Guidelines -->
          <tr>
            <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0 0 6px; font-weight: 600; color: #64748b;">
                VibeSurvey Platform • Nền tảng khảo sát trực tuyến & đổi thưởng uy tín
              </p>
              <p style="margin: 0;">
                Email này được gửi tự động từ hệ thống bảo mật. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua thư hoặc liên hệ trung tâm hỗ trợ.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>\`;
  }
`;

if (!notifContent.includes('buildOtpEmailTemplate')) {
  notifContent = notifContent.replace(
    'module.exports = new NotificationService();',
    helperMethod + '\nmodule.exports = new NotificationService();'
  );
  fs.writeFileSync(notifFile, notifContent, 'utf8');
  console.log('Đã bổ sung buildOtpEmailTemplate vào notificationService.js');
}

// 2. Cập nhật server/controllers/authController.js
const authFile = path.join(__dirname, '..', 'server', 'controllers', 'authController.js');
let authContent = fs.readFileSync(authFile, 'utf8');

// Thay thế emailHtml của sendOtpRegister
const registerTargetRegex = /const emailSubject = `\[VibeSurvey\] Mã xác thực đăng ký tài khoản: \${otp}`;[\s\S]*?const emailHtml = `[\s\S]*?`;/;
const newRegisterEmail = `const emailSubject = \`[VibeSurvey] Mã xác thực đăng ký tài khoản của bạn: \${otp}\`;
      const emailHtml = notificationService.buildOtpEmailTemplate({
        title: 'XÁC THỰC ĐĂNG KÝ TÀI KHOẢN',
        name: name || 'Bạn',
        otp,
        validMinutes: 10,
        actionDescription: 'đăng ký tài khoản mới & nhận 25 lượt khảo sát miễn phí',
        note: 'Tuyệt đối không cung cấp mã OTP này cho bất kỳ ai.'
      });`;

if (registerTargetRegex.test(authContent)) {
  authContent = authContent.replace(registerTargetRegex, newRegisterEmail);
  console.log('Đã cập nhật email đăng ký trong authController.js');
}

// Thay thế emailHtml của forgotPassword
const forgotTargetRegex = /const emailSubject = `\[VibeSurvey\] Mã xác thực tài khoản của bạn: \${otp}`;[\s\S]*?const emailHtml = `[\s\S]*?`;/;
const newForgotEmail = `const emailSubject = \`[VibeSurvey] Mã xác thực tài khoản của bạn: \${otp}\`;
        const emailHtml = notificationService.buildOtpEmailTemplate({
          title: 'XÁC THỰC TÀI KHOẢN & ĐẶT LẠI MẬT KHẨU',
          name: user.name || 'Bạn',
          otp,
          validMinutes: 10,
          actionDescription: 'xác thực tài khoản và đặt lại mật khẩu',
          note: 'Nếu bạn không gửi yêu cầu này, vui lòng đổi mật khẩu ngay để bảo vệ tài khoản.'
        });`;

if (forgotTargetRegex.test(authContent)) {
  authContent = authContent.replace(forgotTargetRegex, newForgotEmail);
  console.log('Đã cập nhật email quên mật khẩu trong authController.js');
}

// Thay thế emailHtml của sendStudentEmailOtp
const studentTargetRegex = /const emailSubject = `\[VibeSurvey\] Ma xac thuc email sinh vien: \${otp}`;[\s\S]*?const emailHtml = `[\s\S]*?`;/;
const newStudentEmail = `const emailSubject = \`[VibeSurvey] Mã xác thực email sinh viên của bạn: \${otp}\`;
      const emailHtml = notificationService.buildOtpEmailTemplate({
        title: 'XÁC THỰC EMAIL SINH VIÊN',
        name: user.name || 'Bạn sinh viên',
        otp,
        validMinutes: 5,
        actionDescription: 'xác minh email trường để kích hoạt Gói Sinh Viên và định mức 30 lượt free/tháng',
        note: 'Mã có hiệu lực trong 5 phút. Vui lòng nhập mã để hoàn tất xác thực sinh viên.'
      });`;

if (studentTargetRegex.test(authContent)) {
  authContent = authContent.replace(studentTargetRegex, newStudentEmail);
  console.log('Đã cập nhật email sinh viên trong authController.js');
}

fs.writeFileSync(authFile, authContent, 'utf8');
console.log('Đã hoàn tất cập nhật Master Email Template!');
