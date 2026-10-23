const fs = require('fs');

console.log('--- Cập nhật Auth Tabs Dark Mode & Sửa lỗi co giãn Role Selection ---');
let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Cập nhật Auth Tabs Switcher (HTML ban đầu)
const oldAuthTabs = `<div class="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5">
          <button id="auth-tab-btn-login" onclick="VibeApp.switchAuthTab('login')" class="flex-1 py-2 text-xs font-extrabold rounded-xl transition-all \${initialTab === 'login' ? 'bg-white dark:bg-[#131B2E] text-blue-600 dark:text-sky-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'}">
            Đăng Nhập
          </button>
          <button id="auth-tab-btn-register" onclick="VibeApp.switchAuthTab('register')" class="flex-1 py-2 text-xs font-extrabold rounded-xl transition-all \${initialTab === 'register' ? 'bg-white dark:bg-[#131B2E] text-blue-600 dark:text-sky-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'}">
            Đăng Ký Tài Khoản
          </button>
        </div>`;

const newAuthTabs = `<div class="flex items-center p-1 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl mb-5">
          <button id="auth-tab-btn-login" onclick="VibeApp.switchAuthTab('login')" class="flex-1 py-2 text-xs font-extrabold rounded-xl transition-all \${initialTab === 'login' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-slate-600/80' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'}">
            Đăng Nhập
          </button>
          <button id="auth-tab-btn-register" onclick="VibeApp.switchAuthTab('register')" class="flex-1 py-2 text-xs font-extrabold rounded-xl transition-all \${initialTab === 'register' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-slate-600/80' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'}">
            Đăng Ký Tài Khoản
          </button>
        </div>`;

if (app.includes(oldAuthTabs)) {
  app = app.replace(oldAuthTabs, newAuthTabs);
  console.log('✅ Đã cập nhật Auth Tabs HTML với khung viền rõ nét trong Dark Mode');
}

// 2. Cập nhật hàm switchAuthTab để đổi class tab rõ nét trong Dark Mode
const oldSwitchAuthClass = `    if (tab === 'login') {
      loginBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all bg-white dark:bg-[#131B2E] text-blue-600 dark:text-sky-400 shadow-xs';
      regBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900';
    } else {
      regBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all bg-white dark:bg-[#131B2E] text-blue-600 dark:text-sky-400 shadow-xs';
      loginBtn.className = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900';
    }`;

const newSwitchAuthClass = `    const activeTabCls = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-300 shadow-xs border border-slate-200/60 dark:border-slate-600/80';
    const inactiveTabCls = 'flex-1 py-2 text-xs font-extrabold rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent';

    if (tab === 'login') {
      loginBtn.className = activeTabCls;
      regBtn.className = inactiveTabCls;
    } else {
      regBtn.className = activeTabCls;
      loginBtn.className = inactiveTabCls;
    }`;

if (app.includes(oldSwitchAuthClass)) {
  app = app.replace(oldSwitchAuthClass, newSwitchAuthClass);
  console.log('✅ Đã cập nhật hàm switchAuthTab với khung viền rõ nét trong Dark Mode');
}

// 3. Cập nhật HTML phần Diện tài khoản: dùng border-2 và p-2.5 cố định, có id cho title
const oldRoleHtml = `<div class="grid grid-cols-2 gap-2">
                  <label class="relative flex flex-col p-2.5 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer transition-all role-select-card" id="role-card-respondent">
                    <input type="radio" name="auth-reg-role" value="RESPONDENT" checked class="sr-only" onchange="VibeApp.selectRegisterRole('RESPONDENT')">
                    <span class="text-xs font-bold text-blue-700 dark:text-sky-300 flex items-center gap-1.5">
                      <i data-lucide="user-check" class="w-3.5 h-3.5"></i> Cá Nhân
                    </span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Làm khảo sát nhận thưởng</span>
                  </label>
                  <label class="relative flex flex-col p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 cursor-pointer transition-all role-select-card" id="role-card-creator">
                    <input type="radio" name="auth-reg-role" value="CREATOR" class="sr-only" onchange="VibeApp.selectRegisterRole('CREATOR')">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <i data-lucide="building-2" class="w-3.5 h-3.5"></i> Doanh Nghiệp
                    </span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Tạo & nghiên cứu khảo sát</span>
                  </label>
                </div>`;

