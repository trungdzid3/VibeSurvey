const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

// Cập nhật Credit card: đẩy sang phải (-right-2 sm:-right-4) và tinh chỉnh kích thước (w-36 sm:w-44) để tạo khoảng thở rộng rãi với "100.000.000 Credit"
const oldCoins = 'src="/assets/3d/coins_coupon_3d_master.svg" class="absolute right-1 sm:right-3 top-1 sm:top-2 w-44 sm:w-52 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20"';
const newCoins = 'src="/assets/3d/coins_coupon_3d_master.svg" class="absolute -right-2 sm:-right-4 top-1 sm:top-2.5 w-36 sm:w-44 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20"';

// Cập nhật Point card đồng bộ cân đối
const oldWallet = 'src="/assets/3d/wallet_3d_master.svg" class="absolute right-1 sm:right-3 top-1 sm:top-2 w-44 sm:w-52 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20 drop-shadow-sm"';
const newWallet = 'src="/assets/3d/wallet_3d_master.svg" class="absolute -right-1 sm:-right-3 top-1 sm:top-2.5 w-38 sm:w-46 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20 drop-shadow-sm"';

if (!code.includes(oldCoins)) {
  console.error('ERROR: oldCoins not found in app.js');
  process.exit(1);
}
if (!code.includes(oldWallet)) {
  console.error('ERROR: oldWallet not found in app.js');
  process.exit(1);
}

code = code.replace(oldCoins, newCoins);
code = code.replace(oldWallet, newWallet);

fs.writeFileSync(appJsPath, code, 'utf8');
console.log('SUCCESS: Adjusted position and size of coins & voucher and wallet to prevent collision with balance text!');
