const http = require('http');
const app = require('../server/app');
const db = require('../server/db/database');
const jwt = require('jsonwebtoken');
const config = require('../server/config');

async function testHttpEndpoints() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(3999, resolve));
  console.log('Test Server started on port 3999');

  const admin = db.prepare("SELECT * FROM users WHERE email = 'admin@vibesurvey.com'").get();
  // Tang point_balance cho admin de test rut thuong
  db.prepare("UPDATE users SET point_balance = point_balance + 100000, trust_score = 100.0 WHERE id = ?").run(admin.id);

  const token = jwt.sign({ id: admin.id, role: admin.role, email: admin.email }, config.JWT_SECRET, { expiresIn: '1h' });

  // 1. Test POST /api/v1/wallet/create-deposit-order
  console.log('--> Test POST /api/v1/wallet/create-deposit-order');
  const createRes = await fetch('http://localhost:3999/api/v1/wallet/create-deposit-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount_vnd: 200000 })
  });
  const createData = await createRes.json();
  console.log('Result create-deposit-order:', createData.success, 'orderCode:', createData.orderCode, 'qrUrl:', !!createData.qrUrl);
  if (!createData.success || !createData.orderCode) throw new Error('Create deposit order failed');

  // 2. Test GET /api/v1/wallet/deposit-orders/:orderCode
  console.log('--> Test GET /api/v1/wallet/deposit-orders/' + createData.orderCode);
  const getRes = await fetch(`http://localhost:3999/api/v1/wallet/deposit-orders/${createData.orderCode}`);
  const getData = await getRes.json();
  console.log('Result get-deposit-order:', getData.success, 'status:', getData.order.status);
  if (!getData.success || getData.order.status !== 'PENDING') throw new Error('Get deposit order failed');

  // 3. Test POST /api/v1/wallet/payment-webhook (SePay format)
  console.log('--> Test POST /api/v1/wallet/payment-webhook');
  const webhookRes = await fetch('http://localhost:3999/api/v1/wallet/payment-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 999999,
      gateway: 'MBBank',
      accountNumber: '0335888888',
      transferAmount: 200000,
      content: `CK tien ung ho vibesurvey ma ${createData.orderCode}`
    })
  });
  const webhookData = await webhookRes.json();
  console.log('Result payment-webhook:', webhookData.success, 'processed count:', webhookData.results.length);
  if (!webhookData.success) throw new Error('Payment webhook failed');

  // 4. Test lại trạng thái đơn sau webhook
  const getRes2 = await fetch(`http://localhost:3999/api/v1/wallet/deposit-orders/${createData.orderCode}`);
  const getData2 = await getRes2.json();
  console.log('Order status after webhook:', getData2.order.status);
  if (getData2.order.status !== 'COMPLETED') throw new Error('Order not COMPLETED after webhook');

  // 5. Test POST /api/v1/wallet/simulate-payment-success
  console.log('--> Test POST /api/v1/wallet/simulate-payment-success');
  const orderSim = await fetch('http://localhost:3999/api/v1/wallet/create-deposit-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount_vnd: 50000 })
  }).then(r => r.json());

  const simRes = await fetch('http://localhost:3999/api/v1/wallet/simulate-payment-success', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ order_code: orderSim.orderCode })
  });
  const simData = await simRes.json();
  console.log('Result simulate-payment-success:', simData.success, 'orderCode:', simData.orderCode);
  if (!simData.success) throw new Error('Simulate payment success failed');

  // 6. Test Auto-Payout Engine via POST /api/v1/wallet/payouts
  console.log('--> Test Auto-Payout via POST /api/v1/wallet/payouts');
  const payoutRes = await fetch('http://localhost:3999/api/v1/wallet/payouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      points_amount: 20000,
      payout_method: 'PHONE_CARD',
      recipient_info: { telco: 'VINAPHONE', phone_number: '0912345678' }
    })
  });
  const payoutData = await payoutRes.json();
  console.log('Full payoutData:', JSON.stringify(payoutData));
  if (!payoutData.success || !payoutData.isAutoPayout || payoutData.status !== 'COMPLETED') {
    throw new Error('Auto-payout failed');
  }

  server.close();
  console.log('=== TAT CA HTTP API TEST PASSED 100% ===');
}

testHttpEndpoints().catch(err => {
  console.error('HTTP Test Error:', err);
  process.exit(1);
});
