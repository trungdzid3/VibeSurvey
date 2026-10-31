const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'app.js');
let content = fs.readFileSync(appPath, 'utf8');

console.log('Đang đọc public/app.js (Dung lượng:', content.length, 'bytes)');

// 1. Cập nhật RestrictionEngine ở đầu file (trước window.VibeApp)
const restrictionEngineFullCode = `// ==============================================================
// RESTRICTION & VALIDATION ENGINE (CHUẨN MICROSOFT / GOOGLE FORMS)
// ==============================================================
const RestrictionEngine = {
  getMeta(restriction) {
    if (!restriction || !restriction.type || restriction.type === 'NONE') {
      return { placeholder: '', defaultError: '', validate: () => ({ valid: true }) };
    }

    const type = String(restriction.type).toUpperCase();
    if (type === 'EMAIL') {
      const msg = 'Vui lòng nhập địa chỉ email hợp lệ (vd: name@example.com)';
      return {
        placeholder: 'Vui lòng nhập email',
        defaultError: msg,
        validate: (val) => {
          if (!val || String(val).trim() === '') return { valid: true };
          const isValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(val).trim());
          return { valid: isValid, error: isValid ? '' : msg };
        }
      };
    }

    if (type === 'NUMBER') {
      const rule = String(restriction.rule || 'IS_NUMBER').toUpperCase();
      const min = (restriction.min !== undefined && restriction.min !== null && String(restriction.min).trim() !== '') ? parseFloat(restriction.min) : 20000000;
      const max = (restriction.max !== undefined && restriction.max !== null && String(restriction.max).trim() !== '') ? parseFloat(restriction.max) : 20270000;

      if (rule === 'BETWEEN') {
        const msg = \`Số phải nằm trong khoảng từ \${min} đến \${max}\`;
        return {
          placeholder: \`Số phải nằm trong khoảng từ \${min} ~ \${max}\`,
          defaultError: msg,
          validate: (val) => {
            if (!val || String(val).trim() === '') return { valid: true };
            const n = Number(String(val).trim());
            if (isNaN(n) || String(val).trim() === '') {
              return { valid: false, error: 'Giá trị phải là một số' };
            }
            const isValid = n >= min && n <= max;
            return { valid: isValid, error: isValid ? '' : msg };
          }
        };
      }

      if (rule === 'GREATER_THAN') {
        const minVal = (restriction.min !== undefined && restriction.min !== null && String(restriction.min).trim() !== '') ? parseFloat(restriction.min) : 0;
        const msg = \`Số phải lớn hơn \${minVal}\`;
        return {
          placeholder: msg,
          defaultError: msg,
          validate: (val) => {
            if (!val || String(val).trim() === '') return { valid: true };
            const n = Number(String(val).trim());
            if (isNaN(n) || String(val).trim() === '') return { valid: false, error: 'Giá trị phải là một số' };
            const isValid = n > minVal;
            return { valid: isValid, error: isValid ? '' : msg };
          }
        };
      }

      if (rule === 'LESS_THAN') {
        const maxVal = (restriction.max !== undefined && restriction.max !== null && String(restriction.max).trim() !== '') ? parseFloat(restriction.max) : 100;
        const msg = \`Số phải nhỏ hơn \${maxVal}\`;
        return {
          placeholder: msg,
          defaultError: msg,
          validate: (val) => {
            if (!val || String(val).trim() === '') return { valid: true };
            const n = Number(String(val).trim());
            if (isNaN(n) || String(val).trim() === '') return { valid: false, error: 'Giá trị phải là một số' };
            const isValid = n < maxVal;
            return { valid: isValid, error: isValid ? '' : msg };
          }
        };
      }

      // Mặc định IS_NUMBER
      const msg = 'Giá trị phải là một số';
      return {
        placeholder: msg,
        defaultError: msg,
        validate: (val) => {
          if (!val || String(val).trim() === '') return { valid: true };
          const isValid = !isNaN(Number(String(val).trim())) && String(val).trim() !== '';
          return { valid: isValid, error: isValid ? '' : msg };
        }
      };
    }

    if (type === 'LENGTH') {
      const rule = String(restriction.rule || 'MAX_LENGTH').toUpperCase();
      const limit = parseInt(restriction.min || restriction.max || restriction.length || 100, 10) || 100;
      const isMin = rule === 'MIN_LENGTH';
      const msg = isMin ? \`Số ký tự phải có ít nhất \${limit} ký tự\` : \`Số ký tự không được vượt quá \${limit} ký tự\`;
      return {
        placeholder: msg,
        defaultError: msg,
        validate: (val) => {
          if (!val || String(val).trim() === '') return { valid: true };
          const len = String(val).length;
          const isValid = isMin ? len >= limit : len <= limit;
          return { valid: isValid, error: isValid ? '' : msg };
        }
      };
    }

    if (type === 'URL') {
      const msg = 'Vui lòng nhập đường dẫn URL hợp lệ (bắt đầu bằng http:// hoặc https://)';
      return {
        placeholder: 'Vui lòng nhập URL (VD: https://example.com)',
        defaultError: msg,
        validate: (val) => {
          if (!val || String(val).trim() === '') return { valid: true };
          const isValid = /^https?:\\/\\/.+/i.test(String(val).trim());
          return { valid: isValid, error: isValid ? '' : msg };
        }
      };
    }

    return { placeholder: '', defaultError: '', validate: () => ({ valid: true }) };
  }
};
if (typeof window !== 'undefined') {
  window.RestrictionEngine = RestrictionEngine;
}`;

// Chèn hoặc thay thế RestrictionEngine trước window.VibeApp
if (content.includes('const RestrictionEngine = {') && content.includes("if (typeof window !== 'undefined')")) {
  const reRegex = /\/\/ ==============================================================\s*\n\/\/ RESTRICTION & VALIDATION ENGINE[\s\S]*?if \(typeof window !== 'undefined'\) \{\s*\n\s*window\.RestrictionEngine = RestrictionEngine;\s*\n\}/;
  content = content.replace(reRegex, restrictionEngineFullCode);
} else {
  content = restrictionEngineFullCode + '\n\n' + content;
}

// 2. Cập nhật validateQuestionInput trong VibeApp
const valInputOld = /validateQuestionInput\(q, val\) \{[\s\S]*?\},/;
const valInputNew = `validateQuestionInput(q, val) {
    if (!q) return null;
    const v = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
    if (!v || !v.type || v.type === 'NONE') return null;

    const valStr = (val !== undefined && val !== null) ? String(val).trim() : '';
    if (!valStr) return null;

    const engine = (typeof RestrictionEngine !== 'undefined' ? RestrictionEngine : (typeof window !== 'undefined' ? window.RestrictionEngine : this.RestrictionEngine));
    if (!engine || typeof engine.getMeta !== 'function') return null;

    const meta = engine.getMeta(v);
    const res = meta.validate(valStr);
    if (!res.valid) {
      return res.error || meta.defaultError || 'Dữ liệu không hợp lệ';
    }
    return null;
  },`;

if (valInputOld.test(content)) {
  content = content.replace(valInputOld, valInputNew);
  console.log('Đã cập nhật validateQuestionInput chuẩn hóa trả về null / string');
}

// 3. Thay thế khối Section Runner trong public/app.js
const startMarker = content.includes('// ==================== VIEW 2: TRÌNH LÀM BÀI KHẢO SÁT (SECTION-BASED MULTI-QUESTION RUNNER) ====================')
  ? '  // ==================== VIEW 2: TRÌNH LÀM BÀI KHẢO SÁT (SECTION-BASED MULTI-QUESTION RUNNER) ===================='
  : '  // ==================== VIEW 2: TRÌNH LÀM BÀI KHẢO SÁT (STEPPER FOCUS ZEN - 12 ĐỊNH DẠNG) ====================';
