const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Thêm nút Báo Lỗi trên Header (cạnh theme-toggle-btn)
const headerTarget = `<!-- Theme Toggle Button (Light/Dark Mode) -->`;
const headerBtnHtml = `<!-- Nút Báo Lỗi / Góp Ý Nhanh -->
          <button id="header-bug-report-btn" onclick="VibeApp.openBugReportModal()" class="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-500 flex items-center justify-center transition-colors active:scale-95 flex-shrink-0" title="Báo lỗi & Góp ý hệ thống">
            <i data-lucide="life-buoy" class="w-4 h-4 stroke-[2]"></i>
          </button>

          <!-- Theme Toggle Button (Light/Dark Mode) -->`;

if (!html.includes('header-bug-report-btn')) {
  html = html.replace(headerTarget, headerBtnHtml);
}

// 2. Thêm liên kết Báo Lỗi trong Footer (Cột 3: Hỗ trợ & Liên hệ)
const footerTarget = `<li>Tổng đài hỗ trợ:`;
const footerLinkHtml = `<li><a href="javascript:void(0)" onclick="VibeApp.openBugReportModal()" class="font-bold text-orange-600 dark:text-orange-500 hover:underline flex items-center gap-1.5"><i data-lucide="life-buoy" class="w-3.5 h-3.5 inline"></i><span>Báo lỗi & Đăng tải sự cố</span></a></li>
            <li>Tổng đài hỗ trợ:`;

if (!html.includes('Báo lỗi & Đăng tải sự cố')) {
  html = html.replace(footerTarget, footerLinkHtml);
}

// 3. Thêm Floating Trigger & Modals trước thẻ </body>
const bodyEndTarget = `<!-- Application Script -->`;
const modalsHtml = `<!-- ==================== FLOATING BUG REPORT TRIGGER ==================== -->
  <div class="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
    <button onclick="VibeApp.openBugReportModal()" class="px-3.5 py-2 bg-stone-900/95 dark:bg-[#1C1C20]/95 hover:bg-orange-600 dark:hover:bg-orange-600 text-stone-200 hover:text-white border border-stone-700/80 dark:border-[#2E2E36] rounded-full shadow-xl backdrop-blur-md text-xs font-bold transition-all active:scale-95 flex items-center gap-2 group cursor-pointer" title="Báo lỗi hoặc góp ý cho VibeSurvey">
      <i data-lucide="life-buoy" class="w-4 h-4 text-orange-500 group-hover:text-white transition-colors"></i>
      <span class="hidden sm:inline">Báo Lỗi</span>
    </button>
  </div>

  <!-- ==================== MODAL BÁO CÁO SỰ CỐ & ĐĂNG TẢI LỖI ==================== -->
  <div id="bug-report-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
    <div class="bg-white dark:bg-[#1C1C20] border border-stone-200 dark:border-[#2E2E36] rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-all animate-fadeIn">
      
      <!-- Modal Header -->
      <div class="p-4 sm:p-5 border-b border-stone-100 dark:border-[#2E2E36] flex items-center justify-between shrink-0 bg-white dark:bg-[#1C1C20]">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-orange-600/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-500 border border-orange-500/30 flex items-center justify-center shrink-0">
            <i data-lucide="life-buoy" class="w-4 h-4"></i>
          </div>
          <div>
            <h3 class="font-extrabold text-sm sm:text-base text-stone-900 dark:text-white">Báo Cáo Sự Cố & Góp Ý</h3>
            <p class="text-[11px] text-stone-500 dark:text-stone-400">Đăng tải thông tin hoặc ảnh chụp màn hình để kỹ thuật viên xử lý</p>
          </div>
        </div>
        <button onclick="VibeApp.closeBugReportModal()" class="w-8 h-8 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 flex items-center justify-center transition-colors">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Modal Navigation Tabs -->
      <div class="flex items-center px-4 sm:px-5 pt-2.5 border-b border-stone-100 dark:border-[#2E2E36] bg-stone-50/70 dark:bg-[#161619] shrink-0 gap-2">
        <button id="bug-tab-btn-create" onclick="VibeApp.switchBugReportTab('create')" class="pb-2.5 px-3 text-xs font-bold border-b-2 border-orange-600 text-orange-600 transition-all flex items-center gap-1.5">
          <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
          <span>Gửi Báo Lỗi Mới</span>
        </button>
        <button id="bug-tab-btn-history" onclick="VibeApp.switchBugReportTab('history')" class="pb-2.5 px-3 text-xs font-medium border-b-2 border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-all flex items-center gap-1.5">
          <i data-lucide="clock" class="w-3.5 h-3.5"></i>
          <span>Lịch Sử Của Tôi</span>
          <span id="bug-history-count-badge" class="hidden px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">0</span>
        </button>
      </div>

      <!-- Modal Body (Dynamic Tab Content) -->
      <div id="bug-modal-body" class="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
        <!-- Render động qua VibeApp.renderBugReportForm() hoặc VibeApp.renderBugReportHistory() -->
      </div>

    </div>
  </div>

  <!-- ==================== MODAL CHI TIẾT BÁO LỖI DÀNH CHO ADMIN ==================== -->
  <div id="admin-bug-detail-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
    <div id="admin-bug-detail-content" class="bg-white dark:bg-[#1C1C20] border border-stone-200 dark:border-[#2E2E36] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-all">
      <!-- Render động qua VibeApp.renderAdminBugDetail() -->
    </div>
  </div>

  <!-- Application Script -->`;

if (!html.includes('bug-report-modal')) {
  html = html.replace(bodyEndTarget, modalsHtml);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully injected bug report UI elements into public/index.html!');
