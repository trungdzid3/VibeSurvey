const fs = require('fs');

console.log('--- Bắt đầu áp dụng bản vá cho public/app.js ---');
let content = fs.readFileSync('public/app.js', 'utf8');

// 1. Thêm phương thức getLucideSvg vào VibeApp (đặt trước escapeHtml)
if (!content.includes('getLucideSvg(name, cls')) {
  const escapeIdx = content.indexOf('escapeHtml(str) {');
  if (escapeIdx === -1) {
    console.error('Không tìm thấy escapeHtml!');
    process.exit(1);
  }

  const svgHelper = `  getLucideSvg(name, cls = 'w-4 h-4') {
    const icons = {
      'wallet': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-8 8H6a2 2 0 0 1-2-2V5"/><path d="M18 12h.01"/></svg>\`,
      'coins': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>\`,
      'gift': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>\`,
      'refresh-cw': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>\`,
      'credit-card': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>\`,
      'clipboard-list': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>\`,
      'arrow-up-right': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>\`,
      'check': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>\`,
      'clock': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>\`,
      'history': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><polyline points="12 7 12 12 15 15"/></svg>\`,
      'calendar': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>\`,
      'chevron-down': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>\`,
      'chevron-right': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>\`,
      'arrow-right': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>\`,
      'plus': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>\`,
      'info': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>\`,
      'star': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>\`,
      'flag': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>\`,
      'home': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>\`,
      'book-open': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>\`,
      'check-circle-2': \`<svg xmlns="http://www.w3.org/2000/svg" class="\${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>\`
    };
    return icons[name] || \`<i data-lucide="\${name}" class="\${cls}"></i>\`;
  },

`;
  content = content.substring(0, escapeIdx) + svgHelper + content.substring(escapeIdx);
  console.log('1. Đã thêm getLucideSvg vào VibeApp!');
}

// 2. Chuyển đổi toàn bộ thẻ <img> 3D sang SVG mới
content = content.replace(
  /\/assets\/3d\/gift_box_3d_master\.png/g,
  '/assets/3d/gift_box_3d_master.svg'
);
content = content.replace(
  /\/assets\/3d\/empty_state_3d_master\.png/g,
  '/assets/3d/empty_state_3d_master.svg'
);
content = content.replace(
  /\/assets\/3d\/wallet_3d_master\.png/g,
  '/assets/3d/wallet_3d_master.svg'
);
content = content.replace(
  /\/assets\/3d\/coins_coupon_3d_master\.png/g,
  '/assets/3d/coins_coupon_3d_master.svg'
);
console.log('2. Đã thay thế toàn bộ ảnh 3D PNG sang SVG mới!');

