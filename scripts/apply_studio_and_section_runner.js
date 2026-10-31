const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

// 1. Tái thiết kế renderStudioQuestionValidationConfig thành thanh Action Bar phẳng chuẩn Microsoft Forms
const oldValConfig = `  renderStudioQuestionValidationConfig(q, qIdx) {
    const val = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null) || { type: 'NONE' };
    const valType = val.type || 'NONE';
    const valRule = val.rule || (valType === 'NUMBER' ? 'IS_NUMBER' : (valType === 'LENGTH' ? 'MAX_LENGTH' : ''));
    const valMin = (val.min !== undefined && val.min !== null) ? val.min : '';
    const valMax = (val.max !== undefined && val.max !== null) ? val.max : '';
    const autoPlaceholder = val.placeholder || this.generateValidationPlaceholder(val);

    return \`
      <div class="mt-3 p-3.5 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
            <i data-lucide="shield-check" class="w-3.5 h-3.5 text-orange-600"></i>
            <span>Giới hạn (Restrictions):</span>
          </div>
          <select onclick="event.stopPropagation()" 
                  onchange="VibeApp.setStudioQuestionValidationType(\${qIdx}, this.value)" 
                  class="h-7 px-2.5 text-xs font-medium bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-200 focus:border-orange-500 focus:outline-none">
            <option value="NONE" \${valType === 'NONE' ? 'selected' : ''}>Không giới hạn</option>
            <option value="EMAIL" \${valType === 'EMAIL' ? 'selected' : ''}>Email</option>
            <option value="NUMBER" \${valType === 'NUMBER' ? 'selected' : ''}>Số</option>
            <option value="URL" \${valType === 'URL' ? 'selected' : ''}>URL</option>
            <option value="LENGTH" \${valType === 'LENGTH' ? 'selected' : ''}>Độ dài</option>
          </select>
        </div>

        \${valType === 'NUMBER' ? \`
          <div class="pt-2 border-t border-stone-200/70 dark:border-stone-800 flex flex-wrap items-center gap-2 text-xs">
            <span class="text-[11px] font-bold text-stone-500">Điều kiện:</span>
            <select onclick="event.stopPropagation()" 
                    onchange="VibeApp.setStudioQuestionValidationRule(\${qIdx}, this.value)" 
                    class="h-7 px-2 text-xs font-medium bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-200 focus:border-orange-500 focus:outline-none">
              <option value="IS_NUMBER" \${valRule === 'IS_NUMBER' ? 'selected' : ''}>Là số</option>
              <option value="BETWEEN" \${valRule === 'BETWEEN' ? 'selected' : ''}>Trong khoảng</option>
              <option value="GREATER_THAN" \${valRule === 'GREATER_THAN' ? 'selected' : ''}>Lớn hơn</option>
              <option value="LESS_THAN" \${valRule === 'LESS_THAN' ? 'selected' : ''}>Nhỏ hơn</option>
            </select>

            \${valRule === 'BETWEEN' ? \`
              <div class="flex items-center gap-1.5 flex-wrap">
                <input type="number" value="\${valMin}" 
                       onclick="event.stopPropagation()"
                       oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, this.value, document.getElementById('val-max-\${qIdx}') ? document.getElementById('val-max-\${qIdx}').value : '')"
                       id="val-min-\${qIdx}"
                       placeholder="Min (VD: 20000000)"
                       class="w-32 h-7 px-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none">
                <span class="text-stone-400 text-xs">đến</span>
                <input type="number" value="\${valMax}" 
                       onclick="event.stopPropagation()"
                       oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, document.getElementById('val-min-\${qIdx}') ? document.getElementById('val-min-\${qIdx}').value : '', this.value)"
                       id="val-max-\${qIdx}"
                       placeholder="Max (VD: 20270000)"
                       class="w-32 h-7 px-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none">
              </div>
            \` : ''}

            \${valRule === 'GREATER_THAN' ? \`
              <div class="flex items-center gap-1.5">
                <span class="text-stone-400 text-xs">></span>
                <input type="number" value="\${valMin}" 
                       onclick="event.stopPropagation()"
                       oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, this.value, null)"
                       placeholder="Min"
                       class="w-28 h-7 px-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none">
              </div>
            \` : ''}

            \${valRule === 'LESS_THAN' ? \`
              <div class="flex items-center gap-1.5">
                <span class="text-stone-400 text-xs"><</span>
                <input type="number" value="\${valMax}" 
                       onclick="event.stopPropagation()"
                       oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, null, this.value)"
                       placeholder="Max"
                       class="w-28 h-7 px-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none">
              </div>
            \` : ''}
          </div>
        \` : ''}

        \${valType === 'LENGTH' ? \`
          <div class="pt-2 border-t border-stone-200/70 dark:border-stone-800 flex flex-wrap items-center gap-2 text-xs">
            <span class="text-[11px] font-bold text-stone-500">Quy tắc độ dài:</span>
            <select onclick="event.stopPropagation()" 
                    onchange="VibeApp.setStudioQuestionValidationRule(\${qIdx}, this.value)" 
                    class="h-7 px-2 text-xs font-medium bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-200 focus:border-orange-500 focus:outline-none">
              <option value="MAX_LENGTH" \${valRule === 'MAX_LENGTH' ? 'selected' : ''}>Tối đa ký tự</option>
              <option value="MIN_LENGTH" \${valRule === 'MIN_LENGTH' ? 'selected' : ''}>Tối thiểu ký tự</option>
            </select>
            <input type="number" value="\${valMin || valMax}" 
                   onclick="event.stopPropagation()"
                   oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, this.value, this.value)"
                   placeholder="Số ký tự (VD: 100)"
                   class="w-28 h-7 px-2 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none">
          </div>
        \` : ''}

        \${valType !== 'NONE' ? \`
          <div class="pt-1 text-[11px] text-stone-500 flex items-center gap-1.5">
            <span>Gợi ý mẫu:</span>
            <span id="validation-preview-\${qIdx}" class="italic text-stone-700 dark:text-stone-300 font-medium">"\${autoPlaceholder}"</span>
          </div>
        \` : ''}
      </div>
    \`;
  },`;

