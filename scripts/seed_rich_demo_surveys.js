/**
 * scripts/seed_rich_demo_surveys.js
 * Tạo bộ khảo sát mẫu phong phú phục vụ kiểm thử UI/UX:
 * - Khảo sát Được Ghim (Pinned / Featured)
 * - Khảo sát Gần Đầy Mẫu (FOMO >= 60%)
 * - Khảo sát Đã Đủ 100% Mẫu (để test tự động ẩn)
 * - Khảo sát Ít câu hỏi (1-3 câu), Tốc độ nhanh (<= 1 phút)
 * - Khảo sát Thưởng cao (300 - 500 điểm), Thưởng vừa, Thưởng ít
 */

const db = require('../server/db/database');
const crypto = require('crypto');

console.log('🔄 Đang khởi tạo bộ dữ liệu khảo sát mẫu phong phú...');

// 1. Tìm hoặc lấy ID của Admin/Creator chuẩn
let creator = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' OR email = 'admin@vibesurvey.com' LIMIT 1").get();
if (!creator) {
  creator = db.prepare("SELECT id FROM users LIMIT 1").get();
}
const creatorId = creator ? creator.id : 'default_creator';

// 2. Lấy voucher campaign mẫu nếu có
const voucher = db.prepare("SELECT id FROM voucher_campaigns LIMIT 1").get();
const voucherId = voucher ? voucher.id : null;

// 3. Ẩn các survey test rác để làm sạch feed công khai
db.prepare("UPDATE surveys SET status = 'CLOSED' WHERE title LIKE 'Test Survey%' OR title LIKE 'Survey Concurrency%' OR title LIKE 'Survey With Trap%' OR title LIKE 'Survey Overdraft%'").run();

