const fs = require('fs');

const appPath = 'public/app.js';
let code = fs.readFileSync(appPath, 'utf8');

// 1. Update filter default in renderForumView: add hub: 'ALL'
code = code.replace(
  `      this.state.forumFilter = {
        category: 'ALL',
        scope: 'ALL',
        status: 'ALL',
        sort: 'NEWEST',
        search: ''
      };`,
  `      this.state.forumFilter = {
        category: 'ALL',
        scope: 'ALL',
        status: 'ALL',
        sort: 'NEWEST',
        search: '',
        hub: 'ALL'
      };`
);

// 2. In _renderForumLayout:
// Add Hub tabs right before: <!-- 2. THANH BỘ LỌC TINH GỌN CHUẨN DESIGN.MD -->
const targetFilterBar = `        <!-- 2. THANH BỘ LỌC TINH GỌN CHUẨN DESIGN.MD -->`;
const hubTabsHtml = `        <!-- HUB TABS: CỘNG ĐỒNG CHUNG vs GÓC SINH VIÊN & ĐỀ TÀI -->
        <div class="flex items-center gap-2 p-1.5 bg-stone-100 dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          <button id="forum-hub-tab-all" onclick="VibeApp.setForumHub('ALL')" 
                  class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl \${filter.hub === 'ALL' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-bold shadow-xs' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white font-medium'} transition-all cursor-pointer">
            <i data-lucide="layers" class="w-4 h-4"></i>
            <span class="text-xs sm:text-sm">Tất Cả</span>
          </button>
          <button id="forum-hub-tab-community" onclick="VibeApp.setForumHub('COMMUNITY')" 
                  class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl \${filter.hub === 'COMMUNITY' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-bold shadow-xs' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white font-medium'} transition-all cursor-pointer">
            <i data-lucide="globe" class="w-4 h-4 text-orange-600"></i>
            <span class="text-xs sm:text-sm">Cộng Đồng Chung</span>
            <span class="hidden md:inline text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-medium">Thảo luận mở</span>
          </button>
          <button id="forum-hub-tab-student" onclick="VibeApp.setForumHub('STUDENT')" 
                  class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl \${filter.hub === 'STUDENT' ? 'bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 font-bold shadow-xs' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white font-medium'} transition-all cursor-pointer">
            <i data-lucide="graduation-cap" class="w-4 h-4 text-orange-600"></i>
            <span class="text-xs sm:text-sm">Góc Sinh Viên & Đề Tài</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 font-bold">Edu Karma</span>
          </button>
        </div>

`;

if (!code.includes('id="forum-hub-tab-community"')) {
  code = code.replace(targetFilterBar, hubTabsHtml + targetFilterBar);
}

// 3. Update scope buttons to include "Thảo luận" (DISCUSSION_ONLY)
const targetScopeButtons = `<div id="forum-scope-buttons-wrapper" class="flex items-center bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs overflow-x-auto no-scrollbar">
              <button data-scope="ALL" onclick="VibeApp.setForumScopeFilter('ALL')" 
                      class="px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'ALL' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                Tất cả
              </button>
              <button data-scope="WITH_SURVEY" onclick="VibeApp.setForumScopeFilter('WITH_SURVEY')" 
                      class="px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'WITH_SURVEY' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                Khảo sát
              </button>
              <button data-scope="EXCHANGE" onclick="VibeApp.setForumScopeFilter('EXCHANGE')" 
                      class="px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'EXCHANGE' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                Trao đổi
              </button>
              \${user ? \`
                <button data-scope="MY_POSTS" onclick="VibeApp.setForumScopeFilter('MY_POSTS')" 
                        class="px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'MY_POSTS' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                  Của tôi
                </button>
              \` : ''}
            </div>`;

