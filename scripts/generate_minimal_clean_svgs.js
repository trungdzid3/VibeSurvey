const fs = require('fs');

// 1. HỘP QUÀ TỐI GIẢN, MỜ MỜ TRONG SUỐT (GIFT BOX SVG)
// Nhẹ nhàng, ít chi tiết, cơ bản theo đúng mẫu
const giftBoxSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <!-- Toàn bộ hộp quà phong cách Minimalist Soft Pastel Watermark -->
  <g opacity="0.85">
    <!-- Thân hộp quà -->
    <rect x="42" y="68" width="76" height="64" rx="12" fill="#FED7AA" fill-opacity="0.8" />
    <!-- Đổ bóng đáy nắp nhẹ -->
    <rect x="42" y="68" width="76" height="8" fill="#FDBA74" fill-opacity="0.4" />
    
    <!-- Dải ruy băng dọc thân hộp -->
    <rect x="71" y="68" width="18" height="64" fill="#FFFFFF" fill-opacity="0.75" />
    
    <!-- Nắp hộp quà -->
    <rect x="34" y="48" width="92" height="22" rx="8" fill="#FDBA74" fill-opacity="0.85" />
    <!-- Dải ruy băng dọc nắp hộp -->
    <rect x="71" y="48" width="18" height="22" fill="#FFFFFF" fill-opacity="0.9" />
    
    <!-- Nơ thắt 2 bên (Cánh nơ trái và phải bo mềm) -->
    <!-- Cánh nơ trái -->
    <path d="M74 48 C62 30, 40 32, 48 45 C54 52, 68 49, 74 48 Z" fill="#FDBA74" fill-opacity="0.9" />
    <path d="M72 47 C64 36, 48 38, 54 45 C58 49, 68 48, 72 47 Z" fill="#FED7AA" fill-opacity="0.95" />
    
    <!-- Cánh nơ phải -->
    <path d="M86 48 C98 30, 120 32, 112 45 C106 52, 92 49, 86 48 Z" fill="#FDBA74" fill-opacity="0.9" />
    <path d="M88 47 C96 36, 112 38, 106 45 C102 49, 92 48, 88 47 Z" fill="#FED7AA" fill-opacity="0.95" />
    
    <!-- Nút thắt nơ tròn trung tâm -->
    <circle cx="80" cy="48" r="7" fill="#FFFFFF" fill-opacity="0.95" />
    <circle cx="80" cy="48" r="5" fill="#FB923C" fill-opacity="0.85" />
    
    <!-- Ngôi sao 4 cánh nhỏ lơ lửng góc trên trái -->
    <path d="M28 28 C28 22, 28 22, 22 22 C28 22, 28 22, 28 16 C28 22, 28 22, 34 22 C28 22, 28 22, 28 28 Z" fill="#FBBF24" fill-opacity="0.75" />
    
    <!-- Ngôi sao 4 cánh nhỏ lơ lửng góc trên phải -->
    <path d="M136 38 C136 34, 136 34, 132 34 C136 34, 136 34, 136 30 C136 34, 136 34, 140 34 C136 34, 136 34, 136 38 Z" fill="#FBBF24" fill-opacity="0.65" />
  </g>
