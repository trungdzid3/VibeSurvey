const fs = require('fs');

console.log('--- Triển khai gói nâng cấp UI/UX toàn diện: Tiến độ ngang hàng, màu động, dropdown, viewmode, admin nav & ghim survey ---');

let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Thêm hàm getProgressColorClass và closeAllCustomDropdowns
const helperFunctions = `
  getProgressColorClass(pct) {
    const p = Math.round(Number(pct) || 0);
    if (p < 20) return 'bg-slate-400 dark:bg-slate-500';
    if (p < 40) return 'bg-emerald-500';
    if (p < 70) return 'bg-blue-600';
    if (p < 90) return 'bg-amber-500';
    return 'bg-rose-500 animate-pulse';
  },

  closeAllCustomDropdowns() {
    document.querySelectorAll('.custom-dropdown-menu').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.dropdown-trigger-icon').forEach(i => i.classList.remove('rotate-180'));
  },
`;

if (!app.includes('getProgressColorClass(')) {
  app = app.replace('init() {', helperFunctions + '\n  async init() {');
  console.log('✅ Đã thêm getProgressColorClass và closeAllCustomDropdowns');
}

// 2. Thêm click listener đóng dropdown toàn cục trong init()
const dropdownGlobalClick = `
    // Đóng custom dropdown popover khi click ra ngoài
    document.addEventListener('click', (e) => {
      const isDropdownTrigger = e.target.closest('button[onclick*="toggleCustomDropdown"]');
      const isInsideDropdown = e.target.closest('.custom-dropdown-menu');
      if (!isDropdownTrigger && !isInsideDropdown) {
        this.closeAllCustomDropdowns();
      }
    });
`;

if (!app.includes('Đóng custom dropdown popover khi click ra ngoài')) {
  app = app.replace(
    '// Keyboard Shortcuts',
    dropdownGlobalClick + '\n    // Keyboard Shortcuts'
  );
  console.log('✅ Đã thêm global click listener để tự động đóng dropdown');
}

// 3. Sửa hàm selectDropdownOption (sửa biến val -> value, displayLabel -> label)
app = app.replace(
  `if (type === 'fast-category') {
      const input = document.getElementById('fast-category');
      const label = document.getElementById('fast-cat-dropdown-label');
      if (input) input.value = val;
      if (label) label.innerText = displayLabel;
      this.closeAllCustomDropdowns();
      return;
    }`,
  `if (type === 'fast-category') {
      const input = document.getElementById('fast-category');
      const labelEl = document.getElementById('fast-cat-dropdown-label');
      if (input) input.value = value;
      if (labelEl) labelEl.innerText = label;
      this.closeAllCustomDropdowns();
      return;
    }`
);
console.log('✅ Đã sửa selectDropdownOption cho fast-category');

// 4. Cập nhật Dropdown Số câu thành: < 10 câu, < 20 câu, > 20 câu
const oldLengthDropdownMenu = `<div id="length-dropdown-menu" class="custom-dropdown-menu hidden absolute left-0 z-50 mt-1.5 min-w-[150px] p-1.5 rounded-2xl bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-xl space-y-0.5">
                  <div onclick="VibeApp.selectDropdownOption('length', 'ALL', 'Tất cả số câu')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.lengthFilter === 'ALL' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>Tất cả số câu</span>
                    \${this.state.lengthFilter === 'ALL' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('length', 'SHORT', '1 - 3 câu')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.lengthFilter === 'SHORT' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>1 - 3 câu</span>
                    \${this.state.lengthFilter === 'SHORT' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('length', 'MEDIUM', '4 - 7 câu')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.lengthFilter === 'MEDIUM' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>4 - 7 câu</span>
                    \${this.state.lengthFilter === 'MEDIUM' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('length', 'LONG', '≥ 8 câu')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.lengthFilter === 'LONG' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>≥ 8 câu</span>
                    \${this.state.lengthFilter === 'LONG' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                </div>`;

