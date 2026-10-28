const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

// 1. Thêm helper copyValue và dọn dẹp timer trong closeModal
const oldCopyText = `  copyText(text) {
    this.haptic('success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    this.showToast('Đã sao chép mã ưu đãi!', 'success');
  }`;

const newCopyText = `  copyValue(text, label = 'nội dung') {
    this.haptic('success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(String(text));
    }
    this.showToast(\`Đã sao chép \${label}!\`, 'success');
  },

  copyText(text) {
    this.haptic('success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    this.showToast('Đã sao chép mã ưu đãi!', 'success');
  }`;

if (code.includes(oldCopyText)) {
  code = code.replace(oldCopyText, newCopyText);
}

// 2. Dọn dẹp polling khi closeModal
const oldCloseModal = `  closeModal() {
    const container = document.getElementById('modal-container');
    const card = document.getElementById('modal-card');
    if (container) container.classList.add('hidden');
    if (card) {
      card.className = "bg-white dark:bg-[#18181B] text-slate-800 dark:text-stone-100 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-100 dark:border-stone-800 transform transition-all relative";
    }
  },`;

const newCloseModal = `  closeModal() {
    if (this._depositPollInterval) {
      clearInterval(this._depositPollInterval);
      this._depositPollInterval = null;
    }
    if (this._depositTimerInterval) {
      clearInterval(this._depositTimerInterval);
      this._depositTimerInterval = null;
    }
    const container = document.getElementById('modal-container');
    const card = document.getElementById('modal-card');
    if (container) container.classList.add('hidden');
    if (card) {
      card.className = "bg-white dark:bg-[#18181B] text-slate-800 dark:text-stone-100 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-100 dark:border-stone-800 transform transition-all relative";
    }
  },`;

if (code.includes(oldCloseModal)) {
  code = code.replace(oldCloseModal, newCloseModal);
}

// 3. Thay thế submitDepositAction và bổ sung các hàm VietQR
const oldSubmitDepositAction = `  async submitDepositAction() {
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
  },`;

