const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Đảm bảo thư mục db tồn tại
const dbDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(config.DB_PATH);

// Kích hoạt WAL mode, Foreign Keys & Busy Timeout cho độ bền ACID cao nhất
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

function initSchema() {
  db.exec(`
    -- Bảng Người Dùng & Số Dư Ví
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('RESPONDENT', 'CREATOR', 'ADMIN')),
      credit_balance REAL DEFAULT 0.0,
      point_balance INTEGER DEFAULT 0,
      trust_score REAL DEFAULT 100.0,
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'BANNED')),
      free_trial_surveys_available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Bảng Chiến Dịch Khảo Sát
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Thị trường',
      target_responses INTEGER NOT NULL DEFAULT 100,
      collected_responses INTEGER DEFAULT 0,
      cost_per_response REAL NOT NULL,
      reward_points_per_response INTEGER NOT NULL,
      escrow_locked_balance REAL DEFAULT 0.0,
      min_completion_time_sec INTEGER DEFAULT 15,
      google_sheets_webhook_url TEXT,
      is_free_trial INTEGER DEFAULT 0,
      status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'FUNDED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CLOSED')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Bảng Câu Hỏi Khảo Sát
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'LIKERT_SCALE', 'OPEN_TEXT')),
      content TEXT NOT NULL,
      options_json TEXT,
      is_attention_check INTEGER DEFAULT 0,
      expected_answer TEXT,
      is_screener INTEGER DEFAULT 0,
      qualifying_answer TEXT
    );

    -- Bảng Bài Làm Khảo Sát
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL REFERENCES surveys(id),
      respondent_id TEXT NOT NULL REFERENCES users(id),
      status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'VALIDATED', 'FLAGGED_MANUAL', 'REJECTED_FRAUD')),
      started_at TEXT NOT NULL,
      submitted_at TEXT,
      duration_sec INTEGER DEFAULT 0,
      answers_payload TEXT,
      quality_score REAL DEFAULT 0.0,
      points_rewarded INTEGER DEFAULT 0,
      UNIQUE(survey_id, respondent_id)
    );

    -- Bảng Sổ Cái Kế Toán Kép (Double-Entry Ledger)
    CREATE TABLE IF NOT EXISTS point_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      reference_id TEXT,
      tx_type TEXT NOT NULL CHECK(tx_type IN ('DEPOSIT_CREDIT', 'ESCROW_LOCK', 'ESCROW_REFUND', 'SURVEY_REWARD', 'PAYOUT_DEDUCT', 'PAYOUT_REFUND', 'POINT_TO_CREDIT_SWAP')),
      currency TEXT NOT NULL CHECK(currency IN ('VND', 'POINT')),
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      description TEXT,
      metadata_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Bảng Yêu Cầu Rút Thưởng / Đổi Thẻ (Payouts)
    CREATE TABLE IF NOT EXISTS payout_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      points_amount INTEGER NOT NULL,
      fiat_amount_vnd REAL NOT NULL,
      fee_vnd REAL NOT NULL,
      net_amount_vnd REAL NOT NULL,
      payout_method TEXT NOT NULL CHECK(payout_method IN ('BANK_TRANSFER', 'MOMO', 'PHONE_CARD')),
      recipient_info_json TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED')),
      admin_note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    -- Bảng Nhật Ký Chống Gian Lận (Fraud Logs)
    CREATE TABLE IF NOT EXISTS fraud_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      survey_id TEXT REFERENCES surveys(id),
      ip_address TEXT,
      device_fingerprint TEXT,
      reason TEXT NOT NULL,
      score_details_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Bảng Chiến Dịch Voucher (Brand Catalog & Creator Sponsored)
    CREATE TABLE IF NOT EXISTS voucher_campaigns (
      id TEXT PRIMARY KEY,
      issuer_id TEXT REFERENCES users(id),
      voucher_type TEXT CHECK(voucher_type IN ('PLATFORM_CATALOG', 'CREATOR_SPONSORED')),
      brand_name TEXT NOT NULL,
      brand_logo TEXT,
      title TEXT NOT NULL,
      face_value_vnd REAL NOT NULL,
      points_cost INTEGER DEFAULT 0,
      total_quantity INTEGER NOT NULL,
      remaining_quantity INTEGER NOT NULL,
      expiry_date TEXT,
      instructions TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Bảng Kho Mã Voucher
    CREATE TABLE IF NOT EXISTS voucher_codes (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES voucher_campaigns(id),
      survey_id TEXT REFERENCES surveys(id),
      code TEXT NOT NULL,
      status TEXT DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'RESERVED_FOR_SURVEY', 'CLAIMED')),
      claimed_by_user_id TEXT REFERENCES users(id),
      claimed_response_id TEXT REFERENCES responses(id),
      claimed_at TEXT
    );

    -- Chỉ mục tối ưu tốc độ tra cứu và chống gian lận
    CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
    CREATE INDEX IF NOT EXISTS idx_responses_user ON responses(respondent_id);
    CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON point_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_payouts_status ON payout_requests(status);
    CREATE INDEX IF NOT EXISTS idx_voucher_campaigns_type ON voucher_campaigns(voucher_type);
    CREATE INDEX IF NOT EXISTS idx_voucher_codes_campaign ON voucher_codes(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_voucher_codes_survey ON voucher_codes(survey_id);
    CREATE INDEX IF NOT EXISTS idx_voucher_codes_claimed_user ON voucher_codes(claimed_by_user_id);
    CREATE INDEX IF NOT EXISTS idx_voucher_codes_status ON voucher_codes(status);

    -- Chỉ mục Duy Nhất (Unique Index) bảo vệ tính toàn vẹn CSDL chống cấp trùng voucher (No Duplicate Claim)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_unique_response 
    ON voucher_codes(claimed_response_id) 
    WHERE claimed_response_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_unique_survey_user
    ON voucher_codes(survey_id, claimed_by_user_id) 
    WHERE survey_id IS NOT NULL AND claimed_by_user_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_campaign_code
    ON voucher_codes(campaign_id, code);

    -- Bảng Địa Chỉ IP Bị Cấm (Banned IPs - Tự động Ban do Multi-Account / Spam)
    CREATE TABLE IF NOT EXISTS banned_ips (
      ip_address TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      banned_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Bảng Nhật Ký Thiết Bị & IP (Device & IP Tracking Engine)
    CREATE TABLE IF NOT EXISTS device_ip_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      ip_address TEXT NOT NULL,
      device_fingerprint TEXT,
      action TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_device_ip_ip ON device_ip_logs(ip_address);
    CREATE INDEX IF NOT EXISTS idx_device_ip_device ON device_ip_logs(device_fingerprint);
    CREATE INDEX IF NOT EXISTS idx_device_ip_user ON device_ip_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_device_ip_created ON device_ip_logs(created_at);

    -- Bảng Thông báo đẩy App APK & In-app Bell
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      survey_id TEXT REFERENCES surveys(id),
      type TEXT DEFAULT 'FAST_TRACK_SURVEY',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      channel TEXT DEFAULT 'ALL',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

    -- Bảng Yêu cầu Xuất Hóa Đơn Điện Tử VAT Doanh Nghiệp (Full VAT Support)
    CREATE TABLE IF NOT EXISTS vat_invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      transaction_id TEXT,
      amount_vnd REAL NOT NULL,
      vat_amount_vnd REAL NOT NULL,
      company_name TEXT NOT NULL,
      tax_code TEXT NOT NULL,
      company_address TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'ISSUED', 'REJECTED')),
      invoice_serial TEXT,
      invoice_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      issued_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_vat_invoices_user ON vat_invoices(user_id);

    -- Bảng Nhật ký gửi Email hệ thống đến email đăng ký của người dùng
    CREATE TABLE IF NOT EXISTS email_notifications_log (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      recipient_email TEXT NOT NULL,
      survey_id TEXT REFERENCES surveys(id),
      subject TEXT NOT NULL,
      content_snippet TEXT,
      delivery_status TEXT DEFAULT 'SENT',
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_notifications_log(user_id);
  `);

  // Migration v2: Bổ sung các cột mới cho Users, Surveys và Responses
  const migrations = [
    'ALTER TABLE users ADD COLUMN demographics_json TEXT;',
    'ALTER TABLE users ADD COLUMN promo_credit_balance REAL DEFAULT 0.0;',
    "ALTER TABLE surveys ADD COLUMN survey_source TEXT DEFAULT 'INTERNAL_BUILDER';",
    'ALTER TABLE surveys ADD COLUMN external_form_url TEXT;',
    'ALTER TABLE surveys ADD COLUMN completion_code_hash TEXT;',
    'ALTER TABLE surveys ADD COLUMN academic_tags_json TEXT;',
    'ALTER TABLE surveys ADD COLUMN target_demographics_json TEXT;',
    'ALTER TABLE surveys ADD COLUMN sponsor_campaign_id TEXT REFERENCES voucher_campaigns(id);',
    "ALTER TABLE surveys ADD COLUMN reward_mode TEXT DEFAULT 'POINTS_ONLY';",
    'ALTER TABLE surveys ADD COLUMN google_sheets_webhook_url TEXT;',
    'ALTER TABLE responses ADD COLUMN completion_code_input TEXT;',
    "ALTER TABLE responses ADD COLUMN verification_method TEXT DEFAULT 'NATIVE_SUBMIT';",
    'ALTER TABLE users ADD COLUMN fast_track_tickets INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN free_targeting_tickets INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN has_vip_enterprise INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN free_trial_surveys_available INTEGER DEFAULT 1;',
    'ALTER TABLE users ADD COLUMN is_google_linked INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN google_id TEXT;',
    'ALTER TABLE users ADD COLUMN is_email_verified INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN email_otp TEXT;',
    'ALTER TABLE users ADD COLUMN email_otp_expires_at INTEGER;',
    'ALTER TABLE surveys ADD COLUMN is_free_trial INTEGER DEFAULT 0;',
    'ALTER TABLE surveys ADD COLUMN normalized_form_url TEXT;',
    'ALTER TABLE surveys ADD COLUMN is_pinned INTEGER DEFAULT 0;',
    'ALTER TABLE surveys ADD COLUMN is_featured INTEGER DEFAULT 0;',
    'ALTER TABLE questions ADD COLUMN is_screener INTEGER DEFAULT 0;',
    'ALTER TABLE questions ADD COLUMN qualifying_answer TEXT;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;',
    'CREATE INDEX IF NOT EXISTS idx_surveys_normalized_url ON surveys(normalized_form_url);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_unique_response ON voucher_codes(claimed_response_id) WHERE claimed_response_id IS NOT NULL;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_unique_survey_user ON voucher_codes(survey_id, claimed_by_user_id) WHERE survey_id IS NOT NULL AND claimed_by_user_id IS NOT NULL;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_campaign_code ON voucher_codes(campaign_id, code);',
    `CREATE TABLE IF NOT EXISTS registration_otps (
      email TEXT PRIMARY KEY,
      otp TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch (e) {
      // Cột đã tồn tại, an toàn bỏ qua
    }
  }

  // Migration v2.5: Đảm bảo bảng point_transactions hỗ trợ POINT_TO_CREDIT_SWAP trong CHECK constraint
  try {
    const txTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='point_transactions'").get();
    if (txTableSql && txTableSql.sql && !txTableSql.sql.includes('POINT_TO_CREDIT_SWAP')) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE point_transactions_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          reference_id TEXT,
          tx_type TEXT NOT NULL CHECK(tx_type IN ('DEPOSIT_CREDIT', 'ESCROW_LOCK', 'ESCROW_REFUND', 'SURVEY_REWARD', 'PAYOUT_DEDUCT', 'PAYOUT_REFUND', 'POINT_TO_CREDIT_SWAP')),
          currency TEXT NOT NULL CHECK(currency IN ('VND', 'POINT')),
          amount REAL NOT NULL,
          balance_after REAL NOT NULL,
          description TEXT,
          metadata_json TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO point_transactions_new SELECT * FROM point_transactions;
        DROP TABLE point_transactions;
        ALTER TABLE point_transactions_new RENAME TO point_transactions;
        CREATE INDEX IF NOT EXISTS idx_transactions_user ON point_transactions(user_id);
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (err) {
    console.warn('[DB Migration] Nâng cấp bảng point_transactions gặp chú ý:', err.message);
  }
}

// Chạy khởi tạo bảng
initSchema();

module.exports = db;
