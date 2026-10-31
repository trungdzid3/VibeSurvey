const fs = require('fs');

// 1. HỘP QUÀ TỐI GIẢN, TO ĐẸP, MỜ MỜ (GIFT BOX SVG)
const giftBoxSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" fill="none">
  <g>
    <!-- Thân hộp quà cam pastel -->
    <rect x="40" y="75" width="100" height="85" rx="14" fill="#FED7AA" fill-opacity="0.85" />
    <rect x="40" y="75" width="100" height="10" fill="#FDBA74" fill-opacity="0.35" />
    
    <!-- Dải ruy băng dọc thân hộp -->
    <rect x="78" y="75" width="24" height="85" fill="#FFFFFF" fill-opacity="0.85" />
    
    <!-- Nắp hộp quà -->
    <rect x="30" y="50" width="120" height="28" rx="10" fill="#FDBA74" fill-opacity="0.9" />
    <!-- Dải ruy băng dọc nắp hộp -->
    <rect x="78" y="50" width="24" height="28" fill="#FFFFFF" fill-opacity="0.95" />
    
    <!-- Nơ thắt 2 cánh tròn mềm mại -->
    <path d="M82 50 C68 28, 42 30, 52 46 C60 55, 75 51, 82 50 Z" fill="#FDBA74" fill-opacity="0.95" />
    <path d="M80 48 C70 34, 50 36, 58 45 C64 51, 75 49, 80 48 Z" fill="#FED7AA" />
    
    <path d="M98 50 C112 28, 138 30, 128 46 C120 55, 105 51, 98 50 Z" fill="#FDBA74" fill-opacity="0.95" />
    <path d="M100 48 C110 34, 130 36, 122 45 C116 51, 105 49, 100 48 Z" fill="#FED7AA" />
    
    <!-- Nút thắt nơ tròn trung tâm -->
    <circle cx="90" cy="50" r="9" fill="#FFFFFF" />
    <circle cx="90" cy="50" r="6" fill="#FB923C" />
    
    <!-- 1 Ngôi sao 4 cánh mờ nhạt lơ lửng -->
    <path d="M26 30 C26 24, 26 24, 20 24 C26 24, 26 24, 26 18 C26 24, 26 24, 32 24 C26 24, 26 24, 26 30 Z" fill="#FBBF24" fill-opacity="0.6" />
  </g>
</svg>`;

// 2. CHIẾC VÍ DA CAM ĐƠN GIẢN HƠN, NHỎ HƠN (WALLET SVG)
const walletSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" fill="none">
  <defs>
    <linearGradient id="walletCleanBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF9E42" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
    <linearGradient id="walletCleanFlap" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFAE68" />
      <stop offset="100%" stop-color="#F97316" />
    </linearGradient>
  </defs>

  <g>
    <!-- Quai xách cong đơn giản -->
    <path d="M80 65 C80 32, 140 32, 140 65" stroke="#FB923C" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.95" />
    <path d="M80 65 C80 35, 140 35, 140 65" stroke="#FFEDD5" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5" />

    <!-- Thân ví da cam mềm mại -->
    <rect x="45" y="55" width="145" height="95" rx="20" fill="url(#walletCleanBody)" />
    
    <!-- Vệt sáng nhẹ trên thân ví -->
    <rect x="52" y="60" width="130" height="15" rx="7" fill="#FFFFFF" fill-opacity="0.12" />

    <!-- Nắp ví cong nhẹ tinh tế -->
    <path d="M45 55 L190 55 L190 95 C190 110, 165 118, 145 118 L95 118 C75 118, 45 110, 45 95 Z" fill="url(#walletCleanFlap)" />

    <!-- Cúc bấm kim loại tròn sao vàng đơn giản -->
    <circle cx="155" cy="102" r="11" fill="#FFFFFF" />
    <circle cx="155" cy="102" r="9" fill="#FDE047" />
    <circle cx="155" cy="102" r="7" fill="#EAB308" />
    <path d="M155 97 L156.4 100.2 L159.8 100.5 L157.2 102.7 L158 106.2 L155 104.3 L152 106.2 L152.8 102.7 L150.2 100.5 L153.6 100.2 Z" fill="#FFFFFF" />

    <!-- 1 Ngôi sao nhỏ lấp lánh nhẹ nhàng phía trên -->
    <path d="M30 40 C30 35, 30 35, 25 35 C30 35, 30 35, 30 30 C30 35, 30 35, 35 35 C30 35, 30 35, 30 40 Z" fill="#FEF08A" fill-opacity="0.8" />
  </g>
</svg>`;

