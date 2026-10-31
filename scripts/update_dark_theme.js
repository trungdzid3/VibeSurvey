const fs = require('fs');
const path = require('path');

const stylesPath = path.join(__dirname, '..', 'public', 'styles.css');
let styles = fs.readFileSync(stylesPath, 'utf8');

// 1. Cập nhật CSS Variables Tokens trong html.dark
const oldTokens = `/* ==================== DARK MODE TOKENS: TỐI GIẢN PHẲNG (MONOCHROME & ORANGE ACCENT) ==================== */
html.dark {
  --bg-page: #09090B;
  --bg-card: #18181B;
  --bg-card-subtle: #27272A;
  
  --border-subtle: #27272A;
  --border-hover: #3F3F46;
  --border-focus: #EA580C;
  
  --text-main: #FAFAFA;
  --text-body: #D4D4D8;
  --text-muted: #A1A1AA;
  --text-subtle: #71717A;

  --brand-primary: #EA580C;
  --brand-secondary: #FAFAFA;

  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 14px 30px -4px rgba(0, 0, 0, 0.8), 0 4px 10px -2px rgba(0, 0, 0, 0.5);
}`;

const newTokens = `/* ==================== DARK MODE TOKENS: CHUẨN ĐỒNG BỘ FORCE-DARK THAN ẤM CAO CẤP ==================== */
html.dark {
  --bg-page: #121214;
  --bg-card: #1C1C20;
  --bg-card-subtle: #24242A;
  
  --border-subtle: #2E2E36;
  --border-hover: #42424E;
  --border-focus: #EA580C;
  
  --text-main: #FFFFFF;
  --text-body: #E4E4E7;
  --text-muted: #A1A1AA;
  --text-subtle: #8A8A96;

  --brand-primary: #EA580C;
  --brand-secondary: #FFFFFF;

  --card-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  --card-shadow-hover: 0 12px 28px rgba(0, 0, 0, 0.6);
}`;

styles = styles.replace(oldTokens.replace(/\r?\n/g, '\r\n'), newTokens.replace(/\r?\n/g, '\r\n'));
if (!styles.includes('CHUẨN ĐỒNG BỘ FORCE-DARK THAN ẤM')) {
  styles = styles.replace(oldTokens.replace(/\r?\n/g, '\n'), newTokens.replace(/\r?\n/g, '\r\n'));
}

// 2. Cập nhật bento-card trong html.dark
const oldBento = `html.dark .bento-card {
  background: #18181B;
  border-color: #27272A;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}
html.dark .bento-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px -4px rgba(0, 0, 0, 0.8), 0 4px 10px -2px rgba(0, 0, 0, 0.5);
}`;

const newBento = `html.dark .bento-card {
  background: #1C1C20 !important;
  border-color: #2E2E36 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
html.dark .bento-card:hover {
  transform: translateY(-3px);
  border-color: #42424E !important;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6);
}`;

styles = styles.replace(oldBento.replace(/\r?\n/g, '\r\n'), newBento.replace(/\r?\n/g, '\r\n'));
if (!styles.includes('border-color: #42424E !important;')) {
  styles = styles.replace(oldBento.replace(/\r?\n/g, '\n'), newBento.replace(/\r?\n/g, '\r\n'));
}

// 3. Thay thế toàn bộ khối Dark Mode cũ (từ dòng ~657 đến trước dropdown popover)
const startMarker = '/* ==================== DARK MODE HIGH CONTRAST';
const endMarker = '/* Custom UI Dropdown Popover Animations */';

const startIndex = styles.indexOf(startMarker);
const endIndex = styles.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Cannot find dark mode section boundaries!');
  process.exit(1);
}

