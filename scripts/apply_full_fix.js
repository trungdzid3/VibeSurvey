const fs = require('fs');

// ==================== 1. SỬA PUBLIC/APP.JS ====================
let appCode = fs.readFileSync('public/app.js', 'utf8');

// Thay thế các chỗ gọi openFastCreateModal -> openCreateSurveyModal
appCode = appCode.replace(/this\.openFastCreateModal\(\)/g, 'this.openCreateSurveyModal()');

// Sửa hàm showModal để hỗ trợ Dark Mode hoàn hảo
const oldShowModal = `  showModal({ title, content }) {
    const container = document.getElementById('modal-container');
    const card = document.getElementById('modal-card');
    if (!container || !card) return;

    card.innerHTML = \`
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
        <h3 class="text-base font-extrabold text-slate-900">\${title}</h3>
        <button onclick="VibeApp.closeModal()" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.2]"></i>
        </button>
      </div>
      <div>\${content}</div>
    \`;

    container.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  },`;

const newShowModal = `  showModal({ title, content }) {
    const container = document.getElementById('modal-container');
    const card = document.getElementById('modal-card');
    if (!container || !card) return;

    card.innerHTML = \`
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 mb-4">
        <h3 class="text-base font-extrabold text-slate-900 dark:text-white">\${title}</h3>
        <button onclick="VibeApp.closeModal()" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.2]"></i>
        </button>
      </div>
      <div class="modal-body-content text-slate-800 dark:text-slate-100">\${content}</div>
    \`;

    container.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  },`;

if (appCode.includes(oldShowModal)) {
  appCode = appCode.replace(oldShowModal, newShowModal);
}

// Sửa modal redeemVoucher để Dark Mode hiển thị đẹp mắt, không dùng màu xám bệt
const oldRedeemModal = `        this.showModal({
          title: '🎁 Đổi Mã Thành Công',
          content: \`
            <div class="space-y-4 py-2 text-center">
              <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <i data-lucide="ticket" class="w-7 h-7 stroke-[2.2]"></i>
              </div>
              <div>
                <h4 class="text-base font-extrabold text-slate-900">\${res.voucher.title}</h4>
                <p class="text-xs text-slate-500 mt-1">\${res.voucher.instructions}</p>
              </div>
              <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl font-mono text-sm font-bold text-slate-900 flex justify-between items-center">
                <span class="tracking-wider">\${res.voucher.code}</span>
                <button onclick="VibeApp.copyText('\${res.voucher.code}')" class="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">Sao chép</button>
              </div>
              <div class="flex gap-2 pt-1">
                <button onclick="VibeApp.closeModal(); VibeApp.navigate('my-vouchers')" class="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold">
                  Xem Ví Voucher
                </button>
                <button onclick="VibeApp.closeModal()" class="py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                  Đóng
                </button>
              </div>
            </div>
          \`
        });`;

const newRedeemModal = `        this.showModal({
          title: '🎁 Đổi Mã Thành Công',
          content: \`
            <div class="space-y-4 py-2 text-center">
              <div class="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                <i data-lucide="ticket" class="w-7 h-7 stroke-[2.2]"></i>
              </div>
              <div>
                <h4 class="text-base font-extrabold text-slate-900 dark:text-white">\${res.voucher.title}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">\${res.voucher.instructions}</p>
              </div>
              <div class="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 rounded-2xl font-mono text-sm font-bold text-slate-900 dark:text-amber-200 flex justify-between items-center shadow-2xs">
                <span class="tracking-wider text-amber-950 dark:text-amber-300 font-mono">\${res.voucher.code}</span>
                <button onclick="VibeApp.copyText('\${res.voucher.code}')" class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all">Sao chép</button>
              </div>
              <div class="flex gap-2 pt-2">
                <button onclick="VibeApp.closeModal(); VibeApp.navigate('my-vouchers')" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95">
                  Xem Ví Voucher
                </button>
                <button onclick="VibeApp.closeModal()" class="py-2.5 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all">
                  Đóng
                </button>
              </div>
            </div>
          \`
        });`;