const newLengthDropdownMenu = `<div id="length-dropdown-menu" class="custom-dropdown-menu hidden absolute left-0 z-50 mt-1.5 min-w-[150px] p-1.5 rounded-2xl bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-xl space-y-0.5">
                  <div onclick="VibeApp.selectDropdownOption('length', 'ALL', 'Tất cả số câu')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.lengthFilter === 'ALL' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>Tất cả số câu</span>
                    \${this.state.lengthFilter === 'ALL' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('length', 'UNDER_10', '< 10 câu')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.lengthFilter === 'UNDER_10' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>< 10 câu</span>
                    \${this.state.lengthFilter === 'UNDER_10' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('length', 'UNDER_20', '< 20 câu')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.lengthFilter === 'UNDER_20' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>< 20 câu</span>
                    \${this.state.lengthFilter === 'UNDER_20' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('length', 'OVER_20', '> 20 câu')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.lengthFilter === 'OVER_20' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>> 20 câu</span>
                    \${this.state.lengthFilter === 'OVER_20' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                </div>`;

if (app.includes(oldLengthDropdownMenu)) {
  app = app.replace(oldLengthDropdownMenu, newLengthDropdownMenu);
  console.log('✅ Đã cập nhật menu Dropdown số câu: < 10 câu, < 20 câu, > 20 câu');
}

// Cập nhật nhãn label mặc định cho lengthFilter
app = app.replace(
  "const currentLengthLabel = this.state.lengthFilter === 'SHORT' ? '1 - 3 câu' : (this.state.lengthFilter === 'MEDIUM' ? '4 - 7 câu' : (this.state.lengthFilter === 'LONG' ? '≥ 8 câu' : 'Tất cả số câu'));",
  "const currentLengthLabel = this.state.lengthFilter === 'UNDER_10' ? '< 10 câu' : (this.state.lengthFilter === 'UNDER_20' ? '< 20 câu' : (this.state.lengthFilter === 'OVER_20' ? '> 20 câu' : 'Tất cả số câu'));"
);

// Cập nhật logic lọc lengthFilter trong filterSurveys
const oldLengthFilterLogic = `    if (len === 'SHORT') {
      list = list.filter(s => (s.question_count || 1) <= 3);
    } else if (len === 'MEDIUM') {
      list = list.filter(s => (s.question_count || 1) >= 4 && (s.question_count || 1) <= 7);
    } else if (len === 'LONG') {
      list = list.filter(s => (s.question_count || 1) >= 8);
    }`;

const newLengthFilterLogic = `    if (len === 'UNDER_10' || len === 'SHORT') {
      list = list.filter(s => (s.question_count || 1) < 10);
    } else if (len === 'UNDER_20' || len === 'MEDIUM') {
      list = list.filter(s => (s.question_count || 1) >= 10 && (s.question_count || 1) <= 20);
    } else if (len === 'OVER_20' || len === 'LONG') {
      list = list.filter(s => (s.question_count || 1) > 20);
    }`;

if (app.includes(oldLengthFilterLogic)) {
  app = app.replace(oldLengthFilterLogic, newLengthFilterLogic);
  console.log('✅ Đã cập nhật logic lọc số câu trong filterSurveys');
}

// 5. Sửa nút Lưới / Danh sách: thêm id và cập nhật active class ngay lập tức
app = app.replace(
  `<button onclick="VibeApp.setViewMode('grid')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 \${
                  this.state.viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }" title="Dạng Lưới Tinh Gọn (4 Cột)">`,
  `<button id="view-btn-grid" onclick="VibeApp.setViewMode('grid')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 \${
                  this.state.viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs font-extrabold' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }" title="Dạng Lưới Tinh Gọn (4 Cột)">`
);