</svg>`;

// 2. CHIẾC VÍ DA 3D TỐI GIẢN, ĐƠN GIẢN, KHÔNG SLOP (WALLET SVG)
const walletSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 220" fill="none">
  <defs>
    <!-- Gradient cam ấm mượt mà cho thân ví -->
    <linearGradient id="walletBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF9838" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
    <linearGradient id="walletFlapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFAB5E" />
      <stop offset="100%" stop-color="#F97316" />
    </linearGradient>
    <linearGradient id="goldCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>
  </defs>

  <g>
    <!-- Đồng xu vàng mờ chìm phía sau ví -->
    <ellipse cx="85" cy="115" rx="36" ry="36" fill="#FDE047" fill-opacity="0.22" />
    <ellipse cx="85" cy="115" rx="28" ry="28" fill="#EAB308" fill-opacity="0.25" />

    <!-- Quai xách cong vươn cao -->
    <path d="M95 90 C95 48, 175 48, 175 90" stroke="#FB923C" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.95" />
    <path d="M95 90 C95 52, 175 52, 175 90" stroke="#FFEDD5" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.6" />

    <!-- Thân ví da cam mềm mại bo góc lớn -->
    <rect x="55" y="80" width="170" height="110" rx="24" fill="url(#walletBodyGrad)" />
    
    <!-- Ánh sáng phản chiếu mặt trên thân ví -->
    <rect x="60" y="84" width="160" height="20" rx="10" fill="#FFFFFF" fill-opacity="0.15" />

    <!-- Nắp ví cong nhẹ ở giữa -->
    <path d="M55 80 L225 80 L225 125 C225 140, 195 148, 170 148 L110 148 C85 148, 55 140, 55 125 Z" fill="url(#walletFlapGrad)" />
    
    <!-- Viền chỉ khâu nắp ví -->
    <path d="M62 85 L218 85 L218 122 C218 135, 192 142, 168 142 L112 142 C88 142, 62 135, 62 122 Z" stroke="#FFEDD5" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round" fill="none" opacity="0.4" />

    <!-- Cúc bấm kim loại tròn sao vàng dập nổi -->
    <ellipse cx="185" cy="128" rx="14" ry="14" fill="#FFFFFF" />
    <ellipse cx="185" cy="128" rx="12" ry="12" fill="#FEF08A" />
    <ellipse cx="185" cy="128" rx="10" ry="10" fill="url(#goldCoinGrad)" />
    <!-- Ngôi sao 5 cánh trên cúc ví -->
    <path d="M185 121 L186.8 125.2 L191.2 125.6 L187.8 128.5 L188.8 133 L185 130.6 L181.2 133 L182.2 128.5 L178.8 125.6 L183.2 125.2 Z" fill="#FFFFFF" />

    <!-- Huy hiệu ngôi sao tròn bên cạnh (như mẫu) -->
    <g transform="translate(205, 135)">
      <circle cx="16" cy="16" r="18" fill="#FDE047" fill-opacity="0.95" />
      <circle cx="16" cy="16" r="15" fill="#EAB308" />
      <circle cx="16" cy="16" r="12" fill="#CA8A04" />
      <!-- Sao vàng dập nổi -->
      <path d="M16 8 L18.5 13.5 L24.5 14 L20 18 L21.5 24 L16 20.8 L10.5 24 L12 18 L7.5 14 L13.5 13.5 Z" fill="#FEF08A" />
    </g>

    <!-- Ngôi sao 4 cánh lấp lánh (sparkles) -->
    <path d="M42 65 C42 58, 42 58, 35 58 C42 58, 42 58, 42 51 C42 58, 42 58, 49 58 C42 58, 42 58, 42 65 Z" fill="#FEF08A" fill-opacity="0.9" />
    <path d="M235 55 C235 50, 235 50, 230 50 C235 50, 235 50, 235 45 C235 50, 235 50, 240 50 C235 50, 235 50, 235 55 Z" fill="#FEF08A" fill-opacity="0.8" />
    <path d="M125 35 C125 32, 125 32, 122 32 C125 32, 125 32, 125 29 C125 32, 125 32, 128 32 C125 32, 125 32, 125 35 Z" fill="#FFFFFF" fill-opacity="0.85" />
  </g>
</svg>`;

