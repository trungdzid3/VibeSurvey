/**
 * Script sao lưu cơ sở dữ liệu SQLite của VibeSurvey
 * Tự động tạo bản sao lưu có gắn mốc thời gian vào thư mục backups/
 */

const fs = require('fs');
const path = require('path');
const config = require('../server/config');

function backupDatabase() {
  const dbPath = config.DB_PATH;
  if (!fs.existsSync(dbPath)) {
    console.error('[LOI] Khong tim thay tep co so du lieu tai:', dbPath);
    process.exit(1);
  }

  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  
  const destDb = path.join(backupDir, `vibesurvey_backup_${timestamp}.db`);
  fs.copyFileSync(dbPath, destDb);
  console.log('[THANH CONG] Da sao luu CSDL thanh cong tai:', destDb);

  // Sao luu kem tep WAL va SHM neu ton tai (dam bao tinh toan ven che do WAL)
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  if (fs.existsSync(walPath)) {
    fs.copyFileSync(walPath, `${destDb}-wal`);
    console.log('[THONG TIN] Da sao luu kem tep WAL:', `${destDb}-wal`);
  }
  if (fs.existsSync(shmPath)) {
    fs.copyFileSync(shmPath, `${destDb}-shm`);
    console.log('[THONG TIN] Da sao luu kem tep SHM:', `${destDb}-shm`);
  }

  // Liet ke cac ban sao luu hien co trong thu muc backups/
  const existingBackups = fs.readdirSync(backupDir).filter(f => f.startsWith('vibesurvey_backup_') && f.endsWith('.db'));
  console.log(`[TONG QUAT] Hien co ${existingBackups.length} ban sao luu trong he thong.`);
  return destDb;
}

if (require.main === module) {
  backupDatabase();
}

module.exports = backupDatabase;