app = app.replace(
  `<button onclick="VibeApp.setViewMode('list')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 \${
                  this.state.viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }" title="Dạng Danh Sách 1 Dòng (Xem Được Nhiều Bài Nhất)">`,
  `<button id="view-btn-list" onclick="VibeApp.setViewMode('list')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 \${
                  this.state.viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs font-extrabold' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }" title="Dạng Danh Sách 1 Dòng (Xem Được Nhiều Bài Nhất)">`
);

const oldSetViewMode = `  setViewMode(mode) {
    this.haptic('light');
    this.state.viewMode = mode;
    this._updateSurveyGrid();
  },`;

const newSetViewMode = `  setViewMode(mode) {
    this.haptic('light');
    this.state.viewMode = mode;
    const btnGrid = document.getElementById('view-btn-grid');
    const btnList = document.getElementById('view-btn-list');
    const activeCls = 'px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs';
    const inactiveCls = 'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
    if (btnGrid) btnGrid.className = mode === 'grid' ? activeCls : inactiveCls;
    if (btnList) btnList.className = mode === 'list' ? activeCls : inactiveCls;
    this._updateSurveyGrid();
  },`;

if (app.includes(oldSetViewMode)) {
  app = app.replace(oldSetViewMode, newSetViewMode);
  console.log('✅ Đã sửa setViewMode: chuyển đổi Lưới / Danh sách tức thì');
}

// 6. Thêm nút Tạo Khảo Sát cho Admin
const oldAdminTabs = `    } else if (user.role === 'ADMIN') {
      tabs = [
        { id: 'admin-overview', label: 'Tổng Quan', icon: 'pie-chart' },
        { id: 'admin-payouts', label: 'Duyệt Tiền', icon: 'check-circle' },
        { id: 'admin-fraud', label: 'Gian Lận', icon: 'shield-alert' },
        { id: 'surveys', label: 'Khảo Sát', icon: 'layers' }
      ];`;

const newAdminTabs = `    } else if (user.role === 'ADMIN') {
      tabs = [
        { id: 'admin-overview', label: 'Tổng Quan', icon: 'pie-chart' },
        { id: 'admin-payouts', label: 'Duyệt Tiền', icon: 'check-circle' },
        { id: 'admin-fraud', label: 'Gian Lận', icon: 'shield-alert' },
        { id: 'surveys', label: 'Khảo Sát', icon: 'layers' },
        { id: 'create-survey', label: 'Tạo Khảo Sát', icon: 'plus-circle' }
      ];`;

if (app.includes(oldAdminTabs)) {
  app = app.replace(oldAdminTabs, newAdminTabs);
  console.log('✅ Đã bổ sung tab Tạo Khảo Sát cho Admin');
}

