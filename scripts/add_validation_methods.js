const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

const target = '  // Hàm kiểm tra tính hợp lệ toàn diện của Section hiện tại';
const methodsToAdd = `  // ==================== XÁC THỰC ĐỊNH DẠNG RÀNG BUỘC (RESTRICTION VALIDATION) ====================
  validateQuestionInput(q, val) {
    if (!q) return { valid: true };
    const validation = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
    const engine = (typeof window !== 'undefined' && window.RestrictionEngine) ? window.RestrictionEngine : (this.RestrictionEngine || null);
    if (!validation || !engine) return { valid: true };
    const meta = engine.getMeta(validation);
    if (meta && typeof meta.validate === 'function') {
      return meta.validate(val);
    }
    return { valid: true };
  },

  handleSurveyInputRealtime(qId, inputEl) {
    if (!inputEl) return;
    const session = this.state.activeSession;
    if (!session || !session.questions) return;
    const q = session.questions.find(item => String(item.id) === String(qId));
    if (!q) return;

    const val = inputEl.value;
    const res = this.validateQuestionInput(q, val);
    const errEl = document.getElementById(\`survey-error-\${qId}\`);

    if (!res.valid && val && String(val).trim() !== '') {
      inputEl.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
      inputEl.classList.remove('border-stone-200', 'dark:border-stone-700', 'focus:border-orange-500');
      if (errEl) {
        errEl.textContent = res.error || 'Giá trị không đúng định dạng';
        errEl.classList.remove('hidden');
      }
    } else {
      inputEl.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
      inputEl.classList.add('border-stone-200', 'dark:border-stone-700', 'focus:border-orange-500');
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.add('hidden');
      }
    }
  },

  `;

if (code.includes(target) && !code.includes('validateQuestionInput(q, val) {')) {
  code = code.replace(target, methodsToAdd + target);
  fs.writeFileSync('public/app.js', code, 'utf8');
  console.log('Added validateQuestionInput and handleSurveyInputRealtime');
} else {
  console.log('Target not found or already added');
}
