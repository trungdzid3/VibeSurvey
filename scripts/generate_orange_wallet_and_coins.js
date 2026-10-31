const fs = require('fs');
const path = require('path');

// 1. Tạo SVG cho Ví (wallet_3d_master.svg & wallet_3d_clean.svg)
// Theo sát mẫu ảnh 1: Thân ví bo tròn mềm mại, 2 thẻ ATM thò ra trên đỉnh chéo góc, quai cài nắp bấm có viền cách ly trắng và cúc tròn bên phải.
function generateWalletSVG(isClean = false) {
  const idSuffix = isClean ? 'Clean' : 'Master';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" fill="none">
  <defs>
    <!-- Gradient thân ví cam Sunset ấm áp -->
    <linearGradient id="walletSunset${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C" />
      <stop offset="50%" stop-color="#EA580C" />
      <stop offset="100%" stop-color="#C2410C" />
    </linearGradient>

    <!-- Gradient thẻ 1 (sau): kem vàng ấm -->
    <linearGradient id="cardBack${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="60%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>

    <!-- Gradient thẻ 2 (trước): cam đào sáng -->
    <linearGradient id="cardFront${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFEDD5" />
      <stop offset="50%" stop-color="#FED7AA" />
      <stop offset="100%" stop-color="#FB923C" />
    </linearGradient>

    <!-- Gradient quai cài ví -->
    <linearGradient id="claspGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F97316" />
      <stop offset="100%" stop-color="#C2410C" />
    </linearGradient>

    <!-- Gradient bóng mềm thân ví -->
    <linearGradient id="walletInnerShadow${idSuffix}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25" />
      <stop offset="40%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.22" />
    </linearGradient>
  </defs>

  <g>
    <!-- Bóng tiếp đất nhẹ nhàng -->
    <ellipse cx="112" cy="151" rx="78" ry="6.5" fill="#000000" fill-opacity="0.14" />

    <!-- 1. THẺ TÍN DỤNG PHÍA SAU (THÒ RA NGHIÊNG GÓC -20 ĐỘ) -->
    <g transform="translate(92, 48) rotate(-22)">
      <rect x="-42" y="-28" width="84" height="52" rx="8" fill="url(#cardBack${idSuffix})" stroke="#D97706" stroke-width="1.5" />
      <!-- Dải từ / chi tiết chip thẻ -->
      <rect x="-36" y="-18" width="72" height="7" rx="2" fill="#CA8A04" fill-opacity="0.4" />
      <circle cx="28" cy="12" r="6" fill="#FEF08A" fill-opacity="0.6" />
    </g>

    <!-- 2. THẺ TÍN DỤNG PHÍA TRƯỚC (THÒ RA NGHIÊNG GÓC -8 ĐỘ) -->
    <g transform="translate(122, 54) rotate(-9)">
      <rect x="-44" y="-26" width="88" height="52" rx="8" fill="url(#cardFront${idSuffix})" stroke="#EA580C" stroke-width="1.5" />
      <!-- Vạch trang trí thẻ -->
      <line x1="-36" y1="-14" x2="16" y2="-14" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" opacity="0.3" />
      <circle cx="28" cy="12" r="5" fill="#F97316" fill-opacity="0.4" />
      <circle cx="21" cy="12" r="5" fill="#FBBF24" fill-opacity="0.4" />
    </g>

    <!-- 3. THÂN VÍ CHÍNH (BO TRÒN 4 GÓC MỀM MẠI, NẰM NGANG) -->
    <rect x="34" y="52" width="154" height="96" rx="22" fill="url(#walletSunset${idSuffix})" />
    <rect x="34" y="52" width="154" height="96" rx="22" fill="url(#walletInnerShadow${idSuffix})" />
    <rect x="34" y="52" width="154" height="96" rx="22" stroke="#9A3412" stroke-width="2" />

    <!-- Vệt sáng phản quang mép trên thân ví -->
    <path d="M 52 56 L 170 56" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.4" />

    <!-- Đường khâu thủ công tinh tế chạy viền ví -->
    <rect x="40" y="58" width="142" height="84" rx="16" fill="none" stroke="#FED7AA" stroke-width="1.2" stroke-dasharray="3.5 3" opacity="0.6" />

    <!-- 4. QUAI CÀI VÍ BÊN PHẢI (CLASP TAB) VỚI ĐƯỜNG RÃNH TRẮNG CÁCH LY -->
    <!-- Lớp viền rãnh trắng bao bọc quai cài tạo khoảng hở sắc nét chuẩn mẫu -->
    <path d="M 148 79
             L 174 79
             A 20 20 0 0 1 174 119
             L 148 119
             Z" 
          fill="#FFFFFF" 
          stroke="#9A3412" 
          stroke-width="2" />

    <!-- Thân quai cài màu cam gradient dập nổi -->
    <path d="M 151 83
             L 172 83
             A 16 16 0 0 1 172 115
             L 151 115
             Z" 
          fill="url(#claspGrad${idSuffix})" />

    <!-- Cúc bấm tròn trắng kim loại ở trung tâm quai cài -->
    <circle cx="166" cy="99" r="7.5" fill="#FFFFFF" stroke="#9A3412" stroke-width="1.2" />
    <circle cx="166" cy="99" r="4.2" fill="#FED7AA" />
    <circle cx="165" cy="98" r="1.5" fill="#FFFFFF" opacity="0.9" />

    <!-- 5. NGÔI SAO LẤP LÁNH TINH TẾ -->
    <path d="M 22 42 C 22 37, 22 37, 17 37 C 22 37, 22 37, 22 32 C 22 37, 22 37, 27 37 C 22 37, 22 37, 22 42 Z" fill="#FDE047" fill-opacity="0.9" />
    <path d="M 204 36 C 204 32, 204 32, 200 32 C 204 32, 204 32, 204 28 C 204 32, 204 32, 208 32 C 204 32, 204 32, 204 36 Z" fill="#FDE047" fill-opacity="0.8" />
  </g>
</svg>`;
}

// 2. Tạo SVG cho Xu & Voucher (coins_coupon_3d_master.svg & coins_coupon_3d_clean.svg)
// Theo sát mẫu ảnh 2:
// - Vé coupon có khuyết bán nguyệt trên đỉnh, ký hiệu % màu cam đậm
// - Chồng 4 đồng xu hình trụ bo tròn phía trước bên trái
// - 1 đồng xu nghiêng đứng phía sau bên trái
// - 1 đồng xu nghiêng đứng phía sau bên phải
// - 1 đồng xu nằm bẹt phía trước bên phải
// - Toàn bộ đổi sang tông màu cam Sunset & vàng kim
function generateCoinsCouponSVG(isClean = false) {
  const idSuffix = isClean ? 'Clean' : 'Master';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" fill="none">
  <defs>
    <!-- Gradient mặt đồng xu vàng kim -->
    <linearGradient id="coinFaceGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="45%" stop-color="#FACC15" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>

    <!-- Gradient thành hình trụ đồng xu vàng kim -->
    <linearGradient id="coinRimGrad${idSuffix}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>

    <!-- Gradient vé coupon phần trái (cam đào sáng) -->
    <linearGradient id="couponLeftGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FED7AA" />
      <stop offset="100%" stop-color="#FDBA74" />
    </linearGradient>

    <!-- Gradient vé coupon phần phải (cam san hô) -->
    <linearGradient id="couponRightGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C" />
      <stop offset="100%" stop-color="#F97316" />
    </linearGradient>
  </defs>

  <g>
    <!-- Bóng tiếp đất cho toàn bộ khối -->
    <ellipse cx="118" cy="151" rx="82" ry="6.5" fill="#000000" fill-opacity="0.14" />

    <!-- 1. ĐỒNG XU NGHIÊNG ĐỨNG PHÍA SAU BÊN TRÁI -->
    <g transform="translate(42, 92) rotate(-26)">
      <!-- Thành cạnh đồng xu -->
      <path d="M -18 0 C -18 16, 18 16, 18 0 L 18 8 C 18 24, -18 24, -18 8 Z" fill="url(#coinRimGrad${idSuffix})" stroke="#9A3412" stroke-width="1.5" />
      <!-- Mặt đồng xu tròn nghiêng -->
      <ellipse cx="0" cy="0" rx="18" ry="24" fill="url(#coinFaceGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <ellipse cx="0" cy="0" rx="13" ry="18" fill="none" stroke="#D97706" stroke-width="1.2" opacity="0.6" />
      <!-- Dấu sao / ký hiệu xu -->
      <path d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z" fill="#D97706" />
    </g>

    <!-- 2. ĐỒNG XU NGHIÊNG ĐỨNG PHÍA SAU BÊN PHẢI -->
    <g transform="translate(176, 68) rotate(32)">
      <!-- Thành cạnh đồng xu -->
      <path d="M -20 0 C -20 18, 20 18, 20 0 L 20 8 C 20 26, -20 26, -20 8 Z" fill="url(#coinRimGrad${idSuffix})" stroke="#9A3412" stroke-width="1.5" />
      <!-- Mặt đồng xu tròn nghiêng -->
      <ellipse cx="0" cy="0" rx="20" ry="26" fill="url(#coinFaceGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <ellipse cx="0" cy="0" rx="14" ry="19" fill="none" stroke="#D97706" stroke-width="1.2" opacity="0.6" />
    </g>

    <!-- 3. TẤM VÉ COUPON % Ở TRUNG TÂM -->
    <!-- Vé chữ nhật bo góc với vết khuyết bán nguyệt trên đỉnh -->
    <g>
      <!-- Toàn bộ nền vé -->
      <path d="M 52 64
               A 14 14 0 0 1 66 50
               L 98 50
               A 14 14 0 0 0 126 50
               L 174 50
               A 14 14 0 0 1 188 64
               L 188 132
               A 14 14 0 0 1 174 146
               L 66 146
               A 14 14 0 0 1 52 132
               Z" 
            fill="url(#couponRightGrad${idSuffix})" 
            stroke="#9A3412" 
            stroke-width="2" />

      <!-- Phần bên trái vé (màu cam đào sáng) -->
      <path d="M 52 64
               A 14 14 0 0 1 66 50
               L 98 50
               A 14 14 0 0 0 112 56
               L 112 146
               L 66 146
               A 14 14 0 0 1 52 132
               Z" 
            fill="url(#couponLeftGrad${idSuffix})" 
            stroke="#9A3412" 
            stroke-width="2" />

      <!-- Vết khuyết bán nguyệt trên mép đỉnh vé -->
      <path d="M 98 50 A 14 14 0 0 0 126 50" fill="none" stroke="#9A3412" stroke-width="2" />

      <!-- KÝ HIỆU PHẦN TRĂM BOLD TO NỔI BẬT Ở NỬA PHẢI VÉ -->
      <!-- Vòng tròn trên của dấu % -->
      <circle cx="140" cy="80" r="7.5" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" />
      <!-- Đường chéo dấu % -->
      <line x1="164" y1="74" x2="134" y2="124" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" />
      <!-- Vòng tròn dưới của dấu % -->
      <circle cx="158" cy="118" r="7.5" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" />

      <!-- Lớp phủ màu cam đậm bên trong viền trắng để tạo độ tương phản cao -->
      <circle cx="140" cy="80" r="7.5" fill="none" stroke="#7C2D12" stroke-width="2" />
      <line x1="164" y1="74" x2="134" y2="124" stroke="#7C2D12" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="158" cy="118" r="7.5" fill="none" stroke="#7C2D12" stroke-width="2" />
    </g>

    <!-- 4. CHỒNG 4 ĐỒNG XU HÌNH TRỤ PHÍA TRƯỚC BÊN TRÁI -->
    <!-- Đồng xu 1 (dưới cùng, cx=74, cy=138, chạm sàn y=150) -->
    <g>
      <path d="M 46 138 C 46 148, 102 148, 102 138 L 102 147 C 102 157, 46 157, 46 147 Z" fill="url(#coinRimGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <ellipse cx="74" cy="138" rx="28" ry="10" fill="url(#coinFaceGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
    </g>

    <!-- Đồng xu 2 (cx=74, cy=124) -->
    <g>
      <path d="M 46 124 C 46 134, 102 134, 102 124 L 102 133 C 102 143, 46 143, 46 133 Z" fill="url(#coinRimGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <ellipse cx="74" cy="124" rx="28" ry="10" fill="url(#coinFaceGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
    </g>

    <!-- Đồng xu 3 (cx=73, cy=110) -->
    <g>
      <path d="M 45 110 C 45 120, 101 120, 101 110 L 101 119 C 101 129, 45 129, 45 119 Z" fill="url(#coinRimGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <ellipse cx="73" cy="110" rx="28" ry="10" fill="url(#coinFaceGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
    </g>

    <!-- Đồng xu 4 (trên cùng, cx=74, cy=96) -->
    <g>
      <path d="M 46 96 C 46 106, 102 106, 102 96 L 102 105 C 102 115, 46 115, 46 105 Z" fill="url(#coinRimGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <ellipse cx="74" cy="96" rx="28" ry="10" fill="url(#coinFaceGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <!-- Vòng viền dập nổi bên trong đồng xu trên cùng -->
      <ellipse cx="74" cy="96" rx="22" ry="7" fill="none" stroke="#D97706" stroke-width="1.2" opacity="0.75" />
      <!-- Ký hiệu ngôi sao / hoa thị ở giữa -->
      <path d="M 74 91 L 76 94 L 81 96 L 76 98 L 74 101 L 72 98 L 67 96 L 72 94 Z" fill="#B45309" />
    </g>

    <!-- 5. ĐỒNG XU NẰM BẸT PHÍA TRƯỚC BÊN PHẢI -->
    <g>
      <!-- Thành đồng xu nằm bẹt (cx=172, cy=140) -->
      <path d="M 144 140 C 144 149, 198 149, 198 140 L 198 148 C 198 157, 144 157, 144 148 Z" fill="url(#coinRimGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <!-- Mặt trên đồng xu nằm bẹt -->
      <ellipse cx="171" cy="140" rx="27" ry="9" fill="url(#coinFaceGrad${idSuffix})" stroke="#9A3412" stroke-width="1.8" />
      <ellipse cx="171" cy="140" rx="20" ry="6" fill="none" stroke="#D97706" stroke-width="1.2" opacity="0.7" />
    </g>

    <!-- 6. NGÔI SAO LẤP LÁNH TINH TẾ -->
    <path d="M 204 46 C 204 42, 204 42, 200 42 C 204 42, 204 42, 204 38 C 204 42, 204 42, 208 42 C 204 42, 204 42, 204 46 Z" fill="#FDE047" fill-opacity="0.9" />
  </g>
</svg>`;
}

// Ghi file cho web và android
const webDir = path.join(__dirname, '..', 'public', 'assets', '3d');
const androidDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'assets', '3d');

[webDir, androidDir].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.writeFileSync(path.join(dir, 'wallet_3d_master.svg'), generateWalletSVG(false), 'utf8');
    fs.writeFileSync(path.join(dir, 'wallet_3d_clean.svg'), generateWalletSVG(true), 'utf8');
    fs.writeFileSync(path.join(dir, 'coins_coupon_3d_master.svg'), generateCoinsCouponSVG(false), 'utf8');
    fs.writeFileSync(path.join(dir, 'coins_coupon_3d_clean.svg'), generateCoinsCouponSVG(true), 'utf8');
    console.log('Saved SVGs to:', dir);
  }
});
console.log('Done generating orange wallet & coins coupon SVGs!');
