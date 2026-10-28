const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'vibesurvey_default_secret_key_2026',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../db/vibesurvey.db'),
  
  // Cấu hình Cổng Thanh Toán & VietQR Napas247
  PAYMENT_GATEWAY: {
    BANK_ID: process.env.PAYMENT_BANK_ID || 'MB',
    BANK_NAME: process.env.PAYMENT_BANK_NAME || 'Ngân hàng Quân Đội (MBBank)',
    ACCOUNT_NUMBER: process.env.PAYMENT_ACCOUNT_NUMBER || '0335888888',
    ACCOUNT_NAME: process.env.PAYMENT_ACCOUNT_NAME || 'VIBESURVEY PLATFORM',
    TEMPLATE: process.env.PAYMENT_QR_TEMPLATE || 'compact',
    WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'vibesurvey_payment_secret_2026',
    ORDER_EXPIRE_MINUTES: 15
  },

  // Cấu hình Google OAuth 2.0 & Đồng Bộ Biểu Mẫu Hệ Thống
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/auth/google/callback`,
    SYNC_EMAIL: process.env.GOOGLE_SYNC_EMAIL || '',
    SYNC_COOKIE: process.env.GOOGLE_SYNC_COOKIE || process.env.GOOGLE_SESSION_COOKIE || ''
  },

  // Mô hình kinh tế (Unit Economics) theo chỉ đạo Argon Chief Visionary & KE_HOACH_TONG_THE.md
  ECONOMICS: {
    POINT_TO_VND_RATE: parseInt(process.env.BASE_EXCHANGE_RATE, 10) || 1, // Chuẩn 1:1 VNĐ (1 Point = 1 VNĐ, 1 Credit = 1 VNĐ)
    MIN_FIRST_TIME_PAYOUT_POINTS: 10000, // Ngưỡng rút phá băng lần đầu: 10.000 điểm = 10.000 VNĐ (chỉ thẻ cào)
    MIN_PAYOUT_POINTS: parseInt(process.env.MIN_PAYOUT_POINTS, 10) || 20000, // Ngưỡng rút tiêu chuẩn: 20.000 điểm (thẻ cào), 50.000đ (ngân hàng)
    PHONE_CARD_FEE_VND: 0, // Phí thẻ cào: 0đ (miễn phí 100%)
    BANK_TRANSFER_FEE_UNDER_100K_VND: 2000, // Phí ngân hàng rút < 100k: thu 2,000đ
    BANK_TRANSFER_FEE_FROM_100K_VND: 0, // Phí ngân hàng rút >= 100k: miễn phí
    SWAP_DISCOUNT_RATE: 0.70, // Đổi điểm sang credit nhận ít hơn (giữ lại cho tương thích ngược)
    SWAP_BONUS_RATE: 1.05, // Chuẩn mới: Đổi Point sang Credit nhận thưởng +5% (1.000 Point -> 1.050 Credit)
    MIN_SWAP_POINTS: 1000, // Ngưỡng tối thiểu đổi Point sang Credit: 1.000 Point (1.000đ)
    PLATFORM_TAKE_RATE: parseFloat(process.env.PLATFORM_TAKE_RATE) || 0.40, // 40% biên lợi nhuận sàn cơ sở
    PAYOUT_FIXED_FEE_VND: parseInt(process.env.PAYOUT_FEE_VND, 10) || 2000, // Phí rút tiền tiêu chuẩn 2,000 VND
    BASE_COST_PER_WEIGHT_VND: 500, // 500 VND cơ sở cho mỗi trọng số câu hỏi
    QUESTION_WEIGHTS: {
      SINGLE_CHOICE: 1.0,
      MULTIPLE_CHOICE: 1.0,
      LIKERT_SCALE: 1.2,
      OPEN_TEXT: 2.5
    },

    // --- BẢNG GIÁ SÀN TỐI THIỂU 3 PHÂN KHÚC (KE_HOACH_TONG_THE.md PHẦN I) ---
    TIER_FLOOR_PRICES: {
      STUDENT: { SHORT: 400, MEDIUM: 500, LONG: 600 },
      PERSONAL: { SHORT: 800, MEDIUM: 1000, LONG: 1200 },
      ENTERPRISE: { SHORT: 1500, MEDIUM: 2000, LONG: 2500 }
    },

    // Thù lao người điền ở mức giá sàn (khi không dùng lượt free / có dùng lượt free)
    FLOOR_REWARDS: {
      STUDENT: {
        STANDARD: { SHORT: 350, MEDIUM: 450, LONG: 540 },
        WITH_FREE_QUOTA: { SHORT: 280, MEDIUM: 360, LONG: 430 }
      },
      PERSONAL: {
        STANDARD: { SHORT: 600, MEDIUM: 750, LONG: 900 }
      },
      ENTERPRISE: {
        STANDARD: { SHORT: 1000, MEDIUM: 1300, LONG: 1600 }
      }
    },

    // 3 Nấc Giá Đề Xuất Theo SLA Gom Mẫu
    SLA_TIERS: {
      FLOOR: {
        multiplier: 1.0,
        label: 'Mức Sàn Tiết Kiệm',
        badge: 'Tiết kiệm',
        slaHours: '72-120h',
        slaText: '3 – 5 ngày',
        description: 'Sinh viên làm đề tài dài hạn, không gấp tiến độ, tối ưu ngân sách tối đa.'
      },
      RECOMMENDED: {
        multiplier: 1.25,
        label: 'Mức Đề Xuất Tiêu Chuẩn',
        badge: '[Đề Xuất]',
        slaHours: '24-48h',
        slaText: '24 – 48 giờ',
        description: 'Mặc định khuyên dùng để cân bằng hoàn hảo giữa chi phí và tốc độ thu mẫu.'
      },
      RUSH: {
        multiplier: 1.60,
        label: 'Mức Gom Hỏa Tốc',
        badge: '[Thưởng Cao]',
        slaHours: '2-6h',
        slaText: '2 – 6 giờ',
        description: 'Cần số liệu gấp trong ngày, bảng hỏi dài hoặc lọc đối tượng ngách khó tiếp cận.'
      }
    },

    // Tỷ lệ chia sẻ phần tiền tăng thêm Delta P (Creator Boost)
    BOOST_REWARD_SHARE: {
      STUDENT: 0.80,    // 80% cho người điền / 20% cho sàn
      PERSONAL: 0.80,   // 80% cho người điền / 20% cho sàn
      ENTERPRISE: 0.80  // 80% cho người điền / 20% cho sàn
    },

    // Phụ phí Bộ lọc Đối tượng & Auto-Screener
    TARGETING_FEE: {
      STUDENT: 100,     // +100đ/mẫu (+50đ cho người điền, +50đ về sàn)
      PERSONAL: 200,    // +200đ/mẫu (+150đ cho người điền, +50đ về sàn)
      ENTERPRISE: 0     // Miễn phí 100% cho doanh nghiệp
    },

    // Phân bổ phụ phí bộ lọc
    TARGETING_FEE_SPLIT: {
      STUDENT: { respondent: 50, platform: 50 },
      PERSONAL: { respondent: 150, platform: 50 },
      ENTERPRISE: { respondent: 0, platform: 0 }
    },

    // Bảng Mốc Nạp Tiền Mới (20.000đ - 5.000.000đ+)
    DEPOSIT_TIERS: [
      { amount: 20000, bonusRate: 0.00, bonusCredit: 0, vipTickets: 0, label: 'Sinh viên (50 mẫu)' },
      { amount: 50000, bonusRate: 0.02, bonusCredit: 1000, vipTickets: 0, label: 'Sinh viên (100 mẫu) / Cá nhân' },
      { amount: 100000, bonusRate: 0.03, bonusCredit: 3000, vipTickets: 0, label: 'Cá nhân (100 mẫu)' },
      { amount: 200000, bonusRate: 0.04, bonusCredit: 8000, vipTickets: 1, label: 'Cá nhân / Nhóm NCKH (Tặng 1 vé VIP)' },
      { amount: 500000, bonusRate: 0.05, bonusCredit: 25000, vipTickets: 2, label: 'Startup / SME nhỏ (Tặng 2 vé VIP)' },
      { amount: 1000000, bonusRate: 0.06, bonusCredit: 60000, vipTickets: 4, label: 'Doanh nghiệp Vàng (Tặng 4 vé VIP)' },
      { amount: 2000000, bonusRate: 0.08, bonusCredit: 160000, vipTickets: 8, label: 'Doanh nghiệp Bạch Kim (Tặng 8 vé VIP)' },
      { amount: 5000000, bonusRate: 0.10, bonusCredit: 500000, vipTickets: 20, label: 'Doanh nghiệp Kim Cương (Tặng 20 vé VIP)' }
    ],

    // Chiết khấu quy mô mẫu lớn cho Doanh nghiệp
    ENTERPRISE_VOLUME_DISCOUNTS: [
      { minResponses: 500, discountRate: 0.15, perks: ['FREE_VIP_PIN', 'FREE_PUSH_EMAIL', 'SPSS_EXPORT'] },
      { minResponses: 300, discountRate: 0.10, perks: ['FREE_PUSH_EMAIL'] },
      { minResponses: 100, discountRate: 0.00, perks: ['FREE_PUSH_EMAIL'] }
    ],

    // Giá trị gói dịch vụ Ghim VIP + Push APK + Email để truy thu nếu Doanh nghiệp hủy sớm
    PROMOTION_PACKAGE_FEE_VND: 40000,

    // Giới hạn định mức lượt điền form miễn phí
    FREE_QUOTA_LIMITS: {
      STUDENT_MONTHLY: 30, // 30 lượt/tháng (trừ tối đa 10 lượt cho mỗi 50 mẫu)
      PERSONAL_FIRST_SURVEY: 25 // 25 lượt cho bài khảo sát đầu tiên (từ 50 mẫu)
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

  // Ngưỡng kiểm soát gian lận (Anti-Fraud Thresholds) - KE_HOACH_TONG_THE.md PHẦN IV
  ANTI_FRAUD: {
    WORDS_PER_SECOND: 5.0, // Tốc độ đọc lướt tối đa của con người
    ACTION_TIME_SEC: {
      CHOICE: 0.5,
      TEXT: 0.0 // Tự luận = 0s
    },
    QUESTION_STANDARD_SECONDS: {
      CHOICE: 10, // Trắc nghiệm 10-12s
      LIKERT: 12, // Likert/Rating 12-15s
      GRID_ROW: 5, // Lưới 5s/hàng
      OPEN_TEXT: 0 // Tự luận 0s
    },
    SPEED_TRAP: {
      REJECT_RATIO: 0.35, // < 35% thời gian chuẩn -> REJECTED, trừ -12 điểm uy tín
      SUSPICIOUS_RATIO: 0.60 // 35% - <60% thời gian chuẩn -> SUSPICIOUS, trừ -5 điểm uy tín
    },
    MIN_QUALITY_SCORE: 0.8, // Ngưỡng chấp nhận tự động
    MANUAL_REVIEW_SCORE: 0.5, // Dưới 0.8 nhưng >= 0.5: kiểm duyệt thủ công
    INITIAL_TRUST_SCORE: 85.0, // Điểm uy tín khởi tạo tài khoản mới
    MIN_TRUST_SCORE_PAYOUT: 60.0, // Điểm uy tín tối thiểu để được tạo lệnh rút tiền
    BAN_TRUST_SCORE_THRESHOLD: 40.0, // Điểm uy tín dưới 40 tự động khóa tài khoản
    TRUST_SCORE_DELTAS: {
      VALIDATED: 2.0, // Nộp bài chuẩn +2 điểm uy tín
      SCREENED_OUT: 0.2, // Dừng ở câu lọc +0.2 điểm uy tín (0 Point tiền mặt)
      SUSPICIOUS: -5.0, // Nghi vấn -5 điểm uy tín
      REJECTED: -12.0 // Từ chối gian lận trừ -12 điểm uy tín
    },
    DEVICE_MULTI_ACCOUNT_BAN_THRESHOLD: 3 // Chỉ tự động khóa nick khi >= 3 tài khoản trùng device_fingerprint trong 24h
  },

  // Cấu hình dịch vụ Email Brevo (Sendinblue)
  BREVO: {
    API_KEY: process.env.BREVO_API_KEY || '',
    SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'no-reply@vibesurvey.com',
    SENDER_NAME: process.env.BREVO_SENDER_NAME || 'VibeSurvey Platform'
  },

  // Cấu hình dịch vụ Email Gmail SMTP SSL (Cổng 465)
  SMTP: {
    HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.SMTP_PORT, 10) || 465,
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASS || '',
    FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    FROM_NAME: process.env.SMTP_FROM_NAME || 'VibeSurvey Platform'
  },

  // Cấu hình dịch vụ Email Outlook / Hotmail SMTP (Cổng 587 STARTTLS)
  OUTLOOK: {
    HOST: process.env.OUTLOOK_HOST || 'smtp.office365.com',
    PORT: parseInt(process.env.OUTLOOK_PORT, 10) || 587,
    USER: process.env.OUTLOOK_USER || '',
    PASS: process.env.OUTLOOK_PASS || '',
    FROM_EMAIL: process.env.OUTLOOK_FROM_EMAIL || process.env.OUTLOOK_USER || '',
    FROM_NAME: process.env.OUTLOOK_FROM_NAME || 'VibeSurvey Platform'
  }
};
