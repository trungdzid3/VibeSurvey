const fs = require('fs');
const path = require('path');

// 1. Cập nhật nền trang web và đốm gradient Stitch trong index.html
const indexHtmlPath = path.join(__dirname, '../public/index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// Thay đổi class body nền F8F9FA thành FFF8F5 (màu nền surface Stitch)
indexHtml = indexHtml.replace(
  /<body class="bg-\[#F8F9FA\] dark:bg-\[#121214\]/,
  '<body class="bg-[#FFF8F5] dark:bg-[#121214]'
);

// Thêm các ambient gradient glow của Stitch vào ngay sau thẻ <body> nếu chưa có
const stitchGlows = `  <!-- ==================== STITCH AMBIENT ATMOSPHERIC GLOWS ==================== -->
  <div class="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-gradient-to-tr from-[#EA580C]/10 via-[#F97316]/10 to-transparent rounded-full blur-3xl opacity-70 -z-10 dark:opacity-0 transition-opacity"></div>
  <div class="pointer-events-none fixed top-1/3 -right-32 w-[480px] h-[480px] bg-amber-400/10 rounded-full blur-3xl opacity-60 -z-10 dark:opacity-0 transition-opacity"></div>
  <div class="pointer-events-none fixed bottom-10 -left-20 w-[420px] h-[420px] bg-orange-300/15 rounded-full blur-3xl opacity-60 -z-10 dark:opacity-0 transition-opacity"></div>
`;

if (!indexHtml.includes('STITCH AMBIENT ATMOSPHERIC GLOWS')) {
  indexHtml = indexHtml.replace(
    /(<body class="[^"]*">)/,
    `$1\n${stitchGlows}`
  );
}

fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
console.log('Đã cập nhật nền Stitch #FFF8F5 và ambient glow cho index.html');

// 2. Cập nhật thẻ mẫu tương tác và xử lý nút demo trong public/app.js
const appJsPath = path.join(__dirname, '../public/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Sửa thẻ mẫu tương tác: bỏ "Xu", dùng "Điểm", nút dẫn sang đăng ký/đăng nhập
appJs = appJs.replace(
  /<span class="px-2\.5 py-0\.5 rounded-full bg-orange-100 dark:bg-orange-950\/60 text-\[11px\] font-bold text-orange-600 dark:text-orange-400">\+120 Xu \(~25\.000đ\)<\/span>/,
  '<span class="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[11px] font-bold text-orange-600 dark:text-orange-400 font-mono">+1.500 Điểm (~15.000đ)</span>'
);

// Sửa nút gửi câu trả lời demo
const oldDemoBtn = `<button id="submit-preview-btn" onclick="VibeApp.submitHomeSampleAnswer(this)" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer" type="button">
                    Gửi câu trả lời
                  </button>`;

const newDemoBtn = `<button id="submit-preview-btn" onclick="VibeApp.submitHomeSampleAnswer(this)" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer" type="button">
                    <span>Đăng Ký Làm Khảo Sát Thật</span>
                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                  </button>`;

if (appJs.includes(oldDemoBtn)) {
  appJs = appJs.replace(oldDemoBtn, newDemoBtn);
} else {
  // Regex fallback
  appJs = appJs.replace(
    /<button id="submit-preview-btn" onclick="VibeApp\.submitHomeSampleAnswer\(this\)"[^>]*>[\s\S]*?<\/button>/,
    newDemoBtn
  );
}

// Sửa hàm submitHomeSampleAnswer để mở Modal Đăng Ký / Đăng Nhập
const oldSubmitFunc = `  submitHomeSampleAnswer(btn) {
    this.haptic('medium');
    if (!btn) return;
    btn.textContent = 'Đã ghi nhận (+120 Xu)';
    btn.className = 'px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs pointer-events-none';
    this.showToast('Bạn đã thử nghiệm thành công khảo sát mẫu! Tham gia khảo sát thật để cộng xu vào ví.', 'success');
  },`;

const newSubmitFunc = `  submitHomeSampleAnswer(btn) {
    this.haptic('medium');
    if (!this.state.currentUser) {
      this.showToast('Đây là câu hỏi khảo sát mô phỏng trải nghiệm. Vui lòng đăng ký hoặc đăng nhập để làm bài khảo sát thật và nhận điểm thưởng!', 'info');
      this.openAuthModal('register');
    } else {
      this.showToast('Chuyển đến danh sách bài khảo sát thật trên hệ thống!', 'info');
      this.navigate('surveys');
    }
  },`;

if (appJs.includes(oldSubmitFunc)) {
  appJs = appJs.replace(oldSubmitFunc, newSubmitFunc);
} else {
  appJs = appJs.replace(
    /submitHomeSampleAnswer\(btn\) \{[\s\S]*?this\.showToast\([^)]*\);\s*\},/,
    newSubmitFunc
  );
}

// Thêm hàm handleOpenSurveyFromHome nếu chưa có
if (!appJs.includes('handleOpenSurveyFromHome(surveyId)')) {
  const insertBefore = '  selectHomeSampleOption(labelEl) {';
  const openSurveyFunc = `  handleOpenSurveyFromHome(surveyId) {
    this.haptic('light');
    if (!this.state.currentUser) {
      this.showToast('Vui lòng đăng nhập để bắt đầu làm bài khảo sát này và nhận thưởng!', 'info');
      this.openAuthModal('login');
      return;
    }
    this.navigate('take-survey', { surveyId });
  },

  selectHomeSampleOption(labelEl) {`;
  appJs = appJs.replace(insertBefore, openSurveyFunc);
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Đã cập nhật thành công thẻ demo và nút hành động trong public/app.js');
