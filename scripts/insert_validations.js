const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

const target = '  validateCurrentSection(curSection) {';

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
    const session = this.state && this.state.activeSession;
    if (!session || !session.questions) return;
    const q = session.questions.find(item => String(item.id) === String(qId));
    if (!q) return;

    const val = inputEl.value;
    const res = this.validateQuestionInput(q, val);
    const errEl = document.getElementById(\`val-err-\${qId}\`) || document.getElementById(\`survey-error-\${qId}\`);

    if (!res.valid && val && String(val).trim() !== '') {
      inputEl.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
      inputEl.classList.remove('border-stone-200', 'dark:border-stone-700', 'focus:border-orange-500');
      if (errEl) {
        errEl.innerHTML = \`<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-red-500 shrink-0"></i><span>\${res.error || 'Giá trị không đúng định dạng'}</span>\`;
        errEl.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons({ root: errEl });
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
  console.log('Successfully inserted validation methods before validateCurrentSection');
} else {
  console.log('Already exists or target not found');
}