const newVietQrMethods = `  async submitDepositAction() {
    const input = document.getElementById('deposit-amount-input');
    if (!input) return;
    const amount = parseInt(input.value, 10);
    if (isNaN(amount) || amount < 20000) {
      this.showToast('Số tiền nạp tối thiểu là 20.000 VNĐ', 'warning');
      return;
    }

    try {
      this.haptic('light');
      const res = await this.api('/wallet/create-deposit-order', {
        method: 'POST',
        body: JSON.stringify({ amount_vnd: amount })
      });

      if (res.success) {
        this.showVietQrPaymentModal(res);
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  showVietQrPaymentModal(order) {
    if (this._depositPollInterval) clearInterval(this._depositPollInterval);
    if (this._depositTimerInterval) clearInterval(this._depositTimerInterval);

    const bank = order.bankInfo || {};
    let remainingSec = order.expiresInSec || 900;

    this.showModal({
      title: 'Thanh Toán Quét Mã VietQR Napas247',
      content: \`
        <div class="space-y-4 text-left">
          
          <!-- Thanh trạng thái & Bộ đếm -->
          <div class="p-3 bg-orange-50/80 dark:bg-stone-900 rounded-xl border border-orange-200/80 dark:border-stone-800 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span class="font-bold text-stone-900 dark:text-white" id="deposit-status-text">Đang chờ quét mã chuyển khoản...</span>
            </div>
            <div class="font-mono font-bold text-orange-600 dark:text-orange-400 bg-white dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-stone-700 shadow-xs" id="deposit-countdown-timer">
              15:00
            </div>
          </div>

          <!-- Khung QR & Chi tiết chuyển khoản -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            
            <!-- Cột trái: Mã VietQR động -->
            <div class="flex flex-col items-center justify-center p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs text-center">
              <div class="w-48 h-48 sm:w-52 sm:h-52 bg-white p-2 rounded-xl border border-stone-100 dark:border-stone-800 flex items-center justify-center overflow-hidden">
                <img src="\${order.qrUrl}" alt="VietQR Napas247" class="w-full h-full object-contain select-none">
              </div>
              <div class="mt-2 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                Mở ứng dụng ngân hàng bất kỳ để quét mã
              </div>
            </div>

            <!-- Cột phải: Thông tin nhận tiền -->
            <div class="space-y-2 text-xs">
              <div class="p-2.5 bg-stone-50 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800">
                <div class="text-[10px] text-stone-500 dark:text-stone-400">Ngân hàng thụ hưởng:</div>
                <div class="font-bold text-stone-900 dark:text-white text-xs mt-0.5">\${bank.bank_name || 'MBBank (Ngân hàng Quân Đội)'}</div>
              </div>

              <div class="p-2.5 bg-stone-50 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <div class="text-[10px] text-stone-500 dark:text-stone-400">Số tài khoản:</div>
                  <div class="font-mono font-bold text-stone-900 dark:text-white text-sm mt-0.5">\${bank.account_number}</div>
                </div>
                <button type="button" onclick="VibeApp.copyValue('\${bank.account_number}', 'Số tài khoản')" class="px-2.5 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg font-bold border border-stone-200 dark:border-stone-700 text-[11px] transition-all">
                  Sao chép
                </button>
              </div>

              <div class="p-2.5 bg-stone-50 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <div class="text-[10px] text-stone-500 dark:text-stone-400">Chủ tài khoản:</div>
                  <div class="font-bold text-stone-900 dark:text-white text-xs mt-0.5">\${bank.account_name}</div>
                </div>
                <button type="button" onclick="VibeApp.copyValue('\${bank.account_name}', 'Tên chủ tài khoản')" class="px-2.5 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg font-bold border border-stone-200 dark:border-stone-700 text-[11px] transition-all">
                  Sao chép
                </button>
              </div>

              <div class="p-2.5 bg-stone-50 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <div class="text-[10px] text-stone-500 dark:text-stone-400">Số tiền nạp:</div>
                  <div class="font-mono font-bold text-orange-600 dark:text-orange-400 text-sm mt-0.5">\${Number(order.amountVnd).toLocaleString('vi-VN')} VNĐ</div>
                </div>
                <button type="button" onclick="VibeApp.copyValue('\${order.amountVnd}', 'Số tiền')" class="px-2.5 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg font-bold border border-stone-200 dark:border-stone-700 text-[11px] transition-all">
                  Sao chép
                </button>
              </div>

              <div class="p-2.5 bg-orange-50/70 dark:bg-stone-900 rounded-xl border border-orange-200/80 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <div class="text-[10px] text-orange-600 dark:text-orange-400 font-bold">Nội dung chuyển khoản (Memo):</div>
                  <div class="font-mono font-black text-stone-900 dark:text-white text-sm mt-0.5 tracking-wider">\${order.orderCode}</div>
                </div>
                <button type="button" onclick="VibeApp.copyValue('\${order.orderCode}', 'Nội dung chuyển khoản')" class="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all">
                  Sao chép
                </button>
              </div>
            </div>

          </div>

          <!-- Lưu ý quan trọng -->
          <div class="p-2.5 bg-stone-100 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
            Hệ thống ngân hàng tự động đối soát trong 3 giây khi nhận đúng số tiền và mã nội dung <strong>\${order.orderCode}</strong>. Tổng Credit nhận: <strong>\${Number(order.creditAmount).toLocaleString('vi-VN')} Credit</strong>\${order.bonusCreditVnd > 0 ? ' (Đã gồm +' + Number(order.bonusCreditVnd).toLocaleString('vi-VN') + ' Credit thưởng)' : ''}.
          </div>

          <!-- Nút hành động & Giả lập thanh toán -->
          <div class="flex flex-col sm:flex-row gap-2 pt-1">
            <button type="button" onclick="VibeApp.checkDepositStatus('\${order.orderCode}', false)" class="flex-1 py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98]">
              Kiểm Tra Trạng Thái
            </button>
            <button type="button" onclick="VibeApp.simulatePaymentSuccess('\${order.orderCode}')" class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.98]">
              Mô Phỏng Thanh Toán (Dev/Test)
            </button>
            <button type="button" onclick="VibeApp.closeModal()" class="py-2.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold transition-all active:scale-[0.98]">
              Đóng
            </button>
          </div>

        </div>
      \`
    });

    // Khoi chay bo dem nguoc 15:00
    this._depositTimerInterval = setInterval(() => {
      remainingSec--;
      const min = Math.floor(remainingSec / 60);
      const sec = remainingSec % 60;
      const timerEl = document.getElementById('deposit-countdown-timer');
      if (timerEl) {
        timerEl.textContent = \`\${String(min).padStart(2, '0')}:\${String(sec).padStart(2, '0')}\`;
      }
      if (remainingSec <= 0) {
        clearInterval(this._depositTimerInterval);
        clearInterval(this._depositPollInterval);
        const statusEl = document.getElementById('deposit-status-text');
        if (statusEl) statusEl.textContent = 'Đơn nạp đã hết hạn thanh toán';
      }
    }, 1000);

    // Khoi chay Polling tu dong kiem tra trang thai don nap moi 2.5 giay
    this._depositPollInterval = setInterval(() => {
      this.checkDepositStatus(order.orderCode, true);
    }, 2500);
  },

  async checkDepositStatus(orderCode, isSilent = false) {
    try {
      const res = await this.api(\`/wallet/deposit-orders/\${orderCode}\`);
      if (res && res.success && res.order) {
        const order = res.order;
        if (order.status === 'COMPLETED') {
          if (this._depositPollInterval) clearInterval(this._depositPollInterval);
          if (this._depositTimerInterval) clearInterval(this._depositTimerInterval);

          this.haptic('success');
          if (this.state.currentUser) {
            this.state.currentUser.credit_balance = (this.state.currentUser.credit_balance || 0) + (order.creditAmount || order.credit_amount || order.amount_vnd);
          }
          this.applyUserInterface();

          // Cap nhat modal sang man hinh Chuc mung
          this.showModal({
            title: 'Nạp Tiền Thành Công',
            content: \`
              <div class="space-y-4 text-center py-2">
                <div class="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <i data-lucide="check" class="w-7 h-7 stroke-[2.5]"></i>
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-stone-900 dark:text-white">Giao Dịch Đã Hoàn Tất</h3>
                  <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Đơn nạp mã <strong>\${orderCode}</strong> đã được hệ thống ghi nhận thành công.</p>
                </div>

                <div class="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-1.5 text-left max-w-sm mx-auto">
                  <div class="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Số tiền nạp:</span>
                    <span class="font-mono font-bold text-stone-900 dark:text-white">\${Number(order.amount_vnd).toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                  <div class="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Credit được cộng:</span>
                    <span class="font-mono font-extrabold text-orange-600 dark:text-orange-400">+\${Number(order.credit_amount || order.amount_vnd).toLocaleString('vi-VN')} Credit</span>
                  </div>
                </div>

                <div class="pt-2">
                  <button type="button" onclick="VibeApp.closeModal(); VibeApp.navigateTo('wallet');" class="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]">
                    Xem Số Dư Ví & Tiếp Tục
                  </button>
                </div>
              </div>
            \`
          });
          return;
        } else if (order.status === 'EXPIRED') {
          if (this._depositPollInterval) clearInterval(this._depositPollInterval);
          if (this._depositTimerInterval) clearInterval(this._depositTimerInterval);
          const statusEl = document.getElementById('deposit-status-text');
          if (statusEl) statusEl.textContent = 'Đơn nạp đã hết hạn thanh toán';
          if (!isSilent) this.showToast('Đơn nạp này đã hết hạn', 'warning');
          return;
        }
      }

      if (!isSilent) {
        this.showToast('Đang chờ đối soát tiền vào tài khoản...', 'info');
      }
    } catch (err) {
      if (!isSilent) this.showToast(err.message, 'error');
    }
  },

  async simulatePaymentSuccess(orderCode) {
    try {
      this.haptic('light');
      const res = await this.api('/wallet/simulate-payment-success', {
        method: 'POST',
        body: JSON.stringify({ order_code: orderCode })
      });

      if (res.success) {
        this.showToast('Đã mô phỏng thanh toán ngân hàng thành công!', 'success');
        await this.checkDepositStatus(orderCode, false);
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },`;

