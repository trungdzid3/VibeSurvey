const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'app.js');
let code = fs.readFileSync(appPath, 'utf8');

// Thay the toan bo cac duong dan asset cu bang cac asset 3D moi sinh 100%
code = code.replace(/\/assets\/3d\/gift_box_pastel_clean\.png/g, '/assets/3d/gift_box_3d_master.png');
code = code.replace(/\/assets\/3d\/empty_state_3d_clean\.png/g, '/assets/3d/empty_state_3d_master.png');
code = code.replace(/\/assets\/3d\/wallet_3d_clean\.png/g, '/assets/3d/wallet_3d_master.png');
code = code.replace(/\/assets\/3d\/coins_coupon_3d_clean\.png/g, '/assets/3d/coins_coupon_3d_master.png');

// Tinh chinh vi tri va opacity cho dep mat
code = code.replace(
  'src="/assets/3d/gift_box_3d_master.png" class="absolute right-0 bottom-0 w-36 sm:w-40 h-auto object-contain pointer-events-none select-none z-0"',
  'src="/assets/3d/gift_box_3d_master.png" class="absolute -right-1 -bottom-2 w-28 sm:w-32 h-auto object-contain pointer-events-none select-none z-0 opacity-80"'
);

code = code.replace(
  'src="/assets/3d/wallet_3d_master.png" class="absolute right-3 top-4 w-32 sm:w-36 h-auto object-contain pointer-events-none select-none z-0 drop-shadow-sm"',
  'src="/assets/3d/wallet_3d_master.png" class="absolute right-2 top-4 w-36 sm:w-44 h-auto object-contain pointer-events-none select-none z-0 drop-shadow-md"'
);

code = code.replace(
  'src="/assets/3d/coins_coupon_3d_master.png" class="absolute right-3 top-4 w-36 sm:w-40 h-auto object-contain pointer-events-none select-none z-0 drop-shadow-sm"',
  'src="/assets/3d/coins_coupon_3d_master.png" class="absolute right-2 top-4 w-40 sm:w-48 h-auto object-contain pointer-events-none select-none z-0 drop-shadow-md"'
);

fs.writeFileSync(appPath, code, 'utf8');
console.log('Da cap nhat cac asset 3D moi vao app.js thanh cong!');
