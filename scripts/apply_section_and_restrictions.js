const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

// 1. Cập nhật hàm generateValidationPlaceholder
const oldGenPlaceholder = `  generateValidationPlaceholder(v) {
    if (!v || !v.type || v.type === 'NONE') return '';
    if (v.type === 'EMAIL') return 'Vui lòng nhập email';
    if (v.type === 'URL') return 'Vui lòng nhập URL (VD: https://example.com)';
    if (v.type === 'NUMBER') {
      const rule = v.rule || 'IS_NUMBER';
      if (rule === 'BETWEEN') {
        const min = (v.min !== undefined && v.min !== null && String(v.min).trim() !== '') ? v.min : '20000000';
        const max = (v.max !== undefined && v.max !== null && String(v.max).trim() !== '') ? v.max : '20270000';
        return \`Số phải nằm trong khoảng từ \${min} ~ \${max}\`;
      }
      if (rule === 'GREATER_THAN') {
        const min = (v.min !== undefined && v.min !== null && String(v.min).trim() !== '') ? v.min : '0';
        return \`Số phải lớn hơn \${min}\`;
      }
      if (rule === 'LESS_THAN') {
        const max = (v.max !== undefined && v.max !== null && String(v.max).trim() !== '') ? v.max : '100';
        return \`Số phải nhỏ hơn \${max}\`;
      }
      return 'Giá trị phải là một số';
    }
    if (v.type === 'LENGTH') {
      const rule = v.rule || 'MAX_LENGTH';
      const len = (v.min !== undefined && v.min !== null && String(v.min).trim() !== '') ? v.min : ((v.max !== undefined && v.max !== null && String(v.max).trim() !== '') ? v.max : '100');
      if (rule === 'MIN_LENGTH') {
        return len ? \`Tối thiểu \${len} ký tự\` : 'Tối thiểu ký tự quy định';
      }
      return len ? \`Tối đa \${len} ký tự\` : 'Tối đa ký tự quy định';
    }
    return '';
  },`;

const newGenPlaceholder = `  generateValidationPlaceholder(v) {
    if (!v) return '';
    if (window.RestrictionEngine) {
      return window.RestrictionEngine.getMeta(v).placeholder || '';
    }
    return '';
  },

  validateQuestionInput(q, val) {
    if (!q) return { valid: true };
    const validation = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
    if (!validation || !validation.type || validation.type === 'NONE') {
      return { valid: true };
    }
    if (window.RestrictionEngine) {
      return window.RestrictionEngine.getMeta(validation).validate(val);
    }
    return { valid: true };
  },

  handleSurveyInputRealtime(qId, inputEl) {
    if (!inputEl) return;
    const val = inputEl.value;
    this.updateOpenText(qId, val);

    const session = this.state.activeSession;
    if (!session || !session.questions) return;
    const q = session.questions.find(item => item.id === qId);
    if (!q) return;

    const res = this.validateQuestionInput(q, val);
    const errEl = document.getElementById(\`val-err-\${qId}\`);

    if (!res.valid) {
      inputEl.classList.add('border-red-500', 'bg-red-50/20', 'text-red-900', 'dark:text-red-200');
      inputEl.classList.remove('border-stone-200', 'dark:border-stone-700');
      if (errEl) {
        errEl.innerHTML = \`<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-red-500 shrink-0"></i><span>\${this.escapeHtml(res.error)}</span>\`;
        errEl.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons({ root: errEl });
      }
    } else {
      inputEl.classList.remove('border-red-500', 'bg-red-50/20', 'text-red-900', 'dark:text-red-200');
      inputEl.classList.add('border-stone-200', 'dark:border-stone-700');
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.add('hidden');
      }
    }
  },`;

if (code.includes('generateValidationPlaceholder(v) {')) {
  // Thay thế đoạn cũ
  const regex = /generateValidationPlaceholder\(v\) \{[\s\S]*?return '';\s*\},/;
  code = code.replace(regex, newGenPlaceholder);
  console.log('Updated generateValidationPlaceholder & added validateQuestionInput + handleSurveyInputRealtime');
}

// 2. Cập nhật renderStudioQuestionBody cho SHORT_TEXT và PARAGRAPH
// Ô xem trước là disabled input phẳng chuẩn Microsoft Forms
const oldShortText = `    // 2. Trả lời ngắn
    if (q.type === 'SHORT_TEXT') {
      const val = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
      const ph = val?.placeholder || (val ? this.generateValidationPlaceholder(val) : '') || 'Văn bản câu trả lời ngắn (1 dòng)';
      return \`
        <div class="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 italic text-[11px]">
          \${this.escapeHtml(ph)}
        </div>
        \${this.renderStudioQuestionValidationConfig(q, qIdx)}
      \`;
    }

    // 3. Đoạn văn
    if (q.type === 'PARAGRAPH') {
      const val = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
      const ph = val?.placeholder || (val ? this.generateValidationPlaceholder(val) : '') || 'Văn bản câu trả lời dài (Nhiều dòng tự do)';
      return \`
        <div class="p-4 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 italic text-[11px]">
          \${this.escapeHtml(ph)}
        </div>
        \${this.renderStudioQuestionValidationConfig(q, qIdx)}
      \`;
    }`;

const newShortText = `    // 2. Trả lời ngắn (Chuẩn Microsoft Forms: input phẳng với placeholder mờ)
    if (q.type === 'SHORT_TEXT') {
      const val = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
      const ph = val?.placeholder || (val ? this.generateValidationPlaceholder(val) : '') || 'Văn bản câu trả lời ngắn';
      return \`
        <div class="space-y-2">
          <input type="text" disabled 
                 id="studio-preview-input-\${qIdx}"
                 placeholder="\${this.escapeHtml(ph)}"
                 class="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-900/40 text-stone-400 dark:text-stone-500 text-xs font-normal cursor-not-allowed select-none placeholder-stone-400 dark:placeholder-stone-500 shadow-2xs">
        </div>
        \${this.renderStudioQuestionValidationConfig(q, qIdx)}
      \`;
    }

    // 3. Đoạn văn (Chuẩn Microsoft Forms)
    if (q.type === 'PARAGRAPH') {
      const val = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null);
      const ph = val?.placeholder || (val ? this.generateValidationPlaceholder(val) : '') || 'Văn bản câu trả lời dài';
      return \`
        <div class="space-y-2">
          <textarea disabled 
                    id="studio-preview-input-\${qIdx}"
                    placeholder="\${this.escapeHtml(ph)}"
                    class="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-900/40 text-stone-400 dark:text-stone-500 text-xs font-normal cursor-not-allowed select-none placeholder-stone-400 dark:placeholder-stone-500 h-20 resize-none shadow-2xs"></textarea>
        </div>
        \${this.renderStudioQuestionValidationConfig(q, qIdx)}
      \`;
    }`;

if (code.includes(oldShortText)) {
  code = code.replace(oldShortText, newShortText);
  console.log('Updated SHORT_TEXT and PARAGRAPH preview inputs in Studio');
} else {
  console.warn('oldShortText pattern not strictly matched, checking alternate...');
}

fs.writeFileSync(appJsPath, code, 'utf8');
console.log('Saved partial update');
