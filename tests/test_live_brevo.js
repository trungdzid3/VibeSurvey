require('dotenv').config();
const notificationService = require('../server/services/notificationService');
const db = require('../server/db/database');
const config = require('../server/config');

async function main() {
  console.log('--- ĐANG GỬI EMAIL THÔNG BÁO KHẢO SÁT MỚI KÈM LINK TRỰC TIẾP ---');
  try {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get('37dc72a4-216e-4e67-9743-e3f781ac1d0f') || {
      id: 'demo-survey-123',
      title: 'Nghiên cứu Xu hướng Mua sắm Trực tuyến & Thương mại Điện tử 2026',
      category: 'Thương mại điện tử',
      description: 'Khảo sát thói quen tiêu dùng trên sàn Shopee, TikTok Shop và trải nghiệm thanh toán.'
    };

    const rewardPoints = survey.reward_points_per_response || 500;
    const rewardVnd = rewardPoints * 10;
    const appBaseUrl = config.APP_URL || 'http://localhost:3000';
    const surveyUrl = `${appBaseUrl}/?survey=${survey.id}`;

    console.log('Địa chỉ link chuyển thẳng tới bài khảo sát:', surveyUrl);

    const emailHtml = notificationService._buildFastTrackEmailHtml(
      survey,
      { name: 'Trung Nguyen' },
      rewardPoints,
      rewardVnd,
      surveyUrl
    );

    const result = await notificationService.sendBrevoEmail({
      toEmail: 'trungdzid3@gmail.com',
      toName: 'Trung Nguyen',
      subject: `⚡ [VibeSurvey] Khảo sát mới: ${survey.title}`,
      htmlContent: emailHtml,
      textContent: `Hệ thống vừa mở bài khảo sát mới "${survey.title}" với thù lao +${rewardPoints.toLocaleString()} điểm (~${rewardVnd.toLocaleString()}đ). Bấm vào liên kết sau để làm bài ngay: ${surveyUrl}`
    });

    console.log('Kết quả Brevo phản hồi:', JSON.stringify(result, null, 2));
    if (result.success && result.messageId) {
      console.log('>>> THÀNH CÔNG: Email thông báo có link khảo sát đã được gửi với messageId:', result.messageId);
    }
  } catch (err) {
    console.error('Lỗi gửi email:', err);
  }
}

main();
