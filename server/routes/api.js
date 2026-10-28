const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const surveyController = require('../controllers/surveyController');
const walletController = require('../controllers/walletController');
const voucherController = require('../controllers/voucherController');
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const { authenticateToken, optionalAuthenticateToken, requireRole } = require('../middlewares/auth');
const { checkIpBannedMiddleware } = require('../middlewares/ipBan');

// Chặn truy cập từ các địa chỉ IP bị cấm toàn cục
router.use(checkIpBannedMiddleware);

// === 1. Tuyến Đường Xác Thực & Hồ Sơ (Auth & Profile) ===
router.post('/auth/register', (req, res) => authController.register(req, res));
router.post('/auth/send-registration-otp', (req, res) => authController.sendRegistrationOtp(req, res));
router.post('/auth/login', (req, res) => authController.login(req, res));
router.post('/auth/google-auth', (req, res) => authController.googleAuth(req, res));
router.get('/auth/google', (req, res) => authController.initiateGoogleOAuth(req, res));
router.get('/auth/google/callback', (req, res) => authController.handleGoogleOAuthCallback(req, res));
router.get('/auth/me', authenticateToken, (req, res) => authController.getMe(req, res));
router.put('/auth/profile', authenticateToken, (req, res) => authController.updateProfile(req, res));
router.post('/auth/link-google', authenticateToken, (req, res) => authController.linkGoogle(req, res));
router.post('/auth/verify-email', authenticateToken, (req, res) => authController.verifyEmail(req, res));
router.post('/auth/send-verification-otp', authenticateToken, (req, res) => authController.sendVerificationOtp(req, res));
router.post('/auth/verify-email-otp', authenticateToken, (req, res) => authController.verifyEmailOtp(req, res));
router.post('/auth/student/send-otp', authenticateToken, (req, res) => authController.sendStudentEmailOtp(req, res));
router.post('/auth/student/verify-otp', authenticateToken, (req, res) => authController.verifyStudentEmailOtp(req, res));
router.put('/auth/profile/demographics', authenticateToken, (req, res) => authController.updateDemographicProfile(req, res));
router.post('/auth/profile/demographics', authenticateToken, (req, res) => authController.updateDemographicProfile(req, res));
router.post('/auth/enterprise/profile', authenticateToken, (req, res) => authController.registerEnterpriseProfile(req, res));
router.put('/auth/enterprise/profile', authenticateToken, (req, res) => authController.registerEnterpriseProfile(req, res));
router.post('/auth/enterprise-profile', authenticateToken, (req, res) => authController.registerEnterpriseProfile(req, res));
router.put('/auth/enterprise-profile', authenticateToken, (req, res) => authController.registerEnterpriseProfile(req, res));

// === Tuyến Đường Điểm Danh Hàng Ngày & Chuỗi Ngày (Daily Streaks Gamification) ===
router.get('/users/streak-info', authenticateToken, (req, res) => userController.getStreakInfo(req, res));
router.post('/users/checkin', authenticateToken, (req, res) => userController.checkin(req, res));

// === 2. Tuyến Đường Khảo Sát (Surveys) ===
// Hỗ trợ khách chưa đăng nhập vẫn xem được danh sách và nội dung khảo sát công khai
router.get('/surveys', optionalAuthenticateToken, (req, res) => surveyController.listSurveys(req, res));
router.get('/surveys/velocity-benchmark', optionalAuthenticateToken, (req, res) => surveyController.getVelocityBenchmark(req, res));
router.get('/surveys/:id', optionalAuthenticateToken, (req, res) => surveyController.getSurvey(req, res));
router.post('/surveys', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.createSurvey(req, res));
router.put('/surveys/:id', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.updateSurvey(req, res));
router.patch('/surveys/:id', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.updateSurvey(req, res));
router.post('/surveys/:id/publish', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.publishSurvey(req, res));
router.post('/surveys/:id/start-session', authenticateToken, requireRole(['RESPONDENT', 'ADMIN']), (req, res) => surveyController.startSession(req, res));
router.post('/surveys/:id/submit', authenticateToken, requireRole(['RESPONDENT', 'ADMIN']), (req, res) => surveyController.submitSurvey(req, res));
router.post('/surveys/:id/screen-out', authenticateToken, requireRole(['RESPONDENT', 'ADMIN']), (req, res) => surveyController.screenOut(req, res));
router.get('/surveys/:id/analytics', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.getAnalytics(req, res));
router.get('/surveys/:id/export', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.exportSurveyData(req, res));
router.post('/surveys/:id/close', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.closeSurvey(req, res));
router.delete('/surveys/:id', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.deleteSurvey(req, res));
router.post('/surveys/parse-external', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.parseExternalForm(req, res));
router.post('/surveys/:id/sponsor-vouchers', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.addSponsorVouchers(req, res));
router.post('/surveys/:id/boost-fast-track', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.boostFastTrack(req, res));
router.post('/surveys/:id/pin', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.pinSurvey(req, res));
router.post('/surveys/:id/unpin', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.unpinSurvey(req, res));
router.post('/surveys/:id/warranty-claim', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.claimWarranty(req, res));
router.get('/notifications', authenticateToken, (req, res) => surveyController.getNotifications(req, res));
router.put('/notifications/:id/read', authenticateToken, (req, res) => surveyController.markNotificationAsRead(req, res));
router.post('/notifications/subscribe-push', optionalAuthenticateToken, (req, res) => surveyController.subscribePushNotification(req, res));
router.post('/notifications/unsubscribe-push', optionalAuthenticateToken, (req, res) => surveyController.unsubscribePushNotification(req, res));
router.get('/notifications/unread-count', authenticateToken, (req, res) => surveyController.getUnreadNotificationCount(req, res));
router.put('/notifications/read-all', authenticateToken, (req, res) => surveyController.markAllNotificationsAsRead(req, res));
router.get('/notifications/realtime-alerts', optionalAuthenticateToken, (req, res) => surveyController.getRealtimeAlerts(req, res));