if (code.includes(oldSubmitDepositAction)) {
  code = code.replace(oldSubmitDepositAction, newVietQrMethods);
}

// 4. Cập nhật submitPayoutAction để hiển thị mã thẻ cào ngay lập tức khi Auto-Payout thành công
const oldSubmitPayoutAction = `    try {
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
    }`;

const newSubmitPayoutAction = `    try {
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
        if (this.state.currentUser && res.newPointBalance !== undefined) {
          this.state.currentUser.point_balance = res.newPointBalance;
        }

        // Neu duoc Auto-Payout cap ma the cao ngay lap tuc
        if (res.isAutoPayout && res.cardDetails) {
          const card = res.cardDetails;
          this.showModal({
            title: 'Cấp Thẻ Cào Thành Công (Auto-Payout)',
            content: \`
              <div class="space-y-4 text-left">
                <div class="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div class="font-bold flex items-center gap-1.5">
                    <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
                    <span>Tự động phê duyệt & cấp mã thẻ tức thì</span>
                  </div>
                  <p class="text-[11px] leading-relaxed">
                    Tài khoản của bạn đạt điểm uy tín cao. Thẻ cào điện thoại đã được hệ thống kích hoạt thành công.
                  </p>
                </div>

                <div class="p-3.5 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5 text-xs">
                  <div class="flex justify-between items-center pb-2 border-b border-stone-200/80 dark:border-stone-800">
                    <span class="text-stone-500 dark:text-stone-400">Nhà mạng:</span>
                    <span class="font-extrabold text-stone-900 dark:text-white uppercase tracking-wider">\${card.telco}</span>
                  </div>
                  <div class="flex justify-between items-center pb-2 border-b border-stone-200/80 dark:border-stone-800">
                    <span class="text-stone-500 dark:text-stone-400">Mệnh giá thẻ:</span>
                    <span class="font-mono font-extrabold text-orange-600 dark:text-orange-400">\${Number(card.card_value_vnd).toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                  <div class="p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div>
                      <div class="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Mã nạp (PIN):</div>
                      <div class="font-mono font-black text-sm text-stone-900 dark:text-white tracking-widest select-all">\${card.card_code}</div>
                    </div>
                    <button type="button" onclick="VibeApp.copyValue('\${card.card_code}', 'Mã nạp thẻ')" class="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all">
                      Sao chép
                    </button>
                  </div>
                  <div class="p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                    <div>
                      <div class="text-[10px] text-stone-500 dark:text-stone-400 font-medium">Số Seri:</div>
                      <div class="font-mono font-bold text-xs text-stone-700 dark:text-stone-300 select-all">\${card.card_serial}</div>
                    </div>
                    <button type="button" onclick="VibeApp.copyValue('\${card.card_serial}', 'Số seri')" class="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 text-stone-700 dark:text-stone-200 rounded-lg font-bold text-[11px] transition-all">
                      Sao chép
                    </button>
                  </div>
                  <div class="text-[10px] text-stone-400 font-medium">
                    Hạn sử dụng: \${card.expiry_date || 'Không thời hạn'}
                  </div>
                </div>

                <div class="flex gap-2 pt-1">
                  <a href="tel:*100*\${card.card_code}%23" class="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-center rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5">
                    <i data-lucide="phone-call" class="w-3.5 h-3.5"></i>
                    <span>Nạp Ngay (*100*MÃ#)</span>
                  </a>
                  <button type="button" onclick="VibeApp.closeModal(); VibeApp.navigateTo('wallet');" class="py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold transition-all">
                    Đóng
                  </button>
                </div>
              </div>
            \`
          });
        } else {
          this.closeModal();
          this.showToast(res.message || 'Yêu cầu đổi thưởng đã được tiếp nhận thành công', 'success');
        }

        const appRoot = document.getElementById('app-root');
        if (appRoot) await this.renderWalletView(appRoot);
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }`;

