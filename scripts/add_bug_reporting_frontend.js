const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'app.js');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Thêm mục "Báo Lỗi & Góp Ý" vào user-profile-dropdown
const profileTarget = `<i data-lucide="user-check" class="w-4 h-4 text-orange-600 dark:text-orange-500"></i>\n          <span>Hồ Sơ & Xác Thực</span>\n        </button>`;
const bugReportProfileBtn = `<i data-lucide="user-check" class="w-4 h-4 text-orange-600 dark:text-orange-500"></i>
          <span>Hồ Sơ & Xác Thực</span>
        </button>

        <button onclick="VibeApp.openBugReportModal(); document.getElementById('user-profile-dropdown').classList.add('hidden')" class="w-full text-left px-3 py-1.5 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center space-x-2.5 text-stone-800 dark:text-stone-200 font-medium transition-colors">
          <i data-lucide="life-buoy" class="w-4 h-4 text-orange-600 dark:text-orange-500"></i>
          <span>Báo Lỗi & Góp Ý</span>
        </button>`;

if (!code.includes('VibeApp.openBugReportModal()') && code.includes(profileTarget)) {
  code = code.replace(profileTarget, bugReportProfileBtn);
}

// 2. Thêm tab "Báo Lỗi" vào Admin Desktop Nav Links
const adminNavTarget = `{ id: 'admin-fraud', label: 'Gian Lận', icon: 'shield-alert' },`;
const adminNavAddition = `{ id: 'admin-fraud', label: 'Gian Lận', icon: 'shield-alert' },\n          { id: 'admin-bug-reports', label: 'Báo Lỗi', icon: 'life-buoy' },`;

if (!code.includes("'admin-bug-reports'") && code.includes(adminNavTarget)) {
  code = code.replace(adminNavTarget, adminNavAddition);
}

// 3. Thêm case 'admin-bug-reports' vào router navigate()
const routerTarget = `case 'admin-fraud':\n          await this.renderAdminFraudView(root);\n          break;`;
const routerAddition = `case 'admin-fraud':
          await this.renderAdminFraudView(root);
          break;
        case 'admin-bugs':
        case 'admin-bug-reports':
          await this.renderAdminBugReportsView(root);
          break;`;

if (!code.includes('renderAdminBugReportsView') && code.includes(routerTarget)) {
  code = code.replace(routerTarget, routerAddition);
}