// 3. CHỒNG COIN & VÉ COUPON % TỐI GIẢN, THANH LỊCH (COINS COUPON SVG)
const coinsCouponSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 220" fill="none">
  <defs>
    <linearGradient id="coinFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>
    <linearGradient id="coinSideGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
    <linearGradient id="couponGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
  </defs>

  <g>
    <!-- ĐỒNG XU 1 (DƯỚI CÙNG) -->
    <path d="M165 95 C165 82, 215 82, 215 95 L215 110 C215 123, 165 123, 165 110 Z" fill="url(#coinSideGrad)" />
    <ellipse cx="190" cy="95" rx="25" ry="12" fill="url(#coinFaceGrad)" />
    <ellipse cx="190" cy="95" rx="20" ry="9" stroke="#FEF08A" stroke-width="1.5" fill="none" opacity="0.6" />

    <!-- ĐỒNG XU 2 (GIỮA) -->
    <path d="M165 75 C165 62, 215 62, 215 75 L215 90 C215 103, 165 103, 165 90 Z" fill="url(#coinSideGrad)" />
    <ellipse cx="190" cy="75" rx="25" ry="12" fill="url(#coinFaceGrad)" />
    <ellipse cx="190" cy="75" rx="20" ry="9" stroke="#FEF08A" stroke-width="1.5" fill="none" opacity="0.6" />

    <!-- ĐỒNG XU 3 (TRÊN CÙNG) -->
    <path d="M165 55 C165 42, 215 42, 215 55 L215 70 C215 83, 165 83, 165 70 Z" fill="url(#coinSideGrad)" />
    <ellipse cx="190" cy="55" rx="25" ry="12" fill="url(#coinFaceGrad)" />
    <ellipse cx="190" cy="55" rx="20" ry="9" stroke="#FEF08A" stroke-width="1.5" fill="none" opacity="0.6" />
    <ellipse cx="190" cy="55" rx="8" ry="4" fill="#CA8A04" opacity="0.3" />

    <!-- VÉ COUPON % NGHIÊNG PHÍA TRƯỚC (DÁNG CHUẨN MẪU) -->
    <g transform="translate(70, 80) rotate(-16)">
      <!-- Thân vé cam có 2 khuyết bán nguyệt ở 2 cạnh bên -->
      <path d="M 10 0 
               L 110 0 
               A 8 8 0 0 1 118 8
               L 118 24
               A 10 10 0 0 0 118 44
               L 118 60
               A 8 8 0 0 1 110 68
               L 10 68
               A 8 8 0 0 1 2 60
               L 2 44
               A 10 10 0 0 0 2 24
               L 2 8
               A 8 8 0 0 1 10 0 Z" 
            fill="url(#couponGrad)" />
      
      <!-- Thẻ trắng bo góc bên trong vé -->
      <rect x="22" y="10" width="76" height="48" rx="8" fill="#FFFFFF" />
      
      <!-- Ký hiệu % màu cam ở giữa thẻ trắng -->
      <text x="60" y="44" font-family="Montserrat, Arial, sans-serif" font-size="32" font-weight="900" fill="#EA580C" text-anchor="middle">%</text>
    </g>

    <!-- Các ngôi sao 4 cánh lấp lánh (sparkles) -->
    <path d="M65 65 C65 60, 65 60, 60 60 C65 60, 65 60, 65 55 C65 60, 65 60, 70 60 C65 60, 65 60, 65 65 Z" fill="#FBBF24" fill-opacity="0.9" />
    <path d="M235 40 C235 35, 235 35, 230 35 C235 35, 235 35, 235 30 C235 35, 235 35, 240 35 C235 35, 235 35, 235 40 Z" fill="#FBBF24" fill-opacity="0.85" />
    <path d="M245 95 C245 92, 245 92, 242 92 C245 92, 245 92, 245 89 C245 92, 245 92, 248 92 C245 92, 245 92, 245 95 Z" fill="#FBBF24" fill-opacity="0.75" />
  </g>
