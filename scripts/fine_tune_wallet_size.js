const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

const oldWallet = 'src="/assets/3d/wallet_3d_master.svg" class="absolute right-2 sm:right-4 top-2 sm:top-3.5 w-32 sm:w-38 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20 drop-shadow-sm"';
const newWallet = 'src="/assets/3d/wallet_3d_master.svg" class="absolute right-1.5 sm:right-3 top-1.5 sm:top-2.5 w-38 sm:w-44 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20 drop-shadow-sm"';

if (!code.includes(oldWallet)) {
  console.error('ERROR: oldWallet string not found in app.js');
  process.exit(1);
}

code = code.replace(oldWallet, newWallet);
fs.writeFileSync(appJsPath, code, 'utf8');
console.log('SUCCESS: Fine-tuned wallet size to w-38 sm:w-44 in public/app.js!');