// 7. Đồng bộ thanh tiến độ ngang hàng, màu động & bỏ badge / icon ghim
const oldCompactCardFn = `  renderCompactSurveyCard(s, isPinned = false) {
    const user = this.state.currentUser;
    const isCompleted = s.user_response_status === 'VALIDATED';
    const collected = s.collected_responses || 0;
    const target = s.target_responses || 100;
    const progress = Math.min(100, Math.round((collected / target) * 100));
    const remainingSlots = Math.max(0, target - collected);
    const isNearFull = progress >= 60 && remainingSlots > 0;

    const questionCount = s.question_count || 1;
    const minMins = Math.max(1, Math.ceil((s.min_completion_time_sec || 30) / 60));
    const isExternal = s.survey_source && s.survey_source !== 'INTERNAL_BUILDER';

    const hasVoucher = !!(s.sponsor_voucher_title || s.sponsor_brand_name || s.reward_mode === 'VOUCHER_ONLY');
    const voucherText = s.sponsor_voucher_title || (s.sponsor_brand_name ? \`Tặng mã \${s.sponsor_brand_name}\` : 'Quà tặng');

    return \`
      <div class="bento-card p-3.5 flex flex-col justify-between transition-all hover:border-blue-400 \${
        isPinned ? 'ring-1 ring-amber-400/50 dark:ring-amber-500/40 bg-amber-500/[0.03]' : ''
      }">
        
        <div class="space-y-2.5">
          
          <div class="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                \${isExternal ? '🌐 Liên kết' : '📑 Nội Bộ'}
              </span>
              <span>⏱ ~ \${minMins}p</span>
              <span>\${questionCount} câu</span>
            </div>

            <div>
              \${isPinned ? \`
                <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 text-white font-extrabold text-[10px] shadow-2xs">
                  <i data-lucide="pin" class="w-2.5 h-2.5 stroke-[3]"></i>
                  <span>Ghim</span>
                </span>
              \` : isNearFull ? \`
                <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] animate-pulse">
                  🔥 Còn \${remainingSlots}
                </span>
              \` : ''}
            </div>
          </div>

          <div>
            <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer" onclick="\${user ? \`VibeApp.startSurveySession('\${s.id}')\` : \`VibeApp.openSurveyPreviewModal('\${s.id}')\`}">
              \${s.title}
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 leading-relaxed">
              \${s.description || 'Khảo sát nghiên cứu trải nghiệm và thói quen tiêu dùng.'}
            </p>
          </div>

          \${hasVoucher ? \`
            <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold truncate max-w-full">
              <i data-lucide="gift" class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0"></i>
              <span class="truncate">\${voucherText}</span>
            </div>
          \` : ''}

          <div class="space-y-1 pt-0.5">
            <div class="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Thu thập: \${collected}/\${target}</span>
              <span class="font-mono \${isNearFull ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}">\${progress}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-900/90 h-1.5 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300 \${
                isNearFull 
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }" style="width: \${progress}%"></div>
            </div>
          </div>

        </div>

        <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">`;

const newCompactCardFn = `  renderCompactSurveyCard(s, isPinned = false) {
    const user = this.state.currentUser;
    const isCompleted = s.user_response_status === 'VALIDATED';
    const collected = s.collected_responses || 0;
    const target = s.target_responses || 100;
    const progress = Math.min(100, Math.round((collected / target) * 100));
    const remainingSlots = Math.max(0, target - collected);
    const isNearFull = progress >= 60 && remainingSlots > 0;

    const questionCount = s.question_count || 1;
    const minMins = Math.max(1, Math.ceil((s.min_completion_time_sec || 30) / 60));
    const isExternal = s.survey_source && s.survey_source !== 'INTERNAL_BUILDER';

    const hasVoucher = !!(s.sponsor_voucher_title || s.sponsor_brand_name || s.reward_mode === 'VOUCHER_ONLY');
    const voucherText = s.sponsor_voucher_title || (s.sponsor_brand_name ? \`Tặng mã \${s.sponsor_brand_name}\` : 'Quà tặng');

    // Làm sạch tiêu đề: bỏ emoji ghim 📌
    const cleanTitle = (s.title || '').replace(/📌\\s*/g, '').trim();
    const progressColor = this.getProgressColorClass(progress);

    return \`
      <div class="bento-card p-3.5 flex flex-col justify-between h-full transition-all hover:border-blue-400 \${
        isPinned ? 'ring-1 ring-amber-400/50 dark:ring-amber-500/40 bg-amber-500/[0.03]' : ''
      }">
        
        <!-- TẦNG 1: THÔNG TIN KHẢO SÁT CÓ ĐỘ CAO ĐỒNG BỘ -->
        <div class="space-y-2 flex-1 flex flex-col justify-start">
          
          <div class="flex items-center justify-between text-[11px] font-semibold text-slate-400 h-5">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                \${isExternal ? '🌐 Liên kết' : '📑 Nội Bộ'}
              </span>
              <span>⏱ ~\${minMins}p</span>
              <span>\${questionCount} câu</span>
            </div>

            <div>
              \${isNearFull ? \`
                <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] animate-pulse">
                  🔥 Còn \${remainingSlots}
                </span>
              \` : ''}
            </div>
          </div>

          <div>
            <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2 h-10 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer" onclick="\${user ? \`VibeApp.startSurveySession('\${s.id}')\` : \`VibeApp.openSurveyPreviewModal('\${s.id}')\`}">
              \${cleanTitle}
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
              \${s.description || 'Khảo sát nghiên cứu trải nghiệm và thói quen tiêu dùng.'}
            </p>
          </div>

          <!-- SLOT VOUCHER LUÔN CHIẾM H-6 CỐ ĐỊNH ĐỂ CÁC THẺ KHÔNG BỊ LỆCH CHIỀU CAO -->
          <div class="h-6 flex items-center">
            \${hasVoucher ? \`
              <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold truncate max-w-full">
                <i data-lucide="gift" class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0"></i>
                <span class="truncate">\${voucherText}</span>
              </div>
            \` : ''}
          </div>

        </div>

        <!-- TẦNG 2: THANH TIẾN ĐỘ NGANG HÀNG NHAU 100% TRÊN MỌI THẺ -->
        <div class="space-y-1 pt-1.5 mt-auto">
          <div class="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Thu thập: \${collected}/\${target}</span>
            <span class="font-mono \${progress >= 90 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}">\${progress}%</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-900/90 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300 \${progressColor}" style="width: \${progress}%"></div>
          </div>
        </div>

        <!-- TẦNG 3: FOOTER NÚT & ĐIỂM NẰM THẲNG TẮP ĐỒNG BỘ -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-2">`;

