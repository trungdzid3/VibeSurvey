/**
 * TEST SUITE: TIERED DEPOSIT BONUS & MỐC RÚT TIỀN (BACKEND TIỀN TỆ & KHÓA VAN MỘT CHIỀU)
 * Xác minh:
 * 1. Cơ chế bậc thang thưởng Credit tạo form nội bộ (+3% đến +15%), loại bỏ hoàn toàn thưởng Point rút tiền.
 * 2. Cộng dồn credit_balance = credit_balance + amount + bonusCreditVnd trong Transaction ACID, point_balance giữ nguyên = 0.
 * 3. Kiểm tra cấu hình và logic rút tiền: Ngưỡng phá băng 1,000 điểm thẻ cào, chuẩn 5,000 điểm, phí 0đ thẻ cào, phí ngân hàng 2k/<100k và miễn phí >=100k.
 * 4. Toàn vẹn Sổ cái kép (Double-Entry Ledger) và nguyên tắc "Van một chiều" (One-Way Valve).
 */

const assert = require('assert');
const crypto = require('crypto');
const db = require('../server/db/database');
const ledgerService = require('../server/services/ledgerService');
const config = require('../server/config');

async function runDepositBonusTests() {
  console.log('===============================================================');
  console.log('🎁 BẮT ĐẦU KIỂM THỬ: TIERED DEPOSIT BONUS & CẤU HÌNH RÚT TIỀN');
  console.log('===============================================================');

  const testUserId = 'test_depositor_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Test Depositor', 'CREATOR', 0.0, 0, 100.0, 'ACTIVE')
  `).run(testUserId, `depositor_${Date.now()}@test.local`);

  // 1. Kiểm tra hàm tính bonus Credit tạo form độc lập
  console.log('\n--- 1. Kiểm tra công thức bậc thang bonus Credit tạo form ---');
  const b50k = ledgerService.calculateDepositBonus(50000);
  assert.strictEqual(b50k.bonusPercent, 0, 'Dưới 100K: 0% bonus');
  assert.strictEqual(b50k.bonusCreditVnd, 0, 'Dưới 100K: 0đ Credit');
  assert.strictEqual(b50k.bonusPoints, undefined, 'Loại bỏ hoàn toàn bonusPoints');

  const b100k = ledgerService.calculateDepositBonus(100000);
  assert.strictEqual(b100k.bonusPercent, 2, '100K: +2% bonus');
  assert.strictEqual(b100k.bonusCreditVnd, 2000, '100K tặng 2,000đ Credit tạo form');
  assert.strictEqual(b100k.totalCreditVnd, 102000, 'Nhận tổng 102,000đ Credit');

  const b500k = ledgerService.calculateDepositBonus(500000);
  assert.strictEqual(b500k.bonusPercent, 4, '500K: +4% bonus');
  assert.strictEqual(b500k.bonusCreditVnd, 20000, '500K tặng 20,000đ Credit tạo form');
  assert.strictEqual(b500k.totalCreditVnd, 520000, 'Nhận tổng 520,000đ Credit');

  const b1m = ledgerService.calculateDepositBonus(1000000);
  assert.strictEqual(b1m.bonusPercent, 6, '1M: +6% bonus (hơn 1 tẹo)');
  assert.strictEqual(b1m.bonusCreditVnd, 60000, '1M tặng 60,000đ Credit tạo form');
  assert.strictEqual(b1m.totalCreditVnd, 1060000, 'Nhận tổng 1,060,000đ Credit');

  const b2m = ledgerService.calculateDepositBonus(2000000);
  assert.strictEqual(b2m.bonusPercent, 8, '2M: +8% bonus');
  assert.strictEqual(b2m.bonusCreditVnd, 160000, '2M tặng 160,000đ Credit tạo form');
  assert.strictEqual(b2m.totalCreditVnd, 2160000, 'Nhận tổng 2,160,000đ Credit');

  const b5m = ledgerService.calculateDepositBonus(5000000);
  assert.strictEqual(b5m.bonusPercent, 10, '5M: +10% VIP bonus');
  assert.strictEqual(b5m.bonusCreditVnd, 500000, '5M tặng 500,000đ Credit VIP tạo form');
  assert.strictEqual(b5m.totalCreditVnd, 5500000, 'Nhận tổng 5,500,000đ Credit');
  console.log('  ✅ [PASS] Công thức bậc thang bonus Credit tạo form chuẩn xác 100%!');

  // 2. Kiểm tra nạp 1,000,000 VNĐ thực tế vào DB (ACID Transaction)
  console.log('\n--- 2. Kiểm tra nạp tiền thực tế & Ghi nhận Sổ cái kép ---');
  const res1 = ledgerService.depositCredit(testUserId, 1000000, 'Nạp gói 1 Triệu');
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.newBalance, 1060000, 'Số dư Credit nhận đủ 1,060,000đ (1M gốc + 60k bonus 6%)');
  assert.strictEqual(res1.newPointBalance, 0, 'point_balance tuyệt đối giữ nguyên 0!');
  assert.strictEqual(res1.bonusCreditVnd, 60000);
  assert.strictEqual(res1.bonusPercent, 6);

  const u1 = db.prepare('SELECT credit_balance, point_balance FROM users WHERE id = ?').get(testUserId);
  assert.strictEqual(u1.credit_balance, 1060000);
  assert.strictEqual(u1.point_balance, 0, 'User DB: point_balance = 0');

  // Kiểm tra Sổ cái: Phải có 2 bản ghi VND (tiền nạp gốc và bonus), 0 bản ghi POINT
  const txVndList = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND currency = 'VND' ORDER BY created_at ASC").all(testUserId);
  assert.strictEqual(txVndList.length, 2, 'Có đúng 2 giao dịch VND trong sổ cái');
  assert.strictEqual(txVndList[0].amount, 1000000, 'Giao dịch 1: Nạp 1,000,000đ');
  assert.strictEqual(txVndList[0].balance_after, 1000000);
  assert.strictEqual(txVndList[1].amount, 60000, 'Giao dịch 2: Bonus +60,000đ');
  assert.strictEqual(txVndList[1].balance_after, 1060000);

  const txPointList = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND currency = 'POINT'").all(testUserId);
  assert.strictEqual(txPointList.length, 0, 'Tuyệt đối KHÔNG có giao dịch POINT phát sinh từ nạp tiền');
  console.log('  ✅ [PASS] Nạp 1M: Nhận đúng 1,060,000đ Credit tạo form và 0 Điểm thưởng trong cùng 1 Transaction ACID!');

  // 3. Nạp tiếp 2,000,000 VNĐ (Cộng dồn lũy tiến)
  console.log('\n--- 3. Nạp lũy tiến 2,000,000 VNĐ (Bậc Bạch Kim +8%) ---');
  const res2 = ledgerService.depositCredit(testUserId, 2000000, 'Nạp gói 2 Triệu');
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.newBalance, 1060000 + 2160000, 'Số dư mới = 3,220,000đ Credit');
  assert.strictEqual(res2.newPointBalance, 0, 'point_balance vẫn giữ nguyên 0');

  const u2 = db.prepare('SELECT credit_balance, point_balance FROM users WHERE id = ?').get(testUserId);
  assert.strictEqual(u2.credit_balance, 3220000);
  assert.strictEqual(u2.point_balance, 0);

  // Đối soát tổng sổ cái
  const totalVndTx = db.prepare("SELECT SUM(amount) AS total FROM point_transactions WHERE user_id = ? AND currency = 'VND'").get(testUserId).total;
  assert.strictEqual(totalVndTx, 3220000, 'Đối soát tổng biến động VND khớp 100% với số dư');
  console.log('  ✅ [PASS] Số dư lũy tiến: 3,220,000đ Credit tạo form + 0 Điểm (Sổ cái toàn vẹn 100%)!');

  // 4. Kiểm tra Cấu hình & Logic Rút Tiền Mới
  console.log('\n--- 4. Kiểm tra Cấu hình & Logic Rút Tiền (Mục 1) ---');
  assert.strictEqual(config.ECONOMICS.MIN_FIRST_TIME_PAYOUT_POINTS, 1000, 'Ngưỡng phá băng lần đầu: 1,000 điểm');
  assert.strictEqual(config.ECONOMICS.MIN_PAYOUT_POINTS, 5000, 'Ngưỡng tiêu chuẩn: 5,000 điểm');
  assert.strictEqual(config.ECONOMICS.PHONE_CARD_FEE_VND, 0, 'Phí thẻ cào: 0đ');
  assert.strictEqual(config.ECONOMICS.BANK_TRANSFER_FEE_UNDER_100K_VND, 2000, 'Phí ngân hàng < 100k: 2,000đ');
  assert.strictEqual(config.ECONOMICS.BANK_TRANSFER_FEE_FROM_100K_VND, 0, 'Phí ngân hàng >= 100k: miễn phí');

  // Tạo tài khoản Respondent để test các luồng rút tiền
  const testRespondentId = 'test_resp_payout_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Test Respondent Payout', 'RESPONDENT', 0.0, 15000, 100.0, 'ACTIVE')
  `).run(testRespondentId, `resp_payout_${Date.now()}@test.local`);

  // 4.1. Rút phá băng lần đầu qua Thẻ cào: 1,000 điểm (10,000đ) -> Cho phép và miễn phí 0đ
  const p1 = ledgerService.requestPayout(testRespondentId, 1000, 'PHONE_CARD', { phone: '0987654321', telco: 'VIETTEL' });
  assert.strictEqual(p1.success, true);
  assert.strictEqual(p1.netAmountVnd, 10000, 'Thẻ cào 10k: Phí 0đ, nhận đủ 10,000đ');
  assert.strictEqual(p1.feeVnd, 0);

  // 4.2. Sau lần đầu: Thử rút tiếp 1,000 điểm qua Thẻ cào -> Phải từ chối vì từ lần 2 trở đi áp dụng ngưỡng chuẩn 5,000 điểm
  assert.throws(() => {
    ledgerService.requestPayout(testRespondentId, 1000, 'PHONE_CARD', { phone: '0987654321', telco: 'VIETTEL' });
  }, /Số điểm rút tối thiểu là 5[.,]000 điểm/);

  // 4.3. Rút ngân hàng dưới 100k (VD: 5,000 điểm = 50,000đ) -> Thu phí 2,000đ, nhận 48,000đ
  const p2 = ledgerService.requestPayout(testRespondentId, 5000, 'BANK_TRANSFER', { bank: 'MBBANK', account: '123456789' });
  assert.strictEqual(p2.success, true);
  assert.strictEqual(p2.feeVnd, 2000, 'Rút 50k qua ngân hàng: Phí 2,000đ');
  assert.strictEqual(p2.netAmountVnd, 48000, 'Thực nhận: 48,000đ');

  // 4.4. Thử rút ngân hàng dưới 5,000 điểm (kể cả lần đầu hoặc lần sau) -> Phải từ chối
  const testRespBankFirst = 'test_resp_bank_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Test Resp Bank', 'RESPONDENT', 0.0, 10000, 100.0, 'ACTIVE')
  `).run(testRespBankFirst, `resp_bank_${Date.now()}@test.local`);

  assert.throws(() => {
    ledgerService.requestPayout(testRespBankFirst, 2000, 'BANK_TRANSFER', { bank: 'VCB', account: '00112233' });
  }, /Số điểm rút tối thiểu là 5[.,]000 điểm/, 'Ngân hàng không áp dụng phá băng 1,000 điểm');

  // 4.5. Rút ngân hàng từ 100k trở lên (VD: 10,000 điểm = 100,000đ) -> Miễn phí 0đ
  const p3 = ledgerService.requestPayout(testRespBankFirst, 10000, 'BANK_TRANSFER', { bank: 'VCB', account: '00112233' });
  assert.strictEqual(p3.success, true);
  assert.strictEqual(p3.feeVnd, 0, 'Rút >= 100k qua ngân hàng: Miễn phí 0đ');
  assert.strictEqual(p3.netAmountVnd, 100000, 'Thực nhận đủ 100,000đ');

  console.log('  ✅ [PASS] Cấu hình và logic rút tiền kiểm thử thành công 100%!');

  console.log('\n===============================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI TEST TIERED DEPOSIT BONUS ĐẠT 100% PASS!');
  console.log('===============================================================');
}

if (require.main === module) {
  runDepositBonusTests().catch(err => {
    console.error('Lỗi test:', err);
    process.exit(1);
  });
}

module.exports = runDepositBonusTests;