// 4. Thêm toàn bộ các methods xử lý Bug Report vào cuối VibeApp (trước dấu đóng };)
const bugReportingMethods = `
  // =========================================================================
  // TÍNH NĂNG BÁO CÁO SỰ CỐ & ĐĂNG TẢI LỖI (BUG REPORT & SYSTEM FEEDBACK)
  // =========================================================================
  openBugReportModal(prefillCategory = null) {
    this.haptic('light');
    if (!this.state.bugReport) {
      this.state.bugReport = {};
    }
    this.state.bugReport = {
      isOpen: true,
      category: prefillCategory || this.state.bugReport.category || 'UI_UX',
      severity: this.state.bugReport.severity || 'MEDIUM',
      title: this.state.bugReport.title || '',
      description: this.state.bugReport.description || '',
      imageUrl: this.state.bugReport.imageUrl || null,
      isSubmitting: false,
      isUploadingImage: false,
      activeTab: this.state.bugReport.activeTab || 'create',
      urlContext: window.location.href,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screen: \`\${window.innerWidth}x\${window.innerHeight} (DPR: \${window.devicePixelRatio || 1})\`,
        url: window.location.href,
        time: new Date().toLocaleString('vi-VN')
      }
    };

    const modal = document.getElementById('bug-report-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }

    // Đăng ký paste event tự động (Ctrl + V ảnh chụp màn hình)
    if (!this._bugReportPasteBound) {
      this._bugReportPasteBound = true;
      window.addEventListener('paste', (e) => {
        if (!this.state.bugReport || !this.state.bugReport.isOpen || this.state.bugReport.activeTab !== 'create') return;
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              this.processBugReportImage(file);
              break;
            }
          }
        }
      });
    }

    this.switchBugReportTab(this.state.bugReport.activeTab);
    this.loadMyBugReportsCount();
  },

  closeBugReportModal() {
    this.haptic('light');
    if (this.state.bugReport) {
      this.state.bugReport.isOpen = false;
    }
    const modal = document.getElementById('bug-report-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  },

  switchBugReportTab(tab) {
    if (!this.state.bugReport) return;
    this.state.bugReport.activeTab = tab;

    const createTabBtn = document.getElementById('bug-tab-btn-create');
    const historyTabBtn = document.getElementById('bug-tab-btn-history');

    if (tab === 'create') {
      if (createTabBtn) {
        createTabBtn.className = 'pb-2.5 px-3 text-xs font-bold border-b-2 border-orange-600 text-orange-600 transition-all flex items-center gap-1.5';
      }
      if (historyTabBtn) {
        historyTabBtn.className = 'pb-2.5 px-3 text-xs font-medium border-b-2 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-all flex items-center gap-1.5';
      }
      this.renderBugReportForm();
    } else {
      if (createTabBtn) {
        createTabBtn.className = 'pb-2.5 px-3 text-xs font-medium border-b-2 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-all flex items-center gap-1.5';
      }
      if (historyTabBtn) {
        historyTabBtn.className = 'pb-2.5 px-3 text-xs font-bold border-b-2 border-orange-600 text-orange-600 transition-all flex items-center gap-1.5';
      }
      this.renderBugReportHistory();
    }

    if (window.lucide) window.lucide.createIcons();
  },

  renderBugReportForm() {
    const container = document.getElementById('bug-modal-body');
    if (!container) return;
    const b = this.state.bugReport || {};
    const categories = [
      { id: 'UI_UX', label: 'Giao diện (UI/UX)' },
      { id: 'SURVEY', label: 'Làm Khảo Sát' },
      { id: 'CREATOR_STUDIO', label: 'Thiết Kế Khảo Sát' },
      { id: 'PAYMENT', label: 'Ví & Nạp Rút Tiền' },
      { id: 'AUTH', label: 'Đăng Nhập / Hồ Sơ' },
      { id: 'OTHER', label: 'Sự Cố Khác' }
    ];

    const severities = [
      { id: 'LOW', label: 'Thấp', desc: 'Góp ý nhỏ, thẩm mỹ' },
      { id: 'MEDIUM', label: 'Trung Bình', desc: 'Bất tiện nhưng vẫn dùng được' },
      { id: 'HIGH', label: 'Cao', desc: 'Lỗi tính năng không chạy' },
      { id: 'CRITICAL', label: 'Khẩn Cấp', desc: 'Mất tiền/điểm, chặn đứng' }
    ];

    container.innerHTML = \`
      <form onsubmit="event.preventDefault(); VibeApp.submitBugReport();" class="space-y-4">
        
        <!-- 1. Phân loại sự cố -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-stone-700 dark:text-stone-200">
            Phân loại danh mục sự cố <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            \${categories.map(c => \`
              <button type="button" onclick="VibeApp.setBugCategory('\${c.id}')"
                      class="px-2.5 py-2 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between \${
                        b.category === c.id 
                          ? 'border-orange-600 bg-orange-50/70 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shadow-2xs' 
                          : 'border-stone-200 dark:border-[#2E2E36] bg-stone-50/50 dark:bg-[#161619] text-stone-700 dark:text-stone-300 hover:border-stone-300'
                      }">
                <span class="truncate">\${c.label}</span>
                \${b.category === c.id ? '<i data-lucide="check" class="w-3.5 h-3.5 text-orange-600 shrink-0"></i>' : ''}
              </button>
            \`).join('')}
          </div>
        </div>

        <!-- 2. Mức độ nghiêm trọng -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-stone-700 dark:text-stone-200">
            Mức độ ảnh hưởng
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            \${severities.map(s => \`
              <button type="button" onclick="VibeApp.setBugSeverity('\${s.id}')"
                      class="p-2 rounded-xl border text-left transition-all \${
                        b.severity === s.id 
                          ? 'border-orange-600 bg-orange-50/70 dark:bg-orange-950/30 shadow-2xs' 
                          : 'border-stone-200 dark:border-[#2E2E36] bg-stone-50/50 dark:bg-[#161619] hover:border-stone-300'
                      }">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold \${b.severity === s.id ? 'text-orange-600 dark:text-orange-400' : 'text-stone-800 dark:text-stone-200'}">\${s.label}</span>
                  \${b.severity === s.id ? '<span class="w-1.5 h-1.5 rounded-full bg-orange-600"></span>' : ''}
                </div>
                <p class="text-[10px] text-stone-400 truncate mt-0.5">\${s.desc}</p>
              </button>
            \`).join('')}
          </div>
        </div>

        <!-- 3. Tiêu đề sự cố -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-stone-700 dark:text-stone-200">
            Tiêu đề sự cố ngắn gọn <span class="text-red-500">*</span>
          </label>
          <input type="text" id="bug-report-title" value="\${this.escapeHtml(b.title || '')}"
                 oninput="VibeApp.state.bugReport.title = this.value"
                 placeholder="Ví dụ: Không bấm được nút Nộp bài trên Chrome điện thoại..."
                 class="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-[#33333D] bg-white dark:bg-[#161619] text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-orange-600 focus:outline-none" required>
        </div>

        <!-- 4. Mô tả chi tiết -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-stone-700 dark:text-stone-200">
            Mô tả chi tiết & các bước tái hiện lỗi <span class="text-red-500">*</span>
          </label>
          <textarea id="bug-report-desc" rows="3"
                    oninput="VibeApp.state.bugReport.description = this.value"
                    placeholder="1. Em bấm vào bài khảo sát X&#10;2. Chọn đáp án câu số 3&#10;3. Nút nộp bị xoay tròn không phản hồi..."
                    class="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-[#33333D] bg-white dark:bg-[#161619] text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-orange-600 focus:outline-none leading-relaxed" required>\${this.escapeHtml(b.description || '')}</textarea>
        </div>

        <!-- 5. Khu vực đăng tải hình ảnh minh chứng -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-stone-700 dark:text-stone-200">
              Ảnh chụp màn hình minh chứng (Tùy chọn)
            </label>
            <span class="text-[10px] text-stone-400">Hỗ trợ dán trực tiếp: Ctrl + V</span>
          </div>

          \${b.imageUrl ? \`
            <div class="relative group rounded-xl overflow-hidden border border-stone-200 dark:border-[#2E2E36] bg-stone-900 flex items-center justify-center max-h-56">
              <img src="\${b.imageUrl}" alt="Ảnh lỗi minh chứng" class="max-h-56 max-w-full object-contain mx-auto">
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <a href="\${b.imageUrl}" target="_blank" rel="noopener" class="px-3 py-1.5 bg-white text-stone-900 rounded-lg text-xs font-bold hover:bg-stone-100 flex items-center gap-1 shadow-md">
                  <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                  <span>Xem ảnh lớn</span>
                </a>
                <button type="button" onclick="VibeApp.removeBugReportImage()" class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 flex items-center gap-1 shadow-md">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  <span>Gỡ ảnh</span>
                </button>
              </div>
            </div>
          \` : \`
            <div id="bug-dropzone" 
                 onclick="document.getElementById('bug-image-file-input').click()"
                 ondragover="VibeApp.handleBugDragOver(event)"
                 ondragleave="VibeApp.handleBugDragLeave(event)"
                 ondrop="VibeApp.handleBugDrop(event)"
                 class="border-2 border-dashed border-stone-200 dark:border-[#33333D] hover:border-orange-500 dark:hover:border-orange-500 rounded-xl p-5 text-center cursor-pointer transition-all bg-stone-50/50 dark:bg-[#161619] group">
              <input type="file" id="bug-image-file-input" accept="image/*" class="hidden" onchange="VibeApp.handleBugImageFileChange(this)">
              
              \${b.isUploadingImage ? \`
                <div class="flex flex-col items-center justify-center space-y-2 py-2">
                  <div class="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
                  <span class="text-xs text-orange-600 dark:text-orange-400 font-bold">Đang nén & tải ảnh lên...</span>
                </div>
              \` : \`
                <div class="flex flex-col items-center justify-center space-y-1.5">
                  <div class="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <i data-lucide="upload-cloud" class="w-5 h-5"></i>
                  </div>
                  <p class="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Bấm để chọn ảnh từ máy hoặc kéo thả vào đây
                  </p>
                  <p class="text-[11px] text-stone-400">
                    Chụp màn hình rồi nhấn <kbd class="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-mono text-[10px] text-stone-700 dark:text-stone-300">Ctrl + V</kbd> để dán ảnh tức thì
                  </p>
                </div>
              \`}
            </div>
          \`}
        </div>

        <!-- 6. Thông tin thiết bị tự động thu thập -->
        <div class="p-2.5 rounded-xl bg-stone-50 dark:bg-[#161619] border border-stone-100 dark:border-[#2E2E36] text-[11px] text-stone-400 dark:text-stone-500 space-y-1">
          <div class="flex items-center gap-1.5 font-bold text-stone-600 dark:text-stone-300">
            <i data-lucide="info" class="w-3.5 h-3.5 text-stone-400"></i>
            <span>Thông tin môi trường gửi kèm tự động:</span>
          </div>
          <p class="font-mono text-[10px] truncate">URL: \${this.escapeHtml(window.location.href)}</p>
          <p class="font-mono text-[10px] truncate">Màn hình: \${window.innerWidth}x\${window.innerHeight} (DPR: \${window.devicePixelRatio || 1})</p>
        </div>

        <!-- 7. Nút Hành Động Gửi -->
        <div class="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-100 dark:border-[#2E2E36]">
          <button type="button" onclick="VibeApp.closeBugReportModal()" class="px-4 py-2 rounded-xl border border-stone-200 dark:border-[#33333D] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold transition-all">
            Hủy Bỏ
          </button>
          <button type="submit" id="bug-submit-btn" \${b.isSubmitting ? 'disabled' : ''} class="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-2">
            \${b.isSubmitting ? \`
              <div class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
              <span>Đang gửi...</span>
            \` : \`
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>Gửi Báo Cáo Sự Cố</span>
            \`}
          </button>
        </div>

      </form>
    \`;

    if (window.lucide) window.lucide.createIcons();
  },

  async renderBugReportHistory() {
    const container = document.getElementById('bug-modal-body');
    if (!container) return;

    if (!this.state.token) {
      container.innerHTML = \`
        <div class="p-8 text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center mx-auto">
            <i data-lucide="lock" class="w-6 h-6"></i>
          </div>
          <h4 class="text-sm font-bold text-stone-900 dark:text-white">Vui Lòng Đăng Nhập</h4>
          <p class="text-xs text-stone-500 max-w-sm mx-auto">
            Đăng nhập tài khoản VibeSurvey để theo dõi lịch sử các sự cố đã báo và xem phản hồi từ kỹ thuật viên.
          </p>
          <button onclick="VibeApp.closeBugReportModal(); VibeApp.openAuthModal('login')" class="px-5 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 shadow-md">
            Đăng Nhập Ngay
          </button>
        </div>
      \`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = \`
      <div class="flex flex-col items-center justify-center py-12 space-y-2">
        <div class="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
        <p class="text-xs text-stone-500">Đang tải lịch sử báo lỗi...</p>
      </div>
    \`;

    try {
      const res = await this.api('/bug-reports/my');
      const reports = (res && res.reports) || [];

      // Cập nhật badge số lượng
      const badge = document.getElementById('bug-history-count-badge');
      if (badge) {
        if (reports.length > 0) {
          badge.innerText = reports.length;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      if (reports.length === 0) {
        container.innerHTML = \`
          <div class="p-10 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
              <i data-lucide="inbox" class="w-6 h-6"></i>
            </div>
            <h4 class="text-sm font-bold text-stone-900 dark:text-white">Chưa Có Báo Cáo Nào</h4>
            <p class="text-xs text-stone-400 max-w-xs mx-auto">
              Bạn chưa gửi báo cáo sự cố nào. Nếu gặp bất kỳ trục trặc nào, hãy chuyển sang tab gửi báo lỗi để thông báo cho đội ngũ.
            </p>
            <button onclick="VibeApp.switchBugReportTab('create')" class="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl transition-colors">
              Gửi Báo Cáo Mới
            </button>
          </div>
        \`;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      const statusBadges = {
        PENDING: { label: 'Chờ tiếp nhận', color: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800' },
        INVESTIGATING: { label: 'Đang kiểm tra & xử lý', color: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800' },
        RESOLVED: { label: 'Đã khắc phục hoàn tất', color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' },
        REJECTED: { label: 'Đã đóng / Không thể tái hiện', color: 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700' }
      };

      container.innerHTML = \`
        <div class="space-y-3">
          \${reports.map(r => {
            const st = statusBadges[r.status] || statusBadges.PENDING;
            const timeStr = r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '';
            return \`
              <div class="p-3.5 rounded-xl border border-stone-200 dark:border-[#2E2E36] bg-stone-50/50 dark:bg-[#161619] space-y-2.5">
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-0.5">
                    <span class="text-[10px] font-mono font-bold text-stone-400 uppercase">[\${r.category}] \${r.severity}</span>
                    <h5 class="text-xs font-bold text-stone-900 dark:text-white leading-snug">\${this.escapeHtml(r.title)}</h5>
                  </div>
                  <span class="px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 \${st.color}">
                    \${st.label}
                  </span>
                </div>

                <p class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line bg-white/70 dark:bg-[#1C1C20] p-2.5 rounded-lg border border-stone-100 dark:border-[#2E2E36]">
                  \${this.escapeHtml(r.description)}
                </p>

                \${r.image_url ? \`
                  <div class="pt-1">
                    <a href="\${r.image_url}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-600 hover:underline">
                      <i data-lucide="image" class="w-3.5 h-3.5"></i>
                      <span>Xem ảnh chụp màn hình minh chứng</span>
                    </a>
                  </div>
                \` : ''}

                \${r.admin_notes ? \`
                  <div class="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div class="flex items-center gap-1 font-bold text-[11px] text-emerald-700 dark:text-emerald-400">
                      <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                      <span>Phản hồi từ Đội ngũ Kỹ thuật:</span>
                    </div>
                    <p class="leading-relaxed whitespace-pre-line">\${this.escapeHtml(r.admin_notes)}</p>
                  </div>
                \` : ''}

                <div class="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-100 dark:border-[#2E2E36]">
                  <span>Mã: <code class="font-mono">\${r.id}</code></span>
                  <span>Gửi lúc: \${timeStr}</span>
                </div>
              </div>
            \`;
          }).join('')}
        </div>
      \`;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Lỗi khi tải lịch sử báo lỗi:', err);
      container.innerHTML = \`
        <div class="p-6 text-center text-xs text-red-500">
          Không thể tải danh sách báo lỗi: \${err.message}
        </div>
      \`;
    }
  },

  async loadMyBugReportsCount() {
    if (!this.state.token) return;
    try {
      const res = await this.api('/bug-reports/my');
      const reports = (res && res.reports) || [];
      const badge = document.getElementById('bug-history-count-badge');
      if (badge && reports.length > 0) {
        badge.innerText = reports.length;
        badge.classList.remove('hidden');
      }
    } catch (e) {
      // bỏ qua
    }
  },

  setBugCategory(cat) {
    if (!this.state.bugReport) return;
    this.state.bugReport.category = cat;
    this.renderBugReportForm();
  },

  setBugSeverity(sev) {
    if (!this.state.bugReport) return;
    this.state.bugReport.severity = sev;
    this.renderBugReportForm();
  },

  async handleBugImageFileChange(input) {
    const file = input.files && input.files[0];
    if (file) {
      await this.processBugReportImage(file);
    }
  },

  handleBugDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = document.getElementById('bug-dropzone');
    if (dropzone) dropzone.classList.add('border-orange-500', 'bg-orange-50/20');
  },

  handleBugDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = document.getElementById('bug-dropzone');
    if (dropzone) dropzone.classList.remove('border-orange-500', 'bg-orange-50/20');
  },

  async handleBugDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = document.getElementById('bug-dropzone');
    if (dropzone) dropzone.classList.remove('border-orange-500', 'bg-orange-50/20');

    const files = event.dataTransfer && event.dataTransfer.files;
    if (files && files.length > 0) {
      await this.processBugReportImage(files[0]);
    }
  },

  async processBugReportImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.showToast('Vui lòng chọn hoặc dán tệp hình ảnh (PNG, JPG, WebP)', 'warning');
      return;
    }

    if (!this.state.bugReport) this.state.bugReport = {};
    this.state.bugReport.isUploadingImage = true;
    this.renderBugReportForm();

    try {
      // Nén ảnh thông minh trước khi upload (giới hạn tối đa 1600px để sắc nét)
      const compressed = await this.compressImageFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85
      });

      // Gửi lên server lưu vào /uploads/bug_...
      const res = await this.api('/upload/image', {
        method: 'POST',
        body: JSON.stringify({
          image_data: compressed.dataUrl,
          type: 'bug'
        })
      });

      if (!res.success || !res.url) {
        throw new Error(res.message || 'Lỗi lưu trữ ảnh');
      }

      this.state.bugReport.imageUrl = res.url;
      this.state.bugReport.isUploadingImage = false;
      this.showToast('Đã tải và đính kèm ảnh chụp màn hình thành công!', 'success');
      this.renderBugReportForm();
    } catch (err) {
      console.error('Lỗi upload bug image:', err);
      this.state.bugReport.isUploadingImage = false;
      this.showToast('Lỗi khi tải ảnh: ' + err.message, 'error');
      this.renderBugReportForm();
    }
  },

  removeBugReportImage() {
    if (!this.state.bugReport) return;
    this.state.bugReport.imageUrl = null;
    this.renderBugReportForm();
  },

  async submitBugReport() {
    const b = this.state.bugReport || {};
    const title = (b.title || '').trim();
    const desc = (b.description || '').trim();

    if (!title) {
      this.showToast('Vui lòng nhập tiêu đề sự cố ngắn gọn', 'warning');
      const el = document.getElementById('bug-report-title');
      if (el) el.focus();
      return;
    }

    if (!desc) {
      this.showToast('Vui lòng mô tả chi tiết sự cố bạn gặp phải', 'warning');
      const el = document.getElementById('bug-report-desc');
      if (el) el.focus();
      return;
    }

    b.isSubmitting = true;
    this.renderBugReportForm();

    try {
      const payload = {
        title,
        description: desc,
        category: b.category || 'OTHER',
        severity: b.severity || 'MEDIUM',
        image_url: b.imageUrl || null,
        device_info: b.deviceInfo || null
      };

      const res = await this.api('/bug-reports', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.success) {
        throw new Error(res.message || 'Lỗi khi gửi báo cáo');
      }

      this.showToast({
        title: 'Báo Cáo Thành Công',
        message: 'Cảm ơn bạn! Đội ngũ kỹ thuật đã tiếp nhận sự cố và sẽ khắc phục sớm nhất.',
        type: 'success'
      });

      // Xóa form và chuyển sang tab lịch sử
      b.title = '';
      b.description = '';
      b.imageUrl = null;
      b.isSubmitting = false;

      this.switchBugReportTab('history');
    } catch (err) {
      console.error('Lỗi khi submit bug report:', err);
      b.isSubmitting = false;
      this.showToast('Lỗi: ' + err.message, 'error');
      this.renderBugReportForm();
    }
  },

  // =========================================================================
  // VIEW QUẢN TRỊ BÁO LỖI DÀNH CHO ADMIN (ADMIN BUG REPORTS MANAGEMENT)
  // =========================================================================
  async renderAdminBugReportsView(root) {
    if (!this.state.currentUser || this.state.currentUser.role !== 'ADMIN') {
      this.showToast('Bạn không có quyền truy cập trang quản trị sự cố', 'error');
      this.navigate('surveys');
      return;
    }

    if (!this._adminBugState) {
      this._adminBugState = {
        status: 'ALL',
        category: 'ALL',
        severity: 'ALL',
        q: '',
        page: 1,
        limit: 15
      };
    }

    root.innerHTML = \`
      <div class="space-y-5">
        <!-- 1. Header Quản Trị Báo Lỗi -->
        <div class="pb-3 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">Quản Lý Báo Cáo Lỗi & Sự Cố</h1>
              <span class="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 text-[10px] font-mono font-bold rounded-md">SUPPORT DESK</span>
            </div>
            <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Tiếp nhận phản ánh từ người dùng, tra cứu ảnh minh chứng và phản hồi tiến độ khắc phục.</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="VibeApp.renderAdminBugReportsView(document.getElementById('app-root'))" class="px-3 py-1.5 bg-white dark:bg-[#18181B] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-stone-500"></i>
              <span>Làm Mới</span>
            </button>
            <button type="button" onclick="VibeApp.openBugReportModal()" class="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Tạo Báo Lỗi Nội Bộ</span>
            </button>
          </div>
        </div>

        <div id="admin-bug-content" class="space-y-4">
          <div class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    \`;

    if (window.lucide) window.lucide.createIcons();

    try {
      const qParams = new URLSearchParams(this._adminBugState).toString();
      const res = await this.api(\`/admin/bug-reports?\${qParams}\`);
      const reports = (res && res.reports) || [];
      const stats = (res && res.stats) || { total: 0, pending: 0, investigating: 0, resolved: 0, rejected: 0 };
      const pagination = (res && res.pagination) || { page: 1, totalPages: 1, total: 0 };

      this._lastAdminBugReports = reports;

      const content = document.getElementById('admin-bug-content');
      if (!content) return;

      content.innerHTML = \`
        <!-- Thẻ KPI Thống Kê Sự Cố -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div onclick="VibeApp.setAdminBugFilter('status', 'ALL')" class="p-3.5 rounded-xl border \${this._adminBugState.status === 'ALL' ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20' : 'border-stone-200 dark:border-[#2E2E36] bg-white dark:bg-[#1C1C20]'} cursor-pointer hover:border-orange-400 transition-all">
            <span class="text-[11px] font-bold text-stone-500 dark:text-stone-400 block">Tổng Sự Cố</span>
            <span class="text-xl font-black text-stone-900 dark:text-white font-mono mt-1 block">\${stats.total}</span>
          </div>

          <div onclick="VibeApp.setAdminBugFilter('status', 'PENDING')" class="p-3.5 rounded-xl border \${this._adminBugState.status === 'PENDING' ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/30' : 'border-stone-200 dark:border-[#2E2E36] bg-white dark:bg-[#1C1C20]'} cursor-pointer hover:border-amber-400 transition-all">
            <span class="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">Chờ Tiếp Nhận</span>
            <span class="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">\${stats.pending}</span>
          </div>

          <div onclick="VibeApp.setAdminBugFilter('status', 'INVESTIGATING')" class="p-3.5 rounded-xl border \${this._adminBugState.status === 'INVESTIGATING' ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/30' : 'border-stone-200 dark:border-[#2E2E36] bg-white dark:bg-[#1C1C20]'} cursor-pointer hover:border-sky-400 transition-all">
            <span class="text-[11px] font-bold text-sky-600 dark:text-sky-400 block">Đang Kiểm Tra</span>
            <span class="text-xl font-black text-sky-600 dark:text-sky-400 font-mono mt-1 block">\${stats.investigating}</span>
          </div>

          <div onclick="VibeApp.setAdminBugFilter('status', 'RESOLVED')" class="p-3.5 rounded-xl border \${this._adminBugState.status === 'RESOLVED' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30' : 'border-stone-200 dark:border-[#2E2E36] bg-white dark:bg-[#1C1C20]'} cursor-pointer hover:border-emerald-400 transition-all">
            <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">Đã Khắc Phục</span>
            <span class="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">\${stats.resolved}</span>
          </div>
        </div>

        <!-- Bộ Lọc & Tìm Kiếm -->
        <div class="p-3.5 rounded-xl border border-stone-200 dark:border-[#2E2E36] bg-white dark:bg-[#1C1C20] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 flex-wrap">
            <select onchange="VibeApp.setAdminBugFilter('status', this.value)" class="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-[#33333D] bg-stone-50 dark:bg-[#161619] font-bold text-stone-700 dark:text-stone-300">
              <option value="ALL" \${this._adminBugState.status === 'ALL' ? 'selected' : ''}>Tất cả trạng thái</option>
              <option value="PENDING" \${this._adminBugState.status === 'PENDING' ? 'selected' : ''}>Chờ tiếp nhận</option>
              <option value="INVESTIGATING" \${this._adminBugState.status === 'INVESTIGATING' ? 'selected' : ''}>Đang kiểm tra</option>
              <option value="RESOLVED" \${this._adminBugState.status === 'RESOLVED' ? 'selected' : ''}>Đã khắc phục</option>
              <option value="REJECTED" \${this._adminBugState.status === 'REJECTED' ? 'selected' : ''}>Đã đóng / Từ chối</option>
            </select>

            <select onchange="VibeApp.setAdminBugFilter('category', this.value)" class="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-[#33333D] bg-stone-50 dark:bg-[#161619] font-semibold text-stone-700 dark:text-stone-300">
              <option value="ALL" \${this._adminBugState.category === 'ALL' ? 'selected' : ''}>Tất cả danh mục</option>
              <option value="UI_UX" \${this._adminBugState.category === 'UI_UX' ? 'selected' : ''}>Giao diện (UI/UX)</option>
              <option value="SURVEY" \${this._adminBugState.category === 'SURVEY' ? 'selected' : ''}>Làm khảo sát</option>
              <option value="CREATOR_STUDIO" \${this._adminBugState.category === 'CREATOR_STUDIO' ? 'selected' : ''}>Thiết kế khảo sát</option>
              <option value="PAYMENT" \${this._adminBugState.category === 'PAYMENT' ? 'selected' : ''}>Ví & Nạp rút tiền</option>
              <option value="AUTH" \${this._adminBugState.category === 'AUTH' ? 'selected' : ''}>Đăng nhập / Hồ sơ</option>
              <option value="OTHER" \${this._adminBugState.category === 'OTHER' ? 'selected' : ''}>Khác</option>
            </select>
          </div>

          <div class="relative flex-1 sm:max-w-xs">
            <input type="text" placeholder="Tìm theo tiêu đề, người gửi..." 
                   value="\${this.escapeHtml(this._adminBugState.q || '')}"
                   onkeydown="if(event.key==='Enter') VibeApp.setAdminBugFilter('q', this.value)"
                   class="w-full px-3 py-1.5 pl-8 rounded-lg border border-stone-200 dark:border-[#33333D] bg-stone-50 dark:bg-[#161619] text-xs focus:border-orange-600 focus:outline-none">
            <i data-lucide="search" class="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5"></i>
          </div>
        </div>

        <!-- Bảng Danh Sách Báo Lỗi -->
        <div class="border border-stone-200 dark:border-[#2E2E36] rounded-xl overflow-hidden bg-white dark:bg-[#1C1C20] shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-stone-50 dark:bg-[#161619] border-b border-stone-200 dark:border-[#2E2E36] text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-3">Mã & Thời Gian</th>
                  <th class="py-3 px-3">Danh Mục / Mức Độ</th>
                  <th class="py-3 px-3">Tiêu Đề & Nội Dung</th>
                  <th class="py-3 px-3">Người Báo</th>
                  <th class="py-3 px-3">Minh Chứng</th>
                  <th class="py-3 px-3 text-center">Trạng Thái</th>
                  <th class="py-3 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-[#24242A]">
                \${reports.length === 0 ? \`
                  <tr>
                    <td colspan="7" class="py-8 text-center text-stone-400">
                      Không tìm thấy báo cáo sự cố nào phù hợp với bộ lọc
                    </td>
                  </tr>
                \` : reports.map(r => {
                  const statusInfo = {
                    PENDING: { label: 'Chờ tiếp nhận', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800' },
                    INVESTIGATING: { label: 'Đang xử lý', badge: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800' },
                    RESOLVED: { label: 'Đã giải quyết', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' },
                    REJECTED: { label: 'Đã đóng', badge: 'bg-stone-100 dark:bg-stone-800 text-stone-500 border-stone-300 dark:border-stone-700' }
                  }[r.status] || { label: r.status, badge: 'bg-stone-100 text-stone-600' };

                  return \`
                    <tr class="hover:bg-stone-50/80 dark:hover:bg-[#222228] transition-colors">
                      <td class="py-3 px-3 whitespace-nowrap">
                        <span class="font-mono font-bold text-stone-800 dark:text-stone-200 block">\${r.id.split('_').slice(1).join('_')}</span>
                        <span class="text-[10px] text-stone-400">\${r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : ''}</span>
                      </td>

                      <td class="py-3 px-3 whitespace-nowrap">
                        <span class="font-bold text-stone-800 dark:text-stone-200 block">\${r.category}</span>
                        <span class="text-[10px] font-semibold uppercase \${
                          r.severity === 'CRITICAL' ? 'text-red-600 font-bold' : (r.severity === 'HIGH' ? 'text-orange-600' : 'text-stone-400')
                        }">\${r.severity}</span>
                      </td>

                      <td class="py-3 px-3 max-w-xs">
                        <p class="font-bold text-stone-900 dark:text-white truncate">\${this.escapeHtml(r.title)}</p>
                        <p class="text-[11px] text-stone-400 line-clamp-1">\${this.escapeHtml(r.description)}</p>
                      </td>

                      <td class="py-3 px-3 whitespace-nowrap">
                        <span class="font-medium text-stone-800 dark:text-stone-200 block">\${this.escapeHtml(r.reporter_name || 'Khách')}</span>
                        <span class="text-[10px] text-stone-400 font-mono">\${this.escapeHtml(r.reporter_email || 'N/A')}</span>
                      </td>

                      <td class="py-3 px-3 whitespace-nowrap">
                        \${r.image_url ? \`
                          <a href="\${r.image_url}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline">
                            <i data-lucide="image" class="w-3.5 h-3.5"></i>
                            <span>Xem ảnh</span>
                          </a>
                        \` : '<span class="text-stone-400 text-[11px]">-</span>'}
                      </td>

                      <td class="py-3 px-3 text-center whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded-md border text-[10px] font-bold inline-block \${statusInfo.badge}">
                          \${statusInfo.label}
                        </span>
                      </td>

                      <td class="py-3 px-3 text-right whitespace-nowrap">
                        <button type="button" onclick="VibeApp.openAdminBugDetailModal('\${r.id}')" class="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95 inline-flex items-center gap-1">
                          <i data-lucide="edit-3" class="w-3 h-3"></i>
                          <span>Xử Lý</span>
                        </button>
                      </td>
                    </tr>
                  \`;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Phân Trang -->
          <div class="p-3 bg-stone-50 dark:bg-[#161619] border-t border-stone-200 dark:border-[#2E2E36] flex items-center justify-between text-xs text-stone-500">
            <span>Tổng cộng: <strong class="text-stone-900 dark:text-white font-mono">\${pagination.total}</strong> báo cáo</span>
            <div class="flex items-center gap-1.5">
              <button \${pagination.page <= 1 ? 'disabled' : ''} onclick="VibeApp.setAdminBugFilter('page', \${pagination.page - 1})" class="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-[#33333D] hover:bg-stone-100 disabled:opacity-40">
                Trang Trước
              </button>
              <span class="font-mono font-bold text-stone-700 dark:text-stone-300">\${pagination.page} / \${pagination.totalPages}</span>
              <button \${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="VibeApp.setAdminBugFilter('page', \${pagination.page + 1})" class="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-[#33333D] hover:bg-stone-100 disabled:opacity-40">
                Trang Sau
              </button>
            </div>
          </div>
        </div>
      \`;

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Lỗi tải danh sách báo lỗi admin:', err);
      const content = document.getElementById('admin-bug-content');
      if (content) {
        content.innerHTML = \`<div class="p-8 text-center text-xs text-red-500">Lỗi: \${err.message}</div>\`;
      }
    }
  },

  setAdminBugFilter(key, val) {
    if (!this._adminBugState) this._adminBugState = {};
    this._adminBugState[key] = val;
    if (key !== 'page') this._adminBugState.page = 1;
    this.renderAdminBugReportsView(document.getElementById('app-root'));
  },

  openAdminBugDetailModal(bugId) {
    const reports = this._lastAdminBugReports || [];
    const bug = reports.find(r => r.id === bugId);
    if (!bug) return;

    const modal = document.getElementById('admin-bug-detail-modal');
    const content = document.getElementById('admin-bug-detail-content');
    if (!modal || !content) return;

    let devInfoObj = null;
    try {
      if (bug.device_info) devInfoObj = JSON.parse(bug.device_info);
    } catch (e) {
      devInfoObj = { raw: bug.device_info };
    }

    content.innerHTML = \`
      <!-- Header -->
      <div class="p-4 sm:p-5 border-b border-stone-100 dark:border-[#2E2E36] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
            \${bug.category}
          </span>
          <h3 class="font-bold text-sm sm:text-base text-stone-900 dark:text-white truncate max-w-sm sm:max-w-md">
            \${this.escapeHtml(bug.title)}
          </h3>
        </div>
        <button onclick="document.getElementById('admin-bug-detail-modal').classList.add('hidden')" class="w-8 h-8 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 flex items-center justify-center">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin text-xs">
        
        <!-- Thông tin người gửi & thời gian -->
        <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-[#161619] border border-stone-100 dark:border-[#2E2E36]">
          <div>
            <span class="text-[10px] text-stone-400 block font-medium">Người gửi:</span>
            <span class="font-bold text-stone-800 dark:text-stone-200">\${this.escapeHtml(bug.reporter_name || 'Khách vãng lai')}</span>
            <span class="text-[10px] text-stone-500 font-mono block">\${this.escapeHtml(bug.reporter_email || 'N/A')}</span>
          </div>
          <div>
            <span class="text-[10px] text-stone-400 block font-medium">Mức độ ảnh hưởng:</span>
            <span class="font-bold uppercase \${bug.severity === 'CRITICAL' ? 'text-red-600' : 'text-orange-600'}">\${bug.severity}</span>
            <span class="text-[10px] text-stone-400 block font-mono">\${new Date(bug.created_at).toLocaleString('vi-VN')}</span>
          </div>
        </div>

        <!-- Nội dung mô tả sự cố -->
        <div class="space-y-1">
          <span class="font-bold text-stone-700 dark:text-stone-300 block">Nội dung chi tiết từ người dùng:</span>
          <div class="p-3 rounded-xl bg-stone-50/70 dark:bg-[#161619] border border-stone-200 dark:border-[#2E2E36] leading-relaxed whitespace-pre-line text-stone-800 dark:text-stone-200">
            \${this.escapeHtml(bug.description)}
          </div>
        </div>

        <!-- Ảnh chụp màn hình minh chứng -->
        \${bug.image_url ? \`
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-stone-700 dark:text-stone-300">Ảnh chụp màn hình người dùng đính kèm:</span>
              <a href="\${bug.image_url}" target="_blank" rel="noopener" class="text-orange-600 hover:underline font-bold text-[11px] flex items-center gap-1">
                <i data-lucide="external-link" class="w-3 h-3"></i> Mở tab mới
              </a>
            </div>
            <div class="rounded-xl overflow-hidden border border-stone-200 dark:border-[#2E2E36] bg-stone-950 flex items-center justify-center max-h-72">
              <img src="\${bug.image_url}" alt="Screenshot lỗi" class="max-h-72 max-w-full object-contain mx-auto">
            </div>
          </div>
        \` : ''}

        <!-- Thông tin môi trường -->
        \${devInfoObj ? \`
          <div class="p-2.5 rounded-xl bg-stone-100/60 dark:bg-[#161619] border border-stone-200 dark:border-[#2E2E36] text-[10px] font-mono text-stone-500 space-y-0.5">
            <span class="font-bold text-stone-700 dark:text-stone-300 block text-[11px]">Thông số môi trường:</span>
            <p class="truncate">URL: \${this.escapeHtml(devInfoObj.url || '')}</p>
            <p class="truncate">Screen: \${this.escapeHtml(devInfoObj.screen || '')}</p>
            <p class="truncate">Agent: \${this.escapeHtml(devInfoObj.userAgent || '')}</p>
          </div>
        \` : ''}

        <!-- Biểu mẫu cập nhật trạng thái & Phản hồi -->
        <div class="pt-2 border-t border-stone-100 dark:border-[#2E2E36] space-y-3">
          <div class="space-y-1">
            <label class="block font-bold text-stone-700 dark:text-stone-300">Cập nhật trạng thái xử lý:</label>
            <select id="admin-bug-status-select" class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-[#33333D] bg-white dark:bg-[#161619] font-bold text-stone-800 dark:text-white">
              <option value="PENDING" \${bug.status === 'PENDING' ? 'selected' : ''}>Chờ tiếp nhận (PENDING)</option>
              <option value="INVESTIGATING" \${bug.status === 'INVESTIGATING' ? 'selected' : ''}>Đang kiểm tra & khắc phục (INVESTIGATING)</option>
              <option value="RESOLVED" \${bug.status === 'RESOLVED' ? 'selected' : ''}>Đã khắc phục hoàn tất (RESOLVED)</option>
              <option value="REJECTED" \${bug.status === 'REJECTED' ? 'selected' : ''}>Đã đóng / Không thể tái hiện (REJECTED)</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="block font-bold text-stone-700 dark:text-stone-300">Lời nhắn phản hồi gửi đến người dùng (qua Thông Báo):</label>
            <textarea id="admin-bug-notes-input" rows="2" placeholder="Ví dụ: Đội ngũ đã vá lỗi hiển thị này ở bản cập nhật mới nhất, bạn có thể tải lại trang nhé..." class="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-[#33333D] bg-white dark:bg-[#161619] text-xs text-stone-800 dark:text-white placeholder:text-stone-400 focus:border-orange-600 focus:outline-none leading-relaxed">\${this.escapeHtml(bug.admin_notes || '')}</textarea>
          </div>
        </div>

      </div>

      <!-- Footer Buttons -->
      <div class="p-4 border-t border-stone-100 dark:border-[#2E2E36] flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-[#161619]">
        <button type="button" onclick="VibeApp.deleteAdminBug('\${bug.id}')" class="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition-colors">
          Xóa Tin Rác
        </button>
        <div class="flex items-center gap-2">
          <button type="button" onclick="document.getElementById('admin-bug-detail-modal').classList.add('hidden')" class="px-4 py-2 rounded-xl border border-stone-200 dark:border-[#33333D] hover:bg-stone-100 text-stone-700 dark:text-stone-300 text-xs font-bold">
            Đóng
          </button>
          <button type="button" onclick="VibeApp.saveAdminBugStatus('\${bug.id}')" class="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-1.5">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            <span>Lưu & Gửi Thông Báo</span>
          </button>
        </div>
      </div>
    \`;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  },

  async saveAdminBugStatus(bugId) {
    const statusSelect = document.getElementById('admin-bug-status-select');
    const notesInput = document.getElementById('admin-bug-notes-input');
    const status = statusSelect ? statusSelect.value : 'PENDING';
    const notes = notesInput ? notesInput.value.trim() : '';

    try {
      const res = await this.api(\`/admin/bug-reports/\${bugId}\`, {
        method: 'PATCH',
        body: JSON.stringify({ status, admin_notes: notes })
      });

      if (!res.success) throw new Error(res.message || 'Lỗi cập nhật');

      this.showToast('Đã cập nhật trạng thái sự cố và gửi thông báo thành công!', 'success');
      document.getElementById('admin-bug-detail-modal').classList.add('hidden');
      this.renderAdminBugReportsView(document.getElementById('app-root'));
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async deleteAdminBug(bugId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi báo lỗi này không?')) return;
    try {
      const res = await this.api(\`/admin/bug-reports/\${bugId}\`, {
        method: 'DELETE'
      });
      if (!res.success) throw new Error(res.message || 'Lỗi khi xóa');
      this.showToast('Đã xóa bản ghi báo lỗi thành công', 'success');
      document.getElementById('admin-bug-detail-modal').classList.add('hidden');
      this.renderAdminBugReportsView(document.getElementById('app-root'));
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    }
  },
`;

// Chèn các methods này vào trước }; cuối cùng của file app.js
const lastClosingBrace = code.lastIndexOf('};\n');
if (lastClosingBrace === -1) {
  // Thử tìm }; ở cuối
  const altClosing = code.lastIndexOf('};');
  code = code.substring(0, altClosing) + bugReportingMethods + '\n' + code.substring(altClosing);
} else {
  code = code.substring(0, lastClosingBrace) + bugReportingMethods + '\n' + code.substring(lastClosingBrace);
}

fs.writeFileSync(appPath, code, 'utf8');
console.log('Successfully added bug reporting methods into public/app.js!');
