const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/routes/api.js');
let code = fs.readFileSync(filePath, 'utf8');

const newRoutes = `
// Cổng nạp tiền thật VietQR & Webhook đối soát ngân hàng tự động
router.post('/wallet/create-deposit-order', authenticateToken, (req, res) => walletController.createDepositOrder(req, res));
router.get('/wallet/deposit-orders/:orderCode', optionalAuthenticateToken, (req, res) => walletController.getDepositOrderByCode(req, res));
router.post('/wallet/payment-webhook', (req, res) => walletController.handlePaymentWebhook(req, res));
router.post('/wallet/simulate-payment-success', authenticateToken, (req, res) => walletController.simulatePaymentSuccess(req, res));
`;

if (!code.includes('/wallet/create-deposit-order')) {
  code = code.replace(
    "router.post('/wallet/deposit',",
    newRoutes + "router.post('/wallet/deposit',"
  );
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully added payment routes to server/routes/api.js');
} else {
  console.log('Payment routes already in server/routes/api.js');
}