if (app.includes(oldCompactCardFn)) {
  app = app.replace(oldCompactCardFn, newCompactCardFn);
  console.log('✅ Đã cập nhật CompactSurveyCard: Thanh tiến độ ngang hàng 100%, màu sắc theo mức độ điền');
}

// Cập nhật màu động cho ListSurveyRow
app = app.replace(
  `class="h-full rounded-full \${isNearFull ? 'bg-rose-500' : 'bg-blue-600'}" style="width: \${progress}%"`,
  `class="h-full rounded-full transition-all duration-300 \${this.getProgressColorClass(progress)}" style="width: \${progress}%"`
);

// 8. Sửa triệt để dropdown form tạo khảo sát: z-index cao, overflow visible
app = app.replace(
  '<div class="bento-card p-5 sm:p-6 space-y-4">',
  '<div class="bento-card allow-overflow p-5 sm:p-6 space-y-4 relative z-30" style="overflow: visible !important;">'
);
app = app.replace(
  '<div id="fast-cat-dropdown-menu" class="custom-dropdown-menu hidden absolute left-0 right-0 z-50 mt-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-xl space-y-0.5">',
  '<div id="fast-cat-dropdown-menu" class="custom-dropdown-menu hidden absolute left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xl space-y-0.5" style="z-index: 9999;">'
);
app = app.replace(
  '<!-- Phương Thức Tạo Nội Dung -->\n        <div class="bento-card p-5 sm:p-6 space-y-5">',
  '<!-- Phương Thức Tạo Nội Dung -->\n        <div class="bento-card p-5 sm:p-6 space-y-5 relative z-10">'
);
console.log('✅ Đã sửa dropdown form tạo khảo sát không bao giờ bị đè');