const newValConfig = `  renderStudioQuestionValidationConfig(q, qIdx) {
    const val = q.validation || (q.logic && q.logic.validation ? q.logic.validation : null) || { type: 'NONE' };
    const valType = val.type || 'NONE';
    const valRule = val.rule || (valType === 'NUMBER' ? 'IS_NUMBER' : (valType === 'LENGTH' ? 'MAX_LENGTH' : ''));
    const valMin = (val.min !== undefined && val.min !== null) ? val.min : '';
    const valMax = (val.max !== undefined && val.max !== null) ? val.max : '';

    return \`
      <!-- Thanh Giới Hạn phẳng chuẩn Microsoft Forms (Hình 1, 2, 3) -->
      <div class="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center gap-2 text-xs" onclick="event.stopPropagation()">
        <span class="text-stone-500 dark:text-stone-400 font-medium text-xs">Giới hạn</span>
        
        <!-- Dropdown Cấp 1: Số, Văn bản, Độ dài, Email, URL -->
        <div class="relative inline-block">
          <select onchange="VibeApp.setStudioQuestionValidationType(\${qIdx}, this.value)" 
                  class="h-8 px-2.5 pr-7 text-xs font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none appearance-none cursor-pointer hover:border-stone-300 transition-colors shadow-2xs">
            <option value="NONE" \${valType === 'NONE' ? 'selected' : ''}>Không có</option>
            <option value="NUMBER" \${valType === 'NUMBER' ? 'selected' : ''}>Số</option>
            <option value="TEXT" \${valType === 'TEXT' ? 'selected' : ''}>Văn bản</option>
            <option value="LENGTH" \${valType === 'LENGTH' ? 'selected' : ''}>Độ dài</option>
            <option value="EMAIL" \${valType === 'EMAIL' ? 'selected' : ''}>Email</option>
            <option value="URL" \${valType === 'URL' ? 'selected' : ''}>URL</option>
          </select>
          <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>

        <!-- Dropdown Cấp 2 khi chọn Số: Là số, Trong khoảng, Lớn hơn, Nhỏ hơn -->
        \${valType === 'NUMBER' ? \`
          <div class="relative inline-block">
            <select onchange="VibeApp.setStudioQuestionValidationRule(\${qIdx}, this.value)" 
                    class="h-8 px-2.5 pr-7 text-xs font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none appearance-none cursor-pointer hover:border-stone-300 transition-colors shadow-2xs">
              <option value="IS_NUMBER" \${valRule === 'IS_NUMBER' ? 'selected' : ''}>Là số</option>
              <option value="BETWEEN" \${valRule === 'BETWEEN' ? 'selected' : ''}>Trong khoảng</option>
              <option value="GREATER_THAN" \${valRule === 'GREATER_THAN' ? 'selected' : ''}>Lớn hơn</option>
              <option value="LESS_THAN" \${valRule === 'LESS_THAN' ? 'selected' : ''}>Nhỏ hơn</option>
            </select>
            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>

          \${valRule === 'BETWEEN' ? \`
            <div class="inline-flex items-center gap-1.5">
              <input type="number" value="\${valMin}" 
                     oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, this.value, document.getElementById('val-max-\${qIdx}') ? document.getElementById('val-max-\${qIdx}').value : '')"
                     id="val-min-\${qIdx}"
                     placeholder="20000000"
                     class="w-28 h-8 px-2.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none shadow-2xs">
              <span class="text-stone-400 text-xs">đến</span>
              <input type="number" value="\${valMax}" 
                     oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, document.getElementById('val-min-\${qIdx}') ? document.getElementById('val-min-\${qIdx}').value : '', this.value)"
                     id="val-max-\${qIdx}"
                     placeholder="20270000"
                     class="w-28 h-8 px-2.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none shadow-2xs">
            </div>
          \` : ''}

          \${valRule === 'GREATER_THAN' ? \`
            <input type="number" value="\${valMin}" 
                   oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, this.value, null)"
                   placeholder="Giá trị tối thiểu"
                   class="w-28 h-8 px-2.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none shadow-2xs">
          \` : ''}

          \${valRule === 'LESS_THAN' ? \`
            <input type="number" value="\${valMax}" 
                   oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, null, this.value)"
                   placeholder="Giá trị tối đa"
                   class="w-28 h-8 px-2.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none shadow-2xs">
          \` : ''}
        \` : ''}

        <!-- Dropdown Cấp 2 khi chọn Độ dài -->
        \${valType === 'LENGTH' ? \`
          <div class="relative inline-block">
            <select onchange="VibeApp.setStudioQuestionValidationRule(\${qIdx}, this.value)" 
                    class="h-8 px-2.5 pr-7 text-xs font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none appearance-none cursor-pointer hover:border-stone-300 transition-colors shadow-2xs">
              <option value="MAX_LENGTH" \${valRule === 'MAX_LENGTH' ? 'selected' : ''}>Tối đa ký tự</option>
              <option value="MIN_LENGTH" \${valRule === 'MIN_LENGTH' ? 'selected' : ''}>Tối thiểu ký tự</option>
            </select>
            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
          <input type="number" value="\${valMin || valMax || '100'}" 
                 oninput="VibeApp.setStudioQuestionValidationRange(\${qIdx}, this.value, this.value)"
                 placeholder="100"
                 class="w-24 h-8 px-2.5 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:border-orange-500 focus:outline-none shadow-2xs">
        \` : ''}
      </div>
    \`;
  },`;