if (code.includes(oldSubmitPayoutAction)) {
  code = code.replace(oldSubmitPayoutAction, newSubmitPayoutAction);
}

// 5. Cập nhật renderWalletView để nạp thêm danh sách Payout Requests
const oldWalletFetch = `    const res = await this.api('/wallet');
    const wallet = res.wallet;
    const transactions = res.transactions || [];
    this.state.wallet = wallet;
    this.state.transactions = transactions;`;

const newWalletFetch = `    const [res, payoutsRes] = await Promise.all([
      this.api('/wallet'),
      this.api('/wallet/payouts').catch(() => ({ payouts: [] }))
    ]);
    const wallet = res.wallet;
    const transactions = res.transactions || [];
    const payouts = (payoutsRes && payoutsRes.payouts) || [];
    this.state.wallet = wallet;
    this.state.transactions = transactions;
    this.state.payouts = payouts;`;

if (code.includes(oldWalletFetch)) {
  code = code.replace(oldWalletFetch, newWalletFetch);
}

// 6. Thêm bảng Lịch Sử Đổi Thưởng & Rút Tiền vào renderWalletView
const oldWalletTableEnd = `        <!-- Transaction Table -->
        <div class="bento-card p-6 space-y-4 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-extrabold text-stone-900 dark:text-stone-100">Nhật Ký Biến Động Sổ Cái Kép</h3>
            <span class="text-xs text-stone-400 font-mono font-semibold">\${transactions.length} giao dịch gần nhất</span>
          </div>`;

