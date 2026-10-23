const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./database');
const ledgerService = require('../services/ledgerService');
const pricingService = require('../services/pricingService');
const antiFraudService = require('../services/antiFraudService');

function seedDatabase() {
  // Kiểm tra nếu đã có tài khoản quản trị thì không cần khởi tạo lại
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@vibesurvey.com');
  if (existingAdmin) {
    return;
  }

  console.log('🌱 Khởi tạo tài khoản Quản Trị Viên và Dữ liệu mẫu hệ thống ban đầu...');

  const salt = bcrypt.genSaltSync(10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status, is_google_linked, is_email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1, 1)
  `);

  // 1. Khởi tạo danh sách Quản Trị Viên
  const admins = [
    { email: 'trungdzid3@gmail.com', pass: 'Trung@2302', name: 'Admin Trung' },
    { email: 'linharmykxbnvn@gmail.com', pass: 'Linh@2006', name: 'Admin Linh' },
    { email: 'admin@vibesurvey.com', pass: 'admin123', name: 'Quản Trị Viên Hệ Thống' }
  ];

  let adminId = crypto.randomUUID();
  admins.forEach((adm, idx) => {
    const id = idx === 2 ? adminId : crypto.randomUUID();
    insertUser.run(id, adm.email, bcrypt.hashSync(adm.pass, salt), adm.name, 'ADMIN', 100000000, 500000, 100.0);
  });

  // 2. Khởi tạo Khảo Sát 1: Nghiên cứu Thương Mại Điện Tử
  const survey1Id = crypto.randomUUID();
  const q1List = [
    {
      id: crypto.randomUUID(),
      survey_id: survey1Id,
      order_index: 1,
      type: 'SINGLE_CHOICE',
      content: 'Bạn thường mua sắm trực tuyến trên nền tảng nào thường xuyên nhất?',
      options_json: JSON.stringify(['Shopee', 'TikTok Shop', 'Lazada', 'Tiki', 'Khác']),
      is_attention_check: 0,
      expected_answer: null
    },
    {
      id: crypto.randomUUID(),
      survey_id: survey1Id,
      order_index: 2,
      type: 'LIKERT_SCALE',
      content: 'Độ hài lòng của bạn đối với tốc độ giao hàng tiêu chuẩn hiện nay?',
      options_json: JSON.stringify(['1 - Rất tệ', '2 - Tệ', '3 - Bình thường', '4 - Hài lòng', '5 - Rất hài lòng']),
      is_attention_check: 0,
      expected_answer: null
    },
    {
      id: crypto.randomUUID(),
      survey_id: survey1Id,
      order_index: 3,
      type: 'SINGLE_CHOICE',
      content: 'Để kiểm tra bạn đang đọc kỹ đề bài, vui lòng chọn chính xác đáp án "Shopee" ở câu hỏi này:',
      options_json: JSON.stringify(['Shopee', 'Lazada', 'TikTok Shop', 'Tiki']),
      is_attention_check: 1,
      expected_answer: 'Shopee'
    },
    {
      id: crypto.randomUUID(),
      survey_id: survey1Id,
      order_index: 4,
      type: 'OPEN_TEXT',
      content: 'Theo bạn, chương trình khuyến mãi nào thu hút bạn quyết định đặt hàng nhất?',
      options_json: null,
      is_attention_check: 0,
      expected_answer: null
    }
  ];

  const eco1 = pricingService.calculateSurveyEconomics(q1List, 100);
  const minTime1 = antiFraudService.calculateMinCompletionTime(q1List);

  db.prepare(`
    INSERT INTO surveys (id, creator_id, title, description, category, target_responses, collected_responses, cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `).run(
    survey1Id,
    creatorId,
    'Nghiên cứu Xu hướng Mua sắm Trực tuyến & Thương mại Điện tử 2026',
    'Khảo sát thói quen tiêu dùng trên sàn Shopee, TikTok Shop, đánh giá chất lượng dịch vụ giao hàng và trải nghiệm thanh toán trực tuyến.',
    'Thương mại điện tử',
    100,
    35,
    eco1.costPerResponseVnd,
    eco1.rewardPointsPerResponse,
    eco1.totalEscrowVnd - (35 * eco1.costPerResponseVnd),
    minTime1
  );

  const insertQ = db.prepare(`
    INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const q of q1List) {
    insertQ.run(q.id, q.survey_id, q.order_index, q.type, q.content, q.options_json, q.is_attention_check, q.expected_answer);
  }

  // 3. Khởi tạo Khảo Sát 2: Ứng dụng Tài chính Cá nhân
  const survey2Id = crypto.randomUUID();
  const q2List = [
    {
      id: crypto.randomUUID(),
      survey_id: survey2Id,
      order_index: 1,
      type: 'SINGLE_CHOICE',
      content: 'Bạn có đang sử dụng ứng dụng để theo dõi chi tiêu và tích lũy hàng tháng không?',
      options_json: JSON.stringify(['Có, dùng hàng ngày', 'Thỉnh thoảng có dùng', 'Không, ghi chép sổ/trí nhớ', 'Chưa từng dùng']),
      is_attention_check: 0,
      expected_answer: null
    },
    {
      id: crypto.randomUUID(),
      survey_id: survey2Id,
      order_index: 2,
      type: 'MULTIPLE_CHOICE',
      content: 'Tính năng nào sau đây bạn quan tâm nhất ở một ứng dụng tích lũy đổi quà? (Chọn nhiều)',
      options_json: JSON.stringify(['Đổi thẻ cào điện thoại', 'Rút tiền trực tiếp về ngân hàng', 'Voucher ăn uống/mua sắm', 'Độ bảo mật thông tin']),
      is_attention_check: 0,
      expected_answer: null
    },
    {
      id: crypto.randomUUID(),
      survey_id: survey2Id,
      order_index: 3,
      type: 'SINGLE_CHOICE',
      content: 'Câu hỏi kiểm tra sự tập trung: Xin vui lòng chọn đáp án "Voucher ăn uống/mua sắm":',
      options_json: JSON.stringify(['Đổi thẻ cào', 'Rút tiền mặt', 'Voucher ăn uống/mua sắm', 'Độ bảo mật']),
      is_attention_check: 1,
      expected_answer: 'Voucher ăn uống/mua sắm'
    },
    {
      id: crypto.randomUUID(),
      survey_id: survey2Id,
      order_index: 4,
      type: 'LIKERT_SCALE',
      content: 'Mức độ sẵn sàng giới thiệu nền tảng làm khảo sát đổi điểm cho bạn bè cùng kiếm thêm thu nhập (1 -> 5 sao):',
      options_json: JSON.stringify(['1 Sao - Không sẵn lòng', '2 Sao', '3 Sao - Bình thường', '4 Sao', '5 Sao - Rất nhiệt tình']),
      is_attention_check: 0,
      expected_answer: null
    }
  ];

  const eco2 = pricingService.calculateSurveyEconomics(q2List, 150);
  const minTime2 = antiFraudService.calculateMinCompletionTime(q2List);

  db.prepare(`
    INSERT INTO surveys (id, creator_id, title, description, category, target_responses, collected_responses, cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `).run(
    survey2Id,
    creatorId,
    'Khảo sát Nhu cầu Ứng dụng Tài chính & Kiếm Thêm Thu Nhập 2026',
    'Tìm hiểu các hình thức kiếm tiền online uy tín và thói quen quản lý ví điện tử của giới trẻ.',
    'Tài chính & Thu nhập',
    150,
    18,
    eco2.costPerResponseVnd,
    eco2.rewardPointsPerResponse,
    eco2.totalEscrowVnd - (18 * eco2.costPerResponseVnd),
    minTime2
  );

  for (const q of q2List) {
    insertQ.run(q.id, q.survey_id, q.order_index, q.type, q.content, q.options_json, q.is_attention_check, q.expected_answer);
  }

  // 4. Tạo giao dịch mẫu trong Sổ cái
  db.prepare(`
    INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
    VALUES (?, ?, ?, 'DEPOSIT_CREDIT', 'VND', 20000000, 20000000, 'Nạp tiền ký quỹ TechCorp')
  `).run(crypto.randomUUID(), creatorId, null);

  db.prepare(`
    INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
    VALUES (?, ?, ?, 'SURVEY_REWARD', 'POINT', 5000, 6500, 'Thưởng hoàn thành khảo sát nghiên cứu tiêu dùng')
  `).run(crypto.randomUUID(), respondentId1, survey1Id);

  // 5. Tạo 1 yêu cầu rút tiền mẫu đang chờ duyệt
  db.prepare(`
    INSERT INTO payout_requests (id, user_id, points_amount, fiat_amount_vnd, fee_vnd, net_amount_vnd, payout_method, recipient_info_json, status)
    VALUES (?, ?, 5000, 50000, 2000, 48000, 'BANK_TRANSFER', ?, 'PENDING')
  `).run(
    crypto.randomUUID(),
    respondentId1,
    JSON.stringify({ bank_name: 'Vietcombank', account_number: '0123456789012', account_holder: 'NGUYEN THUY LINH' })
  );

  console.log('✅ Seed dữ liệu mẫu thành công!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
