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
      student_karma INTEGER DEFAULT 0,
      trust_score REAL DEFAULT 100.0,
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'BANNED')),
      free_trial_surveys_available INTEGER DEFAULT 1,
      last_active_at TEXT,
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
      is_student_exchange INTEGER DEFAULT 0,
      allow_edit_response INTEGER DEFAULT 0,
      allow_view_response INTEGER DEFAULT 1,
      status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'FUNDED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CLOSED')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Bảng Câu Hỏi Khảo Sát
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL,
      rows_json TEXT,
      columns_json TEXT,
      logic_json TEXT,
      is_required INTEGER DEFAULT 1,
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
      status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'VALIDATED', 'FLAGGED_MANUAL', 'REJECTED_FRAUD', 'SCREENED_OUT', 'WARRANTY_REPLACED')),
      started_at TEXT NOT NULL,
      submitted_at TEXT,
      edited_at TEXT,
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
    
    -- Bảng Đơn Nạp Tiền & Đối Soát VietQR (Deposit Orders)
    CREATE TABLE IF NOT EXISTS deposit_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      order_code TEXT UNIQUE NOT NULL,
      amount_vnd REAL NOT NULL,
      credit_amount REAL NOT NULL,
      bonus_credit_vnd REAL DEFAULT 0.0,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
      payment_method TEXT DEFAULT 'VIETQR' CHECK(payment_method IN ('VIETQR', 'MANUAL_BANK')),
      bank_account_info_json TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

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
    CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_orders_code ON deposit_orders(order_code);
    CREATE INDEX IF NOT EXISTS idx_deposit_orders_user ON deposit_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_deposit_orders_status ON deposit_orders(status);

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

    -- Bang Dang Ky Thong Bao Day Push Notification (Web Push & Mobile Hybrid)
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      endpoint TEXT UNIQUE NOT NULL,
      keys_p256dh TEXT,
      keys_auth TEXT,
      device_type TEXT DEFAULT 'WEB',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);

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

    -- Bảng Điểm Danh Hàng Ngày & Chuỗi Ngày (Daily Streaks Engine)
    CREATE TABLE IF NOT EXISTS daily_streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      last_checkin_date TEXT,
      total_points_earned INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_daily_streaks_user ON daily_streaks(user_id);

    -- Bang Nhat Ky Hoat Dong Quan Tri Vien (Admin Audit Logs)
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_name TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_logs(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at);

    -- Bang Dien Dan Thao Luan & Chia Se Khao Sat Noi Bo (Forum Posts)
    CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      survey_id TEXT REFERENCES surveys(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      post_type TEXT DEFAULT 'COMMUNITY',
      category TEXT DEFAULT 'ALL',
      views_count INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_survey ON forum_posts(survey_id);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_type ON forum_posts(post_type);

    -- Bang Binh Luan Dien Dan (Forum Comments)
    CREATE TABLE IF NOT EXISTS forum_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_forum_comments_user ON forum_comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_forum_comments_created ON forum_comments(created_at);

    -- Bang Luot Thich Bai Viet Dien Dan (Forum Post Likes)
    CREATE TABLE IF NOT EXISTS forum_post_likes (
      post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(post_id, user_id)
    );
  `);

  // Migration v2: Bổ sung các cột mới cho Users, Surveys và Responses
  const migrations = [
    `CREATE TABLE IF NOT EXISTS daily_streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      last_checkin_date TEXT,
      total_points_earned INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS deposit_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      order_code TEXT UNIQUE NOT NULL,
      amount_vnd REAL NOT NULL,
      credit_amount REAL NOT NULL,
      bonus_credit_vnd REAL DEFAULT 0.0,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
      payment_method TEXT DEFAULT 'VIETQR' CHECK(payment_method IN ('VIETQR', 'MANUAL_BANK')),
      bank_account_info_json TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_orders_code ON deposit_orders(order_code);',
    'CREATE INDEX IF NOT EXISTS idx_deposit_orders_user ON deposit_orders(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_deposit_orders_status ON deposit_orders(status);',

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
    'ALTER TABLE users ADD COLUMN email_otp_sent_at INTEGER;',
    'ALTER TABLE surveys ADD COLUMN is_free_trial INTEGER DEFAULT 0;',
    'ALTER TABLE surveys ADD COLUMN normalized_form_url TEXT;',
    'ALTER TABLE surveys ADD COLUMN is_pinned INTEGER DEFAULT 0;',
    'ALTER TABLE surveys ADD COLUMN is_featured INTEGER DEFAULT 0;',
    'ALTER TABLE questions ADD COLUMN is_screener INTEGER DEFAULT 0;',
    'ALTER TABLE questions ADD COLUMN qualifying_answer TEXT;',
    'ALTER TABLE voucher_campaigns ADD COLUMN website_domain TEXT;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;',
    'CREATE INDEX IF NOT EXISTS idx_surveys_normalized_url ON surveys(normalized_form_url);',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_unique_response ON voucher_codes(claimed_response_id) WHERE claimed_response_id IS NOT NULL;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_unique_survey_user ON voucher_codes(survey_id, claimed_by_user_id) WHERE survey_id IS NOT NULL AND claimed_by_user_id IS NOT NULL;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_codes_campaign_code ON voucher_codes(campaign_id, code);',
    "ALTER TABLE users ADD COLUMN account_tier TEXT DEFAULT 'PERSONAL';",
    'ALTER TABLE users ADD COLUMN is_student_verified INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN student_email TEXT;',
    'ALTER TABLE users ADD COLUMN student_otp TEXT;',
    'ALTER TABLE users ADD COLUMN student_otp_expires_at INTEGER;',
    'ALTER TABLE users ADD COLUMN student_otp_sent_at INTEGER;',
    'ALTER TABLE users ADD COLUMN profile_completed INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN demographic_locked_until TEXT;',
    'ALTER TABLE users ADD COLUMN free_quota_remaining INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN enterprise_verify_level INTEGER DEFAULT 0;',
    'ALTER TABLE users ADD COLUMN brand_name TEXT;',
    'ALTER TABLE users ADD COLUMN industry TEXT;',
    'ALTER TABLE users ADD COLUMN website_url TEXT;',
    'ALTER TABLE users ADD COLUMN contact_phone TEXT;',
    'ALTER TABLE users ADD COLUMN company_legal_name TEXT;',
    'ALTER TABLE users ADD COLUMN tax_id TEXT;',
    'ALTER TABLE users ADD COLUMN headquarters_address TEXT;',
    'ALTER TABLE users ADD COLUMN invoice_email TEXT;',
    'ALTER TABLE users ADD COLUMN gender TEXT;',
    'ALTER TABLE users ADD COLUMN birth_date TEXT;',
    'ALTER TABLE users ADD COLUMN province TEXT;',
    'ALTER TABLE users ADD COLUMN occupation TEXT;',
    'ALTER TABLE users ADD COLUMN university TEXT;',
    'ALTER TABLE users ADD COLUMN major TEXT;',
    'ALTER TABLE users ADD COLUMN graduation_year INTEGER;',
    'ALTER TABLE users ADD COLUMN monthly_income TEXT;',
    'ALTER TABLE users ADD COLUMN ban_reason TEXT;',
    'ALTER TABLE users ADD COLUMN banned_at TEXT;',
    'ALTER TABLE users ADD COLUMN last_active_at TEXT;',
    'ALTER TABLE questions ADD COLUMN is_required INTEGER DEFAULT 1;',
    'ALTER TABLE questions ADD COLUMN rows_json TEXT;',
    'ALTER TABLE questions ADD COLUMN columns_json TEXT;',
    'ALTER TABLE questions ADD COLUMN logic_json TEXT;',
    'ALTER TABLE surveys ADD COLUMN package_type TEXT DEFAULT \'PERSONAL\';',
    'ALTER TABLE surveys ADD COLUMN pricing_tier TEXT DEFAULT \'STANDARD\';',
    'ALTER TABLE surveys ADD COLUMN completed_at TEXT;',
    'ALTER TABLE surveys ADD COLUMN cover_image_url TEXT;',
    'ALTER TABLE questions ADD COLUMN image_url TEXT;',
    'ALTER TABLE questions ADD COLUMN video_url TEXT;',
    'ALTER TABLE questions ADD COLUMN min_label TEXT;',
    'ALTER TABLE questions ADD COLUMN max_label TEXT;',
    'ALTER TABLE surveys ADD COLUMN allow_edit_response INTEGER DEFAULT 0;',
    'ALTER TABLE surveys ADD COLUMN allow_view_response INTEGER DEFAULT 1;',
    'ALTER TABLE surveys ADD COLUMN duration_days INTEGER DEFAULT 14;',
    'ALTER TABLE surveys ADD COLUMN expires_at TEXT;',
    'ALTER TABLE surveys ADD COLUMN voucher_purchase_quantity INTEGER DEFAULT 0;',
    "ALTER TABLE surveys ADD COLUMN voucher_dist_mode TEXT DEFAULT 'FIRST_COME';",
    'ALTER TABLE surveys ADD COLUMN voucher_total_slots INTEGER DEFAULT 0;',
    'ALTER TABLE responses ADD COLUMN edited_at TEXT;',
    'ALTER TABLE users ADD COLUMN google_forms_access_token TEXT;',
    'ALTER TABLE users ADD COLUMN google_forms_refresh_token TEXT;',
    'ALTER TABLE users ADD COLUMN google_forms_email TEXT;',
    'ALTER TABLE users ADD COLUMN google_forms_connected_at TEXT;',
    `CREATE TABLE IF NOT EXISTS warranty_claims (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL REFERENCES surveys(id),
      creator_id TEXT NOT NULL REFERENCES users(id),
      response_ids_json TEXT NOT NULL,
      replaced_count INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_warranty_survey ON warranty_claims(survey_id);',
    'CREATE INDEX IF NOT EXISTS idx_warranty_creator ON warranty_claims(creator_id);',
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      endpoint TEXT UNIQUE NOT NULL,
      keys_p256dh TEXT,
      keys_auth TEXT,
      device_type TEXT DEFAULT 'WEB',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);',
    `CREATE TABLE IF NOT EXISTS bug_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      reporter_name TEXT,
      reporter_email TEXT,
      category TEXT DEFAULT 'OTHER',
      severity TEXT DEFAULT 'MEDIUM',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      device_info TEXT,
      status TEXT DEFAULT 'PENDING',
      admin_notes TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON bug_reports(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);',
    'CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at);',
    `CREATE TABLE IF NOT EXISTS registration_otps (
      email TEXT PRIMARY KEY,
      otp TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_name TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_id);',
    'CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);',
    'CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_logs(target_type, target_id);',
    'CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at);',
    'ALTER TABLE users ADD COLUMN student_karma INTEGER DEFAULT 0;',
    'ALTER TABLE surveys ADD COLUMN is_student_exchange INTEGER DEFAULT 0;',
    'CREATE INDEX IF NOT EXISTS idx_surveys_student_exchange ON surveys(is_student_exchange);',
    `CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      survey_id TEXT REFERENCES surveys(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      post_type TEXT DEFAULT 'COMMUNITY',
      category TEXT DEFAULT 'ALL',
      views_count INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_survey ON forum_posts(survey_id);',
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_type ON forum_posts(post_type);',
    `CREATE TABLE IF NOT EXISTS forum_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id);',
    'CREATE INDEX IF NOT EXISTS idx_forum_comments_user ON forum_comments(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_forum_comments_created ON forum_comments(created_at);',
    `CREATE TABLE IF NOT EXISTS forum_post_likes (
      post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(post_id, user_id)
    );`
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch (e) {
      // Cột đã tồn tại, an toàn bỏ qua
    }
  }


  // Migration v2.6: Nâng cấp bảng questions (bỏ CHECK constraint type cũ để hỗ trợ 12 định dạng, thêm is_required, rows_json, columns_json)
  try {
    const qTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='questions'").get();
    if (qTableSql && qTableSql.sql && qTableSql.sql.includes("CHECK(type IN")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE questions_new (
          id TEXT PRIMARY KEY,
          survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          order_index INTEGER NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          options_json TEXT,
          rows_json TEXT,
          columns_json TEXT,
      logic_json TEXT,
          is_required INTEGER DEFAULT 1,
          is_attention_check INTEGER DEFAULT 0,
          expected_answer TEXT,
          is_screener INTEGER DEFAULT 0,
          qualifying_answer TEXT
        );
        INSERT INTO questions_new (id, survey_id, order_index, type, content, options_json, is_required, is_attention_check, expected_answer, is_screener, qualifying_answer)
        SELECT id, survey_id, order_index, type, content, options_json, COALESCE(is_required, 1), is_attention_check, expected_answer, is_screener, qualifying_answer FROM questions;
        DROP TABLE questions;
        ALTER TABLE questions_new RENAME TO questions;
        CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
        PRAGMA foreign_keys = ON;
      `);
      console.log('[DB Migration] Đã nâng cấp bảng questions hỗ trợ trọn vẹn 12 định dạng và cờ is_required.');
    }
  } catch (err) {
    console.warn('[DB Migration] Nâng cấp bảng questions gặp chú ý:', err.message);
  }

  // Migration v2.6: Nâng cấp bảng responses hỗ trợ trạng thái SCREENED_OUT và WARRANTY_REPLACED
  try {
    const respTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='responses'").get();
    if (respTableSql && respTableSql.sql && !respTableSql.sql.includes("SCREENED_OUT")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE responses_new (
          id TEXT PRIMARY KEY,
          survey_id TEXT NOT NULL REFERENCES surveys(id),
          respondent_id TEXT NOT NULL REFERENCES users(id),
          status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'VALIDATED', 'FLAGGED_MANUAL', 'REJECTED_FRAUD', 'SCREENED_OUT', 'WARRANTY_REPLACED')),
          started_at TEXT NOT NULL,
          submitted_at TEXT,
      edited_at TEXT,
          duration_sec INTEGER DEFAULT 0,
          answers_payload TEXT,
          quality_score REAL DEFAULT 0.0,
          points_rewarded INTEGER DEFAULT 0,
          completion_code_input TEXT,
          verification_method TEXT DEFAULT 'NATIVE_SUBMIT',
          UNIQUE(survey_id, respondent_id)
        );
        INSERT INTO responses_new (id, survey_id, respondent_id, status, started_at, submitted_at, duration_sec, answers_payload, quality_score, points_rewarded, completion_code_input, verification_method)
        SELECT id, survey_id, respondent_id, status, started_at, submitted_at, duration_sec, answers_payload, quality_score, points_rewarded, completion_code_input, verification_method FROM responses;
        DROP TABLE responses;
        ALTER TABLE responses_new RENAME TO responses;
        CREATE INDEX IF NOT EXISTS idx_responses_user ON responses(respondent_id);
        CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
        PRAGMA foreign_keys = ON;
      `);
      console.log('[DB Migration] Đã nâng cấp bảng responses hỗ trợ SCREENED_OUT và WARRANTY_REPLACED.');
    }
  } catch (err) {
    console.warn('[DB Migration] Nâng cấp bảng responses gặp chú ý:', err.message);
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


  // Migration v2.7: Cho phép thảo luận tự do trên diễn đàn (survey_id nullable, thêm post_type và category)
  try {
    const fTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='forum_posts'").get();
    if (fTableSql && fTableSql.sql && fTableSql.sql.includes("survey_id TEXT NOT NULL")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE forum_posts_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          survey_id TEXT REFERENCES surveys(id),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          post_type TEXT DEFAULT 'COMMUNITY',
          category TEXT DEFAULT 'ALL',
          views_count INTEGER DEFAULT 0,
          likes_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO forum_posts_new (id, user_id, survey_id, title, content, post_type, category, views_count, likes_count, created_at, updated_at)
        SELECT id, user_id, survey_id, title, content, 'COMMUNITY', 'ALL', views_count, likes_count, created_at, updated_at
        FROM forum_posts;
        DROP TABLE forum_posts;
        ALTER TABLE forum_posts_new RENAME TO forum_posts;
        CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_forum_posts_survey ON forum_posts(survey_id);
        CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at);
        CREATE INDEX IF NOT EXISTS idx_forum_posts_type ON forum_posts(post_type);
        PRAGMA foreign_keys = ON;
      `);
      console.log('[DB Migration] Đã nâng cấp bảng forum_posts cho phép thảo luận tự do và phân khu sinh viên.');
    }
  } catch (err) {
    console.warn('[DB Migration] Nâng cấp bảng forum_posts gặp chú ý:', err.message);
  }
}

