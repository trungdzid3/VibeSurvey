const crypto = require('crypto');
const db = require('../server/db/database');

function seedDemoResponses() {
  console.log('📊 Đang tạo 35 phản hồi mẫu cho Survey 1 và 18 phản hồi mẫu cho Survey 2...');

  const survey1 = db.prepare('SELECT id FROM surveys WHERE id = ?').get('82b49bd3-7dc5-49b6-aa5c-85392f5487fe');
  const survey2 = db.prepare('SELECT id FROM surveys WHERE id = ?').get('5c9af141-bdf0-4474-80ce-d8e307933cf7');

  if (!survey1 || !survey2) {
    console.log('⚠️ Không tìm thấy 2 survey demo chính, bỏ qua.');
    return;
  }

  // Lấy danh sách câu hỏi của Survey 1
  const q1 = db.prepare('SELECT id, order_index FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(survey1.id);
  // Lấy danh sách câu hỏi của Survey 2
  const q2 = db.prepare('SELECT id, order_index FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(survey2.id);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, name, role, status)
    VALUES (?, ?, 'dummy', ?, 'RESPONDENT', 'ACTIVE')
  `);

  const insertResp = db.prepare(`
    INSERT OR REPLACE INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at, duration_sec, answers_payload, quality_score, points_rewarded)
    VALUES (?, ?, ?, 'VALIDATED', ?, ?, ?, ?, ?, ?)
  `);

  // Phân bổ mẫu Survey 1 (35 phản hồi)
  const platforms = ['Shopee', 'Shopee', 'Shopee', 'TikTok Shop', 'TikTok Shop', 'Lazada', 'Tiki'];
  const ratings = ['5 - Rất hài lòng', '4 - Hài lòng', '4 - Hài lòng', '3 - Bình thường', '5 - Rất hài lòng', '2 - Tệ', '1 - Rất tệ'];
  const sampleOpinions = [
    'Mã giảm giá và freeship là yếu tố quyết định hàng đầu.',
    'Tôi luôn xem đánh giá 5 sao có hình ảnh chụp thật từ người mua trước.',
    'Chính sách đổi trả hàng nhanh chóng và hoàn tiền uy tín.',
    'Phí ship rẻ hoặc được miễn phí vận chuyển Extra.',
    'Giao diện ứng dụng mượt mà, dễ săn sale ban đêm.',
    'Nhiều voucher hoàn xu và thanh toán SPayLater tiện lợi.',
    'Thái độ của shipper thân thiện, giao đúng hẹn.'
  ];

  for (let i = 1; i <= 35; i++) {
    const respUserId = `demo_user_s1_${i}`;
    insertUser.run(respUserId, `user.s1.${i}@example.com`, `Đáp Viên #${i}`);

    const answers = {};
    if (q1[0]) answers[q1[0].id] = platforms[i % platforms.length];
    if (q1[1]) answers[q1[1].id] = ratings[i % ratings.length];
    if (q1[2]) answers[q1[2].id] = 'Shopee'; // Vượt qua Attention Check
    if (q1[3]) answers[q1[3].id] = sampleOpinions[i % sampleOpinions.length];

    const started = new Date(Date.now() - (3600000 * (36 - i))).toISOString();
    const submitted = new Date(Date.now() - (3600000 * (36 - i)) + 65000).toISOString();

    insertResp.run(
      crypto.randomUUID(),
      survey1.id,
      respUserId,
      started,
      submitted,
      65 + (i % 20),
      JSON.stringify(answers),
      0.92,
      250
    );
  }

  // Cập nhật collected_responses của Survey 1 thành 35
  db.prepare('UPDATE surveys SET collected_responses = 35 WHERE id = ?').run(survey1.id);

  // Phân bổ mẫu Survey 2 (18 phản hồi)
  const usageOpts = ['Có, dùng hàng ngày', 'Có, dùng hàng ngày', 'Thỉnh thoảng có dùng', 'Không, ghi chép sổ/trí nhớ'];
  const featuresList = [
    ['Đổi thẻ cào điện thoại', 'Rút tiền trực tiếp về ngân hàng'],
    ['Rút tiền trực tiếp về ngân hàng', 'Voucher ăn uống/mua sắm'],
    ['Đổi thẻ cào điện thoại', 'Độ bảo mật thông tin'],
    ['Rút tiền trực tiếp về ngân hàng', 'Độ bảo mật thông tin']
  ];
  const npsRatings = ['5 Sao - Rất nhiệt tình', '4 Sao', '5 Sao - Rất nhiệt tình', '3 Sao - Bình thường', '4 Sao'];

  for (let i = 1; i <= 18; i++) {
    const respUserId = `demo_user_s2_${i}`;
    insertUser.run(respUserId, `user.s2.${i}@example.com`, `Đáp Viên S2 #${i}`);

    const answers = {};
    if (q2[0]) answers[q2[0].id] = usageOpts[i % usageOpts.length];
    if (q2[1]) answers[q2[1].id] = featuresList[i % featuresList.length];
    if (q2[2]) answers[q2[2].id] = 'Voucher ăn uống/mua sắm'; // Attention check
    if (q2[3]) answers[q2[3].id] = npsRatings[i % npsRatings.length];

    const started = new Date(Date.now() - (7200000 * (19 - i))).toISOString();
    const submitted = new Date(Date.now() - (7200000 * (19 - i)) + 80000).toISOString();

    insertResp.run(
      crypto.randomUUID(),
      survey2.id,
      respUserId,
      started,
      submitted,
      80 + (i % 15),
      JSON.stringify(answers),
      0.95,
      300
    );
  }

  // Cập nhật collected_responses của Survey 2 thành 18
  db.prepare('UPDATE surveys SET collected_responses = 18 WHERE id = ?').run(survey2.id);

  console.log('✅ Đã nạp thành công 35 phản hồi cho Survey 1 và 18 phản hồi cho Survey 2!');
}

seedDemoResponses();
