/**
 * VibeSurvey - High-End Modern SaaS & Survey Rewards Platform
 * Phong cách: Linear / Stripe / Raycast (Sang trọng, Bento Grid, có chiều sâu thị giác)
 */

const VibeApp = {
  state: {
    token: localStorage.getItem('vibesurvey_token') || null,
    currentUser: null,
    currentTab: 'surveys',
    categoryFilter: 'ALL',
    searchQuery: '',
    hideFinished: true, // Tự động ẩn khảo sát đã đủ 100% mẫu hoặc người dùng đã nhận thưởng
    viewMode: 'grid', // 'grid' (Lưới 4 cột compact) | 'list' (Danh sách 1 dòng siêu gọn)
    sortBy: 'recommended', // 'recommended' | 'reward_desc' | 'reward_asc' | 'speed' | 'few_questions' | 'progress_desc' | 'newest'
    lengthFilter: 'ALL', // 'ALL' | 'SHORT' (1-3 câu) | 'MEDIUM' (4-7 câu) | 'LONG' (>= 8 câu)
    speedFilter: 'ALL', // 'ALL' | 'FAST_1M' (<= 1p) | 'FAST_3M' (<= 3p)
    rewardTierFilter: 'ALL', // 'ALL' | 'TIER_LOW' (< 150) | 'TIER_MID' (150-299) | 'TIER_HIGH' (>= 300)
    surveys: [],
    creatorSurveys: [],
    voucherCatalog: [],
    myVouchers: [],
    wallet: null,
    transactions: [],
    activeSession: null,
  },

  // ==================== HTTP CLIENT ====================
  async api(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (this.state.token) {
      headers['Authorization'] = `Bearer ${this.state.token}`;
    }

    try {
      const res = await fetch('/api/v1' + endpoint, { ...options, headers });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        if (!res.ok) {
          throw new Error(`Máy chủ đang cập nhật (${res.status}). Vui lòng tải lại trang sau giây lát.`);
        }
        throw new Error('Định dạng phản hồi không hợp lệ từ máy chủ');
      }
      if (!res.ok) throw new Error(data.message || 'Yêu cầu không thành công');
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  haptic(type = 'light') {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      if (type === 'success') window.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' }).catch(() => {});
      else window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' }).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate(type === 'success' ? [25, 35, 25] : 15);
    }
  },

  getDeviceFingerprint() {
    return 'browser_' + btoa(navigator.userAgent + '_' + screen.width + 'x' + screen.height).slice(0, 32);
  },

  // ==================== QUẢN LÝ GIAO DIỆN SÁNG / TỐI (THEME) ====================
  initTheme() {
    const saved = localStorage.getItem('vibesurvey_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    this.updateThemeIcon(isDark);
  },

  toggleTheme() {
    this.haptic('light');

    // Chặn triệt để giật/lag (jank) bằng kỹ thuật disable transitions tức thì trong 1 frame
    const styleBlock = document.createElement('style');
    styleBlock.textContent = '*, *::before, *::after { transition: none !important; }';
    document.head.appendChild(styleBlock);

    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('vibesurvey_theme', isDark ? 'dark' : 'light');
    
    this.updateThemeIcon(isDark);

    // Bật lại transitions mượt mà ở frame tiếp theo sau khi theme đã được cập nhật 0ms
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (styleBlock.parentNode) {
          styleBlock.parentNode.removeChild(styleBlock);
        }
      });
    });
  },

  updateThemeIcon(isDark) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = `<i id="theme-icon" data-lucide="${isDark ? 'sun' : 'moon'}" class="w-4 h-4 stroke-[2.2]"></i>`;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        // Chỉ quét duy nhất nút theme thay vì quét toàn bộ cây DOM
        window.lucide.createIcons({ root: btn });
      }
    }
  },

  // ==================== KHỞI TẠO ====================
  async init() {
    this.initTheme();

    // Đóng User Dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('user-profile-dropdown');
      const btn = document.getElementById('user-profile-btn');
      if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const searchInput = document.getElementById('survey-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Phím tắt trong Stepper Survey
      if (this.state.currentTab === 'take-survey' && this.state.activeSession) {
        const session = this.state.activeSession;
        const curQ = session.questions[session.currentIndex];
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

        if (curQ && curQ.options && /^[1-9]$/.test(e.key)) {
          const optIdx = parseInt(e.key, 10) - 1;
          if (optIdx < curQ.options.length) {
            e.preventDefault();
            const opt = curQ.options[optIdx];
            this.selectSingleOption(curQ.id, encodeURIComponent(opt));
          }
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          const nextBtn = document.getElementById('stepper-next-btn');
          if (nextBtn && !nextBtn.disabled) nextBtn.click();
        }
      }
    });

    // Xử lý URL parameters khi Google OAuth Callback trả về
    const urlParams = new URLSearchParams(window.location.search);
    const googleToken = urlParams.get('token');
    const authError = urlParams.get('error');
    const googleConfigNeeded = urlParams.get('google_auth_config');

    if (googleToken) {
      this.state.token = googleToken;
      localStorage.setItem('vibesurvey_token', googleToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      this.showToast('Đăng nhập Google chính thức thành công!', 'success');
    } else if (authError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      this.showToast(decodeURIComponent(authError), 'error');
    } else if (googleConfigNeeded) {
      window.history.replaceState({}, document.title, window.location.pathname);
      this.showGoogleConfigGuideModal();
    }

    // Khởi tạo trạng thái phiên làm việc thực
    if (this.state.token) {
      try {
        const meRes = await this.api('/auth/me');
        if (meRes.success && meRes.user) {
          this.state.currentUser = meRes.user;
          this.applyUserInterface();
          this.checkDeepLinkSurvey();
          return;
        }
      } catch (e) {
        console.warn('Phiên đăng nhập đã hết hạn');
        this.state.token = null;
        localStorage.removeItem('vibesurvey_token');
      }
    }

    // Nếu chưa đăng nhập: Hiển thị giao diện khách
    this.applyGuestInterface();
    this.checkDeepLinkSurvey();
  },

  /**
   * Kiểm tra và phân tích Deep-link khảo sát từ Email / Thông báo
   * Hỗ trợ các định dạng URL: ?survey={id}, ?surveyId={id}, hoặc #survey-{id}
   */
  checkDeepLinkSurvey() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetSurveyId = urlParams.get('survey') || urlParams.get('surveyId') || (window.location.hash.startsWith('#survey-') ? window.location.hash.replace('#survey-', '') : null);
      if (targetSurveyId) {
        // Làm sạch URL hiển thị trên thanh địa chỉ nhưng vẫn giữ ngữ cảnh
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        setTimeout(() => {
          this.handleDeepLinkSurvey(targetSurveyId);
        }, 350);
      }
    } catch (err) {
      console.warn('Lỗi phân tích Deep-link khảo sát:', err);
    }
  },

  /**
   * Xử lý chuyển thẳng vào bài khảo sát khi click từ Email thông báo
   */
  async handleDeepLinkSurvey(surveyId) {
    if (!surveyId) return;
    this.haptic('medium');

    // Nếu người dùng đã đăng nhập: Chuyển thẳng vào làm bài khảo sát (Stepper Zen Focus)
    if (this.state.currentUser) {
      this.showToast('Đang chuyển bạn đến bài khảo sát từ email thông báo...', 'info');
      await this.startSurveySession(surveyId);
      return;
    }

    // Nếu là khách chưa đăng nhập:
    // Lưu pendingSurveyId, mở Modal xem trước khảo sát đầy đủ thông tin & thù lao hấp dẫn
    this.state.pendingSurveyId = surveyId;
    this.showToast('Vui lòng đăng nhập để bắt đầu làm khảo sát này và nhận điểm thưởng!', 'info');
    await this.openSurveyPreviewModal(surveyId);
  },

  applyGuestInterface() {
    this.state.currentUser = null;
    this.state.token = null;

    const balancePill = document.getElementById('user-balance-pill');
    const createBtn = document.getElementById('header-create-btn');
    const userProfileMenu = document.getElementById('user-profile-menu');
    const guestAuthActions = document.getElementById('guest-auth-actions');

    if (balancePill) balancePill.classList.add('hidden');
    if (createBtn) createBtn.style.display = 'none';
    if (userProfileMenu) userProfileMenu.classList.add('hidden');
    if (guestAuthActions) guestAuthActions.classList.remove('hidden');

    this.renderNavigation();
    if (['creator-surveys', 'wallet', 'admin-overview', 'admin-payouts', 'admin-fraud'].includes(this.state.currentTab)) {
      this.state.currentTab = 'surveys';
    }
    this.navigate(this.state.currentTab);
  },

  applyUserInterface() {
    const user = this.state.currentUser;
    if (!user) {
      this.applyGuestInterface();
      return;
    }

    const balancePill = document.getElementById('user-balance-pill');
    const createBtn = document.getElementById('header-create-btn');
    const userProfileMenu = document.getElementById('user-profile-menu');
    const guestAuthActions = document.getElementById('guest-auth-actions');
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-circle');
    const pointsBadgeText = document.getElementById('header-points-text');
    const creditBadgeText = document.getElementById('header-credit-text');

    if (guestAuthActions) guestAuthActions.classList.add('hidden');
    if (balancePill) {
      balancePill.classList.remove('hidden');
      balancePill.style.display = 'flex';
    }
    if (createBtn) {
      createBtn.style.display = 'inline-flex';
    }
    if (userProfileMenu) {
      userProfileMenu.classList.remove('hidden');
    }

    const shortName = user.name ? (user.name.split(' ').pop() || user.name) : 'User';
    if (nameEl) nameEl.textContent = shortName;
    if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();

    // Điểm hiển thị ngắn gọn trên Header Pill
    if (pointsBadgeText) {
      pointsBadgeText.textContent = `${(user.point_balance || 0).toLocaleString('vi-VN')} Điểm`;
    }
    if (creditBadgeText) {
      creditBadgeText.textContent = '';
    }

    this.renderUserProfileDropdown();
    this.renderNavigation();
    this.navigate(this.state.currentTab);
  },

  toggleProfileDropdown() {
    this.haptic('light');
    const dropdown = document.getElementById('user-profile-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
  },

  renderUserProfileDropdown() {
    const user = this.state.currentUser;
    const contentEl = document.getElementById('user-profile-dropdown-content');
    if (!user || !contentEl) return;

    let roleBadge = '';
    if (user.role === 'ADMIN') {
      roleBadge = '<span class="text-[10px] font-extrabold px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 rounded-md">Quản Trị Viên</span>';
    } else if (user.role === 'CREATOR') {
      roleBadge = '<span class="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 rounded-md">Doanh Nghiệp</span>';
    } else {
      roleBadge = '<span class="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 rounded-md">Thành Viên</span>';
    }

    const isGoogleLinked = user.is_google_linked === 1;
    const isEmailVerified = user.is_email_verified === 1;

    contentEl.innerHTML = `
      <!-- User Info Header -->
      <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center justify-between gap-2 mb-1">
          <div class="font-extrabold text-sm text-slate-900 dark:text-white truncate">${user.name}</div>
          ${roleBadge}
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 truncate">${user.email}</div>
      </div>

      <!-- Security & Free Trial Verification Badges -->
      <div class="px-3 py-2.5 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[11px] space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-slate-500 dark:text-slate-400">Tài khoản Google:</span>
          ${isGoogleLinked 
            ? `<span class="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">✓ Đã liên kết</span>`
            : `<button onclick="VibeApp.linkGoogleAccount()" class="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5">🔗 Liên kết ngay</button>`
          }
        </div>
      </div>

      <!-- Menu Shortcuts -->
      <div class="p-1.5 space-y-0.5 text-xs">
        <button onclick="VibeApp.navigate('creator-surveys'); document.getElementById('user-profile-dropdown').classList.add('hidden')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center space-x-2.5 text-slate-700 dark:text-slate-200 font-medium transition-colors">
          <i data-lucide="folder-kanban" class="w-4 h-4 text-blue-500"></i>
          <span>Khảo Sát Của Tôi</span>
        </button>

        <button onclick="VibeApp.navigate('wallet'); document.getElementById('user-profile-dropdown').classList.add('hidden')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center space-x-2.5 text-slate-700 dark:text-slate-200 font-medium transition-colors">
          <i data-lucide="wallet" class="w-4 h-4 text-emerald-500"></i>
          <span>Ví Điểm & Đổi Thưởng</span>
        </button>

        ${user.role === 'ADMIN' ? `
          <button onclick="VibeApp.navigate('admin-overview'); document.getElementById('user-profile-dropdown').classList.add('hidden')" class="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center space-x-2.5 text-purple-700 dark:text-purple-300 font-bold transition-colors">
            <i data-lucide="shield" class="w-4 h-4 text-purple-600"></i>
            <span>Trang Quản Trị Hệ Thống</span>
          </button>
        ` : ''}
      </div>

      <!-- Logout Button -->
      <div class="border-t border-slate-100 dark:border-slate-800 my-1"></div>
      <div class="p-1">
        <button onclick="VibeApp.logout()" class="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center space-x-2 transition-colors">
          <i data-lucide="log-out" class="w-4 h-4 stroke-[2.2]"></i>
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  logout() {
    this.haptic('light');
    this.state.token = null;
    this.state.currentUser = null;
    localStorage.removeItem('vibesurvey_token');

    const dropdown = document.getElementById('user-profile-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    this.applyGuestInterface();
    this.showToast('Bạn đã đăng xuất tài khoản an toàn.', 'info');
  },

  // ==================== AUTHENTICATION MODAL ====================
  openAuthModal(initialTab = 'login') {
    this.haptic('light');
    const container = document.getElementById('modal-container');
    const card = document.getElementById('modal-card');
    if (!container || !card) return;

    this._activeAuthTab = initialTab;

    // Responsive: Tab đăng ký có nhiều trường hơn nên mở rộng chiều ngang (max-w-2xl) trên màn hình md trở lên
    const cardMaxWidth = initialTab === 'register' ? 'max-w-2xl' : 'max-w-lg';
    card.className = `bg-white dark:bg-[#131B2E] text-slate-800 dark:text-slate-100 rounded-3xl ${cardMaxWidth} w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 transform transition-all relative max-h-[92vh] overflow-y-auto`;

    card.innerHTML = `
      <div class="relative">
        <!-- Close Button -->
        <button onclick="VibeApp.closeModal()" class="absolute -top-1 -right-1 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.2]"></i>
        </button>

        <!-- Brand Header -->
        <div class="text-center pb-5 pt-1">
          <div class="inline-flex w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-indigo-500/25 mb-3">
            <img src="/logo.svg" alt="VibeSurvey Logo" class="w-12 h-12 rounded-2xl object-contain">
          </div>
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Chào Mừng Đến VibeSurvey</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Nền tảng nghiên cứu & khảo sát trực tuyến hàng đầu</p>
        </div>

        <!-- Auth Tabs Switcher -->
        <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5">
          <button id="auth-tab-btn-login" onclick="VibeApp.switchAuthTab('login')" class="flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${initialTab === 'login' ? 'bg-white dark:bg-[#131B2E] text-blue-600 dark:text-sky-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'}">
            Đăng Nhập
          </button>
          <button id="auth-tab-btn-register" onclick="VibeApp.switchAuthTab('register')" class="flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${initialTab === 'register' ? 'bg-white dark:bg-[#131B2E] text-blue-600 dark:text-sky-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'}">
            Đăng Ký Tài Khoản
          </button>
        </div>

        <!-- Error Message Alert -->
        <div id="auth-error-alert" class="hidden mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 flex-shrink-0"></i>
          <span id="auth-error-text">Lỗi đăng nhập</span>
        </div>

        <!-- Form Container -->
        <div id="auth-form-body">
          ${this.getAuthFormHtml(initialTab)}
        </div>
      </div>
    `;

    container.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  },

  switchAuthTab(tab) {
    this.haptic('light');
    this._activeAuthTab = tab;
    const card = document.getElementById('modal-card');
    const loginBtn = document.getElementById('auth-tab-btn-login');
    const regBtn = document.getElementById('auth-tab-btn-register');
    const formBody = document.getElementById('auth-form-body');
    const errorAlert = document.getElementById('auth-error-alert');

    if (errorAlert) errorAlert.classList.add('hidden');

    // Chuyển đổi độ rộng modal tương ứng với số lượng trường
    if (card) {
      const cardMaxWidth = tab === 'register' ? 'max-w-2xl' : 'max-w-lg';
      card.className = `bg-white dark:bg-[#131B2E] text-slate-800 dark:text-slate-100 rounded-3xl ${cardMaxWidth} w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 transform transition-all relative max-h-[92vh] overflow-y-auto`;
    }

    if (tab === 'login') {
      loginBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all bg-white dark:bg-[#131B2E] text-blue-600 dark:text-sky-400 shadow-xs';
      regBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900';
    } else {
      regBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all bg-white dark:bg-[#131B2E] text-blue-600 dark:text-sky-400 shadow-xs';
      loginBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900';
    }

    if (formBody) {
      formBody.innerHTML = this.getAuthFormHtml(tab);
      if (window.lucide) window.lucide.createIcons();
    }
  },

  getAuthFormHtml(tab) {
    if (tab === 'login') {
      return `
        <form onsubmit="VibeApp.handleLoginSubmit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email tài khoản</label>
            <div class="relative">
              <i data-lucide="mail" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
              <input type="email" id="auth-email" required placeholder="nhap-email@gmail.com" 
                     class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-bold text-slate-700 dark:text-slate-300">Mật khẩu</label>
            </div>
            <div class="relative">
              <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
              <input type="password" id="auth-password" required placeholder="Nhập mật khẩu của bạn" 
                     class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
              <button type="button" onclick="VibeApp.togglePasswordVisibility('auth-password')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <button type="submit" id="auth-submit-btn" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
            <i data-lucide="log-in" class="w-4 h-4"></i>
            Đăng Nhập
          </button>

          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
            <div class="relative flex justify-center text-[11px]"><span class="px-2 bg-white dark:bg-[#131B2E] text-slate-400">hoặc</span></div>
          </div>

          <button type="button" onclick="VibeApp.loginWithGoogleQuick()" class="w-full py-2.5 border border-slate-200/90 dark:border-slate-700/90 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            Đăng nhập nhanh với Google
          </button>
        </form>
      `;
    } else {
      return `
        <form onsubmit="VibeApp.handleRegisterSubmit(event)" class="space-y-3.5">
          <!-- Bố cục 2 cột trên màn hình md trở lên -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <!-- Cột 1: Thông tin cơ bản -->
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Họ và Tên</label>
                <div class="relative">
                  <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input type="text" id="auth-reg-name" required placeholder="Nguyễn Văn A" 
                         class="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <div class="relative">
                  <i data-lucide="mail" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input type="email" id="auth-reg-email" required placeholder="nhap-email@gmail.com" 
                         class="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu</label>
                <div class="relative">
                  <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input type="password" id="auth-reg-password" required minlength="6" placeholder="Tối thiểu 6 ký tự" 
                         class="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                  <button type="button" onclick="VibeApp.togglePasswordVisibility('auth-reg-password')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Cột 2: Xác thực OTP & Diện tài khoản -->
            <div class="space-y-3">
              <!-- Mã xác thực Email OTP (Gửi qua Brevo) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">Xác thực Email (OTP 6 số)</label>
                  <button type="button" id="btn-send-reg-otp" onclick="VibeApp.sendRegistrationOtp()" class="text-[11px] font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1">
                    <i data-lucide="send" class="w-3 h-3"></i>
                    <span id="reg-otp-btn-text">Gửi mã</span>
                  </button>
                </div>
                <div class="relative">
                  <i data-lucide="shield-check" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                  <input type="text" id="auth-reg-otp" maxlength="6" pattern="[0-9]{6}" placeholder="Nhập 6 số được gửi về email..." 
                         class="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Bấm <strong>"Gửi mã"</strong> để nhận mã OTP qua hòm thư.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Diện tài khoản</label>
                <div class="grid grid-cols-2 gap-2">
                  <label class="relative flex flex-col p-2.5 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer transition-all role-select-card" id="role-card-respondent">
                    <input type="radio" name="auth-reg-role" value="RESPONDENT" checked class="sr-only" onchange="VibeApp.selectRegisterRole('RESPONDENT')">
                    <span class="text-xs font-bold text-blue-700 dark:text-sky-300 flex items-center gap-1.5">
                      <i data-lucide="user-check" class="w-3.5 h-3.5"></i> Cá Nhân
                    </span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Làm khảo sát nhận thưởng</span>
                  </label>
                  <label class="relative flex flex-col p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 cursor-pointer transition-all role-select-card" id="role-card-creator">
                    <input type="radio" name="auth-reg-role" value="CREATOR" class="sr-only" onchange="VibeApp.selectRegisterRole('CREATOR')">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <i data-lucide="building-2" class="w-3.5 h-3.5"></i> Doanh Nghiệp
                    </span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Tạo & nghiên cứu khảo sát</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Free Trial Perk Notice -->
          <div class="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <span class="text-base">🎁</span>
            <div class="leading-relaxed">
              <span class="font-extrabold">Ưu đãi tài khoản mới:</span> Tặng ngay <strong>25 lượt tạo khảo sát miễn phí</strong> (trị giá 50.000 VNĐ)!
            </div>
          </div>

          <button type="submit" id="auth-submit-btn" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            Tạo Tài Khoản & Bắt Đầu
          </button>
        </form>
      `;
    }
  },

  selectRegisterRole(role) {
    const cardResp = document.getElementById('role-card-respondent');
    const cardCreator = document.getElementById('role-card-creator');
    if (!cardResp || !cardCreator) return;
    if (role === 'RESPONDENT') {
      cardResp.className = 'relative flex flex-col p-3 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer transition-all role-select-card';
      cardCreator.className = 'relative flex flex-col p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 cursor-pointer transition-all role-select-card';
    } else {
      cardCreator.className = 'relative flex flex-col p-3 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer transition-all role-select-card';
      cardResp.className = 'relative flex flex-col p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 cursor-pointer transition-all role-select-card';
    }
  },

  togglePasswordVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
  },

  async handleLoginSubmit(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    const errorAlert = document.getElementById('auth-error-alert');
    const errorText = document.getElementById('auth-error-text');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!email || !password) {
      if (errorAlert && errorText) {
        errorText.textContent = 'Vui lòng nhập đầy đủ email và mật khẩu';
        errorAlert.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Đang đăng nhập...';
    }

    try {
      const res = await this.api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (res.success) {
        this.state.token = res.token;
        this.state.currentUser = res.user;
        localStorage.setItem('vibesurvey_token', res.token);
        this.closeModal();
        this.showToast(`Chào mừng ${res.user.name}! Đăng nhập thành công.`, 'success');
        this.applyUserInterface();

        // Tự động chuyển thẳng vào làm bài nếu đến từ Deep-link Email
        if (this.state.pendingSurveyId) {
          const pendingId = this.state.pendingSurveyId;
          this.state.pendingSurveyId = null;
          setTimeout(() => {
            this.startSurveySession(pendingId);
          }, 350);
        }
      }
    } catch (err) {
      if (errorAlert && errorText) {
        errorText.textContent = err.message || 'Email hoặc mật khẩu không chính xác';
        errorAlert.classList.remove('hidden');
      }
      this.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i> Đăng Nhập';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

  async sendRegistrationOtp() {
    this.haptic('light');
    const email = document.getElementById('auth-reg-email')?.value?.trim();
    const name = document.getElementById('auth-reg-name')?.value?.trim();
    const btn = document.getElementById('btn-send-reg-otp');
    const btnText = document.getElementById('reg-otp-btn-text');
    const errorAlert = document.getElementById('auth-error-alert');
    const errorText = document.getElementById('auth-error-text');

    if (!email || !email.includes('@')) {
      if (errorAlert && errorText) {
        errorText.textContent = 'Vui lòng nhập địa chỉ email hợp lệ trước khi bấm gửi mã';
        errorAlert.classList.remove('hidden');
      }
      this.showToast('Vui lòng nhập địa chỉ email hợp lệ', 'warning');
      return;
    }

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Đang gửi mã...';
    this.showToast('Đang gửi mã xác thực đến email của bạn...', 'info');

    try {
      const res = await this.api('/auth/send-registration-otp', {
        method: 'POST',
        body: JSON.stringify({ email, name })
      });

      if (res.success) {
        this.showToast(res.message || 'Mã xác thực 6 số đã được gửi vào email!', 'success');
        if (errorAlert) errorAlert.classList.add('hidden');
        
        // Đếm ngược 60s
        let countdown = 60;
        if (btnText) btnText.textContent = `Gửi lại (${countdown}s)`;
        const timer = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(timer);
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = 'Gửi lại mã OTP';
          } else {
            if (btnText) btnText.textContent = `Gửi lại (${countdown}s)`;
          }
        }, 1000);

        // Focus vào ô OTP
        const otpInput = document.getElementById('auth-reg-otp');
        if (otpInput) otpInput.focus();
      }
    } catch (err) {
      if (errorAlert && errorText) {
        errorText.textContent = err.message || 'Không thể gửi mã xác thực';
        errorAlert.classList.remove('hidden');
      }
      this.showToast(err.message, 'error');
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Gửi mã qua Email';
    }
  },

  async handleRegisterSubmit(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('auth-reg-name')?.value.trim();
    const email = document.getElementById('auth-reg-email')?.value.trim();
    const password = document.getElementById('auth-reg-password')?.value;
    const errorAlert = document.getElementById('auth-error-alert');
    const errorText = document.getElementById('auth-error-text');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!name || !email || !password) {
      if (errorAlert && errorText) {
        errorText.textContent = 'Vui lòng điền đầy đủ họ tên, email và mật khẩu';
        errorAlert.classList.remove('hidden');
      }
      return;
    }

    if (password.length < 6) {
      if (errorAlert && errorText) {
        errorText.textContent = 'Mật khẩu phải có tối thiểu 6 ký tự';
        errorAlert.classList.remove('hidden');
      }
      return;
    }

    const role = document.querySelector('input[name="auth-reg-role"]:checked')?.value || 'RESPONDENT';
    const otp = document.getElementById('auth-reg-otp')?.value?.trim();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Đang tạo tài khoản...';
    }

    try {
      const res = await this.api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role, otp })
      });

      if (res.success) {
        this.state.token = res.token;
        this.state.currentUser = res.user;
        localStorage.setItem('vibesurvey_token', res.token);
        this.closeModal();
        this.showToast(`Chào mừng ${res.user.name}! Đăng ký thành công. Nhận ngay 25 lượt free!`, 'success');
        this.applyUserInterface();

        // Tự động chuyển thẳng vào làm bài nếu đến từ Deep-link Email
        if (this.state.pendingSurveyId) {
          const pendingId = this.state.pendingSurveyId;
          this.state.pendingSurveyId = null;
          setTimeout(() => {
            this.startSurveySession(pendingId);
          }, 350);
        }
      }
    } catch (err) {
      if (errorAlert && errorText) {
        errorText.textContent = err.message || 'Không thể tạo tài khoản';
        errorAlert.classList.remove('hidden');
      }
      this.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4"></i> Tạo Tài Khoản & Bắt Đầu';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

  async loginWithGoogleQuick() {
    this.haptic('light');
    // Chuyển hướng trực tiếp tới máy chủ Google OAuth chính thức
    window.location.href = '/api/v1/auth/google?mode=login';
  },

  async linkGoogleAccount() {
    this.haptic('light');
    if (!this.state.currentUser) {
      this.openAuthModal('login');
      return;
    }
    // Chuyển hướng trực tiếp tới máy chủ Google OAuth chính thức
    window.location.href = '/api/v1/auth/google?mode=link';
  },

  showGoogleConfigGuideModal() {
    this.showModal({
      title: 'Thiết Lập Google OAuth 2.0 Client ID',
      content: `
        <div class="space-y-4 text-xs">
          <div class="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5">
            <i data-lucide="info" class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"></i>
            <div class="leading-relaxed text-amber-900 dark:text-amber-200">
              Để mở <strong>cửa sổ đăng nhập chính thức từ máy chủ Google (accounts.google.com)</strong> như trong ảnh chụp, hệ thống cần mã <code>GOOGLE_CLIENT_ID</code> từ Google Cloud Console.
            </div>
          </div>

          <div class="space-y-2.5">
            <h4 class="font-extrabold text-slate-900 dark:text-white text-sm">3 Bước Lấy Client ID Nhanh (Hoàn Toàn Miễn Phí):</h4>
            <ol class="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300">
              <li>
                Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-blue-600 dark:text-sky-400 font-bold underline">Google Cloud Console Credentials</a>.
              </li>
              <li>
                Bấm <strong>+ CREATE CREDENTIALS</strong> &rarr; Chọn <strong>OAuth client ID</strong> &rarr; Chọn Application type là <strong>Web application</strong>.
              </li>
              <li>
                Điền 2 đường dẫn sau:
                <ul class="list-disc list-inside pl-4 mt-1.5 space-y-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                  <li>Authorized JavaScript origins: <code class="text-blue-600 dark:text-sky-400">http://localhost:3000</code></li>
                  <li>Authorized redirect URIs: <code class="text-emerald-600 dark:text-emerald-400">http://localhost:3000/api/v1/auth/google/callback</code></li>
                </ul>
              </li>
            </ol>
          </div>

          <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p class="text-slate-500 dark:text-slate-400 mb-2 font-medium">Sau khi tạo, chỉ cần dán vào file <code>.env</code>:</p>
            <div class="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed select-all">
              GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com<br>
              GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button onclick="VibeApp.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs">
              Đóng
            </button>
            <button onclick="VibeApp.openGoogleAuthPopup('AUTH')" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
              Mở Hộp Thoại Mô Phỏng
            </button>
          </div>
        </div>
      `
    });
  },

  openGoogleAuthPopup(mode = 'AUTH') {
    this.haptic('light');
    this.state.googleAuthMode = mode;
    this.closeModal(); // Đóng modal auth thông thường nếu có

    const modal = document.getElementById('google-oauth-modal');
    if (!modal) return;

    // Cập nhật tiêu đề theo ngữ cảnh
    const headingEl = document.getElementById('google-dialog-heading');
    if (headingEl) {
      headingEl.textContent = (mode === 'LINK') ? 'Ủy quyền liên kết VibeSurvey' : 'Đăng nhập vào VibeSurvey';
    }

    // Chọn mặc định tài khoản Trung Nguyễn Thành giống hệt thiết kế
    this.switchGoogleAccount('trungdzid3@gmail.com', 'Trung Nguyễn Thành', 'T', 'bg-indigo-600');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  closeGoogleAuthModal() {
    this.haptic('light');
    const modal = document.getElementById('google-oauth-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('google-dropdown-menu')?.classList.add('hidden');
    document.body.style.overflow = '';
  },

  toggleGoogleDropdown() {
    this.haptic('light');
    const menu = document.getElementById('google-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
  },

  switchGoogleAccount(email, name, initial = 'G', bgClass = 'bg-blue-600') {
    this.haptic('light');
    this.state.selectedGoogleAccount = { email, name, initial, bgClass };

    // Cập nhật Cột Trái (Pill Button)
    const avatarEl = document.getElementById('google-active-avatar');
    if (avatarEl) {
      avatarEl.textContent = initial;
      avatarEl.className = `w-6 h-6 rounded-full ${bgClass} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`;
    }
    const emailEl = document.getElementById('google-active-email');
    if (emailEl) emailEl.textContent = email;

    // Cập nhật Cột Phải (Danh Sách Quyền Hạn)
    const permNameEl = document.getElementById('google-perm-name');
    if (permNameEl) permNameEl.textContent = name;
    const permEmailEl = document.getElementById('google-perm-email');
    if (permEmailEl) permEmailEl.textContent = email;

    // Đóng Dropdown
    document.getElementById('google-dropdown-menu')?.classList.add('hidden');
  },

  promptCustomGoogleAccount() {
    this.haptic('light');
    document.getElementById('google-dropdown-menu')?.classList.add('hidden');
    
    const customEmail = window.prompt('Nhập địa chỉ email Google của bạn:', '');
    if (!customEmail || !customEmail.trim()) return;

    const email = customEmail.trim().toLowerCase();
    const defaultName = email.split('@')[0];
    const customName = window.prompt('Nhập họ và tên tài khoản Google:', defaultName) || defaultName;
    const initial = (customName.trim()[0] || 'G').toUpperCase();

    this.switchGoogleAccount(email, customName.trim(), initial, 'bg-cyan-600');
  },

  async submitGoogleConsent() {
    this.haptic('medium');
    const selected = this.state.selectedGoogleAccount || {
      email: 'trungdzid3@gmail.com',
      name: 'Trung Nguyễn Thành'
    };
    const { email, name } = selected;
    const mode = this.state.googleAuthMode || 'AUTH';
    const submitBtn = document.getElementById('google-auth-submit-btn');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-2"></span> Đang xác thực...';
    }

    const googleId = '10' + Math.abs(Array.from(email).reduce((hash, char) => 0 | (31 * hash + char.charCodeAt(0)), 0)).toString().padStart(12, '8');

    try {
      if (mode === 'LINK') {
        const res = await this.api('/auth/link-google', {
          method: 'POST',
          body: JSON.stringify({ google_id: googleId, google_email: email })
        });
        if (res.success) {
          this.closeGoogleAuthModal();
          this.showToast(res.message || 'Đã liên kết tài khoản Google thành công!', 'success');
          if (this.state.currentUser) {
            this.state.currentUser.is_google_linked = 1;
            this.state.currentUser.google_id = googleId;
          }
          this.applyUserInterface();
        }
      } else {
        const res = await this.api('/auth/google-auth', {
          method: 'POST',
          body: JSON.stringify({
            google_id: googleId,
            email,
            name: name || email.split('@')[0],
            role: 'RESPONDENT'
          })
        });
        if (res.success) {
          this.state.token = res.token;
          this.state.currentUser = res.user;
          localStorage.setItem('vibesurvey_token', res.token);
          this.closeGoogleAuthModal();
          this.showToast(`Chào mừng ${res.user.name}! Đăng nhập Google thành công.`, 'success');
          this.applyUserInterface();

          // Tự động chuyển thẳng vào làm bài nếu đến từ Deep-link Email
          if (this.state.pendingSurveyId) {
            const pendingId = this.state.pendingSurveyId;
            this.state.pendingSurveyId = null;
            setTimeout(() => {
              this.startSurveySession(pendingId);
            }, 350);
          } else {
            this.renderSurveysView(document.getElementById('app-root'));
          }
        }
      }
    } catch (err) {
      this.showToast(err.message || 'Lỗi kết nối xác thực Google', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Tiếp tục</span>';
      }
    }
  },

  async verifyEmailAccount() {
    this.haptic('light');
    if (!this.state.currentUser) {
      this.openAuthModal('login');
      return;
    }

    this.showToast('Đang gửi mã xác thực đến email của bạn...', 'info');

    try {
      const res = await this.api('/auth/send-verification-otp', { method: 'POST' });
      if (res.success) {
        this.openEmailVerificationModal(res.maskedEmail || this.state.currentUser.email, res.debugOtp);
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  openEmailVerificationModal(maskedEmail, debugOtp) {
    this.showModal({
      title: 'Xác Thực Email Tài Khoản',
      content: `
        <form onsubmit="VibeApp.handleEmailOtpSubmit(event)" class="space-y-4">
          <div class="text-center space-y-1">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 flex items-center justify-center">
              <i data-lucide="mail-check" class="w-6 h-6"></i>
            </div>
            <h4 class="text-sm font-extrabold text-slate-900 dark:text-white">Kiểm tra hộp thư điện tử</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Hệ thống đã gửi mã OTP 6 chữ số đến: <strong class="text-slate-800 dark:text-slate-200 font-mono">${maskedEmail}</strong>
            </p>
            ${debugOtp ? `
              <div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-mono font-bold border border-amber-200 dark:border-amber-800">
                Mã xác thực gửi về: ${debugOtp}
              </div>
            ` : ''}
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
              Nhập mã xác thực (OTP 6 số)
            </label>
            <input type="text" id="email-otp-input" maxlength="6" required pattern="[0-9]{6}" placeholder="Ví dụ: 839210" 
                   class="w-full text-center text-xl font-mono font-extrabold tracking-[0.3em] py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
          </div>

          <div id="otp-error-alert" class="hidden text-xs text-rose-600 font-semibold text-center"></div>

          <button type="submit" id="otp-submit-btn" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
            <i data-lucide="check" class="w-4 h-4"></i>
            Xác Thực Ngay & Kích Hoạt Ưu Đãi
          </button>

          <div class="text-center pt-1">
            <button type="button" onclick="VibeApp.verifyEmailAccount()" class="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline">
              Chưa nhận được mã? Gửi lại mã OTP
            </button>
          </div>
        </form>
      `
    });
  },

  async handleEmailOtpSubmit(event) {
    if (event) event.preventDefault();
    const otp = document.getElementById('email-otp-input')?.value.trim();
    const errorEl = document.getElementById('otp-error-alert');
    const submitBtn = document.getElementById('otp-submit-btn');

    if (!otp || otp.length !== 6) {
      if (errorEl) {
        errorEl.textContent = 'Vui lòng nhập đúng mã OTP gồm 6 chữ số';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Đang xác minh...';
    }

    try {
      const res = await this.api('/auth/verify-email-otp', {
        method: 'POST',
        body: JSON.stringify({ otp })
      });

      if (res.success) {
        this.closeModal();
        this.showToast(res.message, 'success');
        if (this.state.currentUser) {
          this.state.currentUser.is_email_verified = 1;
        }
        this.applyUserInterface();
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Mã xác thực không chính xác hoặc đã hết hạn';
        errorEl.classList.remove('hidden');
      }
      this.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Xác Thực Ngay & Kích Hoạt Ưu Đãi';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

  async openSurveyPreviewModal(surveyId) {
    this.haptic('light');
    try {
      const res = await this.api('/surveys/' + surveyId);
      if (!res.success || !res.survey) {
        this.showToast('Không thể tải thông tin khảo sát', 'error');
        return;
      }
      const s = res.survey;
      const questions = s.questions || [];

      this.showModal({
        title: s.title,
        content: `
          <div class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <!-- Meta Bar -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 font-bold">
                ${s.category || 'Khảo sát'}
              </span>
              <span class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold font-mono">
                +${(s.reward_points_per_response || 0).toLocaleString()} Điểm (≈ ${((s.reward_points_per_response || 0) * 10).toLocaleString()}đ)
              </span>
              <span class="text-slate-400 font-medium">
                ⏱️ ~${Math.ceil((s.min_completion_time_sec || 15) / 60)} phút • ${questions.length} câu hỏi
              </span>
            </div>

            <!-- Description -->
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              ${s.description || 'Khảo sát nghiên cứu thị trường và thu thập ý kiến cộng đồng.'}
            </p>

            <!-- Questions Preview List -->
            <div class="space-y-2.5 pt-1">
              <div class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Nội dung các câu hỏi trong khảo sát:</span>
                <span class="text-[11px] text-slate-400 font-normal">Chế độ xem trước</span>
              </div>
              ${questions.map((q, idx) => `
                <div class="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-800/40 space-y-1.5 text-xs">
                  <div class="flex items-start gap-2">
                    <span class="font-bold text-blue-600 dark:text-sky-400 font-mono">#${idx + 1}</span>
                    <span class="font-semibold text-slate-800 dark:text-slate-200">${q.content}</span>
                  </div>
                  ${q.options && q.options.length ? `
                    <div class="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      ${q.options.map(opt => `<div>• ${opt}</div>`).join('')}
                    </div>
                  ` : (q.type === 'RATING_STARS' ? `
                    <div class="pl-6 text-[11px] text-amber-500 font-medium">★ Đánh giá 1 đến 5 sao</div>
                  ` : (q.type === 'NUMBER_INPUT' ? `
                    <div class="pl-6 text-[11px] text-slate-400 italic">Nhập số liệu [123]</div>
                  ` : (q.type === 'DATE_INPUT' ? `
                    <div class="pl-6 text-[11px] text-slate-400 italic">Chọn ngày [YYYY-MM-DD]</div>
                  ` : '')))}
                </div>
              `).join('')}
            </div>

            <!-- CTA Banner -->
            <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white space-y-2 text-center mt-3">
              <div class="text-xs font-extrabold">Đăng nhập tài khoản để làm khảo sát và nhận ngay +${(s.reward_points_per_response || 0).toLocaleString()} Điểm</div>
              <p class="text-[11px] text-blue-100">Điểm thưởng có thể quy đổi sang thẻ cào Viettel, Vina, Mobi hoặc rút về tài khoản ngân hàng.</p>
              <div class="flex items-center justify-center gap-2 pt-1">
                <button onclick="VibeApp.closeModal(); VibeApp.openAuthModal('login')" class="px-5 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95">
                  Đăng Nhập Để Làm Bài
                </button>
                <button onclick="VibeApp.closeModal(); VibeApp.openAuthModal('register')" class="px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all active:scale-95">
                  Đăng Ký Tài Khoản Mới
                </button>
              </div>
            </div>
          </div>
        `
      });
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  renderGuestLockedView(root, title, desc) {
    root.innerHTML = `
      <div class="bento-card p-10 sm:p-14 text-center max-w-lg mx-auto my-12 space-y-5">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-cyan-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
          <i data-lucide="shield-check" class="w-8 h-8 stroke-[2.2]"></i>
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">${title}</h3>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">${desc}</p>
        </div>
        <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onclick="VibeApp.openAuthModal('login')" class="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
            <i data-lucide="log-in" class="w-4 h-4"></i>
            Đăng Nhập Ngay
          </button>
          <button onclick="VibeApp.openAuthModal('register')" class="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            Tạo Tài Khoản
          </button>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  renderNavigation() {
    const user = this.state.currentUser;
    const desktopNav = document.getElementById('desktop-nav');
    const mobileNav = document.getElementById('mobile-bottom-nav');

    let tabs = [];
    if (!user) {
      tabs = [
        { id: 'surveys', label: 'Khảo Sát', icon: 'compass' },
        { id: 'voucher-market', label: 'Chợ Voucher', icon: 'gift' }
      ];
    } else if (user.role === 'ADMIN') {
      tabs = [
        { id: 'admin-overview', label: 'Tổng Quan', icon: 'pie-chart' },
        { id: 'admin-payouts', label: 'Duyệt Tiền', icon: 'check-circle' },
        { id: 'admin-fraud', label: 'Gian Lận', icon: 'shield-alert' },
        { id: 'surveys', label: 'Khảo Sát', icon: 'layers' }
      ];
    } else {
      tabs = [
        { id: 'surveys', label: 'Khảo Sát', icon: 'compass' },
        { id: 'create-survey', label: 'Tạo Khảo Sát', icon: 'plus-circle' },
        { id: 'creator-surveys', label: 'Khảo Sát Của Tôi', icon: 'folder-kanban' },
        { id: 'voucher-market', label: 'Chợ Voucher', icon: 'gift' },
        { id: 'wallet', label: 'Ví & Rút Tiền', icon: 'wallet' }
      ];
    }

    // Desktop Tabs (Pill Style)
    if (desktopNav) {
      desktopNav.innerHTML = tabs.map(tab => {
        const isActive = this.state.currentTab === tab.id;
        return `
          <button onclick="VibeApp.navigate('${tab.id}')" 
                  class="nav-link whitespace-nowrap ${isActive ? 'active' : ''}">
            <i data-lucide="${tab.icon}" class="w-3.5 h-3.5 stroke-[2.2] flex-shrink-0"></i>
            <span class="whitespace-nowrap">${tab.label}</span>
          </button>
        `;
      }).join('');
    }

    // Mobile Bottom Nav
    if (mobileNav) {
      let mobileItems = [...tabs];
      if (!user) {
        mobileItems.push({ id: 'auth-login', label: 'Đăng Nhập', icon: 'log-in', isAuthAction: true });
      }
      mobileNav.innerHTML = mobileItems.map(tab => {
        const isActive = this.state.currentTab === tab.id;
        const clickAction = tab.isAuthAction ? `VibeApp.openAuthModal('login')` : `VibeApp.navigate('${tab.id}')`;
        return `
          <button onclick="${clickAction}" 
                  class="flex-1 py-1.5 flex flex-col items-center justify-center transition-all ${
                    isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-700 font-medium'
                  }">
            <i data-lucide="${tab.icon}" class="w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}"></i>
            <span class="text-[10px] leading-tight truncate max-w-[70px]">${tab.label}</span>
          </button>
        `;
      }).join('');
    }

    if (window.lucide) window.lucide.createIcons();
  },

  // ==================== ROUTER ====================
  async navigate(tabId, params = {}) {
    this.haptic('light');
    this.state.currentTab = tabId;
    this.renderNavigation();

    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `
      <div class="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
        <p class="text-xs text-slate-400 font-medium">Đang tải...</p>
      </div>
    `;

    try {
      switch (tabId) {
        case 'surveys':
        case 'home':
          await this.renderSurveysView(root);
          break;
        case 'take-survey':
          await this.renderTakeSurveyView(root, params.surveyId);
          break;
        case 'voucher-market':
          await this.renderVoucherMarketView(root);
          break;
        case 'my-vouchers':
          await this.renderMyVouchersView(root);
          break;
        case 'wallet':
          await this.renderWalletView(root);
          break;
        case 'creator-surveys':
        case 'my-surveys':
          await this.renderCreatorSurveysView(root);
          break;
        case 'fast-create':
        case 'create-survey':
          await this.renderCreateSurveyView(root);
          break;
        case 'analytics':
          await this.renderAnalyticsView(root, params.surveyId);
          break;
        case 'admin-overview':
          await this.renderAdminOverviewView(root);
          break;
        case 'admin-payouts':
          await this.renderAdminPayoutsView(root);
          break;
        case 'admin-fraud':
          await this.renderAdminFraudView(root);
          break;
        default:
          await this.renderSurveysView(root);
      }
    } catch (err) {
      root.innerHTML = `
        <div class="bento-card p-8 text-center max-w-md mx-auto my-12">
          <p class="text-xs text-red-600 font-semibold mb-3">${err.message}</p>
          <button onclick="VibeApp.navigate('surveys')" class="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800">
            Quay lại Cổng Khảo Sát
          </button>
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ==================== VIEW 1: BENTO DASHBOARD & KHẢO SÁT ====================
  async   renderSurveysView(root) {
    const surveys = this.state.surveys || [];
    const user = this.state.currentUser;
    const curPoints = user ? user.point_balance : 0;
    const curVnd = curPoints * 10;
    const minPayoutVnd = 100000;
    const goalPercent = Math.min(100, Math.round((curVnd / minPayoutVnd) * 100));

    // Thống kê nhanh số lượng
    const pinnedCount = surveys.filter(s => s.is_pinned === 1 || s.is_featured === 1).length;
    const nearFullCount = surveys.filter(s => {
      const col = s.collected_responses || 0;
      const tar = s.target_responses || 100;
      return (col / tar) >= 0.6 && col < tar;
    }).length;

    const filteredSurveys = this.filterSurveys(surveys);
    const sortedSurveys = this.sortSurveys(filteredSurveys);

    root.innerHTML = `
      <div class="space-y-4 sm:space-y-5">
        
        <!-- ==================== BENTO DASHBOARD HEADER (COMPACT PRO MAX) ==================== -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5">
          
          <!-- Bento 1: Daily Earnings Goal & Welcome -->
          ${user ? `
            <div class="md:col-span-2 bento-card p-4 sm:p-4.5 bg-gradient-to-tr from-white via-blue-50/20 to-indigo-50/30 flex flex-col justify-between space-y-3">
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800/60">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-sky-400 animate-pulse"></span>
                    Khảo Sát Khả Dụng Hôm Nay
                  </span>
                  <span class="text-[11px] text-slate-400 font-medium">Hạn mức rút tối thiểu: 100,000đ</span>
                </div>
                <h1 class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight pt-0.5">
                  Chào ${user.name.split(' ').pop()}, bạn đang có <span class="text-blue-600 dark:text-sky-400 font-mono">${curVnd.toLocaleString('vi-VN')}đ</span>
                </h1>
                <p class="text-xs text-slate-500 dark:text-slate-400">Chọn các bài khảo sát bên dưới để làm bài, tích điểm đổi thẻ cào hoặc rút tiền mặt về ngân hàng.</p>
              </div>

              <!-- Goal Progress Bar -->
              <div class="space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-slate-600 dark:text-slate-300">Tiến độ rút tiền mặt (100K):</span>
                  <span class="text-blue-600 dark:text-sky-400 font-mono font-bold">${goalPercent}% (${curVnd.toLocaleString()}đ / 100,000đ)</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-900/90 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-800">
                  <div class="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${goalPercent}%"></div>
                </div>
              </div>

              <!-- Quick Action Row -->
              <div class="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div class="flex items-center space-x-3 font-semibold text-slate-500 dark:text-slate-400">
                  <span class="flex items-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-500"></i> Duyệt tự động</span>
                  <span class="flex items-center gap-1"><i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i> Nhận điểm tức thì</span>
                </div>
                <button onclick="VibeApp.navigate('wallet')" class="font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 flex items-center gap-1 transition-colors">
                  <span>Vào ví rút tiền</span>
                  <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          ` : `
            <div class="md:col-span-2 bento-card p-4 sm:p-5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex flex-col justify-between space-y-3">
              <div>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md mb-1.5">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Nền Tảng Khảo Sát & Nghiên Cứu Thị Trường
                </span>
                <h1 class="text-lg sm:text-xl font-black tracking-tight leading-snug">
                  Khám Phá Các Bài Khảo Sát & Đổi Thưởng
                </h1>
                <p class="text-xs text-blue-100 mt-1 max-w-lg leading-relaxed">
                  Xem trước nội dung câu hỏi bên dưới. Đăng ký tài khoản miễn phí để làm bài, nhận điểm quy đổi thẻ cào / tiền mặt, hoặc nhận 25 lượt tạo khảo sát free!
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2.5 pt-1">
                <button onclick="VibeApp.openAuthModal('register')" class="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5">
                  <i data-lucide="gift" class="w-3.5 h-3.5 text-amber-500"></i>
                  <span>Đăng Ký Nhận 25 Lượt Free</span>
                </button>
                <button onclick="VibeApp.openAuthModal('login')" class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all active:scale-95">
                  <span>Đăng Nhập Ngay</span>
                </button>
              </div>
            </div>
          `}

          <!-- Bento 2: Featured Reward Voucher Highlight -->
          <div class="bento-card p-4 sm:p-4.5 bg-gradient-to-br from-amber-500/10 via-white to-amber-50/30 flex flex-col justify-between space-y-2 border-amber-200/60 dark:border-amber-800/50">
            <div>
              <div class="flex justify-between items-center text-xs">
                <span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] uppercase border border-transparent dark:border-amber-800/60">Voucher Hot</span>
                <span class="text-slate-400 font-mono text-[11px]">Shopee • Grab</span>
              </div>
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1.5 leading-snug">Đổi E-Voucher Ẩm Thực & Mua Sắm</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">Dùng điểm thưởng đổi mã Highlands Coffee, Phúc Long, CGV, GrabFood.</p>
            </div>

            <div class="pt-2 border-t border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
              <span class="text-xs font-bold text-amber-800 dark:text-amber-300">Từ 1,500 Điểm</span>
              <button onclick="VibeApp.navigate('voucher-market')" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors">
                Xem Chợ Voucher
              </button>
            </div>
          </div>

        </div>

        <!-- ==================== THANH CÔNG CỤ LỌC & SẮP XẾP TOÀN NĂNG (FILTER TOOLBAR) ==================== -->
        <div class="bento-card p-3 sm:p-3.5 space-y-2.5">
          
          <!-- Hàng 1: Quick Filter Pills + Search Input -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            
            <!-- Quick Category Pills -->
            <div class="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button onclick="VibeApp.setCategoryFilter('ALL')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                this.state.categoryFilter === 'ALL' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs dark:shadow-indigo-500/30' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                Tất cả (${surveys.length})
              </button>

              ${pinnedCount > 0 ? `
                <button onclick="VibeApp.setCategoryFilter('PINNED')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  this.state.categoryFilter === 'PINNED' 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100'
                }">
                  📌 Đang Ghim (${pinnedCount})
                </button>
              ` : ''}

              ${nearFullCount > 0 ? `
                <button onclick="VibeApp.setCategoryFilter('NEAR_FULL')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  this.state.categoryFilter === 'NEAR_FULL' 
                    ? 'bg-rose-500 text-white shadow-xs' 
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 hover:bg-rose-100'
                }">
                  🔥 Sắp hết suất (${nearFullCount})
                </button>
              ` : ''}

              <button onclick="VibeApp.setCategoryFilter('FAST')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                this.state.categoryFilter === 'FAST' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                ⚡ Làm nhanh (≤ 1p)
              </button>

              <button onclick="VibeApp.setCategoryFilter('FEW_QUESTIONS')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                this.state.categoryFilter === 'FEW_QUESTIONS' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                📝 Ít câu (≤ 3 câu)
              </button>

              <button onclick="VibeApp.setCategoryFilter('HIGH_REWARD')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                this.state.categoryFilter === 'HIGH_REWARD' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                💰 Thưởng cao (≥ 250đ)
              </button>

              <button onclick="VibeApp.setCategoryFilter('VOUCHER')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                this.state.categoryFilter === 'VOUCHER' 
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }">
                🎁 Voucher Quà
              </button>
            </div>

            <!-- Search Bar -->
            <div class="relative w-full md:w-64 shrink-0">
              <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none"></i>
              <input type="text" 
                     id="survey-search-input"
                     value="${this.state.searchQuery}"
                     oninput="VibeApp.handleSearch(this.value)"
                     placeholder="Tìm kiếm đề tài..."
                     class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            </div>

          </div>

          <!-- Hàng 2: Dropdowns Lọc Chi Tiết & Sắp Xếp & Toggle & View Mode -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            
            <!-- Cụm Dropdown bộ lọc -->
            <div class="flex flex-wrap items-center gap-2">
              
              <!-- Sắp xếp -->
              <div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-xl">
                <span class="text-slate-400 text-[11px] font-semibold whitespace-nowrap">Sắp xếp:</span>
                <select onchange="VibeApp.setSortBy(this.value)" class="bg-transparent text-slate-700 dark:text-slate-200 font-bold focus:outline-none cursor-pointer text-xs">
                  <option value="recommended" ${this.state.sortBy === 'recommended' ? 'selected' : ''}>🌟 Đề xuất (Ghim & Sắp đầy)</option>
                  <option value="reward_desc" ${this.state.sortBy === 'reward_desc' ? 'selected' : ''}>💰 Thưởng cao nhất</option>
                  <option value="reward_asc" ${this.state.sortBy === 'reward_asc' ? 'selected' : ''}>💸 Thưởng thấp nhất</option>
                  <option value="speed" ${this.state.sortBy === 'speed' ? 'selected' : ''}>⚡ Tốc độ (Nhanh nhất)</option>
                  <option value="few_questions" ${this.state.sortBy === 'few_questions' ? 'selected' : ''}>📝 Ít câu hỏi nhất</option>
                  <option value="progress_desc" ${this.state.sortBy === 'progress_desc' ? 'selected' : ''}>🔥 Gần đầy suất nhất</option>
                  <option value="newest" ${this.state.sortBy === 'newest' ? 'selected' : ''}>⏱️ Mới nhất</option>
                </select>
              </div>

              <!-- Lọc số câu hỏi -->
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-xl">
                <span class="text-slate-400 text-[11px] font-semibold whitespace-nowrap">Số câu:</span>
                <select onchange="VibeApp.setLengthFilter(this.value)" class="bg-transparent text-slate-700 dark:text-slate-200 font-bold focus:outline-none cursor-pointer text-xs">
                  <option value="ALL" ${this.state.lengthFilter === 'ALL' ? 'selected' : ''}>Tất cả số câu</option>
                  <option value="SHORT" ${this.state.lengthFilter === 'SHORT' ? 'selected' : ''}>⚡ Ngắn (1 - 3 câu)</option>
                  <option value="MEDIUM" ${this.state.lengthFilter === 'MEDIUM' ? 'selected' : ''}>📄 Vừa (4 - 7 câu)</option>
                  <option value="LONG" ${this.state.lengthFilter === 'LONG' ? 'selected' : ''}>📚 Dài (≥ 8 câu)</option>
                </select>
              </div>

              <!-- Lọc mức thưởng -->
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-xl">
                <span class="text-slate-400 text-[11px] font-semibold whitespace-nowrap">Mức thưởng:</span>
                <select onchange="VibeApp.setRewardTierFilter(this.value)" class="bg-transparent text-slate-700 dark:text-slate-200 font-bold focus:outline-none cursor-pointer text-xs">
                  <option value="ALL" ${this.state.rewardTierFilter === 'ALL' ? 'selected' : ''}>Tất cả mức</option>
                  <option value="TIER_LOW" ${this.state.rewardTierFilter === 'TIER_LOW' ? 'selected' : ''}>Dưới 150 Điểm</option>
                  <option value="TIER_MID" ${this.state.rewardTierFilter === 'TIER_MID' ? 'selected' : ''}>150 - 299 Điểm</option>
                  <option value="TIER_HIGH" ${this.state.rewardTierFilter === 'TIER_HIGH' ? 'selected' : ''}>Từ 300 Điểm trở lên</option>
                </select>
              </div>

              <!-- Lọc tốc độ -->
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1 rounded-xl">
                <span class="text-slate-400 text-[11px] font-semibold whitespace-nowrap">Thời lượng:</span>
                <select onchange="VibeApp.setSpeedFilter(this.value)" class="bg-transparent text-slate-700 dark:text-slate-200 font-bold focus:outline-none cursor-pointer text-xs">
                  <option value="ALL" ${this.state.speedFilter === 'ALL' ? 'selected' : ''}>Mọi thời lượng</option>
                  <option value="FAST_1M" ${this.state.speedFilter === 'FAST_1M' ? 'selected' : ''}>⚡ Siêu tốc (≤ 1 phút)</option>
                  <option value="FAST_3M" ${this.state.speedFilter === 'FAST_3M' ? 'selected' : ''}>⏱️ Nhanh (≤ 3 phút)</option>
                </select>
              </div>

            </div>

            <!-- Cụm Toggle Ẩn bài đầy & View Switcher -->
            <div class="flex items-center gap-2">
              
              <!-- Toggle Ẩn bài đã xong / đủ mẫu -->
              <button onclick="VibeApp.toggleHideFinished()" class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                this.state.hideFinished 
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-800/60' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
              }" title="Tự động ẩn các bài đã thu thập đủ mẫu hoặc bạn đã hoàn thành">
                <i data-lucide="${this.state.hideFinished ? 'eye-off' : 'eye'}" class="w-3.5 h-3.5"></i>
                <span>${this.state.hideFinished ? 'Đang ẩn bài đầy/đã làm' : 'Hiện cả bài đã đầy'}</span>
              </button>

              <!-- View Switcher (Grid 4 cột vs List 1 dòng) -->
              <div class="flex items-center bg-slate-100 dark:bg-slate-800/70 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button onclick="VibeApp.setViewMode('grid')" class="px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  this.state.viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }" title="Dạng Lưới Tinh Gọn (4 Cột)">
                  <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>
                  <span class="hidden sm:inline">Lưới</span>
                </button>
                <button onclick="VibeApp.setViewMode('list')" class="px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
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
          ${this._renderSurveysContentHtml(sortedSurveys)}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  _renderSurveysContentHtml(surveys) {
    if (!surveys || surveys.length === 0) {
      return `
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
      `;
    }

    // Tách riêng: Nhóm Pinned và Nhóm Normal
    const isDefaultSort = this.state.sortBy === 'recommended';
    let pinnedList = [];
    let normalList = [];

    if (isDefaultSort && this.state.categoryFilter !== 'NEAR_FULL' && this.state.categoryFilter !== 'FAST' && this.state.categoryFilter !== 'FEW_QUESTIONS') {
      pinnedList = surveys.filter(s => s.is_pinned === 1 || s.is_featured === 1);
      normalList = surveys.filter(s => !(s.is_pinned === 1 || s.is_featured === 1));
    } else {
      normalList = surveys;
    }

    const isListView = this.state.viewMode === 'list';

    return `
      <div class="space-y-4">
        
        <!-- SECTION 1: KHẢO SÁT ĐƯỢC GHIM & NỔI BẬT (PINNED & FEATURED) -->
        ${pinnedList.length > 0 ? `
          <div class="rounded-2xl border border-amber-300/70 dark:border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-indigo-500/5 to-cyan-500/5 p-3.5 sm:p-4 space-y-3 shadow-2xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  📌
                </span>
                <h3 class="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  <span>Khảo Sát Được Ghim & Nổi Bật</span>
                  <span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase">Ưu tiên cao</span>
                </h3>
              </div>
              <span class="text-xs text-amber-700 dark:text-amber-300 font-semibold">${pinnedList.length} khảo sát VIP</span>
            </div>

            <!-- Content Pinned -->
            ${isListView ? `
              <div class="space-y-2">
                ${pinnedList.map(s => this.renderListSurveyRow(s, true)).join('')}
              </div>
            ` : `
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
                ${pinnedList.map(s => this.renderCompactSurveyCard(s, true)).join('')}
              </div>
            `}
          </div>
        ` : ''}

        <!-- SECTION 2: TẤT CẢ KHẢO SÁT KHẢ DỤNG -->
        <div class="space-y-2.5">
          ${pinnedList.length > 0 ? `
            <div class="flex items-center justify-between px-1">
              <h3 class="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>📋 Danh Sách Khảo Sát Khả Dụng</span>
                <span class="text-slate-400 font-normal">(${normalList.length} bài)</span>
              </h3>
              <span class="text-[11px] text-slate-400">Các bài gần đầy suất được ưu tiên lên đầu</span>
            </div>
          ` : ''}

          <!-- Content Normal -->
          ${isListView ? `
            <div class="space-y-2">
              ${normalList.map(s => this.renderListSurveyRow(s, false)).join('')}
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
              ${normalList.map(s => this.renderCompactSurveyCard(s, false)).join('')}
            </div>
          `}
        </div>

      </div>
    `;
  },

  renderCompactSurveyCard(s, isPinnedSection = false) {
    const user = this.state.currentUser;
    const isCompleted = s.user_response_status === 'VALIDATED';
    const collected = s.collected_responses || 0;
    const target = s.target_responses || 100;
    const progress = Math.min(100, Math.round((collected / target) * 100));
    const remainingSlots = Math.max(0, target - collected);
    const isNearFull = progress >= 60 && remainingSlots > 0;

    // Nguồn biểu mẫu
    let sourceText = 'Mẫu Nội Bộ';
    let sourceIcon = 'file-text';
    if (s.survey_source === 'GOOGLE_FORMS') { sourceText = 'Google Forms'; sourceIcon = 'external-link'; }
    else if (s.survey_source === 'MS_FORMS') { sourceText = 'Microsoft Forms'; sourceIcon = 'external-link'; }

    const questionCount = s.question_count || 1;
    const minMins = Math.max(1, Math.ceil((s.min_completion_time_sec || 30) / 60));
    const hasVoucher = !!(s.sponsor_brand_name || s.sponsor_voucher_title);
    const voucherText = s.sponsor_voucher_title || (s.sponsor_brand_name ? `Voucher ${s.sponsor_brand_name}` : '');

    return `
      <div class="bento-card p-3.5 sm:p-4 flex flex-col justify-between space-y-3 transition-all hover:border-blue-400/80 dark:hover:border-indigo-500/70 ${
        isPinnedSection ? 'ring-1 ring-amber-400/40 dark:ring-amber-500/30 bg-amber-500/[0.02]' : ''
      }">
        
        <div class="space-y-2.5">
          
          <!-- Hàng Badge Top: Nguồn, Thời gian, Số câu, Huy hiệu Ghim / FOMO -->
          <div class="flex items-center justify-between gap-1 text-[11px]">
            <div class="flex items-center gap-1 overflow-hidden">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold text-[10px] truncate">
                <i data-lucide="${sourceIcon}" class="w-2.5 h-2.5 stroke-[2.2]"></i>
                <span>${sourceText}</span>
              </span>
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold text-[10px]">
                <i data-lucide="clock" class="w-2.5 h-2.5"></i>
                ~${minMins}p
              </span>
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold text-[10px]">
                ${questionCount} câu
              </span>
            </div>

            <!-- Huy hiệu FOMO hoặc Ghim -->
            <div>
              ${(s.is_pinned === 1 || s.is_featured === 1) ? `
                <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold text-[10px]">
                  📌 Ghim
                </span>
              ` : isNearFull ? `
                <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] animate-pulse">
                  🔥 Còn ${remainingSlots}
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Tiêu đề & Mô tả gọn gàng -->
          <div>
            <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2 hover:text-blue-600 dark:hover:text-sky-400 transition-colors cursor-pointer" onclick="${user ? `VibeApp.startSurveySession('${s.id}')` : `VibeApp.openSurveyPreviewModal('${s.id}')`}">
              ${s.title}
            </h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 leading-relaxed">
              ${s.description || 'Khảo sát nghiên cứu trải nghiệm và thói quen tiêu dùng.'}
            </p>
          </div>

          <!-- Voucher Badge if any -->
          ${hasVoucher ? `
            <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold truncate max-w-full">
              <i data-lucide="gift" class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0"></i>
              <span class="truncate">${voucherText}</span>
            </div>
          ` : ''}

          <!-- Thanh tiến độ mẫu siêu mảnh -->
          <div class="space-y-1 pt-0.5">
            <div class="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span>Thu thập: ${collected}/${target}</span>
              <span class="font-mono ${isNearFull ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}">${progress}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-900/90 h-1.5 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300 ${
                isNearFull 
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }" style="width: ${progress}%"></div>
            </div>
          </div>

        </div>

        <!-- Chân thẻ: Điểm thưởng & Nút Làm Bài gọn gàng -->
        <div class="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div>
            ${s.reward_mode === 'VOUCHER_ONLY' ? `
              <div class="text-xs font-black text-amber-600 dark:text-amber-400">Voucher 0đ</div>
            ` : `
              <div class="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono leading-none">
                +${(s.reward_points_per_response || 0).toLocaleString()} Điểm
              </div>
              <div class="text-[10px] text-slate-400 font-mono mt-0.5">
                ≈ ${((s.reward_points_per_response || 0) * 10).toLocaleString()}đ
              </div>
            `}
          </div>

          ${isCompleted ? `
            <span class="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1">
              <i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>
              <span>Đã nhận</span>
            </span>
          ` : user ? `
            <button onclick="VibeApp.startSurveySession('${s.id}')" class="h-8 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
              <span>Làm bài</span>
              <i data-lucide="arrow-right" class="w-3 h-3 stroke-[2.2]"></i>
            </button>
          ` : `
            <div class="flex items-center gap-1">
              <button onclick="VibeApp.openSurveyPreviewModal('${s.id}')" class="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1 active:scale-95" title="Xem trước">
                <i data-lucide="eye" class="w-3 h-3"></i>
                <span class="hidden sm:inline">Xem</span>
              </button>
              <button onclick="VibeApp.openAuthModal('login')" class="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
                <span>Làm bài</span>
                <i data-lucide="arrow-right" class="w-3 h-3 stroke-[2.2]"></i>
              </button>
            </div>
          `}
        </div>

      </div>
    `;
  },

  renderListSurveyRow(s, isPinnedSection = false) {
    const user = this.state.currentUser;
    const isCompleted = s.user_response_status === 'VALIDATED';
    const collected = s.collected_responses || 0;
    const target = s.target_responses || 100;
    const progress = Math.min(100, Math.round((collected / target) * 100));
    const remainingSlots = Math.max(0, target - collected);
    const isNearFull = progress >= 60 && remainingSlots > 0;

    const questionCount = s.question_count || 1;
    const minMins = Math.max(1, Math.ceil((s.min_completion_time_sec || 30) / 60));

    return `
      <div class="bento-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-blue-400 ${
        isPinnedSection ? 'ring-1 ring-amber-400/40 dark:ring-amber-500/30 bg-amber-500/[0.02]' : ''
      }">
        
        <!-- Cột 1: Thông tin chính -->
        <div class="space-y-1 min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${(s.is_pinned === 1 || s.is_featured === 1) ? `
              <span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold text-[10px]">
                📌 Ghim
              </span>
            ` : ''}
            ${isNearFull ? `
              <span class="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold text-[10px]">
                🔥 Còn ${remainingSlots} suất
              </span>
            ` : ''}
            <span class="text-[10px] font-semibold text-slate-400">~${minMins} phút • ${questionCount} câu</span>
          </div>

          <h4 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-sky-400" onclick="${user ? `VibeApp.startSurveySession('${s.id}')` : `VibeApp.openSurveyPreviewModal('${s.id}')`}">
            ${s.title}
          </h4>
        </div>

        <!-- Cột 2: Tiến độ mẫu mini -->
        <div class="w-full sm:w-36 shrink-0 space-y-1">
          <div class="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <span>${collected}/${target}</span>
            <span class="font-mono ${isNearFull ? 'text-rose-600 font-bold' : ''}">${progress}%</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-900/90 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full ${isNearFull ? 'bg-rose-500' : 'bg-blue-600'}" style="width: ${progress}%"></div>
          </div>
        </div>

        <!-- Cột 3: Phần thưởng & Nút -->
        <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div class="text-right">
            <div class="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
              +${(s.reward_points_per_response || 0).toLocaleString()} Điểm
            </div>
            <div class="text-[10px] text-slate-400 font-mono">
              ≈ ${((s.reward_points_per_response || 0) * 10).toLocaleString()}đ
            </div>
          </div>

          ${isCompleted ? `
            <span class="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-xs font-bold">
              Đã nhận
            </span>
          ` : user ? `
            <button onclick="VibeApp.startSurveySession('${s.id}')" class="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
              <span>Làm bài</span>
              <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </button>
          ` : `
            <button onclick="VibeApp.openAuthModal('login')" class="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">
              <span>Làm bài</span>
              <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </button>
          `}
        </div>

      </div>
    `;
  },

  filterSurveys(surveys) {
    let list = [...surveys];
    const cat = this.state.categoryFilter;
    const len = this.state.lengthFilter;
    const speed = this.state.speedFilter;
    const tier = this.state.rewardTierFilter;
    const q = this.state.searchQuery.toLowerCase().trim();

    // 1. Tự động ẩn khảo sát đã đủ 100% mẫu hoặc người dùng đã nhận thưởng (nếu hideFinished === true)
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
    if (cat === 'PINNED') {
      list = list.filter(s => s.is_pinned === 1 || s.is_featured === 1);
    } else if (cat === 'NEAR_FULL') {
      list = list.filter(s => {
        const col = s.collected_responses || 0;
        const tar = s.target_responses || 100;
        return (col / tar) >= 0.6 && col < tar;
      });
    } else if (cat === 'FAST') {
      list = list.filter(s => (s.min_completion_time_sec || 60) <= 60);
    } else if (cat === 'FEW_QUESTIONS') {
      list = list.filter(s => (s.question_count || 1) <= 3);
    } else if (cat === 'HIGH_REWARD') {
      list = list.filter(s => (s.reward_points_per_response || 0) >= 250);
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

    // 4. Lọc theo thời lượng tốc độ
    if (speed === 'FAST_1M') {
      list = list.filter(s => (s.min_completion_time_sec || 30) <= 60);
    } else if (speed === 'FAST_3M') {
      list = list.filter(s => (s.min_completion_time_sec || 30) <= 180);
    }

    // 5. Lọc theo mức thưởng
    if (tier === 'TIER_LOW') {
      list = list.filter(s => (s.reward_points_per_response || 0) < 150);
    } else if (tier === 'TIER_MID') {
      list = list.filter(s => (s.reward_points_per_response || 0) >= 150 && (s.reward_points_per_response || 0) < 300);
    } else if (tier === 'TIER_HIGH') {
      list = list.filter(s => (s.reward_points_per_response || 0) >= 300);
    }

    // 6. Tìm kiếm từ khóa
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

  sortSurveys(surveys) {
    const list = [...surveys];
    const sort = this.state.sortBy;

    if (sort === 'reward_desc') {
      list.sort((a, b) => (b.reward_points_per_response || 0) - (a.reward_points_per_response || 0));
    } else if (sort === 'reward_asc') {
      list.sort((a, b) => (a.reward_points_per_response || 0) - (b.reward_points_per_response || 0));
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
      // Giữ nguyên order hoặc sort theo created_at
    } else {
      // Mặc định: 'recommended' -> Ưu tiên Ghim lên đầu, sau đó ưu tiên Sắp Đầy (>= 60%), sau đó theo điểm thưởng
      list.sort((a, b) => {
        const isPinnedA = (a.is_pinned === 1 || a.is_featured === 1) ? 1 : 0;
        const isPinnedB = (b.is_pinned === 1 || b.is_featured === 1) ? 1 : 0;
        if (isPinnedB !== isPinnedA) return isPinnedB - isPinnedA;

        const progA = (a.collected_responses || 0) / (a.target_responses || 1);
        const progB = (b.collected_responses || 0) / (b.target_responses || 1);
        const nearFullA = (progA >= 0.6 && progA < 1.0) ? 1 : 0;
        const nearFullB = (progB >= 0.6 && progB < 1.0) ? 1 : 0;
        if (nearFullB !== nearFullA) return nearFullB - nearFullA;

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

  setSpeedFilter(speed) {
    this.haptic('light');
    this.state.speedFilter = speed;
    this._updateSurveyGrid();
  },

  setRewardTierFilter(tier) {
    this.haptic('light');
    this.state.rewardTierFilter = tier;
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
    const filteredSurveys = this.filterSurveys(surveys);
    const sortedSurveys = this.sortSurveys(filteredSurveys);

    gridSection.innerHTML = this._renderSurveysContentHtml(sortedSurveys);
    if (window.lucide) window.lucide.createIcons();
  },

  resetAllFilters() {
    this.state.categoryFilter = 'ALL';
    this.state.lengthFilter = 'ALL';
    this.state.speedFilter = 'ALL';
    this.state.rewardTierFilter = 'ALL';
    this.state.searchQuery = '';
    this.state.sortBy = 'recommended';
    this.state.hideFinished = false; // Tạm mở để thấy các bài đã xong nếu muốn
    this.renderSurveysView(document.getElementById('app-root'));
  },

  // ==================== VIEW 2: TRÌNH LÀM BÀI KHẢO SÁT (TYPEFORM ZEN FOCUS) ====================
  async startSurveySession(surveyId) {
    this.haptic('light');

    if (!this.state.currentUser) {
      this.state.pendingSurveyId = surveyId;
      this.showToast('Vui lòng đăng nhập để bắt đầu làm bài khảo sát!', 'info');
      this.openAuthModal('login');
      return;
    }

    try {
      const res = await this.api(`/surveys/${surveyId}/start-session`, { method: 'POST' });
      if (res.success) {
        const detailRes = await this.api(`/surveys/${surveyId}`);
        const surveyDetail = detailRes.survey || {};

        this.state.activeSession = {
          surveyId,
          survey: surveyDetail,
          responseId: res.responseId,
          questions: res.questions || [],
          currentIndex: 0,
          answers: {},
          durationSec: 0,
          minTimeSec: res.minCompletionTimeSec || 15,
          rewardPoints: res.rewardPoints || surveyDetail.reward_points_per_response || 0,
          isPacingLocked: false,
          timerId: null
        };

        this.state.activeSession.timerId = setInterval(() => {
          if (this.state.activeSession) {
            this.state.activeSession.durationSec++;
            const timerEl = document.getElementById('session-timer-text');
            if (timerEl) {
              const sec = this.state.activeSession.durationSec;
              const mins = Math.floor(sec / 60);
              const remSec = sec % 60;
              timerEl.textContent = `${mins.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
            }
          }
        }, 1000);

        this.navigate('take-survey', { surveyId });
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async renderTakeSurveyView(root, surveyId) {
    const session = this.state.activeSession;
    if (!session || session.surveyId !== surveyId) {
      root.innerHTML = `
        <div class="text-center py-20 space-y-3">
          <p class="text-xs text-slate-500 font-medium">Phiên làm bài đã kết thúc.</p>
          <button onclick="VibeApp.navigate('surveys')" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold">
            Về Cổng Khảo Sát
          </button>
        </div>
      `;
      return;
    }

    const totalQ = session.questions.length;
    const curIdx = session.currentIndex;
    const q = session.questions[curIdx];
    const progressPct = totalQ > 0 ? Math.round(((curIdx + 1) / totalQ) * 100) : 100;
    const isLast = curIdx === totalQ - 1;

    root.innerHTML = `
      <div class="stepper-focus-box space-y-6 py-4">
        
        <!-- Header Controls -->
        <div class="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-200">
          <button onclick="VibeApp.confirmExitSurvey()" class="hover:text-red-600 flex items-center gap-1 font-bold transition-colors">
            <i data-lucide="x" class="w-4 h-4 stroke-[2.2]"></i>
            Thoát Khảo Sát
          </button>
          
          <div class="flex items-center space-x-3">
            <span class="font-mono text-slate-700 font-bold" id="session-timer-text">00:00</span>
            <span class="text-slate-300">|</span>
            <span class="font-extrabold text-blue-600">Câu ${curIdx + 1} / ${totalQ} (${progressPct}%)</span>
          </div>
        </div>

        <!-- Top Progress Line -->
        <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300" style="width: ${progressPct}%"></div>
        </div>

        <!-- Question Card (Typeform Zen Focus) -->
        <div class="bento-card p-6 sm:p-9 space-y-6">
          
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                ${q.type === 'SINGLE_CHOICE' ? 'Trắc nghiệm đơn' :
                  q.type === 'MULTIPLE_CHOICE' ? 'Chọn nhiều' :
                  q.type === 'LIKERT_SCALE' ? 'Thang điểm đánh giá' : 'Tự luận'}
              </span>
              <span class="text-xs text-slate-400 font-mono font-bold">CÂU #${curIdx + 1}</span>
            </div>

            <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
              ${q.content}
            </h2>
            <p class="text-xs text-slate-400 mt-1">Phím tắt: Bấm các phím số [1], [2], [3]... trên bàn phím để chọn nhanh.</p>
          </div>

          <!-- Options -->
          <div class="space-y-3 pt-1">
            ${this.renderQuestionOptions(q, session.answers[q.id])}
          </div>

        </div>

        <!-- Bottom Navigation -->
        <div class="pt-2 flex items-center justify-between">
          <button onclick="VibeApp.prevQuestion()" 
                  ${curIdx === 0 ? 'disabled' : ''}
                  class="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
            Câu trước
          </button>

          ${isLast ? `
            <button id="stepper-next-btn" onclick="VibeApp.submitSurvey()" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5">
              <i data-lucide="check" class="w-4 h-4 stroke-[2.5]"></i>
              Nộp bài & Nhận thưởng
            </button>
          ` : `
            <button id="stepper-next-btn" onclick="VibeApp.nextQuestion()" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5">
              <span>Câu tiếp theo</span>
              <i data-lucide="arrow-right" class="w-4 h-4 stroke-[2.2]"></i>
            </button>
          `}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  renderQuestionOptions(q, currentAnswer) {
    if (q.type === 'SINGLE_CHOICE') {
      const opts = q.options || [];
      return opts.map((opt, idx) => {
        const isSelected = currentAnswer === opt;
        return `
          <div onclick="VibeApp.selectSingleOption('${q.id}', '${encodeURIComponent(opt)}')" 
               class="stepper-choice-btn ${isSelected ? 'selected' : ''}">
            <div class="flex items-center space-x-3">
              <div class="w-5 h-5 rounded-full border-2 ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'} flex items-center justify-center text-white transition-colors">
                ${isSelected ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
              </div>
              <span class="text-xs sm:text-sm font-bold text-slate-800">${opt}</span>
            </div>
            <span class="shortcut-badge">[${idx + 1}]</span>
          </div>
        `;
      }).join('');
    }

    if (q.type === 'MULTIPLE_CHOICE') {
      const opts = q.options || [];
      const selectedList = Array.isArray(currentAnswer) ? currentAnswer : [];
      return opts.map((opt, idx) => {
        const isChecked = selectedList.includes(opt);
        return `
          <div onclick="VibeApp.toggleMultipleOption('${q.id}', '${encodeURIComponent(opt)}')" 
               class="stepper-choice-btn ${isChecked ? 'selected' : ''}">
            <div class="flex items-center space-x-3">
              <div class="w-5 h-5 rounded-md border-2 ${isChecked ? 'border-blue-600 bg-blue-600' : 'border-slate-300'} flex items-center justify-center text-white transition-colors">
                ${isChecked ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
              </div>
              <span class="text-xs sm:text-sm font-bold text-slate-800">${opt}</span>
            </div>
            <span class="shortcut-badge">[${idx + 1}]</span>
          </div>
        `;
      }).join('');
    }

    if (q.type === 'LIKERT_SCALE') {
      const opts = q.options || ['1', '2', '3', '4', '5'];
      return `
        <div class="grid grid-cols-5 gap-2.5">
          ${opts.map((opt, idx) => {
            const isSelected = currentAnswer === opt;
            return `
              <button onclick="VibeApp.selectSingleOption('${q.id}', '${encodeURIComponent(opt)}')"
                      class="likert-clean-btn ${isSelected ? 'selected' : ''}">
                <div class="text-lg font-black font-mono">${idx + 1}</div>
                <div class="text-[10px] leading-tight mt-0.5">${opt}</div>
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    if (q.type === 'DROPDOWN') {
      const opts = q.options || [];
      return `
        <div class="space-y-2">
          <select onchange="VibeApp.selectSingleOption('${q.id}', encodeURIComponent(this.value))" 
                  class="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
            <option value="">-- Nhấp để chọn đáp án --</option>
            ${opts.map(opt => `
              <option value="${(opt || '').replace(/"/g, '&quot;')}" ${currentAnswer === opt ? 'selected' : ''}>
                ${opt}
              </option>
            `).join('')}
          </select>
          <p class="text-[11px] text-slate-400">Chọn 1 tùy chọn phù hợp từ menu thả xuống</p>
        </div>
      `;
    }

    if (q.type === 'RATING_STARS') {
      const stars = [1, 2, 3, 4, 5];
      const curRating = parseInt(currentAnswer, 10) || 0;
      return `
        <div class="py-4 text-center space-y-3">
          <div class="flex items-center justify-center gap-3">
            ${stars.map(star => {
              const isFilled = star <= curRating;
              return `
                <button type="button" onclick="VibeApp.selectSingleOption('${q.id}', '${star}')" 
                        class="p-2 sm:p-3 rounded-2xl transition-all transform active:scale-90 ${isFilled ? 'text-amber-400 scale-110' : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'}">
                  <i data-lucide="star" class="w-8 h-8 sm:w-10 sm:h-10 ${isFilled ? 'fill-amber-400 stroke-amber-400' : 'stroke-[1.8]'}"></i>
                  <div class="text-[11px] font-bold font-mono mt-1 text-slate-600 dark:text-slate-400">${star} Sao</div>
                </button>
              `;
            }).join('')}
          </div>
          ${curRating > 0 ? `
            <div class="text-xs font-bold text-amber-500">Bạn đã chọn đánh giá: ${curRating} / 5 Sao</div>
          ` : `
            <div class="text-xs text-slate-400">Chạm vào sao để đánh giá</div>
          `}
        </div>
      `;
    }

    if (q.type === 'NUMBER_INPUT') {
      const numVal = currentAnswer !== undefined && currentAnswer !== null ? currentAnswer : '';
      return `
        <div class="space-y-2">
          <input type="number" value="${numVal}" oninput="VibeApp.updateOpenText('${q.id}', this.value)" 
                 placeholder="Nhập giá trị số..." 
                 class="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
          <p class="text-[11px] text-slate-400">Nhập số nguyên hoặc số thập phân hợp lệ</p>
        </div>
      `;
    }

    if (q.type === 'DATE_INPUT') {
      const dateVal = currentAnswer || '';
      return `
        <div class="space-y-2">
          <input type="date" value="${dateVal}" onchange="VibeApp.selectSingleOption('${q.id}', encodeURIComponent(this.value))" 
                 class="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
          <p class="text-[11px] text-slate-400">Chọn ngày tháng năm từ lịch biểu</p>
        </div>
      `;
    }

    if (q.type === 'OPEN_TEXT') {
      const textVal = currentAnswer || '';
      return `
        <textarea oninput="VibeApp.updateOpenText('${q.id}', this.value)"
                  rows="4" 
                  placeholder="Nhập câu trả lời chi tiết của bạn..."
                  class="w-full p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium">${textVal}</textarea>
      `;
    }

    return '';
  },

  selectSingleOption(qId, encodedOpt) {
    this.haptic('light');
    const opt = decodeURIComponent(encodedOpt);
    this.state.activeSession.answers[qId] = opt;
    this.triggerPacingLock();
    this.renderTakeSurveyView(document.getElementById('app-root'), this.state.activeSession.surveyId);
  },

  toggleMultipleOption(qId, encodedOpt) {
    this.haptic('light');
    const opt = decodeURIComponent(encodedOpt);
    const cur = this.state.activeSession.answers[qId] || [];
    const list = Array.isArray(cur) ? [...cur] : [];
    const idx = list.indexOf(opt);
    if (idx > -1) list.splice(idx, 1);
    else list.push(opt);

    this.state.activeSession.answers[qId] = list;
    this.renderTakeSurveyView(document.getElementById('app-root'), this.state.activeSession.surveyId);
  },

  updateOpenText(qId, val) {
    this.state.activeSession.answers[qId] = val;
  },

  triggerPacingLock() {
    const session = this.state.activeSession;
    if (!session) return;

    session.isPacingLocked = true;
    const btn = document.getElementById('stepper-next-btn');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-40');
      btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>Đọc câu hỏi (1.5s)...</span>`;
      if (window.lucide) window.lucide.createIcons();
    }

    clearTimeout(this._pacingTimeout);
    this._pacingTimeout = setTimeout(() => {
      if (this.state.activeSession) {
        this.state.activeSession.isPacingLocked = false;
        const currentBtn = document.getElementById('stepper-next-btn');
        if (currentBtn) {
          currentBtn.disabled = false;
          currentBtn.classList.remove('opacity-40');
          const isLast = this.state.activeSession.currentIndex === this.state.activeSession.questions.length - 1;
          currentBtn.innerHTML = isLast 
            ? `<i data-lucide="check" class="w-4 h-4 stroke-[2.5]"></i> Nộp bài & Nhận thưởng`
            : `<span>Câu tiếp theo</span><i data-lucide="arrow-right" class="w-4 h-4 stroke-[2.2]"></i>`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    }, 1500);
  },

  async nextQuestion() {
    this.haptic('light');
    const session = this.state.activeSession;
    if (session.isPacingLocked) {
      this.showToast('Vui lòng đọc kỹ câu hỏi (1.5s)', 'info');
      return;
    }

    const curQ = session.questions[session.currentIndex];
    const ans = session.answers[curQ.id];
    if (ans === undefined || ans === null || (Array.isArray(ans) && ans.length === 0) || (typeof ans === 'string' && ans.trim() === '')) {
      this.showToast('Vui lòng chọn đáp án trước khi tiếp tục', 'warning');
      return;
    }

    // Kiểm tra câu hỏi sàng lọc Screener
    if (curQ.is_screener && curQ.qualifying_answer) {
      const isQualified = String(ans).trim().toLowerCase() === String(curQ.qualifying_answer).trim().toLowerCase();
      if (!isQualified) {
        // Đáp viên không đạt điều kiện sàng lọc -> gọi screen-out và hiển thị màn hình an ủi
        await this.handleScreenOut(session.surveyId);
        return;
      }
    }

    if (session.currentIndex < session.questions.length - 1) {
      session.currentIndex++;
      this.triggerPacingLock();
      this.renderTakeSurveyView(document.getElementById('app-root'), session.surveyId);
    }
  },

  async handleScreenOut(surveyId) {
    if (this.state.activeSession && this.state.activeSession.timerId) {
      clearInterval(this.state.activeSession.timerId);
    }

    try {
      const res = await this.api(`/surveys/${surveyId}/screen-out`, { method: 'POST' });
      const pts = res.consolationPoints || 20;

      // Cộng điểm an ủi vào state người dùng nếu có
      if (this.state.currentUser) {
        this.state.currentUser.point_balance = (this.state.currentUser.point_balance || 0) + pts;
      }

      this.state.activeSession = null;

      // Hiển thị màn hình Cảm ơn & Điểm an ủi
      const root = document.getElementById('app-root');
      if (root) {
        root.innerHTML = `
          <div class="stepper-focus-box py-8 text-center space-y-6">
            <div class="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 mx-auto flex items-center justify-center border border-amber-200/80 dark:border-amber-800/80">
              <i data-lucide="smile" class="w-8 h-8"></i>
            </div>
            
            <div class="space-y-2">
              <h2 class="text-xl font-extrabold text-slate-900 dark:text-white">
                Khảo sát chưa hoàn toàn phù hợp với bạn
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Rất cảm ơn bạn đã dành thời gian tham gia! Dựa trên câu trả lời sàng lọc, nhóm nghiên cứu đang tìm kiếm đối tượng khác cho đợt khảo sát này.
              </p>
            </div>

            <div class="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200/80 dark:border-amber-800/80 max-w-sm mx-auto space-y-1">
              <span class="text-[11px] font-bold text-amber-800 dark:text-amber-300">Quà tặng khích lệ:</span>
              <div class="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                +${pts} Điểm
              </div>
              <p class="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                Điểm an ủi đã được cộng trực tiếp vào ví của bạn.
              </p>
            </div>

            <div class="pt-2">
              <button onclick="VibeApp.navigate('surveys')" class="px-6 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95">
                Khám Phá Khảo Sát Khác
              </button>
            </div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }
      this.applyUserInterface();
    } catch (err) {
      this.showToast(err.message, 'error');
      this.navigate('surveys');
    }
  },

  prevQuestion() {
    this.haptic('light');
    const session = this.state.activeSession;
    if (session.currentIndex > 0) {
      session.currentIndex--;
      this.renderTakeSurveyView(document.getElementById('app-root'), session.surveyId);
    }
  },

  confirmExitSurvey() {
    if (confirm('Bạn có chắc muốn thoát khảo sát này? Bài làm sẽ không được ghi nhận.')) {
      if (this.state.activeSession && this.state.activeSession.timerId) {
        clearInterval(this.state.activeSession.timerId);
      }
      this.navigate('surveys');
    }
  },

  async submitSurvey() {
    const session = this.state.activeSession;
    if (!session) return;

    if (session.isPacingLocked) {
      this.showToast('Đang kiểm tra nhịp độ...', 'info');
      return;
    }

    const curQ = session.questions[session.currentIndex];
    const ans = session.answers[curQ.id];
    if (ans === undefined || ans === null || (Array.isArray(ans) && ans.length === 0) || (typeof ans === 'string' && ans.trim() === '')) {
      this.showToast('Vui lòng hoàn thành câu hỏi', 'warning');
      return;
    }

    if (session.timerId) clearInterval(session.timerId);

    this.showToast('Đang gửi bài và ghi nhận điểm...', 'info');

    try {
      const res = await this.api(`/surveys/${session.surveyId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: session.answers,
          duration_sec: session.durationSec,
          device_fingerprint: this.getDeviceFingerprint()
        })
      });

      if (res.success) {
        this.haptic('success');
        if (this.state.currentUser && res.newPointBalance !== undefined) {
          this.state.currentUser.point_balance = res.newPointBalance;
        }
        this.applyUserInterface();

        const voucher = res.voucherReward;

        this.showModal({
          title: '🎉 Hoàn Thành Khảo Sát!',
          content: `
            <div class="space-y-4 text-center py-2">
              <div class="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <i data-lucide="award" class="w-7 h-7 stroke-[2.2]"></i>
              </div>
              <div>
                <h4 class="text-base font-extrabold text-slate-900">${res.message}</h4>
                <p class="text-xs text-slate-500 mt-1">Chất lượng phản hồi: <strong class="text-emerald-700 font-bold font-mono">${res.qualityScore}/100</strong></p>
              </div>

              ${res.pointsEarned > 0 ? `
                <div class="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs flex justify-between font-bold text-slate-800">
                  <span>Điểm thưởng đã cộng:</span>
                  <span class="text-emerald-700 font-mono text-sm">+${res.pointsEarned.toLocaleString()} Điểm (+${(res.pointsEarned * 10).toLocaleString()}đ)</span>
                </div>
              ` : ''}

              ${voucher ? `
                <div class="bento-card p-4 text-left space-y-2 border-amber-200 bg-amber-50/40">
                  <div class="flex justify-between text-xs font-bold">
                    <span class="text-amber-900">🎁 Voucher ${voucher.brand_name}</span>
                    <span class="text-slate-400">Quà tặng</span>
                  </div>
                  <div class="text-xs text-slate-700 font-semibold">${voucher.title}</div>
                  <div class="p-2.5 bg-white rounded-xl border border-amber-200 font-mono text-xs font-bold text-slate-900 flex justify-between items-center">
                    <span class="tracking-wider">${voucher.code}</span>
                    <button onclick="VibeApp.copyText('${voucher.code}')" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold">Sao chép</button>
                  </div>
                </div>
              ` : ''}

              <button onclick="VibeApp.closeModal(); VibeApp.navigate('surveys')" class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95">
                Tiếp tục khám phá khảo sát khác
              </button>
            </div>
          `
        });
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== VIEW 3: CHỢ VOUCHER THƯƠNG HIỆU ====================
  async renderVoucherMarketView(root) {
    const res = await this.api('/vouchers/catalog');
    const vouchers = res.vouchers || [];
    this.state.voucherCatalog = vouchers;

    const user = this.state.currentUser;
    const userPoints = user ? user.point_balance : 0;

    root.innerHTML = `
      <div class="space-y-6">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Chợ Đổi E-Voucher Quà Tặng</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quy đổi điểm thưởng khảo sát lấy mã ưu đãi Shopee, Grab, Highlands Coffee, Phúc Long, CGV Cinemas, Starbucks.</p>
          </div>
          <div class="text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-2 rounded-xl shadow-2xs self-start font-mono">
            Số dư khả dụng: <strong class="text-blue-600 dark:text-sky-400 font-bold">${userPoints.toLocaleString()}</strong> Điểm
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${vouchers.map(v => {
            const canAfford = userPoints >= v.points_cost;
            return `
              <div class="voucher-clean-card flex flex-col justify-between space-y-4">
                <div class="space-y-2.5">
                  <div class="flex justify-between items-center text-xs">
                    <span class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-black">
                      ${v.brand_name}
                    </span>
                    <span class="text-slate-400 dark:text-slate-400 font-mono text-[11px] font-semibold">Còn ${v.remaining_quantity || 0} mã</span>
                  </div>
                  <h3 class="text-base font-extrabold text-slate-900 dark:text-white leading-snug">${v.title}</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">${v.instructions || 'Áp dụng trên toàn quốc'}</p>
                  
                  <div class="pt-1 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                    Trị giá: <strong class="text-slate-900 dark:text-slate-100 font-mono font-bold">${Number(v.face_value_vnd || 0).toLocaleString('vi-VN')} VNĐ</strong>
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div class="text-xs">
                    <span class="text-slate-400 dark:text-slate-400 block font-medium">Chi phí đổi:</span>
                    <strong class="text-sm font-extrabold text-blue-600 dark:text-sky-400 font-mono">${(v.points_cost || 0).toLocaleString()} Điểm</strong>
                  </div>
                  <button onclick="VibeApp.redeemVoucher('${v.id}')" 
                          ${!canAfford ? 'disabled' : ''}
                          class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            canAfford ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-transparent dark:border-slate-700/50'
                          }">
                    ${canAfford ? 'Đổi voucher' : 'Chưa đủ điểm'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  async redeemVoucher(campaignId) {
    if (!this.state.currentUser) {
      this.showToast('Vui lòng đăng nhập để đổi voucher!', 'info');
      this.openAuthModal('login');
      return;
    }

    this.showToast('Đang xử lý đổi voucher...', 'info');

    try {
      const res = await this.api('/vouchers/redeem', {
        method: 'POST',
        body: JSON.stringify({ campaign_id: campaignId })
      });

      if (res.success) {
        this.haptic('success');
        if (this.state.currentUser && res.newPointBalance !== undefined) {
          this.state.currentUser.point_balance = res.newPointBalance;
        }
        this.applyUserInterface();

        this.showModal({
          title: '🎁 Đổi Mã Thành Công',
          content: `
            <div class="space-y-4 py-2 text-center">
              <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <i data-lucide="ticket" class="w-7 h-7 stroke-[2.2]"></i>
              </div>
              <div>
                <h4 class="text-base font-extrabold text-slate-900">${res.voucher.title}</h4>
                <p class="text-xs text-slate-500 mt-1">${res.voucher.instructions}</p>
              </div>
              <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl font-mono text-sm font-bold text-slate-900 flex justify-between items-center">
                <span class="tracking-wider">${res.voucher.code}</span>
                <button onclick="VibeApp.copyText('${res.voucher.code}')" class="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">Sao chép</button>
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
          `
        });
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== VIEW 4: VÍ VOUCHER ====================
  async renderMyVouchersView(root) {
    if (!this.state.currentUser) {
      this.renderGuestLockedView(root, 'Ví Voucher Của Tôi', 'Vui lòng đăng nhập để xem và sao chép các mã voucher quà tặng bạn đã đổi.');
      return;
    }

    const res = await this.api('/vouchers/my-vouchers');
    const vouchers = res.vouchers || [];
    this.state.myVouchers = vouchers;

    root.innerHTML = `
      <div class="space-y-6">
        
        <div class="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Ví Voucher Của Tôi</h1>
            <p class="text-xs text-slate-500 mt-0.5">Danh sách mã quà tặng đã nhận từ các khảo sát tài trợ hoặc đổi từ chợ.</p>
          </div>
          <button onclick="VibeApp.navigate('voucher-market')" class="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors">
            + Đổi thêm voucher
          </button>
        </div>

        ${vouchers.length === 0 ? `
          <div class="bento-card p-12 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <i data-lucide="ticket" class="w-6 h-6 stroke-[2]"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-800">Ví voucher của bạn đang trống</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Hãy tham gia các khảo sát có quà hoặc dùng điểm thưởng để đổi voucher.</p>
            <button onclick="VibeApp.navigate('voucher-market')" class="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              Đến Chợ Voucher
            </button>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${vouchers.map(v => `
              <div class="voucher-clean-card space-y-3">
                <div class="flex justify-between items-center text-xs">
                  <span class="font-extrabold text-slate-900">${v.brand_name || 'Voucher Quà'}</span>
                  <span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[11px] border border-emerald-200/60">Khả dụng</span>
                </div>
                <h3 class="text-sm font-extrabold text-slate-900">${v.title}</h3>
                
                <div class="p-3 bg-slate-50 rounded-xl font-mono text-xs font-bold text-slate-900 flex justify-between items-center border border-slate-200/60">
                  <span class="tracking-wider select-all">${v.code}</span>
                  <button onclick="VibeApp.copyText('${v.code}')" class="text-blue-600 text-xs font-bold hover:underline">Sao chép</button>
                </div>
                
                <div class="text-[11px] text-slate-400 font-medium">
                  Nhận lúc: ${v.claimed_at ? new Date(v.claimed_at).toLocaleDateString('vi-VN') : 'Gần đây'}
                </div>
              </div>
            `).join('')}
          </div>
        `}

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  // ==================== VIEW 5: VÍ & RÚT TIỀN (MODERN FINTECH) ====================
  async renderWalletView(root) {
    if (!this.state.currentUser) {
      this.renderGuestLockedView(root, 'Ví Điểm & Đổi Thưởng', 'Vui lòng đăng nhập để quản lý số dư điểm thưởng, lịch sử giao dịch và gửi yêu cầu đổi thưởng về tài khoản.');
      return;
    }

    const res = await this.api('/wallet');
    const wallet = res.wallet;
    const transactions = res.transactions || [];
    this.state.wallet = wallet;
    this.state.transactions = transactions;

    const curPoints = wallet.point_balance || 0;
    const minPayout = 1000; // Mốc đổi thưởng tối thiểu từ 1.000 điểm (10.000đ thẻ cào)
    const canPayout = curPoints >= minPayout;

    root.innerHTML = `
      <div class="space-y-7">
        
        <div class="pb-4 border-b border-slate-200">
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Ví Tài Chính & Sổ Cái Kép</h1>
          <p class="text-xs text-slate-500 mt-0.5">Bảo toàn số dư với Double-Entry Ledger, kiểm toán ACID và nguyên tắc tài chính chống rửa tiền.</p>
        </div>

        <!-- 2 Modern Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          <!-- Card 1: Platinum Points Card (Respondent) -->
          <div class="fintech-card-bg rounded-3xl p-6 sm:p-7 text-white flex flex-col justify-between space-y-5 relative overflow-hidden">
            <div>
              <div class="flex justify-between items-center text-xs">
                <span class="font-extrabold tracking-widest text-blue-200 uppercase">VIBESURVEY REWARDS</span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black ${canPayout ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : 'bg-white/10 text-slate-300'}">
                  ${canPayout ? 'Đủ điều kiện đổi tiền/thẻ' : 'Cần tối thiểu 1.000 điểm'}
                </span>
              </div>

              <div class="mt-4">
                <span class="text-xs text-slate-300 font-medium">Số dư điểm thưởng khả dụng</span>
                <div class="text-3xl sm:text-4xl font-black font-mono mt-1 text-white">
                  ${curPoints.toLocaleString()} <span class="text-sm font-bold text-slate-400">Điểm</span>
                </div>
                <div class="text-xs text-blue-200 mt-1 font-mono font-semibold">
                  ≈ ${(curPoints * 10).toLocaleString('vi-VN')} VNĐ quy đổi (1 Điểm = 10 VNĐ)
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-white/15 flex items-center justify-between gap-3">
              <button onclick="VibeApp.openPayoutModal()" 
                      class="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        canPayout ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md active:scale-95' : 'bg-white/10 text-slate-400 cursor-not-allowed'
                      }">
                Đổi Thưởng & Rút Tiền (Từ 10K)
              </button>
              <button onclick="VibeApp.openSwapPointsModal()" class="py-2.5 px-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors">
                Đổi Sang Credit
              </button>
            </div>
          </div>

          <!-- Card 2: Creator Credit Card -->
          <div class="bento-card p-6 sm:p-7 flex flex-col justify-between space-y-5 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 border-blue-100/80">
            <div>
              <div class="flex justify-between items-center text-xs font-bold text-slate-500">
                <span class="uppercase tracking-wider text-slate-700">Credit Tạo Khảo Sát</span>
                <span class="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-bold">Không rút tiền mặt</span>
              </div>

              <div class="mt-4">
                <span class="text-xs text-slate-500 font-medium">Số dư credit tạo form khả dụng</span>
                <div class="text-3xl sm:text-4xl font-black font-mono mt-1 text-slate-900">
                  ${Number(wallet.credit_balance || 0).toLocaleString('vi-VN')} <span class="text-sm font-bold text-slate-400">Credit</span>
                </div>
                <p class="text-xs text-slate-500 mt-1">Dùng xuất bản khảo sát và tài trợ voucher. Nhận thưởng bonus nạp từ +3% đến +15%.</p>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-100">
              <button onclick="VibeApp.openDepositModal()" class="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors active:scale-95 flex items-center justify-center gap-1.5">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
                <span>+ Nạp Credit & Nhận Thưởng Bonus (+3% đến +15%)</span>
              </button>
            </div>
          </div>

        </div>

        <!-- Transaction Table -->
        <div class="bento-card p-6 space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-extrabold text-slate-900">Nhật Ký Biến Động Sổ Cái Kép</h3>
            <span class="text-xs text-slate-400 font-mono font-semibold">${transactions.length} giao dịch gần nhất</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th class="py-3 px-3.5 rounded-l-xl">Thời gian</th>
                  <th class="py-3 px-3.5">Loại giao dịch</th>
                  <th class="py-3 px-3.5">Biến động</th>
                  <th class="py-3 px-3.5">Số dư sau</th>
                  <th class="py-3 px-3.5 rounded-r-xl">Nội dung</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${transactions.length === 0 ? `
                  <tr><td colspan="5" class="py-8 text-center text-slate-400">Chưa có giao dịch phát sinh.</td></tr>
                ` : transactions.map(t => {
                  const isPlus = t.amount > 0;
                  return `
                    <tr class="hover:bg-slate-50/60 transition-colors">
                      <td class="py-3 px-3.5 text-slate-500 font-mono">${new Date(t.created_at).toLocaleDateString('vi-VN')}</td>
                      <td class="py-3 px-3.5 font-bold text-slate-800">${t.tx_type}</td>
                      <td class="py-3 px-3.5 font-mono font-black ${isPlus ? 'text-emerald-600' : 'text-slate-800'}">
                        ${isPlus ? '+' : ''}${t.amount.toLocaleString()} ${t.currency}
                      </td>
                      <td class="py-3 px-3.5 font-mono font-bold text-slate-500">${t.balance_after.toLocaleString()}</td>
                      <td class="py-3 px-3.5 text-slate-600 max-w-xs truncate">${t.description}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  // ==================== MODAL: RÚT TIỀN & ĐỔI THƯỞNG ====================
  openPayoutModal() {
    this.haptic('light');
    const wallet = this.state.wallet || {};
    const maxPoints = wallet.point_balance || 0;

    const denoms = [
      { points: 1000, vnd: 10000, label: '10.000đ (1.000 điểm) - Thẻ cào lần đầu' },
      { points: 5000, vnd: 50000, label: '50.000đ (5.000 điểm) - Tiêu chuẩn' },
      { points: 10000, vnd: 100000, label: '100.000đ (10.000 điểm) - Miễn phí chuyển khoản' },
      { points: 20000, vnd: 200000, label: '200.000đ (20.000 điểm) - Miễn phí chuyển khoản' },
      { points: 50000, vnd: 500000, label: '500.000đ (50.000 điểm) - Miễn phí chuyển khoản' }
    ];

    this.showModal({
      title: 'Đổi Thưởng & Rút Tiền',
      content: `
        <div class="space-y-4 text-left">
          
          <div class="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <div class="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
              <span>Số dư khả dụng:</span>
              <span class="text-blue-600 dark:text-sky-400 font-mono">${maxPoints.toLocaleString()} Điểm (${(maxPoints * 10).toLocaleString('vi-VN')}đ)</span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Mốc 10.000đ áp dụng cho thẻ cào điện thoại. Chuyển khoản ngân hàng miễn phí từ 100.000đ (dưới 100.000đ phí 2.000đ bù phí cổng).</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Mệnh giá đổi thưởng:</label>
            <select id="payout-points-select" onchange="VibeApp.updatePayoutUI()" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              ${denoms.map(d => `
                <option value="${d.points}" ${maxPoints < d.points ? 'disabled' : ''}>
                  ${d.label} ${maxPoints < d.points ? '(Chưa đủ điểm)' : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Phương thức nhận:</label>
            <select id="payout-method" onchange="VibeApp.updatePayoutUI()" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="PHONE_CARD">Thẻ Cào Điện Thoại (Viettel, VinaPhone, MobiFone - Miễn phí)</option>
              <option value="BANK_TRANSFER">Chuyển Khoản Ngân Hàng (VietQR / NAPAS 24/7)</option>
              <option value="MOMO">Ví Điện Tử MoMo</option>
            </select>
          </div>

          <!-- Thông báo mốc 10k -->
          <div id="payout-card-only-notice" class="hidden p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
            Mốc 10.000đ dành riêng cho thẻ cào điện thoại giúp bạn trải nghiệm đổi thưởng nhanh chóng.
          </div>

          <!-- Nhánh 1: Thẻ cào điện thoại -->
          <div id="payout-fields-card" class="space-y-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Nhà mạng:</label>
              <select id="payout-card-telco" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold">
                <option value="VIETTEL">Viettel</option>
                <option value="VINAPHONE">VinaPhone</option>
                <option value="MOBIFONE">MobiFone</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Số điện thoại nhận mã thẻ:</label>
              <input type="tel" id="payout-card-phone" placeholder="VD: 0912345678" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold">
            </div>
          </div>

          <!-- Nhánh 2: Chuyển khoản ngân hàng -->
          <div id="payout-fields-bank" class="hidden space-y-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Ngân hàng thụ hưởng:</label>
              <input type="text" id="payout-recipient-bank" placeholder="VD: Vietcombank, MB Bank, Techcombank..." class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Số tài khoản:</label>
              <input type="text" id="payout-recipient-acc" placeholder="Nhập số tài khoản ngân hàng" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Tên chủ tài khoản:</label>
              <input type="text" id="payout-recipient-name" placeholder="VIẾT HOA KHÔNG DẤU (VD: NGUYEN VAN A)" class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold uppercase">
            </div>
          </div>

          <!-- Nhánh 3: Ví MoMo -->
          <div id="payout-fields-momo" class="hidden space-y-2.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Số điện thoại đăng ký MoMo:</label>
              <input type="tel" id="payout-momo-phone" placeholder="VD: 0987654321" class="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Họ tên chủ ví MoMo:</label>
              <input type="text" id="payout-momo-name" placeholder="VIẾT HOA KHÔNG DẤU" class="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold uppercase">
            </div>
          </div>

          <!-- Tóm tắt thanh toán -->
          <div class="p-3 bg-slate-50/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Mệnh giá quy đổi:</span>
              <span id="payout-summary-amount" class="font-mono font-bold text-slate-900 dark:text-slate-100">10.000 VNĐ</span>
            </div>
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Phí chuyển khoản:</span>
              <span id="payout-summary-fee" class="font-mono text-emerald-600 dark:text-emerald-400 font-bold">0đ (Miễn phí)</span>
            </div>
            <div class="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Thực nhận:</span>
              <span id="payout-summary-receive" class="text-blue-600 dark:text-sky-400 font-mono text-sm font-extrabold">10.000 VNĐ</span>
            </div>
          </div>

          <div class="flex gap-2.5 pt-1">
            <button onclick="VibeApp.submitPayoutAction()" class="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]">
              Xác Nhận Đổi Thưởng
            </button>
            <button onclick="VibeApp.closeModal()" class="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-[0.98]">
              Hủy
            </button>
          </div>

        </div>
      `
    });

    this.updatePayoutUI();
  },

  updatePayoutUI() {
    const ptsSelect = document.getElementById('payout-points-select');
    const methodSelect = document.getElementById('payout-method');
    if (!ptsSelect || !methodSelect) return;

    const points = parseInt(ptsSelect.value, 10) || 0;
    const vnd = points * 10;
    let method = methodSelect.value;

    const isFirstTime10k = points === 1000;
    const noticeEl = document.getElementById('payout-card-only-notice');
    const cardFields = document.getElementById('payout-fields-card');
    const bankFields = document.getElementById('payout-fields-bank');
    const momoFields = document.getElementById('payout-fields-momo');

    if (isFirstTime10k && method !== 'PHONE_CARD') {
      methodSelect.value = 'PHONE_CARD';
      method = 'PHONE_CARD';
    }

    if (noticeEl) {
      noticeEl.classList.toggle('hidden', !isFirstTime10k);
    }

    if (cardFields) cardFields.classList.toggle('hidden', method !== 'PHONE_CARD');
    if (bankFields) bankFields.classList.toggle('hidden', method !== 'BANK_TRANSFER');
    if (momoFields) momoFields.classList.toggle('hidden', method !== 'MOMO');

    // Phí chuyển tiền: Thẻ cào miễn phí; Ngân hàng / MoMo dưới 100k phí 2k, từ 100k miễn phí
    let fee = 0;
    if (method === 'PHONE_CARD') {
      fee = 0;
    } else {
      fee = vnd < 100000 ? 2000 : 0;
    }
    const actual = Math.max(0, vnd - fee);

    const amountEl = document.getElementById('payout-summary-amount');
    const feeEl = document.getElementById('payout-summary-fee');
    const receiveEl = document.getElementById('payout-summary-receive');

    if (amountEl) amountEl.textContent = `${vnd.toLocaleString('vi-VN')} VNĐ`;
    if (feeEl) {
      if (fee === 0) {
        feeEl.innerHTML = '<span class="text-emerald-600 font-bold">0đ (Miễn phí 100%)</span>';
      } else {
        feeEl.innerHTML = '<span class="text-amber-600 font-bold">2.000 VNĐ (Phí cổng NAPAS)</span>';
      }
    }
    if (receiveEl) receiveEl.textContent = `${actual.toLocaleString('vi-VN')} VNĐ`;
  },

  async submitPayoutAction() {
    const ptsSelect = document.getElementById('payout-points-select');
    const methodSelect = document.getElementById('payout-method');
    if (!ptsSelect || !methodSelect) return;

    const pts = parseInt(ptsSelect.value, 10);
    const method = methodSelect.value;
    let recipientInfo = {};

    if (method === 'PHONE_CARD') {
      const telco = document.getElementById('payout-card-telco')?.value || 'VIETTEL';
      const phone = document.getElementById('payout-card-phone')?.value?.trim();
      if (!phone || phone.length < 9) {
        this.showToast('Vui lòng nhập số điện thoại nhận mã thẻ hợp lệ', 'warning');
        return;
      }
      recipientInfo = { telco, phone_number: phone, account_name: `Thẻ ${telco}` };
    } else if (method === 'BANK_TRANSFER') {
      const bank = document.getElementById('payout-recipient-bank')?.value?.trim();
      const acc = document.getElementById('payout-recipient-acc')?.value?.trim();
      const name = document.getElementById('payout-recipient-name')?.value?.trim();
      if (!bank || !acc || !name) {
        this.showToast('Vui lòng điền đủ tên ngân hàng, số tài khoản và họ tên', 'warning');
        return;
      }
      recipientInfo = { bank_name: bank, account_number: acc, account_name: name.toUpperCase() };
    } else if (method === 'MOMO') {
      const phone = document.getElementById('payout-momo-phone')?.value?.trim();
      const name = document.getElementById('payout-momo-name')?.value?.trim();
      if (!phone || !name) {
        this.showToast('Vui lòng điền đủ số điện thoại và tên chủ ví MoMo', 'warning');
        return;
      }
      recipientInfo = { bank_name: 'Ví MoMo', account_number: phone, account_name: name.toUpperCase() };
    }

    try {
      const res = await this.api('/wallet/payouts', {
        method: 'POST',
        body: JSON.stringify({
          points_amount: pts,
          payout_method: method,
          recipient_info: recipientInfo
        })
      });

      if (res.success) {
        this.haptic('success');
        this.closeModal();
        this.showToast('Yêu cầu đổi thưởng đã được tiếp nhận thành công', 'success');
        await this.renderWalletView(document.getElementById('app-root'));
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== MODAL: ĐỔI ĐIỂM SANG CREDIT ====================
  openSwapPointsModal() {
    this.haptic('light');
    const user = this.state.currentUser;
    const currentPoints = user ? user.point_balance : 0;

    this.showModal({
      title: '⇄ Đổi Điểm Sang Credit Tạo Form',
      content: `
        <div class="space-y-4 text-left">
          <p class="text-xs text-slate-500 leading-relaxed">Tỷ lệ quy đổi: <strong>1 Điểm = 7 VNĐ Credit</strong> (Chiết khấu sàn 30%). Số điểm tối thiểu: 1,000 điểm.</p>
          
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Số điểm muốn đổi:</label>
            <input type="number" id="swap-points-input" value="1000" min="1000" max="${currentPoints}" step="500" 
                   class="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono font-bold">
          </div>

          <div class="flex gap-2.5 pt-2">
            <button onclick="VibeApp.submitSwapPoints()" class="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95">
              Xác Nhận Đổi
            </button>
            <button onclick="VibeApp.closeModal()" class="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold">
              Hủy
            </button>
          </div>
        </div>
      `
    });
  },

  async submitSwapPoints() {
    const pts = parseInt(document.getElementById('swap-points-input').value, 10);
    if (isNaN(pts) || pts < 1000) {
      this.showToast('Số điểm tối thiểu là 1,000 điểm', 'warning');
      return;
    }

    try {
      const res = await this.api('/wallet/swap-points', {
        method: 'POST',
        body: JSON.stringify({ points_amount: pts })
      });

      if (res.success) {
        this.haptic('success');
        this.closeModal();
        this.showToast(`Đổi thành công ${pts.toLocaleString()} điểm sang Credit!`, 'success');
        if (this.state.currentUser) {
          this.state.currentUser.point_balance = res.newPointBalance;
          this.state.currentUser.credit_balance = res.newCreditBalance;
        }
        this.applyUserInterface();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== MODAL: NẠP QUỸ CREATOR ====================
  calculateDepositBonus(amount) {
    let rate = 0;
    let tierName = 'Tiêu chuẩn';
    if (amount >= 5000000) {
      rate = 0.15;
      tierName = 'Kim Cương (VIP)';
    } else if (amount >= 2000000) {
      rate = 0.12;
      tierName = 'Bạch Kim (Platinum)';
    } else if (amount >= 1000000) {
      rate = 0.08;
      tierName = 'Vàng (Gold)';
    } else if (amount >= 500000) {
      rate = 0.05;
      tierName = 'Bạc (Silver)';
    } else if (amount >= 100000) {
      rate = 0.03;
      tierName = 'Đồng (Bronze)';
    }
    const bonusVnd = Math.round(amount * rate);
    const totalCredit = amount + bonusVnd;
    return {
      rate,
      percent: Math.round(rate * 100),
      bonusVnd,
      totalCredit,
      tierName
    };
  },

  updateDepositCalc() {
    const input = document.getElementById('deposit-amount-input');
    if (!input) return;
    const amount = parseInt(input.value, 10) || 0;
    const calc = this.calculateDepositBonus(amount);

    const amountEl = document.getElementById('deposit-calc-amount');
    const bonusPctEl = document.getElementById('deposit-calc-bonus-pct');
    const bonusVndEl = document.getElementById('deposit-calc-bonus-vnd');
    const totalCreditEl = document.getElementById('deposit-calc-total-credit');

    if (amountEl) amountEl.textContent = `${amount.toLocaleString('vi-VN')} VNĐ`;
    if (bonusPctEl) bonusPctEl.textContent = `+${calc.percent}% (${calc.tierName})`;
    if (bonusVndEl) bonusVndEl.textContent = `+${calc.bonusVnd.toLocaleString('vi-VN')} Credit`;
    if (totalCreditEl) totalCreditEl.textContent = `${calc.totalCredit.toLocaleString('vi-VN')} Credit`;
  },

  setDepositPreset(amount) {
    const input = document.getElementById('deposit-amount-input');
    if (input) {
      input.value = amount;
      this.updateDepositCalc();
    }
  },

  openDepositModal() {
    this.haptic('light');
    this.showModal({
      title: 'Nạp Quỹ Tạo Khảo Sát',
      content: `
        <div class="space-y-4 text-left">
          
          <div class="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200/70 dark:border-blue-800/50 text-xs text-blue-900 dark:text-sky-200 space-y-1">
            <div class="font-bold flex items-center gap-1.5 text-blue-950 dark:text-white">
              <i data-lucide="shield-check" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
              <span>Credit Tạo Khảo Sát - Mở Cho Mọi Thành Viên</span>
            </div>
            <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Mọi tài khoản (Cá nhân, Sinh viên, Doanh nghiệp) đều có thể nạp Credit để xuất bản khảo sát và tài trợ voucher. Doanh nghiệp nạp số lượng lớn được nhận thêm báo cáo AI Insights và đặc quyền hỗ trợ VIP.
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Số tiền nạp (VNĐ):</label>
            <input type="number" id="deposit-amount-input" oninput="VibeApp.updateDepositCalc()" value="1000000" min="50000" step="50000"
                   class="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">Chọn nhanh mức nạp có thưởng:</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button type="button" onclick="VibeApp.setDepositPreset(100000)" class="py-2 px-2.5 border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-700 font-mono font-bold transition-all active:scale-[0.98]">100K (+3%)</button>
              <button type="button" onclick="VibeApp.setDepositPreset(500000)" class="py-2 px-2.5 border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-700 font-mono font-bold transition-all active:scale-[0.98]">500K (+5%)</button>
              <button type="button" onclick="VibeApp.setDepositPreset(1000000)" class="py-2 px-2.5 border border-blue-300 dark:border-indigo-500/60 bg-blue-50/80 dark:bg-indigo-950/60 rounded-xl text-xs text-blue-700 dark:text-indigo-300 font-mono font-bold transition-all active:scale-[0.98]">1 Tr (+8%)</button>
              <button type="button" onclick="VibeApp.setDepositPreset(2000000)" class="py-2 px-2.5 border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-700 font-mono font-bold transition-all active:scale-[0.98]">2 Tr (+12%)</button>
              <button type="button" onclick="VibeApp.setDepositPreset(5000000)" class="col-span-2 sm:col-span-2 py-2 px-2.5 border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-mono font-bold transition-all active:scale-[0.98]">5 Tr (+15% VIP)</button>
            </div>
          </div>

          <!-- Tóm tắt số Credit nhận được -->
          <div class="p-3 bg-slate-50/80 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Mức nạp thanh toán:</span>
              <span id="deposit-calc-amount" class="font-mono font-bold text-slate-900 dark:text-slate-100">1.000.000 VNĐ</span>
            </div>
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Tỷ lệ thưởng bonus:</span>
              <span id="deposit-calc-bonus-pct" class="font-mono font-bold text-blue-600 dark:text-sky-400">+8% (Vàng)</span>
            </div>
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Thưởng thêm:</span>
              <span id="deposit-calc-bonus-vnd" class="font-mono font-bold text-emerald-600 dark:text-emerald-400">+80.000 Credit</span>
            </div>
            <div class="pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Tổng Credit nhận được:</span>
              <span id="deposit-calc-total-credit" class="text-blue-600 dark:text-sky-400 font-mono text-sm font-extrabold">1.080.000 Credit</span>
            </div>
          </div>

          <div class="flex gap-2.5 pt-1">
            <button onclick="VibeApp.submitDepositAction()" class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]">
              Xác Nhận Nạp Quỹ
            </button>
            <button onclick="VibeApp.closeModal()" class="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-[0.98]">
              Hủy
            </button>
          </div>

        </div>
      `
    });

    this.updateDepositCalc();
  },

  async submitDepositAction() {
    const amount = parseInt(document.getElementById('deposit-amount-input').value, 10);
    if (isNaN(amount) || amount < 10000) {
      this.showToast('Vui lòng nhập số tiền nạp hợp lệ', 'warning');
      return;
    }

    try {
      const res = await this.api('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount_vnd: amount, description: 'Nạp quỹ khảo sát VibeSurvey' })
      });

      if (res.success) {
        this.haptic('success');
        this.showToast(res.message, 'success');
        if (this.state.currentUser) {
          this.state.currentUser.credit_balance = res.newCreditBalance;
          if (res.newPointBalance !== undefined) this.state.currentUser.point_balance = res.newPointBalance;
        }
        this.closeModal();
        this.applyUserInterface();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== VIEW 6: KHẢO SÁT CỦA TÔI ====================
  async renderCreatorSurveysView(root) {
    if (!this.state.currentUser) {
      this.renderGuestLockedView(root, 'Khảo Sát Của Tôi', 'Vui lòng đăng nhập để tạo khảo sát, theo dõi tiến độ thu thập dữ liệu và xuất báo cáo kết quả.');
      return;
    }

    const user = this.state.currentUser;
    const res = await this.api('/surveys');
    let surveys = res.surveys || [];

    // Nếu là RESPONDENT: Tự động lọc các khảo sát do chính user này tạo
    if (user && user.role === 'RESPONDENT') {
      const storedIds = JSON.parse(localStorage.getItem('vibesurvey_my_surveys') || '[]');
      surveys = surveys.filter(s => (s.creator_id && s.creator_id === user.id) || storedIds.includes(s.id));
    }

    this.state.creatorSurveys = surveys;

    root.innerHTML = `
      <div class="space-y-6">
        
        <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Khảo Sát Của Tôi</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi các bài khảo sát bạn đã đăng, tiến độ thu thập phản hồi và phân tích thống kê.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="VibeApp.openDepositModal()" class="py-2.5 px-3.5 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-slate-600 bg-white dark:bg-slate-800/90 hover:bg-blue-50/40 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center gap-1.5">
              <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-500"></i>
              <span>+ Nạp Quỹ</span>
            </button>
            <button onclick="VibeApp.openCreateSurveyModal()" class="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center gap-1.5">
              <i data-lucide="plus" class="w-3.5 h-3.5 stroke-[2.5]"></i>
              <span>Tạo Khảo Sát Mới</span>
            </button>
          </div>
        </div>

        ${surveys.length === 0 ? `
          <div class="bento-card p-12 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 border border-transparent dark:border-blue-800/50 flex items-center justify-center mx-auto mb-1">
              <i data-lucide="clipboard-list" class="w-6 h-6 stroke-[2]"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">Bạn chưa tạo khảo sát nào</h3>
            <p class="text-xs text-slate-400 dark:text-slate-400 max-w-sm mx-auto">Tạo biểu mẫu trực tiếp hoặc gắn liên kết Google Forms để bắt đầu thu thập câu trả lời từ cộng đồng.</p>
            <div class="pt-2">
              <button onclick="VibeApp.openCreateSurveyModal()" class="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]">
                Bắt Đầu Tạo Khảo Sát
              </button>
            </div>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${surveys.map(s => {
              const collected = s.collected_responses || 0;
              const target = s.target_responses || 100;
              const percent = Math.min(100, Math.round((collected / target) * 100));

              return `
                <div class="bento-card p-5 sm:p-6 flex flex-col justify-between space-y-4">
                  <div class="space-y-2.5">
                    <div class="flex justify-between items-center text-xs">
                      <div class="flex items-center gap-1.5">
                        <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold ${s.status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                          ${s.status}
                        </span>
                        ${s.is_free_trial ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800">🎁 25 Lượt Free</span>` : ''}
                      </div>
                      <span class="font-mono text-slate-600 text-xs font-bold">${collected}/${target} phản hồi</span>
                    </div>
                    <h3 class="text-base font-extrabold text-slate-900 leading-snug">${s.title}</h3>
                    
                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full" style="width: ${percent}%"></div>
                    </div>
                  </div>

                  <div class="pt-3.5 border-t border-slate-100 flex items-center gap-2">
                    <button onclick="VibeApp.navigate('analytics', { surveyId: '${s.id}' })" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all active:scale-[0.98]">
                      Xem báo cáo
                    </button>
                    <button onclick="VibeApp.exportSurvey('${s.id}')" class="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors" title="Xuất CSV">
                      <i data-lucide="download" class="w-4 h-4"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  async exportSurvey(surveyId) {
    window.open(`/api/v1/surveys/${surveyId}/export?format=csv`, '_blank');
  },

  // ==================== VIEW 7: ANALYTICS ====================
  async renderAnalyticsView(root, surveyId) {
    if (!surveyId) {
      this.navigate('creator-surveys');
      return;
    }

    const res = await this.api(`/surveys/${surveyId}/analytics`);
    const survey = res.survey;
    const stats = res.questionStats || [];
    const totalResp = res.totalValidatedResponses || 0;

    root.innerHTML = `
      <div class="space-y-6">
        
        <div class="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <button onclick="VibeApp.navigate('creator-surveys')" class="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 font-bold">
              <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Quay lại
            </button>
            <h1 class="text-xl font-extrabold text-slate-900">${survey.title}</h1>
            <p class="text-xs text-slate-500 mt-0.5 font-mono">Đã thu thập ${totalResp}/${survey.target_responses} phản hồi hợp lệ</p>
          </div>
          <button onclick="VibeApp.exportSurvey('${survey.id}')" class="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]">
            Xuất File Excel (CSV)
          </button>
        </div>

        <div class="space-y-4">
          ${stats.map((q, idx) => {
            const dist = q.distribution || {};
            const total = q.totalAnswers || 0;
            return `
              <div class="bento-card p-6 space-y-3">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="text-[10px] font-extrabold text-blue-600 uppercase">Câu #${idx + 1} • ${q.type}</span>
                    <h4 class="text-base font-extrabold text-slate-900 mt-0.5">${q.content}</h4>
                  </div>
                  <span class="text-xs text-slate-500 font-mono font-bold">${total} câu trả lời</span>
                </div>

                <div class="space-y-2 pt-2">
                  ${q.type === 'OPEN_TEXT' ? `
                    <div class="space-y-1.5">
                      <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Ý kiến phản hồi thực tế từ đáp viên:</span>
                      ${q.sampleTexts && q.sampleTexts.length > 0 ? q.sampleTexts.map(txt => `
                        <div class="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-200 italic">
                          "${txt}"
                        </div>
                      `).join('') : '<p class="text-xs text-slate-400 italic">Chưa có phản hồi tự luận.</p>'}
                    </div>
                  ` : `
                    ${Object.entries(dist).map(([opt, count]) => {
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return `
                        <div class="space-y-1">
                          <div class="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>${opt}</span>
                            <span class="font-mono text-slate-900 dark:text-white font-bold">${count} (${pct}%)</span>
                          </div>
                          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full" style="width: ${pct}%"></div>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  // ==================== VIEW: TRANG TẠO KHẢO SÁT CHUYÊN DỤNG (TAB TẠO KHẢO SÁT) ====================
  openCreateSurveyModal() {
    this.navigate('create-survey');
  },

  async renderCreateSurveyView(root) {
    if (!this.state.currentUser) {
      this.renderGuestLockedView(root, 'Tạo Khảo Sát', 'Vui lòng đăng nhập để bắt đầu thiết kế biểu mẫu khảo sát và thu thập dữ liệu từ cộng đồng.');
      return;
    }

    const userCredit = Number(this.state.currentUser?.credit_balance || 0);
    const hasFreeTrial = (this.state.currentUser?.free_trial_surveys_available || 0) > 0;
    const isVerified = !!(this.state.currentUser?.is_google_linked || this.state.currentUser?.is_email_verified);
    const defaultTarget = hasFreeTrial ? 25 : 100;

    // Khởi tạo tab và danh sách câu hỏi mẫu nếu chưa có
    if (!this.state.createSurveyTab) this.state.createSurveyTab = 'BUILDER';
    if (!this.state.builderQuestions || !Array.isArray(this.state.builderQuestions) || this.state.builderQuestions.length === 0) {
      this.state.builderQuestions = [
        {
          type: 'SINGLE_CHOICE',
          content: 'Bạn đánh giá thế nào về chất lượng và độ tiện ích của dịch vụ này?',
          options: ['Rất hài lòng', 'Hài lòng', 'Bình thường', 'Cần cải thiện thêm']
        },
        {
          type: 'LIKERT_SCALE',
          content: 'Mức độ sẵn sàng giới thiệu nền tảng này cho bạn bè hoặc đồng nghiệp?',
          options: ['1 - Rất không sẵn sàng', '2 - Không sẵn sàng', '3 - Bình thường', '4 - Sẵn sàng', '5 - Rất sẵn sàng']
        }
      ];
    }

    root.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6 pb-12">
        
        <!-- Header Page -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-sky-400 border border-blue-200/80 dark:border-blue-800/80">
                Studio Soạn Thảo Biểu Mẫu
              </span>
              <span class="text-xs text-slate-400">• Đa định dạng Google Forms / MS Forms</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Thiết Kế Khảo Sát Mới</h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Soạn thảo trực quan toàn màn hình, hỗ trợ trắc nghiệm, hộp kiểm, menu thả xuống, đánh giá sao, ngày tháng và liên kết ngoài.</p>
          </div>

          <div class="flex items-center gap-2.5 flex-shrink-0">
            <button onclick="VibeApp.navigate('creator-surveys')" class="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5">
              <i data-lucide="arrow-left" class="w-4 h-4"></i>
              <span>Khảo Sát Của Tôi</span>
            </button>
            <button onclick="VibeApp.submitFastCreate()" class="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center gap-2">
              <i data-lucide="send" class="w-4 h-4"></i>
              <span>${hasFreeTrial ? 'Xuất Bản Miễn Phí (0đ)' : 'Xuất Bản & Ký Quỹ'}</span>
            </button>
          </div>
        </div>

        <!-- Banner Ưu Đãi hoặc Số dư Credit -->
        ${hasFreeTrial ? `
          <div class="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border ${isVerified ? 'border-emerald-500/30 dark:border-emerald-500/40' : 'border-amber-500/40 dark:border-amber-500/50 bg-amber-500/5'} rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-2xl ${isVerified ? 'bg-emerald-500' : 'bg-amber-500'} text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <i data-lucide="${isVerified ? 'gift' : 'shield-alert'}" class="w-5 h-5 stroke-[2.5]"></i>
              </div>
              <div class="text-xs space-y-1">
                <div class="flex items-center gap-2">
                  <strong class="${isVerified ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'} font-bold text-sm">🎁 Ưu Đãi Khảo Sát Đầu Tay Miễn Phí</strong>
                  <span class="px-2 py-0.5 text-[10px] font-bold ${isVerified ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'} rounded-full border">Còn 1 Suất</span>
                </div>
                <p class="text-slate-600 dark:text-slate-300 text-xs leading-relaxed max-w-xl">
                  Bạn được tặng <strong>25 lượt phản hồi MIỄN PHÍ 100%</strong> (Trị giá 50.000đ). Sàn tự động tài trợ thù lao cho đáp viên, bạn không phải bỏ ra bất kỳ chi phí nào!
                </p>
                ${isVerified ? `
                  <div class="pt-1 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                    <i data-lucide="check-circle" class="w-4 h-4"></i>
                    <span>Tài khoản đã xác thực hợp lệ (Đủ điều kiện nhận ưu đãi)</span>
                  </div>
                ` : `
                  <div class="pt-2 flex flex-wrap items-center gap-2">
                    <span class="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">Để chống acc ảo, vui lòng liên kết trước:</span>
                    <button type="button" onclick="VibeApp.linkGoogleAccount()" class="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span>Liên Kết Google</span>
                    </button>
                    <button type="button" onclick="VibeApp.verifyEmailAccount()" class="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-sky-300 rounded-lg text-xs font-bold">
                      <span>Xác Thực Email</span>
                    </button>
                  </div>
                `}
              </div>
            </div>

            ${isVerified ? `
              <div class="flex-shrink-0 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-emerald-500/20 shadow-xs">
                <label class="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-800 dark:text-slate-200">
                  <input type="checkbox" id="fast-use-free-trial" checked onchange="VibeApp.toggleFreeTrialSelection(this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500">
                  <span>Dùng 25 lượt free (Ký quỹ: <strong id="fast-escrow-badge" class="text-emerald-600 dark:text-emerald-400 font-mono">0 VNĐ</strong>)</span>
                </label>
              </div>
            ` : ''}
          </div>
        ` : `
          <div class="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/50 rounded-2xl flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <div class="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-sky-400 flex items-center justify-center">
                <i data-lucide="wallet" class="w-4 h-4"></i>
              </div>
              <span>Số dư Credit khả dụng: <strong class="font-mono text-sm font-bold text-slate-900 dark:text-white">${userCredit.toLocaleString('vi-VN')} Credit</strong></span>
            </div>
            <button type="button" onclick="VibeApp.openDepositModal()" class="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1">
              <span>+ Nạp Quỹ</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `}

        <!-- Thông tin cơ bản -->
        <div class="bento-card p-5 sm:p-6 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <i data-lucide="info" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">Thông Tin Khảo Sát</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          </div>
        </div>

        <!-- Phương Thức Tạo Nội Dung -->
        <div class="bento-card p-5 sm:p-6 space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <i data-lucide="layers" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
              <h2 class="text-sm font-bold text-slate-900 dark:text-white">Phương Thức Tạo Biểu Mẫu</h2>
            </div>
            
            <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-bold">
              <button type="button" id="tab-btn-builder" onclick="VibeApp.switchCreateSurveyTab('BUILDER')" class="py-2 px-3 rounded-xl transition-all ${this.state.createSurveyTab === 'BUILDER' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'} flex items-center justify-center gap-1.5">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                <span>Soạn Trực Tiếp</span>
              </button>
              <button type="button" id="tab-btn-paste" onclick="VibeApp.switchCreateSurveyTab('SMART_PASTE')" class="py-2 px-3 rounded-xl transition-all ${this.state.createSurveyTab === 'SMART_PASTE' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'} flex items-center justify-center gap-1.5">
                <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                <span>Dán Text Nhanh</span>
              </button>
              <button type="button" id="tab-btn-url" onclick="VibeApp.switchCreateSurveyTab('EXTERNAL_URL')" class="py-2 px-3 rounded-xl transition-all ${this.state.createSurveyTab === 'EXTERNAL_URL' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'} flex items-center justify-center gap-1.5">
                <i data-lucide="link-2" class="w-3.5 h-3.5"></i>
                <span>Google / MS Forms</span>
              </button>
            </div>
          </div>

          <!-- TAB 1: FORM BUILDER TRỰC TIẾP -->
          <div id="create-tab-content-BUILDER" class="${this.state.createSurveyTab === 'BUILDER' ? '' : 'hidden'} space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span>Danh sách câu hỏi:</span>
                <span class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300 font-mono text-xs font-bold" id="builder-q-count">${this.state.builderQuestions.length}</span>
              </span>
              <button type="button" onclick="VibeApp.addBuilderQuestion()" class="py-2 px-3.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-sky-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
                <i data-lucide="plus" class="w-3.5 h-3.5 stroke-[2.5]"></i>
                <span>Thêm Câu Hỏi</span>
              </button>
            </div>

            <!-- List Questions Container -->
            <div id="builder-questions-list" class="space-y-4">
              ${this.renderBuilderQuestionsHtml()}
            </div>
          </div>

          <!-- TAB 2: SMART TEXT PASTE -->
          <div id="create-tab-content-SMART_PASTE" class="${this.state.createSurveyTab === 'SMART_PASTE' ? '' : 'hidden'} space-y-3">
            <div class="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              💡 <strong>Mẹo dán văn bản:</strong> Sao chép toàn bộ nội dung từ Word, Notion hoặc Google Docs và dán vào đây. Hệ thống sẽ tự động tách số thứ tự, câu hỏi và danh sách đáp án A, B, C, D hoặc thang điểm 1-5.
            </div>
            <textarea id="smart-paste-input" rows="8" placeholder="Câu 1: Bạn thường sử dụng thiết bị nào khi học trực tuyến?&#10;A. Máy tính xách tay (Laptop)&#10;B. Điện thoại thông minh&#10;C. Máy tính bảng (Tablet)&#10;&#10;Câu 2: Bạn hài lòng với tốc độ đường truyền internet hiện tại không?&#10;1 - Rất tệ&#10;2 - Tệ&#10;3 - Bình thường&#10;4 - Tốt&#10;5 - Rất tốt" 
                      class="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono leading-relaxed focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"></textarea>
            <button type="button" onclick="VibeApp.handleSmartPasteSubmit()" class="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs">
              <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i>
              <span>Tự Động Nhận Diện & Nạp Vào Bộ Soạn Thảo</span>
            </button>
          </div>

          <!-- TAB 3: EXTERNAL URL (GOOGLE/MS FORMS) -->
          <div id="create-tab-content-EXTERNAL_URL" class="${this.state.createSurveyTab === 'EXTERNAL_URL' ? '' : 'hidden'} space-y-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Đường dẫn Google Forms / Microsoft Forms:</label>
              <input type="url" id="fast-form-url" placeholder="https://docs.google.com/forms/d/e/.../viewform hoặc https://forms.office.com/..." 
                     class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <p class="text-[11px] text-slate-400">Nền tảng hỗ trợ liên kết ngoài từ Google Forms và Microsoft Forms có xác thực qua link.</p>
            </div>

            <!-- Google Sheets Webhook Sync -->
            <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Google Sheets Webhook URL (Tự động đồng bộ thời gian thực):</label>
                <button type="button" onclick="VibeApp.openGoogleAppsScriptGuide()" class="text-xs font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 flex items-center gap-1">
                  <i data-lucide="code" class="w-3.5 h-3.5"></i>
                  <span>Xem mã Apps Script (1-Click)</span>
                </button>
              </div>
              <input type="url" id="fast-google-sheets-url" placeholder="https://script.google.com/macros/s/AKfycb.../exec" 
                     class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <p class="text-[11px] text-slate-400">Mỗi khi có đáp viên nộp bài hợp lệ, hệ thống sẽ tự động gửi câu trả lời về file Google Sheets của bạn.</p>
            </div>
          </div>
        </div>

        <!-- Cài đặt số lượng mẫu & Điểm thưởng -->
        <div class="bento-card p-5 sm:p-6 space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <i data-lucide="settings-2" class="w-4 h-4 text-blue-600 dark:text-sky-400"></i>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">Quy Mô Khảo Sát & Điểm Thưởng Cho Đáp Viên</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Số lượng phản hồi mục tiêu:</label>
              <input type="number" id="fast-target-count" value="${defaultTarget}" min="10" step="5" class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <p class="text-[11px] text-slate-400">Khảo sát sẽ tự động đóng lại khi thu thập đủ số lượng mẫu này.</p>
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-200">Điểm thưởng mỗi lượt làm bài:</label>
              <input type="number" id="fast-reward-points" value="200" min="50" step="50" class="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <p class="text-[11px] text-slate-400">Tỷ giá: 1 Điểm = 10 VNĐ (VD: 200 Điểm tương đương 2.000 VNĐ cho đáp viên).</p>
            </div>
          </div>
        </div>

        <!-- Thanh nút Submit cuối trang -->
        <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <button onclick="VibeApp.navigate('creator-surveys')" class="w-full sm:w-auto py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all">
            Hủy & Về Danh Sách
          </button>
          <button onclick="VibeApp.submitFastCreate()" class="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <i data-lucide="send" class="w-4 h-4"></i>
            <span>${hasFreeTrial ? 'Xuất Bản Khảo Sát Miễn Phí (0đ)' : 'Xuất Bản & Khóa Quỹ Ký Quỹ'}</span>
          </button>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  switchCreateSurveyTab(tab) {
    this.haptic('light');
    this.state.createSurveyTab = tab;

    ['BUILDER', 'SMART_PASTE', 'EXTERNAL_URL'].forEach(t => {
      const contentEl = document.getElementById(`create-tab-content-${t}`);
      const btnEl = document.getElementById(t === 'BUILDER' ? 'tab-btn-builder' : (t === 'SMART_PASTE' ? 'tab-btn-paste' : 'tab-btn-url'));
      if (contentEl) {
        if (t === tab) contentEl.classList.remove('hidden');
        else contentEl.classList.add('hidden');
      }
      if (btnEl) {
        if (t === tab) {
          btnEl.className = 'py-2.5 px-3 rounded-xl transition-all bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-xs flex items-center justify-center gap-2 font-bold';
        } else {
          btnEl.className = 'py-2.5 px-3 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-2 font-semibold';
        }
      }
    });

    if (window.lucide) window.lucide.createIcons();
  },

  renderBuilderQuestionsHtml() {
    const list = this.state.builderQuestions || [];
    if (list.length === 0) {
      return `
        <div class="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
          Chưa có câu hỏi nào. Bấm <strong>"+ Thêm Câu Hỏi"</strong> để bắt đầu soạn!
        </div>
      `;
    }

    return list.map((q, qIdx) => `
      <div class="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2 text-xs">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <span class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-sky-300 text-[11px] font-mono flex items-center justify-center">${qIdx + 1}</span>
            <span>Câu hỏi ${qIdx + 1}</span>
          </div>

          <div class="flex items-center gap-2">
            <select onchange="VibeApp.updateBuilderQuestionType(${qIdx}, this.value)" class="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-blue-600 dark:text-sky-400 focus:outline-none">
              <optgroup label="Lựa chọn có sẵn">
                <option value="SINGLE_CHOICE" ${q.type === 'SINGLE_CHOICE' ? 'selected' : ''}>Trắc nghiệm (1 đáp án)</option>
                <option value="MULTIPLE_CHOICE" ${q.type === 'MULTIPLE_CHOICE' ? 'selected' : ''}>Hộp kiểm (Nhiều đáp án)</option>
                <option value="DROPDOWN" ${q.type === 'DROPDOWN' ? 'selected' : ''}>Menu thả xuống (Dropdown)</option>
              </optgroup>
              <optgroup label="Thang đo & Đánh giá">
                <option value="LIKERT_SCALE" ${q.type === 'LIKERT_SCALE' ? 'selected' : ''}>Thang đo Likert (1-5 mức độ)</option>
                <option value="RATING_STARS" ${q.type === 'RATING_STARS' ? 'selected' : ''}>Đánh giá xếp hạng (1-5 Sao)</option>
              </optgroup>
              <optgroup label="Nhập liệu văn bản & dữ liệu">
                <option value="OPEN_TEXT" ${q.type === 'OPEN_TEXT' ? 'selected' : ''}>Văn bản tự luận (Ý kiến mở)</option>
                <option value="NUMBER_INPUT" ${q.type === 'NUMBER_INPUT' ? 'selected' : ''}>Nhập số liệu (Number)</option>
                <option value="DATE_INPUT" ${q.type === 'DATE_INPUT' ? 'selected' : ''}>Chọn ngày tháng (Date)</option>
              </optgroup>
            </select>

            ${list.length > 1 ? `
              <button type="button" onclick="VibeApp.removeBuilderQuestion(${qIdx})" class="p-1 text-slate-400 hover:text-rose-600 transition-colors" title="Xóa câu hỏi này">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <div>
          <input type="text" value="${(q.content || '').replace(/"/g, '&quot;')}" oninput="VibeApp.updateBuilderQuestionContent(${qIdx}, this.value)" placeholder="Nhập nội dung câu hỏi..." 
                 class="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none">
        </div>

        ${['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'LIKERT_SCALE'].includes(q.type) ? `
          <div class="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5 pt-1">
            <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Các lựa chọn trả lời:</span>
              <button type="button" onclick="VibeApp.addBuilderOption(${qIdx})" class="text-[10px] text-blue-600 dark:text-sky-400 font-bold hover:underline">
                + Thêm lựa chọn
              </button>
            </div>
            ${(q.options || []).map((opt, optIdx) => `
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-slate-400 font-mono w-3">${String.fromCharCode(65 + optIdx)}.</span>
                <input type="text" value="${(opt || '').replace(/"/g, '&quot;')}" oninput="VibeApp.updateBuilderOptionText(${qIdx}, ${optIdx}, this.value)" placeholder="Lựa chọn ${optIdx + 1}..." 
                       class="flex-1 py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none">
                ${(q.options || []).length > 2 ? `
                  <button type="button" onclick="VibeApp.removeBuilderOption(${qIdx}, ${optIdx})" class="text-slate-400 hover:text-rose-500 p-0.5">
                    <i data-lucide="x" class="w-3 h-3"></i>
                  </button>
                ` : ''}
              </div>
            `).join('')}

            <!-- Câu hỏi sàng lọc Screener -->
            <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <label class="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" ${q.is_screener ? 'checked' : ''} onchange="VibeApp.toggleBuilderScreener(${qIdx}, this.checked)" class="rounded text-blue-600 focus:ring-0">
                <span>🎯 Câu hỏi sàng lọc đối tượng (Screener)</span>
              </label>

              ${q.is_screener ? `
                <div class="flex items-center gap-1.5 text-[11px]">
                  <span class="text-slate-500">Chỉ đi tiếp nếu chọn:</span>
                  <select onchange="VibeApp.updateBuilderQualifyingAnswer(${qIdx}, this.value)" class="py-0.5 px-2 rounded border border-blue-300 bg-blue-50/50 dark:bg-blue-950/40 text-blue-800 dark:text-sky-300 font-bold focus:outline-none text-[11px]">
                    ${(q.options || []).map(opt => `
                      <option value="${(opt || '').replace(/"/g, '&quot;')}" ${q.qualifying_answer === opt ? 'selected' : ''}>${opt}</option>
                    `).join('')}
                  </select>
                </div>
              ` : ''}
            </div>
          </div>
        ` : (q.type === 'RATING_STARS' ? `
          <div class="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0"></i>
            <span>Định dạng đánh giá trực quan từ 1 đến 5 sao theo chuẩn quốc tế.</span>
          </div>
        ` : (q.type === 'NUMBER_INPUT' ? `
          <div class="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-800/40 text-[11px] text-blue-800 dark:text-sky-300 flex items-center gap-2 font-mono">
            <i data-lucide="hash" class="w-4 h-4 flex-shrink-0"></i>
            <span>Chỉ cho phép đáp viên nhập các giá trị số (tuổi tác, thu nhập, số lượng,...).</span>
          </div>
        ` : (q.type === 'DATE_INPUT' ? `
          <div class="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
            <i data-lucide="calendar" class="w-4 h-4 flex-shrink-0"></i>
            <span>Hiển thị bộ chọn ngày tháng năm (Date Picker) thông minh.</span>
          </div>
        ` : `
          <div class="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-500 italic">
            (Người làm khảo sát sẽ tự nhập câu trả lời dạng văn bản tự do không giới hạn)
          </div>
        `)))}
      </div>
    `).join('');
  },

  toggleBuilderScreener(qIdx, isChecked) {
    if (this.state.builderQuestions && this.state.builderQuestions[qIdx]) {
      this.state.builderQuestions[qIdx].is_screener = isChecked;
      if (isChecked && !this.state.builderQuestions[qIdx].qualifying_answer) {
        const opts = this.state.builderQuestions[qIdx].options || [];
        this.state.builderQuestions[qIdx].qualifying_answer = opts[0] || '';
      }
      this.refreshBuilderQuestionsView();
    }
  },

  updateBuilderQualifyingAnswer(qIdx, val) {
    if (this.state.builderQuestions && this.state.builderQuestions[qIdx]) {
      this.state.builderQuestions[qIdx].qualifying_answer = val;
    }
  },

  refreshBuilderQuestionsView() {
    const container = document.getElementById('builder-questions-list');
    const countEl = document.getElementById('builder-q-count');
    if (container) {
      container.innerHTML = this.renderBuilderQuestionsHtml();
      if (window.lucide) window.lucide.createIcons();
    }
    if (countEl) {
      countEl.innerText = (this.state.builderQuestions || []).length;
    }
  },

  addBuilderQuestion() {
    this.haptic('light');
    if (!this.state.builderQuestions) this.state.builderQuestions = [];
    this.state.builderQuestions.push({
      type: 'SINGLE_CHOICE',
      content: '',
      options: ['Lựa chọn 1', 'Lựa chọn 2', 'Lựa chọn 3']
    });
    this.refreshBuilderQuestionsView();
  },

  removeBuilderQuestion(qIdx) {
    this.haptic('light');
    if (this.state.builderQuestions && this.state.builderQuestions.length > 1) {
      this.state.builderQuestions.splice(qIdx, 1);
      this.refreshBuilderQuestionsView();
    } else {
      this.showToast('Khảo sát cần có ít nhất 1 câu hỏi!', 'info');
    }
  },

  updateBuilderQuestionContent(qIdx, val) {
    if (this.state.builderQuestions && this.state.builderQuestions[qIdx]) {
      this.state.builderQuestions[qIdx].content = val;
    }
  },

  updateBuilderQuestionType(qIdx, newType) {
    if (this.state.builderQuestions && this.state.builderQuestions[qIdx]) {
      this.state.builderQuestions[qIdx].type = newType;
      if (newType === 'LIKERT_SCALE' && (!this.state.builderQuestions[qIdx].options || this.state.builderQuestions[qIdx].options.length < 3)) {
        this.state.builderQuestions[qIdx].options = ['1 - Rất không hài lòng', '2 - Không hài lòng', '3 - Bình thường', '4 - Hài lòng', '5 - Rất hài lòng'];
      } else if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN'].includes(newType) && (!this.state.builderQuestions[qIdx].options || this.state.builderQuestions[qIdx].options.length === 0)) {
        this.state.builderQuestions[qIdx].options = ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C'];
      }
      this.refreshBuilderQuestionsView();
    }
  },

  addBuilderOption(qIdx) {
    this.haptic('light');
    if (this.state.builderQuestions && this.state.builderQuestions[qIdx]) {
      if (!this.state.builderQuestions[qIdx].options) this.state.builderQuestions[qIdx].options = [];
      const nextLetter = String.fromCharCode(65 + this.state.builderQuestions[qIdx].options.length);
      this.state.builderQuestions[qIdx].options.push(`Lựa chọn ${nextLetter}`);
      this.refreshBuilderQuestionsView();
    }
  },

  removeBuilderOption(qIdx, optIdx) {
    this.haptic('light');
    if (this.state.builderQuestions && this.state.builderQuestions[qIdx]) {
      const opts = this.state.builderQuestions[qIdx].options;
      if (opts && opts.length > 2) {
        opts.splice(optIdx, 1);
        this.refreshBuilderQuestionsView();
      } else {
        this.showToast('Câu trắc nghiệm cần có ít nhất 2 đáp án!', 'info');
      }
    }
  },

  updateBuilderOptionText(qIdx, optIdx, val) {
    if (this.state.builderQuestions && this.state.builderQuestions[qIdx] && this.state.builderQuestions[qIdx].options) {
      this.state.builderQuestions[qIdx].options[optIdx] = val;
    }
  },

  handleSmartPasteSubmit() {
    this.haptic('medium');
    const rawText = document.getElementById('smart-paste-input')?.value?.trim();
    if (!rawText) {
      this.showToast('Vui lòng dán nội dung văn bản câu hỏi vào khung!', 'warning');
      return;
    }

    // Tự động phân tích các dòng văn bản thành danh sách câu hỏi
    const parsedQuestions = this.parseRawQuestionsText(rawText);
    if (parsedQuestions.length === 0) {
      this.showToast('Không nhận diện được câu hỏi nào từ văn bản. Vui lòng kiểm tra lại định dạng!', 'error');
      return;
    }

    this.state.builderQuestions = parsedQuestions;
    this.showToast(`Đã nhận diện thành công ${parsedQuestions.length} câu hỏi!`, 'success');
    this.switchCreateSurveyTab('BUILDER');
  },

  parseRawQuestionsText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const questions = [];
    let currentQ = null;

    for (const line of lines) {
      // Nhận diện dòng bắt đầu câu hỏi: "Câu 1:", "1.", "1/", "Bài 1:"
      const isQuestionHeader = /^(câu\s*\d+|question\s*\d+|\d+[\.\/\:\)])\s*/i.test(line);

      if (isQuestionHeader) {
        if (currentQ) {
          questions.push(currentQ);
        }
        const cleanContent = line.replace(/^(câu\s*\d+|question\s*\d+|\d+[\.\/\:\)])\s*/i, '').trim();
        currentQ = {
          type: 'SINGLE_CHOICE',
          content: cleanContent || line,
          options: []
        };
      } else if (currentQ) {
        // Nhận diện lựa chọn đáp án: "A.", "a/", "A)", "1 -", "•", "-"
        const optMatch = /^([a-zA-Z0-9][\.\)\:\/\-]|•|\*|\-)\s*(.+)/.exec(line);
        if (optMatch) {
          currentQ.options.push(optMatch[2].trim());
        } else if (currentQ.options.length === 0) {
          // Nếu chưa có đáp án, nối thêm vào nội dung câu hỏi
          currentQ.content += ' ' + line;
        } else {
          currentQ.options.push(line);
        }
      } else {
        // Nếu dòng đầu tiên không có số thứ tự thì mặc định là câu 1
        currentQ = {
          type: 'SINGLE_CHOICE',
          content: line,
          options: []
        };
      }
    }

    if (currentQ) {
      questions.push(currentQ);
    }

    // Chuẩn hóa câu hỏi nếu không có options
    return questions.map(q => {
      if (!q.options || q.options.length < 2) {
        return {
          ...q,
          type: 'OPEN_TEXT',
          options: []
        };
      }
      return q;
    });
  },

  toggleFreeTrialSelection(isChecked) {
    const targetInput = document.getElementById('fast-target-count');
    const badge = document.getElementById('fast-escrow-badge');
    if (isChecked) {
      if (targetInput) targetInput.value = 25;
      if (badge) badge.innerText = '0 VNĐ';
    } else {
      if (targetInput && Number(targetInput.value) <= 25) targetInput.value = 100;
      if (badge) badge.innerText = 'Có tính phí';
    }
  },

  async linkGoogleAccount() {
    this.haptic('medium');
    this.showToast('Đang kết nối tài khoản Google...', 'info');
    try {
      const googleId = 'g_' + (this.state.currentUser?.id || Date.now());
      const res = await this.api('/auth/link-google', {
        method: 'POST',
        body: JSON.stringify({ google_id: googleId })
      });
      if (res.success) {
        if (this.state.currentUser) {
          this.state.currentUser.is_google_linked = 1;
        }
        this.haptic('success');
        this.showToast('Liên kết tài khoản Google thành công! Bạn đã đủ điều kiện nhận 25 lượt free.', 'success');
        this.openFastCreateModal();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async verifyEmailAccount() {
    this.haptic('medium');
    try {
      const res = await this.api('/auth/verify-email', { method: 'POST' });
      if (res.success) {
        if (this.state.currentUser) {
          this.state.currentUser.is_email_verified = 1;
        }
        this.haptic('success');
        this.showToast('Xác thực Email thành công! Bạn đã đủ điều kiện nhận 25 lượt free.', 'success');
        this.openFastCreateModal();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  getGoogleAppsScriptCode() {
    return `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Nếu trang tính chưa có tiêu đề cột thì tạo dòng header
    if (sheet.getLastRow() === 0) {
      var headerRow = ["Thời Gian Nộp", "ID Phản Hồi", "Thời Lượng (giây)", "Điểm Chất Lượng"];
      for (var qKey in data.answers) {
        headerRow.push(qKey);
      }
      sheet.appendRow(headerRow);
    }
    
    // Ghi dữ liệu câu trả lời của đáp viên
    var row = [data.submitted_at, data.response_id, data.duration_sec, data.quality_score];
    for (var key in data.answers) {
      row.push(data.answers[key]);
    }
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đã ghi nhận phản hồi" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  },

  openGoogleAppsScriptGuide() {
    this.haptic('light');
    const scriptCode = this.getGoogleAppsScriptCode();

    this.showModal({
      title: 'Mẫu Google Apps Script Đồng Bộ 1-Click',
      content: `
        <div class="space-y-4 text-left">
          
          <div class="p-3 bg-blue-50/80 rounded-xl border border-blue-200/70 text-xs text-blue-900 space-y-1.5">
            <div class="font-bold flex items-center gap-1.5 text-blue-950">
              <i data-lucide="zap" class="w-4 h-4 text-blue-600"></i>
              <span>Cài đặt đồng bộ trang tính trong 30 giây:</span>
            </div>
            <ol class="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
              <li>Mở file <strong>Google Sheets</strong> &rarr; Chọn menu <strong>Tiện ích mở rộng (Extensions)</strong> &rarr; <strong>Apps Script</strong>.</li>
              <li>Dán đoạn mã bên dưới vào &rarr; Nhấn <strong>Lưu (Save)</strong>.</li>
              <li>Nhấn <strong>Triển khai (Deploy)</strong> &rarr; <strong>Tùy chọn triển khai mới (New deployment)</strong> &rarr; Chọn loại <strong>Ứng dụng Web (Web app)</strong> &rarr; Mục <em>Người có quyền truy cập</em> chọn <strong>Bất kỳ ai (Anyone)</strong> &rarr; Triển khai và sao chép <strong>URL ứng dụng web</strong> dán vào ô Webhook.</li>
            </ol>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Đoạn mã Apps Script (doPost):</span>
              <button onclick="VibeApp.copyAppsScript()" class="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all active:scale-[0.98]">
                <i data-lucide="copy" class="w-3 h-3"></i>
                <span>Sao Chép Mã</span>
              </button>
            </div>
            <pre class="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-52 leading-relaxed border border-slate-800">${scriptCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </div>

          <div class="flex gap-2.5 pt-1">
            <button onclick="VibeApp.copyAppsScript()" class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>Sao Chép Mã & Quay Lại Tạo Khảo Sát</span>
            </button>
            <button onclick="VibeApp.openCreateSurveyModal()" class="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-[0.98]">
              Quay Lại
            </button>
          </div>

        </div>
      `
    });
  },

  copyAppsScript() {
    this.haptic('success');
    const code = this.getGoogleAppsScriptCode();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code);
    }
    this.showToast('Đã sao chép mã Google Apps Script!', 'success');
  },

  async submitFastCreate() {
    const title = document.getElementById('fast-title')?.value?.trim();
    const category = document.getElementById('fast-category')?.value || 'Thị trường';
    const formUrl = document.getElementById('fast-form-url')?.value?.trim();
    const webhookUrl = document.getElementById('fast-google-sheets-url')?.value?.trim();
    const target = parseInt(document.getElementById('fast-target-count')?.value, 10) || 100;
    const pts = parseInt(document.getElementById('fast-reward-points')?.value, 10) || 200;
    const isFreeTrial = document.getElementById('fast-use-free-trial')?.checked === true;
    const currentTab = this.state.createSurveyTab || 'BUILDER';

    if (!title) {
      this.showToast('Vui lòng nhập tiêu đề khảo sát!', 'warning');
      return;
    }

    let source = 'INTERNAL_BUILDER';
    let externalUrl = null;
    let questionsPayload = [];

    if (currentTab === 'EXTERNAL_URL') {
      if (!formUrl) {
        this.showToast('Vui lòng nhập đường link Google Forms hoặc MS Forms!', 'warning');
        return;
      }
      externalUrl = formUrl;
      if (formUrl.includes('google.com') || formUrl.includes('forms.gle')) source = 'GOOGLE_FORMS';
      else if (formUrl.includes('office.com') || formUrl.includes('microsoft.com')) source = 'MS_FORMS';
      
      questionsPayload = [
        {
          id: 'q_ext_1',
          type: 'SINGLE_CHOICE',
          content: 'Bạn đã hoàn thành việc điền biểu mẫu liên kết ngoài chưa?',
          options: ['Tôi đã điền và nộp biểu mẫu thành công', 'Tôi đang điền biểu mẫu'],
          is_attention_check: false
        }
      ];
    } else {
      // Chế độ SOẠN CÂU HỎI TRỰC TIẾP (INTERNAL BUILDER) HOẶC SMART PASTE
      source = 'INTERNAL_BUILDER';
      externalUrl = null;

      const rawQuestions = this.state.builderQuestions || [];
      const cleanQuestions = [];

      for (let i = 0; i < rawQuestions.length; i++) {
        const q = rawQuestions[i];
        const content = (q.content || '').trim();
        if (!content) continue; // Bỏ qua câu hỏi rỗng

        let validOptions = [];
        if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'LIKERT_SCALE'].includes(q.type)) {
          validOptions = (q.options || []).map(o => (o || '').trim()).filter(Boolean);
          if (validOptions.length < 2) {
            this.showToast(`Câu hỏi ${i + 1} (${q.type}) cần có ít nhất 2 lựa chọn đáp án!`, 'warning');
            return;
          }
        }

        cleanQuestions.push({
          id: `q_custom_${i + 1}`,
          type: q.type || 'SINGLE_CHOICE',
          content: content,
          options: validOptions.length > 0 ? validOptions : null,
          is_attention_check: false,
          is_screener: q.is_screener === true,
          qualifying_answer: q.is_screener ? (q.qualifying_answer || validOptions[0] || null) : null
        });
      }

      if (cleanQuestions.length === 0) {
        this.showToast('Khảo sát cần có ít nhất 1 câu hỏi có nội dung!', 'warning');
        return;
      }

      questionsPayload = cleanQuestions;
    }

    try {
      const createRes = await this.api('/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: 'Khảo sát nghiên cứu trải nghiệm và thị trường người dùng.',
          category: category,
          target_responses: target,
          survey_source: source,
          external_form_url: externalUrl,
          google_sheets_webhook_url: webhookUrl || null,
          reward_mode: 'POINTS_ONLY',
          reward_points_per_response: pts,
          questions: questionsPayload
        })
      });

      if (createRes.success && createRes.surveyId) {
        // Lưu khảo sát do user tạo vào localStorage để respondent luôn xem được trong "Khảo Sát Của Tôi"
        const storedIds = JSON.parse(localStorage.getItem('vibesurvey_my_surveys') || '[]');
        if (!storedIds.includes(createRes.surveyId)) {
          storedIds.push(createRes.surveyId);
          localStorage.setItem('vibesurvey_my_surveys', JSON.stringify(storedIds));
        }

        try {
          const pubRes = await this.api(`/surveys/${createRes.surveyId}/publish`, { 
            method: 'POST',
            body: JSON.stringify({ use_free_trial: isFreeTrial })
          });
          this.haptic('success');
          if (pubRes.isFreeTrial) {
            if (this.state.currentUser) {
              this.state.currentUser.free_trial_surveys_available = 0;
            }
            this.showToast('🎉 Kích hoạt thành công 25 lượt khảo sát MIỄN PHÍ!', 'success');
          } else {
            this.showToast('Xuất bản khảo sát thành công!', 'success');
          }
          this.closeModal();
          this.navigate('creator-surveys');
        } catch (pubErr) {
          this.closeModal();
          this.navigate('creator-surveys');
          if (pubErr.message && pubErr.message.includes('Số dư không đủ')) {
            this.showToast('Đã lưu bản nháp! Bạn cần nạp thêm Credit để ký quỹ xuất bản khảo sát này.', 'warning');
            setTimeout(() => VibeApp.openDepositModal(), 600);
          } else {
            this.showToast(pubErr.message, 'error');
          }
        }
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== VIEW 8: ADMIN DASHBOARD ====================
  async renderAdminOverviewView(root) {
    if (!this.state.currentUser || this.state.currentUser.role !== 'ADMIN') {
      this.showToast('Bạn không có quyền truy cập trang quản trị hệ thống', 'error');
      this.navigate('surveys');
      return;
    }

    const res = await this.api('/admin/overview');
    const fin = res.overview.financials || {};

    root.innerHTML = `
      <div class="space-y-6">
        <div class="pb-4 border-b border-slate-200">
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Quản Trị Hệ Thống & Doanh Thu Sàn</h1>
          <p class="text-xs text-slate-500 mt-0.5">Mô hình kinh tế thu phí Spread chênh lệch (Take Rate 40%).</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div class="bento-card p-5">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Doanh thu Creator</span>
            <div class="text-2xl font-black font-mono text-slate-900 mt-1">${(fin.totalCreatorSpendVnd || 0).toLocaleString()}đ</div>
          </div>
          <div class="bento-card p-5">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Chi trả Respondent</span>
            <div class="text-2xl font-black font-mono text-emerald-600 mt-1">${(fin.totalRespondentEarnVnd || 0).toLocaleString()}đ</div>
          </div>
          <div class="bento-card p-5">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Lợi nhuận gộp</span>
            <div class="text-2xl font-black font-mono text-amber-600 mt-1">${(fin.grossPlatformProfitVnd || 0).toLocaleString()}đ</div>
          </div>
          <div class="bento-card p-5">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Tỷ lệ Spread</span>
            <div class="text-2xl font-black font-mono text-blue-600 mt-1">${fin.effectiveTakeRatePercent || 40}%</div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  async renderAdminPayoutsView(root) {
    if (!this.state.currentUser || this.state.currentUser.role !== 'ADMIN') {
      this.showToast('Bạn không có quyền truy cập trang duyệt chi thưởng', 'error');
      this.navigate('surveys');
      return;
    }

    const res = await this.api('/admin/payouts');
    const payouts = res.payouts || [];

    root.innerHTML = `
      <div class="space-y-6">
        <div class="pb-4 border-b border-slate-200">
          <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Duyệt Yêu Cầu Rút Thưởng</h1>
          <p class="text-xs text-slate-500 mt-0.5">Đối soát thông tin tài khoản và giải ngân thanh toán ngân hàng.</p>
        </div>

        <div class="bento-card p-6">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th class="p-3">Tài khoản</th>
                <th class="p-3">Số tiền</th>
                <th class="p-3">Phương thức</th>
                <th class="p-3">Trạng thái</th>
                <th class="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${payouts.length === 0 ? `
                <tr><td colspan="5" class="p-6 text-center text-slate-400">Không có yêu cầu nào đang chờ.</td></tr>
              ` : payouts.map(p => `
                <tr>
                  <td class="p-3 font-bold">${p.user_name}<br><span class="text-[11px] text-slate-400">${p.user_email}</span></td>
                  <td class="p-3 font-mono font-bold text-slate-900">${p.net_amount_vnd.toLocaleString()}đ</td>
                  <td class="p-3">${p.payout_method}</td>
                  <td class="p-3 font-bold">${p.status}</td>
                  <td class="p-3 text-right">
                    ${p.status === 'PENDING' ? `
                      <button onclick="VibeApp.handleAdminPayout('${p.id}', true)" class="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold mr-1">Duyệt</button>
                      <button onclick="VibeApp.handleAdminPayout('${p.id}', false)" class="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold">Từ chối</button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  async handleAdminPayout(payoutId, isApproved) {
    const action = isApproved ? 'APPROVE' : 'REJECT';
    try {
      await this.api(`/admin/payouts/${payoutId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, admin_note: isApproved ? 'Đã duyệt qua ngân hàng' : 'Từ chối' })
      });
      this.showToast('Xử lý thành công', 'success');
      this.navigate('admin-payouts');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  },

  async renderAdminFraudView(root) {
    if (!this.state.currentUser || this.state.currentUser.role !== 'ADMIN') {
      this.showToast('Bạn không có quyền truy cập trang quản trị gian lận', 'error');
      this.navigate('surveys');
      return;
    }

    const [resLogs, resBanned] = await Promise.all([
      this.api('/admin/fraud-logs').catch(() => ({ logs: [] })),
      this.api('/admin/banned-ips').catch(() => ({ bannedIps: [] }))
    ]);
    const logs = resLogs.logs || resLogs.fraudLogs || [];
    const bannedIps = resBanned.bannedIps || [];

    root.innerHTML = `
      <div class="space-y-6">
        <div class="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Kiểm Soát Gian Lận & An Ninh IP</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Theo dõi chống spam bẫy chú ý, phát hiện nhiều tài khoản trên 1 thiết bị và tự động khóa IP.</p>
          </div>
          <span class="px-3 py-1 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
            <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
            <span>${bannedIps.length} IP Đang Bị Cấm</span>
          </span>
        </div>

        <!-- Khối 1: Danh sách IP bị Ban tự động -->
        <div class="bento-card p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <i data-lucide="ban" class="w-4 h-4 text-red-600"></i>
              <span>Danh Sách IP Bị Khóa Tự Động (Auto-Banned IPs)</span>
            </h2>
            <span class="text-[11px] text-slate-500 font-mono">Tự động ban khi có >= 5 tài khoản/thiết bị</span>
          </div>

          ${bannedIps.length === 0 ? `
            <div class="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              Hiện tại không có địa chỉ IP nào bị khóa.
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th class="p-3">Địa Chỉ IP</th>
                    <th class="p-3">Lý Do Khóa</th>
                    <th class="p-3">Thời Điểm</th>
                    <th class="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  ${bannedIps.map(b => `
                    <tr>
                      <td class="p-3 font-mono font-bold text-red-600 dark:text-red-400">${b.ip_address}</td>
                      <td class="p-3 text-slate-700 dark:text-slate-300">${b.reason}</td>
                      <td class="p-3 font-mono text-slate-400">${new Date(b.banned_at).toLocaleString('vi-VN')}</td>
                      <td class="p-3 text-right">
                        <button onclick="VibeApp.unbanIpAddress('${b.ip_address}')" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all">
                          Gỡ Cấm IP
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Khối 2: Lịch sử Nhật Ký Gian Lận & Cảnh Báo Khả Nghi -->
        <div class="bento-card p-5 space-y-3">
          <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <i data-lucide="activity" class="w-4 h-4 text-amber-500"></i>
            <span>Nhật Ký Cảnh Báo Khả Nghi & Gian Lận</span>
          </h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th class="p-3">Thời gian</th>
                  <th class="p-3">Tài khoản</th>
                  <th class="p-3">Sự Kiện & Lý Do</th>
                  <th class="p-3">IP / Thiết bị</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                ${logs.map(l => {
                  const isMultiAccAlert = l.reason === 'CANH_BAO_KHA_NGHI_MULTI_ACCOUNT';
                  const isAutoBan = l.reason === 'AUTO_BAN_IP_MULTI_ACCOUNT_BREACH';
                  return `
                    <tr class="${isAutoBan ? 'bg-red-50/50 dark:bg-red-950/20' : (isMultiAccAlert ? 'bg-amber-50/50 dark:bg-amber-950/20' : '')}">
                      <td class="p-3 font-mono text-slate-500">${new Date(l.created_at).toLocaleString('vi-VN')}</td>
                      <td class="p-3 font-bold">${l.user_name || 'Khách/Ẩn danh'}</td>
                      <td class="p-3">
                        ${isAutoBan ? `
                          <span class="px-2 py-0.5 bg-red-600 text-white font-bold rounded-md text-[10px]">AUTO-BAN IP</span>
                          <span class="text-red-700 dark:text-red-400 font-bold ml-1">Đã cấm IP do vượt ngưỡng 5 acc</span>
                        ` : (isMultiAccAlert ? `
                          <span class="px-2 py-0.5 bg-amber-500 text-white font-bold rounded-md text-[10px]">CẢNH BÁO KHẢ NGHI</span>
                          <span class="text-amber-800 dark:text-amber-300 font-bold ml-1">Phát hiện >= 3 tài khoản trên 1 thiết bị</span>
                        ` : `
                          <span class="text-red-600 font-bold">${l.reason}</span>
                        `)}
                      </td>
                      <td class="p-3 font-mono text-slate-500">${l.ip_address || '127.0.0.1'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  async unbanIpAddress(ip) {
    this.haptic('medium');
    try {
      const res = await this.api('/admin/unban-ip', {
        method: 'POST',
        body: JSON.stringify({ ip_address: ip })
      });
      this.showToast(res.message || 'Đã gỡ cấm IP thành công', 'success');
      this.navigate('admin-fraud');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==================== TIỆN ÍCH THÔNG BÁO CAO CẤP (UI-UX-PRO-MAX) ====================
  showToast(messageOrConfig, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    let title = '';
    let description = '';

    if (typeof messageOrConfig === 'object' && messageOrConfig !== null) {
      title = messageOrConfig.title || '';
      description = messageOrConfig.description || messageOrConfig.message || '';
      if (messageOrConfig.type) type = messageOrConfig.type;
    } else {
      const msg = String(messageOrConfig || '');

      // Bộ phân loại ngôn ngữ thông minh (Smart Humanized Parser)
      if (msg.includes('không có quyền') || msg.includes('Yêu cầu vai trò') || msg.includes('không thuộc quyền')) {
        type = 'error';
        title = 'Yêu Cầu Quyền Hạn';
        description = msg.includes('Yêu cầu vai trò') 
          ? 'Thao tác này yêu cầu tài khoản phù hợp hoặc phiên làm việc tương ứng.' 
          : msg;
      } else if (type === 'error') {
        title = 'Có Lỗi Xảy Ra';
        description = msg;
      } else if (msg.includes('Số dư không đủ') || msg.includes('không đủ để ký quỹ')) {
        type = 'warning';
        title = 'Số Dư Chưa Đủ Ký Quỹ';
        description = msg;
      } else if (msg.includes('Chào mừng') || msg.includes('thành công') || msg.includes('Thành công')) {
        type = type === 'info' ? 'success' : type;
        title = type === 'success' ? 'Thao Tác Thành Công' : 'Thông Báo';
        description = msg;
      } else if (msg.includes('Vui lòng') || msg.includes('cảnh báo') || msg.includes('chú ý')) {
        type = 'warning';
        title = 'Lưu Ý Thao Tác';
        description = msg;
      } else {
        title = type === 'success' ? 'Thành Công' :
                type === 'error' ? 'Có Lỗi Xảy Ra' :
                type === 'warning' ? 'Thông Báo Cần Lưu Ý' : 'Thông Tin';
        description = msg;
      }
    }

    // Cấu hình theme màu & Icon SVG Lucide cao cấp
    const themeConfig = {
      success: {
        icon: 'check-circle-2',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60',
        progressBar: 'bg-emerald-500',
        accentBorder: 'border-l-4 border-l-emerald-500'
      },
      error: {
        icon: 'alert-circle',
        iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60',
        progressBar: 'bg-rose-500',
        accentBorder: 'border-l-4 border-l-rose-500'
      },
      warning: {
        icon: 'alert-triangle',
        iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60',
        progressBar: 'bg-amber-500',
        accentBorder: 'border-l-4 border-l-amber-500'
      },
      info: {
        icon: 'sparkles',
        iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60',
        progressBar: 'bg-indigo-500',
        accentBorder: 'border-l-4 border-l-indigo-500'
      }
    };

    const cfg = themeConfig[type] || themeConfig.info;
    const durationMs = 3800;

    const toast = document.createElement('div');
    toast.className = `toast-pro-card ${cfg.accentBorder}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    toast.innerHTML = `
      <div class="w-8 h-8 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
        <i data-lucide="${cfg.icon}" class="w-4 h-4 stroke-[2.4]"></i>
      </div>
      <div class="flex-1 min-w-0 pr-1">
        <h4 class="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">${title}</h4>
        <p class="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5 break-words">${description}</p>
      </div>
      <button type="button" class="toast-close-btn p-1 -mr-1 -mt-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex-shrink-0" title="Đóng thông báo">
        <i data-lucide="x" class="w-3.5 h-3.5 stroke-[2.2]"></i>
      </button>
      <div class="toast-progress-bar ${cfg.progressBar}" style="animation-duration: ${durationMs}ms;"></div>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    const dismiss = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px) scale(0.95)';
      toast.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => toast.remove(), 200);
    };

    if (closeBtn) closeBtn.onclick = dismiss;

    let dismissTimer = setTimeout(dismiss, durationMs);
    toast.onmouseenter = () => clearTimeout(dismissTimer);
    toast.onmouseleave = () => { dismissTimer = setTimeout(dismiss, 1800); };

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    this.haptic(type === 'error' ? 'warning' : type === 'success' ? 'success' : 'light');
  },

  showModal({ title, content }) {
    const container = document.getElementById('modal-container');
    const card = document.getElementById('modal-card');
    if (!container || !card) return;

    card.innerHTML = `
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
        <h3 class="text-base font-extrabold text-slate-900">${title}</h3>
        <button onclick="VibeApp.closeModal()" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <i data-lucide="x" class="w-4 h-4 stroke-[2.2]"></i>
        </button>
      </div>
      <div>${content}</div>
    `;

    container.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  },

  closeModal() {
    const container = document.getElementById('modal-container');
    if (container) container.classList.add('hidden');
  },

  copyText(text) {
    this.haptic('success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    this.showToast('Đã sao chép mã ưu đãi!', 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  VibeApp.init();
});