// 9. Thêm tùy chọn Ghim VIP vào form Tạo Khảo Sát
const pinOptionHtml = `
        <!-- TÙY CHỌN GHIM KHẢO SÁT LÊN VỊ TRÍ VIP ĐẦU TRANG -->
        <div class="bento-card p-4 sm:p-5 rounded-2xl border border-amber-300/80 dark:border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                ⭐
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">Ghim Lên Khối Nổi Bật Đầu Trang (VIP)</h3>
                  <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] uppercase">Ưu Tiên 300%</span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Bài khảo sát cố định vị trí VIP trên cùng, tiếp cận ngay 100% đáp viên, thu thập mẫu thần tốc.
                </p>
              </div>
            </div>

            <div class="flex-shrink-0 bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-amber-500/30 shadow-xs">
              <label class="custom-checkbox-wrapper group cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
                <input type="checkbox" id="fast-pin-survey" onchange="VibeApp.updateFastEscrowCalculation()" class="custom-checkbox-input">
                <div class="custom-checkbox-box">
                  <svg class="custom-checkbox-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Kích hoạt Ghim VIP</span>
              </label>
            </div>
          </div>

          <div class="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between text-[11px] text-amber-900 dark:text-amber-300 font-semibold">
            <span>Số vé ghim ưu tiên của bạn: <strong id="fast-user-pin-tickets" class="font-mono text-xs">\${(user ? user.fast_track_tickets : 0) || 0} vé</strong></span>
            <span class="text-slate-500 dark:text-slate-400">Nếu có vé: <strong>Trừ 1 vé miễn phí</strong> • Nếu không có vé: <strong>+50.000 VNĐ</strong></span>
          </div>
        </div>
`;

if (!app.includes('fast-pin-survey')) {
  app = app.replace(
    '<!-- Bảng Tính Chi Phí & Ký Quỹ Đặt Xuống Cuối (Cực Kỳ Minh Bạch) -->',
    pinOptionHtml + '\n        <!-- Bảng Tính Chi Phí & Ký Quỹ Đặt Xuống Cuối (Cực Kỳ Minh Bạch) -->'
  );
  console.log('✅ Đã thêm mục Tùy Chọn Ghim VIP vào form Tạo Khảo Sát');
}

// Cập nhật updateFastEscrowCalculation để cộng thêm phí ghim nếu không có vé
const oldEscrowCalc = `    if (isFree) {
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
    }`;

const newEscrowCalc = `    const isPinChecked = document.getElementById('fast-pin-survey')?.checked === true;
    const userTickets = (this.state.currentUser ? this.state.currentUser.fast_track_tickets : 0) || 0;
    const pinFee = isPinChecked && userTickets <= 0 ? 50000 : 0;

    if (isFree) {
      const finalFreeVnd = pinFee;
      if (displayEl) displayEl.innerText = finalFreeVnd > 0 ? finalFreeVnd.toLocaleString('vi-VN') + ' VNĐ' : '0 VNĐ';
      if (noteEl) {
        noteEl.innerText = isPinChecked && userTickets > 0 
          ? '(Tài trợ 100% từ Dùng Thử 25 lượt + Miễn phí 1 vé Ghim VIP)'
          : (pinFee > 0 ? '(Gói dùng thử 0đ + Phí Ghim VIP 50.000đ)' : '(Được tài trợ 100% từ Gói Dùng Thử 25 lượt)');
        noteEl.className = 'text-xs font-semibold text-emerald-600 dark:text-emerald-400';
      }
      if (submitLabelEl) submitLabelEl.innerText = finalFreeVnd > 0 ? 'Xuất Bản & Khóa Quỹ Ghim' : 'Xuất Bản Miễn Phí (0đ)';
    } else {
      const baseVnd = targets * reward * 10;
      const totalVnd = baseVnd + pinFee;
      if (displayEl) displayEl.innerText = totalVnd.toLocaleString('vi-VN') + ' VNĐ';
      if (noteEl) {
        noteEl.innerText = isPinChecked 
          ? (userTickets > 0 ? '(Khóa ký quỹ từ Credit ví + Trừ 1 vé Ghim VIP)' : '(Khóa ký quỹ từ Credit ví gồm +50.000đ Ghim VIP)')
          : '(Khóa ký quỹ tạm thời từ số dư Credit ví của bạn)';
        noteEl.className = 'text-xs font-semibold text-slate-500 dark:text-slate-400';
      }
      if (submitLabelEl) submitLabelEl.innerText = 'Xuất Bản & Khóa Quỹ Ký Quỹ';
    }`;

