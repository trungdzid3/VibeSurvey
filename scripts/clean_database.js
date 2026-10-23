/**
 * SCRIPT LÀM SẠCH DATABASE TOÀN DIỆN (CLEAN DATABASE)
 * Xóa toàn bộ tài khoản thử nghiệm, bot chaos monkey, khảo sát demo và nhật ký rác.
 * Giữ lại hệ thống chuẩn Production với tài khoản Quản Trị Viên (Admin) và 2 khảo sát cộng đồng mẫu.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../server/config');

console.log('=======================================================');
console.log('🧹 VibeSurvey: Bắt đầu làm sạch toàn bộ dữ liệu test / demo...');
console.log('=======================================================');

const db = new DatabaseSync(config.DB_PATH);

db.exec(`
  PRAGMA foreign_keys = OFF;

  -- 1. Xóa toàn bộ dữ liệu nhật ký & bài làm
  DELETE FROM responses;
  DELETE FROM fraud_logs;
  DELETE FROM device_ip_logs;
  DELETE FROM point_transactions;
  DELETE FROM payout_requests;
  DELETE FROM questions;
  DELETE FROM surveys;
  DELETE FROM voucher_codes;
  DELETE FROM voucher_campaigns;
  DELETE FROM banned_ips;
  DELETE FROM users;

  PRAGMA foreign_keys = ON;
`);

console.log('✅ Đã dọn dẹp trắng toàn bộ các bảng dữ liệu.');

// 2. Khởi tạo tài khoản Quản Trị Viên (Admin)
const salt = bcrypt.genSaltSync(10);

const admins = [
  {
    email: 'trungdzid3@gmail.com',
    password: 'Trung@2302',
    name: 'Admin Trung'
  },
  {
    email: 'linharmykxbnvn@gmail.com',
    password: 'Linh@2006',
    name: 'Admin Linh'
  },
  {
    email: 'admin@vibesurvey.com',
    password: 'admin123',
    name: 'Quản Trị Viên Hệ Thống'
  }
];

const insertAdmin = db.prepare(`
  INSERT INTO users (
    id, email, password_hash, name, role, 
    credit_balance, point_balance, trust_score, status, 
    free_trial_surveys_available, is_google_linked, is_email_verified
  )
  VALUES (?, ?, ?, ?, 'ADMIN', 100000000, 500000, 100.0, 'ACTIVE', 5, 1, 1)
`);

for (const adm of admins) {
  const adminId = crypto.randomUUID();
  const hash = bcrypt.hashSync(adm.password, salt);
  insertAdmin.run(adminId, adm.email, hash, adm.name);
  console.log(`✅ Đã tạo tài khoản Quản Trị Viên: ${adm.email} (Mật khẩu: ${adm.password})`);
}

const adminId = db.prepare("SELECT id FROM users WHERE email = 'admin@vibesurvey.com'").get().id;

// 3. Khởi tạo 2 Khảo sát Công khai Chất lượng cao để khách có thể xem và trải nghiệm
const survey1Id = crypto.randomUUID();
const q1_1 = crypto.randomUUID();
const q1_2 = crypto.randomUUID();
const q1_3 = crypto.randomUUID();
const q1_4 = crypto.randomUUID();

db.prepare(`
  INSERT INTO surveys (
    id, creator_id, title, description, category, target_responses, 
    collected_responses, cost_per_response, reward_points_per_response, 
    escrow_locked_balance, min_completion_time_sec, status, is_free_trial
  )
  VALUES (
    ?, ?, 
    'Nghiên cứu Xu hướng Mua sắm Trực tuyến & Thương mại Điện tử 2026', 
    'Khảo sát thói quen tiêu dùng trên sàn Shopee, TikTok Shop, đánh giá chất lượng dịch vụ giao hàng và trải nghiệm thanh toán trực tuyến.',
    'Thương mại điện tử', 
    100, 0, 800, 500, 80000, 20, 'ACTIVE', 0
  )
`).run(survey1Id, adminId);

db.prepare(`
  INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
  VALUES 
    (?, ?, 1, 'SINGLE_CHOICE', 'Bạn thường mua sắm trực tuyến trên nền tảng nào thường xuyên nhất?', '["Shopee", "TikTok Shop", "Lazada", "Tiki", "Khác"]', 0, NULL),
    (?, ?, 2, 'LIKERT_SCALE', 'Độ hài lòng của bạn đối với tốc độ giao hàng tiêu chuẩn hiện nay (1: Rất không hài lòng -> 5: Rất hài lòng)?', '["1 - Rất tệ", "2 - Tệ", "3 - Bình thường", "4 - Hài lòng", "5 - Rất hài lòng"]', 0, NULL),
    (?, ?, 3, 'SINGLE_CHOICE', 'Để kiểm tra bạn đang đọc kỹ đề bài, vui lòng chọn chính xác đáp án "Shopee" ở câu hỏi này:', '["Shopee", "Lazada", "TikTok Shop", "Tiki"]', 1, 'Shopee'),
    (?, ?, 4, 'OPEN_TEXT', 'Theo bạn, chương trình khuyến mãi nào thu hút bạn quyết định đặt hàng nhất (Mã miễn phí vận chuyển, Giảm giá trực tiếp hay Hoàn xu)?', NULL, 0, NULL)
`).run(q1_1, survey1Id, q1_2, survey1Id, q1_3, survey1Id, q1_4, survey1Id);

const survey2Id = crypto.randomUUID();
const q2_1 = crypto.randomUUID();
const q2_2 = crypto.randomUUID();
const q2_3 = crypto.randomUUID();

db.prepare(`
  INSERT INTO surveys (
    id, creator_id, title, description, category, target_responses, 
    collected_responses, cost_per_response, reward_points_per_response, 
    escrow_locked_balance, min_completion_time_sec, status, is_free_trial
  )
  VALUES (
    ?, ?, 
    'Khảo sát Thói quen Sử dụng Ứng dụng AI & Công cụ Trợ lý Số', 
    'Nghiên cứu về mức độ phổ biến của ChatGPT, Gemini, Copilot trong học tập và công việc hàng ngày của giới trẻ và dân văn phòng.',
    'Công nghệ & AI', 
    100, 0, 750, 450, 75000, 15, 'ACTIVE', 0
  )
`).run(survey2Id, adminId);

db.prepare(`
  INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
  VALUES 
    (?, ?, 1, 'SINGLE_CHOICE', 'Bạn đang sử dụng công cụ AI nào thường xuyên nhất cho công việc/học tập?', '["ChatGPT", "Google Gemini", "Claude", "Microsoft Copilot", "Chưa dùng"]', 0, NULL),
    (?, ?, 2, 'MULTIPLE_CHOICE', 'Những tác vụ bạn thường nhờ AI hỗ trợ nhất (Chọn các đáp án phù hợp)?', '["Viết email / văn bản", "Lập trình & sửa lỗi code", "Tóm tắt tài liệu & dịch thuật", "Sáng tạo nội dung & hình ảnh", "Học ngoại ngữ"]', 0, NULL),
    (?, ?, 3, 'LIKERT_SCALE', 'Mức độ tin cậy của bạn đối với câu trả lời do AI cung cấp (1: Rất thấp -> 5: Hoàn toàn tin cậy)?', '["1 - Rất thấp", "2 - Thấp", "3 - Trung bình", "4 - Cao", "5 - Tuyệt đối tin cậy"]', 0, NULL)
`).run(q2_1, survey2Id, q2_2, survey2Id, q2_3, survey2Id);

// 4. Khởi tạo Danh mục Voucher mẫu thực tế
const vShopee = crypto.randomUUID();
const vGrab = crypto.randomUUID();
const vHighlands = crypto.randomUUID();

db.prepare(`
  INSERT INTO voucher_campaigns (id, issuer_id, voucher_type, brand_name, brand_logo, title, face_value_vnd, points_cost, total_quantity, remaining_quantity, expiry_date, instructions)
  VALUES 
    (?, ?, 'PLATFORM_CATALOG', 'Shopee', '🛍️', 'Mã Giảm Giá Shopee 50.000đ Toàn Sàn', 50000, 5000, 50, 50, '2026-12-31', 'Áp dụng cho mọi đơn hàng từ 150.000đ trên ứng dụng Shopee'),
    (?, ?, 'PLATFORM_CATALOG', 'Grab', '🚗', 'Voucher GrabFood / GrabBike 30.000đ', 30000, 3000, 50, 50, '2026-12-31', 'Nhập mã tại bước thanh toán trên app Grab'),
    (?, ?, 'PLATFORM_CATALOG', 'Highlands Coffee', '☕', 'Voucher Highlands Coffee 50.000đ', 50000, 5000, 50, 50, '2026-12-31', 'Áp dụng tại mọi chi nhánh Highlands Coffee trên toàn quốc')
`).run(vShopee, adminId, vGrab, adminId, vHighlands, adminId);

// Sinh mã voucher mẫu
const insertCode = db.prepare("INSERT INTO voucher_codes (id, campaign_id, code, status) VALUES (?, ?, ?, 'AVAILABLE')");
for (let i = 1; i <= 10; i++) {
  insertCode.run(crypto.randomUUID(), vShopee, 'SHOPEE50K_' + Math.random().toString(36).substring(2, 8).toUpperCase());
  insertCode.run(crypto.randomUUID(), vGrab, 'GRAB30K_' + Math.random().toString(36).substring(2, 8).toUpperCase());
  insertCode.run(crypto.randomUUID(), vHighlands, 'HIGHLANDS_' + Math.random().toString(36).substring(2, 8).toUpperCase());
}

// 5. Tối ưu & thu gọn file SQLite
db.exec('VACUUM;');

console.log('=======================================================');
console.log('🎉 LÀM SẠCH DATABASE HOÀN TẤT!');
console.log('📊 Người dùng: 3 Tài khoản Quản Trị Viên (trungdzid3@gmail.com, linharmykxbnvn@gmail.com, admin@vibesurvey.com)');
console.log('📋 Khảo sát công khai: 2 (Sẵn sàng phục vụ khách xem & làm bài)');
console.log('🎁 Voucher danh mục: 3 thương hiệu (Shopee, Grab, Highlands)');
console.log('=======================================================');
