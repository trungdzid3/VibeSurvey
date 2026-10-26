const db = require('./database');

function seedDatabase() {
  // Đã gỡ bỏ toàn bộ việc tự sinh khảo sát giả và dữ liệu mẫu theo yêu cầu của người dùng.
  // Hệ thống hoàn toàn sạch, chỉ lưu trữ khảo sát do người dùng tự tạo.
  return;
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
