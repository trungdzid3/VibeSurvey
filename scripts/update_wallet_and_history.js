const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

// 1. Cập nhật renderTransactionRowHtml
const newRenderTx = `  renderTransactionRowHtml(tx) {
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
        <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
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
          <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
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
          <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Hoàn tất
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
          <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
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
          <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
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
            <i data-lucide="clock" class="w-3 h-3 stroke-[2.5]"></i> Chờ xử lý
          </span>
        \`;
      } else {
        statusBadge = \`
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
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
          <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Thành công
        </span>
      \`;
    }

    return \`
      <div class="flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors shadow-2xs">
        <!-- Cột 1: Icon phân loại trong khung rounded-2xl -->
        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl \${iconWrapCls} flex items-center justify-center shrink-0 shadow-2xs">
          <i data-lucide="\${iconName}" class="w-5 h-5 stroke-[2]"></i>
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
  },`;

const startMarker = '  renderTransactionRowHtml(tx) {';
const endMarker = '  renderWalletTransactionList(txList) {';
const sIdx = content.indexOf(startMarker);
const eIdx = content.indexOf(endMarker);

if (sIdx !== -1 && eIdx !== -1) {
  content = content.substring(0, sIdx) + newRenderTx + '\n\n' + content.substring(eIdx);
  console.log('Successfully replaced renderTransactionRowHtml');
} else {
  console.error('Marker not found for renderTransactionRowHtml');
}

// 2. Cập nhật thẻ Point để chiếc ví to hơn:
content = content.replace(
  '<img src="/assets/3d/wallet_3d_master.png" class="absolute right-1 sm:right-2 top-2 sm:top-3 w-44 sm:w-52 h-auto object-contain pointer-events-none select-none z-0 drop-shadow-md" alt="3D Orange Wallet" />',
  '<img src="/assets/3d/wallet_3d_master.png" class="absolute -right-1 sm:right-0 -top-1 sm:top-0 w-52 sm:w-64 h-auto object-contain pointer-events-none select-none z-0 drop-shadow-md" alt="3D Orange Wallet" />'
);

// 3. Cập nhật thẻ Credit để coin & voucher to đẹp:
content = content.replace(
  '<img src="/assets/3d/coins_coupon_3d_master.png" class="absolute right-1 sm:right-2 top-2 sm:top-3 w-44 sm:w-52 h-auto object-contain pointer-events-none select-none z-0" alt="3D Coins and Coupon" />',
  '<img src="/assets/3d/coins_coupon_3d_master.png" class="absolute right-0 sm:right-2 top-1 sm:top-2 w-48 sm:w-60 h-auto object-contain pointer-events-none select-none z-0" alt="3D Coins and Coupon" />'
);

fs.writeFileSync('public/app.js', content, 'utf8');
console.log('public/app.js updated successfully.');
