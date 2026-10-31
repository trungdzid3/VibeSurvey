const fs = require('fs');
const path = require('path');

// 1. TẠO WALLET SVG (Master & Clean)
function generateWalletSvg(isClean = false) {
  const p = isClean ? 'WClean_' : 'WMaster_';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" fill="none">
  <defs>
    <!-- Gradient thân ví cam Sunset đa tầng cao cấp -->
    <linearGradient id="${p}sunsetBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF9E42" />
      <stop offset="35%" stop-color="#FB923C" />
      <stop offset="70%" stop-color="#F97316" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>

    <!-- Gradient bóng đổ chân ví -->
    <linearGradient id="${p}bodyShadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#EA580C" stop-opacity="0" />
      <stop offset="100%" stop-color="#9A3412" stop-opacity="0.35" />
    </linearGradient>

    <!-- Gradient thẻ ATM 1 (thẻ sau, nhô cao hơn, màu vàng kem hoàng yến) -->
    <linearGradient id="${p}cardYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>

    <!-- Gradient thẻ ATM 2 (thẻ trước, nhô thấp hơn, màu trắng ngọc cam đào) -->
    <linearGradient id="${p}cardWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="60%" stop-color="#FFF7ED" />
      <stop offset="100%" stop-color="#FED7AA" />
    </linearGradient>

    <!-- Gradient quai cài ví cam ấm -->
    <linearGradient id="${p}claspGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C" />
      <stop offset="60%" stop-color="#EA580C" />
      <stop offset="100%" stop-color="#C2410C" />
    </linearGradient>

    <!-- Gradient cúc bấm kim loại vàng kim -->
    <linearGradient id="${p}goldButtonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="50%" stop-color="#FACC15" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>
  </defs>

  <g>
    <!-- Bóng tiếp xúc mặt sàn mờ êm dịu, tương thích cả Dark & Light Mode -->
    <ellipse cx="110" cy="154" rx="74" ry="5.5" fill="#000000" fill-opacity="0.12" />

    <!-- 1. CẶP THẺ NGÂN HÀNG THÒ RA TỪ MIỆNG VÍ (CHÉO GÓC THEO ẢNH MẪU 1) -->
    <!-- Thẻ sau (Thẻ 1 - Vàng hoàng yến, nghiêng -21 độ, nhô cao) -->
    <g transform="translate(104, 48) rotate(-21) translate(-104, -48)">
      <!-- Bóng nhẹ của thẻ sau -->
      <rect x="66" y="22" width="76" height="48" rx="8" fill="#000000" fill-opacity="0.08" transform="translate(0, 2)" />
      <!-- Thân thẻ vàng -->
      <rect x="66" y="22" width="76" height="48" rx="8" fill="url(#${p}cardYellowGrad)" />
      <!-- Dải băng từ / vệt highlight trên thẻ -->
      <rect x="66" y="32" width="76" height="10" fill="#CA8A04" fill-opacity="0.25" />
      <!-- Chip vi mạch thẻ bo góc -->
      <rect x="74" y="47" width="12" height="9" rx="2" fill="#FEF08A" />
      <rect x="76" y="49" width="8" height="5" rx="1" fill="#CA8A04" fill-opacity="0.5" />
      <!-- Viền sáng viền mép thẻ -->
      <rect x="67" y="23" width="74" height="46" rx="7" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="1" fill="none" />
    </g>

    <!-- Thẻ trước (Thẻ 2 - Trắng ngọc cam sữa, nghiêng -8 độ, nhô thấp hơn) -->
    <g transform="translate(118, 56) rotate(-8) translate(-118, -56)">
      <!-- Bóng đổ nhẹ của thẻ trước -->
      <rect x="80" y="32" width="76" height="48" rx="8" fill="#000000" fill-opacity="0.09" transform="translate(0, 2)" />
      <!-- Thân thẻ trắng ngọc -->
      <rect x="80" y="32" width="76" height="48" rx="8" fill="url(#${p}cardWhiteGrad)" />
      <!-- Vệt trang trí ngang thẻ tông cam pastel -->
      <rect x="80" y="44" width="76" height="7" fill="#FDBA74" fill-opacity="0.45" />
      <rect x="80" y="54" width="45" height="4" rx="2" fill="#FB923C" fill-opacity="0.35" />
      <!-- Chip thẻ nhỏ -->
      <rect x="88" y="62" width="11" height="8" rx="2" fill="#FDE047" />
      <!-- Viền sáng viền thẻ -->
      <rect x="81" y="33" width="74" height="46" rx="7" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="1" fill="none" />
    </g>

    <!-- 2. THÂN VÍ DA 3D MÀU CAM SUNSET NẰM NGANG BO TRÒN 4 GÓC (THEO ẢNH MẪU 1) -->
    <!-- Thân chính ví: x=34, y=54, rộng 152, cao 96, bo góc tròn 22px múp míp -->
    <g>
      <!-- Lớp thân ví chính -->
      <rect x="34" y="54" width="152" height="96" rx="22" fill="url(#${p}sunsetBody)" />

      <!-- Lớp bóng đổ khối 3D claymorphism ở cạnh dưới thân ví -->
      <rect x="34" y="54" width="152" height="96" rx="22" fill="url(#${p}bodyShadow)" />

      <!-- Đường phản quang sáng mềm ở mép trên và cạnh trái thân ví -->
      <path d="M 56 56 L 164 56 C 176 56, 184 64, 184 76" 
            stroke="#FFFFFF" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            stroke-opacity="0.35" 
            fill="none" />

      <!-- Highlight cạnh trái mềm mại -->
      <path d="M 36 76 C 36 64, 44 56, 56 56" 
            stroke="#FFFFFF" 
            stroke-width="2.5" 
            stroke-linecap="round" 
            stroke-opacity="0.45" 
            fill="none" />

      <!-- Đường may khâu thủ công trang trí quanh thân ví (Stitching line) -->
      <rect x="40" y="60" width="140" height="84" rx="17" 
            stroke="#FED7AA" 
            stroke-width="1.2" 
            stroke-dasharray="3.5 2.5" 
            stroke-linecap="round" 
            stroke-opacity="0.6" 
            fill="none" />
    </g>

    <!-- 3. QUAI CÀI VÍ (CLASP / STRAP TAB) HÌNH VIÊN THUỐC BÊN PHẢI (THEO ĐÚNG ẢNH MẪU 1) -->
    <g>
      <!-- Khe hở / đường rãnh trắng cách ly bo tròn bao quanh quai cài -->
      <rect x="141" y="82" width="53" height="42" rx="21" fill="#FFFFFF" />
      <rect x="141" y="82" width="53" height="42" rx="21" fill="#000000" fill-opacity="0.04" />

      <!-- Thân quai cài bo tròn hình viên thuốc màu cam -->
      <rect x="144" y="85" width="47" height="36" rx="18" fill="url(#${p}claspGrad)" />

      <!-- Vệt highlight trên mép quai cài -->
      <path d="M 160 87 L 176 87 C 184 87, 189 91, 189 97" 
            stroke="#FFFFFF" 
            stroke-width="1.5" 
            stroke-linecap="round" 
            stroke-opacity="0.4" 
            fill="none" />

      <!-- Cúc bấm kim loại tròn ở giữa quai cài -->
      <!-- Vòng ngoài: trắng ngọc sáng bóng -->
      <circle cx="165" cy="103" r="8.5" fill="#FFFFFF" />
      <circle cx="165" cy="103" r="8.5" fill="#000000" fill-opacity="0.08" />
      
      <!-- Vòng viền vàng kim loại -->
      <circle cx="165" cy="103" r="7" fill="url(#${p}goldButtonGrad)" />

      <!-- Lõi cúc tròn vàng đậm dập nổi -->
      <circle cx="165" cy="103" r="4.8" fill="#D97706" />
      <circle cx="165" cy="103" r="4.8" fill="#FDE047" fill-opacity="0.8" />

      <!-- Điểm bóng sáng 3D trên cúc bấm -->
      <circle cx="163.2" cy="101.2" r="1.5" fill="#FFFFFF" />
    </g>

    <!-- 4. CÁC NGÔI SAO VÀNG 4 CÁNH LẤP LÁNH (SPARKLES) ĐỒNG BỘ STYLE APP -->
    <!-- Ngôi sao phía trên bên trái -->
    <path d="M 28 36
             C 28 30, 28 30, 22 30
             C 28 30, 28 30, 28 24
             C 28 30, 28 30, 34 30
             C 28 30, 28 30, 28 36 Z" 
          fill="#FDE047" fill-opacity="0.85" />

    <!-- Ngôi sao nhỏ phía trên bên phải -->
    <path d="M 198 32
             C 198 27, 198 27, 193 27
             C 198 27, 198 27, 198 22
             C 198 27, 198 27, 203 27
             C 198 27, 198 27, 198 32 Z" 
          fill="#FDE047" fill-opacity="0.75" />

    <!-- Ngôi sao nhỏ phía dưới bên phải -->
    <path d="M 204 128
             C 204 124, 204 124, 200 124
             C 204 124, 204 124, 204 120
             C 204 124, 204 124, 208 124
             C 204 124, 204 124, 204 128 Z" 
          fill="#FDE047" fill-opacity="0.65" />
  </g>
</svg>
`;
}

// 2. TẠO COINS & COUPON SVG (Master & Clean)
function generateCoinsCouponSvg(isClean = false) {
  const p = isClean ? 'CCClean_' : 'CCMaster_';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" fill="none">
  <defs>
    <!-- Gradient vàng kim mặt đồng xu 3D -->
    <linearGradient id="${p}coinTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="45%" stop-color="#FACC15" />
      <stop offset="100%" stop-color="#EAB308" />
    </linearGradient>

    <!-- Gradient thành dày đồng xu 3D -->
    <linearGradient id="${p}coinSide" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FACC15" />
      <stop offset="50%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#CA8A04" />
    </linearGradient>

    <!-- Gradient tấm vé Coupon: mảng trái cam đào tươi -->
    <linearGradient id="${p}couponLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFEDD5" />
      <stop offset="60%" stop-color="#FED7AA" />
      <stop offset="100%" stop-color="#FDBA74" />
    </linearGradient>

    <!-- Gradient tấm vé Coupon: mảng phải cam hồng pastel ngọt ngào -->
    <linearGradient id="${p}couponRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF7ED" />
      <stop offset="50%" stop-color="#FFEDD5" />
      <stop offset="100%" stop-color="#FED7AA" />
    </linearGradient>

    <!-- Gradient ký hiệu % cam rực rỡ nổi bật -->
    <linearGradient id="${p}percentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8038" />
      <stop offset="50%" stop-color="#F97316" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
  </defs>

  <g>
    <!-- Bóng tiếp xúc mặt sàn mờ nhẹ, hoạt động hoàn hảo trên mọi nền -->
    <ellipse cx="112" cy="154" rx="82" ry="5.5" fill="#000000" fill-opacity="0.12" />

    <!-- 1. ĐỒNG XU PHÍA SAU BÊN TRÁI (Nghiêng -35 độ lấp ló sau vé) -->
    <g transform="translate(48, 92) rotate(-35) translate(-48, -92)">
      <!-- Thành dày xu sau trái -->
      <path d="M 25 92 C 25 101, 71 101, 71 92 L 71 101 C 71 110, 25 110, 25 101 Z" 
            fill="url(#${p}coinSide)" 
            stroke="#B45309" 
            stroke-width="1.8" />
      <!-- Mặt trên xu sau trái -->
      <ellipse cx="48" cy="92" rx="23" ry="9" 
               fill="url(#${p}coinTop)" 
               stroke="#B45309" 
               stroke-width="1.8" />
      <!-- Viền gờ dập nổi trong xu -->
      <ellipse cx="48" cy="92" rx="17" ry="6.5" 
               stroke="#FEF08A" 
               stroke-width="1.2" 
               fill="none" />
      <!-- Ký hiệu tiền tệ chữ Y / vạch dập nổi ở giữa -->
      <path d="M 44 89 L 48 92 L 52 89 M 48 92 L 48 96 M 45 93.5 L 51 93.5" 
            stroke="#B45309" 
            stroke-width="1.2" 
            stroke-linecap="round" 
            fill="none" />
    </g>

    <!-- 2. ĐỒNG XU PHÍA SAU BÊN PHẢI (Nghiêng -18 độ thò lên trên góc phải vé) -->
    <g transform="translate(162, 48) rotate(-18) translate(-162, -48)">
      <!-- Thành dày xu sau phải -->
      <path d="M 139 48 C 139 57, 185 57, 185 48 L 185 57 C 185 66, 139 66, 139 57 Z" 
            fill="url(#${p}coinSide)" 
            stroke="#B45309" 
            stroke-width="1.8" />
      <!-- Mặt trên xu sau phải -->
      <ellipse cx="162" cy="48" rx="23" ry="9" 
               fill="url(#${p}coinTop)" 
               stroke="#B45309" 
               stroke-width="1.8" />
      <!-- Vành dập nổi trong xu -->
      <ellipse cx="162" cy="48" rx="17" ry="6.5" 
               stroke="#FEF08A" 
               stroke-width="1.2" 
               fill="none" />
    </g>

    <!-- 3. TẤM VÉ COUPON Ở TRUNG TÂM (HÌNH CHỮ NHẬT CÓ VẾT KHUYẾT BÁN NGUYỆT Ở CẠNH TRÊN) -->
    <!-- Đáy vé tại y=148, đỉnh tại y=56, rộng 124, cao 92 -->
    <g>
      <!-- Bóng nhẹ của tấm vé đổ xuống nền -->
      <path d="M 72 58 L 96 58 A 10 10 0 0 1 116 58 L 172 58 A 12 12 0 0 1 184 70 L 184 138 A 12 12 0 0 1 172 150 L 72 150 A 12 12 0 0 1 60 138 L 60 70 A 12 12 0 0 1 72 58 Z" 
            fill="#000000" 
            fill-opacity="0.08" 
            transform="translate(1.5, 2)" />

      <!-- ClipPath để cắt 2 mảng màu của tấm vé -->
      <clipPath id="${p}couponClip">
        <path d="M 72 56 L 96 56 A 10 10 0 0 1 116 56 L 172 56 A 12 12 0 0 1 184 68 L 184 136 A 12 12 0 0 1 172 148 L 72 148 A 12 12 0 0 1 60 136 L 60 68 A 12 12 0 0 1 72 56 Z" />
      </clipPath>

      <g clip-path="url(#${p}couponClip)">
        <!-- Mảng màu bên trái (chiếm ~35%) -->
        <rect x="58" y="54" width="48" height="96" fill="url(#${p}couponLeft)" />
        <!-- Mảng màu bên phải (chiếm ~65%) -->
        <rect x="106" y="54" width="80" height="96" fill="url(#${p}couponRight)" />
        <!-- Đường phân tách nhạt giữa 2 mảng -->
        <line x1="106" y1="66" x2="106" y2="148" stroke="#FDBA74" stroke-width="1.5" stroke-dasharray="3 3" />
      </g>

      <!-- Đường viền bao quanh toàn bộ tấm vé (Border sắc sảo theo phong cách ảnh mẫu 2) -->
      <path d="M 72 56 L 96 56 A 10 10 0 0 1 116 56 L 172 56 A 12 12 0 0 1 184 68 L 184 136 A 12 12 0 0 1 172 148 L 72 148 A 12 12 0 0 1 60 136 L 60 68 A 12 12 0 0 1 72 56 Z" 
            stroke="#EA580C" 
            stroke-width="2.2" 
            fill="none" />

      <!-- KÝ HIỆU % TO ĐẬM RÕ NÉT Ở MẢNG BÊN PHẢI (VECTOR PURE) -->
      <g transform="translate(144, 102)">
        <!-- Vòng tròn trên của dấu % -->
        <circle cx="-13" cy="-14" r="8.5" fill="none" stroke="url(#${p}percentGrad)" stroke-width="4.2" stroke-linecap="round" />
        <circle cx="-13" cy="-14" r="8.5" fill="none" stroke="#EA580C" stroke-width="0.8" opacity="0.6" />

        <!-- Vòng tròn dưới của dấu % -->
        <circle cx="12" cy="14" r="8.5" fill="none" stroke="url(#${p}percentGrad)" stroke-width="4.2" stroke-linecap="round" />
        <circle cx="12" cy="14" r="8.5" fill="none" stroke="#EA580C" stroke-width="0.8" opacity="0.6" />

        <!-- Thanh chéo của dấu % bo tròn 2 đầu -->
        <line x1="16" y1="-22" x2="-16" y2="22" 
              stroke="url(#${p}percentGrad)" 
              stroke-width="5" 
              stroke-linecap="round" />
        <line x1="16" y1="-22" x2="-16" y2="22" 
              stroke="#EA580C" 
              stroke-width="1" 
              stroke-linecap="round" 
              opacity="0.4" />
      </g>
    </g>

    <!-- 4. CHỒNG 4 ĐỒNG XU VÀNG KIM XẾP TẦNG PHÍA TRƯỚC BÊN TRÁI -->
    <!-- Xu 1 (đáy chồng xu, chân tiếp đất y=152) -->
    <g>
      <!-- Thành dày xu 1 -->
      <path d="M 48 138 C 48 147, 96 147, 96 138 L 96 148 C 96 157, 48 157, 48 148 Z" 
            fill="url(#${p}coinSide)" 
            stroke="#B45309" 
            stroke-width="1.8" />
      <!-- Vạch khía hoạt họa trên thành xu 1 -->
      <line x1="72" y1="144" x2="78" y2="144" stroke="#B45309" stroke-width="1.2" stroke-linecap="round" />
      <!-- Mặt trên xu 1 -->
      <ellipse cx="72" cy="138" rx="24" ry="9" 
               fill="url(#${p}coinTop)" 
               stroke="#B45309" 
               stroke-width="1.8" />
    </g>

    <!-- Xu 2 (ở giữa dưới) -->
    <g>
      <!-- Thành dày xu 2 -->
      <path d="M 48 123 C 48 132, 96 132, 96 123 L 96 133 C 96 142, 48 142, 48 133 Z" 
            fill="url(#${p}coinSide)" 
            stroke="#B45309" 
            stroke-width="1.8" />
      <!-- Vạch khía hoạt họa trên thành xu 2 -->
      <line x1="68" y1="129" x2="74" y2="129" stroke="#B45309" stroke-width="1.2" stroke-linecap="round" />
      <!-- Mặt trên xu 2 -->
      <ellipse cx="72" cy="123" rx="24" ry="9" 
               fill="url(#${p}coinTop)" 
               stroke="#B45309" 
               stroke-width="1.8" />
    </g>

    <!-- Xu 3 (ở giữa trên, so le nhẹ 2px sang trái) -->
    <g>
      <!-- Thành dày xu 3 -->
      <path d="M 46 107 C 46 116, 94 116, 94 107 L 94 117 C 94 126, 46 126, 46 117 Z" 
            fill="url(#${p}coinSide)" 
            stroke="#B45309" 
            stroke-width="1.8" />
      <!-- Vạch khía hoạt họa trên thành xu 3 -->
      <line x1="66" y1="113" x2="72" y2="113" stroke="#B45309" stroke-width="1.2" stroke-linecap="round" />
      <!-- Mặt trên xu 3 -->
      <ellipse cx="70" cy="107" rx="24" ry="9" 
               fill="url(#${p}coinTop)" 
               stroke="#B45309" 
               stroke-width="1.8" />
    </g>

    <!-- Xu 4 (trên cùng của chồng xu) -->
    <g>
      <!-- Thành dày xu 4 -->
      <path d="M 47 91 C 47 100, 95 100, 95 91 L 95 101 C 95 110, 47 110, 47 101 Z" 
            fill="url(#${p}coinSide)" 
            stroke="#B45309" 
            stroke-width="1.8" />
      <!-- Vạch khía trên thành xu 4 -->
      <line x1="69" y1="97" x2="75" y2="97" stroke="#B45309" stroke-width="1.2" stroke-linecap="round" />
      <!-- Mặt trên xu 4 -->
      <ellipse cx="71" cy="91" rx="24" ry="9" 
               fill="url(#${p}coinTop)" 
               stroke="#B45309" 
               stroke-width="1.8" />
      <!-- Vành gờ dập nổi bên trong -->
      <ellipse cx="71" cy="91" rx="18" ry="6.5" 
               stroke="#FEF08A" 
               stroke-width="1.4" 
               fill="none" />
      <!-- Ký hiệu đồng tiền dập nổi ở giữa mặt xu trên cùng -->
      <path d="M 67 88 L 71 91 L 75 88 M 71 91 L 71 95 M 68 92.5 L 74 92.5" 
            stroke="#B45309" 
            stroke-width="1.4" 
            stroke-linecap="round" 
            fill="none" />
    </g>

    <!-- 5. ĐỒNG XU NẰM BẸT TRÊN SÀN PHÍA TRƯỚC BÊN PHẢI -->
    <g>
      <!-- Bóng tiếp xúc riêng của đồng xu sàn -->
      <ellipse cx="162" cy="151" rx="27" ry="4" fill="#000000" fill-opacity="0.1" />
      <!-- Thành dày xu nằm bẹt sàn (chân tiếp đất y=149) -->
      <path d="M 136 141 C 136 149, 188 149, 188 141 L 188 148 C 188 156, 136 156, 136 148 Z" 
            fill="url(#${p}coinSide)" 
            stroke="#B45309" 
            stroke-width="1.8" />
      <!-- Vạch khía hoạt họa -->
      <line x1="168" y1="147" x2="175" y2="147" stroke="#B45309" stroke-width="1.2" stroke-linecap="round" />
      <!-- Mặt trên xu sàn -->
      <ellipse cx="162" cy="141" rx="26" ry="8.5" 
               fill="url(#${p}coinTop)" 
               stroke="#B45309" 
               stroke-width="1.8" />
      <!-- Vành gờ trong xu sàn -->
      <ellipse cx="162" cy="141" rx="20" ry="6.2" 
               stroke="#FEF08A" 
               stroke-width="1.2" 
               fill="none" />
    </g>

    <!-- 6. CÁC NGÔI SAO VÀNG 4 CÁNH LẤP LÁNH (SPARKLES) ĐỒNG BỘ -->
    <!-- Ngôi sao nhỏ phía trên bên trái -->
    <path d="M 24 38
             C 24 33, 24 33, 19 33
             C 24 33, 24 33, 24 28
             C 24 33, 24 33, 29 33
             C 24 33, 24 33, 24 38 Z" 
          fill="#FDE047" fill-opacity="0.85" />

    <!-- Ngôi sao nhỏ phía trên bên phải -->
    <path d="M 200 36
             C 200 31, 200 31, 195 31
             C 200 31, 200 31, 200 26
             C 200 31, 200 31, 205 31
             C 200 31, 200 31, 200 36 Z" 
          fill="#FDE047" fill-opacity="0.75" />
  </g>
</svg>
`;
}

