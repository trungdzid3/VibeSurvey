const fs = require('fs');

console.log('--- Đang cập nhật public/app.js ---');
let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Thêm hàm getBrandLogoHtml vào VibeApp nếu chưa có
const brandLogoFunction = `
  getBrandLogoHtml(brandName) {
    const b = (brandName || '').toLowerCase().trim();
    if (b.includes('phúc long') || b.includes('phuc long')) {
      return \`<svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="22" fill="#01522C"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#E5B94E" stroke-width="2.5"/>
        <path d="M50 25 C62 25 72 35 72 48 C72 60 60 70 50 72 C40 70 28 60 28 48 C28 35 38 25 50 25 Z" fill="#E5B94E"/>
        <path d="M50 30 C58 35 64 43 64 50 C64 58 56 65 50 67 C44 65 36 58 36 50 C36 43 42 35 50 30 Z" fill="#01522C"/>
        <path d="M50 32 L50 65" stroke="#E5B94E" stroke-width="2.5" stroke-linecap="round"/>
        <text x="50" y="85" text-anchor="middle" fill="#FFFFFF" font-family="'Inter', sans-serif" font-weight="900" font-size="9" letter-spacing="0.5">PHÚC LONG</text>
      </svg>\`;
    }
    if (b.includes('grab')) {
      return \`<svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="22" fill="#00B14F"/>
        <g fill="#FFFFFF" transform="translate(10, 32)">
          <path d="M22 18 C22 8 14 0 0 0 L0 8 C8 8 13 12 13 18 C13 24 8 28 0 28 L0 36 C14 36 22 28 22 18 Z" transform="translate(4, 0)"/>
          <circle cx="11" cy="18" r="4.5" fill="#00B14F"/>
          <text x="40" y="27" fill="#FFFFFF" font-family="'Inter', sans-serif" font-weight="900" font-size="28" letter-spacing="-1">Grab</text>
        </g>
      </svg>\`;
    }
    if (b.includes('shopee')) {
      return \`<svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shopeeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FF5722"/>
            <stop offset="100%" stop-color="#EE4D2D"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill="url(#shopeeGrad)"/>
        <path d="M38 32 C38 24 43 18 50 18 C57 18 62 24 62 32" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M26 34 L74 34 L70 82 C69.5 84 68 85 66 85 L34 85 C32 85 30.5 84 30 82 L26 34 Z" fill="#FFFFFF"/>
        <path d="M57 47 C57 43 53 41 48 41 C43 41 40 44 40 48 C40 54 59 53 59 63 C59 68 54 72 48 72 C41 72 38 67 38 63" fill="none" stroke="#EE4D2D" stroke-width="4.5" stroke-linecap="round"/>
      </svg>\`;
    }
    if (b.includes('highlands')) {
      return \`<svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="22" fill="#B31217"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#F1D18A" stroke-width="2"/>
        <ellipse cx="50" cy="50" rx="34" ry="34" fill="#910D12"/>
        <path d="M26 58 C32 46 42 42 50 42 C58 42 68 46 74 58 Z" fill="#F1D18A"/>
        <path d="M32 58 C37 50 44 47 50 47 C56 47 63 50 68 58 Z" fill="#910D12"/>
        <path d="M28 66 C38 60 62 60 72 66" stroke="#F1D18A" stroke-width="3" fill="none" stroke-linecap="round"/>
        <text x="50" y="32" text-anchor="middle" fill="#FFFFFF" font-family="'Inter', sans-serif" font-weight="900" font-size="7.5" letter-spacing="1">HIGHLANDS</text>
        <text x="50" y="79" text-anchor="middle" fill="#F1D18A" font-family="'Inter', sans-serif" font-weight="800" font-size="7" letter-spacing="1.5">COFFEE</text>
      </svg>\`;
    }
    if (b.includes('cgv')) {
      return \`<svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="22" fill="#E71A0F"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#FFA49D" stroke-width="1.5"/>
        <text x="50" y="58" text-anchor="middle" fill="#FFFFFF" font-family="'Arial Black', 'Impact', sans-serif" font-weight="900" font-size="28" letter-spacing="-1">CGV</text>
        <text x="50" y="74" text-anchor="middle" fill="#FFE5E3" font-family="'Inter', sans-serif" font-weight="700" font-size="7.5" letter-spacing="2">CINEMAS</text>
      </svg>\`;
    }
    if (b.includes('starbucks')) {
      return \`<svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="22" fill="#006241"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="50" cy="50" r="34" fill="#006241"/>
        <polygon points="50,22 52,28 58,28 53,32 55,38 50,34 45,38 47,32 42,28 48,28" fill="#FFFFFF"/>
        <circle cx="50" cy="46" r="8" fill="#FFFFFF"/>
        <path d="M36 46 C36 56 42 66 50 72 C58 66 64 56 64 46" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
        <path d="M30 40 C30 54 36 68 46 76" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M70 40 C70 54 64 68 54 76" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M42 37 L58 37 L55 42 L45 42 Z" fill="#FFFFFF"/>
      </svg>\`;
    }
    return \`<div class="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
      \${(brandName || 'V').substring(0, 2).toUpperCase()}
    </div>\`;
  },
`;

