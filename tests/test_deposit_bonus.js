/**
 * TEST SUITE: TIERED DEPOSIT BONUS & MỐC RÚT TIỀN (BACKEND TIỀN TỆ & KHÓA VAN MỘT CHIỀU)
 * Xác minh theo KE_HOACH_TONG_THE.md và Task 2:
 * 1. Bảng mốc nạp từ 20k: 20k (0%), 50k (+2%), 100k (+3%), 200k (+4% + 1 vé VIP), 500k (+5% + 2 vé VIP), 1M (+6% + 4 vé VIP), 2M (+8% + 8 vé VIP), 5M (+10% + 20 vé VIP).
 * 2. Cộng dồn credit_balance = credit_balance + amount + bonusCreditVnd trong Transaction ACID, fast_track_tickets cộng dồn, point_balance giữ nguyên = 0.
 * 3. Đổi Point sang Credit (+5% giá trị, tối thiểu 5.000 Point/lần), khóa van 1 chiều.
 * 4. Kiểm tra cấu hình và logic rút tiền 1:1 VNĐ:
 *    - Thẻ cào lần đầu: 10.000 Point = 10.000đ (0đ phí).
 *    - Thẻ cào tiêu chuẩn: 20k, 50k, 100k (0đ phí).
 *    - Ngân hàng/MoMo: 50k (thu 2.000đ phí, nhận 48.000đ); từ 100k trở lên (100k, 200k, 500k) phí 0đ.
 *    - Chặn rút khi trust_score < 60.0.
 * 5. Toàn vẹn Sổ cái kép (Double-Entry Ledger).
 */

const assert = require('assert');
const crypto = require('crypto');
const db = require('../server/db/database');
const ledgerService = require('../server/services/ledgerService');
const config = require('../server/config');

