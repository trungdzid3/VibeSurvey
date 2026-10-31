const fs = require('fs');
const path = require('path');

// 1. Cập nhật public/index.html
const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1.1 Gỡ bỏ nút trên Header
const headerBtnRegex = /<!-- Nút Báo Lỗi \/ Góp Ý Nhanh -->\s*<button id="header-bug-report-btn"[\s\S]*?<\/button>\s*/;
if (headerBtnRegex.test(html)) {
  html = html.replace(headerBtnRegex, '');
  console.log('Removed header-bug-report-btn from header!');
}

// 1.2 Đổi icon và màu sắc của Floating Trigger
const oldFloatingRegex = /<!-- ==================== FLOATING BUG REPORT TRIGGER ==================== -->[\s\S]*?<\/div>\s*<!-- ==================== MODAL BÁO CÁO SỰ CỐ/;
const newFloatingHtml = `<!-- ==================== FLOATING BUG REPORT TRIGGER ==================== -->
  <div class="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
    <button onclick="VibeApp.openBugReportModal()" class="px-3.5 py-2 bg-white/95 dark:bg-[#1C1C20]/95 hover:border-orange-500 dark:hover:border-orange-500 border border-stone-200/90 dark:border-[#2E2E36] rounded-full shadow-lg dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md text-xs font-bold text-stone-700 dark:text-stone-200 hover:text-orange-600 dark:hover:text-orange-400 transition-all active:scale-95 flex items-center gap-2 group cursor-pointer" title="Báo lỗi hoặc góp ý cho VibeSurvey">
      <i data-lucide="bug" class="w-4 h-4 text-orange-600 dark:text-orange-500 group-hover:scale-110 transition-transform"></i>
      <span class="font-bold">Báo Lỗi</span>
    </button>
  </div>

  <!-- ==================== MODAL BÁO CÁO SỰ CỐ`;

if (oldFloatingRegex.test(html)) {
  html = html.replace(oldFloatingRegex, newFloatingHtml);
  console.log('Updated floating trigger style and icon to bug!');
}

// 1.3 Đổi icon trong modal header
html = html.replace(
  '<i data-lucide="life-buoy" class="w-4 h-4"></i>\n          </div>\n          <div>\n            <h3 class="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">Báo Cáo Sự Cố & Góp Ý</h3>',
  '<i data-lucide="bug" class="w-4 h-4"></i>\n          </div>\n          <div>\n            <h3 class="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">Báo Cáo Sự Cố & Góp Ý</h3>'
);

// 1.4 Đổi icon trong footer link
html = html.replace(
  '<i data-lucide="life-buoy" class="w-3.5 h-3.5 inline"></i>',
  '<i data-lucide="bug" class="w-3.5 h-3.5 inline"></i>'
);

// 1.5 Tăng cache buster
html = html.replace(/app\.js\?v=\d+/, 'app.js?v=1793285000000');
html = html.replace(/styles\.css\?v=3\.6\.\d+/, 'styles.css?v=3.6.8');

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated public/index.html!');

// 2. Cập nhật public/app.js
const appPath = path.join(__dirname, '..', 'public', 'app.js');
let app = fs.readFileSync(appPath, 'utf8');

// 2.1 Đổi icon trong Profile dropdown
app = app.replace(
  '<i data-lucide="life-buoy" class="w-4 h-4 text-orange-600 dark:text-orange-500"></i>\n          <span>Báo Lỗi & Góp Ý</span>',
  '<i data-lucide="bug" class="w-4 h-4 text-orange-600 dark:text-orange-500"></i>\n          <span>Báo Lỗi & Góp Ý</span>'
);

// 2.2 Đổi icon trong Admin Desktop Nav Links
app = app.replace(
  "{ id: 'admin-bug-reports', label: 'Báo Lỗi', icon: 'life-buoy' }",
  "{ id: 'admin-bug-reports', label: 'Báo Lỗi', icon: 'bug' }"
);

// 2.3 Đổi icon trong header modal báo lỗi (khi render)
app = app.replace(
  /<i data-lucide="life-buoy" class="w-4 h-4"><\/i>/g,
  '<i data-lucide="bug" class="w-4 h-4"></i>'
);

fs.writeFileSync(appPath, app, 'utf8');
console.log('Successfully updated public/app.js!');
