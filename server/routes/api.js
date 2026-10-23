const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const surveyController = require('../controllers/surveyController');
const walletController = require('../controllers/walletController');
const voucherController = require('../controllers/voucherController');
const adminController = require('../controllers/adminController');
const { authenticateToken, optionalAuthenticateToken, requireRole } = require('../middlewares/auth');
const { checkIpBannedMiddleware } = require('../middlewares/ipBan');

// Chặn truy cập từ các địa chỉ IP bị cấm toàn cục
router.use(checkIpBannedMiddleware);

// === 1. Tuyến Đường Xác Thực & Hồ Sơ (Auth & Profile) ===
router.post('/auth/register', (req, res) => authController.register(req, res));
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

// === 2. Tuyến Đường Khảo Sát (Surveys) ===
// Hỗ trợ khách chưa đăng nhập vẫn xem được danh sách và nội dung khảo sát công khai
router.get('/surveys', optionalAuthenticateToken, (req, res) => surveyController.listSurveys(req, res));
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
router.post('/surveys/parse-external', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.parseExternalForm(req, res));
router.post('/surveys/:id/sponsor-vouchers', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.addSponsorVouchers(req, res));
router.post('/surveys/:id/boost-fast-track', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.boostFastTrack(req, res));
router.get('/notifications', authenticateToken, (req, res) => surveyController.getNotifications(req, res));
router.put('/notifications/:id/read', authenticateToken, (req, res) => surveyController.markNotificationAsRead(req, res));

// === 3. Tuyến Đường Ví & Tài Chính (Wallet & Payouts) ===
router.get('/wallet', authenticateToken, (req, res) => walletController.getWallet(req, res));
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
router.get('/admin/fraud-logs', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.listFraudLogs(req, res));
router.get('/admin/banned-ips', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.listBannedIps(req, res));
router.post('/admin/unban-ip', authenticateToken, requireRole(['ADMIN']), (req, res) => adminController.unbanIp(req, res));

module.exports = router;
