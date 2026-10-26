const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'run_all_tests.js');
let code = fs.readFileSync(targetFile, 'utf8');

if (!code.includes('test_task5_adaptive_screener_warranty.js')) {
  const targetStr = `  {
    id: 13,
    name: 'Tầng 13: Fast-Track Push Notification, Email & Full VAT Suite',
    description: 'Kiểm tra Tỷ lệ bonus tinh gọn ("hơn 1 tẹo"), Xuất Hóa Đơn VAT FULL 100%, Bắn Push APK & Gửi Email hệ thống',
    file: 'test_fast_track_and_vat.js'
  }`;

  const replacementStr = `  {
    id: 13,
    name: 'Tầng 13: Fast-Track Push Notification, Email & Full VAT Suite',
    description: 'Kiểm tra Tỷ lệ bonus tinh gọn ("hơn 1 tẹo"), Xuất Hóa Đơn VAT FULL 100%, Bắn Push APK & Gửi Email hệ thống',
    file: 'test_fast_track_and_vat.js'
  },
  {
    id: 14,
    name: 'Tầng 14: Task 5 - Adaptive Screener, is_required & Warranty Claim Suite',
    description: 'Kiểm tra cờ is_required, Grid rows/columns, Adaptive Auto-Screener Bypass & Bảo hành 1 đổi 1 15%',
    file: 'test_task5_adaptive_screener_warranty.js'
  }`;

  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(targetFile, code, 'utf8');
  console.log('Đã thêm test suite 14 vào run_all_tests.js');
} else {
  console.log('Suite 14 đã có sẵn');
}
