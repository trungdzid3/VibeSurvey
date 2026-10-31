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
  console.log('[DONG BO] VibeSurvey: Dang bat dau dong bo tai nguyen Web -> Android...');
  console.log('=======================================================');

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('[LOI] Thu muc public/ nguon khong ton tai:', SOURCE_DIR);
    process.exit(1);
  }

  // 1. Sao chep toan bo Web Dir vao Android Assets
  console.log(`[SAO CHEP] Tu thu muc: ${SOURCE_DIR}`);
  console.log(`[SAO CHEP] Den thu muc: ${TARGET_ASSETS_DIR}`);
  copyRecursiveSync(SOURCE_DIR, TARGET_ASSETS_DIR);

  // 2. Sao chep capacitor.config.json vao Android Assets
  if (fs.existsSync(CONFIG_SOURCE)) {
    const destDir = path.dirname(CONFIG_TARGET);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(CONFIG_SOURCE, CONFIG_TARGET);
    console.log('[DONG BO] Da dong bo capacitor.config.json sang assets Android.');
  }

  console.log('[THANH CONG] Dong bo tai nguyen Capacitor Android hoan tat!');
  console.log('[THONG TIN] San sang mo Android Studio hoac build APK voi Gradle.');
}

if (require.main === module) {
  syncCapacitor();
}

module.exports = syncCapacitor;
