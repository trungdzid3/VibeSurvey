const db = require('../db/database');
const ledgerService = require('../services/ledgerService');
const config = require('../config');

class WalletController {
  getWallet(req, res) {
    try {
      const user = db.prepare('SELECT id, role, credit_balance, point_balance, trust_score, fast_track_tickets FROM users WHERE id = ?').get(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

      const transactions = db.prepare(`
        SELECT * FROM point_transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
      `).all(user.id);

      const fiatValueVnd = user.point_balance * config.ECONOMICS.POINT_TO_VND_RATE;

      return res.json({
        success: true,
        wallet: {
          credit_balance: user.credit_balance,
          point_balance: user.point_balance,
          fast_track_tickets: user.fast_track_tickets || 0,
          vatInvoiceEligible: true,
          fiatValueVnd,
          trust_score: user.trust_score,
          minFirstTimePayoutPoints: config.ECONOMICS.MIN_FIRST_TIME_PAYOUT_POINTS,
          minFirstTimePayoutVnd: config.ECONOMICS.MIN_FIRST_TIME_PAYOUT_POINTS * config.ECONOMICS.POINT_TO_VND_RATE,
          minPayoutPoints: config.ECONOMICS.MIN_PAYOUT_POINTS,
          minPayoutVnd: config.ECONOMICS.MIN_PAYOUT_POINTS * config.ECONOMICS.POINT_TO_VND_RATE,
          phoneCardFeeVnd: config.ECONOMICS.PHONE_CARD_FEE_VND,
          bankFeeUnder100kVnd: config.ECONOMICS.BANK_TRANSFER_FEE_UNDER_100K_VND,
          bankFeeFrom100kVnd: config.ECONOMICS.BANK_TRANSFER_FEE_FROM_100K_VND,
          swapDiscountRate: config.ECONOMICS.SWAP_DISCOUNT_RATE,
          payoutFeeVnd: config.ECONOMICS.PAYOUT_FIXED_FEE_VND,
          exchangeRate: config.ECONOMICS.POINT_TO_VND_RATE
        },
        transactions
      });
    } catch (err) {
      console.error('Lỗi getWallet:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải thông tin ví' });
    }
  }