async function runDepositBonusTests() {
  console.log('===============================================================');
  console.log('BẮT ĐẦU KIỂM THỬ: TIERED DEPOSIT BONUS & CẤU HÌNH RÚT TIỀN');
  console.log('===============================================================');

  const testUserId = 'test_depositor_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, fast_track_tickets, trust_score, status)
    VALUES (?, ?, 'hash', 'Test Depositor', 'CREATOR', 0.0, 0, 0, 100.0, 'ACTIVE')
  `).run(testUserId, `depositor_${Date.now()}@test.local`);

  // 1. Kiểm tra hàm tính bonus Credit tạo form độc lập theo bảng mốc mới từ 20k
  console.log('\n--- 1. Kiểm tra công thức bảng mốc nạp từ 20k ---');
  
  // 1.1 Dưới 20k: 0% bonus, 0 vé
  const b10k = ledgerService.calculateDepositBonus(10000);
  assert.strictEqual(b10k.bonusPercent, 0, 'Dưới 20k: 0% bonus');
  assert.strictEqual(b10k.bonusTickets, 0, 'Dưới 20k: 0 vé');
  assert.strictEqual(b10k.bonusCreditVnd, 0);

  // 1.2 Mốc 20k (Sinh viên 50 mẫu): 0% bonus, 0 vé VIP
  const b20k = ledgerService.calculateDepositBonus(20000);
  assert.strictEqual(b20k.bonusPercent, 0, '20k: 0% bonus');
  assert.strictEqual(b20k.bonusTickets, 0, '20k: 0 vé');
  assert.strictEqual(b20k.bonusCreditVnd, 0);
  assert.strictEqual(b20k.totalCreditVnd, 20000);

  // 1.3 Mốc 50k: +2% bonus, 0 vé VIP
  const b50k = ledgerService.calculateDepositBonus(50000);
  assert.strictEqual(b50k.bonusPercent, 2, '50k: +2% bonus');
  assert.strictEqual(b50k.bonusTickets, 0, '50k: 0 vé');
  assert.strictEqual(b50k.bonusCreditVnd, 1000, '50k tặng 1.000 Credit');
  assert.strictEqual(b50k.totalCreditVnd, 51000);

  // 1.4 Mốc 100k: +3% bonus, 0 vé VIP
  const b100k = ledgerService.calculateDepositBonus(100000);
  assert.strictEqual(b100k.bonusPercent, 3, '100k: +3% bonus');
  assert.strictEqual(b100k.bonusTickets, 0, '100k: 0 vé');
  assert.strictEqual(b100k.bonusCreditVnd, 3000, '100k tặng 3.000 Credit');
  assert.strictEqual(b100k.totalCreditVnd, 103000);

  // 1.5 Mốc 200k: +4% bonus, 1 vé VIP
  const b200k = ledgerService.calculateDepositBonus(200000);
  assert.strictEqual(b200k.bonusPercent, 4, '200k: +4% bonus');
  assert.strictEqual(b200k.bonusTickets, 1, '200k: 1 vé VIP');
  assert.strictEqual(b200k.bonusCreditVnd, 8000, '200k tặng 8.000 Credit');
  assert.strictEqual(b200k.totalCreditVnd, 208000);

  // 1.6 Mốc 500k: +5% bonus, 2 vé VIP
  const b500k = ledgerService.calculateDepositBonus(500000);
  assert.strictEqual(b500k.bonusPercent, 5, '500k: +5% bonus');
  assert.strictEqual(b500k.bonusTickets, 2, '500k: 2 vé VIP');
  assert.strictEqual(b500k.bonusCreditVnd, 25000, '500k tặng 25.000 Credit');
  assert.strictEqual(b500k.totalCreditVnd, 525000);

  // 1.7 Mốc 1M: +6% bonus, 4 vé VIP
  const b1m = ledgerService.calculateDepositBonus(1000000);
  assert.strictEqual(b1m.bonusPercent, 6, '1M: +6% bonus');
  assert.strictEqual(b1m.bonusTickets, 4, '1M: 4 vé VIP');
  assert.strictEqual(b1m.bonusCreditVnd, 60000, '1M tặng 60.000 Credit');
  assert.strictEqual(b1m.totalCreditVnd, 1060000);

  // 1.8 Mốc 2M: +8% bonus, 8 vé VIP
  const b2m = ledgerService.calculateDepositBonus(2000000);
  assert.strictEqual(b2m.bonusPercent, 8, '2M: +8% bonus');
  assert.strictEqual(b2m.bonusTickets, 8, '2M: 8 vé VIP');
  assert.strictEqual(b2m.bonusCreditVnd, 160000, '2M tặng 160.000 Credit');
  assert.strictEqual(b2m.totalCreditVnd, 2160000);

  // 1.9 Mốc 5M: +10% bonus, 20 vé VIP
  const b5m = ledgerService.calculateDepositBonus(5000000);
  assert.strictEqual(b5m.bonusPercent, 10, '5M: +10% bonus');
  assert.strictEqual(b5m.bonusTickets, 20, '5M: 20 vé VIP');
  assert.strictEqual(b5m.bonusCreditVnd, 500000, '5M tặng 500.000 Credit');
  assert.strictEqual(b5m.totalCreditVnd, 5500000);

  console.log('  [PASS] Công thức bậc thang bonus Credit và vé VIP chuẩn xác 100%!');

  // 2. Kiểm tra nạp 1,000,000 VNĐ thực tế vào DB (ACID Transaction)
  console.log('\n--- 2. Kiểm tra nạp tiền thực tế & Ghi nhận Sổ cái kép ---');
  const res1 = ledgerService.depositCredit(testUserId, 1000000, 'Nạp gói 1 Triệu');
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.newBalance, 1060000, 'Số dư Credit nhận đủ 1,060,000đ (1M gốc + 60k bonus 6%)');
  assert.strictEqual(res1.newPointBalance, 0, 'point_balance tuyệt đối giữ nguyên 0!');
  assert.strictEqual(res1.bonusCreditVnd, 60000);
  assert.strictEqual(res1.bonusPercent, 6);
  assert.strictEqual(res1.fastTrackTickets, 4, 'Được cộng 4 vé VIP');

  const u1 = db.prepare('SELECT credit_balance, point_balance, fast_track_tickets FROM users WHERE id = ?').get(testUserId);
  assert.strictEqual(u1.credit_balance, 1060000);
  assert.strictEqual(u1.point_balance, 0, 'User DB: point_balance = 0');
  assert.strictEqual(u1.fast_track_tickets, 4, 'User DB: fast_track_tickets = 4');

  // Kiểm tra Sổ cái: Phải có 2 bản ghi VND (tiền nạp gốc và bonus), 0 bản ghi POINT
  const txVndList = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND currency = 'VND' ORDER BY created_at ASC").all(testUserId);
  assert.strictEqual(txVndList.length, 2, 'Có đúng 2 giao dịch VND trong sổ cái');
  assert.strictEqual(txVndList[0].amount, 1000000, 'Giao dịch 1: Nạp 1,000,000đ');
  assert.strictEqual(txVndList[0].balance_after, 1000000);
  assert.strictEqual(txVndList[1].amount, 60000, 'Giao dịch 2: Bonus +60,000đ');
  assert.strictEqual(txVndList[1].balance_after, 1060000);

  const txPointList = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND currency = 'POINT'").all(testUserId);
  assert.strictEqual(txPointList.length, 0, 'Tuyệt đối KHÔNG có giao dịch POINT phát sinh từ nạp tiền');
  console.log('  [PASS] Nạp 1M: Nhận đúng 1,060,000đ Credit tạo form, 4 vé VIP và 0 Điểm thưởng trong cùng 1 Transaction ACID!');

  // 3. Nạp tiếp 2,000,000 VNĐ (Cộng dồn lũy tiến)
  console.log('\n--- 3. Nạp lũy tiến 2,000,000 VNĐ (Bậc Bạch Kim +8%, +8 vé VIP) ---');
  const res2 = ledgerService.depositCredit(testUserId, 2000000, 'Nạp gói 2 Triệu');
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.newBalance, 1060000 + 2160000, 'Số dư mới = 3,220,000đ Credit');
  assert.strictEqual(res2.newPointBalance, 0, 'point_balance vẫn giữ nguyên 0');
  assert.strictEqual(res2.fastTrackTickets, 4 + 8, 'Vé VIP cộng dồn = 12 vé');

  const u2 = db.prepare('SELECT credit_balance, point_balance, fast_track_tickets FROM users WHERE id = ?').get(testUserId);
  assert.strictEqual(u2.credit_balance, 3220000);
  assert.strictEqual(u2.point_balance, 0);
  assert.strictEqual(u2.fast_track_tickets, 12);

  // Đối soát tổng sổ cái
  const totalVndTx = db.prepare("SELECT SUM(amount) AS total FROM point_transactions WHERE user_id = ? AND currency = 'VND'").get(testUserId).total;
  assert.strictEqual(totalVndTx, 3220000, 'Đối soát tổng biến động VND khớp 100% với số dư');
  console.log('  [PASS] Số dư lũy tiến: 3,220,000đ Credit tạo form + 12 vé VIP + 0 Điểm (Sổ cái toàn vẹn 100%)!');

  // 4. Kiểm tra Cấu hình & Logic Rút Tiền Mới
  console.log('\n--- 4. Kiểm tra Cấu hình & Logic Rút Tiền 1:1 VNĐ ---');
  assert.strictEqual(config.ECONOMICS.MIN_FIRST_TIME_PAYOUT_POINTS, 10000, 'Ngưỡng phá băng lần đầu thẻ cào: 10.000 điểm');
  assert.strictEqual(config.ECONOMICS.MIN_PAYOUT_POINTS, 20000, 'Ngưỡng tiêu chuẩn thẻ cào: 20.000 điểm');
  assert.strictEqual(config.ECONOMICS.PHONE_CARD_FEE_VND, 0, 'Phí thẻ cào: 0đ');
  assert.strictEqual(config.ECONOMICS.BANK_TRANSFER_FEE_UNDER_100K_VND, 2000, 'Phí ngân hàng < 100k: 2,000đ');
  assert.strictEqual(config.ECONOMICS.BANK_TRANSFER_FEE_FROM_100K_VND, 0, 'Phí ngân hàng >= 100k: miễn phí');

  // Tạo tài khoản Respondent để test các luồng rút tiền
  const testRespondentId = 'test_resp_payout_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Test Respondent Payout', 'RESPONDENT', 0.0, 180000, 100.0, 'ACTIVE')
  `).run(testRespondentId, `resp_payout_${Date.now()}@test.local`);

  // 4.1. Rút phá băng lần đầu qua Thẻ cào: 10.000 điểm (10.000đ) -> Cho phép và miễn phí 0đ
  const p1 = ledgerService.requestPayout(testRespondentId, 10000, 'PHONE_CARD', { phone: '0987654321', telco: 'VIETTEL' });
  assert.strictEqual(p1.success, true);
  assert.strictEqual(p1.netAmountVnd, 10000, 'Thẻ cào 10k: Phí 0đ, nhận đủ 10,000đ');
  assert.strictEqual(p1.feeVnd, 0);

  // 4.2. Sau lần đầu: Thử rút tiếp 10.000 điểm qua Thẻ cào -> Phải từ chối vì từ lần 2 trở đi áp dụng ngưỡng chuẩn 20.000 điểm
  assert.throws(() => {
    ledgerService.requestPayout(testRespondentId, 10000, 'PHONE_CARD', { phone: '0987654321', telco: 'VIETTEL' });
  }, /Số điểm rút tối thiểu là 20[.,]000 điểm/);

  // 4.3. Rút thẻ cào chuẩn 20.000 điểm -> Thành công, phí 0đ
  const p1_standard = ledgerService.requestPayout(testRespondentId, 20000, 'PHONE_CARD', { phone: '0987654321', telco: 'VIETTEL' });
  assert.strictEqual(p1_standard.success, true);
  assert.strictEqual(p1_standard.netAmountVnd, 20000);
  assert.strictEqual(p1_standard.feeVnd, 0);

  // 4.4. Rút ngân hàng mốc 50k (50.000 điểm) -> Thu phí 2.000đ, nhận 48.000đ
  const p2 = ledgerService.requestPayout(testRespondentId, 50000, 'BANK_TRANSFER', { bank: 'MBBANK', account: '123456789' });
  assert.strictEqual(p2.success, true);
  assert.strictEqual(p2.feeVnd, 2000, 'Rút 50k qua ngân hàng: Phí 2,000đ');
  assert.strictEqual(p2.netAmountVnd, 48000, 'Thực nhận: 48,000đ');

  // 4.5. Thử rút ngân hàng dưới 50.000 điểm (VD: 20.000 điểm) -> Phải từ chối (ngưỡng tối thiểu ngân hàng 50k)
  assert.throws(() => {
    ledgerService.requestPayout(testRespondentId, 20000, 'BANK_TRANSFER', { bank: 'VCB', account: '00112233' });
  }, /Số điểm rút tối thiểu là 50[.,]000 điểm/, 'Ngân hàng yêu cầu tối thiểu 50.000 điểm');

  // 4.6. Rút ngân hàng từ 100k trở lên (VD: 100.000 điểm = 100.000đ) -> Miễn phí 0đ
  const p3 = ledgerService.requestPayout(testRespondentId, 100000, 'BANK_TRANSFER', { bank: 'VCB', account: '00112233' });
  assert.strictEqual(p3.success, true);
  assert.strictEqual(p3.feeVnd, 0, 'Rút >= 100k qua ngân hàng: Miễn phí 0đ');
  assert.strictEqual(p3.netAmountVnd, 100000, 'Thực nhận đủ 100,000đ');

  // 4.7. Kiểm tra chặn rút tiền khi trust_score < 60.0
  const lowTrustUserId = 'test_resp_low_trust_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Low Trust User', 'RESPONDENT', 0.0, 50000, 55.0, 'ACTIVE')
  `).run(lowTrustUserId, `low_trust_${Date.now()}@test.local`);

  assert.throws(() => {
    ledgerService.requestPayout(lowTrustUserId, 10000, 'PHONE_CARD', { phone: '0987654321', telco: 'VIETTEL' });
  }, /Điểm uy tín của bạn là 55\.0\/100, cần tối thiểu 60\.0/);

  console.log('  [PASS] Cấu hình và logic rút tiền kiểm thử thành công 100%!');

  // 5. Kiểm tra Đổi Point sang Credit (+5% giá trị, tối thiểu 5.000 Point)
  console.log('\n--- 5. Kiểm tra Đổi Point sang Credit (Swap Points) ---');
  const swapUserId = 'test_resp_swap_' + crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Test Swap User', 'RESPONDENT', 1000.0, 10000, 90.0, 'ACTIVE')
  `).run(swapUserId, `swap_${Date.now()}@test.local`);

  // 5.1 Thử đổi dưới 5.000 Point -> Bị từ chối
  assert.throws(() => {
    ledgerService.swapPointsToCredit(swapUserId, 4000);
  }, /Số điểm đổi tối thiểu là 5[.,]000 điểm/);

  // 5.2 Đổi 5.000 Point -> Nhận 5.250 Credit (+5% giá trị)
  const swapRes = ledgerService.swapPointsToCredit(swapUserId, 5000);
  assert.strictEqual(swapRes.success, true);
  assert.strictEqual(swapRes.pointsDeducted, 5000);
  assert.strictEqual(swapRes.creditAddedVnd, 5250, '5.000 Point x 1.05 = 5.250 Credit');
  assert.strictEqual(swapRes.newPointBalance, 5000);
  assert.strictEqual(swapRes.newCreditBalance, 6250); // 1000 + 5250

  const userAfterSwap = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(swapUserId);
  assert.strictEqual(userAfterSwap.point_balance, 5000);
  assert.strictEqual(userAfterSwap.credit_balance, 6250);

  // Sổ cái kép cho Swap
  const swapPointTx = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND tx_type = 'POINT_TO_CREDIT_SWAP' AND currency = 'POINT'").get(swapUserId);
  assert.strictEqual(swapPointTx.amount, -5000);

  const swapVndTx = db.prepare("SELECT * FROM point_transactions WHERE user_id = ? AND tx_type = 'POINT_TO_CREDIT_SWAP' AND currency = 'VND'").get(swapUserId);
  assert.strictEqual(swapVndTx.amount, 5250);

  console.log('  [PASS] Đổi Point sang Credit (+5%) hoạt động chính xác và toàn vẹn sổ cái kép!');

  console.log('\n===============================================================');
  console.log('TẤT CẢ CÁC BÀI TEST TIERED DEPOSIT BONUS ĐẠT 100% PASS!');
  console.log('===============================================================');
}

if (require.main === module) {
  runDepositBonusTests().catch(err => {
    console.error('Lỗi test:', err);
    process.exit(1);
  });
}

module.exports = runDepositBonusTests;
