/**
 * PHÂN HỆ QUẢN TRỊ NÂNG CAO: BIỂU ĐỒ XU HƯỚNG TÀI CHÍNH, NHẬT KÝ KIỂM TOÁN & CHẾ ĐỘ TOÀN CẢNH (TV MODE)
 * Tuân thủ tiêu chuẩn DESIGN.md SSOT: Minimalist Modern Bento Grid, màu cam #EA580C, không dùng emoji.
 */

(function () {
  'use strict';

  const AdminAnalyticsModule = {
    _adminTrendsState: {
      days: 14,
      data: null,
      isLoading: false
    },

    _adminAuditState: {
      page: 1,
      limit: 15,
      action: 'ALL',
      target_type: 'ALL',
      search: '',
      data: null,
      isLoading: false
    },

    _tvModeInterval: null,
    _tvModeActive: false,

    // =========================================================================
    // 1. BIỂU ĐỒ TRỰC QUAN XU HƯỚNG SÀN (INTERACTIVE SVG AREA/LINE CHART)
    // =========================================================================

    /**
     * Tải và dựng biểu đồ đường SVG trực quan cho Dashboard Admin
     */
    async loadAndRenderAdminTrendsChart(containerId = 'admin-trends-chart-container', days = 14) {
      const container = document.getElementById(containerId);
      if (!container) return;

      this._adminTrendsState.days = days;
      this._adminTrendsState.isLoading = true;

      container.innerHTML = `
        <div class="h-64 flex flex-col items-center justify-center text-stone-400 space-y-2">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-stone-200 dark:border-stone-700 border-t-orange-600"></div>
          <span class="text-xs font-mono">Đang tổng hợp dữ liệu xu hướng ${days} ngày...</span>
        </div>
      `;

      try {
        const res = await this.api(`/admin/analytics/trends?days=${days}`);
        if (!res || !res.success || !res.trends) {
          throw new Error('Không thể tải dữ liệu xu hướng sàn');
        }

        this._adminTrendsState.data = res.trends;
        this._adminTrendsState.summary = res.summary || {};
        this._adminTrendsState.isLoading = false;

        this._renderTrendsSvg(container, res.trends, res.summary, days);
      } catch (err) {
        console.error('Lỗi loadAndRenderAdminTrendsChart:', err);
        container.innerHTML = `
          <div class="h-48 flex flex-col items-center justify-center text-stone-400 text-xs">
            <span class="text-red-500 font-semibold mb-2">${err.message || 'Lỗi nạp dữ liệu biểu đồ'}</span>
            <button onclick="VibeApp.loadAndRenderAdminTrendsChart('${containerId}', ${days})" class="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-200">
              Thử lại
            </button>
          </div>
        `;
      }
    },

    /**
     * Dựng mã SVG thuần trực quan mượt mà với trục tọa độ, lưới và đường Area Gradient
     */
    _renderTrendsSvg(container, trends, summary, days) {
      if (!trends || trends.length === 0) {
        container.innerHTML = '<div class="py-12 text-center text-stone-400 text-xs">Chưa có dữ liệu giao dịch trong chu kỳ này.</div>';
        return;
      }

      // 1. Tính toán giá trị cực đại để định tỉ lệ trục Y
      let maxAmount = 100000;
      trends.forEach(t => {
        if (t.deposits > maxAmount) maxAmount = t.deposits;
        if (t.payouts > maxAmount) maxAmount = t.payouts;
      });
      // Làm tròn cận trên mượt mà
      const yMax = Math.ceil(maxAmount * 1.15 / 100000) * 100000;

      // 2. Tọa độ khung vẽ SVG viewBox 0 0 800 240
      const width = 800;
      const height = 240;
      const padLeft = 65;
      const padRight = 25;
      const padTop = 20;
      const padBottom = 35;
      const chartW = width - padLeft - padRight;
      const chartH = height - padTop - padBottom;

      const n = trends.length;
      const getX = (idx) => padLeft + (idx / (n - 1 || 1)) * chartW;
      const getY = (val) => padTop + chartH - (Math.min(val, yMax) / yMax) * chartH;

      // 3. Tạo chuỗi điểm cho Nạp tiền (Cam) và Rút tiền (Xanh lá)
      const depPoints = trends.map((t, i) => ({ x: getX(i), y: getY(t.deposits), val: t.deposits, date: t.date, raw: t }));
      const payPoints = trends.map((t, i) => ({ x: getX(i), y: getY(t.payouts), val: t.payouts, date: t.date, raw: t }));

      const makePathD = (pts) => {
        if (pts.length === 0) return '';
        return pts.reduce((acc, p, i) => {
          if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          const prev = pts[i - 1];
          const cp1x = prev.x + (p.x - prev.x) / 3;
          const cp2x = prev.x + (2 * (p.x - prev.x)) / 3;
          return `${acc} C ${cp1x.toFixed(1)} ${prev.y.toFixed(1)}, ${cp2x.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        }, '');
      };

      const depLineD = makePathD(depPoints);
      const payLineD = makePathD(payPoints);

      const depAreaD = `${depLineD} L ${getX(n - 1)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;
      const payAreaD = `${payLineD} L ${getX(n - 1)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;

      // 4. Lưới trục Y (4 mốc)
      const yTicks = [0, yMax * 0.33, yMax * 0.66, yMax];
      const formatCurrencyShort = (v) => {
        if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (v >= 1000) return Math.round(v / 1000) + 'k';
        return v + 'đ';
      };

      // 5. Mốc nhãn trục X
      const stepX = Math.max(1, Math.floor(n / 6));

      container.innerHTML = `
        <div class="space-y-3">
          <!-- Thanh điều khiển chu kỳ & Thống kê vắn tắt -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100 dark:border-stone-800">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <i data-lucide="trending-up" class="w-4 h-4 text-orange-600"></i>
                <span>Chu Kỳ Đối Soát:</span>
              </span>
              <div class="inline-flex p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs font-mono">
                <button type="button" onclick="VibeApp.loadAndRenderAdminTrendsChart('${container.id}', 7)" class="px-2.5 py-1 rounded-md font-bold transition-all ${days === 7 ? 'bg-orange-600 text-white shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}">7 Ngày</button>
                <button type="button" onclick="VibeApp.loadAndRenderAdminTrendsChart('${container.id}', 14)" class="px-2.5 py-1 rounded-md font-bold transition-all ${days === 14 ? 'bg-orange-600 text-white shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}">14 Ngày</button>
                <button type="button" onclick="VibeApp.loadAndRenderAdminTrendsChart('${container.id}', 30)" class="px-2.5 py-1 rounded-md font-bold transition-all ${days === 30 ? 'bg-orange-600 text-white shadow-2xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'}">30 Ngày</button>
              </div>
            </div>

            <!-- Legend chú giải -->
            <div class="flex items-center gap-4 text-[11px] font-bold text-stone-600 dark:text-stone-400 flex-wrap">
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-1 bg-orange-600 rounded-full inline-block"></span>
                <span>Nạp Tiền: <strong class="text-stone-900 dark:text-white font-mono font-bold">${(summary.totalDeposits || 0).toLocaleString('vi-VN')} đ</strong></span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-1 bg-emerald-600 rounded-full inline-block"></span>
                <span>Giải Ngân: <strong class="text-stone-900 dark:text-white font-mono font-bold">${(summary.totalPayouts || 0).toLocaleString('vi-VN')} đ</strong></span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-stone-400 inline-block"></span>
                <span>Lượt Bài: <strong class="text-stone-900 dark:text-white font-mono font-bold">${(summary.totalResponses || 0).toLocaleString('vi-VN')}</strong></span>
              </div>
            </div>
          </div>

          <!-- Khung SVG đồ họa -->
          <div class="relative w-full overflow-hidden select-none">
            <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto max-h-64 overflow-visible font-mono text-[10px]">
              <defs>
                <linearGradient id="trendDepositGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#EA580C" stop-opacity="0.28" />
                  <stop offset="100%" stop-color="#EA580C" stop-opacity="0.01" />
                </linearGradient>
                <linearGradient id="trendPayoutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#059669" stop-opacity="0.22" />
                  <stop offset="100%" stop-color="#059669" stop-opacity="0.01" />
                </linearGradient>
              </defs>

              <!-- Đường lưới ngang Y -->
              ${yTicks.map(val => {
                const yPos = getY(val);
                return `
                  <line x1="${padLeft}" y1="${yPos.toFixed(1)}" x2="${(width - padRight).toFixed(1)}" y2="${yPos.toFixed(1)}" stroke="currentColor" class="text-stone-200 dark:text-stone-800" stroke-dasharray="3 3" stroke-width="1" />
                  <text x="${(padLeft - 8).toFixed(1)}" y="${(yPos + 3.5).toFixed(1)}" text-anchor="end" fill="currentColor" class="text-stone-400 text-[10px] font-bold">${formatCurrencyShort(val)}</text>
                `;
              }).join('')}

              <!-- Vùng đổ màu Gradient -->
              <path d="${depAreaD}" fill="url(#trendDepositGrad)" />
              <path d="${payAreaD}" fill="url(#trendPayoutGrad)" />

              <!-- Đường chỉ số Nạp tiền (Cam) -->
              <path d="${depLineD}" fill="none" stroke="#EA580C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

              <!-- Đường chỉ số Rút tiền (Xanh lá) -->
              <path d="${payLineD}" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 2" />

              <!-- Điểm nút tương tác (Dots) -->
              ${depPoints.map(p => `
                <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#FFFFFF" stroke="#EA580C" stroke-width="2" class="cursor-pointer hover:r-5 transition-all">
                  <title>Ngày ${p.date}: Nạp ${p.val.toLocaleString('vi-VN')} đ | Lượt nộp: ${p.raw.responses}</title>
                </circle>
              `).join('')}

              ${payPoints.map(p => `
                <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#FFFFFF" stroke="#059669" stroke-width="2" class="cursor-pointer hover:r-4.5 transition-all">
                  <title>Ngày ${p.date}: Rút ${p.val.toLocaleString('vi-VN')} đ</title>
                </circle>
              `).join('')}

              <!-- Nhãn ngày tháng trục X -->
              ${trends.map((t, idx) => {
                if (idx % stepX !== 0 && idx !== n - 1) return '';
                const parts = t.date.split('-');
                const label = `${parts[2]}/${parts[1]}`;
                const xPos = getX(idx);
                return `
                  <text x="${xPos.toFixed(1)}" y="${(height - 8).toFixed(1)}" text-anchor="middle" fill="currentColor" class="text-stone-400 font-semibold text-[10px]">${label}</text>
                  <line x1="${xPos.toFixed(1)}" y1="${(padTop + chartH).toFixed(1)}" x2="${xPos.toFixed(1)}" y2="${(padTop + chartH + 4).toFixed(1)}" stroke="currentColor" class="text-stone-300 dark:text-stone-700" stroke-width="1" />
                `;
              }).join('')}
            </svg>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    },

    // =========================================================================
    // 2. PHÂN HỆ NHẬT KÝ KIỂM TOÁN (ADMIN AUDIT LOGS VIEW)
    // =========================================================================

    /**
     * Dựng toàn cảnh giao diện Phân hệ Nhật Ký Kiểm Toán
     */
    async renderAdminAuditLogsView(root) {
      if (!this.state.currentUser || this.state.currentUser.role !== 'ADMIN') {
        this.showToast('Bạn không có quyền truy cập nhật ký kiểm toán', 'error');
        this.navigate('surveys');
        return;
      }

      root.innerHTML = `
        <div class="space-y-6">
          ${this.renderAdminSubNav('admin-audit-logs')}

          <!-- Header Phân Hệ -->
          <div class="pb-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">Nhật Ký Kiểm Toán Quản Trị</h1>
                <span class="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[10px] font-mono font-bold rounded-md">IMMUTABLE</span>
              </div>
              <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Theo dõi lịch sử toàn bộ thao tác phê duyệt, khóa tài khoản, xử lý sự cố và can thiệp tài chính.</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="VibeApp.renderAdminAuditLogsView(document.getElementById('app-root'))" class="px-3 py-1.5 bg-white dark:bg-[#18181B] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs" title="Làm mới bảng log">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-stone-500"></i>
                <span>Làm Mới</span>
              </button>
            </div>
          </div>

          <!-- Bộ lọc & Ô Tìm Kiếm Chuẩn Bento -->
          <div class="bento-card p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2.5 flex-1">
              <!-- Ô tìm kiếm -->
              <div class="relative min-w-[220px] max-w-sm flex-1">
                <i data-lucide="search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"></i>
                <input 
                  type="text" 
                  id="admin-audit-search-input" 
                  value="${this.escapeHtml(this._adminAuditState.search || '')}"
                  placeholder="Tìm theo Admin, Hành động, IP..." 
                  onkeydown="if(event.key === 'Enter') VibeApp.searchAdminAuditLogs(this.value)"
                  class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-[#33333D] bg-white dark:bg-[#161619] text-xs text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:border-orange-600 transition-colors"
                />
              </div>

              <!-- Lọc Hành Động (Custom Dropdown) -->
              <div class="relative">
                <button type="button" onclick="VibeApp.toggleCustomDropdown('audit-action-dropdown', 'audit-action-icon')" class="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-[#33333D] bg-white dark:bg-[#161619] text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 hover:border-orange-500 transition-colors shadow-2xs">
                  <span>Hành động: <strong>${this._getAuditActionLabel(this._adminAuditState.action)}</strong></span>
                  <i id="audit-action-icon" data-lucide="chevron-down" class="w-3 h-3 text-stone-400 transition-transform"></i>
                </button>
                <div id="audit-action-dropdown" class="hidden absolute left-0 top-full mt-1.5 z-50 min-w-[210px] p-1.5 rounded-xl bg-white dark:bg-[#1C1C20] border border-stone-200 dark:border-[#2E2E36] shadow-2xl space-y-0.5">
                  ${[
                    { val: 'ALL', label: 'Tất cả hành động' },
                    { val: 'APPROVE_PAYOUT', label: 'Duyệt Rút Tiền' },
                    { val: 'REJECT_PAYOUT', label: 'Từ Chối Rút Tiền' },
                    { val: 'BAN_USER', label: 'Khóa Tài Khoản' },
                    { val: 'UNBAN_USER', label: 'Mở Khóa Tài Khoản' },
                    { val: 'BAN_IP', label: 'Cấm Địa Chỉ IP' },
                    { val: 'UNBAN_IP', label: 'Mở Cấm IP' },
                    { val: 'UPDATE_BUG_REPORT_STATUS', label: 'Xử Lý Báo Lỗi' },
                    { val: 'SIMULATE_PAYMENT_SUCCESS', label: 'Mô Phỏng Nạp Tiền' }
                  ].map(it => `
                    <div onclick="VibeApp.setAdminAuditFilter('action', '${it.val}')" class="px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold hover:bg-stone-100 dark:hover:bg-[#25252B] transition-colors flex items-center justify-between ${this._adminAuditState.action === it.val ? 'text-orange-600 font-bold bg-orange-50/50 dark:bg-orange-950/20' : 'text-stone-700 dark:text-stone-300'}">
                      <span>${it.label}</span>
                      ${this._adminAuditState.action === it.val ? '<i data-lucide="check" class="w-3 h-3 text-orange-600"></i>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Tổng số bản ghi -->
            <div id="admin-audit-count-badge" class="text-xs text-stone-400 font-mono self-center">
              Đang tải danh sách...
            </div>
          </div>

          <!-- Bảng Dữ Liệu Nhật Ký Kiểm Toán -->
          <div id="admin-audit-table-container" class="bento-card overflow-hidden">
            <div class="p-12 text-center text-stone-400 space-y-2">
              <div class="animate-spin rounded-full h-7 w-7 border-2 border-stone-200 dark:border-stone-700 border-t-orange-600 mx-auto"></div>
              <p class="text-xs">Đang tải nhật ký kiểm toán hệ thống...</p>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      this.fetchAndRenderAdminAuditLogs();
    },

    /**
     * Tải và render bảng dữ liệu nhật ký kiểm toán
     */
    async fetchAndRenderAdminAuditLogs() {
      const container = document.getElementById('admin-audit-table-container');
      const countBadge = document.getElementById('admin-audit-count-badge');
      if (!container) return;

      const { page, limit, action, target_type, search } = this._adminAuditState;
      const q = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (action && action !== 'ALL') q.append('action', action);
      if (target_type && target_type !== 'ALL') q.append('target_type', target_type);
      if (search) q.append('search', search);

      try {
        const res = await this.api(`/admin/audit-logs?${q.toString()}`);
        if (!res || !res.success) throw new Error(res.message || 'Lỗi khi lấy nhật ký');

        const logs = res.logs || [];
        const pagination = res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };
        this._adminAuditState.data = logs;

        if (countBadge) {
          countBadge.innerHTML = `Tổng cộng: <strong class="text-stone-900 dark:text-white font-mono">${pagination.total.toLocaleString('vi-VN')}</strong> bản ghi`;
        }

        if (logs.length === 0) {
          container.innerHTML = `
            <div class="py-16 text-center text-stone-400 space-y-2">
              <div class="w-10 h-10 mx-auto rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
                <i data-lucide="clipboard-list" class="w-5 h-5"></i>
              </div>
              <p class="text-xs font-semibold text-stone-700 dark:text-stone-300">Không tìm thấy bản ghi kiểm toán nào</p>
              <p class="text-[11px] text-stone-400 max-w-xs mx-auto">Chưa có thao tác quản trị nào phù hợp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.</p>
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
          return;
        }

        container.innerHTML = `
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-stone-50/80 dark:bg-[#161619] border-b border-stone-200 dark:border-stone-800 text-[10.5px] font-black uppercase tracking-wider text-stone-500">
                <tr>
                  <th class="py-3 px-3.5">Thời Gian</th>
                  <th class="py-3 px-3.5">Quản Trị Viên</th>
                  <th class="py-3 px-3.5">Hành Động</th>
                  <th class="py-3 px-3.5">Đối Tượng</th>
                  <th class="py-3 px-3.5">Chi Tiết Can Thiệp</th>
                  <th class="py-3 px-3.5">Địa Chỉ IP</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-stone-800/80">
                ${logs.map(log => {
                  const actionBadge = this._formatAuditActionBadge(log.action);
                  const targetText = log.target_type ? `${log.target_type}: <span class="font-mono text-stone-900 dark:text-white">${log.target_id || 'N/A'}</span>` : '-';
                  const detailsText = this._formatAuditDetailsSummary(log.details);
                  const hasComplexDetails = log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0;

                  return `
                    <tr class="hover:bg-stone-50/60 dark:hover:bg-stone-900/30 transition-colors">
                      <td class="py-3 px-3.5 whitespace-nowrap">
                        <div class="font-mono font-bold text-stone-800 dark:text-stone-200 text-[11px]">${new Date(log.created_at).toLocaleTimeString('vi-VN')}</div>
                        <div class="font-mono text-[9.5px] text-stone-400">${new Date(log.created_at).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td class="py-3 px-3.5 whitespace-nowrap">
                        <div class="font-bold text-stone-900 dark:text-white">${this.escapeHtml(log.admin_name || 'Admin')}</div>
                        <div class="text-[9.5px] text-stone-400 font-mono truncate max-w-[120px]">${this.escapeHtml(log.admin_id || '')}</div>
                      </td>
                      <td class="py-3 px-3.5 whitespace-nowrap">
                        ${actionBadge}
                      </td>
                      <td class="py-3 px-3.5 text-stone-600 dark:text-stone-400 text-[11px] whitespace-nowrap">
                        ${targetText}
                      </td>
                      <td class="py-3 px-3.5 text-stone-700 dark:text-stone-300 max-w-sm">
                        <div class="truncate text-[11px]" title="${this.escapeHtml(typeof log.details === 'string' ? log.details : JSON.stringify(log.details))}">
                          ${detailsText}
                        </div>
                        ${hasComplexDetails ? `
                          <button type="button" onclick="VibeApp.viewAuditLogDetails('${log.id}')" class="text-orange-600 hover:underline text-[10px] font-bold mt-0.5 inline-block">
                            Xem chi tiết payload
                          </button>
                        ` : ''}
                      </td>
                      <td class="py-3 px-3.5 whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-mono text-[10.5px]">
                          ${this.escapeHtml(log.ip_address || '127.0.0.1')}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Phân Trang -->
          <div class="p-3 bg-stone-50/50 dark:bg-[#161619] border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500">
            <span>Trang <strong>${pagination.page}</strong> / ${pagination.totalPages}</span>
            <div class="flex items-center gap-1.5">
              <button ${pagination.page <= 1 ? 'disabled' : ''} onclick="VibeApp.setAdminAuditFilter('page', ${pagination.page - 1})" class="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 text-xs font-bold transition-colors">
                Trang Trước
              </button>
              <button ${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="VibeApp.setAdminAuditFilter('page', ${pagination.page + 1})" class="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-40 text-xs font-bold transition-colors">
                Trang Sau
              </button>
            </div>
          </div>
        `;

        if (window.lucide) window.lucide.createIcons();
      } catch (err) {
        console.error('Lỗi fetchAndRenderAdminAuditLogs:', err);
        container.innerHTML = `
          <div class="py-12 text-center text-red-500 text-xs font-bold space-y-2">
            <p>Không thể tải dữ liệu nhật ký: ${err.message}</p>
            <button onclick="VibeApp.fetchAndRenderAdminAuditLogs()" class="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-bold">
              Tải lại
            </button>
          </div>
        `;
      }
    },

    setAdminAuditFilter(key, val) {
      this._adminAuditState[key] = val;
      if (key !== 'page') this._adminAuditState.page = 1;
      this.closeAllCustomDropdowns();
      this.renderAdminAuditLogsView(document.getElementById('app-root'));
    },

    searchAdminAuditLogs(val) {
      this._adminAuditState.search = val.trim();
      this._adminAuditState.page = 1;
      this.renderAdminAuditLogsView(document.getElementById('app-root'));
    },

    _getAuditActionLabel(act) {
      const map = {
        ALL: 'Tất cả',
        APPROVE_PAYOUT: 'Duyệt Rút Tiền',
        REJECT_PAYOUT: 'Từ Chối Rút Tiền',
        BAN_USER: 'Khóa Tài Khoản',
        UNBAN_USER: 'Mở Khóa Tài Khoản',
        BAN_IP: 'Cấm Địa Chỉ IP',
        UNBAN_IP: 'Mở Cấm IP',
        UPDATE_BUG_REPORT_STATUS: 'Xử Lý Báo Lỗi',
        SIMULATE_PAYMENT_SUCCESS: 'Mô Phỏng Nạp Tiền'
      };
      return map[act] || act;
    },

    _formatAuditActionBadge(act) {
      let colorClass = 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';
      if (act.includes('APPROVE') || act.includes('UNBAN')) {
        colorClass = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-800/60';
      } else if (act.includes('REJECT') || act.includes('BAN')) {
        colorClass = 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300/60 dark:border-rose-800/60';
      } else if (act.includes('BUG')) {
        colorClass = 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-300/60 dark:border-orange-800/60';
      }
      return `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap ${colorClass}">${act}</span>`;
    },

    _formatAuditDetailsSummary(details) {
      if (!details) return '<span class="text-stone-400 italic">Không có chi tiết</span>';
      if (typeof details === 'string') return this.escapeHtml(details);
      if (typeof details === 'object') {
        const parts = [];
        for (const [k, v] of Object.entries(details)) {
          if (v !== null && v !== undefined && typeof v !== 'object') {
            parts.push(`${k}: ${v}`);
          }
        }
        return this.escapeHtml(parts.join(' | ') || JSON.stringify(details));
      }
      return String(details);
    },

    /**
     * Mở popup xem chi tiết JSON payload của một bản ghi kiểm toán
     */
    viewAuditLogDetails(logId) {
      const logs = this._adminAuditState.data || [];
      const log = logs.find(l => l.id === logId);
      if (!log) return;

      this.showModal({
        title: 'Chi Tiết Nhật Ký Kiểm Toán',
        maxWidth: 'max-w-2xl',
        content: `
          <div class="space-y-4 text-xs">
            <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <div>
                <span class="text-[10px] text-stone-400 block font-bold">Hành Động:</span>
                <span class="font-mono font-black text-orange-600 dark:text-orange-400">${log.action}</span>
              </div>
              <div>
                <span class="text-[10px] text-stone-400 block font-bold">Thời Gian:</span>
                <span class="font-mono text-stone-700 dark:text-stone-300">${new Date(log.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <div>
                <span class="text-[10px] text-stone-400 block font-bold">Quản Trị Viên:</span>
                <span class="font-bold text-stone-800 dark:text-stone-200">${this.escapeHtml(log.admin_name || 'N/A')} (${log.admin_id})</span>
              </div>
              <div>
                <span class="text-[10px] text-stone-400 block font-bold">Địa Chỉ IP:</span>
                <span class="font-mono text-stone-700 dark:text-stone-300">${log.ip_address || '127.0.0.1'}</span>
              </div>
            </div>

            <div class="space-y-1">
              <span class="font-bold text-stone-700 dark:text-stone-300 block">Dữ Liệu Can Thiệp (Payload JSON):</span>
              <pre class="p-3 rounded-xl bg-stone-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-64 border border-stone-800 scrollbar-thin select-all">${this.escapeHtml(JSON.stringify(log.details, null, 2))}</pre>
            </div>
          </div>
        `
      });
    },

    // =========================================================================
    // 3. CHẾ ĐỘ MÀN HÌNH TOÀN CẢNH (EXECUTIVE TV / FULLSCREEN MODE)
    // =========================================================================

    /**
     * Bật / Tắt chế độ màn hình phòng họp TV cho Admin Overview
     */
    toggleAdminFullscreenTvMode() {
      this.haptic('light');
      this._tvModeActive = !this._tvModeActive;

      const header = document.querySelector('header');
      const mobileNav = document.getElementById('mobile-bottom-nav');
      const root = document.getElementById('app-root');

      if (this._tvModeActive) {
        // Vào chế độ TV Mode
        if (header) header.classList.add('hidden');
        if (mobileNav) mobileNav.classList.add('hidden');
        document.body.classList.add('tv-fullscreen-active');

        // Thêm nút nổi cố định ở góc trên bên phải màn hình để thoát TV Mode
        let exitBtn = document.getElementById('exit-tv-mode-floating-btn');
        if (!exitBtn) {
          exitBtn = document.createElement('button');
          exitBtn.id = 'exit-tv-mode-floating-btn';
          exitBtn.setAttribute('onclick', 'VibeApp.toggleAdminFullscreenTvMode()');
          exitBtn.className = 'fixed top-4 right-4 z-[9999] px-3.5 py-1.5 rounded-full bg-stone-900/90 dark:bg-stone-800/90 hover:bg-black text-white text-xs font-bold border border-stone-700 shadow-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer';
          exitBtn.innerHTML = `
            <i data-lucide="minimize-2" class="w-3.5 h-3.5 text-orange-500"></i>
            <span>Thoát Toàn Cảnh (Esc)</span>
          `;
          document.body.appendChild(exitBtn);
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
          }
        }

        // Bật polling tự động làm mới mỗi 20 giây
        if (this._tvModeInterval) clearInterval(this._tvModeInterval);
        this._tvModeInterval = setInterval(() => {
          if (this.state.currentTab === 'admin-overview') {
            this.renderAdminOverviewView(document.getElementById('app-root'), true);
          }
        }, 20000);

        this.showToast('Đã bật chế độ Toàn cảnh (TV Presentation Mode). Nhấn phím Escape hoặc nút góc để thoát.', 'success');
      } else {
        // Thoát chế độ TV Mode
        if (header) header.classList.remove('hidden');
        if (mobileNav) mobileNav.classList.remove('hidden');
        document.body.classList.remove('tv-fullscreen-active');

        // Xóa nút nổi thoát TV Mode
        const exitBtn = document.getElementById('exit-tv-mode-floating-btn');
        if (exitBtn) {
          exitBtn.remove();
        }

        if (this._tvModeInterval) {
          clearInterval(this._tvModeInterval);
          this._tvModeInterval = null;
        }

        this.showToast('Đã trở lại chế độ xem chuẩn.', 'info');
      }

      // Re-render view hiện tại
      if (this.state.currentTab === 'admin-overview') {
        this.renderAdminOverviewView(root);
      }
    }
  };

  // Tự động mở rộng vào Namespace toàn cục VibeApp
  if (typeof window !== 'undefined') {
    window.VibeApp = window.VibeApp || {};
    Object.assign(window.VibeApp, AdminAnalyticsModule);
  }
})();