const newScopeButtons = `<div id="forum-scope-buttons-wrapper" class="flex items-center bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs overflow-x-auto no-scrollbar">
              <button data-scope="ALL" onclick="VibeApp.setForumScopeFilter('ALL')" 
                      class="px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'ALL' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                Tất cả
              </button>
              <button data-scope="DISCUSSION_ONLY" onclick="VibeApp.setForumScopeFilter('DISCUSSION_ONLY')" 
                      class="px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'DISCUSSION_ONLY' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                Thảo luận
              </button>
              <button data-scope="WITH_SURVEY" onclick="VibeApp.setForumScopeFilter('WITH_SURVEY')" 
                      class="px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'WITH_SURVEY' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                Khảo sát
              </button>
              <button data-scope="EXCHANGE" onclick="VibeApp.setForumScopeFilter('EXCHANGE')" 
                      class="px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'EXCHANGE' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                Trao đổi
              </button>
              \${user ? \`
                <button data-scope="MY_POSTS" onclick="VibeApp.setForumScopeFilter('MY_POSTS')" 
                        class="px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap \${filter.scope === 'MY_POSTS' ? 'bg-white dark:bg-stone-800 text-orange-600 font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 font-medium'}">
                  Của tôi
                </button>
              \` : ''}
            </div>`;

code = code.replace(targetScopeButtons, newScopeButtons);

// 4. Add setForumHub method right before handleForumSearchInPlace
const setForumHubMethod = `  setForumHub(hubId) {
    this.haptic('light');
    this.state.forumFilter = this.state.forumFilter || { category: 'ALL', scope: 'ALL', status: 'ALL', sort: 'NEWEST', search: '', hub: 'ALL' };
    this.state.forumFilter.hub = hubId;

    const allBtn = document.getElementById('forum-hub-tab-all');
    const comBtn = document.getElementById('forum-hub-tab-community');
    const stuBtn = document.getElementById('forum-hub-tab-student');

    if (allBtn && comBtn && stuBtn) {
      allBtn.className = \`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl \${hubId === 'ALL' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-bold shadow-xs' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white font-medium'} transition-all cursor-pointer\`;
      comBtn.className = \`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl \${hubId === 'COMMUNITY' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-bold shadow-xs' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white font-medium'} transition-all cursor-pointer\`;
      stuBtn.className = \`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl \${hubId === 'STUDENT' ? 'bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 font-bold shadow-xs' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white font-medium'} transition-all cursor-pointer\`;
    }

    this._updateForumFeedInPlace();
  },

`;

if (!code.includes('setForumHub(hubId)')) {
  code = code.replace('  handleForumSearchInPlace(val) {', setForumHubMethod + '  handleForumSearchInPlace(val) {');
}

// 5. Update _updateForumFeedInPlace: filter by hub and scope === 'DISCUSSION_ONLY'
const oldFilterBlock = `    // 2. Lọc theo phạm vi (Scope)
    if (filter.scope === 'WITH_SURVEY') {
      filtered = filtered.filter(p => p.survey && p.survey.id);
    } else if (filter.scope === 'EXCHANGE') {
      filtered = filtered.filter(p => p.survey && (p.survey.is_student_exchange === 1 || p.survey.is_student_exchange === true));
    } else if (filter.scope === 'MY_POSTS' && user) {
      filtered = filtered.filter(p => p.author && p.author.id === user.id);
    }`;

const newFilterBlock = `    // 1.5. Lọc theo Phân Khu (Hub)
    if (filter.hub === 'COMMUNITY') {
      filtered = filtered.filter(p => p.post_type !== 'STUDENT' && (!p.survey || (!p.survey.is_student_exchange && p.survey.is_student_exchange !== 1)));
    } else if (filter.hub === 'STUDENT') {
      filtered = filtered.filter(p => p.post_type === 'STUDENT' || (p.survey && (p.survey.is_student_exchange === 1 || p.survey.is_student_exchange === true)));
    }

    // 2. Lọc theo phạm vi (Scope)
    if (filter.scope === 'WITH_SURVEY') {
      filtered = filtered.filter(p => p.survey && p.survey.id);
    } else if (filter.scope === 'DISCUSSION_ONLY') {
      filtered = filtered.filter(p => !p.survey || !p.survey.id);
    } else if (filter.scope === 'EXCHANGE') {
      filtered = filtered.filter(p => p.post_type === 'STUDENT' || (p.survey && (p.survey.is_student_exchange === 1 || p.survey.is_student_exchange === true)));
    } else if (filter.scope === 'MY_POSTS' && user) {
      filtered = filtered.filter(p => p.author && p.author.id === user.id);
    }`;

