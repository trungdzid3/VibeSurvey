const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'api.js');
let code = fs.readFileSync(apiPath, 'utf8');

if (!code.includes('warranty-claim')) {
  const target = "router.post('/surveys/:id/unpin', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.unpinSurvey(req, res));";
  const addition = "router.post('/surveys/:id/unpin', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.unpinSurvey(req, res));\r\nrouter.post('/surveys/:id/warranty-claim', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.claimWarranty(req, res));";
  code = code.replace(target, addition);
  fs.writeFileSync(apiPath, code, 'utf8');
  console.log('Đã thêm route warranty-claim thành công');
} else {
  console.log('Route warranty-claim đã có sẵn');
}