// Tự động đảm bảo các tài khoản kiểm thử cốt lõi luôn tồn tại và đúng mật khẩu trên mọi môi trường (Local & Render)
function ensureEssentialAccounts() {
  try {
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    const salt = bcrypt.genSaltSync(10);

    const essentialUsers = [
      { email: 'admin@survhub.com',
        password: 'admin123',
        name: 'Quản Trị Viên SurvHub',
        role: 'ADMIN',
        credit_balance: 100000000,
        point_balance: 0,
        fast_track_tickets: 10,
        free_trial_surveys_available: 5,
        is_email_verified: 1,
        status: 'ACTIVE'
      },
      { email: 'admin@vibesurvey.com',
        password: 'admin123',
        name: 'Quản Trị Viên Hệ Thống',
        role: 'ADMIN',
        credit_balance: 100000000,
        point_balance: 0,
        fast_track_tickets: 10,
        free_trial_surveys_available: 5,
        is_email_verified: 1,
        status: 'ACTIVE'
      },
      {
        email: 'trungdzid3@gmail.com',
        password: 'Trung@2302',
        name: 'Admin Trung',
        role: 'ADMIN',
        credit_balance: 100000000,
        point_balance: 0,
        fast_track_tickets: 10,
        free_trial_surveys_available: 5,
        is_email_verified: 1,
        status: 'ACTIVE'
      },
      {
        email: 'linharmykxbnvn@gmail.com',
        password: 'Linh@2006',
        name: 'Admin Linh',
        role: 'ADMIN',
        credit_balance: 100000000,
        point_balance: 0,
        fast_track_tickets: 10,
        free_trial_surveys_available: 5,
        is_email_verified: 1,
        status: 'ACTIVE'
      }
    ];

    for (const u of essentialUsers) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
      const hash = bcrypt.hashSync(u.password, salt);
      if (!existing) {
        const id = crypto.randomUUID();
        db.prepare(`
          INSERT INTO users (
            id, email, password_hash, name, role, 
            credit_balance, point_balance, fast_track_tickets, 
            free_trial_surveys_available, is_email_verified, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, u.email, hash, u.name, u.role, u.credit_balance, u.point_balance, u.fast_track_tickets, u.free_trial_surveys_available, u.is_email_verified, u.status);
      } else {
        db.prepare(`
          UPDATE users 
          SET password_hash = ?, status = 'ACTIVE', is_email_verified = 1,
              fast_track_tickets = MAX(COALESCE(fast_track_tickets, 0), ?),
              credit_balance = MAX(COALESCE(credit_balance, 0), ?),
              free_trial_surveys_available = MAX(COALESCE(free_trial_surveys_available, 0), ?)
          WHERE id = ?
        `).run(hash, u.fast_track_tickets || 0, u.credit_balance || 0, u.free_trial_surveys_available || 0, existing.id);
      }
    }
    console.log('[DB Bootstrap] Đã tự động đảm bảo các tài khoản quản trị cốt lõi.');
  } catch (err) {
    console.warn('[DB Bootstrap] Không thể tự động tạo tài khoản kiểm thử:', err.message);
  }
}

// Chạy khởi tạo bảng và seed tài khoản kiểm thử
initSchema();
ensureEssentialAccounts();

module.exports = db;