const endMarker = '  confirmExitSurvey() {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('LỖI: Không tìm thấy điểm neo startMarker hoặc endMarker trong public/app.js');
  process.exit(1);
}

const replacementCode = `  // ==================== VIEW 2: TRÌNH LÀM BÀI KHẢO SÁT (SECTION-BASED MULTI-QUESTION RUNNER) ====================
  // Gom nhóm danh sách câu hỏi thành mảng các Section theo chuẩn Google Forms / Microsoft Forms
  buildSurveySections(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return [{
        id: 'section-0',
        title: (this.state && this.state.activeSession && this.state.activeSession.survey && this.state.activeSession.survey.title) || 'Bài khảo sát',
        description: (this.state && this.state.activeSession && this.state.activeSession.survey && this.state.activeSession.survey.description) || '',
        defaultAction: 'NEXT',
        questions: []
      }];
    }

    const defaultTitle = (this.state && this.state.activeSession && this.state.activeSession.survey && this.state.activeSession.survey.title) || 'Mục 1: Thông tin chung';
    const defaultDesc = (this.state && this.state.activeSession && this.state.activeSession.survey && this.state.activeSession.survey.description) || '';

    const sections = [];
    let curSection = null;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.type === 'SECTION_HEADER') {
        if (curSection) {
          sections.push(curSection);
        }
        curSection = {
          id: q.id || \`section-\${sections.length}\`,
          headerQuestionId: q.id,
          title: q.content || \`Mục \${sections.length + 1}\`,
          description: (q.rows && q.rows[0]) ? q.rows[0] : (q.description || ''),
          defaultAction: (q.logic && q.logic.default_action) || 'NEXT',
          questions: []
        };
      } else {
        if (!curSection) {
          curSection = {
            id: 'section-0',
            title: defaultTitle,
            description: defaultDesc,
            defaultAction: 'NEXT',
            questions: []
          };
        }
        curSection.questions.push(q);
      }
    }

    if (curSection) {
      sections.push(curSection);
    }

    if (sections.length === 0) {
      sections.push({
        id: 'section-0',
        title: defaultTitle,
        description: defaultDesc,
        defaultAction: 'NEXT',
        questions: questions.filter(q => q.type !== 'SECTION_HEADER')
      });
    }

    return sections;
  },

  async renderTakeSurveyView(root, surveyId) {
    const session = this.state.activeSession;
    if (!session || session.surveyId !== surveyId) {
      root.innerHTML = \`
        <div class="text-center py-20 space-y-3">
          <p class="text-xs text-slate-500 font-medium">Phiên làm bài đã kết thúc hoặc không tìm thấy.</p>
          <button onclick="VibeApp.navigate('surveys')" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold">
            Về Cổng Khảo Sát
          </button>
        </div>
      \`;
      return;
    }

    if (session && (!session.survey || !session.survey.cover_image_url)) {
      try {
        const freshRes = await this.api(\`/surveys/\${surveyId}\`);
        if (freshRes && freshRes.survey) {
          session.survey = freshRes.survey;
          this._saveActiveSessionToStorage();
        }
      } catch (e) { }
    }

    const hasStarted = session.hasStartedQuiz === true || session.isEditing || (session.currentSectionIndex || 0) > 0 || session.currentIndex > 0 || Object.keys(session.answers || {}).length > 0;
    if (!hasStarted) {
      const s = session.survey || {};
      const coverUrl = s.cover_image_url || null;
      const minMins = Math.max(1, Math.ceil((session.minTimeSec || 30) / 60));
      const rewardPts = session.rewardPoints || s.reward_points_per_response || 0;
      const hasVoucher = !!(s.sponsor && (s.sponsor.brand_name || s.sponsor.title));
      const voucherName = s.sponsor ? (s.sponsor.title || \`Voucher \${s.sponsor.brand_name}\`) : '';

      root.innerHTML = \`
        <div class="stepper-focus-box max-w-3xl mx-auto py-4 sm:py-6 space-y-6">
          
          <!-- Top Navigation -->
          <div class="flex items-center justify-between text-xs text-stone-500 pb-2">
            <button onclick="VibeApp.navigate('surveys')" class="hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1.5 font-bold transition-colors">
              <i data-lucide="arrow-left" class="w-4 h-4 stroke-[2.2]"></i>
              <span>Về Cổng Khảo Sát</span>
            </button>
            <span class="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold text-[11px]">
              \${s.category || 'Khảo sát'}
            </span>
          </div>

          <!-- Main Cover Card (Google Forms Hybrid Style) -->
          <div class="bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            \${coverUrl ? \`
              <!-- Ảnh bìa biểu mẫu chuẩn Google Forms tinh gọn, căn giữa không bị lệch hay cắt xén -->
              <div class="relative w-full h-32 sm:h-40 overflow-hidden bg-stone-950 flex items-center justify-center">
                <img src="\${coverUrl}" alt="" class="absolute inset-0 w-full h-full object-cover object-center blur-md opacity-35 scale-105 pointer-events-none">
                <img src="\${coverUrl}" alt="Ảnh bìa khảo sát" class="relative max-h-full max-w-full object-contain mx-auto z-10" onerror="this.parentElement.style.display='none'">
              </div>
            \` : ''}

            <!-- Dải Accent Cam Vibe #EA580C -->
            <div class="h-2 bg-orange-600 w-full \${coverUrl ? '' : 'rounded-t-2xl'}"></div>

            <div class="p-6 sm:p-8 space-y-6">
              
              <!-- Tiêu đề & Mô tả -->
              <div class="space-y-3">
                <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  \${this.escapeHtml(s.title || 'Bài khảo sát')}
                </h1>
                <p class="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                  \${this.escapeHtml(s.description || 'Khảo sát nghiên cứu thị trường và thu thập ý kiến cộng đồng.')}
                </p>
              </div>

              <!-- Thẻ thông số tóm tắt (Bento Grid) -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                
                <div class="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-0.5">
                  <div class="text-[10px] font-semibold uppercase text-stone-400">Phần thưởng</div>
                  <div class="text-sm font-extrabold text-orange-600 dark:text-orange-400 font-mono">
                    +\${rewardPts.toLocaleString()} Điểm
                  </div>
                  <div class="text-[10px] text-stone-400 font-mono">≈ \${rewardPts.toLocaleString()}đ</div>
                </div>

                <div class="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-0.5">
                  <div class="text-[10px] font-semibold uppercase text-stone-400">Quy mô câu hỏi</div>
                  <div class="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                    \${session.questions.length} câu hỏi
                  </div>
                  <div class="text-[10px] text-stone-400">Tự động lưu bài</div>
                </div>

                <div class="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-0.5 col-span-2 sm:col-span-1">
                  <div class="text-[10px] font-semibold uppercase text-stone-400">Thời gian ước tính</div>
                  <div class="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                    ~\${minMins} phút
                  </div>
                  <div class="text-[10px] text-stone-400">Nhịp độ tối thiểu \${session.minTimeSec || 15}s</div>
                </div>

              </div>

              \${hasVoucher ? \`
                <div class="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                    <i data-lucide="gift" class="w-5 h-5"></i>
                  </div>
                  <div class="overflow-hidden">
                    <div class="text-xs font-bold text-orange-900 dark:text-orange-200 truncate">Tài trợ quà tặng voucher độc quyền</div>
                    <div class="text-[11px] text-orange-700 dark:text-orange-400 truncate">\${voucherName}</div>
                  </div>
                </div>
              \` : ''}

              <!-- Lưu ý làm bài trung thực & Tiêu chuẩn chất lượng -->
              <div class="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800/80 text-[11px] text-stone-500 dark:text-stone-400 space-y-1.5 leading-relaxed">
                <div class="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-600"></i>
                  <span>Quy tắc bảo đảm chất lượng dữ liệu:</span>
                </div>
                <p>• Trả lời cẩn thận và trung thực dựa trên trải nghiệm thực tế của bạn.</p>
                <p>• Hệ thống tích hợp thuật toán kiểm tra tính tập trung (Attention Check) và phát hiện nhấp bừa để đảm bảo quyền lợi cộng đồng.</p>
              </div>

              <!-- Nút Bắt Đầu Làm Bài -->
              <div class="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button type="button" onclick="VibeApp.beginTakeSurvey()" class="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer">
                  <span>Bắt Đầu Làm Khảo Sát</span>
                  <i data-lucide="arrow-right" class="w-4 h-4 stroke-[2.5]"></i>
                </button>
                <button type="button" onclick="VibeApp.navigate('surveys')" class="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-bold text-xs transition-colors text-center">
                  Để sau
                </button>
              </div>

            </div>
          </div>

        </div>
      \`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const typeLabels = {
      SINGLE_CHOICE: 'Trắc nghiệm đơn',
      MULTIPLE_CHOICE: 'Hộp kiểm (Nhiều đáp án)',
      SHORT_TEXT: 'Trả lời ngắn',
      PARAGRAPH: 'Đoạn văn tự luận',
      OPEN_TEXT: 'Đoạn văn tự luận',
      DROPDOWN: 'Menu thả xuống',
      LINEAR_SCALE: 'Phạm vi tuyến tính',
      LIKERT_SCALE: 'Thang đo Likert',
      CHOICE_GRID: 'Lưới trắc nghiệm (Ma trận)',
      CHECKBOX_GRID: 'Lưới hộp kiểm (Ma trận)',
      FILE_UPLOAD: 'Tải tệp lên',
      DATE_INPUT: 'Chọn ngày tháng',
      DATE: 'Chọn ngày tháng',
      TIME_INPUT: 'Chọn giờ phút',
      TIME: 'Chọn giờ phút',
      RATING_STARS: 'Đánh giá xếp hạng',
      RATING: 'Đánh giá sao'
    };

    const sections = this.buildSurveySections(session.questions);
    let curSectionIdx = session.currentSectionIndex || 0;
    if (curSectionIdx >= sections.length) {
      curSectionIdx = Math.max(0, sections.length - 1);
      session.currentSectionIndex = curSectionIdx;
    }
    const curSec = sections[curSectionIdx] || sections[0];
    const progressPct = sections.length > 0 ? Math.round(((curSectionIdx + 1) / sections.length) * 100) : 100;
    const isLastSection = curSectionIdx >= sections.length - 1;
    const canGoPrev = curSectionIdx > 0 || (session.sectionHistory && session.sectionHistory.length > 0);

    // Xây dựng bản đồ số thứ tự câu hỏi toàn bài
    let answerableCounter = 0;
    const qNumberMap = {};
    session.questions.forEach((q) => {
      if (q.type !== 'SECTION_HEADER') {
        answerableCounter++;
        qNumberMap[q.id] = answerableCounter;
      }
    });

    // Đồng bộ chỉ số session.currentIndex về câu hỏi đầu tiên của Section hiện tại để giữ tính tương thích
    if (curSec.questions && curSec.questions.length > 0) {
      const firstQIndex = session.questions.findIndex(item => item.id === curSec.questions[0].id);
      if (firstQIndex !== -1) {
        session.currentIndex = firstQIndex;
      }
    }

    // Timer display
    const sec = session.durationSec || 0;
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    const initialTimeStr = \`\${mins.toString().padStart(2, '0')}:\${remSec.toString().padStart(2, '0')}\`;

    if (!session.timerId) {
      session.timerId = setInterval(() => {
        if (this.state.activeSession) {
          this.state.activeSession.durationSec = (this.state.activeSession.durationSec || 0) + 1;
          this._saveActiveSessionToStorage();
          const timerEl = document.getElementById('session-timer-text');
          if (timerEl) {
            const s = this.state.activeSession.durationSec;
            const m = Math.floor(s / 60);
            const r = s % 60;
            timerEl.textContent = \`\${m.toString().padStart(2, '0')}:\${r.toString().padStart(2, '0')}\`;
          }
        }
      }, 1000);
    }

    root.innerHTML = \`
      <div class="stepper-focus-box space-y-6 py-4 max-w-3xl mx-auto">
        
        <!-- Header Controls: Thoát Khảo Sát, Bộ Đếm Thời Gian, Tiến Trình Mục -->
        <div class="flex items-center justify-between text-xs text-stone-500 pb-3 border-b border-stone-200 dark:border-stone-800">
          <button type="button" onclick="VibeApp.confirmExitSurvey()" class="hover:text-red-600 flex items-center gap-1 font-bold transition-colors cursor-pointer">
            <i data-lucide="x" class="w-4 h-4 stroke-[2.2]"></i>
            <span>Thoát Khảo Sát</span>
          </button>
          
          <div class="flex items-center space-x-3">
            <span class="font-mono text-stone-700 dark:text-stone-300 font-bold" id="session-timer-text">\${initialTimeStr}</span>
            <span class="text-stone-300 dark:text-stone-700">|</span>
            <span class="font-extrabold text-orange-600 dark:text-orange-400">Mục \${curSectionIdx + 1} / \${sections.length} (\${progressPct}%)</span>
          </div>
        </div>

        \${session.isEditing ? \`
          <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <i data-lucide="edit-3" class="w-4 h-4 text-amber-600 shrink-0"></i>
              <span><strong>Chế độ chỉnh sửa:</strong> Bạn đang cập nhật câu trả lời đã nộp.</span>
            </div>
            <button onclick="VibeApp.navigate('review-survey', { surveyId: '\${surveyId}' })" class="text-[11px] underline font-bold hover:text-amber-900 cursor-pointer">
              Hủy sửa & Xem bài cũ
            </button>
          </div>
        \` : ''}

        <!-- Top Progress Line -->
        <div class="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
          <div class="bg-orange-600 h-full rounded-full transition-all duration-300" style="width: \${progressPct}%"></div>
        </div>

        <!-- Thẻ Section Header Card (Chuẩn Google Forms / Microsoft Forms) -->
        <div class="bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
          <!-- Dải Accent Cam Vibe #EA580C -->
          <div class="h-2.5 bg-orange-600 w-full"></div>
          <div class="p-6 sm:p-8 space-y-3">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 rounded-full bg-orange-50 dark:bg-stone-800 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-stone-700 text-[11px] font-extrabold font-mono uppercase tracking-wider">
                Mục \${curSectionIdx + 1} trên \${sections.length}
              </span>
              <span class="text-[11px] text-stone-400 font-mono font-semibold">\${curSec.questions.length} câu hỏi</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              \${this.escapeHtml(curSec.title || 'Mục khảo sát')}
            </h2>
            \${curSec.description ? \`
              <p class="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line pt-0.5">
                \${this.escapeHtml(curSec.description)}
              </p>
            \` : ''}
            <div class="pt-2 text-[11px] text-red-500 font-medium flex items-center gap-1">
              <span>* Biểu thị câu hỏi bắt buộc</span>
            </div>
          </div>
        </div>

        <!-- Danh sách TOÀN BỘ câu hỏi trong Section hiện tại (Hiển thị đồng thời trên cùng trang) -->
        <div class="space-y-5">
          \${curSec.questions.map((q) => {
            if (q.type === 'VIDEO_BLOCK') {
              return \`
                <div id="question-card-\${q.id}" class="bento-card p-6 sm:p-7 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-2xl sm:rounded-3xl shadow-sm">
                  \${this.renderQuestionOptions(q, null)}
                </div>
              \`;
            }
            if (q.type === 'TEXT_BLOCK') {
              return \`
                <div id="question-card-\${q.id}" class="bento-card p-6 sm:p-7 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-2xl sm:rounded-3xl shadow-sm space-y-2">
                  <h3 class="text-base font-bold text-slate-900 dark:text-white">\${this.escapeHtml(q.content)}</h3>
                  \${q.rows && q.rows[0] ? \`<p class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">\${this.escapeHtml(q.rows[0])}</p>\` : ''}
                </div>
              \`;
            }

            const qNum = qNumberMap[q.id] || 1;
            const isReq = q.is_required !== 0 && q.is_required !== false;
            const currentAns = session.answers ? session.answers[q.id] : undefined;

            return \`
              <div id="question-card-\${q.id}" class="bento-card p-6 sm:p-7 space-y-4 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-800 rounded-2xl sm:rounded-3xl shadow-sm transition-all">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 dark:bg-stone-800 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-stone-700">
                        \${typeLabels[q.type] || 'Khảo sát'}
                      </span>
                      \${isReq ? \`
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/40">
                          * Bắt buộc
                        </span>
                      \` : \`
                        <span class="text-[10px] text-stone-400 font-medium">(Tùy chọn)</span>
                      \`}
                    </div>
                    <span class="text-xs text-stone-400 font-mono font-bold">CÂU #\${qNum}</span>
                  </div>

                  <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    <span>\${qNum}. \${this.escapeHtml(q.content)}</span>
                    \${isReq ? '<span class="text-red-500 ml-1 font-bold">*</span>' : ''}
                  </h3>

                  \${q.image_url ? \`
                    <div class="my-3 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 max-w-lg">
                      <img src="\${q.image_url}" alt="Ảnh câu hỏi" class="w-full max-h-64 object-contain bg-stone-50 dark:bg-stone-900" onerror="this.style.display='none'">
                    </div>
                  \` : ''}
                </div>

                <!-- Options / Inputs Container -->
                <div class="pt-1">
                  \${this.renderQuestionOptions(q, currentAns)}
                </div>

                <!-- Thẻ cảnh báo lỗi nội dòng -->
                <div id="val-err-\${q.id}" class="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-1.5 hidden flex items-center gap-1"></div>
              </div>
            \`;
          }).join('')}
        </div>

        <!-- Thanh điều hướng cuối trang Section (Quay lại & Tiếp tục / Gửi biểu mẫu) -->
        <div class="pt-4 pb-8 flex items-center justify-between gap-3">
          \${canGoPrev ? \`
            <button type="button" onclick="VibeApp.prevSection()" 
                    class="px-6 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95">
              <i data-lucide="arrow-left" class="w-4 h-4 stroke-[2.2]"></i>
              <span>Quay lại</span>
            </button>
          \` : \`
            <div></div>
          \`}

          \${isLastSection ? \`
            <button type="button" id="stepper-next-btn" onclick="VibeApp.nextSection()" 
                    class="px-8 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
              <i data-lucide="check" class="w-4 h-4 stroke-[2.5]"></i>
              <span>\${session.isEditing ? 'Cập nhật câu trả lời' : 'Nộp bài & Nhận thưởng'}</span>
              <span class="text-[10px] opacity-75 font-normal ml-1">(Enter ↵)</span>
            </button>
          \` : \`
            <button type="button" id="stepper-next-btn" onclick="VibeApp.nextSection()" 
                    class="px-8 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
              <span>Tiếp tục</span>
              <span class="text-[10px] opacity-75 font-normal ml-1">(Enter ↵)</span>
              <i data-lucide="arrow-right" class="w-4 h-4 stroke-[2.2]"></i>
            </button>
          \`}
        </div>

      </div>
    \`;

    if (window.lucide) window.lucide.createIcons();
  },

  renderQuestionOptions(q, currentAnswer) {
    // 0. KHỐI VIDEO MINH HỌA (YouTube)
    if (q.type === 'VIDEO_BLOCK') {
      const ytEmbed = this.getYouTubeEmbedUrl(q.video_url || '');
      return \`
        <div class="space-y-3">
          \${ytEmbed ? \`
            <div class="aspect-video w-full rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-black shadow-md">
              <iframe class="w-full h-full" src="\${ytEmbed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          \` : \`
            <div class="p-8 text-center bg-stone-50 dark:bg-stone-900 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 text-xs">
              Chưa có liên kết video
            </div>
          \`}
          <p class="text-xs text-stone-500 italic text-center">Vui lòng xem video phía trên trước khi bấm tiếp tục.</p>
        </div>
      \`;
    }

    // 0b. KHỐI PHÂN ĐOẠN BIỂU MẪU (SECTION_HEADER)
    if (q.type === 'SECTION_HEADER') {
      return '';
    }

    // 0c. KHỐI TIÊU ĐỀ & MÔ TẢ (TEXT_BLOCK)
    if (q.type === 'TEXT_BLOCK') {
      return \`
        <div class="p-5 bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2">
          \${q.rows && q.rows[0] ? \`<p class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">\${q.rows[0]}</p>\` : ''}
        </div>
      \`;
    }

    // 1. TRẮC NGHIỆM ĐƠN (SINGLE_CHOICE)
    if (q.type === 'SINGLE_CHOICE') {
      const opts = q.options || [];
      return opts.map((opt, idx) => {
        const isSelected = currentAnswer === opt;
        return \`
          <div onclick="VibeApp.selectSingleOption('\${q.id}', '\${encodeURIComponent(opt)}')" 
               class="stepper-choice-btn cursor-pointer mb-2.5 \${isSelected ? 'selected' : ''}">
            <div class="flex items-center space-x-3">
              <div class="w-5 h-5 rounded-full border-2 \${isSelected ? 'border-orange-600 bg-orange-600' : 'border-stone-300 dark:border-stone-600'} flex items-center justify-center text-white transition-colors">
                \${isSelected ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
              </div>
              <span class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">\${this.escapeHtml(opt)}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    // 2. HỘP KIỂM (MULTIPLE_CHOICE)
    if (q.type === 'MULTIPLE_CHOICE') {
      const opts = q.options || [];
      const selectedList = Array.isArray(currentAnswer) ? currentAnswer : [];
      return opts.map((opt, idx) => {
        const isChecked = selectedList.includes(opt);
        return \`
          <div onclick="VibeApp.toggleMultipleOption('\${q.id}', '\${encodeURIComponent(opt)}')" 
               class="stepper-choice-btn cursor-pointer mb-2.5 \${isChecked ? 'selected' : ''}">
            <div class="flex items-center space-x-3">
              <div class="w-5 h-5 rounded-md border-2 \${isChecked ? 'border-orange-600 bg-orange-600' : 'border-stone-300 dark:border-stone-600'} flex items-center justify-center text-white transition-colors">
                \${isChecked ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
              </div>
              <span class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">\${this.escapeHtml(opt)}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    // 3. TRẢ LỜI NGẮN (SHORT_TEXT)
    if (q.type === 'SHORT_TEXT') {
      const textVal = currentAnswer || '';
      const validation = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
      let placeholder = 'Nhập câu trả lời ngắn của bạn...';
      const engine = (typeof RestrictionEngine !== 'undefined' ? RestrictionEngine : (typeof window !== 'undefined' ? window.RestrictionEngine : null));
      if (engine && validation) {
        const meta = engine.getMeta(validation);
        if (meta && meta.placeholder) placeholder = meta.placeholder;
      } else if (validation?.placeholder) {
        placeholder = validation.placeholder;
      }
      return \`
        <div class="space-y-2">
          <!-- oninput="VibeApp.updateOpenText('\${q.id}', this.value)" -->
          <input type="text" value="\${(textVal).replace(/"/g, '&quot;')}" 
                 id="survey-answer-input-\${q.id}"
                 oninput="VibeApp.handleSurveyInputRealtime('\${q.id}', this)"
                 onblur="VibeApp.handleSurveyInputRealtime('\${q.id}', this)"
                 onchange="VibeApp.updateOpenText('\${q.id}', this.value)"
                 placeholder="\${placeholder.replace(/"/g, '&quot;')}"
                 class="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors">
          <p class="text-[11px] text-stone-400 font-medium">\${placeholder}</p>
        </div>
      \`;
    }

    // 4. ĐOẠN VĂN (PARAGRAPH / OPEN_TEXT)
    if (['PARAGRAPH', 'OPEN_TEXT'].includes(q.type)) {
      const textVal = currentAnswer || '';
      const validation = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
      let placeholder = 'Nhập câu trả lời chi tiết của bạn...';
      const engine = (typeof RestrictionEngine !== 'undefined' ? RestrictionEngine : (typeof window !== 'undefined' ? window.RestrictionEngine : null));
      if (engine && validation) {
        const meta = engine.getMeta(validation);
        if (meta && meta.placeholder) placeholder = meta.placeholder;
      } else if (validation?.placeholder) {
        placeholder = validation.placeholder;
      }
      return \`
        <div class="space-y-2">
          <textarea id="survey-answer-input-\${q.id}"
                    oninput="VibeApp.handleSurveyInputRealtime('\${q.id}', this)" 
                    onblur="VibeApp.handleSurveyInputRealtime('\${q.id}', this)"
                    onchange="VibeApp.updateOpenText('\${q.id}', this.value)" 
                    rows="4"
                    placeholder="\${placeholder.replace(/"/g, '&quot;')}"
                    class="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium leading-relaxed transition-colors">\${textVal}</textarea>
          <p class="text-[11px] text-stone-400 font-medium">\${placeholder}</p>
        </div>
      \`;
    }

    // 5. MENU THẢ XUỐNG (DROPDOWN)
    if (q.type === 'DROPDOWN') {
      const opts = q.options || [];
      return \`
        <div class="space-y-2">
          <select onchange="VibeApp.selectSingleOption('\${q.id}', encodeURIComponent(this.value))" 
                  class="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
            <option value="">-- Nhấp để chọn đáp án --</option>
            \${opts.map(opt => \`
              <option value="\${(opt || '').replace(/"/g, '&quot;')}" \${currentAnswer === opt ? 'selected' : ''}>
                \${opt}
              </option>
            \`).join('')}
          </select>
          <p class="text-[11px] text-stone-400">Chọn 1 tùy chọn phù hợp từ menu thả xuống</p>
        </div>
      \`;
    }

    // 6. PHẠM VI TUYẾN TÍNH (LINEAR_SCALE / LIKERT_SCALE - Chuẩn Google Forms)
    if (['LINEAR_SCALE', 'LIKERT_SCALE'].includes(q.type)) {
      const opts = (Array.isArray(q.options) && q.options.length > 0) ? q.options : ['1', '2', '3', '4', '5'];
      const minLabel = q.min_label || '';
      const maxLabel = q.max_label || '';
      const isLongScale = opts.length > 5;
      const minOpt = opts[0];
      const maxOpt = opts[opts.length - 1];

      return \`
        <div class="space-y-3">
          <div class="grid \${isLongScale ? 'grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2' : 'grid-cols-5 gap-2 sm:gap-3'}">
            \${opts.map((opt) => {
              const isSelected = String(currentAnswer) === String(opt);
              return \`
                <button type="button" onclick="VibeApp.selectSingleOption('\${q.id}', '\${encodeURIComponent(opt)}')"
                        class="likert-clean-btn \${isLongScale ? 'py-2 px-1 rounded-xl' : ''} \${isSelected ? 'selected' : ''}">
                  <div class="\${isLongScale ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-bold font-mono">\${opt}</div>
                  \${!isLongScale && isNaN(opt) ? \`<div class="text-[10px] leading-tight mt-0.5">\${opt}</div>\` : ''}
                </button>
              \`;
            }).join('')}
          </div>
          \${(minLabel || maxLabel) ? \`
            <div class="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-1 pt-1 font-medium">
              <span>\${minLabel ? \`\${minOpt}: \${minLabel}\` : ''}</span>
              <span>\${maxLabel ? \`\${maxOpt}: \${maxLabel}\` : ''}</span>
            </div>
          \` : ''}
        </div>
      \`;
    }

    // 7. LƯỚI TRẮC NGHIỆM (CHOICE_GRID - 1 LỰA CHỌN MỖI HÀNG)
    if (q.type === 'CHOICE_GRID') {
      const rows = q.rows || ['Tiêu chí 1', 'Tiêu chí 2', 'Tiêu chí 3'];
      const columns = q.columns || ['Kém', 'Bình thường', 'Tốt', 'Rất tốt'];
      const currentGridAns = (currentAnswer && typeof currentAnswer === 'object') ? currentAnswer : {};

      return \`
        <div class="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 shadow-xs">
          <table class="w-full text-left text-xs">
            <thead class="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th class="py-3 px-4 font-extrabold text-stone-700 dark:text-stone-300">Tiêu chí</th>
                \${columns.map(c => \`
                  <th class="py-3 px-3 text-center font-bold text-stone-600 dark:text-stone-400 whitespace-nowrap">\${c}</th>
                \`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100 dark:divide-stone-800">
              \${rows.map(r => {
                const selectedCol = currentGridAns[r];
                return \`
                  <tr class="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                    <td class="py-3.5 px-4 font-semibold text-stone-900 dark:text-stone-100">\${r}</td>
                    \${columns.map(c => {
                      const isSelected = selectedCol === c;
                      return \`
                        <td class="py-3 px-3 text-center">
                          <button type="button" onclick="VibeApp.selectChoiceGridCell('\${q.id}', '\${encodeURIComponent(r)}', '\${encodeURIComponent(c)}')"
                                  class="w-6 h-6 rounded-full border-2 mx-auto flex items-center justify-center transition-all \${isSelected
                                    ? 'border-orange-600 bg-orange-600 text-white shadow-xs'
                                    : 'border-stone-300 dark:border-stone-600 hover:border-orange-400 bg-white dark:bg-stone-800'
                                  }">
                            \${isSelected ? '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
                          </button>
                        </td>
                      \`;
                    }).join('')}
                  </tr>
                \`;
              }).join('')}
            </tbody>
          </table>
        </div>
      \`;
    }

    // 8. LƯỚI HỘP KIỂM (CHECKBOX_GRID - NHIỀU LỰA CHỌN MỖI HÀNG)
    if (q.type === 'CHECKBOX_GRID') {
      const rows = q.rows || ['Tiêu chí 1', 'Tiêu chí 2', 'Tiêu chí 3'];
      const columns = q.columns || ['Kém', 'Bình thường', 'Tốt', 'Rất tốt'];
      const currentGridAns = (currentAnswer && typeof currentAnswer === 'object') ? currentAnswer : {};

      return \`
        <div class="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 shadow-xs">
          <table class="w-full text-left text-xs">
            <thead class="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th class="py-3 px-4 font-extrabold text-stone-700 dark:text-stone-300">Tiêu chí</th>
                \${columns.map(c => \`
                  <th class="py-3 px-3 text-center font-bold text-stone-600 dark:text-stone-400 whitespace-nowrap">\${c}</th>
                \`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100 dark:divide-stone-800">
              \${rows.map(r => {
                const selectedCols = Array.isArray(currentGridAns[r]) ? currentGridAns[r] : [];
                return \`
                  <tr class="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors">
                    <td class="py-3.5 px-4 font-semibold text-stone-900 dark:text-stone-100">\${r}</td>
                    \${columns.map(c => {
                      const isChecked = selectedCols.includes(c);
                      return \`
                        <td class="py-3 px-3 text-center">
                          <button type="button" onclick="VibeApp.toggleCheckboxGridCell('\${q.id}', '\${encodeURIComponent(r)}', '\${encodeURIComponent(c)}')"
                                  class="w-6 h-6 rounded-md border-2 mx-auto flex items-center justify-center transition-all \${isChecked
                                    ? 'border-orange-600 bg-orange-600 text-white shadow-xs'
                                    : 'border-stone-300 dark:border-stone-600 hover:border-orange-400 bg-white dark:bg-stone-800'
                                  }">
                            \${isChecked ? '<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
                          </button>
                        </td>
                      \`;
                    }).join('')}
                  </tr>
                \`;
              }).join('')}
            </tbody>
          </table>
        </div>
      \`;
    }

    // 9. TẢI TỆP LÊN (FILE_UPLOAD)
    if (q.type === 'FILE_UPLOAD') {
      const fileName = currentAnswer || '';
      return \`
        <div class="p-6 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl bg-stone-50 dark:bg-stone-900/60 text-center space-y-3">
          <i data-lucide="upload-cloud" class="w-8 h-8 text-orange-600 mx-auto"></i>
          <div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Chọn hoặc kéo thả tệp tải lên</div>
            <p class="text-[11px] text-stone-400 mt-0.5">PNG, JPG, PDF (Tối đa 5MB)</p>
          </div>
          <input type="file" id="file-input-\${q.id}" onchange="VibeApp.handleFileUploadChange('\${q.id}', this)" class="hidden">
          <div>
            <button type="button" onclick="document.getElementById('file-input-\${q.id}').click()" class="py-2 px-4 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 hover:border-orange-500 shadow-xs">
              \${fileName ? 'Thay đổi tệp đã chọn' : 'Chọn tệp từ thiết bị'}
            </button>
          </div>
          \${fileName ? \`
            <div class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 pt-1">
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
              <span>Đã chọn tệp: \${fileName}</span>
            </div>
          \` : ''}
        </div>
      \`;
    }

    // 10. NGÀY THÁNG (DATE_INPUT / DATE)
    if (['DATE_INPUT', 'DATE'].includes(q.type)) {
      const dateVal = currentAnswer || '';
      return \`
        <div class="space-y-2">
          <input type="date" value="\${dateVal}" onchange="VibeApp.selectSingleOption('\${q.id}', encodeURIComponent(this.value))" 
                 class="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
          <p class="text-[11px] text-stone-400">Chọn ngày / tháng / năm</p>
        </div>
      \`;
    }

    // 11. GIỜ PHÚT (TIME_INPUT / TIME)
    if (['TIME_INPUT', 'TIME'].includes(q.type)) {
      const timeVal = currentAnswer || '';
      return \`
        <div class="space-y-2">
          <input type="time" value="\${timeVal}" onchange="VibeApp.selectSingleOption('\${q.id}', encodeURIComponent(this.value))" 
                 class="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
          <p class="text-[11px] text-stone-400">Chọn giờ và phút</p>
        </div>
      \`;
    }

    // 12. ĐÁNH GIÁ SAO (RATING_STARS / RATING)
    if (['RATING_STARS', 'RATING'].includes(q.type)) {
      const stars = [1, 2, 3, 4, 5];
      const curRating = parseInt(currentAnswer, 10) || 0;
      return \`
        <div class="py-4 text-center space-y-3">
          <div class="flex items-center justify-center gap-3">
            \${stars.map(star => {
              const isFilled = star <= curRating;
              return \`
                <button type="button" onclick="VibeApp.selectSingleOption('\${q.id}', '\${star}')" 
                        class="p-2 sm:p-3 rounded-2xl transition-all transform active:scale-90 \${isFilled ? 'text-amber-400 scale-110' : 'text-stone-300 dark:text-stone-600 hover:text-amber-300'}">
                  <i data-lucide="star" class="w-8 h-8 sm:w-10 sm:h-10 \${isFilled ? 'fill-amber-400 stroke-amber-400' : 'stroke-[1.8]'}"></i>
                  <div class="text-[11px] font-bold font-mono mt-1 text-stone-600 dark:text-stone-400">\${star} Sao</div>
                </button>
              \`;
            }).join('')}
          </div>
          \${curRating > 0 ? \`
            <div class="text-xs font-bold text-amber-500">Bạn đã đánh giá: \${curRating} / 5 Sao</div>
          \` : \`
            <div class="text-xs text-stone-400">Nhấp chọn sao để đánh giá</div>
          \`}
        </div>
      \`;
    }

    return '';
  },

  selectSingleOption(qId, encodedOpt) {
    this.haptic('light');
    if (!this.state.activeSession) return;
    if (!this.state.activeSession.answers) this.state.activeSession.answers = {};
    const opt = decodeURIComponent(encodedOpt);
    this.state.activeSession.answers[qId] = opt;
    this._saveActiveSessionToStorage();

    // Tự động xóa trạng thái viền đỏ lỗi khi người dùng đã chọn đáp án
    const errEl = document.getElementById(\`val-err-\${qId}\`);
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    const cardEl = document.getElementById(\`question-card-\${qId}\`);
    if (cardEl) {
      cardEl.classList.remove('ring-1', 'ring-red-500');
    }

    const prevScrollY = window.scrollY;
    this.renderTakeSurveyView(document.getElementById('app-root'), this.state.activeSession.surveyId);
    window.scrollTo({ top: prevScrollY, behavior: 'instant' });
  },

  toggleMultipleOption(qId, encodedOpt) {
    this.haptic('light');
    if (!this.state.activeSession) return;
    if (!this.state.activeSession.answers) this.state.activeSession.answers = {};
    const opt = decodeURIComponent(encodedOpt);
    if (!Array.isArray(this.state.activeSession.answers[qId])) {
      this.state.activeSession.answers[qId] = [];
    }
    const arr = this.state.activeSession.answers[qId];
    const idx = arr.indexOf(opt);
    if (idx !== -1) {
      arr.splice(idx, 1);
    } else {
      arr.push(opt);
    }
    this._saveActiveSessionToStorage();

    const errEl = document.getElementById(\`val-err-\${qId}\`);
    if (errEl && arr.length > 0) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    const cardEl = document.getElementById(\`question-card-\${qId}\`);
    if (cardEl && arr.length > 0) {
      cardEl.classList.remove('ring-1', 'ring-red-500');
    }

    const prevScrollY = window.scrollY;
    this.renderTakeSurveyView(document.getElementById('app-root'), this.state.activeSession.surveyId);
    window.scrollTo({ top: prevScrollY, behavior: 'instant' });
  },

  selectChoiceGridCell(qId, encodedRow, encodedCol) {
    this.haptic('light');
    const r = decodeURIComponent(encodedRow);
    const c = decodeURIComponent(encodedCol);
    if (!this.state.activeSession.answers[qId] || typeof this.state.activeSession.answers[qId] !== 'object') {
      this.state.activeSession.answers[qId] = {};
    }
    this.state.activeSession.answers[qId][r] = c;
    this._saveActiveSessionToStorage();

    const errEl = document.getElementById(\`val-err-\${qId}\`);
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    const cardEl = document.getElementById(\`question-card-\${qId}\`);
    if (cardEl) {
      cardEl.classList.remove('ring-1', 'ring-red-500');
    }

    const prevScrollY = window.scrollY;
    this.renderTakeSurveyView(document.getElementById('app-root'), this.state.activeSession.surveyId);
    window.scrollTo({ top: prevScrollY, behavior: 'instant' });
  },

  toggleCheckboxGridCell(qId, encodedRow, encodedCol) {
    this.haptic('light');
    const r = decodeURIComponent(encodedRow);
    const c = decodeURIComponent(encodedCol);
    if (!this.state.activeSession.answers[qId] || typeof this.state.activeSession.answers[qId] !== 'object') {
      this.state.activeSession.answers[qId] = {};
    }
    const curList = Array.isArray(this.state.activeSession.answers[qId][r]) ? [...this.state.activeSession.answers[qId][r]] : [];
    const idx = curList.indexOf(c);
    if (idx > -1) curList.splice(idx, 1);
    else curList.push(c);
    this.state.activeSession.answers[qId][r] = curList;
    this._saveActiveSessionToStorage();

    const errEl = document.getElementById(\`val-err-\${qId}\`);
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    const cardEl = document.getElementById(\`question-card-\${qId}\`);
    if (cardEl) {
      cardEl.classList.remove('ring-1', 'ring-red-500');
    }

    const prevScrollY = window.scrollY;
    this.renderTakeSurveyView(document.getElementById('app-root'), this.state.activeSession.surveyId);
    window.scrollTo({ top: prevScrollY, behavior: 'instant' });
  },

  updateOpenText(qId, val) {
    if (!this.state.activeSession) return;
    if (!this.state.activeSession.answers) this.state.activeSession.answers = {};
    this.state.activeSession.answers[qId] = typeof val === 'string' ? val : (val ? String(val) : '');
    this._saveActiveSessionToStorage();
  },

  handleFileUploadChange(qId, inputEl) {
    if (inputEl.files && inputEl.files[0]) {
      const file = inputEl.files[0];
      this.state.activeSession.answers[qId] = file.name;
      this._saveActiveSessionToStorage();
      this.renderTakeSurveyView(document.getElementById('app-root'), this.state.activeSession.surveyId);
      this.showToast(\`Đã đính kèm tệp: \${file.name}\`, 'success');
    }
  },

  // Hàm kiểm tra tính hợp lệ toàn diện của Section hiện tại (Kiểm tra bắt buộc + Ràng buộc định dạng)
  validateCurrentSection(curSection) {
    if (!curSection) return true;
    const session = this.state && this.state.activeSession ? this.state.activeSession : {};
    const answers = session.answers || {};

    // 1. Tự động đồng bộ các ô input/textarea từ DOM vào answers nếu đang ở trên trình duyệt
    if (typeof document !== 'undefined') {
      const activeInputs = document.querySelectorAll('#app-root input[type="text"], #app-root textarea, #app-root input[type="number"], #app-root input[type="date"], #app-root input[type="time"]');
      activeInputs.forEach(inp => {
        const match = inp.id && inp.id.match(/^survey-answer-input-(.+)$/);
        if (match && match[1]) {
          const qId = match[1];
          if (!session.answers) session.answers = {};
          session.answers[qId] = inp.value;
        }
      });
      if (typeof this._saveActiveSessionToStorage === 'function') {
        this._saveActiveSessionToStorage();
      }
    }

    let firstError = null;
    const questions = curSection.questions || [];

    for (const q of questions) {
      if (['VIDEO_BLOCK', 'SECTION_HEADER', 'TEXT_BLOCK'].includes(q.type)) {
        continue;
      }

      const ans = answers[q.id];
      const isReq = q.is_required !== 0 && q.is_required !== false;
      let errorMsg = '';

      // a. Kiểm tra câu hỏi bắt buộc
      if (isReq) {
        if (q.type === 'CHOICE_GRID') {
          const rows = q.rows || [];
          const ansObj = (ans && typeof ans === 'object') ? ans : {};
          const unselectedRows = rows.filter(r => !ansObj[r]);
          if (unselectedRows.length > 0) {
            errorMsg = \`Vui lòng chọn phản hồi cho tất cả các hàng trong bảng ma trận (\${unselectedRows.length} hàng còn trống)!\`;
          }
        } else if (q.type === 'CHECKBOX_GRID') {
          const rows = q.rows || [];
          const ansObj = (ans && typeof ans === 'object') ? ans : {};
          const unselectedRows = rows.filter(r => !ansObj[r] || !Array.isArray(ansObj[r]) || ansObj[r].length === 0);
          if (unselectedRows.length > 0) {
            errorMsg = 'Vui lòng chọn ít nhất 1 ô cho mỗi hàng trong bảng ma trận!';
          }
        } else if (q.type === 'MULTIPLE_CHOICE') {
          if (!Array.isArray(ans) || ans.length === 0) {
            errorMsg = 'Vui lòng chọn ít nhất một lựa chọn!';
          }
        } else {
          if (ans === undefined || ans === null || String(ans).trim() === '') {
            errorMsg = 'Vui lòng trả lời câu hỏi bắt buộc này!';
          }
        }
      }

      // b. Kiểm tra ràng buộc định dạng (RestrictionEngine / Validation)
      if (!errorMsg && (ans !== undefined && ans !== null && String(ans).trim() !== '')) {
        const err = this.validateQuestionInput(q, ans);
        if (err) {
          errorMsg = typeof err === 'string' ? err : (err.error || 'Dữ liệu nhập không hợp lệ');
        }
      }

      // c. Đánh dấu giao diện lỗi hoặc gỡ bỏ (khi có DOM)
      if (typeof document !== 'undefined') {
        const errEl = document.getElementById(\`val-err-\${q.id}\`);
        const cardEl = document.getElementById(\`question-card-\${q.id}\`);
        const inputEl = document.getElementById(\`survey-answer-input-\${q.id}\`);

        if (errorMsg) {
          if (cardEl) cardEl.classList.add('ring-1', 'ring-red-500');
          if (inputEl) {
            inputEl.classList.add('border-red-500', 'bg-red-50/20', 'text-red-900', 'dark:text-red-200');
            inputEl.classList.remove('border-stone-200', 'dark:border-stone-700');
          }
          if (errEl) {
            errEl.innerHTML = \`<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-red-500 shrink-0"></i><span>\${this.escapeHtml ? this.escapeHtml(errorMsg) : errorMsg}</span>\`;
            errEl.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons({ root: errEl });
          }
          if (!firstError) {
            firstError = {
              q,
              msg: errorMsg,
              targetEl: cardEl || inputEl,
              inputEl: inputEl
            };
          }
        } else {
          if (cardEl) cardEl.classList.remove('ring-1', 'ring-red-500');
          if (inputEl) {
            inputEl.classList.remove('border-red-500', 'bg-red-50/20', 'text-red-900', 'dark:text-red-200');
            inputEl.classList.add('border-stone-200', 'dark:border-stone-700');
          }
          if (errEl) {
            errEl.textContent = '';
            errEl.classList.add('hidden');
          }
        }
      } else if (errorMsg && !firstError) {
        firstError = { q, msg: errorMsg };
      }
    }

    if (firstError) {
      if (typeof document !== 'undefined') {
        if (firstError.targetEl) {
          firstError.targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (firstError.inputEl && typeof firstError.inputEl.focus === 'function') {
          setTimeout(() => {
            try {
              firstError.inputEl.focus();
              if (typeof firstError.inputEl.select === 'function') firstError.inputEl.select();
            } catch (e) { }
          }, 200);
        }
      }
      if (typeof this.showToast === 'function') {
        this.showToast(firstError.msg || 'Vui lòng hoàn thành đầy đủ các câu hỏi bắt buộc!', 'warning');
      }
      return false;
    }

    return true;
  },

  // Phân giải mục tiêu rẽ nhánh sang chỉ số Section tương ứng
  resolveSectionTarget(rawTarget, sections) {
    if (!rawTarget || rawTarget === 'NEXT') return 'NEXT';
    let targetVal = rawTarget;
    if (typeof rawTarget === 'object' && rawTarget !== null) {
      if (rawTarget.action === 'SUBMIT' || rawTarget.target === 'SUBMIT') return 'SUBMIT';
      targetVal = rawTarget.target || rawTarget.action;
    }
    if (targetVal === 'SUBMIT') return 'SUBMIT';
    if (targetVal === 'NEXT') return 'NEXT';

    // Parse dạng số nguyên trực tiếp (0, 1, 2...)
    const parsed = parseInt(targetVal, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < sections.length && String(parsed) === String(targetVal)) {
      return parsed;
    }

    // Khớp theo ID của Section hoặc headerQuestionId
    const secIdx = sections.findIndex(sec => String(sec.id) === String(targetVal) || String(sec.headerQuestionId) === String(targetVal));
    if (secIdx !== -1) return secIdx;

    // Khớp nếu target là một question ID thuộc Section nào đó
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const foundQ = sections[sIdx].questions.some(q => String(q.id) === String(targetVal));
      if (foundQ) return sIdx;
    }

    return null;
  },

  // Điều hướng chuyển Section kế tiếp với Kiểm tra tính hợp lệ & Rẽ nhánh 2 Tầng (2-Tier Routing)
  async nextSection() {
    this.haptic('light');
    const session = this.state.activeSession;
    if (!session) return;
    if (session.isPacingLocked) {
      this.showToast('Vui lòng đọc kỹ câu hỏi (0.5s)', 'info');
      return;
    }

    const sections = this.buildSurveySections(session.questions);
    let curSectionIdx = session.currentSectionIndex || 0;
    if (curSectionIdx >= sections.length) {
      curSectionIdx = Math.max(0, sections.length - 1);
      session.currentSectionIndex = curSectionIdx;
    }
    const curSec = sections[curSectionIdx] || sections[0];

    // 1. Kiểm tra tính hợp lệ toàn bộ câu hỏi trong Section
    if (!this.validateCurrentSection(curSec)) {
      return;
    }

    // 2. Kiểm tra câu hỏi sàng lọc Screener nếu có trong Section
    for (const q of (curSec.questions || [])) {
      if (q.is_screener && q.qualifying_answer) {
        const ans = session.answers ? session.answers[q.id] : undefined;
        const isQualified = String(ans).trim().toLowerCase() === String(q.qualifying_answer).trim().toLowerCase();
        if (!isQualified) {
          await this.handleScreenOut(session.surveyId);
          return;
        }
      }
    }

    // 3. Đánh giá Điều Hướng Rẽ Nhánh 2 Tầng (2-Tier Routing)
    // Tầng 1: Option-level routing trong Section
    let branchAction = null;
    for (const q of (curSec.questions || [])) {
      if (['SINGLE_CHOICE', 'DROPDOWN'].includes(q.type) && q.logic && q.logic.enabled && q.logic.options) {
        const ans = session.answers ? session.answers[q.id] : undefined;
        if (ans !== undefined && ans !== null) {
          if (q.logic.options[ans] !== undefined) {
            branchAction = q.logic.options[ans];
            break;
          } else if (q.options) {
            const optIdx = q.options.findIndex(o => String(o).trim() === String(ans).trim());
            if (optIdx !== -1 && q.logic.options[optIdx] !== undefined) {
              branchAction = q.logic.options[optIdx];
              break;
            }
          }
        }
      }
    }

    if (branchAction) {
      const resolved = this.resolveSectionTarget(branchAction, sections);
      if (resolved === 'SUBMIT') {
        await this.submitSurvey();
        return;
      }
      if (typeof resolved === 'number') {
        session.sectionHistory = session.sectionHistory || [];
        session.sectionHistory.push(curSectionIdx);
        session.currentSectionIndex = resolved;
        this._saveActiveSessionToStorage();
        if (typeof this.triggerPacingLock === 'function') this.triggerPacingLock();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.renderTakeSurveyView(document.getElementById('app-root'), session.surveyId);
        return;
      }
    }

    // Tầng 2: Section defaultAction
    if (curSec.defaultAction && curSec.defaultAction !== 'NEXT') {
      const resolvedDef = this.resolveSectionTarget(curSec.defaultAction, sections);
      if (resolvedDef === 'SUBMIT') {
        await this.submitSurvey();
        return;
      }
      if (typeof resolvedDef === 'number') {
        session.sectionHistory = session.sectionHistory || [];
        session.sectionHistory.push(curSectionIdx);
        session.currentSectionIndex = resolvedDef;
        this._saveActiveSessionToStorage();
        if (typeof this.triggerPacingLock === 'function') this.triggerPacingLock();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.renderTakeSurveyView(document.getElementById('app-root'), session.surveyId);
        return;
      }
    }

    // Mặc định: Chuyển sang Section tiếp theo hoặc nộp bài nếu là Section cuối
    if (curSectionIdx < sections.length - 1) {
      session.sectionHistory = session.sectionHistory || [];
      session.sectionHistory.push(curSectionIdx);
      session.currentSectionIndex = curSectionIdx + 1;
      this._saveActiveSessionToStorage();
      if (typeof this.triggerPacingLock === 'function') this.triggerPacingLock();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.renderTakeSurveyView(document.getElementById('app-root'), session.surveyId);
    } else {
      await this.submitSurvey();
    }
  },

  // Điều hướng quay lại Section trước đó
  prevSection() {
    this.haptic('light');
    const session = this.state.activeSession;
    if (!session) return;
    
    if (session.sectionHistory && session.sectionHistory.length > 0) {
      session.currentSectionIndex = session.sectionHistory.pop();
    } else if ((session.currentSectionIndex || 0) > 0) {
      session.currentSectionIndex = (session.currentSectionIndex || 0) - 1;
    }
    this._saveActiveSessionToStorage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.renderTakeSurveyView(document.getElementById('app-root'), session.surveyId);
  },

  // Giữ nguyên các hàm alias để tương thích 100% với các mã gọi cũ
  async nextQuestion() {
    const session = this.state.activeSession;
    if (session && session.questions && session.questions[session.currentIndex]) {
      const curQ = session.questions[session.currentIndex];
      // Tự động đồng bộ câu trả lời từ DOM input/textarea nếu có (phòng ngừa độ trễ oninput hoặc autocomplete)
      const activeInput = document.querySelector('#app-root input[type="text"], #app-root textarea, #app-root input[type="number"], #app-root input[type="date"], #app-root input[type="time"]');
      if (activeInput && activeInput.value !== undefined && activeInput.value !== null) {
        if (['SHORT_TEXT', 'PARAGRAPH', 'OPEN_TEXT', 'DATE', 'TIME'].includes(curQ.type)) {
          if (!session.answers) session.answers = {};
          session.answers[curQ.id] = activeInput.value;
          this._saveActiveSessionToStorage();
        }
      }
    }
    return await this.nextSection();
  },

  prevQuestion() {
    return this.prevSection();
  },

  triggerPacingLock() {
    if (this.state.activeSession) {
      this.state.activeSession.isPacingLocked = true;
      setTimeout(() => {
        if (this.state.activeSession) {
          this.state.activeSession.isPacingLocked = false;
        }
      }, 300);
    }
  },
`;

content = content.slice(0, startIndex) + replacementCode + '\n  ' + content.slice(endIndex);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Đã cập nhật public/app.js thành công. Dung lượng mới:', content.length, 'bytes');