if (code.includes('renderStudioQuestionValidationConfig(q, qIdx) {')) {
  const regex = /renderStudioQuestionValidationConfig\(q, qIdx\) \{[\s\S]*?return \`[\s\S]*?\`;\s*\},/;
  code = code.replace(regex, newValConfig);
  console.log('Updated renderStudioQuestionValidationConfig to Flat Action Bar');
}

// 2. Cập nhật setStudioQuestionValidationType để tự động update placeholder vào ô input preview
const oldSetType = `  setStudioQuestionValidationType(qIdx, type) {
    this.haptic('light');
    const q = this.state.builderQuestions && this.state.builderQuestions[qIdx];
    if (!q) return;
    if (!q.validation) q.validation = {};
    q.validation.type = type;
    if (type === 'NUMBER') {
      if (!['IS_NUMBER', 'BETWEEN', 'GREATER_THAN', 'LESS_THAN'].includes(q.validation.rule)) {
        q.validation.rule = 'IS_NUMBER';
      }
    } else if (type === 'LENGTH') {
      if (!['MAX_LENGTH', 'MIN_LENGTH'].includes(q.validation.rule)) {
        q.validation.rule = 'MAX_LENGTH';
      }
      if (!q.validation.min && !q.validation.max) {
        q.validation.min = '100';
        q.validation.max = '100';
      }
    }
    q.validation.placeholder = this.generateValidationPlaceholder(q.validation);
    if (!q.logic) q.logic = {};
    q.logic.validation = { ...q.validation };
    this.refreshStudioQuestionsView();
  },`;

const newSetType = `  setStudioQuestionValidationType(qIdx, type) {
    this.haptic('light');
    const q = this.state.builderQuestions && this.state.builderQuestions[qIdx];
    if (!q) return;
    if (!q.validation) q.validation = {};
    q.validation.type = type;
    if (type === 'NUMBER') {
      if (!['IS_NUMBER', 'BETWEEN', 'GREATER_THAN', 'LESS_THAN'].includes(q.validation.rule)) {
        q.validation.rule = 'IS_NUMBER';
      }
    } else if (type === 'LENGTH') {
      if (!['MAX_LENGTH', 'MIN_LENGTH'].includes(q.validation.rule)) {
        q.validation.rule = 'MAX_LENGTH';
      }
      if (!q.validation.min && !q.validation.max) {
        q.validation.min = '100';
        q.validation.max = '100';
      }
    }
    q.validation.placeholder = this.generateValidationPlaceholder(q.validation);
    if (!q.logic) q.logic = {};
    q.logic.validation = { ...q.validation };
    this.refreshStudioQuestionsView();
  },`;

fs.writeFileSync(appJsPath, code, 'utf8');
console.log('Saved studio changes');
