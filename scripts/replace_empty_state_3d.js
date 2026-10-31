const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

const idx = content.indexOf('Không tìm thấy khảo sát phù hợp');
const startDiv = content.lastIndexOf('<div class="relative w-48 sm:w-56', idx);
const svgEnd = content.indexOf('</svg>', startDiv);
const endSvgDiv = content.indexOf('</div>', svgEnd) + 6;

console.log('Replacing from', startDiv, 'to', endSvgDiv);
const replacement = `<!-- Minh họa 3D Bảng tài liệu + Kính lúp + Tia sáng chuẩn y hệt bản thiết kế đề xuất -->
          <div class="flex justify-center mb-2">
            <img src="/assets/3d/empty_state_3d_clean.png" class="w-60 sm:w-64 h-auto object-contain pointer-events-none select-none" alt="Không tìm thấy khảo sát" />
          </div>`;

content = content.substring(0, startDiv) + replacement + '\n          ' + content.substring(endSvgDiv);
fs.writeFileSync('public/app.js', content, 'utf8');
console.log('Da thay the thanh cong Empty State SVG sang anh 3D!');