const newDarkSection = `/* ==================== PRECISION DARK THEME (FORCE-DARK AESTHETICS CHUẨN XÁC) ====================
   - Nền tổng thể: #121214 (đen than mềm ấm mịn màng, chống lóa mắt)
   - Nền Card & Bento Surface: #1C1C20 (nổi khối sắc nét, chiều sâu rõ rệt)
   - Nền Sub-container / Card con: #222228 (tạo phân tầng thị giác mạch lạc)
   - Viền Card: #2E2E36 | Viền Input & Control: #33333D
   - Text Hierarchy: Heading trắng tinh #FFFFFF 100%, Body xám sáng #E4E4E7, Subtext #A1A1AA (chống mờ)
   - Accent: Cam thương hiệu #EA580C / #F97316 bảo toàn độ tương phản rực rỡ
   ================================================================================================ */

html.dark {
  background-color: #121214 !important;
  color: #E4E4E7 !important;
}

html.dark body {
  background-color: #121214 !important;
  color: #E4E4E7 !important;
}

/* Header Navbar: Đen than #121214 với viền dưới thanh mảnh #25252A */
html.dark header {
  background-color: rgba(18, 18, 20, 0.95) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom-color: #25252A !important;
}

/* Nav Link Item */
html.dark #desktop-nav {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

html.dark .nav-link {
  color: #A1A1AA !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
html.dark .nav-link:hover {
  background: transparent !important;
  color: #FFFFFF !important;
}
html.dark .nav-link.active {
  color: #F97316 !important;
  font-weight: 700 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
html.dark .nav-link.active::after {
  background-color: #F97316 !important;
}

/* User Balance & Header Pills */
html.dark #user-balance-pill {
  background-color: #1C1C20 !important;
  border-color: #2E2E36 !important;
  box-shadow: none !important;
}
html.dark #header-points-text {
  color: #34D399 !important;
}
html.dark #header-credit-text {
  color: #34D399 !important;
}

/* BẢNG MÀU CARDS & BENTO SURFACES CHÍNH (#1C1C20 nổi khối rõ rệt) */
html.dark .bento-card,
html.dark .voucher-clean-card,
html.dark .studio-question-card,
html.dark .bg-white,
html.dark .dark\\:bg-\\[\\#18181B\\],
html.dark .dark\\:bg-stone-900,
html.dark .dark\\:bg-slate-900,
html.dark .dark\\:bg-zinc-900 {
  background-color: #1C1C20 !important;
  border-color: #2E2E36 !important;
}

/* Viền hover sắc nét cho các card */
html.dark .bento-card:hover,
html.dark .voucher-clean-card:hover {
  border-color: #42424E !important;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5) !important;
}

/* KHUNG CON, SUB-CONTAINERS & INNER CARDS (#222228 phân tầng) */
html.dark .bg-stone-50,
html.dark .bg-stone-100,
html.dark .bg-slate-50,
html.dark .bg-slate-100,
html.dark .dark\\:bg-stone-800,
html.dark .dark\\:bg-stone-800\\/90,
html.dark .dark\\:bg-stone-800\\/80,
html.dark .dark\\:bg-stone-800\\/50,
html.dark .dark\\:bg-stone-900\\/60,
html.dark .dark\\:bg-stone-900\\/80,
html.dark .dark\\:bg-zinc-800,
html.dark .dark\\:bg-slate-800 {
  background-color: #222228 !important;
  border-color: #2E2E36 !important;
}

/* BORDERS ĐỊNH HÌNH KHỐI (Chống nhòe, rõ nét từng góc cạnh) */
html.dark .border-stone-200,
html.dark .border-stone-100,
html.dark .border-slate-200,
html.dark .border-slate-100,
html.dark .dark\\:border-stone-800,
html.dark .dark\\:border-stone-700,
html.dark .dark\\:border-slate-800,
html.dark .dark\\:border-zinc-800 {
  border-color: #2E2E36 !important;
}

/* TYPOGRAPHIC HIERARCHY TƯƠNG PHẢN CAO (TRẮNG TINH & XÁM SÁNG) */
/* 1. Tiêu đề chính, đề mục & nhãn quan trọng: Trắng tinh #FFFFFF 100% nét căng */
html.dark h1,
html.dark h2,
html.dark h3,
html.dark h4,
html.dark h5,
html.dark h6,
html.dark .font-black,
html.dark .font-extrabold,
html.dark .text-slate-900,
html.dark .text-stone-900,
html.dark .text-stone-800,
html.dark .dark\\:text-white,
html.dark .dark\\:text-stone-100 {
  color: #FFFFFF !important;
}

/* 2. Văn bản body nội dung & mô tả chính: Xám sáng #E4E4E7 dễ đọc, dịu mắt */
html.dark .text-stone-700,
html.dark .text-stone-600,
html.dark .text-slate-700,
html.dark .text-slate-800,
html.dark .dark\\:text-stone-200,
html.dark .dark\\:text-stone-300 {
  color: #E4E4E7 !important;
}

/* 3. Phụ đề & chú thích hỗ trợ: Xám mịn #A1A1AA (chống mù mịt/xỉn màu) */
html.dark .text-stone-500,
html.dark .text-stone-400,
html.dark .text-slate-500,
html.dark .dark\\:text-stone-400,
html.dark .dark\\:text-stone-500 {
  color: #A1A1AA !important;
}

/* Ô NHẬP LIỆU (INPUT, SELECT, TEXTAREA) - NỀN ĐEN THAN #161619, VIỀN #33333D, CHỮ TRẮNG TINH */
html.dark input:not(.bg-transparent):not(.seamless-input),
html.dark select:not(.bg-transparent):not(.seamless-input),
html.dark textarea:not(.bg-transparent):not(.seamless-input) {
  background-color: #161619 !important;
  color: #FFFFFF !important;
  border: 1px solid #33333D !important;
  border-radius: 10px;
}

html.dark input:not(.bg-transparent):not(.seamless-input):focus,
html.dark select:not(.bg-transparent):not(.seamless-input):focus,
html.dark textarea:not(.bg-transparent):not(.seamless-input):focus {
  border-color: #EA580C !important;
  box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.25) !important;
  outline: none !important;
}

html.dark input::placeholder,
html.dark textarea::placeholder {
  color: #71717A !important;
}

/* Input trong suốt liền mạch (Google Forms style title & description) */
html.dark input.bg-transparent,
html.dark textarea.bg-transparent,
html.dark .seamless-input {
  background-color: transparent !important;
  color: #FFFFFF !important;
  border-top-color: transparent !important;
  border-left-color: transparent !important;
  border-right-color: transparent !important;
  border-bottom-color: #33333D !important;
  box-shadow: none !important;
}
html.dark input.bg-transparent:focus,
html.dark textarea.bg-transparent:focus,
html.dark .seamless-input:focus {
  background-color: transparent !important;
  border-bottom-color: #EA580C !important;
  box-shadow: none !important;
}

/* NÚT BẤM VÀ THAO TÁC PHỤ */
/* Nút phụ / Nút màu trắng trong Light Mode chuyển sang Đen than viền nét */
html.dark button.bg-white,
html.dark div.bg-white:not(.bento-card):not(.studio-question-card) {
  background-color: #222228 !important;
  border-color: #33333D !important;
  color: #FFFFFF !important;
}
html.dark button.bg-white:hover {
  background-color: #2A2A32 !important;
  border-color: #42424E !important;
  color: #FFFFFF !important;
}

/* Nút phụ xám nhạt (bg-stone-100 / bg-stone-200 / bg-slate-100) */
html.dark .bg-stone-100:not(.nav-link),
html.dark .bg-slate-100:not(.nav-link),
html.dark .dark\\:bg-stone-800:not(.nav-link) {
  background-color: #222228 !important;
  border-color: #33333D !important;
  color: #E4E4E7 !important;
}
html.dark .bg-stone-100:hover:not(.nav-link),
html.dark .dark\\:hover\\:bg-stone-700:hover {
  background-color: #2A2A32 !important;
  color: #FFFFFF !important;
}

/* Primary Action CTA (Cam VibeSurvey) - Giữ trọn độ rực rỡ và sắc nét */
html.dark .bg-orange-600 {
  background-color: #EA580C !important;
  color: #FFFFFF !important;
  border-color: #EA580C !important;
}
html.dark .bg-orange-600:hover {
  background-color: #C2410C !important;
}

/* Tab Filters & Quick Filter Chips */
html.dark .overflow-x-auto button:not(.active-chip):not(.bg-orange-600) {
  background-color: #1C1C20 !important;
  border-color: #2E2E36 !important;
  color: #A1A1AA !important;
}
html.dark .overflow-x-auto button:not(.active-chip):not(.bg-orange-600):hover {
  background-color: #222228 !important;
  border-color: #42424E !important;
  color: #FFFFFF !important;
}
html.dark .overflow-x-auto button.active-chip {
  background-color: #EA580C !important;
  border-color: #EA580C !important;
  color: #FFFFFF !important;
  font-weight: 700 !important;
}

/* BADGES & CHIPS TRẠNG THÁI (CHUẨN CHỈNH, KHÔNG BỊ XỈN) */
html.dark span.bg-amber-100,
html.dark .bg-amber-50 {
  background-color: rgba(245, 158, 11, 0.12) !important;
  border-color: rgba(245, 158, 11, 0.28) !important;
  color: #FBBF24 !important;
}
html.dark .text-amber-800,
html.dark .text-amber-600 {
  color: #FBBF24 !important;
}

html.dark span.bg-emerald-50,
html.dark span.bg-emerald-100 {
  background-color: rgba(16, 185, 129, 0.12) !important;
  border-color: rgba(16, 185, 129, 0.28) !important;
  color: #34D399 !important;
}
html.dark .text-emerald-700,
html.dark .text-emerald-600 {
  color: #34D399 !important;
}

html.dark span.bg-blue-50,
html.dark span.bg-blue-100 {
  background-color: rgba(56, 189, 248, 0.12) !important;
  border-color: rgba(56, 189, 248, 0.28) !important;
  color: #38BDF8 !important;
}
html.dark .text-blue-600,
html.dark .text-blue-700,
html.dark .text-indigo-600 {
  color: #38BDF8 !important;
}

/* MODAL DIALOGS & POPUPS CHUẨN ĐỒNG BỘ */
html.dark #modal-card,
html.dark .modal-content,
html.dark #demo-role-dropdown {
  background-color: #1C1C20 !important;
  background-image: none !important;
  border: 1px solid #2E2E36 !important;
  color: #E4E4E7 !important;
  box-shadow: 0 24px 48px -8px rgba(0, 0, 0, 0.8) !important;
}

html.dark #modal-card .bg-slate-50,
html.dark #modal-card .bg-stone-50,
html.dark #modal-card .bg-slate-100,
html.dark #modal-card .bg-stone-100 {
  background-color: #222228 !important;
  border-color: #2E2E36 !important;
}

/* BẢNG DỮ LIỆU & NHẬT KÝ GIAO DỊCH */
html.dark table thead {
  background-color: #161619 !important;
  color: #A1A1AA !important;
  border-bottom: 1px solid #2E2E36 !important;
}
html.dark table tbody tr {
  border-bottom: 1px solid #24242A !important;
}
html.dark table tbody tr:hover {
  background-color: #222228 !important;
}

/* THANH CUỘN (SCROLLBAR) MỊN MÀNG */
html.dark * {
  scrollbar-color: #33333D transparent;
}
html.dark *::-webkit-scrollbar-thumb {
  background: #33333D;
  border-radius: 4px;
}
html.dark *::-webkit-scrollbar-thumb:hover {
  background: #42424E;
}

`;

styles = styles.substring(0, startIndex) + newDarkSection.replace(/\r?\n/g, '\r\n') + styles.substring(endIndex);

fs.writeFileSync(stylesPath, styles, 'utf8');
console.log('Successfully updated public/styles.css!');

// 4. Cập nhật public/index.html
const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');

index = index.replace(
  /page:\s*'#09090B',\s*card:\s*'#18181B',\s*subtle:\s*'#27272A',\s*border:\s*'#27272A'/g,
  "page: '#121214',\n              card: '#1C1C20',\n              subtle: '#24242A',\n              border: '#2E2E36'"
);

index = index.replace(
  /borderLight:\s*'rgba\(255, 255, 255, 0\.08\)'/g,
  "borderLight: '#33333D'"
);

index = index.replace(
  /dark:bg-\[#09090B\]/g,
  'dark:bg-[#121214]'
);

index = index.replace(
  /styles\.css\?v=3\.6\.\d+/g,
  'styles.css?v=3.6.5'
);

fs.writeFileSync(indexPath, index, 'utf8');
console.log('Successfully updated public/index.html!');
