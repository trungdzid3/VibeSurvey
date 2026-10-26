const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'app.js');
let c = fs.readFileSync(file, 'utf8');

const targetOld = `  // ==================== MODAL: ĐỔI ĐIỂM SANG CREDIT ====================
  openSwapPointsModal() {
    this.haptic('light');
    const user = this.state.currentUser;
    const currentPoints = user ? user.point_balance : 0;

    this.showModal({
      title: 'Đổi Điểm Sang Credit Tạo Form',
      content: \`
        <div class="space-y-4 text-left">
          <p class="text-xs text-slate-500 leading-relaxed">Tỷ lệ quy đổi: <strong>1 Điểm = 7 VNĐ Credit</strong> (Chiết khấu sàn 30%). Số điểm tối thiểu: 1,000 điểm.</p>
          
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Số điểm muốn đổi:</label>
            <input type="number" id="swap-points-input" value="1000" min="1000" max="\${currentPoints}" step="500" 
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
      \`
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
        this.showToast(\`Đổi thành công \${pts.toLocaleString()} điểm sang Credit!\`, 'success');
        if (this.state.currentUser) {
          this.state.currentUser.point_balance = res.newPointBalance;
          this.state.currentUser.credit_balance = res.newCreditBalance;
        }
        this.applyUserInterface();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },`;

const replacementNew = `  // ==================== MODAL: ĐỔI ĐIỂM SANG CREDIT (1:1 VNĐ + 5% THƯỞNG) ====================
  openSwapPointsModal() {
    this.haptic('light');
    const user = this.state.currentUser;
    const currentPoints = user ? (user.point_balance || 0) : 0;
    const defaultPoints = Math.min(Math.max(1000, currentPoints), 1000);
    const initialCredit = Math.floor(defaultPoints * 1.05);

    this.showModal({
      title: 'Đổi Điểm Sang Credit Tạo Form (+5% Thưởng)',
      content: \`
        <div class="space-y-4 text-left">
          <div class="p-3 bg-orange-50 dark:bg-stone-900/80 rounded-xl border border-orange-200/80 dark:border-stone-800 text-xs space-y-1">
            <div class="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
              <span>Tỷ giá quy đổi:</span>
              <span class="text-orange-600 dark:text-orange-400 font-mono font-bold">1 Điểm = 1 VNĐ Credit</span>
            </div>
            <p class="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
              Tặng thêm <strong>+5% Thưởng Tái Đầu Tư</strong> khi đổi Điểm sang Credit tạo khảo sát (Ví dụ: Đổi 1.000 Điểm nhận ngay <strong>1.050 VNĐ Credit</strong>).
            </p>
          </div>
          
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="text-xs font-bold text-stone-700 dark:text-stone-300">Số điểm muốn đổi:</label>
              <span class="text-[11px] text-stone-500 font-mono">Khả dụng: \${currentPoints.toLocaleString()} Điểm</span>
            </div>
            <input type="number" id="swap-points-input" value="\${defaultPoints}" min="1000" max="\${currentPoints}" step="500" 
                   oninput="VibeApp.updateSwapPointsPreview()"
                   class="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-orange-500">
          </div>

          <!-- Preview Real-time -->
          <div class="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs flex justify-between items-center">
            <span class="text-stone-600 dark:text-stone-400 font-medium">Credit thực nhận (+5%):</span>
            <span id="swap-credit-preview" class="font-mono font-bold text-orange-600 dark:text-orange-400 text-sm">\${initialCredit.toLocaleString('vi-VN')} VNĐ</span>
          </div>

          <div class="flex gap-2.5 pt-2">
            <button onclick="VibeApp.submitSwapPoints()" class="flex-1 py-3 bg-stone-900 hover:bg-stone-800 dark:bg-orange-600 dark:hover:bg-orange-500 text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95">
              Xác Nhận Đổi Điểm
            </button>
            <button onclick="VibeApp.closeModal()" class="py-3 px-5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-2xl text-xs font-bold">
              Hủy
            </button>
          </div>
        </div>
      \`
    });
  },

  updateSwapPointsPreview() {
    const input = document.getElementById('swap-points-input');
    const preview = document.getElementById('swap-credit-preview');
    if (!input || !preview) return;
    const pts = parseInt(input.value, 10) || 0;
    const credit = Math.floor(pts * 1.05);
    preview.textContent = \`\${credit.toLocaleString('vi-VN')} VNĐ\`;
  },

  async submitSwapPoints() {
    const pts = parseInt(document.getElementById('swap-points-input').value, 10);
    if (isNaN(pts) || pts < 1000) {
      this.showToast('Số điểm tối thiểu để đổi là 1.000 điểm', 'warning');
      return;
    }

    const user = this.state.currentUser;
    if (user && (user.point_balance || 0) < pts) {
      this.showToast(\`Số dư không đủ. Bạn chỉ có \${(user.point_balance || 0).toLocaleString()} điểm\`, 'warning');
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
        const addedVnd = res.creditAddedVnd || Math.floor(pts * 1.05);
        this.showToast(\`Đổi thành công \${pts.toLocaleString()} điểm sang \${addedVnd.toLocaleString('vi-VN')} VNĐ Credit (+5% thưởng)!\`, 'success');
        if (this.state.currentUser) {
          this.state.currentUser.point_balance = res.newPointBalance;
          this.state.currentUser.credit_balance = res.newCreditBalance;
        }
        this.applyUserInterface();
        if (this.state.activeTab === 'wallet') {
          await this.renderWalletView(document.getElementById('app-root'));
        }
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },`;

// Chuẩn hóa CRLF / LF để so khớp
const normOld = targetOld.replace(/\r\n/g, '\n');
const normC = c.replace(/\r\n/g, '\n');

if (normC.includes(normOld)) {
  const updated = normC.replace(normOld, replacementNew.replace(/\r\n/g, '\n'));
  fs.writeFileSync(file, updated, 'utf8');
  console.log('Đã cập nhật modal đổi điểm sang credit thành công!');
} else {
  console.error('Không tìm thấy targetOld trong app.js');
  process.exit(1);
}
