const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');
let code = fs.readFileSync(appJsPath, 'utf8');

// 1. Thêm RestrictionEngine vào trước window.VibeApp
const restrictionEngineCode = `
// ==============================================================
// RESTRICTION & VALIDATION ENGINE (CHUẨN MICROSOFT / GOOGLE FORMS)
// ==============================================================
window.RestrictionEngine = {
  getMeta(restriction) {
    if (!restriction || !restriction.type || restriction.type === 'NONE') {
      return { placeholder: '', defaultError: '', validate: () => ({ valid: true }) };
    }

    const type = String(restriction.type).toUpperCase();
    if (type === 'EMAIL') {
      const msg = 'Vui lòng nhập email';
      return {
        placeholder: msg,
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
      const min = (restriction.min !== undefined && restriction.min !== null && String(restriction.min).trim() !== '') ? parseFloat(restriction.min) : null;
      const max = (restriction.max !== undefined && restriction.max !== null && String(restriction.max).trim() !== '') ? parseFloat(restriction.max) : null;

      if (rule === 'BETWEEN') {
        const minVal = min !== null ? min : 20000000;
        const maxVal = max !== null ? max : 20270000;
        const msg = \`Số phải nằm trong khoảng từ \${minVal} ~ \${maxVal}\`;
        return {
          placeholder: msg,
          defaultError: msg,
          validate: (val) => {
            if (!val || String(val).trim() === '') return { valid: true };
            const n = Number(String(val).trim());
            if (isNaN(n) || String(val).trim() === '') {
              return { valid: false, error: 'Giá trị phải là một số' };
            }
            const isValid = n >= minVal && n <= maxVal;
            return { valid: isValid, error: isValid ? '' : msg };
          }
        };
      }

      if (rule === 'GREATER_THAN') {
        const minVal = min !== null ? min : 0;
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
        const maxVal = max !== null ? max : 100;
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
      const limit = parseInt(restriction.min || restriction.max || 100, 10) || 100;
      const isMin = rule === 'MIN_LENGTH';
      const msg = isMin ? \`Độ dài ký tự tối thiểu là \${limit}\` : \`Độ dài ký tự tối đa là \${limit}\`;
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
      const msg = 'Vui lòng nhập URL hợp lệ';
      return {
        placeholder: msg,
        defaultError: msg,
        validate: (val) => {
          if (!val || String(val).trim() === '') return { valid: true };
          try {
            const parsed = new URL(String(val).trim());
            const isValid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
            return { valid: isValid, error: isValid ? '' : msg };
          } catch {
            return { valid: false, error: msg };
          }
        }
      };
    }

    return { placeholder: '', defaultError: '', validate: () => ({ valid: true }) };
  }
};
`;

if (!code.includes('window.RestrictionEngine =')) {
  code = code.replace('window.VibeApp = window.VibeApp || {};', `${restrictionEngineCode}\nwindow.VibeApp = window.VibeApp || {};`);
  console.log('Added RestrictionEngine to app.js');
}

fs.writeFileSync(appJsPath, code, 'utf8');
console.log('File app.js saved successfully');