// 3. Cập nhật renderTransactionRowHtml để sử dụng inline SVG
const startTx = content.indexOf('renderTransactionRowHtml(tx) {');
const endTx = content.indexOf('renderWalletTransactionList(txList)');
if (startTx !== -1 && endTx !== -1) {
  const oldRenderTxRow = content.substring(startTx, endTx);

  const newRenderTxRow = `renderTransactionRowHtml(tx) {
    if (!tx) return '';
    const isPositive = Number(tx.amount || 0) > 0;
    const isPoint = (tx.currency || 'POINT').toUpperCase() === 'POINT';
    const amountVal = Math.abs(Number(tx.amount || 0));
    const prefix = isPositive ? '+' : '-';
    const amtStr = prefix + amountVal.toLocaleString('vi-VN') + (isPoint ? ' Point' : ' Credit');

    const typeUpper = (tx.type || '').toUpperCase();
    const rawDesc = tx.description || tx.type || 'Giao dịch ví';
    const normDesc = rawDesc.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();

    let iconName = 'arrow-up-right';
    let iconWrapCls = 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300';
    let title = this.escapeHtml(rawDesc);
    let subInfo = \`\${tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : '30/10/2026'} · Mã #\${tx.id || 'TXN'}\`;
    let amountCls = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-700 dark:text-stone-300';
    let statusBadge = \`
      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        \${this.getLucideSvg('check', 'w-3 h-3 stroke-[2.5]')} Thành công
      </span>
    \`;

    // Nhận diện phân loại thông minh (hỗ trợ cả có dấu và không dấu tiếng Việt)
    if (typeUpper.includes('CHECKIN') || normDesc.includes('diem danh') || normDesc.includes('streak')) {
      iconName = 'gift';
      iconWrapCls = 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400';
      title = tx.description || 'Thưởng điểm danh';
      subInfo = \`\${tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : '30/10/2026'} · Điểm danh ngày \${tx.streak_day || 1}\`;
      amountCls = 'text-emerald-600 dark:text-emerald-400';
      statusBadge = \`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          \${this.getLucideSvg('check', 'w-3 h-3 stroke-[2.5]')} Thành công
        </span>
      \`;
    } else if (typeUpper.includes('SWAP') || normDesc.includes('doi credit') || normDesc.includes('doi point') || normDesc.includes('swap') || normDesc.includes('chuyen doi')) {
      iconName = 'refresh-cw';
      iconWrapCls = 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400';
      title = tx.description || 'Đổi Point sang Credit';
      subInfo = \`\${tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : '28/10/2026'} · Tỷ lệ 1:10\`;
      amountCls = 'text-emerald-600 dark:text-emerald-400';
      statusBadge = \`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          \${this.getLucideSvg('check', 'w-3 h-3 stroke-[2.5]')} Hoàn tất
        </span>
      \`;
    } else if (typeUpper.includes('DEPOSIT') || normDesc.includes('nap tien') || normDesc.includes('vietqr') || normDesc.includes('nap credit') || normDesc.includes('topup') || normDesc.includes('quy')) {
      iconName = 'coins';
      iconWrapCls = 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400';
      title = tx.description || 'Nạp Credit vào quỹ';
      subInfo = \`\${tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : '30/10/2026'} · Chuyển khoản QR\`;
      amountCls = 'text-emerald-600 dark:text-emerald-400';
      statusBadge = \`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          \${this.getLucideSvg('check', 'w-3 h-3 stroke-[2.5]')} Thành công
        </span>
      \`;
    } else if (typeUpper.includes('SURVEY') || normDesc.includes('khao sat') || normDesc.includes('survey')) {
      iconName = 'clipboard-list';
      iconWrapCls = 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400';
      title = tx.description || 'Thưởng hoàn thành khảo sát';
      subInfo = \`\${tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : '30/10/2026'} · Khảo sát chuẩn\`;
      amountCls = 'text-emerald-600 dark:text-emerald-400';
      statusBadge = \`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          \${this.getLucideSvg('check', 'w-3 h-3 stroke-[2.5]')} Thành công
        </span>
      \`;
    } else if (typeUpper.includes('PAYOUT') || typeUpper.includes('WITHDRAW') || normDesc.includes('rut tien') || normDesc.includes('doi thuong') || normDesc.includes('the cao')) {
      iconName = 'credit-card';
      iconWrapCls = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400';
      title = tx.description || 'Rút tiền về tài khoản';
      subInfo = \`\${tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : '29/10/2026'} · Đổi thưởng thẻ cào\`;
      amountCls = 'text-red-600 dark:text-red-400';
      const statusUpper = (tx.status || '').toUpperCase();
      if (statusUpper === 'PENDING' || statusUpper === 'PROCESSING') {
        statusBadge = \`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            \${this.getLucideSvg('clock', 'w-3 h-3 stroke-[2.5]')} Chờ xử lý
          </span>
        \`;
      } else {
        statusBadge = \`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            \${this.getLucideSvg('check', 'w-3 h-3 stroke-[2.5]')} Thành công
          </span>
        \`;
      }
    } else if (normDesc.includes('thuong') || normDesc.includes('bonus') || normDesc.includes('vip')) {
      iconName = 'gift';
      iconWrapCls = 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400';
      title = tx.description || 'Thưởng khuyến mại';
      subInfo = \`\${tx.created_at ? new Date(tx.created_at).toLocaleDateString('vi-VN') : '30/10/2026'} · Thưởng nạp quỹ\`;
      amountCls = 'text-emerald-600 dark:text-emerald-400';
      statusBadge = \`
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          \${this.getLucideSvg('check', 'w-3 h-3 stroke-[2.5]')} Thành công
        </span>
      \`;
    }

    return \`
      <div class="flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors shadow-2xs">
        <!-- Cột 1: Icon phân loại trong khung rounded-2xl -->
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl \${iconWrapCls} flex items-center justify-center shrink-0 shadow-2xs">
          \${this.getLucideSvg(iconName, 'w-5 h-5 stroke-[2]')}
        </div>

        <!-- Cột 2: Tiêu đề + ngày giờ/mã ghi chú -->
        <div class="flex-1 min-w-0 pr-2">
          <h4 class="font-bold text-stone-800 dark:text-white text-xs sm:text-sm truncate">\${title}</h4>
          <p class="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">\${subInfo}</p>
        </div>

        <!-- Cột 3: Số tiền (căn phải, độ rộng cố định, luôn thẳng hàng) -->
        <div class="text-right w-28 sm:w-36 font-bold text-xs sm:text-sm font-mono shrink-0 \${amountCls}">
          \${amtStr}
        </div>

        <!-- Cột 4: Badge trạng thái (căn phải, độ rộng cố định, luôn thẳng hàng) -->
        <div class="w-24 sm:w-28 flex justify-end shrink-0">
          \${statusBadge}
        </div>
      </div>
    \`;
  },

  `;

  content = content.replace(oldRenderTxRow, newRenderTxRow);
  console.log('3. Đã cập nhật renderTransactionRowHtml!');
}

