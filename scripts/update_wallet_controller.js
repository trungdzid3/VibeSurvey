const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/controllers/walletController.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Thêm các method mới trước dấu đóng class cuối cùng
const newMethods = `
  createDepositOrder(req, res) {
    try {
      const user = req.user;
      const { amount_vnd } = req.body;
      const amount = parseInt(amount_vnd, 10);
      if (isNaN(amount) || amount < 20000 || amount > 1000000000) {
        return res.status(400).json({ success: false, message: 'Số tiền nạp tối thiểu là 20,000 VNĐ và tối đa 1,000,000,000 VNĐ' });
      }

      const order = ledgerService.createDepositOrder(user.id, amount);
      return res.status(201).json({
        success: true,
        message: 'Tạo đơn nạp tiền VietQR thành công',
        ...order
      });
    } catch (err) {
      console.error('Lỗi createDepositOrder:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  getDepositOrderByCode(req, res) {
    try {
      const { orderCode } = req.params;
      const userId = req.user ? req.user.id : null;
      const order = ledgerService.getDepositOrderByCode(orderCode, userId);
      return res.json({
        success: true,
        order
      });
    } catch (err) {
      console.error('Lỗi getDepositOrderByCode:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  handlePaymentWebhook(req, res) {
    try {
      const payload = req.body;
      const result = ledgerService.handlePaymentWebhook(payload);
      return res.json(result);
    } catch (err) {
      console.error('Lỗi handlePaymentWebhook:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  simulatePaymentSuccess(req, res) {
    try {
      const { order_code } = req.body;
      if (!order_code) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp order_code' });
      }
      const userId = req.user ? req.user.id : null;
      const result = ledgerService.simulatePaymentSuccess(order_code, userId);
      return res.json(result);
    } catch (err) {
      console.error('Lỗi simulatePaymentSuccess:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
`;

// 2. Cập nhật message của requestPayout
const oldRequestPayoutReturn = `      return res.status(201).json({
        success: true,
        message: 'Đã tạo yêu cầu rút thưởng thành công. Tiền/Thẻ sẽ được chuyển sau khi hệ thống phê duyệt.',
        payoutId: result.payoutId,
        netAmountVnd: result.netAmountVnd,
        feeVnd: result.feeVnd,
        newPointBalance: result.newPointBalance
      });`;

const newRequestPayoutReturn = `      const message = result.isAutoPayout
        ? (payout_method === 'PHONE_CARD' 
            ? 'Đã tự động duyệt và cấp mã thẻ cào thành công!' 
            : 'Hệ thống đã tự động phê duyệt và hoàn tất chi trả cho tài khoản uy tín cao!')
        : 'Đã tạo yêu cầu rút thưởng thành công. Tiền/Thẻ sẽ được chuyển sau khi hệ thống phê duyệt.';

      return res.status(201).json({
        success: true,
        message,
        payoutId: result.payoutId,
        status: result.status,
        isAutoPayout: result.isAutoPayout,
        cardDetails: result.cardDetails,
        netAmountVnd: result.netAmountVnd,
        feeVnd: result.feeVnd,
        newPointBalance: result.newPointBalance
      });`;

if (code.includes(oldRequestPayoutReturn)) {
  code = code.replace(oldRequestPayoutReturn, newRequestPayoutReturn);
}

if (!code.includes('createDepositOrder(req, res)')) {
  const lastIndex = code.lastIndexOf('}');
  code = code.slice(0, lastIndex) + newMethods + '\n}\n' + code.slice(lastIndex + 1);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated server/controllers/walletController.js');
} else {
  console.log('createDepositOrder already in walletController.js');
}
