const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'vibesurvey_default_secret_key_2026',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../db/vibesurvey.db'),
  
  // Cấu hình Google OAuth 2.0
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/auth/google/callback`
  },

  // Mô hình kinh tế (Unit Economics) theo chỉ đạo Argon Chief Visionary
  ECONOMICS: {
    POINT_TO_VND_RATE: parseInt(process.env.BASE_EXCHANGE_RATE, 10) || 10, // 1 Point = 10 VND
    MIN_FIRST_TIME_PAYOUT_POINTS: 1000, // Ngưỡng rút phá băng lần đầu: 1,000 điểm = 10,000 VNĐ (chỉ thẻ cào)
    MIN_PAYOUT_POINTS: parseInt(process.env.MIN_PAYOUT_POINTS, 10) || 5000, // Ngưỡng rút tiêu chuẩn: 5,000 điểm = 50,000 VNĐ
    PHONE_CARD_FEE_VND: 0, // Phí thẻ cào: 0đ (miễn phí 100%)
    BANK_TRANSFER_FEE_UNDER_100K_VND: 2000, // Phí ngân hàng rút < 100k: thu 2,000đ
    BANK_TRANSFER_FEE_FROM_100K_VND: 0, // Phí ngân hàng rút >= 100k: miễn phí
    SWAP_DISCOUNT_RATE: 0.70, // Đổi điểm sang credit tạo form nhận ít hơn (Chỉ nhận 70% giá trị = 7 VND Credit / Point, Phí sàn 30%)
    PLATFORM_TAKE_RATE: parseFloat(process.env.PLATFORM_TAKE_RATE) || 0.40, // 40% biên lợi nhuận sàn
    PAYOUT_FIXED_FEE_VND: parseInt(process.env.PAYOUT_FEE_VND, 10) || 2000, // Phí rút tiền tiêu chuẩn 2,000 VND
    BASE_COST_PER_WEIGHT_VND: 500, // 500 VND cơ sở cho mỗi trọng số câu hỏi
    QUESTION_WEIGHTS: {
      SINGLE_CHOICE: 1.0,
      MULTIPLE_CHOICE: 1.0,
      LIKERT_SCALE: 1.2,
      OPEN_TEXT: 2.5
    },

    // --- CẤU HÌNH KINH TẾ HỌC & ĐỊNH GIÁ CPI (MỤC 1 & 10 KẾ HOẠCH TỔNG THỂ) ---
    BASE_PAYOUT_PER_MINUTE_VND: 700, // Thù lao cơ sở 700đ/phút (42.000đ/giờ thù lao cho đáp viên)
    DYNAMIC_TAKE_RATE: {
      SHORT: 0.50, // Khảo sát ngắn (1 - 3 phút): Sàn giữ 50%
      STANDARD: 0.40, // Khảo sát tiêu chuẩn (5 - 10 phút): Sàn giữ 40%
      DEEP: 0.35 // Khảo sát chuyên sâu (12 - 25 phút): Sàn giữ 35%
    },
    IR_MULTIPLIERS: {
      GENERAL: 1.0, // Đại chúng (IR 70-100%): Hệ số 1.0x
      MEDIUM: 1.35, // Trung bình (IR 30-69%): Hệ số 1.35x
      HARD: 1.8, // Khó / Ngách (IR 10-29%): Hệ số 1.8x
      NICHE: 2.5 // Cực hiếm (IR < 10%): Hệ số 2.5x
    },
    QUESTION_LOI_SECONDS: {
      SINGLE_CHOICE: 17, // ~17 giây (3.5 câu/phút)
      MULTIPLE_CHOICE: 17, // ~17 giây
      LIKERT_SCALE: 20, // 20 giây
      OPEN_TEXT: 45 // 45 giây
    },
    TARGETING_FEE_PER_FILTER_VND: 1000, // Phí lọc sâu nhân khẩu học 1.000đ/phiếu/tiêu chí
    FAST_DELIVERY_SURCHARGE_RATE: 0.25, // Phí gói hỏa tốc hoàn thành trong 6h (+25%)
    AI_INSIGHTS_REPORT_FEE_VND: 500000 // Gói báo cáo AI Insights & SPSS: 500.000đ/dự án
  },

  // Ngưỡng kiểm soát gian lận (Anti-Fraud Thresholds)
  ANTI_FRAUD: {
    WORDS_PER_SECOND: 5.0, // Tốc độ đọc lướt tối đa của con người
    ACTION_TIME_SEC: {
      CHOICE: 1.5,
      TEXT: 8.0
    },
    MIN_QUALITY_SCORE: 0.8, // Ngưỡng chấp nhận tự động
    MANUAL_REVIEW_SCORE: 0.5, // Dưới 0.8 nhưng >= 0.5: kiểm duyệt thủ công
    MIN_TRUST_SCORE_PAYOUT: 60.0, // Điểm uy tín tối thiểu để được tạo lệnh rút tiền
    BAN_TRUST_SCORE_THRESHOLD: 40.0 // Điểm uy tín bị khóa tài khoản
  },

  // Cấu hình dịch vụ Email Brevo (Sendinblue)
  BREVO: {
    API_KEY: process.env.BREVO_API_KEY || '',
    SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'no-reply@vibesurvey.com',
    SENDER_NAME: process.env.BREVO_SENDER_NAME || 'VibeSurvey Platform'
  },

  // Cấu hình dịch vụ Email SMTP dự phòng (Gmail / Outlook / Custom SMTP)
  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.SMTP_PORT, 10) || 465,
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASS || '',
    FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    FROM_NAME: process.env.SMTP_FROM_NAME || 'VibeSurvey Platform'
  },

  // Cấu hình dịch vụ Email Resend (resend.com API v1)
  RESEND: {
    API_KEY: process.env.RESEND_API_KEY || '',
    FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    FROM_NAME: process.env.RESEND_FROM_NAME || 'VibeSurvey Platform'
  }
};