if (appCode.includes(oldRedeemModal)) {
  appCode = appCode.replace(oldRedeemModal, newRedeemModal);
}

// 2. Viết lại renderSurveysView & Toolbar với Custom Dropdown Component & Khảo Sát Ghim Luôn Cố Định Trên Đầu
const oldRenderBlockStart = 'renderSurveysView(root) {';
const oldRenderBlockEnd = 'resetAllFilters() {';

const customDropdownsCode = `  // ==================== CUSTOM UI DROPDOWN COMPONENT ====================
  toggleCustomDropdown(dropdownId) {
    const el = document.getElementById(dropdownId);
    if (!el) return;
    const isHidden = el.classList.contains('hidden');
    // Đóng tất cả dropdown đang mở khác
    document.querySelectorAll('.custom-dropdown-menu').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.dropdown-trigger-icon').forEach(i => i.classList.remove('rotate-180'));
    if (isHidden) {
      el.classList.remove('hidden');
      const triggerIcon = el.parentElement.querySelector('.dropdown-trigger-icon');
      if (triggerIcon) triggerIcon.classList.add('rotate-180');
    }
  },

  selectDropdownOption(type, value, label) {
    this.haptic('light');
    if (type === 'sort') {
      this.state.sortBy = value;
      const labelEl = document.getElementById('sort-dropdown-label');
      if (labelEl) labelEl.textContent = label;
    } else if (type === 'length') {
      this.state.lengthFilter = value;
      const labelEl = document.getElementById('length-dropdown-label');
      if (labelEl) labelEl.textContent = label;
    }
    document.querySelectorAll('.custom-dropdown-menu').forEach(d => d.classList.add('hidden'));
    document.querySelectorAll('.dropdown-trigger-icon').forEach(i => i.classList.remove('rotate-180'));
    this._updateSurveyGrid();
  },

  async renderSurveysView(root) {
    // Luôn fetch danh sách mới nhất từ server
    try {
      const res = await this.api('/surveys');
      this.state.surveys = res.surveys || [];
    } catch (err) {
      console.warn('Không thể nạp danh sách khảo sát:', err.message);
      if (!this.state.surveys) this.state.surveys = [];
    }

    const surveys = this.state.surveys;
    const user = this.state.currentUser;
    const curPoints = user ? user.point_balance : 0;
    const curVnd = curPoints * 10;
    const minPayoutVnd = 100000;
    const goalPercent = Math.min(100, Math.round((curVnd / minPayoutVnd) * 100));

    // Lọc & Phân nhóm: Ghim luôn cố định trên đầu, bài thường ở dưới
    const { pinnedSurveys, normalSurveys } = this.processSurveysList(surveys);

    // Nhãn hiển thị cho dropdown
    const sortLabels = {
      recommended: '🌟 Mặc định (Sắp đầy & Mới)',
      reward_desc: '💰 Điểm thưởng cao nhất',
      speed: '⚡ Tốc độ nhanh nhất',
      few_questions: '📝 Ít câu hỏi nhất',
      progress_desc: '🔥 Gần đủ suất nhất',
      newest: '⏱️ Mới nhất'
    };
    const currentSortLabel = sortLabels[this.state.sortBy] || sortLabels.recommended;

    const lengthLabels = {
      ALL: 'Tất cả số câu',
      SHORT: '1 - 3 câu',
      MEDIUM: '4 - 7 câu',
      LONG: '≥ 8 câu'
    };
    const currentLengthLabel = lengthLabels[this.state.lengthFilter] || lengthLabels.ALL;

    root.innerHTML = \`
      <div class="space-y-4 sm:space-y-4.5">
        
        <!-- ==================== BENTO DASHBOARD HEADER ==================== -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5">
          
          <!-- Bento 1: Daily Earnings Goal & Welcome -->
          \${user ? \`
            <div class="md:col-span-2 bento-card p-3.5 sm:p-4 bg-gradient-to-tr from-white via-blue-50/15 to-indigo-50/25 flex flex-col justify-between space-y-2.5">
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800/60">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-sky-400 animate-pulse"></span>
                    Cổng Khảo Sát Khả Dụng
                  </span>
                  <span class="text-[11px] text-slate-400 font-medium">Hạn mức rút tối thiểu: 100,000đ</span>
                </div>
                <h1 class="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight pt-0.5">
                  Chào \${user.name.split(' ').pop()}, bạn đang có <span class="text-blue-600 dark:text-sky-400 font-mono">\${curVnd.toLocaleString('vi-VN')}đ</span>
                </h1>
                <p class="text-xs text-slate-500 dark:text-slate-400">Chọn các bài khảo sát bên dưới để làm bài, tích điểm đổi thẻ cào hoặc rút tiền mặt về ngân hàng.</p>
              </div>

              <!-- Goal Progress Bar -->
              <div class="space-y-1">
                <div class="flex justify-between text-[11px] font-semibold">
                  <span class="text-slate-600 dark:text-slate-300">Tiến độ rút tiền mặt (100K):</span>
                  <span class="text-blue-600 dark:text-sky-400 font-mono font-bold">\${goalPercent}% (\${curVnd.toLocaleString()}đ / 100,000đ)</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-900/90 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-800">
                  <div class="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500" style="width: \${goalPercent}%"></div>
                </div>
              </div>

              <!-- Quick Action Row -->
              <div class="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div class="flex items-center space-x-3 font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                  <span class="flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3 text-emerald-500"></i> Duyệt tự động</span>
                  <span class="flex items-center gap-1"><i data-lucide="zap" class="w-3 h-3 text-amber-400"></i> Nhận điểm tức thì</span>
                </div>
                <button onclick="VibeApp.navigate('wallet')" class="font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 flex items-center gap-1 transition-colors text-xs">
                  <span>Vào ví rút tiền</span>
                  <i data-lucide="arrow-right" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
          \` : \`
            <div class="md:col-span-2 bento-card p-3.5 sm:p-4 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex flex-col justify-between space-y-2.5">
              <div>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md mb-1">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Nền Tảng Khảo Sát & Nghiên Cứu Thị Trường
                </span>
                <h1 class="text-base sm:text-lg font-black tracking-tight leading-snug">
                  Khám Phá Các Bài Khảo Sát & Đổi Thưởng
                </h1>
                <p class="text-xs text-blue-100 mt-0.5 max-w-lg leading-relaxed">
                  Xem trước nội dung câu hỏi bên dưới. Đăng ký tài khoản miễn phí để làm bài, nhận điểm quy đổi thẻ cào / tiền mặt, hoặc nhận 25 lượt tạo khảo sát free!
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <button onclick="VibeApp.openAuthModal('register')" class="px-3.5 py-1.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1">
                  <i data-lucide="gift" class="w-3.5 h-3.5 text-amber-500"></i>
                  <span>Đăng Ký Nhận 25 Lượt Free</span>
                </button>
                <button onclick="VibeApp.openAuthModal('login')" class="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all active:scale-95">
                  <span>Đăng Nhập Ngay</span>
                </button>
              </div>
            </div>
          \`}

          <!-- Bento 2: Featured Reward Voucher Highlight -->
          <div class="bento-card p-3.5 sm:p-4 bg-gradient-to-br from-amber-500/10 via-white to-amber-50/30 flex flex-col justify-between space-y-2 border-amber-200/60 dark:border-amber-800/50">
            <div>
              <div class="flex justify-between items-center text-xs">
                <span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] uppercase border border-transparent dark:border-amber-800/60">Voucher Hot</span>
                <span class="text-slate-400 font-mono text-[11px]">Shopee • Grab</span>
              </div>
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1 leading-snug">Đổi E-Voucher Quà Tặng</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">Dùng điểm thưởng đổi mã Highlands Coffee, Phúc Long, CGV, GrabFood.</p>
            </div>

            <div class="pt-1.5 border-t border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
              <span class="text-xs font-bold text-amber-800 dark:text-amber-300">Từ 1,500 Điểm</span>
              <button onclick="VibeApp.navigate('voucher-market')" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors">
                Xem Chợ Voucher
              </button>
            </div>
          </div>

        </div>

        <!-- ==================== THANH CÔNG CỤ LỌC TINH GỌN (UI/UX PRO MAX) ==================== -->
        <div class="bento-card p-3 sm:p-3.5 space-y-2.5">
          
          <!-- Hàng 1: Quick Filter Pills + Search Bar -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            
            <!-- Quick Pills (Tất cả, Thưởng cao, Làm nhanh, Dưới 3 câu, Voucher) -->
            <div class="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button onclick="VibeApp.setCategoryFilter('ALL')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap \${
                this.state.categoryFilter === 'ALL' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs dark:shadow-indigo-500/30' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                Tất cả (\${surveys.length})
              </button>

              <button onclick="VibeApp.setCategoryFilter('HIGH_REWARD')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap \${
                this.state.categoryFilter === 'HIGH_REWARD' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                💰 Thưởng cao (≥ 250đ)
              </button>

              <button onclick="VibeApp.setCategoryFilter('FAST')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap \${
                this.state.categoryFilter === 'FAST' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                ⚡ Làm nhanh (≤ 1p)
              </button>

              <button onclick="VibeApp.setCategoryFilter('FEW_QUESTIONS')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap \${
                this.state.categoryFilter === 'FEW_QUESTIONS' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                📝 Dưới 3 câu
              </button>

              <button onclick="VibeApp.setCategoryFilter('VOUCHER')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap \${
                this.state.categoryFilter === 'VOUCHER' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                🎁 Voucher Quà
              </button>
            </div>

            <!-- Search Input -->
            <div class="relative w-full md:w-64 shrink-0">
              <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none"></i>
              <input type="text" 
                     id="survey-search-input"
                     value="\${this.state.searchQuery}"
                     oninput="VibeApp.handleSearch(this.value)"
                     placeholder="Tìm kiếm đề tài..."
                     class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            </div>

          </div>

          <!-- Hàng 2: Custom Dropdowns (Sắp xếp, Số câu) + Toggle Ẩn bài đầy + View Switcher -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            
            <!-- Cụm bên trái: Custom Dropdowns sang trọng -->
            <div class="flex items-center gap-2">
              
              <!-- Custom Dropdown: Sắp xếp -->
              <div class="relative">
                <button type="button" onclick="VibeApp.toggleCustomDropdown('sort-dropdown-menu')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all">
                  <span class="text-slate-400 text-[11px] font-normal">Sắp xếp:</span>
                  <span id="sort-dropdown-label">\${currentSortLabel}</span>
                  <i data-lucide="chevron-down" class="dropdown-trigger-icon w-3.5 h-3.5 stroke-[2.2] transition-transform duration-200"></i>
                </button>

                <!-- Popover Menu Sắp Xếp -->
                <div id="sort-dropdown-menu" class="custom-dropdown-menu hidden absolute left-0 z-50 mt-1.5 min-w-[210px] p-1.5 rounded-2xl bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-xl space-y-0.5">
                  <div onclick="VibeApp.selectDropdownOption('sort', 'recommended', '🌟 Mặc định (Sắp đầy & Mới)')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.sortBy === 'recommended' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>🌟 Mặc định (Sắp đầy & Mới)</span>
                    \${this.state.sortBy === 'recommended' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('sort', 'reward_desc', '💰 Điểm thưởng cao nhất')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.sortBy === 'reward_desc' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>💰 Điểm thưởng cao nhất</span>
                    \${this.state.sortBy === 'reward_desc' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('sort', 'speed', '⚡ Tốc độ nhanh nhất')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.sortBy === 'speed' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>⚡ Tốc độ nhanh nhất</span>
                    \${this.state.sortBy === 'speed' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('sort', 'few_questions', '📝 Ít câu hỏi nhất')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.sortBy === 'few_questions' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>📝 Ít câu hỏi nhất</span>
                    \${this.state.sortBy === 'few_questions' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('sort', 'progress_desc', '🔥 Gần đủ suất nhất')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.sortBy === 'progress_desc' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>🔥 Gần đủ suất nhất</span>
                    \${this.state.sortBy === 'progress_desc' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                  <div onclick="VibeApp.selectDropdownOption('sort', 'newest', '⏱️ Mới nhất')" class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 \${this.state.sortBy === 'newest' ? 'text-blue-600 dark:text-sky-400 font-bold bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'}">
                    <span>⏱️ Mới nhất</span>
                    \${this.state.sortBy === 'newest' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-600 dark:text-sky-400"></i>' : ''}
                  </div>
                </div>
              </div>

              <!-- Custom Dropdown: Số câu hỏi -->
              <div class="relative">
                <button type="button" onclick="VibeApp.toggleCustomDropdown('length-dropdown-menu')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all">
                  <span class="text-slate-400 text-[11px] font-normal">Số câu:</span>
                  <span id="length-dropdown-label">\${currentLengthLabel}</span>
                  <i data-lucide="chevron-down" class="dropdown-trigger-icon w-3.5 h-3.5 stroke-[2.2] transition-transform duration-200"></i>
                </button>

                <!-- Popover Menu Số Câu -->
                <div id="length-dropdown-menu" class="custom-dropdown-menu hidden absolute left-0 z-50 mt-1.5 min-w-[150px] p-1.5 rounded-2xl bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-xl space-y-0.5">
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
                </div>
              </div>

            </div>

            <!-- Cụm bên phải: Toggle Ẩn bài đầy & View Switcher -->
            <div class="flex items-center gap-2">
              
              <!-- Toggle Ẩn bài đã xong / đủ mẫu -->
              <button onclick="VibeApp.toggleHideFinished()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all \${
                this.state.hideFinished 
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-800/60' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
              }" title="Tự động ẩn các bài đã thu thập đủ mẫu hoặc bạn đã hoàn thành">
                <i data-lucide="\${this.state.hideFinished ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5"></i>
                <span>\${this.state.hideFinished ? 'Đang ẩn bài đầy/đã làm' : 'Hiện cả bài đã đầy'}</span>
              </button>

              <!-- View Switcher (Grid 4 cột vs List 1 dòng) -->
              <div class="flex items-center bg-slate-100 dark:bg-slate-800/70 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button onclick="VibeApp.setViewMode('grid')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 \${
                  this.state.viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }" title="Dạng Lưới Tinh Gọn (4 Cột)">
                  <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>
                  <span class="hidden sm:inline">Lưới</span>
                </button>
                <button onclick="VibeApp.setViewMode('list')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 \${
                  this.state.viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }" title="Dạng Danh Sách 1 Dòng (Xem Được Nhiều Bài Nhất)">
                  <i data-lucide="list" class="w-3.5 h-3.5"></i>
                  <span class="hidden sm:inline">Danh sách</span>
                </button>
              </div>

            </div>

          </div>

        </div>

        <!-- ==================== KHU VỰC KHẢO SÁT CHÍNH ==================== -->
        <div class="surveys-grid-section">
          \${this._renderSurveysContentHtml(pinnedSurveys, normalSurveys)}
        </div>

      </div>
    \`;

    if (window.lucide) window.lucide.createIcons();
  },`;

const startIdx = appCode.indexOf(oldRenderBlockStart);
const endIdx = appCode.indexOf(oldRenderBlockEnd);
if (startIdx !== -1 && endIdx !== -1) {
  // Thay thế khối cũ bằng customDropdownsCode
  const before = appCode.substring(0, startIdx);
  const after = appCode.substring(endIdx);
  appCode = before + customDropdownsCode + '\n\n  ' + after;
  console.log('✅ Đã ghép thành công Custom Dropdown & Render block vào public/app.js');
} else {
  console.error('Không tìm thấy token render trong app.js', { startIdx, endIdx });
}

fs.writeFileSync('public/app.js', appCode, 'utf8');
console.log('✅ Hoàn tất cập nhật public/app.js!');
