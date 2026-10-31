const fs = require('fs');

// 1. CHIẾC VÍ DA 3D CẦM TAY MỚI (CHUẨN DÁNG VÍ DA CLAYMORPHISM, KHÔNG GIỐNG CẶP TÁP)
const newWalletSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" fill="none">
  <defs>
    <!-- Gradient cam Sunset bóng 3D mềm mại cho thân ví -->
    <linearGradient id="clayWalletBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF9D42" />
      <stop offset="50%" stop-color="#F97316" />
      <stop offset="100%" stop-color="#C2410C" />
    </linearGradient>
    <linearGradient id="clayWalletFlap" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFAE5C" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
    <linearGradient id="goldButtonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="30%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
  </defs>

  <g>
    <!-- Quai xách da cong mềm mại phía trên -->
    <path d="M75 60 C75 25, 145 25, 145 60" stroke="#EA580C" stroke-width="11" stroke-linecap="round" fill="none" />
    <path d="M75 60 C75 28, 145 28, 145 60" stroke="#FFEDD5" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.6" />

    <!-- Thân ví chính căng mọng dạng ví da gập (Clay 3D) -->
    <!-- Đáy ví nở nhẹ, cạnh bo tròn mềm mại -->
    <path d="M42 62 C42 50, 52 46, 68 46 L162 46 C178 46, 188 50, 188 62 L188 120 C188 136, 174 148, 156 148 L74 148 C56 148, 42 136, 42 120 Z" fill="url(#clayWalletBody)" />
    
    <!-- Ánh sáng phản chiếu mặt trên thân ví -->
    <path d="M50 54 C50 49, 58 48, 70 48 L160 48 C172 48, 180 49, 180 54 L180 64 C180 64, 115 58, 50 64 Z" fill="#FFFFFF" fill-opacity="0.22" />

    <!-- Nắp ví da gập uốn lượn chéo xuống bên phải (Dáng ví chuẩn mẫu) -->
    <path d="M42 46 L188 46 L188 88 C188 102, 176 112, 160 112 L132 112 C120 112, 110 102, 102 96 C90 88, 62 88, 42 94 Z" fill="url(#clayWalletFlap)" />

    <!-- Đường khâu nắp ví tinh tế -->
    <path d="M48 50 L182 50 L182 86 C182 98, 172 106, 158 106 L134 106 C122 106, 113 97, 104 91 C92 83, 64 83, 48 88 Z" stroke="#FFEDD5" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round" fill="none" opacity="0.4" />

    <!-- Cúc bấm kim loại tròn sao vàng nổi bật ở đầu nắp gập -->
    <g transform="translate(150, 92)">
      <!-- Vòng viền ngoài trắng bạc -->
      <circle cx="12" cy="12" r="14" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="12" fill="#FEF08A" />
      <!-- Lõi vàng kim -->
      <circle cx="12" cy="12" r="10" fill="url(#goldButtonGrad)" />
      <!-- Ngôi sao 5 cánh dập nổi -->
      <path d="M12 5 L13.8 9.8 L18.8 10.2 L15 13.5 L16.2 18.5 L12 15.8 L7.8 18.5 L9 13.5 L5.2 10.2 L10.2 9.8 Z" fill="#FFFFFF" />
    </g>

    <!-- Ngôi sao vàng lấp lánh (sparkle) nhỏ tinh tế -->
    <path d="M25 35 C25 29, 25 29, 19 29 C25 29, 25 29, 25 23 C25 29, 25 29, 31 29 C25 29, 25 29, 25 35 Z" fill="#FEF08A" fill-opacity="0.9" />
    <path d="M205 38 C205 33, 205 33, 200 33 C205 33, 205 33, 205 28 C205 33, 205 33, 210 33 C205 33, 205 33, 205 38 Z" fill="#FEF08A" fill-opacity="0.8" />
  </g>
