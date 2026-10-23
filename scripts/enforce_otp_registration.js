const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

// 1. Thêm required vào ô nhập OTP trong form đăng ký
code = code.replace(
  `id="auth-reg-otp" maxlength="6" pattern="[0-9]{6}" placeholder="Nhập 6 số được gửi về email..."`,
  `id="auth-reg-otp" required maxlength="6" pattern="[0-9]{6}" placeholder="Nhập mã OTP 6 số bắt buộc..."`
);

// 2. Thêm kiểm tra OTP bắt buộc trong handleRegisterSubmit
const targetSubmit = `    const role = document.querySelector('input[name="auth-reg-role"]:checked')?.value || 'RESPONDENT';
    const otp = document.getElementById('auth-reg-otp')?.value?.trim();`;

const newSubmitValidation = `    const role = document.querySelector('input[name="auth-reg-role"]:checked')?.value || 'RESPONDENT';
    const otp = document.getElementById('auth-reg-otp')?.value?.trim();

    if (!otp || otp.length !== 6) {
      if (errorAlert && errorText) {
        errorText.textContent = 'Vui lòng bấm "Gửi mã" và nhập mã xác thực OTP 6 số gửi qua email của bạn';
        errorAlert.classList.remove('hidden');
      }
      this.showToast('Vui lòng bấm "Gửi mã" và nhập mã xác thực OTP 6 số', 'warning');
      const otpInput = document.getElementById('auth-reg-otp');
      if (otpInput) {
        otpInput.focus();
        otpInput.classList.add('ring-2', 'ring-rose-500');
        setTimeout(() => otpInput.classList.remove('ring-2', 'ring-rose-500'), 2500);
      }
      return;
    }`;

if (code.includes(targetSubmit)) {
  code = code.replace(targetSubmit, newSubmitValidation);
  console.log('✅ Đã thêm validation OTP bắt buộc phía client trong app.js');
}

fs.writeFileSync('public/app.js', code, 'utf8');
console.log('✅ Hoàn tất cập nhật validation OTP!');