// 4. Danh sách các bài khảo sát mẫu chuẩn bị seed
const demoSurveys = [
  // --- NHÓM 1: KHẢO SÁT ĐƯỢC GHIM (PINNED & FEATURED) ---
  {
    title: '📌 [Đặc Biệt] Khảo sát Xu Hướng Mua Sắm & E-Commerce 2026',
    description: 'Nghiên cứu hành vi tiêu dùng số, tần suất mua sắm trên Shopee, TikTok Shop và kỳ vọng giao hàng hỏa tốc.',
    category: 'E-Commerce',
    target: 100,
    collected: 35,
    reward_points: 500, // 5.000 VNĐ (Thưởng cao)
    min_time_sec: 180, // 3 phút
    is_pinned: 1,
    is_featured: 1,
    survey_source: 'INTERNAL',
    questions: [
      { content: 'Bạn thường mua sắm trực tuyến trên nền tảng nào nhất?', type: 'SINGLE_CHOICE', options: ['Shopee', 'TikTok Shop', 'Lazada', 'Tiki'] },
      { content: 'Mức chi tiêu trung bình mỗi tháng cho mua sắm online của bạn là bao nhiêu?', type: 'SINGLE_CHOICE', options: ['Dưới 500K', '500K - 1.5M', '1.5M - 3M', 'Trên 3M'] },
      { content: 'Yếu tố nào quyết định việc bạn chốt đơn hàng?', type: 'MULTIPLE_CHOICE', options: ['Mã FreeShip', 'Giá rẻ / Flash Sale', 'Đánh giá 5 sao', 'Giao nhanh trong 2h'] },
      { content: 'Bạn đánh giá thế nào về chất lượng dịch vụ giao hàng hiện nay?', type: 'LIKERT_SCALE', options: ['1', '2', '3', '4', '5'] }
    ]
  },
  {
    title: '📌 [Tài Trợ] Đánh Giá Trải Nghiệm Ứng Dụng AI & ChatGPT Trong Công Việc',
    description: 'Khảo sát người dùng về hiệu quả ứng dụng trí tuệ nhân tạo, Copilot và Gemini để tăng năng suất làm việc.',
    category: 'Công nghệ',
    target: 50,
    collected: 18,
    reward_points: 450, // 4.500 VNĐ (Thưởng cao)
    min_time_sec: 120, // 2 phút
    is_pinned: 1,
    is_featured: 1,
    survey_source: 'INTERNAL',
    sponsor_campaign_id: voucherId,
    questions: [
      { content: 'Bạn dùng công cụ AI nào thường xuyên nhất?', type: 'SINGLE_CHOICE', options: ['ChatGPT', 'Google Gemini', 'Claude', 'Microsoft Copilot'] },
      { content: 'Công cụ AI giúp bạn tiết kiệm bao nhiêu % thời gian mỗi ngày?', type: 'SINGLE_CHOICE', options: ['Dưới 10%', '10% - 30%', '30% - 50%', 'Trên 50%'] },
      { content: 'Bạn có sẵn sàng trả phí hàng tháng cho tài khoản AI Pro không?', type: 'SINGLE_CHOICE', options: ['Đã trả phí', 'Sẵn sàng nếu dưới 200k/tháng', 'Chỉ dùng bản miễn phí'] }
    ]
  },

  // --- NHÓM 2: KHẢO SÁT GẦN ĐẦY MẪU (FOMO >= 60% SẮP HẾT SUẤT) ---
  {
    title: '🔥 [Gấp] Thói quen Dùng Ví Điện Tử & Thanh Toán QR Sinh Viên',
    description: 'Khảo sát trải nghiệm thanh toán quét mã QR qua MoMo, ZaloPay, VietQR tại căng tin và cửa hàng tiện lợi.',
    category: 'Fintech',
    target: 50,
    collected: 46, // 92% -> Còn 4 suất!
    reward_points: 220, // 2.200 VNĐ
    min_time_sec: 60, // 1 phút (Tốc độ nhanh)
    is_pinned: 0,
    is_featured: 0,
    survey_source: 'INTERNAL',
    questions: [
      { content: 'Phương thức thanh toán bạn dùng nhiều nhất khi đi ăn uống?', type: 'SINGLE_CHOICE', options: ['Chuyển khoản QR ngân hàng', 'Ví MoMo', 'ZaloPay', 'Tiền mặt'] },
      { content: 'Bạn có thường xuyên để tiền mặt trong ví quá 200k không?', type: 'SINGLE_CHOICE', options: ['Hầu như không bao giờ', 'Thỉnh thoảng', 'Luôn luôn mang tiền mặt'] }
    ]
  },
  {
    title: '🔥 [Sắp Hết] Đánh Giá Dịch Vụ Gọi Xe Công Nghệ & Giao Đồ Ăn',
    description: 'So sánh mức độ hài lòng giữa Grab, ShopeeFood, Be và Gojek về giá cước và tốc độ phục vụ.',
    category: 'Giao thông & F&B',
    target: 40,
    collected: 35, // 87.5% -> Còn 5 suất!
    reward_points: 320, // 3.200 VNĐ (Thưởng cao)
    min_time_sec: 90, // 1.5 phút
    is_pinned: 0,
    is_featured: 0,
    survey_source: 'INTERNAL',
    questions: [
      { content: 'Ứng dụng gọi xe bạn mở đầu tiên khi cần di chuyển?', type: 'SINGLE_CHOICE', options: ['Grab', 'Be', 'Xanh SM (Xe điện)', 'Khác'] },
      { content: 'Tần suất bạn đặt đồ ăn qua app mỗi tuần?', type: 'SINGLE_CHOICE', options: ['1-2 lần', '3-5 lần', 'Hầu như mỗi ngày', 'Hiếm khi'] }
    ]
  },
  {
    title: '🔥 [Hot] Khảo sát Nhu Cầu Uống Trà Sữa & Cà Phê Chuỗi',
    description: 'Thương hiệu đồ uống yêu thích của bạn: Highlands, Phúc Long, Phê La hay The Coffee House?',
    category: 'F&B',
    target: 30,
    collected: 22, // 73.3% -> Còn 8 suất!
    reward_points: 180, // 1.800 VNĐ
    min_time_sec: 50, // < 1 phút (Siêu tốc)
    is_pinned: 0,
    is_featured: 0,
    survey_source: 'INTERNAL',
    sponsor_campaign_id: voucherId,
    questions: [
      { content: 'Bạn thích uống thương hiệu trà/cà phê nào nhất?', type: 'SINGLE_CHOICE', options: ['Phúc Long', 'Highlands Coffee', 'Phê La', 'Katinat', 'Khác'] },
      { content: 'Mức giá bạn sẵn sàng trả cho 1 ly nước?', type: 'SINGLE_CHOICE', options: ['Dưới 35K', '35K - 55K', '55K - 75K', 'Trên 75K'] }
    ]
  },

  // --- NHÓM 3: KHẢO SÁT SIÊU NHANH / ÍT CÂU HỎI (1 - 2 CÂU, DƯỚI 1 PHÚT) ---
  {
    title: '⚡ [30 Giây] Khảo Sát Thói Quen Nghe Nhạc Spotify & YouTube Music',
    description: 'Chỉ 1 câu hỏi nhanh về nền tảng nghe nhạc trực tuyến yêu thích của bạn.',
    category: 'Giải trí',
    target: 100,
    collected: 12,
    reward_points: 80, // 800 VNĐ
    min_time_sec: 30, // 30s
    is_pinned: 0,
    is_featured: 0,
    survey_source: 'INTERNAL',
    questions: [
      { content: 'Bạn thường nghe nhạc trên nền tảng nào nhất?', type: 'SINGLE_CHOICE', options: ['Spotify', 'YouTube Music', 'Apple Music', 'Zing MP3'] }
    ]
  },
  {
    title: '⚡ [1 Phút] Đánh Giá Thiết Kế Giao Diện Tối (Dark Mode)',
    description: 'Khảo sát 2 câu hỏi về thói quen sử dụng chế độ Dark Mode trên điện thoại và máy tính.',
    category: 'Giao diện & UI',
    target: 80,
    collected: 25,
    reward_points: 100, // 1.000 VNĐ
    min_time_sec: 45, // 45s
    is_pinned: 0,
    is_featured: 0,
    survey_source: 'INTERNAL',
    questions: [
      { content: 'Bạn thích dùng giao diện Sáng (Light) hay Tối (Dark) hơn?', type: 'SINGLE_CHOICE', options: ['Luôn dùng Dark Mode', 'Luôn dùng Light Mode', 'Tự động theo giờ'] },
      { content: 'Lý do chính bạn dùng Dark Mode?', type: 'SINGLE_CHOICE', options: ['Đỡ mỏi mắt ban đêm', 'Tiết kiệm pin màn hình OLED', 'Trông ngầu và hiện đại hơn'] }
    ]
  },

  // --- NHÓM 4: KHẢO SÁT CHUYÊN SÂU / NHIỀU CÂU HỎI & THƯỞNG CAO (>= 8 CÂU) ---
  {
    title: '💰 [Thưởng Lớn] Nghiên Cứu Lộ Trình Phát Triển Sự Nghiệp Ngành IT 2026',
    description: 'Khảo sát toàn diện về mức lương, công nghệ Frontend/Backend, Cloud và định hướng làm việc Remote/Hybrid.',
    category: 'Nghề nghiệp & Việc làm',
    target: 50,
    collected: 8,
    reward_points: 600, // 6.000 VNĐ (Siêu thưởng)
    min_time_sec: 300, // 5 phút
    is_pinned: 0,
    is_featured: 0,
    survey_source: 'INTERNAL',
    questions: [
      { content: 'Vai trò chuyên môn chính hiện tại của bạn là gì?', type: 'SINGLE_CHOICE', options: ['Frontend Developer', 'Backend / NodeJS / Go', 'Fullstack Developer', 'Data Engineer / AI', 'Sinh viên IT'] },
      { content: 'Số năm kinh nghiệm làm việc thực tế trong ngành phần mềm?', type: 'SINGLE_CHOICE', options: ['Dưới 1 năm', '1 - 3 năm', '3 - 5 năm', 'Trên 5 năm'] },
      { content: 'Mức thu nhập hàng tháng mong muốn hoặc hiện tại của bạn?', type: 'SINGLE_CHOICE', options: ['Dưới 15 triệu', '15 - 30 triệu', '30 - 50 triệu', 'Trên 50 triệu'] },
      { content: 'Mô hình làm việc bạn cảm thấy năng suất nhất?', type: 'SINGLE_CHOICE', options: ['Làm việc từ xa 100% (Remote)', 'Mô hình kết hợp (Hybrid 2-3 ngày)', 'Làm trực tiếp tại văn phòng'] },
      { content: 'Ngôn ngữ lập trình nào bạn đánh giá cao nhất trong năm nay?', type: 'SINGLE_CHOICE', options: ['TypeScript / JavaScript', 'Python', 'Go', 'Rust / C++'] },
      { content: 'Bạn đánh giá mức độ cạnh tranh xin việc ngành IT hiện nay như thế nào?', type: 'LIKERT_SCALE', options: ['1', '2', '3', '4', '5'] },
      { content: 'Kế hoạch học tập nâng cao kỹ năng tiếp theo của bạn là gì?', type: 'SINGLE_CHOICE', options: ['Học sâu về AI / LLMs / Agent', 'Học chứng chỉ Cloud (AWS/GCP)', 'Học System Design / Microservices', 'Học Tiếng Anh giao tiếp'] },
      { content: 'Chia sẻ ngắn gọn khó khăn lớn nhất bạn gặp phải khi phát triển nghề nghiệp:', type: 'OPEN_TEXT', options: [] }
    ]
  },

  // --- NHÓM 5: KHẢO SÁT ĐÃ ĐỦ 100% MẪU (TEST TÍNH NĂNG TỰ ĐỘNG ẨN) ---
  {
    title: '✔️ [Đã Đầy] Khảo Sát Thói Quen Tập Gym & Thể Thao Hè 2026',
    description: 'Khảo sát đã thu thập đủ 100% mục tiêu phản hồi và đã đóng nhận câu trả lời.',
    category: 'Sức khỏe & Thể thao',
    target: 50,
    collected: 50, // 100% -> ĐÃ ĐỦ MẪU!
    reward_points: 150,
    min_time_sec: 60,
    is_pinned: 0,
    is_featured: 0,
    survey_source: 'INTERNAL',
    status: 'ACTIVE',
    questions: [
      { content: 'Bạn tập môn thể thao nào thường xuyên?', type: 'SINGLE_CHOICE', options: ['Gym / Thể hình', 'Chạy bộ', 'Bơi lội', 'Cầu lông / Pickleball'] }
    ]
  },
  {
    title: '✔️ [Đã Xong] Đánh Giá Thị Trường Bất Động Sản Cho Thuê',
    description: 'Khảo sát đã kết thúc và phân tích số liệu hoàn tất.',
    category: 'Bất động sản',
    target: 30,
    collected: 30, // 100%
    reward_points: 200,
    min_time_sec: 90,
    is_pinned: 0,
    is_featured: 0,
    survey_source: 'INTERNAL',
    status: 'COMPLETED',
    questions: [
      { content: 'Mức tiền thuê nhà phù hợp với bạn?', type: 'SINGLE_CHOICE', options: ['Dưới 3M', '3M - 6M', 'Trên 6M'] }
    ]
  }
];