// 4. Cập nhật các icon trong renderWalletView sang getLucideSvg
content = content.replace(
  '<i data-lucide="wallet" class="w-5 h-5 stroke-[2.2]"></i>',
  '${this.getLucideSvg("wallet", "w-5 h-5 stroke-[2.2]")}'
);
content = content.replace(
  '<i data-lucide="home" class="w-3.5 h-3.5"></i>',
  '${this.getLucideSvg("home", "w-3.5 h-3.5")}'
);
content = content.replace(
  '<i data-lucide="star" class="w-3.5 h-3.5 fill-white text-white"></i>',
  '${this.getLucideSvg("star", "w-3.5 h-3.5 fill-white text-white")}'
);
content = content.replace(
  '<i data-lucide="flag" class="w-3.5 h-3.5 stroke-[2.2]"></i>',
  '${this.getLucideSvg("flag", "w-3.5 h-3.5 stroke-[2.2]")}'
);
content = content.replace(
  '<i data-lucide="gift" class="w-4 h-4"></i>\n                <span>Đổi thưởng / Rút tiền</span>\n                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>',
  '${this.getLucideSvg("gift", "w-4 h-4")}\n                <span>Đổi thưởng / Rút tiền</span>\n                ${this.getLucideSvg("chevron-right", "w-3.5 h-3.5")}'
);
content = content.replace(
  '<i data-lucide="coins" class="w-4 h-4"></i>',
  '${this.getLucideSvg("coins", "w-4 h-4")}'
);
content = content.replace(
  '<i data-lucide="info" class="w-3.5 h-3.5 text-stone-400 shrink-0"></i>',
  '${this.getLucideSvg("info", "w-3.5 h-3.5 text-stone-400 shrink-0")}'
);
content = content.replace(
  '<i data-lucide="plus" class="w-4 h-4 stroke-[2.5]"></i>\n                <span>Nạp Credit</span>',
  '${this.getLucideSvg("plus", "w-4 h-4 stroke-[2.5]")}\n                <span>Nạp Credit</span>'
);
content = content.replace(
  '<i data-lucide="history" class="w-5 h-5 text-orange-500 stroke-[2.2]"></i>',
  '${this.getLucideSvg("history", "w-5 h-5 text-orange-500 stroke-[2.2]")}'
);
content = content.replace(
  '<span>Xem tất cả</span>\n              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>',
  '<span>Xem tất cả</span>\n              ${this.getLucideSvg("arrow-right", "w-3.5 h-3.5")}'
);
content = content.replace(
  '<i data-lucide="calendar" class="w-3.5 h-3.5 text-stone-400"></i>',
  '${this.getLucideSvg("calendar", "w-3.5 h-3.5 text-stone-400")}'
);
content = content.replace(
  '<i data-lucide="chevron-down" class="dropdown-trigger-icon w-3.5 h-3.5 text-stone-400 pointer-events-none"></i>',
  '${this.getLucideSvg("chevron-down", "dropdown-trigger-icon w-3.5 h-3.5 text-stone-400 pointer-events-none")}'
);
content = content.replace(
  '<i data-lucide="book-open" class="w-3.5 h-3.5 stroke-[2.2]"></i>',
  '${this.getLucideSvg("book-open", "w-3.5 h-3.5 stroke-[2.2]")}'
);
content = content.replace(
  '<i data-lucide="check-circle-2" class="w-3 h-3 stroke-[2.5]"></i> Minh bạch',
  '${this.getLucideSvg("check-circle-2", "w-3 h-3 stroke-[2.5]")} Minh bạch'
);
console.log('4. Đã cập nhật các icon trang Ví sang inline SVG!');

// Ghi đè lại file
fs.writeFileSync('public/app.js', content, 'utf8');
console.log('--- HOÀN TẤT CẬP NHẬT public/app.js ---');
