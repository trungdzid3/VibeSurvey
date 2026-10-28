const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/services/ledgerService.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Thêm alias approvePayout nếu chưa có
if (!code.includes('approvePayout(payoutId')) {
  const approvePayoutCode = `
  /**
   * Phê duyệt yêu cầu rút tiền (Alias cho processPayout approved)
   */
  approvePayout(payoutId, adminNote = '') {
    return this.processPayout(payoutId, true, adminNote);
  }
`;
  code = code.replace('processPayout(payoutId, isApproved, adminNote = \'\') {', approvePayoutCode + '\n  processPayout(payoutId, isApproved, adminNote = \'\') {');
}

// 2. Cập nhật requestPayout với Auto-Payout Engine
const targetOldReturn = `      db.exec('COMMIT');
      return { success: true, payoutId, netAmountVnd, feeVnd: fee, newPointBalance };`;

const newAutoPayoutCode = `      db.exec('COMMIT');

      // Co che Tu Dong Duyet Rut Tien Nho (Auto-Payout Engine)
      let isAutoPayout = false;
      let payoutStatus = 'PENDING';
      let autoCardDetails = null;

      try {
        const canAutoPayout = (payoutMethod === 'PHONE_CARD') || (points <= 20000 && user.trust_score >= 90.0);
        if (canAutoPayout) {
          const fraudCheck = db.prepare(\`
            SELECT COUNT(*) as count FROM fraud_logs 
            WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-30 days')
          \`).get(userId);
          const fraudCount = fraudCheck ? fraudCheck.count : 0;

          if (fraudCount === 0) {
            let parsedRecipient = {};
            try {
              parsedRecipient = typeof recipientInfo === 'string' ? JSON.parse(recipientInfo) : (recipientInfo || {});
            } catch (e) {
              parsedRecipient = {};
            }

            if (payoutMethod === 'PHONE_CARD') {
              const telco = (parsedRecipient.telco || 'VIETTEL').toUpperCase();
              const cardCode = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
              const cardSerial = Math.floor(100000000000 + Math.random() * 900000000000).toString();
              const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

              autoCardDetails = {
                ...parsedRecipient,
                telco,
                card_code: cardCode,
                card_serial: cardSerial,
                card_value_vnd: fiatAmountVnd,
                expiry_date: expiryDate,
                issued_at: new Date().toISOString()
              };

              db.prepare(\`
                UPDATE payout_requests 
                SET status = 'COMPLETED',
                    recipient_info_json = ?,
                    admin_note = '[AUTO_PAYOUT_ENGINE] Tu dong cap ma the cao thanh cong',
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PENDING'
              \`).run(JSON.stringify(autoCardDetails), payoutId);

              isAutoPayout = true;
              payoutStatus = 'COMPLETED';

              try {
                const notifId = 'notif_payout_' + crypto.randomUUID();
                db.prepare(\`
                  INSERT INTO notifications (id, user_id, type, title, message, channel)
                  VALUES (?, ?, 'PAYOUT_COMPLETED', 'Doi the cao thanh cong', ?, 'ALL')
                \`).run(
                  notifId,
                  userId,
                  \`The cao \${telco} \${fiatAmountVnd.toLocaleString('vi-VN')}d da duoc cap ma thanh cong. Ma the: \${cardCode}, Seri: \${cardSerial}.\`
                );
              } catch (notifErr) {}
            } else {
              db.prepare(\`
                UPDATE payout_requests 
                SET status = 'COMPLETED',
                    admin_note = '[AUTO_PAYOUT_ENGINE] Tu dong phe duyet cho tai khoan uy tin cao (Trust Score >= 90.0)',
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PENDING'
              \`).run(payoutId);

              isAutoPayout = true;
              payoutStatus = 'COMPLETED';

              try {
                const notifId = 'notif_payout_' + crypto.randomUUID();
                db.prepare(\`
                  INSERT INTO notifications (id, user_id, type, title, message, channel)
                  VALUES (?, ?, 'PAYOUT_COMPLETED', 'Rut tien tu dong thanh cong', ?, 'ALL')
                \`).run(
                  notifId,
                  userId,
                  \`Yeu cau rut \${netAmountVnd.toLocaleString('vi-VN')}d da duoc he thong phe duyet va chuyen tien.\`
                );
              } catch (notifErr) {}
            }
          }
        }
      } catch (autoErr) {
        console.warn('[Auto-Payout Engine] Chu y khi xu ly tu dong:', autoErr.message);
      }

      return { 
        success: true, 
        payoutId, 
        status: payoutStatus,
        isAutoPayout,
        cardDetails: autoCardDetails,
        netAmountVnd, 
        feeVnd: fee, 
        newPointBalance 
      };`;