const insertSurvey = db.prepare(`
  INSERT INTO surveys (
    id, creator_id, title, description, category, target_responses, collected_responses,
    cost_per_response, reward_points_per_response, min_completion_time_sec, is_pinned, is_featured,
    survey_source, sponsor_campaign_id, status, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
  )
`);

const insertQuestion = db.prepare(`
  INSERT INTO questions (
    id, survey_id, content, type, options_json, order_index
  ) VALUES (
    ?, ?, ?, ?, ?, ?
  )
`);

db.exec('BEGIN TRANSACTION');
try {
  for (const s of demoSurveys) {
    const surveyId = crypto.randomUUID();
    const status = s.status || 'ACTIVE';
    const costPerResponse = Math.round((s.reward_points * 10) * 1.4);
    insertSurvey.run(
      surveyId,
      creatorId,
      s.title,
      s.description,
      s.category,
      s.target,
      s.collected,
      costPerResponse,
      s.reward_points,
      s.min_time_sec,
      s.is_pinned,
      s.is_featured,
      s.survey_source,
      s.sponsor_campaign_id || null,
      status
    );

    if (s.questions && s.questions.length > 0) {
      let order = 1;
      for (const q of s.questions) {
        insertQuestion.run(
          crypto.randomUUID(),
          surveyId,
          q.content,
          q.type,
          JSON.stringify(q.options || []),
          order++
        );
      }
    }
  }
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

console.log('✅ Đã tạo thành công bộ dữ liệu khảo sát mẫu phong phú!');
console.log(`- 2 Khảo sát Ghim (Pinned & Featured, Thưởng 450 - 500 điểm)`);
console.log(`- 3 Khảo sát Gần Đầy (87% - 92% tiến độ, kích hoạt tag FOMO)`);
console.log(`- 2 Khảo sát Siêu Nhanh (1 câu hỏi, 30s - 45s)`);
console.log(`- 1 Khảo sát Chuyên Sâu IT (8 câu hỏi, Thưởng 600 điểm)`);
console.log(`- 2 Khảo sát Đã Đủ 100% mẫu (Kiểm thử tính năng tự động ẩn)`);
