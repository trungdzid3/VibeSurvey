const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

const startToken = '<!-- ==================== BENTO GRID 2 CỘT: TIẾN ĐỘ & ĐIỂM DANH / THỐNG KÊ ==================== -->';
const startIdx = content.indexOf(startToken);
if (startIdx === -1) {
  console.error('Lỗi: Không tìm thấy startToken trong public/app.js');
  process.exit(1);
}

const endMarker = '<!-- ==================== THANH CÔNG CỤ LỌC TINH GỌN (PHẲNG, ÍT KHUNG) ==================== -->';
const endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error('Lỗi: Không tìm thấy endMarker trong public/app.js');
  process.exit(1);
}

// Khối code Bento Grid MỚI - ĐẲNG CẤP FINTECH & SAAS HIỆN ĐẠI
const replacementBento = `<!-- ==================== BENTO GRID 2 CỘT: TIẾN ĐỘ & ĐIỂM DANH / THỐNG KÊ ==================== -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
          \${user ? (this.isEnterpriseUser() ? \`
            <!-- CỘT 1 (DOANH NGHIỆP): SỐ DƯ CREDIT & QUẢN LÝ KÝ QUỸ -->
            <div class="bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full transition-all">
              <div>
                <!-- Header -->
                <div class="flex items-center justify-between pb-2.5 border-b border-stone-100 dark:border-stone-800/80">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <i data-lucide="wallet" class="w-4 h-4 stroke-[2.2]"></i>
                    </div>
                    <div>
                      <span class="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Quỹ Khảo Sát Doanh Nghiệp</span>
                      <span class="text-xs font-bold text-stone-900 dark:text-white truncate block">Doanh nghiệp: \${user.name || 'Enterprise'}</span>
                    </div>
                  </div>
                  <a href="javascript:void(0)" onclick="VibeApp.navigate('wallet')" class="text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1 transition-colors pt-0.5">
                    <span>Chi Tiết Ví</span>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                  </a>
                </div>

                <!-- Số dư lớn (KPI Hero) -->
                <div class="my-3">
                  <div class="text-[11px] text-stone-400 dark:text-stone-500 font-medium">Số dư Credit khả dụng:</div>
                  <div class="flex items-baseline gap-1.5 mt-0.5">
                    <span class="text-2xl sm:text-3xl font-black font-mono text-stone-900 dark:text-white">\${Number(user.credit_balance || 0).toLocaleString('vi-VN')}</span>
                    <span class="text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">Credit</span>
                    <span class="text-[11px] text-stone-400 dark:text-stone-500 font-medium">(1 Credit = 1đ)</span>
                  </div>
                </div>
              </div>

              <!-- Action Footer -->
              <div class="pt-2.5 flex items-center justify-between gap-3 border-t border-stone-100 dark:border-stone-800/80">
                <span class="text-[11px] text-stone-500 dark:text-stone-400">Ký quỹ Escrow tự động khi xuất bản</span>
                <button onclick="VibeApp.openDepositModal()" class="h-8.5 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Nạp Quỹ Ngay</span>
                </button>
              </div>
            </div>

            <!-- CỘT 2 (DOANH NGHIỆP): TĂNG TỐC THU MẪU & VÉ HỎA TỐC -->
            <div class="bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full transition-all">
              <div>
                <!-- Header -->
                <div class="flex items-center justify-between pb-2.5 border-b border-stone-100 dark:border-stone-800/80">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <i data-lucide="rocket" class="w-4 h-4 stroke-[2.2]"></i>
                    </div>
                    <div>
                      <span class="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Tăng Tốc Thu Thập Mẫu</span>
                      <span class="text-xs font-bold text-stone-900 dark:text-white block">Ưu tiên phân phối hỏa tốc</span>
                    </div>
                  </div>
                  <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
                    \${Number(user.fast_track_tickets || 0)} Vé Hỏa Tốc
                  </span>
                </div>

                <!-- Thống kê nhanh / Chỉ số thu mẫu -->
                <div class="my-3 space-y-1">
                  <div class="text-[11px] text-stone-400 dark:text-stone-500 font-medium">Dịch vụ ghim khảo sát Top 1:</div>
                  <p class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Sử dụng vé Hỏa Tốc để gắn nhãn [Thưởng Cao] và ghim bài khảo sát lên đầu trang, thu mẫu nhanh gấp 3 lần.
                  </p>
                </div>
              </div>

              <!-- Action Footer -->
              <div class="pt-2.5 flex items-center gap-2 border-t border-stone-100 dark:border-stone-800/80">
                <button onclick="VibeApp.navigate('create-survey')" class="flex-1 h-8.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer">
                  <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                  <span>Tạo Khảo Sát Mới</span>
                </button>
                <button onclick="VibeApp.navigate('creator-surveys')" class="h-8.5 px-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer">
                  <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i>
                  <span>Xem Báo Cáo</span>
                </button>
              </div>
            </div>
          \` : \`
            <!-- CỘT 1 (NGƯỜI ĐIỀN KHẢO SÁT): SỐ DƯ TÍCH LŨY & TIẾN ĐỘ ĐỔI THƯỞNG -->
            <div class="bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full transition-all">
              <div>
                <!-- Header: Icon Ví & Nhãn & Link Ví -->
                <div class="flex items-center justify-between pb-2.5 border-b border-stone-100 dark:border-stone-800/80">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <i data-lucide="wallet" class="w-4 h-4 stroke-[2.2]"></i>
                    </div>
                    <div>
                      <span class="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Số Dư Tích Lũy</span>
                      <span class="text-xs font-bold text-stone-900 dark:text-white truncate block">Chào \${user.name.split(' ').pop()}</span>
                    </div>
                  </div>
                  <a href="javascript:void(0)" onclick="VibeApp.navigate('wallet')" class="text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1 transition-colors pt-0.5">
                    <span>Ví & Rút</span>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                  </a>
                </div>

                <!-- Hero KPI: Số dư to rõ nét -->
                <div class="my-3">
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl sm:text-3xl font-black font-mono text-stone-900 dark:text-white tracking-tight">\${curVnd.toLocaleString('vi-VN')}đ</span>
                    <span class="text-xs font-bold text-stone-500 dark:text-stone-400 font-mono">(\${curPoints.toLocaleString('vi-VN')} Point)</span>
                  </div>
                </div>
              </div>

              <!-- Thanh đo tiến độ đổi thưởng 10K / 50K tinh tế -->
              <div class="pt-2 space-y-1.5 border-t border-stone-100 dark:border-stone-800/80">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-[11px] font-bold text-stone-700 dark:text-stone-300">Tiến độ: \${targetPayoutLabel}</span>
                  <span class="font-mono font-black text-orange-600 dark:text-orange-500 text-xs">\${goalPercent}%</span>
                </div>
                <div class="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div class="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500" style="width: \${Math.max(2, goalPercent)}%"></div>
                </div>
                <div class="flex items-center justify-between text-[10.5px] text-stone-400 dark:text-stone-500 font-medium">
                  <span>\${curVnd >= targetPayoutVnd ? '<strong class=\"text-emerald-600 dark:text-emerald-400 font-bold\">Đủ điều kiện đổi ngay!</strong>' : \`Cần thêm \${(targetPayoutVnd - curVnd).toLocaleString('vi-VN')}đ\`}</span>
                  <span class="font-mono">Mốc \${targetPayoutVnd.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>

            <!-- CỘT 2 (NGƯỜI ĐIỀN KHẢO SÁT): CHUỖI ĐIỂM DANH 7 NGÀY (TRỰC QUAN ROADMAP) -->
            <div class="bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full transition-all">
              <div>
                <!-- Header: Icon Ngọn Lửa & Badge trạng thái hoặc Nút Điểm Danh Ngay -->
                <div class="flex items-center justify-between pb-2.5 border-b border-stone-100 dark:border-stone-800/80">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 cursor-pointer" onclick="VibeApp.openStreakModal()" title="Xem chi tiết lộ trình điểm danh">
                      <i data-lucide="flame" class="w-4 h-4 stroke-[2.2]"></i>
                    </div>
                    <div>
                      <span class="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Chuỗi Điểm Danh</span>
                      <span class="text-xs font-bold text-stone-900 dark:text-white block">Tích lũy thưởng mỗi ngày</span>
                    </div>
                  </div>

                  <div>
                    \${this.state.streakInfo && this.state.streakInfo.has_checked_in_today ? \`
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                        <i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i> Đã nhận hôm nay
                      </span>
                    \` : \`
                      <button onclick="VibeApp.performCheckin()" class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer">
                        <i data-lucide="zap" class="w-3 h-3"></i>
                        <span>Điểm Danh Ngay</span>
                      </button>
                    \`}
                  </div>
                </div>

                <!-- Hero KPI: Số ngày chuỗi liên tục -->
                <div class="my-3 flex items-baseline justify-between">
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-2xl sm:text-3xl font-black font-mono text-stone-900 dark:text-white tracking-tight">\${(this.state.streakInfo && this.state.streakInfo.current_streak) || 0}</span>
                    <span class="text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">Ngày Liên Tục</span>
                  </div>
                  <button onclick="VibeApp.openStreakModal()" class="text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-orange-600 flex items-center gap-0.5 transition-colors">
                    <span>Lộ trình</span>
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>

              <!-- Visual 7-Day Mini Track (Dải 7 ngày tương tác trực quan) -->
              <div class="pt-2 border-t border-stone-100 dark:border-stone-800/80">
                <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
                  \${(() => {
                    const strk = this.state.streakInfo || {};
                    const curS = Number(strk.current_streak || 0);
                    const checkedToday = !!strk.has_checked_in_today;
                    const rList = (strk.roadmap && strk.roadmap.length === 7) ? strk.roadmap : [1,2,3,4,5,6,7].map(d => ({
                      day: d,
                      points: d === 7 ? 300 : (d * 30 + 20),
                      status: checkedToday ? (d <= curS ? 'CLAIMED' : 'LOCKED') : (d < curS ? 'CLAIMED' : (d === curS ? 'TODAY' : 'LOCKED')),
                      is_milestone: d === 7
                    }));

                    return rList.map(item => \`
                      <div onclick="VibeApp.openStreakModal()" 
                           title="Ngày \${item.day}: +\${item.points} Điểm (\${item.status === 'CLAIMED' ? 'Đã nhận' : (item.status === 'TODAY' ? 'Nhận hôm nay' : 'Đang khóa')})"
                           class="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer \${
                             item.status === 'CLAIMED'
                               ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/80 text-orange-600 dark:text-orange-400 font-bold'
                               : (item.status === 'TODAY'
                                 ? 'bg-orange-600 text-white font-black shadow-xs ring-2 ring-orange-500/30'
                                 : 'bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 text-stone-400 dark:text-stone-500')
                           }">
                        <span class="text-[9px] uppercase tracking-wider block font-semibold leading-none">T\${item.day}</span>
                        <div class="mt-1 flex items-center justify-center h-3.5">
                          \${item.status === 'CLAIMED'
                            ? '<i data-lucide="check" class="w-3 h-3 stroke-[2.5]"></i>'
                            : (item.is_milestone
                              ? '<i data-lucide="gift" class="w-3 h-3"></i>'
                              : \`<span class="text-[9.5px] font-mono font-bold leading-none">+\${item.points}</span>\`)}
                        </div>
                      </div>
                    \`).join('');
                  })()}
                </div>
              </div>
            </div>
          \`) : \`
            <!-- KHÁCH VÃNG LAI: 2 THẺ KÊU GỌI ĐĂNG NHẬP & NHẬN THƯỞNG -->
            <div class="bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full transition-all">
              <div>
                <div class="flex items-center justify-between pb-2.5 border-b border-stone-100 dark:border-stone-800/80">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <i data-lucide="compass" class="w-4 h-4 stroke-[2.2]"></i>
                    </div>
                    <div>
                      <span class="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Cộng Đồng Khảo Sát</span>
                      <span class="text-xs font-bold text-stone-900 dark:text-white block">Khám phá và kiếm thu nhập</span>
                    </div>
                  </div>
                </div>

                <div class="my-3">
                  <div class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Đăng nhập để tham gia làm bài khảo sát, nhận thù lao từ 10.000đ đến 50.000đ quy đổi tiền mặt hoặc thẻ cào.
                  </div>
                </div>
              </div>

              <div class="pt-2.5 flex items-center gap-2 border-t border-stone-100 dark:border-stone-800/80">
                <button onclick="VibeApp.openAuthModal('login')" class="flex-1 h-8.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-300 transition-colors text-center cursor-pointer">
                  Đăng Nhập
                </button>
                <button onclick="VibeApp.openAuthModal('register')" class="flex-1 h-8.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 text-center cursor-pointer">
                  Đăng Ký
                </button>
              </div>
            </div>

            <div class="bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full transition-all">
              <div>
                <div class="flex items-center justify-between pb-2.5 border-b border-stone-100 dark:border-stone-800/80">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <i data-lucide="gift" class="w-4 h-4 stroke-[2.2]"></i>
                    </div>
                    <div>
                      <span class="text-[10.5px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Ưu Đãi Thành Viên Mới</span>
                      <span class="text-xs font-bold text-stone-900 dark:text-white block">Tặng 50 Điểm Thưởng Đầu Tay</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                    +50 Điểm
                  </span>
                </div>

                <div class="my-3">
                  <div class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Kích hoạt tài khoản mới và hoàn thành bài khảo sát đầu tiên để nhận ngay vé rút tiền ưu đãi và điểm thưởng tích lũy.
                  </div>
                </div>
              </div>

              <div class="pt-2.5 flex items-center border-t border-stone-100 dark:border-stone-800/80">
                <button onclick="VibeApp.openAuthModal('register')" class="w-full h-8.5 px-3 rounded-xl bg-stone-900 hover:bg-black dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5 text-orange-500"></i>
                  <span>Nhận Quà Chào Mừng</span>
                </button>
              </div>
            </div>
          \`}
        </div>

        `;

const newContent = content.substring(0, startIdx) + replacementBento + content.substring(endIdx);
fs.writeFileSync(appJsPath, newContent, 'utf8');
console.log('Thành công: Đã tái thiết kế Bento Grid trong public/app.js!');