</svg>`;

// 2. VOUCHER & XU THU NHỎ, CHÉO NHAU RÕ RÀNG HƠN
const newCoinsCouponSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" fill="none">
  <defs>
    <linearGradient id="coinGradMini" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>
    <linearGradient id="coinSideMini" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#A16207" />
    </linearGradient>
    <linearGradient id="couponGradMini" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
  </defs>

  <g>
    <!-- CHỒNG 3 ĐỒNG XU VÀNG PHÍA SAU -->
    <!-- Đồng xu 1 -->
    <path d="M115 65 C115 54, 160 54, 160 65 L160 77 C160 88, 115 88, 115 77 Z" fill="url(#coinSideMini)" />
    <ellipse cx="137.5" cy="65" rx="22.5" ry="11" fill="url(#coinGradMini)" />

    <!-- Đồng xu 2 -->
    <path d="M115 47 C115 36, 160 36, 160 47 L160 59 C160 70, 115 70, 115 59 Z" fill="url(#coinSideMini)" />
    <ellipse cx="137.5" cy="47" rx="22.5" ry="11" fill="url(#coinGradMini)" />

    <!-- Đồng xu 3 -->
    <path d="M115 29 C115 18, 160 18, 160 29 L160 41 C160 52, 115 52, 115 41 Z" fill="url(#coinSideMini)" />
    <ellipse cx="137.5" cy="29" rx="22.5" ry="11" fill="url(#coinGradMini)" />
    <ellipse cx="137.5" cy="29" rx="16" ry="7.5" stroke="#FEF08A" stroke-width="1.2" fill="none" opacity="0.6" />

    <!-- VÉ COUPON % NGHIÊNG CHÉO (-26 ĐỘ) ĐAN CHÉO PHÍA TRƯỚC -->
    <g transform="translate(42, 65) rotate(-26)">
      <!-- Thân vé cam -->
      <path d="M 8 0 
               L 92 0 
               A 7 7 0 0 1 99 7
               L 99 18
               A 9 9 0 0 0 99 36
               L 99 47
               A 7 7 0 0 1 92 54
               L 8 54
               A 7 7 0 0 1 1 47
               L 1 36
               A 9 9 0 0 0 1 18
               L 1 7
               A 7 7 0 0 1 8 0 Z" 
            fill="url(#couponGradMini)" />
      
      <!-- Thẻ trắng bo góc -->
      <rect x="16" y="7" width="66" height="40" rx="6" fill="#FFFFFF" />
      
      <!-- Dấu % màu cam nổi bật -->
      <text x="49" y="36" font-family="Montserrat, Arial, sans-serif" font-size="26" font-weight="900" fill="#EA580C" text-anchor="middle">%</text>
    </g>

    <!-- Ngôi sao nhỏ vàng lấp lánh -->
    <path d="M180 20 C180 16, 180 16, 176 16 C180 16, 180 16, 180 12 C180 16, 180 16, 184 16 C180 16, 180 16, 180 20 Z" fill="#FBBF24" fill-opacity="0.8" />
  </g>
</svg>`;

// Ghi đè vào thư mục public và android
fs.writeFileSync('public/assets/3d/wallet_3d_master.svg', newWalletSvg, 'utf8');
fs.writeFileSync('public/assets/3d/wallet_3d_clean.svg', newWalletSvg, 'utf8');
fs.writeFileSync('android/app/src/main/assets/public/assets/3d/wallet_3d_master.svg', newWalletSvg, 'utf8');
fs.writeFileSync('android/app/src/main/assets/public/assets/3d/wallet_3d_clean.svg', newWalletSvg, 'utf8');

fs.writeFileSync('public/assets/3d/coins_coupon_3d_master.svg', newCoinsCouponSvg, 'utf8');
fs.writeFileSync('public/assets/3d/coins_coupon_3d_clean.svg', newCoinsCouponSvg, 'utf8');
fs.writeFileSync('android/app/src/main/assets/public/assets/3d/coins_coupon_3d_master.svg', newCoinsCouponSvg, 'utf8');
fs.writeFileSync('android/app/src/main/assets/public/assets/3d/coins_coupon_3d_clean.svg', newCoinsCouponSvg, 'utf8');

console.log('Successfully generated new wallet and coins-coupon SVGs.');
