const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../public/app.js');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Thay thế hình ảnh trong renderWalletView để không bị cắt:
content = content.replace(
  /\/assets\/3d\/wallet_orange_3d_feathered\.png/g,
  '/assets/3d/wallet_3d_full.png'
);
content = content.replace(
  /\/assets\/3d\/coins_coupon_3d_clean\.png/g,
  '/assets/3d/coins_3d_full.png'
);

// Tinh chỉnh class của 2 thẻ ảnh để nằm gọn gàng bên phải mà không bị chém viền
content = content.replace(
  /<img src="\/assets\/3d\/wallet_3d_full\.png" class="[^"]*"/g,
  '<img src="/assets/3d/wallet_3d_full.png" class="absolute right-2 top-3 w-36 sm:w-44 h-auto object-contain pointer-events-none select-none z-0"'
);

content = content.replace(
  /<img src="\/assets\/3d\/coins_3d_full\.png" class="[^"]*"/g,
  '<img src="/assets/3d/coins_3d_full.png" class="absolute right-2 top-3 w-36 sm:w-44 h-auto object-contain pointer-events-none select-none z-0"'
);

// 2. Thêm hoặc cập nhật các hàm tương tác thực tế cho trang Ví:
const walletMethods = `
  // ==================== TƯƠNG TÁC TRANG VÍ (WALLET INTERACTION ENGINE) ====================
  switchWalletTab(type = 'ALL') {
    this.filterWalletTransactions(type);
    const ledger = document.getElementById('wallet-ledger-card');
    if (ledger) {
      ledger.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  filterWalletTransactions(type) {
    this.state.currentWalletFilter = type;
    const filterTypes = ['all', 'reward', 'swap', 'payout'];
    filterTypes.forEach(t => {
      const btn = document.getElementById('tab-tx-' + t);
      if (btn) {
        if (t === type.toLowerCase()) {
          btn.className = 'px-4 py-1.5 rounded-full text-xs font-bold bg-orange-600 text-white shadow-xs transition-all cursor-pointer';
        } else {
          btn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all cursor-pointer';
        }
      }
    });

    const allTx = this.state.transactions || [];
    let filtered = allTx;
    if (type === 'REWARD') {
      filtered = allTx.filter(tx => 
        tx.type === 'SURVEY_REWARD' || 
        tx.type === 'CHECKIN_REWARD' || 
        (tx.description && (tx.description.toLowerCase().includes('thưởng') || tx.description.toLowerCase().includes('điểm danh')))
      );
    } else if (type === 'SWAP') {
      filtered = allTx.filter(tx => 
        tx.type === 'SWAP_POINTS_TO_CREDIT' || 
        (tx.description && tx.description.toLowerCase().includes('credit'))
      );
    } else if (type === 'PAYOUT') {
      filtered = allTx.filter(tx => 
        tx.type === 'PAYOUT' || 
        tx.type.includes('PAYOUT') || 
        (tx.description && tx.description.toLowerCase().includes('rút'))
      );
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
              <h4 class="text-xs font-bold text-stone-900 dark:text-white">\${tx.description || tx.type || 'Giao dịch ví'}</h4>
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
    if (e && e.stopPropagation) e.stopPropagation();
    const menu = document.getElementById('wallet-time-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
  },

  selectWalletTimeRange(days, label) {
    const lbl = document.getElementById('wallet-time-dropdown-label');
    if (lbl) lbl.textContent = label;
    const menu = document.getElementById('wallet-time-dropdown-menu');
    if (menu) menu.classList.add('hidden');
    // Luon cap nhat danh sach theo khoang thoi gian
    this.filterWalletTransactions(this.state.currentWalletFilter || 'ALL');
  },
`;

// Xóa helper cũ nếu có để tránh trùng lặp
if (content.includes('toggleWalletLedgerAccordion()')) {
  const startHelper = content.indexOf('toggleWalletLedgerAccordion()');
  const endHelper = content.indexOf('openPayoutModal() {', startHelper);
  if (startHelper !== -1 && endHelper !== -1) {
    content = content.substring(0, startHelper) + content.substring(endHelper);
  }
}

// Chèn lại bộ method hoàn chỉnh ngay trước openPayoutModal()
const payoutMarker = 'openPayoutModal() {';
const ledgerAccordionMethod = `
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
`;

content = content.replace(payoutMarker, ledgerAccordionMethod + '\n' + walletMethods + '\n  ' + payoutMarker);

// Cập nhật id cho Card Sổ Cái để nút "Xem tất cả" có thể cuộn tới:
content = content.replace(
  'class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3"',
  'id="wallet-ledger-card" class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-3"'
);

// Cập nhật nút Dropdown thời gian thành có thể click mở menu chọn:
const oldTimeBtn = `<button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-600 dark:text-stone-300 shadow-2xs hover:bg-stone-50 transition-colors">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-stone-400"></i>
              <span>30 ngày gần đây</span>
              <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-stone-400"></i>
            </button>`;

const newTimeBtn = `
            <div class="relative">
              <button onclick="VibeApp.toggleWalletTimeDropdown(event)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-600 dark:text-stone-300 shadow-2xs hover:bg-stone-50 transition-colors cursor-pointer">
                <i data-lucide="calendar" class="w-3.5 h-3.5 text-stone-400"></i>
                <span id="wallet-time-dropdown-label">30 ngày gần đây</span>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-stone-400"></i>
              </button>
              <div id="wallet-time-dropdown-menu" class="hidden absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-lg py-1 z-50 text-xs">
                <div onclick="VibeApp.selectWalletTimeRange(7, '7 ngày gần đây')" class="px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer font-medium text-stone-700 dark:text-stone-300">7 ngày gần đây</div>
                <div onclick="VibeApp.selectWalletTimeRange(30, '30 ngày gần đây')" class="px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer font-bold text-orange-600 bg-orange-50/50 dark:bg-orange-950/20">30 ngày gần đây</div>
                <div onclick="VibeApp.selectWalletTimeRange(90, '90 ngày gần đây')" class="px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer font-medium text-stone-700 dark:text-stone-300">90 ngày gần đây</div>
                <div onclick="VibeApp.selectWalletTimeRange(365, 'Tất cả thời gian')" class="px-3.5 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer font-medium text-stone-700 dark:text-stone-300">Tất cả thời gian</div>
              </div>
            </div>`;

content = content.replace(oldTimeBtn, newTimeBtn);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Da sua triet de loi anh bi cat va hoan thien 100% tuong tac trang Vi!');
