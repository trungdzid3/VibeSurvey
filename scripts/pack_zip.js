const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const zipFile = path.join(rootDir, 'vibesurvey-project.zip');
const stagingDir = path.join(rootDir, '.staging_pack');

// Xóa file cũ và staging nếu có
if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile);
if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });

fs.mkdirSync(stagingDir, { recursive: true });

// Danh sách thư mục và file cần copy
const items = ['public', 'server', 'tests', 'scripts', 'package.json', 'package-lock.json', 'README.md', 'PROJECT_CONTEXT.md'];

console.log('Đang chuẩn bị các file sang thư mục staging...');
for (const item of items) {
  const src = path.join(rootDir, item);
  const dest = path.join(stagingDir, item);
  
  if (fs.statSync(src).isDirectory()) {
    fs.cpSync(src, dest, {
      recursive: true,
      filter: (source) => {
        // Bỏ qua file db đang bị lock, server sẽ tự động seed khi museAI chạy npm start
        if (source.endsWith('vibesurvey.db-wal') || source.endsWith('vibesurvey.db-shm')) {
          return false;
        }
        return true;
      }
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Đang nén file zip...');
const psCmd = `Compress-Archive -Path "${stagingDir}\\*" -DestinationPath "${zipFile}" -CompressionLevel Optimal`;
execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });

// Dọn dẹp staging
fs.rmSync(stagingDir, { recursive: true, force: true });

if (fs.existsSync(zipFile)) {
  const stat = fs.statSync(zipFile);
  console.log(`Đóng gói thành công: ${zipFile} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.error('Lỗi: Không tạo được file zip');
}
