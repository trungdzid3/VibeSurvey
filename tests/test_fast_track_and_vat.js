/**
 * BỘ KIỂM THỬ: TỶ LỆ BONUS TINH GỌN, HÓA ĐƠN VAT FULL & GOM MẪU HỎA TỐC (PUSH APK + EMAIL)
 */

const assert = require('assert');
const crypto = require('crypto');
const app = require('../server/app');
const db = require('../server/db/database');
const ledgerService = require('../server/services/ledgerService');
const notificationService = require('../server/services/notificationService');

async function runFastTrackAndVatTests() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ: BONUS TINH GỌN, FULL VAT & GOM MẪU HỎA TỐC');
  console.log('===============================================================');

  // 1. Kiểm tra tỷ lệ bonus nạp tiền "hơn 1 tẹo thôi"
  console.log('\n--- 1. Kiểm tra công thức bonus nạp tiền tinh gọn ("hơn 1 tẹo thôi") ---');
  const b100k = ledgerService.calculateDepositBonus(100000);
  assert.strictEqual(b100k.bonusPercent, 2, '100K: +2%');
  assert.strictEqual(b100k.bonusCreditVnd, 2000);

  const b500k = ledgerService.calculateDepositBonus(500000);
  assert.strictEqual(b500k.bonusPercent, 4, '500K: +4%');
  assert.strictEqual(b500k.bonusCreditVnd, 20000);

  const b1m = ledgerService.calculateDepositBonus(1000000);
  assert.strictEqual(b1m.bonusPercent, 6, '1M: +6% (hơn 1 tẹo)');
  assert.strictEqual(b1m.bonusCreditVnd, 60000, 'Tặng 60,000đ Credit');
  assert.strictEqual(b1m.totalCreditVnd, 1060000);

  const b2m = ledgerService.calculateDepositBonus(2000000);
  assert.strictEqual(b2m.bonusPercent, 8, '2M: +8%');
  assert.strictEqual(b2m.bonusCreditVnd, 160000);
  assert.strictEqual(b2m.totalCreditVnd, 2160000);

  const b5m = ledgerService.calculateDepositBonus(5000000);
  assert.strictEqual(b5m.bonusPercent, 10, '5M: +10%');
  assert.strictEqual(b5m.bonusCreditVnd, 500000);
  assert.strictEqual(b5m.totalCreditVnd, 5500000);

  const b10m = ledgerService.calculateDepositBonus(10000000);
  assert.strictEqual(b10m.bonusPercent, 12, '10M: +12%');
  assert.strictEqual(b10m.bonusCreditVnd, 1200000);
  assert.strictEqual(b10m.totalCreditVnd, 11200000);
  console.log('  ✅ [PASS] Tỷ lệ thưởng nạp chuẩn xác: 100k(+2%), 500k(+4%), 1M(+6%), 2M(+8%), 5M(+10%), 10M(+12%)!');

  // 2. Khởi động server test
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(3).toString('hex');
  const creatorEmail = `corp_${uniqueSuffix}@techcorp.vn`;
  const respEmail = `student_${uniqueSuffix}@hust.edu.vn`;
  const password = 'Password@123';

  // Đăng ký Creator & Respondent
  const regCreator = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: creatorEmail, password, name: 'Công Ty Nghiên Cứu Thị Trường Alpha', role: 'CREATOR' })
  }).then(r => r.json());
  const creatorToken = regCreator.token;
  const creatorId = regCreator.user.id;

  const regResp = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: respEmail, password, name: 'Sinh Viên Bách Khoa', role: 'RESPONDENT' })
  }).then(r => r.json());
  const respToken = regResp.token;
  const respId = regResp.user.id;

  // 3. Creator nạp 1,000,000đ -> nhận 1,060,000đ và 2 vé Gom Mẫu Hỏa Tốc
  console.log('\n--- 2. Creator nạp 1 Triệu: Nhận +6% Credit và 2 vé Gom Mẫu Hỏa Tốc ---');
  const depRes = await fetch(`${baseUrl}/wallet/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creatorToken}` },
    body: JSON.stringify({ amount_vnd: 1000000, description: 'Nạp gói khảo sát doanh nghiệp Q4' })
  }).then(r => r.json());

  assert.strictEqual(depRes.success, true);
  assert.strictEqual(depRes.bonusCreditVnd, 60000, 'Bonus đúng 60,000đ');
  assert.strictEqual(depRes.fastTrackTickets, 2, 'Nhận đúng 2 vé gom mẫu hỏa tốc');
  console.log('  ✅ [PASS] Nạp thành công: Nhận 1.060.000đ Credit + 2 vé Gom Mẫu Hỏa Tốc!');

  // 4. Kiểm tra yêu cầu Xuất Hóa Đơn VAT FULL 100%
  console.log('\n--- 3. Kiểm tra tính năng Xuất Hóa Đơn Điện Tử VAT FULL 100% ---');
  const vatRes = await fetch(`${baseUrl}/wallet/vat-invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creatorToken}` },
    body: JSON.stringify({
      amount_vnd: 1000000,
      company_name: 'CÔNG TY TNHH NGHIÊN CỨU THỊ TRƯỜNG ALPHA VIỆT NAM',
      tax_code: '0109876543',
      company_address: 'Tầng 12, Keangnam Landmark 72, Mễ Trì, Nam Từ Liêm, Hà Nội',
      recipient_email: 'ketoan@alpharesearch.vn'
    })
  }).then(r => r.json());

  assert.strictEqual(vatRes.success, true);
  assert.strictEqual(vatRes.taxCode, '0109876543');
  assert.strictEqual(vatRes.vatAmountVnd, 100000, 'VAT 10% = 100,000đ');
  assert.strictEqual(vatRes.status, 'PENDING');
  assert(vatRes.invoiceSerial.startsWith('VS-'));

  const listVat = await fetch(`${baseUrl}/wallet/vat-invoices`, {
    headers: { 'Authorization': `Bearer ${creatorToken}` }
  }).then(r => r.json());
  assert.strictEqual(listVat.success, true);
  assert.strictEqual(listVat.invoices.length, 1);
  console.log('  ✅ [PASS] Yêu cầu xuất Hóa Đơn VAT FULL 100% thành công mỹ mãn!');

  // 5. Creator tạo khảo sát và kích hoạt Gom Mẫu Hỏa Tốc
  console.log('\n--- 4. Creator tạo khảo sát & Kích hoạt Gom Mẫu Hỏa Tốc ---');
  const createSurv = await fetch(`${baseUrl}/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creatorToken}` },
    body: JSON.stringify({
      title: 'Khảo sát thói quen dùng ví điện tử Gen Z',
      description: 'Nghiên cứu thị trường thanh toán số',
      target_responses: 50,
      questions: [
        { type: 'SINGLE_CHOICE', content: 'Bạn dùng ví nào thường xuyên nhất?', options: ['MoMo', 'ZaloPay', 'ShopeePay', 'Viettel Money'] }
      ]
    })
  }).then(r => r.json());
  const surveyId = createSurv.surveyId;

  // Xuất bản khảo sát
  await fetch(`${baseUrl}/surveys/${surveyId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creatorToken}` }
  });

  // Kích hoạt Gom Mẫu Hỏa Tốc (Fast-track Boost)
  const boostRes = await fetch(`${baseUrl}/surveys/${surveyId}/boost-fast-track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${creatorToken}` }
  }).then(r => r.json());

  assert.strictEqual(boostRes.success, true);
  assert.strictEqual(boostRes.remainingTickets, 1, 'Đã trừ 1 vé, còn lại 1 vé');
  assert(boostRes.dispatchResult.pushCount > 0, 'Đã bắn thông báo đẩy');
  assert(boostRes.dispatchResult.emailCount > 0, 'Đã gửi email hệ thống tới người dùng');
  console.log(`  ✅ [PASS] Kích hoạt Gom Mẫu Hỏa Tốc: Bắn ${boostRes.dispatchResult.pushCount} Push APK & Gửi ${boostRes.dispatchResult.emailCount} Email hệ thống!`);

  // 6. Respondent kiểm tra thông báo nhận được
  console.log('\n--- 5. Respondent nhận thông báo đẩy trên App / Chuông hệ thống ---');
  const notifRes = await fetch(`${baseUrl}/notifications`, {
    headers: { 'Authorization': `Bearer ${respToken}` }
  }).then(r => r.json());

  assert.strictEqual(notifRes.success, true);
  assert(notifRes.notifications.length > 0, 'Respondent nhận được thông báo');
  const latestNotif = notifRes.notifications[0];
  assert(latestNotif.title.includes('HỎA TỐC'));
  assert.strictEqual(latestNotif.survey_id, surveyId);
  console.log(`  ✅ [PASS] Respondent đã nhận được thông báo: "${latestNotif.title}"!`);

  server.close();
  console.log('\n===============================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI TEST TỶ LỆ BONUS, FULL VAT & GOM MẪU HỎA TỐC ĐÃ PASS 100%!');
  console.log('===============================================================');
}

runFastTrackAndVatTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