if (app.includes(oldEscrowCalc)) {
  app = app.replace(oldEscrowCalc, newEscrowCalc);
  console.log('✅ Đã cập nhật updateFastEscrowCalculation tính thêm phí ghim');
}

// Gửi is_pinned khi submitFastCreate
app = app.replace(
  'const isFreeTrial = document.getElementById(\'fast-use-free-trial\')?.checked === true;',
  `const isFreeTrial = document.getElementById('fast-use-free-trial')?.checked === true;
    const isPinnedChoice = document.getElementById('fast-pin-survey')?.checked === true;`
);

app = app.replace(
  'reward_points_per_response: pts,\n          questions: questionsPayload',
  'reward_points_per_response: pts,\n          is_pinned: isPinnedChoice,\n          questions: questionsPayload'
);

// Thêm các phương thức pinSurvey / unpinSurvey vào VibeApp cho trang Quản lý khảo sát
const surveyPinClientMethods = `
  async pinSurveyAction(surveyId, surveyTitle) {
    this.haptic('medium');
    const userTickets = (this.state.currentUser ? this.state.currentUser.fast_track_tickets : 0) || 0;
    const ticketNotice = userTickets > 0 
      ? \`<p class="text-xs text-emerald-600 font-bold">✓ Bạn có \${userTickets} vé ghim: Thao tác này sẽ trừ 1 vé miễn phí.</p>\`
      : \`<p class="text-xs text-amber-600 font-bold">⚠️ Bạn đã hết vé ghim: Thao tác này sẽ trừ 50.000đ Credit ví.</p>\`;

    this.showModal({
      title: '⭐ Ghim Khảo Sát Lên Đầu Trang (VIP)',
      content: \`
        <div class="space-y-4 py-1">
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Bạn có chắc chắn muốn đưa bài khảo sát <strong>"\${surveyTitle}"</strong> lên vị trí VIP cố định trên cùng để tăng 300% tốc độ thu thập mẫu?
          </p>
          <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
            \${ticketNotice}
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="VibeApp.confirmPinSurvey('\${surveyId}')" class="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs">
              Xác Nhận Ghim Bài
            </button>
            <button onclick="VibeApp.closeModal()" class="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold">
              Đóng
            </button>
          </div>
        </div>
      \`
    });
  },

  async confirmPinSurvey(surveyId) {
    try {
      this.closeModal();
      this.showToast('Đang xử lý ghim khảo sát...', 'info');
      const res = await this.api(\`/surveys/\${surveyId}/pin\`, { method: 'POST' });
      if (res.success) {
        this.haptic('success');
        this.showToast(res.message, 'success');
        if (this.state.currentUser) {
          if (res.fast_track_tickets !== undefined) this.state.currentUser.fast_track_tickets = res.fast_track_tickets;
          if (res.credit_balance !== undefined) this.state.currentUser.credit_balance = res.credit_balance;
        }
        this.applyUserInterface();
        this.navigate(this.state.currentTab || 'creator-surveys');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async unpinSurveyAction(surveyId) {
    if (!confirm('Bạn có chắc chắn muốn gỡ ghim bài khảo sát này về danh sách thông thường?')) return;
    try {
      this.showToast('Đang gỡ ghim...', 'info');
      const res = await this.api(\`/surveys/\${surveyId}/unpin\`, { method: 'POST' });
      if (res.success) {
        this.haptic('success');
        this.showToast(res.message, 'success');
        this.navigate(this.state.currentTab || 'creator-surveys');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },
`;

if (!app.includes('pinSurveyAction(')) {
  app = app.replace('submitFastCreate() {', surveyPinClientMethods + '\n  async submitFastCreate() {');
  console.log('✅ Đã thêm pinSurveyAction, confirmPinSurvey, unpinSurveyAction vào VibeApp');
}

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('🎉 Hoàn tất vá lỗi và nâng cấp public/app.js!');