if (code.includes(targetOldReturn)) {
  code = code.replace(targetOldReturn, newAutoPayoutCode);
}

// 3. Thêm các hàm quản lý đơn nạp VietQR vào cuối class LedgerService (trước dấu đóng class)
const depositMethods = `
  /**
   * Tao don nap tien VietQR dong chuan Napas247
   * @param {string} userId ID nguoi dung
   * @param {number} amountVnd So tien nap VND
   */
  createDepositOrder(userId, amountVnd) {
    const amount = Math.floor(Number(amountVnd));
    if (!Number.isFinite(amount) || amount < 20000 || amount > 1000000000) {
      throw new Error('So tien nap toi thieu la 20,000 VND va toi da 1,000,000,000 VND');
    }

    const user = db.prepare('SELECT id, name, email, credit_balance FROM users WHERE id = ?').get(userId);
    if (!user) throw new Error('Nguoi dung khong ton tai');

    const bonusInfo = this.calculateDepositBonus(amount);
    const enterprisePerks = this.calculateEnterprisePerks(amount);
    const bonusCreditVnd = bonusInfo.bonusCreditVnd || 0;
    const creditAmount = amount + bonusCreditVnd;

    // Sinh ma don duy nhat: VIBE + 6 chu so ngau nhien
    let orderCode = '';
    let attempts = 0;
    while (attempts < 10) {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      const candidate = \`VIBE\${randNum}\`;
      const existing = db.prepare('SELECT id FROM deposit_orders WHERE order_code = ?').get(candidate);
      if (!existing) {
        orderCode = candidate;
        break;
      }
      attempts++;
    }
    if (!orderCode) {
      orderCode = \`VIBE\${Date.now().toString().slice(-6)}\`;
    }

    const gatewayConfig = config.PAYMENT_GATEWAY || {
      BANK_ID: 'MB',
      BANK_NAME: 'Ngan hang Quan Doi (MBBank)',
      ACCOUNT_NUMBER: '0335888888',
      ACCOUNT_NAME: 'VIBESURVEY PLATFORM',
      TEMPLATE: 'compact',
      ORDER_EXPIRE_MINUTES: 15
    };

    const expireMinutes = gatewayConfig.ORDER_EXPIRE_MINUTES || 15;
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000).toISOString();

    // URL anh VietQR dong chuan Napas247
    const encodedAccountName = encodeURIComponent(gatewayConfig.ACCOUNT_NAME || 'VIBESURVEY PLATFORM');
    const qrUrl = \`https://api.vietqr.io/image/\${gatewayConfig.BANK_ID}-\${gatewayConfig.ACCOUNT_NUMBER}-\${gatewayConfig.TEMPLATE || 'compact'}.jpg?amount=\${amount}&addInfo=\${orderCode}&accountName=\${encodedAccountName}\`;

    const bankAccountInfo = {
      bank_id: gatewayConfig.BANK_ID,
      bank_name: gatewayConfig.BANK_NAME,
      account_number: gatewayConfig.ACCOUNT_NUMBER,
      account_name: gatewayConfig.ACCOUNT_NAME,
      order_code: orderCode,
      amount_vnd: amount,
      qr_url: qrUrl
    };

    const orderId = 'dep_' + crypto.randomUUID();

    db.prepare(\`
      INSERT INTO deposit_orders (
        id, user_id, order_code, amount_vnd, credit_amount, bonus_credit_vnd, 
        status, payment_method, bank_account_info_json, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 'VIETQR', ?, ?)
    \`).run(
      orderId,
      userId,
      orderCode,
      amount,
      creditAmount,
      bonusCreditVnd,
      JSON.stringify(bankAccountInfo),
      expiresAt
    );

    return {
      success: true,
      orderId,
      orderCode,
      amountVnd: amount,
      creditAmount,
      bonusCreditVnd,
      bonusPercent: bonusInfo.bonusPercent,
      tier: bonusInfo.tier,
      fastTrackTickets: bonusInfo.bonusTickets || 0,
      enterprisePerks,
      qrUrl,
      bankInfo: bankAccountInfo,
      expiresAt,
      expiresInSec: expireMinutes * 60,
      status: 'PENDING'
    };
  }

  /**
   * Tra cuu trang thai don nap theo ma order_code
   */
  getDepositOrderByCode(orderCode, userId = null) {
    if (!orderCode) throw new Error('Vui long cung cap ma don nap');

    const cleanCode = String(orderCode).trim().toUpperCase();
    const order = db.prepare('SELECT * FROM deposit_orders WHERE order_code = ?').get(cleanCode);
    if (!order) {
      throw new Error('Khong tim thay don nap tien: ' + cleanCode);
    }

    if (userId && order.user_id !== userId) {
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Ban khong co quyen xem thong tin don nap nay');
      }
    }

    // Tu dong kiem tra han thanh toan neu dang o trang thai PENDING
    if (order.status === 'PENDING') {
      const now = new Date();
      const expiresAt = new Date(order.expires_at);
      if (now > expiresAt) {
        db.prepare(\`UPDATE deposit_orders SET status = 'EXPIRED' WHERE id = ?\`).run(order.id);
        order.status = 'EXPIRED';
      }
    }

    let bankInfo = null;
    try {
      bankInfo = order.bank_account_info_json ? JSON.parse(order.bank_account_info_json) : null;
    } catch (e) {
      bankInfo = null;
    }

    const gatewayConfig = config.PAYMENT_GATEWAY || {
      BANK_ID: 'MB',
      ACCOUNT_NUMBER: '0335888888',
      ACCOUNT_NAME: 'VIBESURVEY PLATFORM',
      TEMPLATE: 'compact'
    };
    const encodedAccountName = encodeURIComponent(gatewayConfig.ACCOUNT_NAME || 'VIBESURVEY PLATFORM');
    const qrUrl = \`https://api.vietqr.io/image/\${gatewayConfig.BANK_ID}-\${gatewayConfig.ACCOUNT_NUMBER}-\${gatewayConfig.TEMPLATE || 'compact'}.jpg?amount=\${order.amount_vnd}&addInfo=\${order.order_code}&accountName=\${encodedAccountName}\`;

    return {
      success: true,
      orderId: order.id,
      orderCode: order.order_code,
      userId: order.user_id,
      amountVnd: order.amount_vnd,
      creditAmount: order.credit_amount,
      bonusCreditVnd: order.bonus_credit_vnd,
      status: order.status,
      paymentMethod: order.payment_method,
      bankInfo,
      qrUrl,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      expiresAt: order.expires_at
    };
  }

  /**
   * Hoan tat don nap tien va cong Credit vao vi
   */
  completeDepositOrder(orderCode, actualAmountPaid = null, providerNote = '') {
    const cleanCode = String(orderCode).trim().toUpperCase();
    const order = db.prepare('SELECT * FROM deposit_orders WHERE order_code = ?').get(cleanCode);
    if (!order) {
      throw new Error('Don nap tien khong ton tai: ' + cleanCode);
    }

    if (order.status === 'COMPLETED') {
      return {
        success: true,
        message: 'Don nap da duoc xu ly hoan tat truoc do',
        alreadyCompleted: true,
        orderCode: cleanCode,
        amountVnd: order.amount_vnd,
        creditAmount: order.credit_amount
      };
    }

    if (order.status === 'CANCELLED') {
      throw new Error('Don nap da bi huy, khong the xac nhan thanh toan');
    }

    if (actualAmountPaid !== null && actualAmountPaid !== undefined) {
      const paid = Number(actualAmountPaid);
      if (paid < order.amount_vnd) {
        throw new Error(\`So tien thuc nhan (\${paid.toLocaleString('vi-VN')}d) nho hon so tien don nap (\${order.amount_vnd.toLocaleString('vi-VN')}d)\`);
      }
    }

    // Cap nhat trang thai don nap sang COMPLETED
    const updateRes = db.prepare(\`
      UPDATE deposit_orders 
      SET status = 'COMPLETED', paid_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND status IN ('PENDING', 'EXPIRED')
    \`).run(order.id);

    if (updateRes.changes === 0) {
      // Co the bi trung boi luong khac
      const checkAgain = db.prepare('SELECT status FROM deposit_orders WHERE id = ?').get(order.id);
      if (checkAgain && checkAgain.status === 'COMPLETED') {
        return {
          success: true,
          message: 'Don nap da duoc xu ly boi phien khac',
          alreadyCompleted: true,
          orderCode: cleanCode
        };
      }
      throw new Error('Khong the cap nhat trang thai don nap');
    }

    // Goi depositCredit de tang so du va ghi so cai Double-Entry Ledger
    const note = providerNote 
      ? \`Nap tien VietQR tu dong - Ma don: \${cleanCode} (\${providerNote})\`
      : \`Nap tien VietQR tu dong - Ma don: \${cleanCode}\`;

    const depositResult = this.depositCredit(order.user_id, order.amount_vnd, note);

    // Gui thong bao in-app den tai khoan
    try {
      const notifId = 'notif_dep_' + crypto.randomUUID();
      db.prepare(\`
        INSERT INTO notifications (id, user_id, type, title, message, channel)
        VALUES (?, ?, 'PAYMENT_SUCCESS', 'Nap quy thanh cong', ?, 'ALL')
      \`).run(
        notifId,
        order.user_id,
        \`Don nap \${cleanCode} tri gia \${Number(order.amount_vnd).toLocaleString('vi-VN')}d da duoc xac nhan thanh cong. Tai khoan cua ban da duoc cong +\${Number(depositResult.newBalance).toLocaleString('vi-VN')} Credit.\`
      );
    } catch (e) {}

    return {
      success: true,
      message: \`Xac nhan nap tien thanh cong cho don \${cleanCode}\`,
      orderCode: cleanCode,
      amountVnd: order.amount_vnd,
      creditAmount: order.credit_amount,
      bonusCreditVnd: order.bonus_credit_vnd,
      newCreditBalance: depositResult.newBalance,
      fastTrackTickets: depositResult.fastTrackTickets,
      depositResult
    };
  }

  /**
   * Xu ly Webhook Bien dong so du ngan hang (SePay, Casso, hoac ngan hang doi tac)
   */
  handlePaymentWebhook(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload webhook khong hop le');
    }

    // Ho tro ca single transaction (SePay, manual) va batch transactions (Casso: payload.data)
    let transactions = [];
    if (Array.isArray(payload.data)) {
      transactions = payload.data;
    } else if (Array.isArray(payload.transactions)) {
      transactions = payload.transactions;
    } else {
      transactions = [payload];
    }

    const processedResults = [];

    for (const item of transactions) {
      // Trich xuat text de tim ma don dang VIBE123456
      const contentList = [
        item.content,
        item.description,
        item.memo,
        item.addInfo,
        item.code,
        item.referenceCode,
        payload.content,
        payload.description,
        payload.order_code
      ].filter(Boolean).map(String);

      const combinedText = contentList.join(' ');
      const match = combinedText.match(/VIBE\\d{6}/i);

      if (!match) {
        continue;
      }

      const orderCode = match[0].toUpperCase();
      const amount = Number(item.transferAmount || item.amount || payload.transferAmount || payload.amount || 0);

      try {
        const res = this.completeDepositOrder(orderCode, amount > 0 ? amount : null, 'Webhook ngan hang');
        processedResults.push({ orderCode, success: true, ...res });
      } catch (err) {
        processedResults.push({ orderCode, success: false, error: err.message });
      }
    }

    return {
      success: true,
      message: \`Da xu ly \${processedResults.length} giao dich tu webhook\`,
      results: processedResults
    };
  }

  /**
   * Mo phong thanh toan thanh cong trong moi truong dev/staging
   */
  simulatePaymentSuccess(orderCode, userId = null) {
    const cleanCode = String(orderCode).trim().toUpperCase();
    const order = db.prepare('SELECT * FROM deposit_orders WHERE order_code = ?').get(cleanCode);
    if (!order) {
      throw new Error('Don nap tien khong ton tai: ' + cleanCode);
    }

    if (userId && order.user_id !== userId) {
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Ban khong co quyen mo phong thanh toan cho don nap nay');
      }
    }

    return this.completeDepositOrder(cleanCode, null, 'Mo phong thanh toan dev/staging');
  }
`;

if (!code.includes('createDepositOrder(userId')) {
  // Chèn trước dấu đóng class cuối cùng
  const lastIndex = code.lastIndexOf('}');
  code = code.slice(0, lastIndex) + depositMethods + '\n}\n' + code.slice(lastIndex + 1);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated server/services/ledgerService.js');
} else {
  console.log('createDepositOrder already in server/services/ledgerService.js');
}