if (!app.includes('getBrandLogoHtml(')) {
  app = app.replace('init() {', brandLogoFunction + '\n  init() {');
  console.log('✅ Đã thêm getBrandLogoHtml vào VibeApp');
}

// 2. Cập nhật nhãn nút lọc & logic filterSurveys
app = app.replace('⚡ Làm nhanh (≤ 1p)', '⚡ Làm nhanh (≤ 5p)');
app = app.replace('📝 Dưới 3 câu', '📝 Dưới 10 câu');
app = app.replace(
  "list = list.filter(s => (s.min_completion_time_sec || 60) <= 60);",
  "list = list.filter(s => (s.min_completion_time_sec || 60) <= 300); // Làm nhanh <= 5 phút"
);
app = app.replace(
  "list = list.filter(s => (s.question_count || 1) <= 3);",
  "list = list.filter(s => (s.question_count || 1) <= 10); // Dưới 10 câu"
);
console.log('✅ Đã cập nhật nút lọc: Làm nhanh (≤ 5p) & Dưới 10 câu');

// 3. Khắc phục Dropdown bị đè: Thêm allow-overflow relative z-20 cho container thanh lọc
app = app.replace(
  '<!-- ==================== THANH CÔNG CỤ LỌC TINH GỌN (UI/UX PRO MAX) ==================== -->\n        <div class="bento-card p-3 sm:p-3.5 space-y-2.5">',
  '<!-- ==================== THANH CÔNG CỤ LỌC TINH GỌN (UI/UX PRO MAX) ==================== -->\n        <div class="bento-card allow-overflow p-3 sm:p-3.5 space-y-2.5 relative z-20">'
);
console.log('✅ Đã thêm allow-overflow và z-index cho thanh công cụ lọc để không bị đè');

// 4. Xóa biểu tượng 🎯 cùng tiếng Anh (Screener) & Đổi sang Custom Checkbox
const screenerOld = `<!-- Câu hỏi sàng lọc Screener -->
            <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <label class="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" \${q.is_screener ? 'checked' : ''} onchange="VibeApp.toggleBuilderScreener(\${qIdx}, this.checked)" class="rounded text-blue-600 focus:ring-0">
                <span>🎯 Câu hỏi sàng lọc đối tượng (Screener)</span>
              </label>`;

const screenerNew = `<!-- Câu hỏi sàng lọc đối tượng -->
            <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <label class="custom-checkbox-wrapper group text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" \${q.is_screener ? 'checked' : ''} onchange="VibeApp.toggleBuilderScreener(\${qIdx}, this.checked)" class="custom-checkbox-input">
                <div class="custom-checkbox-box">
                  <svg class="custom-checkbox-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">Câu hỏi sàng lọc đối tượng</span>
              </label>`;

if (app.includes('🎯 Câu hỏi sàng lọc đối tượng (Screener)')) {
  app = app.replace(screenerOld, screenerNew);
  console.log('✅ Đã đổi tickbox custom và xoá biểu tượng 🎯 + (Screener)');
}

// 5. Cập nhật thẻ voucher trong renderVouchersView có logo thương hiệu
const oldVoucherHeader = `<div class="space-y-2.5">
                  <div class="flex justify-between items-center text-xs">
                    <span class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-black">
                      \${v.brand_name}
                    </span>
                    <span class="text-slate-400 dark:text-slate-400 font-mono text-[11px] font-semibold">Còn \${v.remaining_quantity || 0} mã</span>
                  </div>
                  <h3 class="text-base font-extrabold text-slate-900 dark:text-white leading-snug">\${v.title}</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">\${v.instructions || 'Áp dụng trên toàn quốc'}</p>`;