  depositCredit(req, res) {
    try {
      const user = req.user;
      const { amount_vnd, description } = req.body;

      const amount = parseInt(amount_vnd, 10);
      if (isNaN(amount) || amount < 10000 || amount > 1000000000) {
        return res.status(400).json({ success: false, message: 'Số tiền nạp tối thiểu là 10,000 VNĐ và tối đa 1,000,000,000 VNĐ' });
      }

      const safeDescription = String(description || 'Nạp tiền vào tài khoản').trim().substring(0, 200);
      const result = ledgerService.depositCredit(user.id, amount, safeDescription);

      const bonusMsg = result.bonusCreditVnd > 0 
        ? ` (Tặng thêm +${result.bonusCreditVnd.toLocaleString('vi-VN')}đ Credit tạo form bậc ${result.tier})` 
        : '';

      return res.json({
        success: true,
        message: `Nạp thành công ${amount.toLocaleString('vi-VN')} VNĐ vào tài khoản${bonusMsg}!`,
        newCreditBalance: result.newBalance,
        newPointBalance: result.newPointBalance,
        bonusCreditVnd: result.bonusCreditVnd,
        bonusPercent: result.bonusPercent,
        tier: result.tier,
        fastTrackTickets: result.fastTrackTickets || 0,
        enterprisePerks: result.enterprisePerks,
        txId: result.txId
      });
    } catch (err) {
      console.error('Lỗi depositCredit:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  requestPayout(req, res) {
    try {
      const user = req.user;
      const { points_amount, payout_method, recipient_info } = req.body;

      if (!points_amount || !payout_method || !recipient_info) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số điểm rút, phương thức và thông tin nhận' });
      }

      if (!['BANK_TRANSFER', 'MOMO', 'PHONE_CARD'].includes(payout_method)) {
        return res.status(400).json({ success: false, message: 'Phương thức thanh toán không được hỗ trợ' });
      }

      if (typeof recipient_info !== 'object' || recipient_info === null) {
        return res.status(400).json({ success: false, message: 'Thông tin tài khoản thụ hưởng phải là đối tượng hợp lệ' });
      }

      // Kiểm tra ngưỡng rút: lần đầu tiên qua thẻ cào (1.000 điểm = 10.000 VNĐ), các trường hợp khác 5.000 điểm = 50.000 VNĐ
      const prevPayout = db.prepare(`
        SELECT COUNT(*) as count FROM payout_requests 
        WHERE user_id = ? AND status != 'REJECTED'
      `).get(user.id);
      const prevCount = prevPayout ? prevPayout.count : 0;

      const isFirstTimePhoneCard = (prevCount === 0 && payout_method === 'PHONE_CARD');
      const minRequiredPoints = isFirstTimePhoneCard 
        ? config.ECONOMICS.MIN_FIRST_TIME_PAYOUT_POINTS 
        : config.ECONOMICS.MIN_PAYOUT_POINTS;

      const points = parseInt(points_amount, 10);
      if (isNaN(points) || points < minRequiredPoints || points > 10000000) {
        return res.status(400).json({
          success: false,
          message: `Số điểm rút tối thiểu là ${minRequiredPoints.toLocaleString()} điểm (tương đương ${(minRequiredPoints * config.ECONOMICS.POINT_TO_VND_RATE).toLocaleString('vi-VN')} VNĐ)`
        });
      }

      // Xác định phí rút: Thẻ cào 0đ; Ngân hàng < 100k thu 2k, >= 100k miễn phí
      const fiatAmountVnd = points * config.ECONOMICS.POINT_TO_VND_RATE;
      let calculatedFeeVnd = 0;
      if (payout_method === 'PHONE_CARD') {
        calculatedFeeVnd = config.ECONOMICS.PHONE_CARD_FEE_VND || 0;
      } else {
        calculatedFeeVnd = fiatAmountVnd < 100000 
          ? config.ECONOMICS.BANK_TRANSFER_FEE_UNDER_100K_VND 
          : config.ECONOMICS.BANK_TRANSFER_FEE_FROM_100K_VND;
      }

      const result = ledgerService.requestPayout(
        user.id,
        points,
        payout_method,
        recipient_info,
        calculatedFeeVnd
      );

      return res.status(201).json({
        success: true,
        message: 'Đã tạo yêu cầu rút thưởng thành công. Tiền/Thẻ sẽ được chuyển sau khi hệ thống phê duyệt.',
        payoutId: result.payoutId,
        netAmountVnd: result.netAmountVnd,
        newPointBalance: result.newPointBalance
      });
    } catch (err) {
      console.error('Lỗi requestPayout:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  getPayouts(req, res) {
    try {
      const user = req.user;
      const payouts = db.prepare(`
        SELECT * FROM payout_requests 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `).all(user.id);

      return res.json({ success: true, payouts });
    } catch (err) {
      console.error('Lỗi getPayouts:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải lịch sử rút thưởng' });
    }
  }

  swapPointsToCredit(req, res) {
    try {
      const user = req.user;
      const { points_amount } = req.body;

      if (!points_amount) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số điểm cần đổi' });
      }

      const points = parseInt(points_amount, 10);
      if (isNaN(points) || points < 1000 || points > 10000000) {
        return res.status(400).json({ success: false, message: 'Số điểm quy đổi phải từ 1,000 đến 10,000,000 điểm' });
      }

      const result = ledgerService.swapPointsToCredit(user.id, points);

      return res.json({
        success: true,
        message: `Đổi thành công ${points.toLocaleString()} điểm sang ${result.creditAddedVnd.toLocaleString('vi-VN')} VNĐ Credit tạo khảo sát (Đã trừ phí dịch vụ chuyển đổi sàn 30%)!`,
        ...result
      });
    } catch (err) {
      console.error('Lỗi swapPointsToCredit:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  requestVatInvoice(req, res) {
    try {
      const user = req.user;
      const { transaction_id, amount_vnd, company_name, tax_code, company_address, recipient_email } = req.body;
      const notificationService = require('../services/notificationService');
      const result = notificationService.requestVatInvoice(user.id, {
        transactionId: transaction_id,
        amountVnd: amount_vnd,
        companyName: company_name,
        taxCode: tax_code,
        companyAddress: company_address,
        recipientEmail: recipient_email
      });
      return res.json({ success: true, ...result });
    } catch (err) {
      console.error('Lỗi requestVatInvoice:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  getVatInvoices(req, res) {
    try {
      const user = req.user;
      const notificationService = require('../services/notificationService');
      const invoices = notificationService.getUserVatInvoices(user.id);
      return res.json({ success: true, invoices });
    } catch (err) {
      console.error('Lỗi getVatInvoices:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải danh sách hóa đơn VAT' });
    }
  }
}

module.exports = new WalletController();
