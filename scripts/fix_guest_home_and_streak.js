const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. Sửa currentTab mặc định trong state từ 'surveys' thành 'home'
appJs = appJs.replace(
  /currentTab:\s*['"]surveys['"],/,
  "currentTab: 'home',"
);

// 2. Sửa init() để khi chưa đăng nhập, mặc định luôn là 'home'
appJs = appJs.replace(
  /if \(!this\.state\.token && \(!savedTab \|\| savedTab === 'surveys'\)\) \{\s*savedTab = 'home';\s*\}/,
  `if (!this.state.token && (!savedTab || savedTab === 'surveys')) {\n      savedTab = 'home';\n    }\n    if (!this.state.token) {\n      this.state.currentTab = savedTab || 'home';\n    }`
);

// 3. Sửa applyGuestInterface() để khi là khách vãng lai, chuyển thẳng về 'home'
appJs = appJs.replace(
  /if \(!this\.state\.currentTab \|\| \['creator-surveys', 'wallet', 'admin-overview', 'admin-payouts', 'admin-fraud', 'profile'\]\.includes\(this\.state\.currentTab\)\) \{\s*this\.state\.currentTab = 'home';\s*\}\s*this\.navigate\(this\.state\.currentTab\);/,
  `// Đối với khách chưa đăng nhập, trang mặc định luôn là Trang Chủ Mở Đầu (home) thay thế hoàn toàn màn hình khảo sát cũ
    if (!this.state.currentTab || this.state.currentTab === 'surveys' || ['creator-surveys', 'wallet', 'admin-overview', 'admin-payouts', 'admin-fraud', 'profile'].includes(this.state.currentTab)) {
      this.state.currentTab = 'home';
    }
    this.renderNavigation();
    this.navigate(this.state.currentTab);`
);

// 4. Sửa renderNavigation() cho !user (khách): Thêm tab 'home' (Trang Chủ) đứng đầu tiên
const oldGuestTabs = `    if (!user) {
      tabs = [
        { id: 'surveys', label: 'Khảo Sát', icon: 'compass' },
        { id: 'forum', label: 'Diễn Đàn', icon: 'messages-square' },
        { id: 'create-survey', label: 'Tạo Khảo Sát', icon: 'plus-circle' },
        { id: 'voucher-market', label: 'Chợ Voucher', icon: 'gift' }
      ];
    }`;

const newGuestTabs = `    if (!user) {
      tabs = [
        { id: 'home', label: 'Trang Chủ', icon: 'home' },
        { id: 'surveys', label: 'Khảo Sát', icon: 'compass' },
        { id: 'forum', label: 'Diễn Đàn', icon: 'messages-square' },
        { id: 'create-survey', label: 'Tạo Khảo Sát', icon: 'plus-circle' },
        { id: 'voucher-market', label: 'Chợ Voucher', icon: 'gift' }
      ];
    }`;

if (appJs.includes(oldGuestTabs)) {
  appJs = appJs.replace(oldGuestTabs, newGuestTabs);
} else {
  // Regex fallback cho khoảng trắng hoặc xuống dòng CRLF
  appJs = appJs.replace(
    /if \(!user\) \{\s*tabs = \[\s*\{\s*id:\s*['"]surveys['"],\s*label:\s*['"]Khảo Sát['"],\s*icon:\s*['"]compass['"]\s*\},/,
    `if (!user) {\n      tabs = [\n        { id: 'home', label: 'Trang Chủ', icon: 'home' },\n        { id: 'surveys', label: 'Khảo Sát', icon: 'compass' },`
  );
}

// 5. Sửa Router navigate(tabId): Tách biệt case 'home' và case 'surveys'
appJs = appJs.replace(
  /case 'surveys':\s*case 'home':\s*await this\.renderSurveysView\(root\);\s*break;/,
  `case 'home':
          await this.renderHomeView(root);
          break;
        case 'surveys':
          await this.renderSurveysView(root);
          break;`
);

// 6. Xóa bỏ 2 thẻ banner khách cũ trong renderSurveysView (CỘNG ĐỒNG KHẢO SÁT & ƯU ĐÃI THÀNH VIÊN MỚI)
// Thay vào đó nếu khách vào tab khảo sát thì chỉ hiển thị bộ lọc khảo sát sạch sẽ, không còn 2 thẻ to gây bức xúc
const oldGuestCardsPattern = /<!-- KHÁCH VÃNG LAI: 2 THẺ KÊU GỌI ĐĂNG NHẬP & NHẬN THƯỞNG -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*`\s*\)/;

// Kiểm tra hàm updateStreakHeaderUI để cập nhật ngọn lửa phong cách TikTok
const oldStreakUIPattern = /updateStreakHeaderUI\(streak\) \{[\s\S]*?if \(window\.lucide\) lucide\.createIcons\(\);\s*\}/;

const newStreakUI = `updateStreakHeaderUI(streak) {
    const streakBtn = document.getElementById('header-streak-btn');
    const streakText = document.getElementById('header-streak-text');
    const streakFlame = document.getElementById('header-streak-flame');
    const streakDot = document.getElementById('header-streak-dot');
    if (!streakBtn || !streakText) return;

    if (!this.state.currentUser) {
      streakBtn.classList.add('hidden');
      streakBtn.classList.remove('flex');
      return;
    }

    streakBtn.classList.remove('hidden');
    streakBtn.classList.add('flex');

    const streakCount = streak ? (streak.current_streak || 0) : 0;
    const hasCheckedIn = streak ? streak.has_checked_in_today : false;

    // Luôn ẩn hoàn toàn chấm đỏ nhấp nháy theo chỉ đạo của người dùng
    if (streakDot) {
      streakDot.classList.add('hidden');
      streakDot.style.display = 'none';
    }

    streakText.textContent = streakCount;

    // PHONG CÁCH TIKTOK STREAK:
    // - Khi CHƯA điểm danh: Màu xám bạc trung tính, ngọn lửa nét mỏng màu xám, số xám, không có chấm đỏ.
    // - Khi ĐÃ điểm danh: Bừng sáng ngọn lửa rực rỡ màu cam/đỏ TikTok (lửa tô màu, viền gradient sáng, số cam lửa đậm nét).
    if (hasCheckedIn) {
      // ĐÃ ĐIỂM DANH HÔM NAY: Ngọn lửa TikTok bừng sáng rực rỡ
      streakBtn.className = 'h-8 flex items-center gap-1.5 px-2.5 rounded-full border border-orange-400/80 dark:border-orange-500/80 bg-gradient-to-r from-orange-500/10 via-rose-500/10 to-amber-500/10 dark:from-orange-950/40 dark:to-rose-950/40 text-orange-600 dark:text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.2)] hover:shadow-[0_0_16px_rgba(249,115,22,0.3)] transition-all active:scale-95 flex-shrink-0 cursor-pointer select-none text-xs font-mono font-black';
      if (streakFlame) {
        streakFlame.className = 'relative flex items-center justify-center text-orange-600 dark:text-orange-400';
        streakFlame.innerHTML = \`<i data-lucide="flame" class="w-4 h-4 fill-orange-500 text-rose-500 stroke-orange-600 drop-shadow-xs"></i>\`;
      }
      streakBtn.title = \`Đã điểm danh hôm nay! Chuỗi: \${streakCount} ngày liên tiếp\`;
    } else {
      // CHƯA ĐIỂM DANH: Màu xám trung tính nhẹ nhàng, không gây khó chịu
      streakBtn.className = 'h-8 flex items-center gap-1.5 px-2.5 rounded-full border border-stone-200 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-800/60 text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700 transition-all active:scale-95 flex-shrink-0 cursor-pointer select-none text-xs font-mono font-bold';
      if (streakFlame) {
        streakFlame.className = 'relative flex items-center justify-center text-stone-400 dark:text-stone-500';
        streakFlame.innerHTML = \`<i data-lucide="flame" class="w-3.5 h-3.5 stroke-[2]"></i>\`;
      }
      streakBtn.title = streakCount > 0 
        ? \`Chuỗi: \${streakCount} ngày (Chưa điểm danh hôm nay - Bấm để giữ chuỗi)\`
        : 'Điểm danh hàng ngày (Bấm để nhận 50 điểm)';
    }

    if (window.lucide) lucide.createIcons();
  }`;

if (oldStreakUIPattern.test(appJs)) {
  appJs = appJs.replace(oldStreakUIPattern, newStreakUI);
  console.log('Da cap nhat updateStreakHeaderUI sang phong cach TikTok');
} else {
  console.warn('Khong tim thay oldStreakUIPattern!');
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Da ghi thanh cong public/app.js');