</svg>`;

// 4. BẢNG KẸP & KÍNH LÚP EMPTY STATE TỐI GIẢN (EMPTY STATE SVG)
const emptyStateSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" fill="none">
  <defs>
    <linearGradient id="emptyBoardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
    <linearGradient id="magGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>
  </defs>

  <g>
    <!-- Cụm mây kem bồng bềnh phía sau (Soft Cream Clouds) -->
    <path d="M60 145 C50 145, 45 135, 52 126 C50 115, 62 105, 74 110 C82 98, 102 98, 110 110 C120 106, 130 115, 128 126 C136 132, 132 145, 120 145 Z" fill="#FFEDD5" fill-opacity="0.5" />
    <path d="M200 150 C190 150, 185 140, 192 132 C190 122, 202 112, 214 116 C222 105, 242 105, 250 116 C260 112, 270 122, 268 132 C276 138, 272 150, 260 150 Z" fill="#FFEDD5" fill-opacity="0.5" />

    <!-- 3 Tia sáng cam tỏa ra phía trên -->
    <line x1="160" y1="20" x2="160" y2="32" stroke="#F97316" stroke-width="3" stroke-linecap="round" />
    <line x1="178" y1="25" x2="170" y2="35" stroke="#F97316" stroke-width="3" stroke-linecap="round" />
    <line x1="142" y1="25" x2="150" y2="35" stroke="#F97316" stroke-width="3" stroke-linecap="round" />

    <!-- Bảng kẹp tài liệu màu cam viền trắng -->
    <g transform="translate(100, 40) rotate(-6)">
      <!-- Lưng bảng cam bo góc -->
      <rect x="0" y="0" width="100" height="125" rx="14" fill="url(#emptyBoardGrad)" />
      <!-- Viền sáng -->
      <rect x="2" y="2" width="96" height="121" rx="12" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.6" />

      <!-- Tờ giấy trắng kẹp trên bảng -->
      <rect x="10" y="16" width="80" height="98" rx="6" fill="#FFFFFF" />

      <!-- Dòng kẻ và dấu tích trên giấy -->
      <!-- Hàng 1: Checkbox cam + Dòng kẻ -->
      <rect x="18" y="28" width="8" height="8" rx="2" fill="#FED7AA" />
      <path d="M20 32 L22 34 L25 29" stroke="#EA580C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <rect x="30" y="30" width="50" height="4" rx="2" fill="#E7E5E4" />

      <!-- Hàng 2: Checkbox cam + Dòng kẻ -->
      <rect x="18" y="44" width="8" height="8" rx="2" fill="#FED7AA" />
      <path d="M20 48 L22 50 L25 45" stroke="#EA580C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <rect x="30" y="46" width="42" height="4" rx="2" fill="#E7E5E4" />

      <!-- Hàng 3: Checkbox xám + Dòng kẻ -->
      <rect x="18" y="60" width="8" height="8" rx="2" fill="#F5F5F4" stroke="#D6D3D1" stroke-width="1" />
      <rect x="30" y="62" width="46" height="4" rx="2" fill="#E7E5E4" />

      <!-- Hàng 4: Checkbox xám + Dòng kẻ -->
      <rect x="18" y="76" width="8" height="8" rx="2" fill="#F5F5F4" stroke="#D6D3D1" stroke-width="1" />
      <rect x="30" y="78" width="38" height="4" rx="2" fill="#E7E5E4" />

      <!-- Kẹp kim loại ở đỉnh bảng -->
      <rect x="32" y="-6" width="36" height="16" rx="4" fill="#D97706" />
      <circle cx="50" cy="2" r="3" fill="#FFFFFF" />
    </g>

    <!-- Kính lúp 3D tay cầm cam viền vàng kim loại -->
    <g transform="translate(165, 90)">
      <!-- Cán kính lúp màu cam -->
      <path d="M28 28 L50 50" stroke="#EA580C" stroke-width="9" stroke-linecap="round" />
      <path d="M28 28 L50 50" stroke="#FDBA74" stroke-width="3" stroke-linecap="round" />
      
      <!-- Vành kim loại vàng của kính lúp -->
      <circle cx="15" cy="15" r="24" fill="none" stroke="url(#magGlassGrad)" stroke-width="7" />
      
      <!-- Mặt kính lúp trong suốt bóng bẩy -->
      <circle cx="15" cy="15" r="20" fill="#FFFFFF" fill-opacity="0.6" />
      <path d="M4 8 C8 4, 18 4, 24 8" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8" />
    </g>
  </g>
</svg>`;

// Lưu vào public và android
const pairs = [
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

  ['public/assets/3d/empty_state_3d_master.svg', emptyStateSvg],
  ['public/assets/3d/empty_state_3d_clean.svg', emptyStateSvg],
  ['android/app/src/main/assets/public/assets/3d/empty_state_3d_master.svg', emptyStateSvg],
  ['android/app/src/main/assets/public/assets/3d/empty_state_3d_clean.svg', emptyStateSvg],
];

pairs.forEach(([p, content]) => {
  fs.writeFileSync(p, content, 'utf8');
  console.log('Saved clean minimal SVG:', p);
});

console.log('Finished saving all clean minimalist SVGs.');
