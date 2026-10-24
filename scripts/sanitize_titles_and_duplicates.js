/**
 * Script dọn dẹp sạch sẽ emoji khỏi tiêu đề và đa dạng hóa các bài khảo sát trùng lặp
 */
const db = require('../server/db/database');

console.log('🚀 Bắt đầu làm sạch emoji và tối ưu danh mục khảo sát...');

// 1. Quét và làm sạch emoji khỏi tiêu đề
const surveys = db.prepare('SELECT id, title FROM surveys').all();
let cleanedCount = 0;

const updateStmt = db.prepare('UPDATE surveys SET title = ? WHERE id = ?');

surveys.forEach(s => {
  let newTitle = s.title;
  // Xóa emoji cụ thể
  newTitle = newTitle
    .replace(/🔥\s*/g, '')
    .replace(/⚡\s*/g, '')
    .replace(/✔️\s*/g, '')
    .replace(/💰\s*/g, '')
    .replace(/🛒\s*/g, '')
    .replace(/💻\s*/g, '')
    .replace(/🎓\s*/g, '')
    .replace(/🛍️\s*/g, '')
    .replace(/🌿\s*/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .trim();

  if (newTitle !== s.title) {
    updateStmt.run(newTitle, s.id);
    cleanedCount++;
    console.log(`- Đã làm sạch [${s.id}]: "${s.title}" -> "${newTitle}"`);
  }
});

console.log(`✅ Đã làm sạch emoji cho ${cleanedCount} bài khảo sát.`);

// 2. Đa dạng hóa các bài khảo sát bị trùng lặp tiêu đề từng cặp
const duplicates = db.prepare(`
  SELECT title, COUNT(*) as cnt 
  FROM surveys 
  GROUP BY title 
  HAVING cnt > 1
`).all();

console.log(`🔍 Tìm thấy ${duplicates.length} tiêu đề bị trùng lặp.`);

// Xử lý các tiêu đề demo cụ thể bị nhân đôi
const pairsToDiversify = [
  {
    title: '[Gấp] Thói quen Dùng Ví Điện Tử & Thanh Toán QR Sinh Viên',
    replacement: '[Gấp] Trải Nghiệm Chuyển Tiền & Thanh Toán QR Code Giới Trẻ 2026'
  },
  {
    title: '[Hot] Khảo sát Nhu Cầu Uống Trà Sữa & Cà Phê Chuỗi',
    replacement: '[Đang Hot] Xu Hướng Tiêu Dùng Đồ Uống & Không Gian Co-Working'
  },
  {
    title: '[Sắp Hết] Đánh Giá Dịch Vụ Gọi Xe Công Nghệ & Giao Đồ Ăn',
    replacement: '[Ưu Tiên] Trải Nghiệm Ứng Dụng Đặt Xe & Giao Đồ Ăn Tại Đô Thị'
  },
  {
    title: '[1 Phút] Đánh Giá Thiết Kế Giao Diện Tối (Dark Mode)',
    replacement: '[Nhanh] Trải Nghiệm Chế Độ Giao Diện Tối & Tối Ưu Mắt Người Dùng'
  },
  {
    title: '[30 Giây] Khảo Sát Thói Quen Nghe Nhạc Spotify & YouTube Music',
    replacement: '[30 Giây] Sở Thích Nghe Podcast & Âm Nhạc Trực Tuyến Hàng Ngày'
  },
  {
    title: '[Đã Đầy] Khảo Sát Thói Quen Tập Gym & Thể Thao Hè 2026',
    replacement: '[Đã Đầy] Nghiên Cứu Thói Quen Chăm Sóc Sức Khỏe & Vận Động 2026'
  }
];

pairsToDiversify.forEach(item => {
  const matches = db.prepare('SELECT id FROM surveys WHERE title = ?').all(item.title);
  if (matches.length > 1) {
    // Giữ nguyên bài đầu, đổi tên bài thứ 2
    updateStmt.run(item.replacement, matches[1].id);
    console.log(`- Đã đa dạng hóa: "${item.title}" -> "${item.replacement}"`);
  }
});

console.log('🎉 Hoàn tất dọn dẹp và đa dạng hóa khảo sát!');
