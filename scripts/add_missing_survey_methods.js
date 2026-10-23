const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

const missingMethods = `
  processSurveysList(surveys) {
    const filtered = this.filterSurveys(surveys || []);
    let pinnedSurveys = filtered.filter(s => s.is_pinned === 1 || s.is_featured === 1);
    let normalSurveys = filtered.filter(s => !(s.is_pinned === 1 || s.is_featured === 1));

    pinnedSurveys = this.sortSurveysList(pinnedSurveys, false);
    normalSurveys = this.sortSurveysList(normalSurveys, true);

    return { pinnedSurveys, normalSurveys };
  },

  _renderSurveysContentHtml(pinnedList = [], normalList = []) {
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
        
        <!-- SECTION 1: CỐ ĐỊNH TRÊN ĐẦU - KHẢO SÁT ĐƯỢC GHIM -->
        \${pinnedList.length > 0 ? \`
          <div class="rounded-2xl border border-amber-300/80 dark:border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3 sm:p-4 space-y-2.5 shadow-2xs">
            
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

        <!-- SECTION 2: TẤT CẢ KHẢO SÁT KHẢ DỤNG -->
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

        <div class="w-full sm:w-36 shrink-0 space-y-1">
          <div class="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>\${collected}/\${target}</span>
            <span class="font-mono \${isNearFull ? 'text-rose-600 font-bold' : ''}">\${progress}%</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-900/90 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full \${isNearFull ? 'bg-rose-500' : 'bg-blue-600'}" style="width: \${progress}%"></div>
          </div>
        </div>

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
    let list = [...(surveys || [])];
    const cat = this.state.categoryFilter;
    const len = this.state.lengthFilter;
    const q = this.state.searchQuery.toLowerCase().trim();

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

    if (cat === 'HIGH_REWARD') {
      list = list.filter(s => (s.reward_points_per_response || 0) >= 250);
    } else if (cat === 'FAST') {
      list = list.filter(s => (s.min_completion_time_sec || 60) <= 60);
    } else if (cat === 'FEW_QUESTIONS') {
      list = list.filter(s => (s.question_count || 1) <= 3);
    } else if (cat === 'VOUCHER') {
      list = list.filter(s => !!(s.sponsor_brand_name || s.sponsor_voucher_title || s.reward_mode === 'VOUCHER_ONLY'));
    }

    if (len === 'SHORT') {
      list = list.filter(s => (s.question_count || 1) <= 3);
    } else if (len === 'MEDIUM') {
      list = list.filter(s => (s.question_count || 1) >= 4 && (s.question_count || 1) <= 7);
    } else if (len === 'LONG') {
      list = list.filter(s => (s.question_count || 1) >= 8);
    }

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
    const list = [...(surveys || [])];
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
`;

// Chèn trước resetAllFilters()
const targetToken = '  resetAllFilters() {';
if (code.includes(targetToken)) {
  code = code.replace(targetToken, missingMethods + '\n' + targetToken);
  fs.writeFileSync('public/app.js', code, 'utf8');
  console.log('✅ Đã bổ sung đầy đủ processSurveysList và toàn bộ methods phụ trợ vào app.js');
} else {
  console.error('Không tìm thấy targetToken trong app.js');
}
