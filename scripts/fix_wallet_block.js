const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

const startMarker = '  // ==================== VIEW 5: VÍ & RÚT TIỀN (MODERN FINTECH) ====================';
const endMarker = '  openPayoutModal() {';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Không tìm thấy markers trong public/app.js', { startIdx, endIdx });
  process.exit(1);
}

const replacement = `  // ==================== VIEW 5: VÍ & RÚT TIỀN (MODERN FINTECH) ====================
  async renderWalletView(root) {
    if (!this.state.currentUser) {
      this.renderGuestLockedView(root, 'Ví & Rút Tiền', 'Vui lòng đăng nhập để quản lý số dư điểm thưởng, lịch sử giao dịch và gửi yêu cầu đổi thưởng về tài khoản.');
      return;
    }

    const [res, payoutsRes] = await Promise.all([
      this.api('/wallet'),
      this.api('/wallet/payouts').catch(() => ({ payouts: [] }))
    ]);
    const wallet = res.wallet || {};
    const transactions = res.transactions || [];
    const payouts = (payoutsRes && payoutsRes.payouts) || [];
    this.state.wallet = wallet;
    this.state.transactions = transactions;
    this.state.payouts = payouts;

    const curPoints = Number(wallet.point_balance || 0);
    const curCredit = Number(wallet.credit_balance || 0);
    const payoutGoal = 10000; // Mốc đổi thưởng tối thiểu từ 10.000 điểm
    const canPayout = curPoints >= payoutGoal;
    const payoutPercentRaw = (curPoints / payoutGoal) * 100;
    const payoutPercent = Math.min(100, Math.max(0.5, payoutPercentRaw)).toFixed(1).replace('.', ',');
    const progressWidth = Math.min(100, Math.max(2, payoutPercentRaw));

    root.innerHTML = \`
      <div class="space-y-6 max-w-5xl mx-auto">
        
        <!-- HEADER TRANG VÍ: ICON + TIÊU ĐỀ + BREADCRUMB (CHUẨN BẢN VẼ) -->
        <div class="flex items-center justify-between pb-1">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <i data-lucide="wallet" class="w-5 h-5 stroke-[2.2]"></i>
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Ví & Rút Tiền</h1>
              <p class="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-normal">Quản lý điểm thưởng, Credit và lịch sử giao dịch của bạn.</p>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 font-medium">
            <i data-lucide="home" class="w-3.5 h-3.5"></i>
            <span>/</span>
            <span class="text-stone-600 dark:text-stone-300 font-semibold">Ví & Rút Tiền</span>
          </div>
        </div>

        <!-- 2 THẺ BENTO LỚN TRÊN CÙNG: POINT CỦA BẠN (CAM SUNSET) & CREDIT (TRẮNG TINH TẾ) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          <!-- THẺ 1 (TRÁI): POINT CỦA BẠN (SUNSET ORANGE GRADIENT CARD) -->
          <div class="rounded-3xl p-6 sm:p-7 text-white flex flex-col justify-between shadow-sm relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 min-h-[260px]">
            <!-- Chiếc ví da 3D màu cam và nền sao mờ đầy đủ 100% -->
            <img src="/assets/3d/wallet_3d_full.png" class="absolute -right-2 top-2 w-44 sm:w-56 h-auto object-contain pointer-events-none select-none z-0" alt="3D Orange Wallet" />

            <!-- Nội dung Thẻ Point -->
            <div class="relative z-10">
              <!-- Badge Point của bạn -->
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-xs text-white border border-white/25 shadow-2xs">
                <i data-lucide="star" class="w-3.5 h-3.5 fill-white text-white"></i>
                <span class="tracking-wide uppercase text-[11px]">POINT CỦA BẠN</span>
              </div>

              <!-- Số dư lớn -->
              <div class="mt-4">
                <div class="flex items-baseline gap-2">
                  <span class="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight drop-shadow-xs">\${curPoints.toLocaleString('vi-VN')}</span>
                  <span class="text-2xl font-bold text-white drop-shadow-xs">Point</span>
                </div>
                <div class="text-sm font-medium text-white/95 mt-0.5 font-mono">
                  ≈ \${curPoints.toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
            </div>

            <!-- Thanh tiến độ & Nút CTA -->
            <div class="relative z-10 pt-4">
              <div class="flex items-center justify-between text-xs font-semibold text-white/95">
                <span class="flex items-center gap-1.5">
                  <i data-lucide="flag" class="w-3.5 h-3.5 stroke-[2.2]"></i>
                  <span>Mục tiêu rút tiền: 10.000 Point</span>
                </span>
                <span class="font-mono font-bold text-xs">\${payoutPercent}%</span>
              </div>

              <div class="w-full bg-white/25 h-2 rounded-full overflow-hidden mt-2 p-0.5">
                <div class="bg-white h-full rounded-full transition-all duration-500 relative" style="width: \${progressWidth}%"></div>
              </div>

              <div class="text-[11px] text-white/85 mt-1 font-medium">
                Đạt \${payoutPercent}% điều kiện rút tiền
              </div>

              <button type="button" onclick="VibeApp.openPayoutModal()" 
                      class="w-full py-3 px-5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs flex items-center justify-center gap-2 mt-4 transition-all active:scale-98 cursor-pointer border border-white/25 shadow-xs">
                <i data-lucide="gift" class="w-4 h-4"></i>
                <span>Đổi thưởng / Rút tiền</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- THẺ 2 (PHẢI): CREDIT DOANH NGHIỆP (WHITE MODERN CARD) -->
          <div class="bg-white dark:bg-[#18181B] rounded-3xl p-6 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[260px]">
            <!-- Chồng tiền xu vàng 3D và vé Coupon % chuẩn y hệt bản thiết kế đề xuất -->
            <img src="/assets/3d/coins_3d_full.png" class="absolute -right-2 top-2 w-40 sm:w-52 h-auto object-contain pointer-events-none select-none z-0" alt="3D Coins and Coupon" />

            <!-- Nội dung Thẻ Credit -->
            <div class="relative z-10">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
                  <i data-lucide="coins" class="w-4 h-4"></i>
                </div>
                <span class="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">CREDIT</span>
              </div>

              <div class="mt-4">
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl sm:text-4xl font-extrabold font-mono text-stone-900 dark:text-white tracking-tight">\${curCredit.toLocaleString('vi-VN')}</span>
                  <span class="text-sm font-bold text-stone-500 dark:text-stone-400">Credit</span>
                </div>
                <div class="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 mt-2 font-medium">
                  <i data-lucide="info" class="w-3.5 h-3.5 text-stone-400 shrink-0"></i>
                  <span>Dùng tạo khảo sát và tài trợ voucher.</span>
                </div>
              </div>
            </div>

            <!-- Nút CTA Nạp Credit -->
            <div class="relative z-10 pt-4">
              <button type="button" onclick="VibeApp.openDepositModal()" 
                      class="w-full py-3 px-5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center gap-2 mt-4 transition-all active:scale-98 cursor-pointer border border-orange-200/60 dark:border-orange-800/60 shadow-xs">
                <i data-lucide="plus" class="w-4 h-4 stroke-[2.5]"></i>
                <span>Nạp Credit</span>
              </button>
            </div>
          </div>

        </div>

        <!-- KHỐI LỊCH SỬ GIAO DỊCH: TABS + TIME SELECTOR + FLAT CARDS (CHUẨN BẢN VẼ) -->
        <div id="wallet-tx-history-section" class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-4">
          <!-- Header Lịch sử -->
          <div class="flex items-center justify-between pb-1">
            <div class="flex items-center gap-2.5">
              <i data-lucide="history" class="w-5 h-5 text-orange-500 stroke-[2.2]"></i>
              <h3 class="text-base font-bold text-stone-900 dark:text-white tracking-tight">Lịch sử giao dịch</h3>
            </div>
            <a href="javascript:void(0)" onclick="VibeApp.switchWalletTab('ALL')" class="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors">
              <span>Xem tất cả</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </a>
          </div>

          <!-- Filter Tabs + Date Filter Selector -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-stone-100 dark:border-stone-800/80 pb-3">
            <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button type="button" onclick="VibeApp.filterWalletTransactions('ALL')" id="tab-tx-all" class="px-4 py-1.5 rounded-full text-xs font-bold bg-orange-600 text-white shadow-xs transition-all cursor-pointer">
                Tất cả
              </button>
              <button type="button" onclick="VibeApp.filterWalletTransactions('REWARD')" id="tab-tx-reward" class="px-4 py-1.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer">
                Nhận thưởng
              </button>
              <button type="button" onclick="VibeApp.filterWalletTransactions('SWAP')" id="tab-tx-swap" class="px-4 py-1.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer">
                Đổi Credit
              </button>
              <button type="button" onclick="VibeApp.filterWalletTransactions('PAYOUT')" id="tab-tx-payout" class="px-4 py-1.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer">
                Rút tiền
              </button>
            </div>

            <!-- Time Filter Dropdown (Custom Dropdown chuẩn) -->
            <div class="relative">
              <button type="button" onclick="VibeApp.toggleWalletTimeDropdown(event)" class="custom-dropdown-trigger inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-600 dark:text-stone-300 shadow-2xs hover:bg-stone-50 transition-colors cursor-pointer">
                <i data-lucide="calendar" class="w-3.5 h-3.5 text-stone-400"></i>
                <span id="wallet-time-dropdown-label">30 ngày gần đây</span>
                <i data-lucide="chevron-down" class="dropdown-trigger-icon w-3.5 h-3.5 text-stone-400 pointer-events-none"></i>
              </button>
              <div id="wallet-time-dropdown-menu" class="custom-dropdown-menu hidden absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-lg py-1 z-50 text-xs space-y-0.5">
                <div onclick="VibeApp.selectWalletTimeRange(7, '7 ngày gần đây')" class="px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer font-medium text-stone-700 dark:text-stone-300 rounded-lg mx-1">7 ngày gần đây</div>
                <div onclick="VibeApp.selectWalletTimeRange(30, '30 ngày gần đây')" class="px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer font-bold text-orange-600 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg mx-1">30 ngày gần đây</div>
                <div onclick="VibeApp.selectWalletTimeRange(90, '90 ngày gần đây')" class="px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer font-medium text-stone-700 dark:text-stone-300 rounded-lg mx-1">90 ngày gần đây</div>
                <div onclick="VibeApp.selectWalletTimeRange(365, 'Tất cả thời gian')" class="px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer font-medium text-stone-700 dark:text-stone-300 rounded-lg mx-1">Tất cả thời gian</div>
              </div>
            </div>
          </div>

          <!-- Transaction Items List -->
          <div class="space-y-2.5 pt-1" id="wallet-tx-list-container">
            \${transactions.length === 0 ? \`
              <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50/70 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-2xl bg-orange-100/70 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center shrink-0">
                    <i data-lucide="gift" class="w-5 h-5"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-stone-900 dark:text-white">Thưởng điểm danh</h4>
                    <p class="text-[11px] text-stone-400 font-medium mt-0.5">30/10/2026 · Điểm danh ngày 1</p>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">+50 Point</span>
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                    <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
                  </span>
                </div>
              </div>

              <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50/70 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-2xl bg-blue-100/70 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                    <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-stone-900 dark:text-white">Đổi Point sang Credit</h4>
                    <p class="text-[11px] text-stone-400 font-medium mt-0.5">28/10/2026 · Tỷ lệ 1:10</p>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">+500 Credit</span>
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
                    <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Hoàn tất
                  </span>
                </div>
              </div>
            \` : transactions.slice(0, 10).map(tx => {
              const isPositive = Number(tx.amount || 0) > 0;
              const isPoint = (tx.currency || 'POINT').toUpperCase() === 'POINT';
              const amtStr = (isPositive ? '+' : '') + Number(tx.amount || 0).toLocaleString('vi-VN') + (isPoint ? ' Point' : ' Credit');
              const isReward = tx.type === 'SURVEY_REWARD' || tx.type === 'CHECKIN_REWARD';
              const isSwap = tx.type === 'SWAP_POINTS_TO_CREDIT';
              
              let iconName = 'arrow-up-right';
              let iconBg = 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300';
              let colorCls = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-900 dark:text-white';
              
              if (isReward) {
                iconName = 'gift';
                iconBg = 'bg-orange-100/70 dark:bg-orange-950/40 text-orange-600';
              } else if (isSwap) {
                iconName = 'refresh-cw';
                iconBg = 'bg-blue-100/70 dark:bg-blue-950/40 text-blue-600';
                colorCls = 'text-blue-600 dark:text-blue-400';
              } else if (!isPositive) {
                iconName = 'arrow-down-left';
                iconBg = 'bg-rose-100/70 dark:bg-rose-950/40 text-rose-600';
                colorCls = 'text-rose-600 dark:text-rose-400';
              }

              return \`
                <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50/70 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                  <div class="flex items-center gap-3.5">
                    <div class="w-10 h-10 rounded-2xl \${iconBg} flex items-center justify-center shrink-0">
                      <i data-lucide="\${iconName}" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <h4 class="text-xs font-bold text-stone-900 dark:text-white">\${this.escapeHtml(tx.description || tx.type || 'Giao dịch ví')}</h4>
                      <p class="text-[11px] text-stone-400 font-medium mt-0.5">\${new Date(tx.created_at).toLocaleDateString('vi-VN')} · Mã #\${tx.id || 'TXN'}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="text-xs font-bold font-mono \${colorCls}">\${amtStr}</span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                      <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
                    </span>
                  </div>
                </div>
              \`;
            }).join('')}
          </div>
        </div>

        <!-- KHỐI SỔ CÁI GIAO DỊCH: MINH BẠCH ACCORDION & TABLE (CHUẨN BẢN VẼ) -->
        <div id="wallet-ledger-card" class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3">
          <div class="flex items-center justify-between cursor-pointer select-none" onclick="VibeApp.toggleWalletLedgerAccordion()">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                <i data-lucide="book-open" class="w-3.5 h-3.5 stroke-[2.2]"></i>
              </div>
              <h3 class="text-sm font-bold text-stone-900 dark:text-white">Sổ cái giao dịch</h3>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                <i data-lucide="check-circle-2" class="w-3 h-3 stroke-[2.5]"></i> Minh bạch
              </span>
            </div>
            <i id="wallet-ledger-chevron" data-lucide="chevron-up" class="w-4 h-4 text-stone-400 transition-transform duration-200"></i>
          </div>
          <p class="text-[11px] text-stone-400 dark:text-stone-500">Lưu trữ toàn bộ biến động số dư, phục vụ kiểm tra và đối soát.</p>

          <div id="wallet-ledger-table-wrap" class="overflow-x-auto pt-2">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-400 dark:text-stone-500">
                  <th class="pb-3 px-3.5">Mã giao dịch</th>
                  <th class="pb-3 px-3.5">Loại giao dịch</th>
                  <th class="pb-3 px-3.5">Số tiền</th>
                  <th class="pb-3 px-3.5">Số dư sau giao dịch</th>
                  <th class="pb-3 px-3.5">Thời gian</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-stone-800/60">
                \${transactions.length === 0 ? \`
                  <tr>
                    <td class="py-3 px-3.5 font-mono text-stone-500">#TXN000001</td>
                    <td class="py-3 px-3.5 font-bold text-stone-900 dark:text-white font-mono text-[11px]">SURVEY_REWARD</td>
                    <td class="py-3 px-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">+50 Point</td>
                    <td class="py-3 px-3.5 font-mono font-bold text-stone-900 dark:text-white">50 Point</td>
                    <td class="py-3 px-3.5 text-stone-500 text-[11px] font-mono">30/10/2026 14:23:17</td>
                  </tr>
                \` : transactions.slice(0, 15).map(t => {
                  const isPlus = Number(t.amount || 0) > 0;
                  return \`
                    <tr class="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                      <td class="py-3 px-3.5 font-mono text-stone-500">#\${t.id || 'TXN'}</td>
                      <td class="py-3 px-3.5 font-bold text-stone-900 dark:text-white font-mono text-[11px]">\${t.type || t.tx_type || 'TRANSACTION'}</td>
                      <td class="py-3 px-3.5 font-mono font-bold \${isPlus ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-900 dark:text-stone-100'}">
                        \${isPlus ? '+' : ''}\${Number(t.amount || 0).toLocaleString('vi-VN')} \${t.currency || 'POINT'}
                      </td>
                      <td class="py-3 px-3.5 font-mono font-bold text-stone-700 dark:text-stone-300">\${Number(t.balance_after || 0).toLocaleString('vi-VN')}</td>
                      <td class="py-3 px-3.5 text-stone-500 text-[11px] font-mono">\${new Date(t.created_at).toLocaleString('vi-VN')}</td>
                    </tr>
                  \`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    \`;

    if (window.lucide) window.lucide.createIcons();
  },

  // ==================== TƯƠNG TÁC TRANG VÍ (WALLET INTERACTION ENGINE) ====================
  toggleWalletLedgerAccordion() {
    const wrap = document.getElementById('wallet-ledger-table-wrap');
    const chevron = document.getElementById('wallet-ledger-chevron');
    if (wrap) {
      wrap.classList.toggle('hidden');
      if (chevron) {
        chevron.classList.toggle('rotate-180');
      }
    }
  },

  switchWalletTab(type = 'ALL') {
    this.filterWalletTransactions(type);
    const txSection = document.getElementById('wallet-tx-history-section');
    if (txSection) {
      txSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  filterWalletTransactions(type) {
    this.state.currentWalletFilter = (type || 'ALL').toUpperCase();
    const filterTypes = ['all', 'reward', 'swap', 'payout'];
    filterTypes.forEach(t => {
      const btn = document.getElementById('tab-tx-' + t);
      if (btn) {
        if (t === this.state.currentWalletFilter.toLowerCase()) {
          btn.className = 'px-4 py-1.5 rounded-full text-xs font-bold bg-orange-600 text-white shadow-xs transition-all cursor-pointer';
        } else {
          btn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer';
        }
      }
    });

    const allTx = this.state.transactions || [];
    let filtered = allTx;
    if (this.state.currentWalletFilter === 'REWARD') {
      filtered = allTx.filter(tx => 
        tx.type === 'SURVEY_REWARD' || 
        tx.type === 'CHECKIN_REWARD' || 
        (tx.description && (tx.description.toLowerCase().includes('thưởng') || tx.description.toLowerCase().includes('điểm danh')))
      );
    } else if (this.state.currentWalletFilter === 'SWAP') {
      filtered = allTx.filter(tx => 
        tx.type === 'SWAP_POINTS_TO_CREDIT' || 
        (tx.description && tx.description.toLowerCase().includes('credit'))
      );
    } else if (this.state.currentWalletFilter === 'PAYOUT') {
      filtered = allTx.filter(tx => 
        tx.type === 'PAYOUT' || 
        (tx.type && tx.type.includes('PAYOUT')) || 
        (tx.description && tx.description.toLowerCase().includes('rút'))
      );
    }

    if (this.state.walletTimeDays && this.state.walletTimeDays < 365) {
      const cutoff = Date.now() - (this.state.walletTimeDays * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(tx => new Date(tx.created_at).getTime() >= cutoff);
    }

    this.renderWalletTransactionList(filtered);
  },

  renderWalletTransactionList(txList) {
    const container = document.getElementById('wallet-tx-list-container');
    if (!container) return;

    if (!txList || txList.length === 0) {
      container.innerHTML = \`
        <div class="py-8 text-center text-stone-400 dark:text-stone-500 text-xs font-medium">
          Không có giao dịch nào trong danh mục này.
        </div>
      \`;
      return;
    }

    container.innerHTML = txList.slice(0, 15).map(tx => {
      const isPositive = Number(tx.amount || 0) > 0;
      const isPoint = (tx.currency || 'POINT').toUpperCase() === 'POINT';
      const amtStr = (isPositive ? '+' : '') + Number(tx.amount || 0).toLocaleString('vi-VN') + (isPoint ? ' Point' : ' Credit');
      const isReward = tx.type === 'SURVEY_REWARD' || tx.type === 'CHECKIN_REWARD' || (tx.description && tx.description.toLowerCase().includes('thưởng'));
      const isSwap = tx.type === 'SWAP_POINTS_TO_CREDIT' || (tx.description && tx.description.toLowerCase().includes('credit'));
      
      let iconName = 'arrow-up-right';
      let iconBg = 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300';
      let colorCls = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-900 dark:text-white';
      
      if (isReward) {
        iconName = 'gift';
        iconBg = 'bg-orange-100/70 dark:bg-orange-950/40 text-orange-600';
      } else if (isSwap) {
        iconName = 'refresh-cw';
        iconBg = 'bg-blue-100/70 dark:bg-blue-950/40 text-blue-600';
        colorCls = 'text-blue-600 dark:text-blue-400';
      } else if (!isPositive) {
        iconName = 'arrow-down-left';
        iconBg = 'bg-rose-100/70 dark:bg-rose-950/40 text-rose-600';
        colorCls = 'text-rose-600 dark:text-rose-400';
      }

      return \`
        <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50/70 dark:bg-stone-900/40 border border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-2xl \${iconBg} flex items-center justify-center shrink-0">
              <i data-lucide="\${iconName}" class="w-5 h-5"></i>
            </div>
            <div>
              <h4 class="text-xs font-bold text-stone-900 dark:text-white">\${this.escapeHtml(tx.description || tx.type || 'Giao dịch ví')}</h4>
              <p class="text-[11px] text-stone-400 font-medium mt-0.5">\${new Date(tx.created_at).toLocaleDateString('vi-VN')} · Mã #\${tx.id || 'TXN'}</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-xs font-bold font-mono \${colorCls}">\${amtStr}</span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
              <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
            </span>
          </div>
        </div>
      \`;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  toggleWalletTimeDropdown(e) {
    if (typeof this.toggleCustomDropdown === 'function') {
      this.toggleCustomDropdown('wallet-time-dropdown-menu', e);
    } else {
      if (e && e.stopPropagation) e.stopPropagation();
      const menu = document.getElementById('wallet-time-dropdown-menu');
      if (menu) menu.classList.toggle('hidden');
    }
  },

  selectWalletTimeRange(days, label) {
    this.state.walletTimeDays = days;
    const lbl = document.getElementById('wallet-time-dropdown-label');
    if (lbl) lbl.textContent = label;
    if (typeof this.closeAllCustomDropdowns === 'function') {
      this.closeAllCustomDropdowns();
    } else {
      const menu = document.getElementById('wallet-time-dropdown-menu');
      if (menu) menu.classList.add('hidden');
    }
    this.filterWalletTransactions(this.state.currentWalletFilter || 'ALL');
  },

  `;

const newCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
fs.writeFileSync(appJsPath, newCode, 'utf8');
console.log('Thành công! Độ dài trước:', code.length, 'Độ dài sau:', newCode.length);