code = code.replace(oldFilterBlock, newFilterBlock);

// 6. Update renderForumPostCardHtml to support posts without survey
const oldSurveyCardTarget = `        <!-- THẺ KHẢO SÁT ĐÍNH KÈM TƯƠNG TÁC (EMBEDDED SURVEY CARD) -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-stone-50/90 dark:bg-[#151518] border border-stone-200/80 dark:border-stone-800 space-y-3">
          <div class="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-[11px]">
                \${this.escapeHtml(s.category || 'Khảo sát')}
              </span>
              \${isEduExchange ? \`
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold text-[11px] border border-orange-200/60 dark:border-orange-800/60">
                  <i data-lucide="graduation-cap" class="w-3.5 h-3.5"></i>
                  <span>Trao Đổi Edu</span>
                </span>
              \` : ''}
            </div>

            <div class="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
              \${isEduExchange ? '+1 Điểm Karma' : \`+\${(s.reward_points_per_response || 0).toLocaleString('vi-VN')} Point\`}
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="text-xs sm:text-sm font-bold text-stone-900 dark:text-white leading-snug truncate">
                \${this.escapeHtml(s.title || 'Khảo sát đính kèm')}
              </h3>
              <p class="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                \${this.escapeHtml(s.description || 'Tham gia làm bài để hỗ trợ tác giả thu thập dữ liệu.')}
              </p>
            </div>

            <button onclick="VibeApp.startSurveySession('\${s.id}')" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer">
              <span>Tham Gia Khảo Sát</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <!-- Tiến độ thu mẫu -->
          <div class="space-y-1 pt-1 border-t border-stone-200/60 dark:border-stone-800">
            <div class="flex items-center justify-between text-[10.5px] text-stone-500 font-semibold font-mono">
              <span>Thu thập: \${collected}/\${target} mẫu</span>
              <span class="text-orange-600 dark:text-orange-400 font-bold">\${progress}%</span>
            </div>
            <div class="w-full bg-stone-200/70 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-orange-600 h-full rounded-full transition-all duration-300" style="width: \${progress}%"></div>
            </div>
          </div>
        </div>`;

