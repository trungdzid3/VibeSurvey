const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '..', 'server', 'routes', 'api.js');
let code = fs.readFileSync(routesPath, 'utf8');

// 1. Import bugReportController
if (!code.includes("bugReportController = require('../controllers/bugReportController')")) {
  code = code.replace(
    "const userController = require('../controllers/userController');",
    "const userController = require('../controllers/userController');\nconst bugReportController = require('../controllers/bugReportController');"
  );
}

// 2. Thêm các routes bug-reports
const bugRoutes = `
// === 7. Tuyến Đường Báo Cáo Sự Cố & Đăng Tải Lỗi (Bug Reports & Feedback) ===
router.post('/bug-reports', optionalAuthenticateToken, (req, res) => bugReportController.createBugReport(req, res));
router.get('/bug-reports/my', authenticateToken, (req, res) => bugReportController.getMyBugReports(req, res));
router.get('/admin/bug-reports', authenticateToken, requireRole(['ADMIN']), (req, res) => bugReportController.getAdminBugReports(req, res));
router.patch('/admin/bug-reports/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => bugReportController.updateBugReportStatus(req, res));
router.delete('/admin/bug-reports/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => bugReportController.deleteBugReport(req, res));

module.exports = router;`;

if (!code.includes('/bug-reports')) {
  code = code.replace('module.exports = router;', bugRoutes);
  fs.writeFileSync(routesPath, code, 'utf8');
  console.log('Successfully added bug report routes to server/routes/api.js!');
} else {
  console.log('Bug report routes already exist in server/routes/api.js');
}
