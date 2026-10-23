/**
 * Script tự động đồng bộ tài nguyên Web SPA (public/) sang dự án Android Capacitor Native
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../public');
const TARGET_ASSETS_DIR = path.join(__dirname, '../android/app/src/main/assets/public');
const CONFIG_SOURCE = path.join(__dirname, '../capacitor.config.json');
const CONFIG_TARGET = path.join(__dirname, '../android/app/src/main/assets/capacitor.config.json');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

function syncCapacitor() {
  console.log('=======================================================');
  console.log('📱 VibeSurvey: Đang bắt đầu đồng bộ tài nguyên Web -> Android...');
  console.log('=======================================================');

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('❌ Lỗi: Thư mục public/ nguồn không tồn tại:', SOURCE_DIR);
    process.exit(1);
  }

  // 1. Sao chép toàn bộ Web Dir vào Android Assets
  console.log(`📂 Đang sao chép từ: ${SOURCE_DIR}`);
  console.log(`🎯 Đến thư mục đích: ${TARGET_ASSETS_DIR}`);
  copyRecursiveSync(SOURCE_DIR, TARGET_ASSETS_DIR);

  // 2. Sao chép capacitor.config.json vào Android Assets
  if (fs.existsSync(CONFIG_SOURCE)) {
    const destDir = path.dirname(CONFIG_TARGET);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(CONFIG_SOURCE, CONFIG_TARGET);
    console.log('📄 Đã đồng bộ capacitor.config.json sang assets Android.');
  }

  console.log('✅ Đồng bộ tài nguyên Capacitor Android hoàn tất thành công!');
  console.log('🚀 Sẵn sàng mở Android Studio hoặc build APK với Gradle.');
}

if (require.main === module) {
  syncCapacitor();
}

module.exports = syncCapacitor;
