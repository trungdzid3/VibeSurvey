const fs = require('fs');

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Cập nhật thẻ Hộp quà ở 2 thẻ Khảo sát (Số dư tích lũy & Chuỗi điểm danh)
  // To hơn, sát viền phải, cắt 1 phần ra ngoài viền, đồng nhất 100% cả 2 thẻ
  content = content.replaceAll(
    /<img src="\/assets\/3d\/gift_box_3d_master\.svg"[^>]*>/g,
    '<img src="/assets/3d/gift_box_3d_master.svg" class="absolute -right-6 sm:-right-8 -top-1 sm:-top-2 w-32 sm:w-38 h-auto object-contain pointer-events-none select-none z-0 opacity-45 dark:opacity-20" alt="Gift Box" />'
  );

  // 2. Cập nhật Chiếc ví thẻ Point (nhỏ hơn, vừa vặn, đơn giản)
  content = content.replaceAll(
    /<img src="\/assets\/3d\/wallet_3d_master\.svg"[^>]*>/g,
    '<img src="/assets/3d/wallet_3d_master.svg" class="absolute right-2 sm:right-4 top-2 sm:top-3 w-40 sm:w-48 h-auto object-contain pointer-events-none select-none z-0 drop-shadow-sm" alt="3D Orange Wallet" />'
  );

  // 3. Cập nhật Voucher & Xu thẻ Credit (nhỏ hơn, chéo nhau hơn, vừa vặn)
  content = content.replaceAll(
    /<img src="\/assets\/3d\/coins_coupon_3d_master\.svg"[^>]*>/g,
    '<img src="/assets/3d/coins_coupon_3d_master.svg" class="absolute right-2 sm:right-4 top-2 sm:top-3 w-38 sm:w-46 h-auto object-contain pointer-events-none select-none z-0" alt="3D Coins and Coupon" />'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated:', filePath);
}

updateFile('public/app.js');
updateFile('android/app/src/main/assets/public/app.js');
console.log('Done updating app.js files.');