const newWalletTableWithPayouts = `        <!-- Payout Requests Table -->
        <div class="bento-card p-6 space-y-4 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-extrabold text-stone-900 dark:text-white">Lịch Sử Yêu Cầu Đổi Thưởng & Rút Tiền</h3>
            <span class="text-xs text-stone-400 font-mono font-semibold">\${payouts.length} yêu cầu</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-stone-50 dark:bg-stone-900 text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider border-b border-stone-100 dark:border-stone-800">
                <tr>
                  <th class="py-3 px-3.5 rounded-l-xl">Thời gian</th>
                  <th class="py-3 px-3.5">Mệnh giá</th>
                  <th class="py-3 px-3.5">Phương thức</th>
                  <th class="py-3 px-3.5">Trạng thái</th>
                  <th class="py-3 px-3.5 rounded-r-xl">Chi tiết nhận</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 dark:divide-stone-800/60">
                \${payouts.length === 0 ? \`
                  <tr><td colspan="5" class="py-6 text-center text-stone-400">Chưa có yêu cầu rút tiền nào.</td></tr>
                \` : payouts.map(p => {
                  let info = {};
                  try { info = JSON.parse(p.recipient_info_json || '{}'); } catch (e) {}

                  let statusBadge = '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">Đang chờ duyệt</span>';
                  if (p.status === 'COMPLETED') {
                    statusBadge = '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">Đã hoàn tất</span>';
                  } else if (p.status === 'REJECTED') {
                    statusBadge = '<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">Từ chối</span>';
                  }

                  let detailsHtml = '';
                  if (p.payout_method === 'PHONE_CARD') {
                    if (p.status === 'COMPLETED' && info.card_code) {
                      detailsHtml = \`
                        <div class="space-y-1">
                          <div class="font-mono font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                            <span>Mã PIN: \${info.card_code}</span>
                            <button type="button" onclick="VibeApp.copyValue('\${info.card_code}', 'Mã thẻ')" class="text-orange-600 hover:underline text-[10px] font-bold">Chép</button>
                          </div>
                          <div class="text-[10px] text-stone-500 font-mono">Seri: \${info.card_serial || 'N/A'} - \${info.telco || 'Thẻ'}</div>
                        </div>
                      \`;
                    } else {
                      detailsHtml = \`<span class="text-stone-600 dark:text-stone-300">\${info.telco || 'Thẻ cào'} - SĐT: \${info.phone_number || ''}</span>\`;
                    }
                  } else if (p.payout_method === 'BANK_TRANSFER') {
                    detailsHtml = \`<div class="font-mono text-stone-900 dark:text-white font-medium">\${info.bank_name || ''} - \${info.account_number || ''} <span class="text-[10px] text-stone-500 font-sans">(\${info.account_name || ''})</span></div>\`;
                  } else {
                    detailsHtml = \`<div class="font-mono text-stone-900 dark:text-white font-medium">\${info.bank_name || 'MoMo'} - \${info.account_number || ''}</div>\`;
                  }

                  return \`
                    <tr class="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors">
                      <td class="py-3 px-3.5 text-stone-500 dark:text-stone-400 font-mono">\${new Date(p.created_at).toLocaleDateString('vi-VN')}</td>
                      <td class="py-3 px-3.5 font-mono font-bold text-stone-900 dark:text-white">\${Number(p.fiat_amount_vnd || (p.points_amount * 1)).toLocaleString('vi-VN')} đ</td>
                      <td class="py-3 px-3.5 font-bold text-stone-700 dark:text-stone-300 text-[11px]">\${p.payout_method === 'PHONE_CARD' ? 'Thẻ cào' : (p.payout_method === 'BANK_TRANSFER' ? 'Ngân hàng' : 'Ví MoMo')}</td>
                      <td class="py-3 px-3.5">\${statusBadge}</td>
                      <td class="py-3 px-3.5">\${detailsHtml}</td>
                    </tr>
                  \`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Transaction Table -->
        <div class="bento-card p-6 space-y-4 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-extrabold text-stone-900 dark:text-stone-100">Nhật Ký Biến Động Sổ Cái Kép</h3>
            <span class="text-xs text-stone-400 font-mono font-semibold">\${transactions.length} giao dịch gần nhất</span>
          </div>`;

if (code.includes(oldWalletTableEnd)) {
  code = code.replace(oldWalletTableEnd, newWalletTableWithPayouts);
}

fs.writeFileSync(appJsPath, code, 'utf8');
console.log('Successfully updated public/app.js with VietQR and Auto-Payout UI');
