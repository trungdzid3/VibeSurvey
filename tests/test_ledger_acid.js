/**
 * Bộ kiểm thử Tầng 2: Double-Entry Ledger & ACID Concurrency Test
 * Kiểm tra tính nguyên tử, Chống rút tiền kép (Anti-Double Spend), và toàn vẹn sổ cái
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const db = require('../server/db/database');
const ledgerService = require('../server/services/ledgerService');

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`     Chi tiết lỗi: ${err.message}`);
    throw err;
  }
}

async function runLedgerTests() {
  console.log('===============================================================');
  console.log('BẮT ĐẦU KIỂM THỬ TẦNG 2: DOUBLE-ENTRY LEDGER & ACID TRANSACTIONS');
  console.log('===============================================================');

  // Khởi tạo các ID thử nghiệm biệt lập
  const testCreatorId = 'test_creator_' + crypto.randomUUID();
  const testRespondentId = 'test_respondent_' + crypto.randomUUID();
  const testSurveyId = 'test_survey_' + crypto.randomUUID();

  // Tạo dữ liệu tài khoản thử nghiệm trực tiếp vào DB
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Test Creator', 'CREATOR', 0.0, 0, 100.0, 'ACTIVE')
  `).run(testCreatorId, `creator_${Date.now()}@test.local`);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, credit_balance, point_balance, trust_score, status)
    VALUES (?, ?, 'hash', 'Test Respondent', 'RESPONDENT', 0.0, 60000, 95.0, 'ACTIVE')
  `).run(testRespondentId, `respondent_${Date.now()}@test.local`);

  // 1. Kiểm tra Atomicity khi nạp tiền
  await runTest('1. Tính nguyên tử nạp tiền Creator (Deposit Credit)', async () => {
    const depositAmount = 500000; // 500,000 VND (Nhận +5% bonus Credit = +25,000đ và 2 vé VIP)
    const res = ledgerService.depositCredit(testCreatorId, depositAmount, 'Nạp tiền thử nghiệm');

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.newBalance, 525000);
    assert.strictEqual(res.fastTrackTickets, 2);

    // Kiểm tra DB
    const user = db.prepare('SELECT credit_balance, fast_track_tickets FROM users WHERE id = ?').get(testCreatorId);
    assert.strictEqual(user.credit_balance, 525000);
    assert.strictEqual(user.fast_track_tickets, 2);

    // Kiểm tra lịch sử giao dịch sổ cái
    const tx = db.prepare('SELECT * FROM point_transactions WHERE user_id = ? AND tx_type = ?').get(testCreatorId, 'DEPOSIT_CREDIT');
    assert(tx, 'Giao dịch DEPOSIT_CREDIT phải được ghi vào point_transactions');
    assert.strictEqual(tx.amount, 500000);
    assert.strictEqual(tx.currency, 'VND');
    assert.strictEqual(tx.balance_after, 500000);

    // Thử nạp tiền số âm -> Phải ném lỗi và Rollback
    assert.throws(() => {
      ledgerService.depositCredit(testCreatorId, -50000);
    }, /Số tiền nạp/);

    const userAfterFail = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(testCreatorId);
    assert.strictEqual(userAfterFail.credit_balance, 525000, 'Số dư không bị thay đổi sau giao dịch thất bại');
  });

  // 2. Kiểm tra Khóa Quỹ Ký Quỹ Escrow (Escrow Lock)
  await runTest('2. Khóa quỹ ký quỹ Escrow và cơ chế bảo vệ thiếu hụt số dư', async () => {
    // Tạo bản nháp khảo sát cho creator
    db.prepare(`
      INSERT INTO surveys (id, creator_id, title, description, category, target_responses, collected_responses, 
                           cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec, status)
      VALUES (?, ?, 'Test Survey Escrow', 'Desc', 'Test', 100, 0, 3000, 180, 0.0, 15, 'DRAFT')
    `).run(testSurveyId, testCreatorId);

    // Tổng tiền cần ký quỹ: 300,000 VND. Creator đang có: 525,000 VND -> Đủ điều kiện
    const lockResult = ledgerService.lockEscrowForSurvey(testSurveyId, testCreatorId, 300000);
    assert.strictEqual(lockResult.success, true);
    assert.strictEqual(lockResult.newCreditBalance, 225000);
    assert.strictEqual(lockResult.newEscrowBalance, 300000);

    // Kiểm tra trạng thái khảo sát đã chuyển ACTIVE
    const survey = db.prepare('SELECT status, escrow_locked_balance FROM surveys WHERE id = ?').get(testSurveyId);
    assert.strictEqual(survey.status, 'ACTIVE');
    assert.strictEqual(survey.escrow_locked_balance, 300000);

    // Kiểm tra số dư ví Creator
    const creator = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(testCreatorId);
    assert.strictEqual(creator.credit_balance, 225000);

    // Kiểm tra giao dịch sổ cái ESCROW_LOCK
    const lockTx = db.prepare('SELECT * FROM point_transactions WHERE user_id = ? AND tx_type = ?').get(testCreatorId, 'ESCROW_LOCK');
    assert.strictEqual(lockTx.amount, -300000);
    assert.strictEqual(lockTx.balance_after, 225000);

    // Thử ký quỹ một khảo sát khác đòi 400,000 VND (vượt quá 225,000 VND còn lại) -> Phải ROLLBACK
    const overDraftSurveyId = 'survey_overdraft_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO surveys (id, creator_id, title, description, category, target_responses, collected_responses, 
                           cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec, status)
      VALUES (?, ?, 'Survey Overdraft', 'Desc', 'Test', 100, 0, 4000, 240, 0.0, 15, 'DRAFT')
    `).run(overDraftSurveyId, testCreatorId);

    assert.throws(() => {
      ledgerService.lockEscrowForSurvey(overDraftSurveyId, testCreatorId, 400000);
    }, /Số dư không đủ/);

    // Xác nhận số dư Creator vẫn giữ nguyên 225,000 VND và khảo sát chưa bị chuyển ACTIVE
    const creatorAfterOverdraft = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(testCreatorId);
    assert.strictEqual(creatorAfterOverdraft.credit_balance, 225000);

    const failedSurvey = db.prepare('SELECT status, escrow_locked_balance FROM surveys WHERE id = ?').get(overDraftSurveyId);
    assert.strictEqual(failedSurvey.status, 'DRAFT');
    assert.strictEqual(failedSurvey.escrow_locked_balance, 0.0);
  });

  // 3. Kiểm tra Chống Rút Tiền Kép (Anti-Double Spend)
  await runTest('3. Chống Rút Tiền Kép (Anti-Double Spend): Giả lập gửi 10 lệnh rút 100,000 điểm MoMo đồng thời khi tài khoản chỉ có 120,000 điểm', async () => {
    // Cấp cho testRespondentId thêm 60,000 điểm có ghi nhận sổ cái để đạt 120,000 điểm (ban đầu có 60k)
    db.prepare(`
      INSERT INTO point_transactions (id, user_id, tx_type, currency, amount, balance_after, description)
      VALUES (?, ?, 'SURVEY_REWARD', 'POINT', 60000, 120000, 'Thưởng bổ sung khảo sát test')
    `).run(crypto.randomUUID(), testRespondentId);
    db.prepare('UPDATE users SET point_balance = 120000 WHERE id = ?').run(testRespondentId);
    const initialUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(testRespondentId);
    assert.strictEqual(initialUser.point_balance, 120000, 'Số dư ban đầu phải là 120,000 điểm');

    const concurrentRequests = 10;
    const withdrawAmount = 100000; // Mỗi lệnh rút 100,000 điểm (100,000 VNĐ qua MoMo, phí 0đ)

    let successCount = 0;
    let failureCount = 0;

    // Giả lập 10 requests tới đồng thời bằng Promise.allSettled
    const promises = Array.from({ length: concurrentRequests }, (_, i) => {
      return new Promise((resolve, reject) => {
        try {
          const res = ledgerService.requestPayout(
            testRespondentId,
            withdrawAmount,
            'MOMO',
            { phone: '0901234567', name: `Test User ${i}` }
          );
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });

    const settled = await Promise.allSettled(promises);

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log(`     -> Kết quả Concurrency: ${successCount} lệnh THÀNH CÔNG, ${failureCount} lệnh BỊ TỪ CHỐI`);

    // XÁC NHẬN CHỐNG DOUBLE SPEND
    assert.strictEqual(successCount, 1, 'Chỉ duy nhất 1 lệnh được phép thành công!');
    assert.strictEqual(failureCount, 9, '9 lệnh còn lại phải bị từ chối vì không đủ số dư!');

    // Kiểm tra số dư cuối cùng trong DB
    const finalUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(testRespondentId);
    assert.strictEqual(finalUser.point_balance, 20000, 'Số dư còn lại phải chính xác là 20,000 điểm (120,000 - 100,000)');
    assert(finalUser.point_balance >= 0, 'SỐ DƯ ĐIỂM TUYỆT ĐỐI KHÔNG BAO GIỜ ĐƯỢC PHÉP BỊ ÂM');

    // Kiểm tra bảng payout_requests: chỉ có 1 bản ghi được tạo
    const payoutRecords = db.prepare('SELECT * FROM payout_requests WHERE user_id = ?').all(testRespondentId);
    assert.strictEqual(payoutRecords.length, 1);
    assert.strictEqual(payoutRecords[0].points_amount, 100000);
  });

  // 4. Kiểm tra Trả Thưởng Khảo Sát & Giải Phóng Quỹ Ký Quỹ
  await runTest('4. Cơ chế phân phối điểm thưởng khảo sát (Reward Distribution)', async () => {
    const responseId = 'resp_test_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
      VALUES (?, ?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)
    `).run(responseId, testSurveyId, testRespondentId);

    // Thưởng 180 điểm cho respondent, trừ 3,000 VND từ quỹ ký quỹ của khảo sát
    const rewardRes = ledgerService.rewardSurveyCompletion(
      testSurveyId,
      testRespondentId,
      responseId,
      180,
      3000
    );

    assert.strictEqual(rewardRes.success, true);
    assert.strictEqual(rewardRes.newPointBalance, 20180); // 20,000 + 180

    const respondent = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(testRespondentId);
    assert.strictEqual(respondent.point_balance, 20180);

    const survey = db.prepare('SELECT escrow_locked_balance, collected_responses FROM surveys WHERE id = ?').get(testSurveyId);
    assert.strictEqual(survey.escrow_locked_balance, 297000); // 300,000 - 3,000
    assert.strictEqual(survey.collected_responses, 1);
  });

  // 5. Kiểm tra Hoàn Quỹ Ký Quỹ (Escrow Refund)
  await runTest('5. Hoàn quỹ ký quỹ còn dư về ví Creator khi kết thúc khảo sát', async () => {
    const surveyBefore = db.prepare('SELECT escrow_locked_balance FROM surveys WHERE id = ?').get(testSurveyId);
    const remainingEscrow = surveyBefore.escrow_locked_balance; // 297,000 VND

    const refundRes = ledgerService.refundRemainingEscrow(testSurveyId, testCreatorId);
    assert.strictEqual(refundRes.success, true);
    assert.strictEqual(refundRes.refundedAmount, remainingEscrow);

    // Kiểm tra ví Creator: 225,000 + 297,000 = 522,000 VND
    const creator = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(testCreatorId);
    assert.strictEqual(creator.credit_balance, 522000);

    // Khảo sát về 0 escrow và trạng thái CLOSED
    const surveyAfter = db.prepare('SELECT status, escrow_locked_balance FROM surveys WHERE id = ?').get(testSurveyId);
    assert.strictEqual(surveyAfter.status, 'CLOSED');
    assert.strictEqual(surveyAfter.escrow_locked_balance, 0.0);
  });

  // 6. Kiểm tra Toàn Vẹn Sổ Cái Kế Toán Kép (Double-Entry Ledger Reconciliation)
  await runTest('6. Đối soát toàn vẹn Sổ Cái Kế Toán Kép (Double-Entry Ledger Reconciliation)', async () => {
    // 1. Đối soát ví VND của Creator
    const creatorTxs = db.prepare(`
      SELECT SUM(amount) AS total_vnd 
      FROM point_transactions 
      WHERE user_id = ? AND currency = 'VND'
    `).get(testCreatorId);

    const creatorUser = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(testCreatorId);
    assert.strictEqual(
      creatorTxs.total_vnd,
      creatorUser.credit_balance,
      `Tổng biến động VND sổ cái (${creatorTxs.total_vnd}) phải khớp 100% với số dư hiện tại (${creatorUser.credit_balance})`
    );

    // 2. Đối soát ví POINT của Respondent
    const respondentTxs = db.prepare(`
      SELECT SUM(amount) AS total_point_changes 
      FROM point_transactions 
      WHERE user_id = ? AND currency = 'POINT'
    `).get(testRespondentId);

    const initialPoints = 60000;
    const calculatedPoints = initialPoints + respondentTxs.total_point_changes;
    const respondentUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(testRespondentId);

    assert.strictEqual(
      calculatedPoints,
      respondentUser.point_balance,
      `Số dư điểm tính từ sổ cái (${calculatedPoints}) phải khớp với số dư người dùng (${respondentUser.point_balance})`
    );

    console.log(`     -> Đối soát số dư Creator: ${creatorUser.credit_balance.toLocaleString('vi-VN')} VND == Sổ cái`);
    console.log(`     -> Đối soát số dư Respondent: ${respondentUser.point_balance.toLocaleString()} Điểm == Sổ cái`);
  });

  console.log('---------------------------------------------------------------');
  console.log(`TẦNG 2 KẾT THÚC: ${passedTests}/${totalTests} BÀI KIỂM THỬ THÀNH CÔNG (100% PASS)`);
  console.log('===============================================================\n');

  return { passedTests, totalTests };
}

if (require.main === module) {
  runLedgerTests().catch(err => {
    console.error('Lỗi kiểm thử Tầng 2:', err);
    process.exit(1);
  });
}

module.exports = runLedgerTests;