const newSurveyCardTarget = `        <!-- THẺ KHẢO SÁT ĐÍNH KÈM HOẶC THÔNG TIN THẢO LUẬN TỰ DO -->
        \${post.survey && post.survey.id ? \`
          <div class="p-3.5 sm:p-4 rounded-2xl bg-stone-50/90 dark:bg-[#151518] border border-stone-200/80 dark:border-stone-800 space-y-3">
            <div class="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-[11px]">
                  \${this.escapeHtml(s.category || 'Khảo sát')}
                </span>
                \${isEduExchange ? \`
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold text-[11px] border border-orange-200/60 dark:border-orange-800/60">
                    <i data-lucide="graduation-cap" class="w-3.5 h-3.5"></i>
                    <span>Trao Đổi Edu</span>
                  </span>
                \` : ''}
              </div>

              <div class="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                \${isEduExchange ? '+1 Điểm Karma' : \`+\${(s.reward_points_per_response || 0).toLocaleString('vi-VN')} Point\`}
              </div>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h3 class="text-xs sm:text-sm font-bold text-stone-900 dark:text-white leading-snug truncate">
                  \${this.escapeHtml(s.title || 'Khảo sát đính kèm')}
                </h3>
                <p class="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                  \${this.escapeHtml(s.description || 'Tham gia làm bài để hỗ trợ tác giả thu thập dữ liệu.')}
                </p>
              </div>

              <button onclick="VibeApp.startSurveySession('\${s.id}')" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer">
                <span>Tham Gia Khảo Sát</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>

            <!-- Tiến độ thu mẫu -->
            <div class="space-y-1 pt-1 border-t border-stone-200/60 dark:border-stone-800">
              <div class="flex items-center justify-between text-[10.5px] text-stone-500 font-semibold font-mono">
                <span>Thu thập: \${collected}/\${target} mẫu</span>
                <span class="text-orange-600 dark:text-orange-400 font-bold">\${progress}%</span>
              </div>
              <div class="w-full bg-stone-200/70 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-orange-600 h-full rounded-full transition-all duration-300" style="width: \${progress}%"></div>
              </div>
            </div>
          </div>
        \` : \`
          <div class="p-3 sm:p-3.5 rounded-2xl bg-stone-50/70 dark:bg-[#151518] border border-dashed border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2 text-stone-500 dark:text-stone-400">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span class="text-[11px] font-medium">Chủ đề thảo luận cộng đồng mở • Phản hồi trực tiếp bên dưới</span>
            </div>
            <button onclick="VibeApp.toggleForumComments('\${post.id}')" class="text-orange-600 hover:text-orange-700 dark:text-orange-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer">
              <span>Bình luận</span>
              <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        \`}`;

code = code.replace(oldSurveyCardTarget, newSurveyCardTarget);

// Add Hub badge in post header
const targetRoleBadge = `\${roleBadge}
              </div>`;

const newRoleBadge = `\${roleBadge}
                \${post.post_type === 'STUDENT' ? \`
                  <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 flex items-center gap-0.5">
                    <i data-lucide="graduation-cap" class="w-3 h-3"></i>
                    <span>Góc Sinh Viên</span>
                  </span>
                \` : \`
                  <span class="text-[10px] font-medium px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                    Cộng Đồng
                  </span>
                \`}
              </div>`;

code = code.replace(targetRoleBadge, newRoleBadge);