const newVoucherHeader = `<div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-2xl flex items-center justify-center p-1 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-xs overflow-hidden flex-shrink-0">
                        \${this.getBrandLogoHtml(v.brand_name)}
                      </div>
                      <div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-black text-slate-900 dark:text-white leading-tight">\${v.brand_name}</span>
                          <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                            <i data-lucide="check" class="w-2.5 h-2.5 stroke-[3]"></i> Chính hãng
                          </span>
                        </div>
                        <span class="text-[11px] text-slate-400 font-mono">E-Voucher</span>
                      </div>
                    </div>
                    <span class="text-slate-400 dark:text-slate-400 font-mono text-[11px] font-semibold bg-slate-50 dark:bg-slate-800/70 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      Còn \${v.remaining_quantity || 0} mã
                    </span>
                  </div>
                  <h3 class="text-base font-extrabold text-slate-900 dark:text-white leading-snug pt-0.5">\${v.title}</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">\${v.instructions || 'Áp dụng trên toàn quốc'}</p>`;

if (app.includes(oldVoucherHeader)) {
  app = app.replace(oldVoucherHeader, newVoucherHeader);
  console.log('✅ Đã nhúng logo thương hiệu vào thẻ voucher đổi điểm');
}

// 6. Cập nhật form Tạo Khảo Sát:
// a) Custom Dropdown cho "Lĩnh vực nghiên cứu"
// b) Sửa banner ưu đãi 25 lượt: checkbox custom, không co giãn text
// c) Bảng tính chi phí ký quỹ đặt xuống cuối cùng trước nút Xuất bản
const oldCreateFormSection = `<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2 space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Tiêu đề khảo sát *</label>
              <input type="text" id="fast-title" placeholder="VD: Khảo sát hành vi tiêu dùng và trải nghiệm ứng dụng tài chính..." 
                     class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Lĩnh vực nghiên cứu</label>
              <select id="fast-category" class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="Thị trường">Thị trường & Người tiêu dùng</option>
                <option value="Công nghệ">Công nghệ, Phần mềm & AI</option>
                <option value="Học thuật">Học thuật, Luận văn & Sinh viên</option>
                <option value="Thương mại điện tử">Thương mại điện tử & Bán lẻ</option>
                <option value="Đời sống">Đời sống, Sức khỏe & Xã hội</option>
              </select>
            </div>
          </div>`;

const newCreateFormSection = `<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2 space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Tiêu đề khảo sát *</label>
              <input type="text" id="fast-title" placeholder="VD: Khảo sát hành vi tiêu dùng và trải nghiệm ứng dụng tài chính..." 
                     class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            </div>
            
            <!-- Custom Dropdown tiêu chuẩn app cho Lĩnh vực nghiên cứu -->
            <div class="space-y-1.5 relative">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Lĩnh vực nghiên cứu</label>
              <input type="hidden" id="fast-category" value="Thị trường">
              <button type="button" onclick="VibeApp.toggleCustomDropdown('fast-cat-dropdown-menu')" class="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                <span id="fast-cat-dropdown-label">🛒 Thị trường & Người tiêu dùng</span>
                <i data-lucide="chevron-down" class="dropdown-trigger-icon w-4 h-4 text-slate-400 transition-transform duration-200"></i>
              </button>

              <div id="fast-cat-dropdown-menu" class="custom-dropdown-menu hidden absolute left-0 right-0 z-50 mt-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-xl space-y-0.5">
                <div onclick="VibeApp.selectDropdownOption('fast-category', 'Thị trường', '🛒 Thị trường & Người tiêu dùng')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40">
                  <span>🛒 Thị trường & Người tiêu dùng</span>
                  <i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>
                </div>
                <div onclick="VibeApp.selectDropdownOption('fast-category', 'Công nghệ', '💻 Công nghệ, Phần mềm & AI')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <span>💻 Công nghệ, Phần mềm & AI</span>
                </div>
                <div onclick="VibeApp.selectDropdownOption('fast-category', 'Học thuật', '🎓 Học thuật, Luận văn & Sinh viên')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <span>🎓 Học thuật, Luận văn & Sinh viên</span>
                </div>
                <div onclick="VibeApp.selectDropdownOption('fast-category', 'Thương mại điện tử', '🛍️ Thương mại điện tử & Bán lẻ')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <span>🛍️ Thương mại điện tử & Bán lẻ</span>
                </div>
                <div onclick="VibeApp.selectDropdownOption('fast-category', 'Đời sống', '🌿 Đời sống, Sức khỏe & Xã hội')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <span>🌿 Đời sống, Sức khỏe & Xã hội</span>
                </div>
              </div>
            </div>
          </div>`;

