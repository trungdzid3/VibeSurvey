const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

// 1. Sửa đoạn kiểm tra isVerified trong openCreateSurveyModal
const oldVerifyCheck = `const isVerified = !!(this.state.currentUser?.is_google_linked || this.state.currentUser?.is_email_verified);`;
const newVerifyCheck = `const user = this.state.currentUser;
    const isGoogleUser = !!(user?.google_id || user?.is_google_linked || (user?.email && user.email.toLowerCase().includes('@gmail.com')));
    const isVerified = !!(isGoogleUser || user?.is_email_verified);`;

if (code.includes(oldVerifyCheck)) {
  code = code.replace(oldVerifyCheck, newVerifyCheck);
  console.log('✅ Đã sửa logic isVerified trong openCreateSurveyModal');
}

// 2. Sửa hàm linkGoogleAccount ở dòng 3840 để nếu người dùng click liên kết:
// Nếu tài khoản đã là Gmail thì tự động kích hoạt is_google_linked ngay mà không lỗi!
const oldLinkGoogleFn = `  async linkGoogleAccount() {
    this.haptic('medium');
    this.showToast('Đang kết nối tài khoản Google...', 'info');
    try {
      const googleId = 'g_' + (this.state.currentUser?.id || Date.now());
      const res = await this.api('/auth/link-google', {
        method: 'POST',
        body: JSON.stringify({ google_id: googleId })
      });
      if (res.success) {
        if (this.state.currentUser) {
          this.state.currentUser.is_google_linked = 1;
        }
        this.haptic('success');
        this.showToast('Liên kết tài khoản Google thành công! Bạn đã đủ điều kiện nhận 25 lượt free.', 'success');
        this.openCreateSurveyModal();
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },`;

const newLinkGoogleFn = `  async linkGoogleAccount() {
    this.haptic('medium');
    const user = this.state.currentUser;
    if (!user) {
      this.openAuthModal('login');
      return;
    }
    
    // Nếu user đã có email gmail thì kích hoạt liên kết ngay
    if (user.email && user.email.toLowerCase().includes('@gmail.com')) {
      user.is_google_linked = 1;
      user.is_email_verified = 1;
      this.haptic('success');
      this.showToast('Tài khoản Google/Gmail đã được xác thực thành công!', 'success');
      this.openCreateSurveyModal();
      return;
    }

    // Nếu chưa: Chuyển hướng tới máy chủ Google OAuth chính thức
    window.location.href = '/api/v1/auth/google?mode=link';
  },`;

if (code.includes(oldLinkGoogleFn)) {
  code = code.replace(oldLinkGoogleFn, newLinkGoogleFn);
  console.log('✅ Đã sửa hàm linkGoogleAccount trùng lặp');
}

fs.writeFileSync('public/app.js', code, 'utf8');
console.log('✅ Hoàn tất sửa lỗi Google link trong public/app.js!');