// === 3. Tuyến Đường Ví & Tài Chính (Wallet & Payouts) ===
router.get('/wallet', authenticateToken, (req, res) => walletController.getWallet(req, res));

// Cổng nạp tiền thật VietQR & Webhook đối soát ngân hàng tự động
router.post('/wallet/create-deposit-order', authenticateToken, (req, res) => walletController.createDepositOrder(req, res));
router.get('/wallet/deposit-orders/:orderCode', optionalAuthenticateToken, (req, res) => walletController.getDepositOrderByCode(req, res));
router.post('/wallet/payment-webhook', (req, res) => walletController.handlePaymentWebhook(req, res));
router.post('/wallet/simulate-payment-success', authenticateToken, (req, res) => walletController.simulatePaymentSuccess(req, res));
router.post('/wallet/deposit', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => walletController.depositCredit(req, res));
router.post('/wallet/payouts', authenticateToken, requireRole(['RESPONDENT', 'ADMIN']), (req, res) => walletController.requestPayout(req, res));
router.get('/wallet/payouts', authenticateToken, (req, res) => walletController.getPayouts(req, res));
router.post('/wallet/swap-points', authenticateToken, (req, res) => walletController.swapPointsToCredit(req, res));
router.post('/wallet/swap-to-credit', authenticateToken, (req, res) => walletController.swapPointsToCredit(req, res));
router.post('/wallet/vat-invoices', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => walletController.requestVatInvoice(req, res));
router.get('/wallet/vat-invoices', authenticateToken, (req, res) => walletController.getVatInvoices(req, res));

// === 4. Tuyến Đường Chợ Voucher & Ví Voucher ===
router.get('/vouchers/catalog', (req, res) => voucherController.getCatalog(req, res));
router.post('/vouchers/catalog/:id/redeem', authenticateToken, requireRole(['RESPONDENT', 'ADMIN']), (req, res) => voucherController.redeemCatalog(req, res));
router.post('/vouchers/redeem', authenticateToken, requireRole(['RESPONDENT', 'ADMIN']), (req, res) => voucherController.redeemVoucher(req, res));
router.post('/vouchers/sponsor-upload', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => voucherController.uploadSponsorVouchers(req, res));
router.get('/vouchers/my-vouchers', authenticateToken, (req, res) => voucherController.getMyVouchers(req, res));

// === 5. Tuyến Đường Quản Trị Hệ Thống (Admin) ===
router.get('/admin/overview', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.getOverview(req, res));
router.get('/admin/payouts', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.listPayouts(req, res));
router.post('/admin/payouts/:id/action', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.handlePayout(req, res));
router.get('/admin/fraud-stats', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.getFraudStats(req, res));
router.get('/admin/fraud-logs', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.listFraudLogs(req, res));
router.get('/admin/banned-ips', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.listBannedIps(req, res));
router.post('/admin/unban-ip', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.unbanIp(req, res));
router.get('/admin/users/search', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.searchUsers(req, res));
router.post('/admin/users/:id/unban', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.unbanUser(req, res));
router.post('/admin/execute-command', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.executeCommand(req, res));
router.post('/admin/switch-tier', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.switchAdminTier(req, res));

// === 6. Tuyến Đường Tải Ảnh Siêu Nhẹ (Lightweight Image Upload) ===
router.post('/upload/image', optionalAuthenticateToken, (req, res) => surveyController.uploadImage(req, res));


module.exports = router;