if (app.includes(oldCreateFormSection)) {
  app = app.replace(oldCreateFormSection, newCreateFormSection);
  console.log('✅ Đã đổi Lĩnh vực nghiên cứu sang Custom Dropdown tiêu chuẩn');
}

// 7. Sửa banner 25 lượt free: dùng custom-checkbox, không đổi text co giãn
const oldFreeTrialBox = `<div class="flex-shrink-0 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-emerald-500/20 shadow-xs">
                <label class="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                  <input type="checkbox" id="fast-use-free-trial" checked onchange="VibeApp.toggleFreeTrialSelection(this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
                  <span>Dùng 25 lượt free (Ký quỹ: <strong id="fast-escrow-badge" class="text-emerald-600 dark:text-emerald-400 font-mono">0 VNĐ</strong>)</span>
                </label>
              </div>`;

const newFreeTrialBox = `<div class="flex-shrink-0 bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-emerald-500/25 shadow-xs min-w-[230px]">
                <label class="custom-checkbox-wrapper group cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
                  <input type="checkbox" id="fast-use-free-trial" checked onchange="VibeApp.toggleFreeTrialSelection(this.checked)" class="custom-checkbox-input">
                  <div class="custom-checkbox-box">
                    <svg class="custom-checkbox-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span class="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Dùng 25 lượt miễn phí (0đ)</span>
                </label>
              </div>`;

if (app.includes(oldFreeTrialBox)) {
  app = app.replace(oldFreeTrialBox, newFreeTrialBox);
  console.log('✅ Đã cố định khung Free Trial không bị co giãn khi click tick');
}

// 8. Đưa phần tính tiền ký quỹ xuống cuối form trước nút Submit
const oldSubmitBar = `<!-- Thanh nút Submit cuối trang -->
        <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <button onclick="VibeApp.navigate('creator-surveys')" class="w-full sm:w-auto py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all">
            Hủy & Về Danh Sách
          </button>
          <button onclick="VibeApp.submitFastCreate()" class="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <i data-lucide="send" class="w-4 h-4"></i>
            <span>\${hasFreeTrial ? 'Xuất Bản Khảo Sát Miễn Phí (0đ)' : 'Xuất Bản & Khóa Quỹ Ký Quỹ'}</span>
          </button>
        </div>`;

const newSubmitBar = `<!-- Bảng Tính Chi Phí & Ký Quỹ Đặt Xuống Cuối (Cực Kỳ Minh Bạch) -->
        <div class="bento-card p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/50 dark:from-slate-850 dark:via-slate-800 dark:to-slate-850 border border-blue-200/60 dark:border-blue-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <i data-lucide="wallet" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
              <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Ngân Sách Ký Quỹ (Escrow) Cần Thanh Toán:</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span id="fast-total-escrow-display" class="text-2xl font-black text-blue-600 dark:text-sky-400 font-mono">\${hasFreeTrial ? '0 VNĐ' : '200.000 VNĐ'}</span>
              <span id="fast-escrow-note" class="text-xs font-semibold \${hasFreeTrial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                \${hasFreeTrial ? '(Được tài trợ 100% từ Gói Dùng Thử Đầu Tay)' : '(Khóa ký quỹ từ số dư Credit ví của bạn)'}
              </span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-2.5">
            <button type="button" onclick="VibeApp.navigate('creator-surveys')" class="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all">
              Hủy Bỏ
            </button>
            <button type="button" onclick="VibeApp.submitFastCreate()" id="fast-submit-btn" class="w-full sm:w-auto py-3 px-7 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <i data-lucide="send" class="w-4 h-4"></i>
              <span id="fast-submit-label">\${hasFreeTrial ? 'Xuất Bản Miễn Phí (0đ)' : 'Xuất Bản & Khóa Quỹ Ký Quỹ'}</span>
            </button>
          </div>
        </div>`;

