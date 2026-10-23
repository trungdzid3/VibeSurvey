const fs = require('fs');

// 1. Thêm listener vào app.js
let appCode = fs.readFileSync('public/app.js', 'utf8');
const targetStr = `      const dropdown = document.getElementById('user-profile-dropdown');
      const btn = document.getElementById('user-profile-btn');
      if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }`;

const replacementStr = `      const dropdown = document.getElementById('user-profile-dropdown');
      const btn = document.getElementById('user-profile-btn');
      if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }

      // Đóng các Custom Dropdown menus nếu click ra ngoài
      if (!e.target.closest('.relative')) {
        document.querySelectorAll('.custom-dropdown-menu').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('.dropdown-trigger-icon').forEach(i => i.classList.remove('rotate-180'));
      }`;

if (appCode.includes(targetStr)) {
  appCode = appCode.replace(targetStr, replacementStr);
  fs.writeFileSync('public/app.js', appCode, 'utf8');
  console.log('✅ Đã cập nhật dropdown click outside trong app.js');
}

// 2. Cập nhật public/styles.css cho Dark Mode để khắc phục 100% lỗi chữ tối trên nền tối
let cssCode = fs.readFileSync('public/styles.css', 'utf8');

const darkModeFixes = `

/* ==================== BẢO VỆ ĐỘ TƯƠNG PHẢN DARK MODE CHO TOÀN BỘ MODAL & TEXT ==================== */
html.dark #modal-card {
  background-color: #111827 !important;
  color: #F8FAFC !important;
}

html.dark #modal-card .text-slate-900,
html.dark #modal-card h1,
html.dark #modal-card h2,
html.dark #modal-card h3,
html.dark #modal-card h4 {
  color: #FFFFFF !important;
}

html.dark #modal-card .text-slate-800,
html.dark #modal-card .text-slate-700 {
  color: #E2E8F0 !important;
}

html.dark #modal-card .text-slate-500,
html.dark #modal-card .text-slate-400 {
  color: #94A3B8 !important;
}

html.dark #modal-card .bg-slate-100 {
  background-color: #1F2937 !important;
  color: #E5E7EB !important;
}

html.dark #modal-card .bg-slate-900 {
  background-color: #2563EB !important;
  color: #FFFFFF !important;
}

html.dark #modal-card .bg-amber-50,
html.dark #modal-card .bg-amber-50\\/70,
html.dark #modal-card .bg-amber-50\\/90 {
  background-color: rgba(245, 158, 11, 0.12) !important;
  border-color: rgba(245, 158, 11, 0.35) !important;
  color: #FDE68A !important;
}

html.dark #modal-card .text-amber-950,
html.dark #modal-card .text-slate-900.font-mono {
  color: #FDE68A !important;
}

/* Đảm bảo toàn bộ chữ trên trang Chợ Voucher và Ví Voucher sáng rõ trong Dark Mode */
html.dark .voucher-clean-card h3 {
  color: #FFFFFF !important;
}

html.dark .voucher-clean-card .text-slate-900 {
  color: #F8FAFC !important;
}

html.dark .voucher-clean-card .text-slate-600 {
  color: #CBD5E1 !important;
}

html.dark .voucher-clean-card .text-slate-500 {
  color: #94A3B8 !important;
}

/* Custom UI Dropdown Popover Animations */
.custom-dropdown-menu {
  transform-origin: top left;
  animation: dropdownPop 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes dropdownPop {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
`;

if (!cssCode.includes('BẢO VỆ ĐỘ TƯƠNG PHẢN DARK MODE')) {
  cssCode += darkModeFixes;
  fs.writeFileSync('public/styles.css', cssCode, 'utf8');
  console.log('✅ Đã bổ sung CSS Dark Mode Contrast Guard vào styles.css');
}
