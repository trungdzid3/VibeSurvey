const fs = require('fs');

// CỤM 2 HỘP QUÀ TỐI GIẢN (CÁI TO CÁI BÉ) BÁM GÓC PHẢI DƯỚI
const doubleGiftBoxesSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160" fill="none">
  <g>
    <!-- HỘP QUÀ TO (BÊN PHẢI) -->
    <g transform="translate(90, 35)">
      <!-- Thân hộp quà to -->
      <rect x="10" y="45" width="85" height="75" rx="12" fill="#FED7AA" fill-opacity="0.85" />
      <rect x="10" y="45" width="85" height="8" fill="#FDBA74" fill-opacity="0.35" />
      
      <!-- Dải ruy băng dọc thân hộp to -->
      <rect x="42" y="45" width="20" height="75" fill="#FFFFFF" fill-opacity="0.85" />
      
      <!-- Nắp hộp quà to -->
      <rect x="2" y="24" width="100" height="24" rx="8" fill="#FDBA74" fill-opacity="0.9" />
      <rect x="42" y="24" width="20" height="24" fill="#FFFFFF" fill-opacity="0.95" />
      
      <!-- Nơ thắt 2 cánh tròn nắp hộp to -->
      <path d="M46 24 C34 5, 12 7, 20 20 C27 28, 40 25, 46 24 Z" fill="#FDBA74" fill-opacity="0.95" />
      <path d="M44 22 C36 10, 20 12, 26 19 C31 24, 40 22, 44 22 Z" fill="#FED7AA" />
      
      <path d="M58 24 C70 5, 92 7, 84 20 C77 28, 64 25, 58 24 Z" fill="#FDBA74" fill-opacity="0.95" />
      <path d="M60 22 C68 10, 84 12, 78 19 C73 24, 64 22, 60 22 Z" fill="#FED7AA" />
      
      <!-- Nút thắt nơ tròn trung tâm -->
      <circle cx="52" cy="24" r="7" fill="#FFFFFF" />
      <circle cx="52" cy="24" r="5" fill="#FB923C" />
    </g>

    <!-- HỘP QUÀ BÉ (BÊN TRÁI, HƠI NGHIÊNG NHẸ) -->
    <g transform="translate(15, 65) rotate(-6)">
      <!-- Thân hộp quà bé -->
      <rect x="8" y="32" width="60" height="52" rx="9" fill="#FED7AA" fill-opacity="0.9" />
      <rect x="8" y="32" width="60" height="6" fill="#FDBA74" fill-opacity="0.4" />
      
      <!-- Dải ruy băng dọc thân hộp bé -->
      <rect x="31" y="32" width="14" height="52" fill="#FFFFFF" fill-opacity="0.9" />
      
      <!-- Nắp hộp quà bé -->
      <rect x="2" y="16" width="72" height="18" rx="6" fill="#FDBA74" fill-opacity="0.95" />
      <rect x="31" y="16" width="14" height="18" fill="#FFFFFF" fill-opacity="0.95" />
      
      <!-- Nơ thắt nhỏ nhắn -->
      <path d="M34 16 C25 2, 8 4, 14 13 C19 19, 29 17, 34 16 Z" fill="#FDBA74" />
      <path d="M42 16 C51 2, 68 4, 62 13 C57 19, 47 17, 42 16 Z" fill="#FDBA74" />
      
      <!-- Nút thắt tròn nơ bé -->
      <circle cx="38" cy="16" r="5" fill="#FFFFFF" />
      <circle cx="38" cy="16" r="3.5" fill="#FB923C" />
    </g>

    <!-- Các ngôi sao nhỏ lấp lánh nhẹ nhàng -->
    <path d="M110 25 C110 20, 110 20, 105 20 C110 20, 110 20, 110 15 C110 20, 110 20, 115 20 C110 20, 110 20, 110 25 Z" fill="#FBBF24" fill-opacity="0.75" />
    <path d="M15 45 C15 41, 15 41, 11 41 C15 41, 15 41, 15 37 C15 41, 15 41, 19 41 C15 41, 15 41, 15 45 Z" fill="#FBBF24" fill-opacity="0.65" />
    <path d="M205 95 C205 92, 205 92, 202 92 C205 92, 205 92, 205 89 C205 92, 205 92, 208 92 C205 92, 205 92, 205 95 Z" fill="#FBBF24" fill-opacity="0.6" />
  </g>
</svg>`;

// Ghi đè vào cả public và android
const paths = [
  'public/assets/3d/gift_box_3d_master.svg',
  'public/assets/3d/gift_box_pastel_clean.svg',
  'android/app/src/main/assets/public/assets/3d/gift_box_3d_master.svg',
  'android/app/src/main/assets/public/assets/3d/gift_box_pastel_clean.svg',
];

paths.forEach(p => fs.writeFileSync(p, doubleGiftBoxesSvg, 'utf8'));
console.log('Saved double gift boxes SVG successfully.');
