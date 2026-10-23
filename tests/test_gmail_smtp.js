const config = require('../server/config');
const notificationService = require('../server/services/notificationService');

async function testGmail() {
  console.log('--- ĐANG KIỂM TRA GỬI EMAIL GMAIL SMTP ---');
  console.log('User:', config.SMTP.USER);
  console.log('Host:', config.SMTP.HOST);
  console.log('Port:', config.SMTP.PORT);

  const res = await notificationService.sendSmartEmail({
    toEmail: 'trungdzid3@gmail.com',
    toName: 'Trung',
    subject: '[VibeSurvey] 🚀 Kích hoạt thành công Gmail SMTP cho VibeSurvey!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px;">
        <h2 style="color: #0056D2; margin-top: 0;">⚡ VibeSurvey Email System</h2>
        <p style="color: #334155; font-size: 15px;">Chúc mừng bạn! Kênh gửi email qua Gmail SMTP đã hoạt động hoàn hảo và sẵn sàng phục vụ!</p>
        <div style="background: #ffffff; border: 2px dashed #10B981; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #10B981;">999888</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">Hạn mức: 500 email/ngày. Tỷ lệ vào hộp thư đến Inbox đạt 100%.</p>
      </div>
    `,
    textContent: 'VibeSurvey: Chúc mừng bạn! Gmail SMTP đã hoạt động thành công! Mã OTP thử nghiệm là: 999888'
  });

  console.log('KẾT QUẢ GỬI EMAIL:', res);
}

testGmail();