const newRoleHtml = `<div class="grid grid-cols-2 gap-2.5">
                  <label class="relative flex flex-col p-2.5 rounded-xl border-2 border-blue-500 dark:border-sky-400 bg-blue-50/60 dark:bg-blue-950/40 cursor-pointer transition-all role-select-card" id="role-card-respondent">
                    <input type="radio" name="auth-reg-role" value="RESPONDENT" checked class="sr-only" onchange="VibeApp.selectRegisterRole('RESPONDENT')">
                    <span class="text-xs font-bold text-blue-700 dark:text-sky-300 flex items-center gap-1.5" id="role-title-respondent">
                      <i data-lucide="user-check" class="w-3.5 h-3.5"></i> Cá Nhân
                    </span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Làm khảo sát nhận thưởng</span>
                  </label>
                  <label class="relative flex flex-col p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-800/40 cursor-pointer transition-all role-select-card" id="role-card-creator">
                    <input type="radio" name="auth-reg-role" value="CREATOR" class="sr-only" onchange="VibeApp.selectRegisterRole('CREATOR')">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5" id="role-title-creator">
                      <i data-lucide="building-2" class="w-3.5 h-3.5"></i> Doanh Nghiệp
                    </span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Tạo & nghiên cứu khảo sát</span>
                  </label>
                </div>`;

if (app.includes(oldRoleHtml)) {
  app = app.replace(oldRoleHtml, newRoleHtml);
  console.log('✅ Đã cập nhật HTML Diện tài khoản: dùng border-2 và gap-2.5 chống co giãn');
}

// 4. Cập nhật hàm selectRegisterRole: dùng class cố định không đổi padding
const oldSelectRoleFn = `  selectRegisterRole(role) {
    const cardResp = document.getElementById('role-card-respondent');
    const cardCreator = document.getElementById('role-card-creator');
    if (!cardResp || !cardCreator) return;
    if (role === 'RESPONDENT') {
      cardResp.className = 'relative flex flex-col p-3 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer transition-all role-select-card';
      cardCreator.className = 'relative flex flex-col p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 cursor-pointer transition-all role-select-card';
    } else {
      cardCreator.className = 'relative flex flex-col p-3 rounded-xl border border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer transition-all role-select-card';
      cardResp.className = 'relative flex flex-col p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 cursor-pointer transition-all role-select-card';
    }
  },`;

const newSelectRoleFn = `  selectRegisterRole(role) {
    const cardResp = document.getElementById('role-card-respondent');
    const cardCreator = document.getElementById('role-card-creator');
    const titleResp = document.getElementById('role-title-respondent');
    const titleCreator = document.getElementById('role-title-creator');
    if (!cardResp || !cardCreator) return;

    const activeCardClass = 'relative flex flex-col p-2.5 rounded-xl border-2 border-blue-500 dark:border-sky-400 bg-blue-50/60 dark:bg-blue-950/40 cursor-pointer transition-all role-select-card';
    const inactiveCardClass = 'relative flex flex-col p-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-800/40 cursor-pointer transition-all role-select-card';

    if (role === 'RESPONDENT') {
      cardResp.className = activeCardClass;
      cardCreator.className = inactiveCardClass;
      if (titleResp) titleResp.className = 'text-xs font-bold text-blue-700 dark:text-sky-300 flex items-center gap-1.5';
      if (titleCreator) titleCreator.className = 'text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5';
    } else {
      cardCreator.className = activeCardClass;
      cardResp.className = inactiveCardClass;
      if (titleCreator) titleCreator.className = 'text-xs font-bold text-blue-700 dark:text-sky-300 flex items-center gap-1.5';
      if (titleResp) titleResp.className = 'text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5';
    }
    if (window.lucide) window.lucide.createIcons();
  },`;

if (app.includes(oldSelectRoleFn)) {
  app = app.replace(oldSelectRoleFn, newSelectRoleFn);
  console.log('✅ Đã cập nhật selectRegisterRole: kích thước cố định tuyệt đối, không co giãn khi click!');
}

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('🎉 Hoàn tất cập nhật!');
