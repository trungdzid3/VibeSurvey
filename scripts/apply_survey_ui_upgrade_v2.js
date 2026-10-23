const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

const newSurveyBlock = `  async renderSurveysView(root) {
    // 1. Luôn fetch dữ liệu mới nhất từ backend API
    try {
      const res = await this.api('/surveys');
      this.state.surveys = res.surveys || [];
    } catch (err) {
      console.warn('Không thể nạp danh sách khảo sát mới:', err.message);
      if (!this.state.surveys) this.state.surveys = [];
    }

    const surveys = this.state.surveys;
    const user = this.state.currentUser;
    const curPoints = user ? user.point_balance : 0;
    const curVnd = curPoints * 10;
    const minPayoutVnd = 100000;
    const goalPercent = Math.min(100, Math.round((curVnd / minPayoutVnd) * 100));

    // Thống kê nhanh
    const pinnedCount = surveys.filter(s => s.is_pinned === 1 || s.is_featured === 1).length;
    const nearFullCount = surveys.filter(s => {
      const col = s.collected_responses || 0;
      const tar = s.target_responses || 100;
      return (col / tar) >= 0.6 && col < tar;
    }).length;

    // Lọc & Phân nhóm
    const { pinnedSurveys, normalSurveys } = this.processSurveysList(surveys);

    root.innerHTML = \`
      <div class="space-y-4 sm:space-y-4.5">
        
        <!-- ==================== BENTO DASHBOARD HEADER (TINH GỌN PRO MAX) ==================== -->
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

        <!-- ==================== THANH CÔNG CỤ LỌC TINH GỌN (CLEAN FOCUSED TOOLBAR) ==================== -->
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

          <!-- Hàng 2: Sắp Xếp + Lọc Số Câu + Toggle Ẩn Bài Xong + View Switcher -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            
            <!-- Cụm bên trái: Sắp xếp & Số câu -->
            <div class="flex items-center gap-2">
              
              <!-- Dropdown Sắp xếp -->
              <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-xl">
                <span class="text-slate-400 text-[11px] font-semibold whitespace-nowrap">Sắp xếp:</span>
                <select onchange="VibeApp.setSortBy(this.value)" class="bg-transparent text-slate-700 dark:text-slate-200 font-bold focus:outline-none cursor-pointer text-xs">
                  <option value="recommended" \${this.state.sortBy === 'recommended' ? 'selected' : ''}>🌟 Mặc định (Sắp đầy & Mới nhất)</option>
                  <option value="reward_desc" \${this.state.sortBy === 'reward_desc' ? 'selected' : ''}>💰 Điểm thưởng cao nhất</option>
                  <option value="speed" \${this.state.sortBy === 'speed' ? 'selected' : ''}>⚡ Tốc độ nhanh nhất</option>
                  <option value="few_questions" \${this.state.sortBy === 'few_questions' ? 'selected' : ''}>📝 Ít câu hỏi nhất</option>
                  <option value="progress_desc" \${this.state.sortBy === 'progress_desc' ? 'selected' : ''}>🔥 Gần đủ suất nhất</option>
                  <option value="newest" \${this.state.sortBy === 'newest' ? 'selected' : ''}>⏱️ Mới nhất</option>
                </select>
              </div>

              <!-- Dropdown Số câu hỏi -->
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-xl">
                <span class="text-slate-400 text-[11px] font-semibold whitespace-nowrap">Số câu:</span>
                <select onchange="VibeApp.setLengthFilter(this.value)" class="bg-transparent text-slate-700 dark:text-slate-200 font-bold focus:outline-none cursor-pointer text-xs">
                  <option value="ALL" \${this.state.lengthFilter === 'ALL' ? 'selected' : ''}>Tất cả</option>
                  <option value="SHORT" \${this.state.lengthFilter === 'SHORT' ? 'selected' : ''}>1 - 3 câu</option>
                  <option value="MEDIUM" \${this.state.lengthFilter === 'MEDIUM' ? 'selected' : ''}>4 - 7 câu</option>
                  <option value="LONG" \${this.state.lengthFilter === 'LONG' ? 'selected' : ''}>≥ 8 câu</option>
                </select>
              </div>

            </div>

            <!-- Cụm bên phải: Toggle Ẩn bài đầy & View Switcher -->
            <div class="flex items-center gap-2">
              
              <!-- Toggle Ẩn bài đã xong / đủ mẫu -->
              <button onclick="VibeApp.toggleHideFinished()" class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all \${
                this.state.hideFinished 
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-800/60' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
              }" title="Tự động ẩn các bài đã thu thập đủ mẫu hoặc bạn đã hoàn thành">
                <i data-lucide="\${this.state.hideFinished ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5"></i>
                <span>\${this.state.hideFinished ? 'Đang ẩn bài đầy/đã làm' : 'Hiện cả bài đã đầy'}</span>
              </button>

              <!-- View Switcher (Grid 4 cột vs List 1 dòng) -->
              <div class="flex items-center bg-slate-100 dark:bg-slate-800/70 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button onclick="VibeApp.setViewMode('grid')" class="px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 \${
                  this.state.viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }" title="Dạng Lưới Tinh Gọn (4 Cột)">
                  <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>
                  <span class="hidden sm:inline">Lưới</span>
                </button>
                <button onclick="VibeApp.setViewMode('list')" class="px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 \${
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
  },

  /**
   * Phân tách danh sách khảo sát:
   * 1. Nhóm Ghim (Pinned): CỐ ĐỊNH Ở TRÊN ĐẦU, tự động sắp xếp theo tiêu chí người dùng chọn
   * 2. Nhóm Thường (Normal): Ở bên dưới, ưu tiên bài gần đầy (>= 60%), tự động sắp xếp theo tiêu chí người dùng chọn
   */
  processSurveysList(surveys) {
    // Lọc theo điều kiện tìm kiếm và bộ lọc
    const filtered = this.filterSurveys(surveys);

    // 1. Tách nhóm Pinned và Normal
    let pinnedSurveys = filtered.filter(s => s.is_pinned === 1 || s.is_featured === 1);
    let normalSurveys = filtered.filter(s => !(s.is_pinned === 1 || s.is_featured === 1));

    // 2. Sắp xếp độc lập cho từng nhóm theo tiêu chí người dùng đã chọn
    pinnedSurveys = this.sortSurveysList(pinnedSurveys, false);
    normalSurveys = this.sortSurveysList(normalSurveys, true); // true = ưu tiên bài gần đầy lên đầu nhóm thường

    return { pinnedSurveys, normalSurveys };
  },

  _renderSurveysContentHtml(pinnedList, normalList) {
    const totalCount = pinnedList.length + normalList.length;

    if (totalCount === 0) {
      return \`
        <div class="bento-card p-10 text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <i data-lucide="inbox" class="w-6 h-6 stroke-[2]"></i>
          </div>
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Không tìm thấy khảo sát phù hợp</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">Thử chọn bộ lọc khác, tắt ẩn bài đã xong hoặc nhập từ khóa tìm kiếm chung.</p>
          <button onclick="VibeApp.resetAllFilters()" class="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
            Xem lại tất cả bài khảo sát
          </button>
        </div>
      \`;
    }

    const isListView = this.state.viewMode === 'list';

    return \`
      <div class="space-y-4">
        
        <!-- ==================== SECTION 1: CỐ ĐỊNH TRÊN ĐẦU - KHẢO SÁT ĐƯỢC GHIM ==================== -->
        \${pinnedList.length > 0 ? \`
          <div class="rounded-2xl border border-amber-300/80 dark:border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3 sm:p-4 space-y-2.5 shadow-2xs">
            
            <!-- Header Section Ghim -->
            <div class="flex items-center justify-between pb-1 border-b border-amber-200/60 dark:border-amber-800/40">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <i data-lucide="pin" class="w-3.5 h-3.5 stroke-[2.5]"></i>
                </span>
                <div class="flex items-center gap-2">
                  <h3 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Khảo Sát Được Ghim & Nổi Bật
                  </h3>
                  <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] uppercase">
                    VIP Cố Định
                  </span>
                </div>
              </div>
              <span class="text-xs text-amber-700 dark:text-amber-400 font-bold font-mono">\${pinnedList.length} bài</span>
            </div>

            <!-- Content Pinned -->
            \${isListView ? \`
              <div class="space-y-2">
                \${pinnedList.map(s => this.renderListSurveyRow(s, true)).join('')}
              </div>
            \` : \`
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
                \${pinnedList.map(s => this.renderCompactSurveyCard(s, true)).join('')}
              </div>
            \`}
          </div>
        \` : ''}

        <!-- ==================== SECTION 2: TẤT CẢ KHẢO SÁT KHẢ DỤNG ==================== -->
        \${normalList.length > 0 ? \`
          <div class="space-y-2.5">
            \${pinnedList.length > 0 ? \`
              <div class="flex items-center justify-between px-1 pt-1">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                  <h3 class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    Khảo Sát Khả Dụng (\${normalList.length} bài)
                  </h3>
                </div>
                <span class="text-[11px] text-slate-400">Các bài gần hết suất được ưu tiên lên đầu</span>
              </div>
            \` : ''}

            <!-- Content Normal -->
            \${isListView ? \`
              <div class="space-y-2">
                \${normalList.map(s => this.renderListSurveyRow(s, false)).join('')}
              </div>
            \` : \`
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
                \${normalList.map(s => this.renderCompactSurveyCard(s, false)).join('')}
              </div>
            \`}
          </div>
        \` : ''}

      </div>
    \`;
  },

  renderCompactSurveyCard(s, isPinned = false) {
    const user = this.state.currentUser;
    const isCompleted = s.user_response_status === 'VALIDATED';
    const collected = s.collected_responses || 0;
    const target = s.target_responses || 100;
    const progress = Math.min(100, Math.round((collected / target) * 100));
    const remainingSlots = Math.max(0, target - collected);
    const isNearFull = progress >= 60 && remainingSlots > 0;

    // Nguồn biểu mẫu
    let sourceText = 'Nội Bộ';
    let sourceIcon = 'file-text';
    if (s.survey_source === 'GOOGLE_FORMS') { sourceText = 'Google Forms'; sourceIcon = 'external-link'; }
    else if (s.survey_source === 'MS_FORMS') { sourceText = 'MS Forms'; sourceIcon = 'external-link'; }

    const questionCount = s.question_count || 1;
    const minMins = Math.max(1, Math.ceil((s.min_completion_time_sec || 30) / 60));
    const hasVoucher = !!(s.sponsor_brand_name || s.sponsor_voucher_title);
    const voucherText = s.sponsor_voucher_title || (s.sponsor_brand_name ? \`Voucher \${s.sponsor_brand_name}\` : '');

    return \`
      <div class="bento-card p-3 sm:p-3.5 flex flex-col justify-between space-y-2.5 transition-all hover:border-blue-400/80 dark:hover:border-indigo-500/70 \${
        isPinned ? 'ring-1 ring-amber-400/50 dark:ring-amber-500/40 bg-amber-500/[0.03]' : ''
      }">
        
        <div class="space-y-2">
          
          <!-- Hàng Badge Top: Nguồn, Thời gian, Số câu, Huy hiệu Ghim / FOMO -->
          <div class="flex items-center justify-between gap-1 text-[11px]">
            <div class="flex items-center gap-1 overflow-hidden">
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold text-[10px] truncate">
                <i data-lucide="\${sourceIcon}" class="w-2.5 h-2.5 stroke-[2.2]"></i>
                <span>\${sourceText}</span>
              </span>
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold text-[10px]">
                <i data-lucide="clock" class="w-2.5 h-2.5"></i>
                ~\${minMins}p
              </span>
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold text-[10px]">
                \${questionCount} câu
              </span>
            </div>

            <!-- Huy hiệu Ghim / FOMO -->
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

          <!-- Tiêu đề & Mô tả gọn gàng -->
          <div>
            <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer" onclick="\${user ? \`VibeApp.startSurveySession('\${s.id}')\` : \`VibeApp.openSurveyPreviewModal('\${s.id}')\`}">
              \${s.title}
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 leading-relaxed">
              \${s.description || 'Khảo sát nghiên cứu trải nghiệm và thói quen tiêu dùng.'}
            </p>
          </div>

          <!-- Voucher Badge if any -->
          \${hasVoucher ? \`
            <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold truncate max-w-full">
              <i data-lucide="gift" class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0"></i>
              <span class="truncate">\${voucherText}</span>
            </div>
          \` : ''}

          <!-- Thanh tiến độ mẫu siêu mảnh -->
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

        <!-- Chân thẻ: Điểm thưởng & Nút Làm Bài gọn gàng -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            \${s.reward_mode === 'VOUCHER_ONLY' ? \`
              <div class="text-xs font-black text-amber-600 dark:text-amber-400">Voucher 0đ</div>
            \` : \`
              <div class="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono leading-none">
                +\${(s.reward_points_per_response || 0).toLocaleString()} Điểm
              </div>
              <div class="text-[10px] text-slate-400 font-mono mt-0.5">
                ≈ \${((s.reward_points_per_response || 0) * 10).toLocaleString()}đ
              </div>
            \`}
          </div>

          \${isCompleted ? \`
            <span class="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1">
              <i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>
              <span>Đã nhận</span>
            </span>
          \` : user ? \`
            <button onclick="VibeApp.startSurveySession('\${s.id}')" class="h-8 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
              <span>Làm bài</span>
              <i data-lucide="arrow-right" class="w-3 h-3 stroke-[2.2]"></i>
            </button>
          \` : \`
            <div class="flex items-center gap-1">
              <button onclick="VibeApp.openSurveyPreviewModal('\${s.id}')" class="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1 active:scale-95" title="Xem trước">
                <i data-lucide="eye" class="w-3 h-3"></i>
                <span class="hidden sm:inline">Xem</span>
              </button>
              <button onclick="VibeApp.openAuthModal('login')" class="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
                <span>Làm bài</span>
                <i data-lucide="arrow-right" class="w-3 h-3 stroke-[2.2]"></i>
              </button>
            </div>
          \`}
        </div>

      </div>
    \`;
  },

  renderListSurveyRow(s, isPinned = false) {
    const user = this.state.currentUser;
    const isCompleted = s.user_response_status === 'VALIDATED';
    const collected = s.collected_responses || 0;
    const target = s.target_responses || 100;
    const progress = Math.min(100, Math.round((collected / target) * 100));
    const remainingSlots = Math.max(0, target - collected);
    const isNearFull = progress >= 60 && remainingSlots > 0;

    const questionCount = s.question_count || 1;
    const minMins = Math.max(1, Math.ceil((s.min_completion_time_sec || 30) / 60));

    return \`
      <div class="bento-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-blue-400 \${
        isPinned ? 'ring-1 ring-amber-400/50 dark:ring-amber-500/40 bg-amber-500/[0.03]' : ''
      }">
        
        <!-- Cột 1: Thông tin chính -->
        <div class="space-y-1 min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            \${isPinned ? \`
              <span class="px-1.5 py-0.5 rounded bg-amber-500 text-white font-extrabold text-[10px] flex items-center gap-0.5">
                <i data-lucide="pin" class="w-2.5 h-2.5 stroke-[3]"></i>
                <span>Ghim</span>
              </span>
            \` : ''}
            \${isNearFull ? \`
              <span class="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold text-[10px]">
                🔥 Còn \${remainingSlots} suất
              </span>
            \` : ''}
            <span class="text-[10px] font-semibold text-slate-400">~\${minMins} phút • \${questionCount} câu</span>
          </div>

          <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-sky-400" onclick="\${user ? \`VibeApp.startSurveySession('\${s.id}')\` : \`VibeApp.openSurveyPreviewModal('\${s.id}')\`}">
            \${s.title}
          </h4>
        </div>

        <!-- Cột 2: Tiến độ mẫu mini -->
        <div class="w-full sm:w-36 shrink-0 space-y-1">
          <div class="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>\${collected}/\${target}</span>
            <span class="font-mono \${isNearFull ? 'text-rose-600 font-bold' : ''}">\${progress}%</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-900/90 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full \${isNearFull ? 'bg-rose-500' : 'bg-blue-600'}" style="width: \${progress}%"></div>
          </div>
        </div>

        <!-- Cột 3: Phần thưởng & Nút -->
        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div class="text-right">
            <div class="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
              +\${(s.reward_points_per_response || 0).toLocaleString()} Điểm
            </div>
            <div class="text-[10px] text-slate-400 font-mono">
              ≈ \${((s.reward_points_per_response || 0) * 10).toLocaleString()}đ
            </div>
          </div>

          \${isCompleted ? \`
            <span class="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-xs font-bold">
              Đã nhận
            </span>
          \` : user ? \`
            <button onclick="VibeApp.startSurveySession('\${s.id}')" class="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
              <span>Làm bài</span>
              <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </button>
          \` : \`
            <button onclick="VibeApp.openAuthModal('login')" class="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
              <span>Làm bài</span>
              <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </button>
          \`}
        </div>

      </div>
    \`;
  },

  filterSurveys(surveys) {
    let list = [...surveys];
    const cat = this.state.categoryFilter;
    const len = this.state.lengthFilter;
    const q = this.state.searchQuery.toLowerCase().trim();

    // 1. Tự động ẩn khảo sát đã đủ 100% mẫu hoặc người dùng đã nhận thưởng
    if (this.state.hideFinished) {
      list = list.filter(s => {
        const col = s.collected_responses || 0;
        const tar = s.target_responses || 100;
        const isFull = col >= tar;
        const isClosed = s.status === 'COMPLETED' || s.status === 'CLOSED';
        const isUserDone = s.user_response_status === 'VALIDATED';
        return !isFull && !isClosed && !isUserDone;
      });
    }

    // 2. Lọc theo danh mục nhanh (Pills)
    if (cat === 'HIGH_REWARD') {
      list = list.filter(s => (s.reward_points_per_response || 0) >= 250);
    } else if (cat === 'FAST') {
      list = list.filter(s => (s.min_completion_time_sec || 60) <= 60);
    } else if (cat === 'FEW_QUESTIONS') {
      list = list.filter(s => (s.question_count || 1) <= 3);
    } else if (cat === 'VOUCHER') {
      list = list.filter(s => !!(s.sponsor_brand_name || s.sponsor_voucher_title || s.reward_mode === 'VOUCHER_ONLY'));
    }

    // 3. Lọc theo số câu hỏi
    if (len === 'SHORT') {
      list = list.filter(s => (s.question_count || 1) <= 3);
    } else if (len === 'MEDIUM') {
      list = list.filter(s => (s.question_count || 1) >= 4 && (s.question_count || 1) <= 7);
    } else if (len === 'LONG') {
      list = list.filter(s => (s.question_count || 1) >= 8);
    }

    // 4. Tìm kiếm từ khóa
    if (q) {
      list = list.filter(s => {
        const title = (s.title || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const catName = (s.category || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || catName.includes(q);
      });
    }

    return list;
  },

  sortSurveysList(surveys, prioritizeNearFull = false) {
    const list = [...surveys];
    const sort = this.state.sortBy;

    if (sort === 'reward_desc') {
      list.sort((a, b) => (b.reward_points_per_response || 0) - (a.reward_points_per_response || 0));
    } else if (sort === 'speed') {
      list.sort((a, b) => (a.min_completion_time_sec || 60) - (b.min_completion_time_sec || 60));
    } else if (sort === 'few_questions') {
      list.sort((a, b) => (a.question_count || 1) - (b.question_count || 1));
    } else if (sort === 'progress_desc') {
      list.sort((a, b) => {
        const progA = (a.collected_responses || 0) / (a.target_responses || 1);
        const progB = (b.collected_responses || 0) / (b.target_responses || 1);
        return progB - progA;
      });
    } else if (sort === 'newest') {
      // Giữ nguyên order
    } else {
      // Mặc định: 'recommended'
      list.sort((a, b) => {
        if (prioritizeNearFull) {
          const progA = (a.collected_responses || 0) / (a.target_responses || 1);
          const progB = (b.collected_responses || 0) / (b.target_responses || 1);
          const nearFullA = (progA >= 0.6 && progA < 1.0) ? 1 : 0;
          const nearFullB = (progB >= 0.6 && progB < 1.0) ? 1 : 0;
          if (nearFullB !== nearFullA) return nearFullB - nearFullA;
        }

        return (b.reward_points_per_response || 0) - (a.reward_points_per_response || 0);
      });
    }

    return list;
  },

  setCategoryFilter(cat) {
    this.haptic('light');
    this.state.categoryFilter = cat;
    this._updateSurveyGrid();
  },

  setSortBy(sort) {
    this.haptic('light');
    this.state.sortBy = sort;
    this._updateSurveyGrid();
  },

  setLengthFilter(len) {
    this.haptic('light');
    this.state.lengthFilter = len;
    this._updateSurveyGrid();
  },

  toggleHideFinished() {
    this.haptic('light');
    this.state.hideFinished = !this.state.hideFinished;
    this.renderSurveysView(document.getElementById('app-root'));
  },

  setViewMode(mode) {
    this.haptic('light');
    this.state.viewMode = mode;
    this._updateSurveyGrid();
  },

  handleSearch(query) {
    this.state.searchQuery = query;
    clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(() => {
      this._updateSurveyGrid();
    }, 150);
  },

  _updateSurveyGrid() {
    const root = document.getElementById('app-root');
    if (!root) return;
    const gridSection = root.querySelector('.surveys-grid-section');
    if (!gridSection) {
      this.renderSurveysView(root);
      return;
    }

    const surveys = this.state.surveys || [];
    const { pinnedSurveys, normalSurveys } = this.processSurveysList(surveys);

    gridSection.innerHTML = this._renderSurveysContentHtml(pinnedSurveys, normalSurveys);
    if (window.lucide) window.lucide.createIcons();
  },

  resetAllFilters() {
    this.state.categoryFilter = 'ALL';
    this.state.lengthFilter = 'ALL';
    this.state.searchQuery = '';
    this.state.sortBy = 'recommended';
    this.state.hideFinished = false;
    this.renderSurveysView(document.getElementById('app-root'));
  },`;

// Tìm vị trí bắt đầu của renderSurveysView(root) và kết thúc của resetAllFilters()
const startToken = 'renderSurveysView(root) {';
const endToken = 'resetAllFilters() {';

const startIndex = code.indexOf(startToken);
const endIndex = code.indexOf(endToken);

if (startIndex === -1 || endIndex === -1) {
  console.error('Tokens not found!', { startIndex, endIndex });
  process.exit(1);
}

const closeIndex = code.indexOf('},', endIndex);
if (closeIndex === -1) {
  console.error('Close token not found!');
  process.exit(1);
}

const before = code.substring(0, startIndex);
const after = code.substring(closeIndex + 2);

const finalCode = before + newSurveyBlock + after;
fs.writeFileSync('public/app.js', finalCode, 'utf8');
console.log('✅ Đã cập nhật thành công public/app.js theo yêu cầu UI/UX Pro Max!');