// Đường dẫn các thư mục đích
const targetDirs = [
  path.join(__dirname, 'public', 'assets', '3d'),
  path.join(__dirname, 'android', 'app', 'src', 'main', 'assets', 'public', 'assets', '3d')
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. wallet_3d_master.svg
  fs.writeFileSync(path.join(dir, 'wallet_3d_master.svg'), generateWalletSvg(false), 'utf8');
  console.log('Wrote wallet_3d_master.svg to ' + dir);

  // 2. wallet_3d_clean.svg
  fs.writeFileSync(path.join(dir, 'wallet_3d_clean.svg'), generateWalletSvg(true), 'utf8');
  console.log('Wrote wallet_3d_clean.svg to ' + dir);

  // 3. coins_coupon_3d_master.svg
  fs.writeFileSync(path.join(dir, 'coins_coupon_3d_master.svg'), generateCoinsCouponSvg(false), 'utf8');
  console.log('Wrote coins_coupon_3d_master.svg to ' + dir);

  // 4. coins_coupon_3d_clean.svg
  fs.writeFileSync(path.join(dir, 'coins_coupon_3d_clean.svg'), generateCoinsCouponSvg(true), 'utf8');
  console.log('Wrote coins_coupon_3d_clean.svg to ' + dir);
}

console.log('Done generating all 4 3D SVG assets successfully!');