// 7. Update openCreateForumPostModal and submitCreateForumPost
const targetOpenCreateModal = `  async openCreateForumPostModal() {
    this.haptic('light');
    if (!this.state.currentUser) {
      this.showToast('Vui lòng đăng nhập để tạo bài viết trên Diễn Đàn!', 'info');
      this.openAuthModal('login');
      return;
    }

    try {
      this.showToast('Đang kiểm tra danh sách khảo sát của bạn...', 'info');
      const res = await this.api('/surveys?scope=created');
      const allMySurveys = (res && res.surveys) || [];
      const activeSurveys = allMySurveys.filter(s => s.status === 'ACTIVE');

      if (activeSurveys.length === 0) {
        this.showModal({
          title: 'Yêu Cầu Khảo Sát Đang Hoạt Động (ACTIVE)',
          content: \`
            <div class="space-y-4 text-center py-4">
              <div class="w-14 h-14 mx-auto rounded-3xl bg-orange-50 dark:bg-stone-800 text-orange-600 flex items-center justify-center">
                <i data-lucide="alert-circle" class="w-7 h-7"></i>
              </div>
              <div class="space-y-1">
                <h4 class="text-sm font-bold text-stone-900 dark:text-white">Bạn chưa có khảo sát nào đang hoạt động</h4>
                <p class="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                  Để đảm bảo chất lượng diễn đàn, mỗi bài đăng cần đính kèm một bài khảo sát đang ACTIVE trên sàn để các thành viên khác có thể tham gia làm bài ngay.
                </p>
              </div>
              <div class="pt-2 flex items-center justify-center gap-2">
                <button type="button" onclick="VibeApp.closeModal(); VibeApp.navigate('create-survey')" class="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5">
                  <i data-lucide="plus-circle" class="w-4 h-4"></i>
                  <span>Tạo Khảo Sát Ngay</span>
                </button>
                <button type="button" onclick="VibeApp.closeModal()" class="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800">
                  Đóng
                </button>
              </div>
            </div>
          \`
        });
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      const surveyOptionsHtml = activeSurveys.map(s => {
        const isEdu = s.is_student_exchange === 1;
        const tag = isEdu ? '[Trao Đổi Edu] ' : '';
        return \`<option value="\${s.id}">\${this.escapeHtml(tag + s.title)} (\${s.collected_responses || 0}/\${s.target_responses} mẫu)</option>\`;
      }).join('');

      this.showModal({
        title: 'Đăng Bài Viết Lên Diễn Đàn Khảo Sát',
        maxWidth: 'max-w-xl',
        content: \`
          <form onsubmit="VibeApp.submitCreateForumPost(event)" class="space-y-4 text-xs">
            
            <div class="space-y-1.5">
              <label class="font-bold text-stone-800 dark:text-stone-200">Tiêu đề bài viết (*):</label>
              <input type="text" id="forum-post-title-input" required 
                     placeholder="Ví dụ: Cần 50 đáp viên khảo sát thói quen sử dụng ví điện tử..." 
                     class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500">
            </div>

            <div class="space-y-1.5">
              <label class="font-bold text-stone-800 dark:text-stone-200">Chọn khảo sát của bạn để đính kèm (*):</label>
              <select id="forum-post-survey-select" required
                      class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500">
                \${surveyOptionsHtml}
              </select>
              <p class="text-[10.5px] text-stone-500">Chỉ hiển thị các bài khảo sát đang có trạng thái hoạt động (ACTIVE).</p>
            </div>

            <div class="space-y-1.5">
              <label class="font-bold text-stone-800 dark:text-stone-200">Nội dung chia sẻ & Kêu gọi (*):</label>
              <textarea id="forum-post-content-input" rows="5" required
                        placeholder="Chia sẻ bối cảnh đề tài, mục tiêu nghiên cứu và đối tượng bạn đang cần thu thập dữ liệu..."
                        class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"></textarea>
            </div>

            <div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
              <div class="font-bold flex items-center gap-1">
                <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
                <span>Quy tắc bảo mật & Minh bạch thù lao</span>
              </div>
              <p>Hệ thống tự động chặn các liên kết ngoài (link lừa đảo, phishing). Khảo sát đính kèm sử dụng đúng luồng ký quỹ và thù lao chuẩn của sàn.</p>
            </div>

            <div class="pt-2 flex items-center justify-end gap-2">
              <button type="button" onclick="VibeApp.closeModal()" class="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800">
                Hủy
              </button>
              <button type="submit" id="forum-submit-post-btn" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                <span>Đăng Bài Lên Diễn Đàn</span>
              </button>
            </div>
          </form>
        \`
      });
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      this.showToast('Lỗi nạp thông tin tạo bài viết: ' + err.message, 'error');
    }
  },

  async submitCreateForumPost(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.haptic('medium');

    const titleInput = document.getElementById('forum-post-title-input');
    const surveySelect = document.getElementById('forum-post-survey-select');
    const contentInput = document.getElementById('forum-post-content-input');
    const btn = document.getElementById('forum-submit-post-btn');

    if (!titleInput || !surveySelect || !contentInput) return;

    const title = titleInput.value.trim();
    const surveyId = surveySelect.value;
    const content = contentInput.value.trim();

    if (title.length < 3) {
      this.showToast('Tiêu đề bài viết phải từ 3 ký tự trở lên!', 'warning');
      return;
    }
    if (content.length < 5) {
      this.showToast('Nội dung bài viết phải từ 5 ký tự trở lên!', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang đăng bài...</span>';
    }

    try {
      const res = await this.api('/forum/posts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          survey_id: surveyId
        })
      });

      if (res && res.success) {
        this.haptic('success');
        this.showToast('Đăng bài viết lên diễn đàn thành công!', 'success');
        this.closeModal();
        await this.renderForumView(document.getElementById('app-root'));
      } else {
        this.showToast(res.message || 'Lỗi khi đăng bài', 'error');
      }
    } catch (err) {
      this.showToast(err.message || 'Lỗi đăng bài viết', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i><span>Đăng Bài Lên Diễn Đàn</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },`;

