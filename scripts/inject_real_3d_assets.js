const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../public/app.js');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Thay the watermark trong The So Du Khao Sat (Survey View)
const surveyGiftSvgPattern = /<!-- Watermark nền mờ hộp quà cam pastel -->[\s\S]*?<!-- Tia sáng sparkles mờ pastel -->[\s\S]*?<\/div>/;
if (surveyGiftSvgPattern.test(content)) {
  content = content.replace(surveyGiftSvgPattern, `<!-- Hình nền 3D Hộp quà cam pastel chuẩn y hệt bản thiết kế đề xuất -->
              <img src="/assets/3d/gift_box_survey_clean.png" class="absolute right-0 bottom-0 w-36 sm:w-40 h-auto object-contain pointer-events-none select-none z-0" alt="3D Gift Box" />`);
  console.log('Da thay the 3D Gift Box o The So Du Khao Sat!');
} else {
  console.warn('Khong tim thay pattern surveyGiftSvgPattern');
}

// 2. Thay the watermark trong The Chuoi Diem Danh (Streak View)
// Do the 2 cung co SVG tuong tu:
const streakGiftSvgPattern = /<!-- Watermark nền mờ hộp quà cam pastel -->[\s\S]*?<\/div>/;
if (streakGiftSvgPattern.test(content)) {
  content = content.replace(streakGiftSvgPattern, `<!-- Hình nền 3D Hộp quà cam pastel chuẩn y hệt bản thiết kế đề xuất -->
              <img src="/assets/3d/gift_box_streak_clean.png" class="absolute right-0 bottom-0 w-36 sm:w-40 h-auto object-contain pointer-events-none select-none z-0" alt="3D Gift Box" />`);
  console.log('Da thay the 3D Gift Box o The Chuoi Diem Danh!');
} else {
  console.warn('Khong tim thay pattern streakGiftSvgPattern');
}

// 3. Thay the minh hoa SVG trong Empty State Khao Sat
const emptyStateSvgPattern = /<!-- Minh họa vector Clipboard \+ Kính lúp cam chuẩn 100% bản vẽ đề xuất -->[\s\S]*?<\/div>\s*<\/div>/;
if (emptyStateSvgPattern.test(content)) {
  content = content.replace(emptyStateSvgPattern, `<!-- Minh họa 3D Bảng tài liệu + Kính lúp + Tia sáng chuẩn y hệt bản thiết kế đề xuất -->
          <div class="flex justify-center mb-1">
            <img src="/assets/3d/empty_state_3d_clean.png" class="w-60 sm:w-64 h-auto object-contain pointer-events-none select-none" alt="Không tìm thấy khảo sát" />
          </div>`);
  console.log('Da thay the 3D Clipboard & Magnifier o Empty State!');
} else {
  console.warn('Khong tim thay pattern emptyStateSvgPattern');
}

// 4. Thay the watermark SVG trong The POINT CUA BAN (Wallet View)
const walletSvgPattern = /<!-- Watermark 3D Soft Wallet & Golden Stars -->[\s\S]*?<\/div>/;
if (walletSvgPattern.test(content)) {
  content = content.replace(walletSvgPattern, `<!-- Chiếc ví da 3D màu cam chuẩn y hệt bản thiết kế đề xuất -->
            <img src="/assets/3d/wallet_orange_3d_feathered.png" class="absolute right-0 top-1/2 -translate-y-1/2 w-44 sm:w-48 h-auto object-contain pointer-events-none select-none z-0" alt="3D Orange Wallet" />`);
  console.log('Da thay the Chiếc ví da 3D trong The POINT CUA BAN!');
} else {
  console.warn('Khong tim thay pattern walletSvgPattern');
}

// 5. Thay the watermark SVG trong The CREDIT (Wallet View)
const coinsSvgPattern = /<!-- Watermark 3D Coins & Voucher Coupon -->[\s\S]*?<\/div>/;
if (coinsSvgPattern.test(content)) {
  content = content.replace(coinsSvgPattern, `<!-- Chồng tiền xu vàng 3D và vé Coupon % chuẩn y hệt bản thiết kế đề xuất -->
            <img src="/assets/3d/coins_coupon_3d_clean.png" class="absolute right-0 top-1/2 -translate-y-1/2 w-44 sm:w-48 h-auto object-contain pointer-events-none select-none z-0" alt="3D Coins & Coupon" />`);
  console.log('Da thay the Chồng coin 3D & Coupon trong The CREDIT!');
} else {
  console.warn('Khong tim thay pattern coinsSvgPattern');
}

fs.writeFileSync(appPath, content, 'utf8');
console.log('Tat ca cac hinh nen va minh hoa 3D da duoc inject thanh cong!');
