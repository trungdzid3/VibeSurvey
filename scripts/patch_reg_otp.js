const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

const target = '    const role = document.querySelector(\'input[name="auth-reg-role"]:checked\')?.value || \'RESPONDENT\';\n    const otp = document.getElementById(\'auth-reg-otp\')?.value?.trim();\n\n    if (submitBtn) {';

const replacement = `    const role = document.querySelector('input[name="auth-reg-role"]:checked')?.value || 'RESPONDENT';
    const otp = document.getElementById('auth-reg-otp')?.value?.trim();

    if (!otp) {
      if (errorAlert && errorText) {
        errorText.textContent = 'Vui lòng bấm "Gửi mã" và nhập mã xác thực OTP 6 số để tạo tài khoản';
        errorAlert.classList.remove('hidden');
      }
      const otpInput = document.getElementById('auth-reg-otp');
      if (otpInput) {
        otpInput.focus();
        otpInput.classList.add('ring-2', 'ring-red-500', 'border-red-500');
        setTimeout(() => otpInput.classList.remove('ring-2', 'ring-red-500', 'border-red-500'), 3000);
      }
      return;
    }

    if (submitBtn) {`;

const normalizedContent = content.replace(/\r\n/g, '\n');
if (normalizedContent.includes(target)) {
  const updated = normalizedContent.replace(target, replacement);
  fs.writeFileSync('public/app.js', updated, 'utf8');
  console.log('SUCCESS: Updated public/app.js');
} else {
  console.log('FAIL: target not found');
}