const newOpenCreateModal = `  async openCreateForumPostModal() {
    this.haptic('light');
    if (!this.state.currentUser) {
      this.showToast('Vui lòng đăng nhập để tạo bài viết trên Diễn Đàn!', 'info');
      this.openAuthModal('login');
      return;
    }

    const user = this.state.currentUser;
    const isEduUser = user.is_student_verified === 1 || user.role === 'ADMIN';

    let activeSurveys = [];
    try {
      const res = await this.api('/surveys?scope=created');
      const allMySurveys = (res && res.surveys) || [];
      activeSurveys = allMySurveys.filter(s => s.status === 'ACTIVE');
    } catch (e) {
      console.warn('Lỗi kiểm tra khảo sát của bạn:', e.message);
    }

    const surveyOptionsHtml = activeSurveys.map(s => {
      const isEdu = s.is_student_exchange === 1;
      const tag = isEdu ? '[Trao Đổi Edu] ' : '';
      return \`<option value="\${s.id}">\${this.escapeHtml(tag + s.title)} (\${s.collected_responses || 0}/\${s.target_responses} mẫu)</option>\`;
    }).join('');

    const defaultHub = this.state.forumFilter?.hub === 'STUDENT' && isEduUser ? 'STUDENT' : 'COMMUNITY';

    this.showModal({
      title: 'Đăng Bài Viết Lên Diễn Đàn SurvHub',
      maxWidth: 'max-w-xl',
      content: \`
        <form onsubmit="VibeApp.submitCreateForumPost(event)" class="space-y-4 text-xs">
          
          <!-- Chọn Phân Khu -->
          <div class="space-y-1.5">
            <label class="font-bold text-stone-800 dark:text-stone-200">Phân khu đăng bài (*):</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 cursor-pointer hover:border-orange-500 transition-all">
                <input type="radio" name="forum-hub-choice" value="COMMUNITY" \${defaultHub === 'COMMUNITY' ? 'checked' : ''} class="text-orange-600 focus:ring-orange-500">
                <div class="min-w-0">
                  <div class="font-bold text-stone-900 dark:text-white">Cộng Đồng Chung</div>
                  <div class="text-[10px] text-stone-400">Mọi thành viên tham gia</div>
                </div>
              </label>

              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 \${isEduUser ? 'cursor-pointer hover:border-orange-500' : 'opacity-50 cursor-not-allowed'} transition-all">
                <input type="radio" name="forum-hub-choice" value="STUDENT" \${defaultHub === 'STUDENT' ? 'checked' : ''} \${!isEduUser ? 'disabled' : ''} class="text-orange-600 focus:ring-orange-500">
                <div class="min-w-0">
                  <div class="font-bold text-stone-900 dark:text-white flex items-center gap-1">
                    <span>Góc Sinh Viên</span>
                    <i data-lucide="graduation-cap" class="w-3 h-3 text-orange-600"></i>
                  </div>
                  <div class="text-[10px] text-stone-400">\${isEduUser ? 'Edu Karma / Luận văn' : 'Cần xác thực .edu'}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Tiêu đề bài viết -->
          <div class="space-y-1.5">
            <label class="font-bold text-stone-800 dark:text-stone-200">Tiêu đề bài viết (*):</label>
            <input type="text" id="forum-post-title-input" required 
                   placeholder="Ví dụ: Thảo luận về phương pháp thu thập dữ liệu hành vi người dùng..." 
                   class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500">
          </div>

          <!-- Chọn Khảo sát đính kèm (Tùy chọn) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="font-bold text-stone-800 dark:text-stone-200">Khảo sát đính kèm:</label>
              <span class="text-[10.5px] text-stone-400 font-medium">Tùy chọn (Không bắt buộc)</span>
            </div>
            <select id="forum-post-survey-select"
                    class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500">
              <option value="">-- Thảo luận tự do (Không đính kèm khảo sát) --</option>
              \${surveyOptionsHtml}
            </select>
            <p class="text-[10.5px] text-stone-500 dark:text-stone-400">Bạn có thể đính kèm khảo sát đang hoạt động của mình để kêu gọi điền, hoặc để trống nếu chỉ muốn thảo luận kinh nghiệm / hỏi đáp.</p>
          </div>

          <!-- Nội dung -->
          <div class="space-y-1.5">
            <label class="font-bold text-stone-800 dark:text-stone-200">Nội dung chia sẻ (*):</label>
            <textarea id="forum-post-content-input" rows="5" required
                      placeholder="Chia sẻ quan điểm, bối cảnh đề tài, câu hỏi thảo luận hoặc lời kêu gọi hỗ trợ..."
                      class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"></textarea>
          </div>

          <div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
            <div class="font-bold flex items-center gap-1">
              <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
              <span>Quy tắc bảo mật & Liêm chính cộng đồng</span>
            </div>
            <p>Hệ thống tự động chặn liên kết ngoài trái phép. Mọi trao đổi khảo sát tuân thủ đúng quy chế bảo mật thông tin và quyền riêng tư.</p>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2">
            <button type="button" onclick="VibeApp.closeModal()" class="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800">
              Hủy
            </button>
            <button type="submit" id="forum-submit-post-btn" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>Đăng Bài Lên Diễn Đàn</span>
            </button>
          </div>
        </form>
      \`
    });
    if (window.lucide) window.lucide.createIcons();
  },

  async submitCreateForumPost(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.haptic('medium');

    const titleInput = document.getElementById('forum-post-title-input');
    const surveySelect = document.getElementById('forum-post-survey-select');
    const contentInput = document.getElementById('forum-post-content-input');
    const hubRadio = document.querySelector('input[name="forum-hub-choice"]:checked');
    const btn = document.getElementById('forum-submit-post-btn');

    if (!titleInput || !contentInput) return;

    const title = titleInput.value.trim();
    const surveyId = surveySelect ? (surveySelect.value.trim() || null) : null;
    const content = contentInput.value.trim();
    const postType = hubRadio ? hubRadio.value : 'COMMUNITY';

    if (title.length < 3) {
      this.showToast('Tiêu đề bài viết phải từ 3 ký tự trở lên!', 'warning');
      return;
    }
    if (content.length < 5) {
      this.showToast('Nội dung bài viết phải từ 5 ký tự trở lên!', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang đăng bài...</span>';
    }

    try {
      const res = await this.api('/forum/posts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          survey_id: surveyId,
          post_type: postType
        })
      });

      if (res && res.success) {
        this.haptic('success');
        this.showToast('Đăng bài viết lên diễn đàn thành công!', 'success');
        this.closeModal();
        if (this.state.forumFilter) {
          this.state.forumFilter.hub = postType;
        }
        await this.renderForumView(document.getElementById('app-root'));
      } else {
        this.showToast(res.message || 'Lỗi khi đăng bài', 'error');
      }
    } catch (err) {
      this.showToast(err.message || 'Lỗi đăng bài viết', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i><span>Đăng Bài Lên Diễn Đàn</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },`;

code = code.replace(targetOpenCreateModal, newOpenCreateModal);

fs.writeFileSync(appPath, code, 'utf8');
console.log('Successfully updated public/app.js!');