if (app.includes(oldSubmitBar)) {
  app = app.replace(oldSubmitBar, newSubmitBar);
  console.log('✅ Đã đưa bảng tính tiền ký quỹ xuống cuối form trước nút xuất bản');
}

// 9. Cập nhật hàm toggleFreeTrialSelection và updateFastEscrowCalculation
const oldToggleFn = `toggleFreeTrialSelection(isChecked) {
    const targetInput = document.getElementById('fast-target-count');
    const badge = document.getElementById('fast-escrow-badge');
    if (isChecked) {
      if (targetInput) targetInput.value = 25;
      if (badge) badge.innerText = '0 VNĐ';
    } else {
      if (targetInput && Number(targetInput.value) <= 25) targetInput.value = 100;
      if (badge) badge.innerText = 'Có tính phí';
    }
  },`;

const newToggleFn = `toggleFreeTrialSelection(isChecked) {
    const targetInput = document.getElementById('fast-target-count');
    if (isChecked) {
      if (targetInput) targetInput.value = 25;
    } else {
      if (targetInput && Number(targetInput.value) <= 25) targetInput.value = 100;
    }
    this.updateFastEscrowCalculation();
  },

  updateFastEscrowCalculation() {
    const targetEl = document.getElementById('fast-target-count');
    const rewardEl = document.getElementById('fast-reward-points');
    const freeTrialEl = document.getElementById('fast-use-free-trial');
    const displayEl = document.getElementById('fast-total-escrow-display');
    const noteEl = document.getElementById('fast-escrow-note');
    const submitLabelEl = document.getElementById('fast-submit-label');

    const targets = targetEl ? parseInt(targetEl.value, 10) || 0 : 100;
    const reward = rewardEl ? parseInt(rewardEl.value, 10) || 0 : 200;
    const isFree = freeTrialEl ? freeTrialEl.checked : false;

    if (isFree) {
      if (displayEl) displayEl.innerText = '0 VNĐ';
      if (noteEl) {
        noteEl.innerText = '(Được tài trợ 100% từ Gói Dùng Thử 25 lượt)';
        noteEl.className = 'text-xs font-semibold text-emerald-600 dark:text-emerald-400';
      }
      if (submitLabelEl) submitLabelEl.innerText = 'Xuất Bản Miễn Phí (0đ)';
    } else {
      const totalVnd = targets * reward * 10;
      if (displayEl) displayEl.innerText = totalVnd.toLocaleString('vi-VN') + ' VNĐ';
      if (noteEl) {
        noteEl.innerText = '(Khóa ký quỹ tạm thời từ số dư Credit ví của bạn)';
        noteEl.className = 'text-xs font-semibold text-slate-500 dark:text-slate-400';
      }
      if (submitLabelEl) submitLabelEl.innerText = 'Xuất Bản & Khóa Quỹ Ký Quỹ';
    }
  },`;

if (app.includes(oldToggleFn)) {
  app = app.replace(oldToggleFn, newToggleFn);
  console.log('✅ Đã cập nhật toggleFreeTrialSelection và updateFastEscrowCalculation');
}

// Thêm lắng nghe oninput cho fast-target-count và fast-reward-points
app = app.replace(
  'id="fast-target-count" value="${defaultTarget}"',
  'id="fast-target-count" value="${defaultTarget}" oninput="VibeApp.updateFastEscrowCalculation()"'
);
app = app.replace(
  'id="fast-reward-points" value="200"',
  'id="fast-reward-points" value="200" oninput="VibeApp.updateFastEscrowCalculation()"'
);

// Bổ sung xử lý selectDropdownOption cho 'fast-category'
if (!app.includes("type === 'fast-category'")) {
  app = app.replace(
    "if (type === 'sort') {",
    `if (type === 'fast-category') {
      const input = document.getElementById('fast-category');
      const label = document.getElementById('fast-cat-dropdown-label');
      if (input) input.value = val;
      if (label) label.innerText = displayLabel;
      this.closeAllCustomDropdowns();
      return;
    }
    if (type === 'sort') {`
  );
  console.log('✅ Đã thêm xử lý dropdown fast-category trong selectDropdownOption');
}

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('🎉 Hoàn tất cập nhật public/app.js!');