// 3. VOUCHER VÀ XU CHÉO NHAU HƠN, NHỎ GỌN HƠN (COINS COUPON SVG)
const coinsCouponSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" fill="none">
  <defs>
    <linearGradient id="coinGradClean" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>
    <linearGradient id="coinSideClean" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
    <linearGradient id="couponGradClean" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
  </defs>

  <g>
    <!-- CHỒNG 3 ĐỒNG XU VÀNG PHÍA SAU -->
    <!-- Đồng xu 1 (dưới) -->
    <path d="M140 75 C140 64, 185 64, 185 75 L185 88 C185 99, 140 99, 140 88 Z" fill="url(#coinSideClean)" />
    <ellipse cx="162.5" cy="75" rx="22.5" ry="11" fill="url(#coinGradClean)" />

    <!-- Đồng xu 2 (giữa) -->
    <path d="M140 57 C140 46, 185 46, 185 57 L185 70 C185 81, 140 81, 140 70 Z" fill="url(#coinSideClean)" />
    <ellipse cx="162.5" cy="57" rx="22.5" ry="11" fill="url(#coinGradClean)" />

    <!-- Đồng xu 3 (trên) -->
    <path d="M140 39 C140 28, 185 28, 185 39 L185 52 C185 63, 140 63, 140 52 Z" fill="url(#coinSideClean)" />
    <ellipse cx="162.5" cy="39" rx="22.5" ry="11" fill="url(#coinGradClean)" />
    <ellipse cx="162.5" cy="39" rx="17" ry="8" stroke="#FEF08A" stroke-width="1.2" fill="none" opacity="0.6" />

    <!-- VÉ COUPON % NGHIÊNG CHÉO HƠN (-24 ĐỘ) ĐAN CHÉO TRƯỚC ĐỒNG XU -->
    <g transform="translate(62, 72) rotate(-24)">
      <!-- Thân vé cam có 2 khuyết bán nguyệt ở 2 bên -->
      <path d="M 8 0 
               L 96 0 
               A 7 7 0 0 1 103 7
               L 103 20
               A 9 9 0 0 0 103 38
               L 103 51
               A 7 7 0 0 1 96 58
               L 8 58
               A 7 7 0 0 1 1 51
               L 1 38
               A 9 9 0 0 0 1 20
               L 1 7
               A 7 7 0 0 1 8 0 Z" 
            fill="url(#couponGradClean)" />
      
      <!-- Thẻ trắng bo tròn bên trong -->
      <rect x="18" y="8" width="68" height="42" rx="7" fill="#FFFFFF" />
      
      <!-- Dấu % màu cam nổi bật -->
      <text x="52" y="38" font-family="Montserrat, Arial, sans-serif" font-size="28" font-weight="900" fill="#EA580C" text-anchor="middle">%</text>
    </g>

    <!-- 1 Ngôi sao nhỏ nhẹ nhàng góc trên -->
    <path d="M205 28 C205 24, 205 24, 201 24 C205 24, 205 24, 205 20 C205 24, 205 24, 209 24 C205 24, 205 24, 205 28 Z" fill="#FBBF24" fill-opacity="0.8" />
  </g>
</svg>`;

// Ghi đè vào cả thư mục public và android
const list = [
  ['public/assets/3d/gift_box_3d_master.svg', giftBoxSvg],
  ['public/assets/3d/gift_box_pastel_clean.svg', giftBoxSvg],
  ['android/app/src/main/assets/public/assets/3d/gift_box_3d_master.svg', giftBoxSvg],
  ['android/app/src/main/assets/public/assets/3d/gift_box_pastel_clean.svg', giftBoxSvg],

  ['public/assets/3d/wallet_3d_master.svg', walletSvg],
  ['public/assets/3d/wallet_3d_clean.svg', walletSvg],
  ['android/app/src/main/assets/public/assets/3d/wallet_3d_master.svg', walletSvg],
  ['android/app/src/main/assets/public/assets/3d/wallet_3d_clean.svg', walletSvg],

  ['public/assets/3d/coins_coupon_3d_master.svg', coinsCouponSvg],
  ['public/assets/3d/coins_coupon_3d_clean.svg', coinsCouponSvg],
  ['android/app/src/main/assets/public/assets/3d/coins_coupon_3d_master.svg', coinsCouponSvg],
  ['android/app/src/main/assets/public/assets/3d/coins_coupon_3d_clean.svg', coinsCouponSvg],
];

list.forEach(([p, c]) => fs.writeFileSync(p, c, 'utf8'));
console.log('Saved all tuned SVGs successfully.');
