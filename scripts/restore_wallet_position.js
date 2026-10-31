const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

// Khôi phục ví da về vị trí chuẩn ban đầu (góc phải dưới)
const currentWalletRegex = /<img src="\/assets\/3d\/wallet_3d_master\.svg" class="[^"]+" alt="3D Orange Wallet" \/>/;
const originalWalletHtml = '<img src="/assets/3d/wallet_3d_master.svg" class="absolute -right-3 sm:-right-5 -bottom-2 sm:-bottom-4 w-38 sm:w-44 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20 drop-shadow-sm" alt="3D Orange Wallet" />';

if (!currentWalletRegex.test(code)) {
  console.error('ERROR: currentWalletRegex not matched in app.js');
  process.exit(1);
}

code = code.replace(currentWalletRegex, originalWalletHtml);
fs.writeFileSync(appJsPath, code, 'utf8');
console.log('SUCCESS: Restored wallet to original bottom-right position in public/app.js!');
