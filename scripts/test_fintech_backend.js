const db = require('../server/db/database');
const ledgerService = require('../server/services/ledgerService');

async function runTests() {
  console.log('=== BAT DAU KIEM THU BACKEND FINTECH & AUTO-PAYOUT ===');

  // Lấy 1 tài khoản test
  const admin = db.prepare("SELECT * FROM users WHERE email = 'admin@vibesurvey.com'").get();
  if (!admin) {
    throw new Error('Khong tim thay admin@vibesurvey.com');
  }
  console.log('[Test 1] Tai khoan test:', admin.email, 'So du Credit ban dau:', admin.credit_balance);

  // 1. Tao don nap tien VietQR
  const amountVnd = 100000;
  const order = ledgerService.createDepositOrder(admin.id, amountVnd);
  console.log('[Test 2] Da tao don nap VietQR thanh cong:', {
    orderCode: order.orderCode,
    amountVnd: order.amountVnd,
    creditAmount: order.creditAmount,
    bonusCreditVnd: order.bonusCreditVnd,
    qrUrl: order.qrUrl
  });

  if (!order.orderCode.startsWith('VIBE')) {
    throw new Error('Ma don hang phai bat dau bang VIBE');
  }

  // 2. Tra cuu don nap
  const fetchedOrder = ledgerService.getDepositOrderByCode(order.orderCode, admin.id);
  console.log('[Test 3] Tra cuu don nap:', {
    orderCode: fetchedOrder.orderCode,
    status: fetchedOrder.status
  });
  if (fetchedOrder.status !== 'PENDING') {
    throw new Error('Don nap phai o trang thai PENDING');
  }

  // 3. Webhook doi soat ngan hang tu dong
  const webhookPayload = {
    gateway: 'MBBank',
    transactionDate: new Date().toISOString(),
    accountNumber: '0335888888',
    transferAmount: 100000,
    content: `MBVCB.123456789.Thanh toan don hang ${order.orderCode} vibesurvey`
  };
  const webhookRes = ledgerService.handlePaymentWebhook(webhookPayload);
  console.log('[Test 4] Webhook doi soat ngan hang:', webhookRes);

  // Kiem tra lai don nap sau webhook
  const orderAfterPaid = ledgerService.getDepositOrderByCode(order.orderCode, admin.id);
  console.log('[Test 5] Don nap sau khi webhook xu ly:', {
    orderCode: orderAfterPaid.orderCode,
    status: orderAfterPaid.status,
    paidAt: orderAfterPaid.paidAt
  });
  if (orderAfterPaid.status !== 'COMPLETED') {
    throw new Error('Don nap phai o trang thai COMPLETED sau khi webhook doi soat');
  }

  // Kiem tra so du user sau khi duoc cong
  const adminAfter = db.prepare("SELECT credit_balance FROM users WHERE id = ?").get(admin.id);
  console.log('[Test 6] So du Credit sau khi duoc cong:', adminAfter.credit_balance);

  // 4. Kiem thu Auto-Payout Engine
  // Tao 1 respondent test voi trust_score = 95.0 va du diem
  const respondent = db.prepare("SELECT * FROM users WHERE role = 'RESPONDENT' LIMIT 1").get();
  let testRespId = respondent ? respondent.id : null;
  if (!testRespId) {
    const crypto = require('crypto');
    testRespId = 'resp_test_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, point_balance, trust_score)
      VALUES (?, 'resp_test@vibesurvey.com', 'test123456', 'Dap Vien Test', 'RESPONDENT', 100000, 95.0)
    `).run(testRespId);
  } else {
    db.prepare("UPDATE users SET point_balance = MAX(point_balance, 100000), trust_score = 95.0 WHERE id = ?").run(testRespId);
  }

  // Test Auto-Payout với Thẻ Cào (PHONE_CARD)
  const phoneCardRes = ledgerService.requestPayout(
    testRespId,
    20000,
    'PHONE_CARD',
    { telco: 'VIETTEL', phone_number: '0988776655' }
  );
  console.log('[Test 7] Auto-Payout Phone Card Ket qua:', {
    payoutId: phoneCardRes.payoutId,
    status: phoneCardRes.status,
    isAutoPayout: phoneCardRes.isAutoPayout,
    cardDetails: phoneCardRes.cardDetails ? {
      telco: phoneCardRes.cardDetails.telco,
      card_code: phoneCardRes.cardDetails.card_code,
      card_serial: phoneCardRes.cardDetails.card_serial
    } : null
  });

  if (!phoneCardRes.isAutoPayout || phoneCardRes.status !== 'COMPLETED') {
    throw new Error('The cao phai duoc Auto-Payout COMPLETED ngay lap tuc');
  }
  if (!phoneCardRes.cardDetails || !phoneCardRes.cardDetails.card_code) {
    throw new Error('The cao phai duoc cap ma the va so seri');
  }

  console.log('=== TAT CA KIEM THU BACKEND THANH CONG 100% ===');
}

runTests().catch(err => {
  console.error('Loi test:', err);
  process.exit(1);
});
