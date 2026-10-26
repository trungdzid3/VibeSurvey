const crypto = require('crypto');
const db = require('../db/database');
const config = require('../config');

class LedgerService {
  /**
   * Helper an toàn để rollback transaction trong SQLite node:sqlite
   */
  _safeRollback() {
    try {
      db.exec('ROLLBACK');
    } catch (e) {
      // Transaction có thể đã bị rollback hoặc đóng
    }
  }

  /**
   * Tính toán thưởng bonus nạp tiền bằng Credit tạo form theo bảng mốc (Tiered Deposit Bonus)
   * Nạp từ 20.000đ trở lên theo config.ECONOMICS.DEPOSIT_TIERS:
   * - Dưới 20K: 0%
   * - 20K - 49.999đ: 0% bonus, 0 vé VIP
   * - 50K - 99.999đ: +2% bonus, 0 vé VIP
   * - 100K - 199.999đ: +3% bonus, 0 vé VIP
   * - 200K - 499.999đ: +4% bonus, 1 vé VIP
   * - 500K - 999.999đ: +5% bonus, 2 vé VIP
   * - 1M - 1.99M: +6% bonus, 4 vé VIP
   * - 2M - 4.99M: +8% bonus, 8 vé VIP
   * - Từ 5M trở lên: +10% bonus, 20 vé VIP
   */
  calculateDepositBonus(amountVnd) {
    const amount = Math.floor(Number(amountVnd) || 0);
    const tiers = (config.ECONOMICS && config.ECONOMICS.DEPOSIT_TIERS) || [
      { amount: 20000, bonusRate: 0.00, bonusCredit: 0, vipTickets: 0, label: 'Sinh viên (50 mẫu)' },
      { amount: 50000, bonusRate: 0.02, bonusCredit: 1000, vipTickets: 0, label: 'Sinh viên (100 mẫu) / Cá nhân' },
      { amount: 100000, bonusRate: 0.03, bonusCredit: 3000, vipTickets: 0, label: 'Cá nhân (100 mẫu)' },
      { amount: 200000, bonusRate: 0.04, bonusCredit: 8000, vipTickets: 1, label: 'Cá nhân / Nhóm NCKH (Tặng 1 vé VIP)' },
      { amount: 500000, bonusRate: 0.05, bonusCredit: 25000, vipTickets: 2, label: 'Startup / SME nhỏ (Tặng 2 vé VIP)' },
      { amount: 1000000, bonusRate: 0.06, bonusCredit: 60000, vipTickets: 4, label: 'Doanh nghiệp Vàng (Tặng 4 vé VIP)' },
      { amount: 2000000, bonusRate: 0.08, bonusCredit: 160000, vipTickets: 8, label: 'Doanh nghiệp Bạch Kim (Tặng 8 vé VIP)' },
      { amount: 5000000, bonusRate: 0.10, bonusCredit: 500000, vipTickets: 20, label: 'Doanh nghiệp Kim Cương (Tặng 20 vé VIP)' }
    ];

    let matchedTier = null;
    const sortedTiers = [...tiers].sort((a, b) => b.amount - a.amount);
    for (const t of sortedTiers) {
      if (amount >= t.amount) {
        matchedTier = t;
        break;
      }
    }

    let bonusRate = 0;
    let bonusTickets = 0;
    let tier = 'Cơ bản';

    if (matchedTier) {
      bonusRate = matchedTier.bonusRate;
      bonusTickets = matchedTier.vipTickets || matchedTier.bonusTickets || 0;
      tier = matchedTier.label;
    }

    const bonusCreditVnd = Math.floor(amount * bonusRate);
    return {
      amountVnd: amount,
      bonusRate,
      bonusPercent: Math.round(bonusRate * 100),
      bonusTickets,
      tier,
      bonusCreditVnd,
      totalCreditVnd: amount + bonusCreditVnd
    };
  }

  /**
   * Tính toán gói dịch vụ gia tăng đặc quyền cho Doanh nghiệp (Enterprise Perks)
   * - Hỗ trợ Xuất Hóa Đơn Điện Tử VAT FULL 100% cho các khoản nạp từ 200.000đ trở lên
   * - Tặng lượt Ghim VIP (Ghim đầu trang + Bắn Thông Báo Đẩy trên App APK + Gửi Email hệ thống)
   */
  calculateEnterprisePerks(amountVnd) {
    const bonusInfo = this.calculateDepositBonus(amountVnd);
    const amount = bonusInfo.amountVnd;
    const vatInvoiceEligible = amount >= 200000;
    let perkSummary = vatInvoiceEligible 
      ? 'Hỗ trợ xuất hóa đơn VAT' 
      : 'Không hỗ trợ xuất hóa đơn VAT';

    if (bonusInfo.bonusTickets > 0) {
      perkSummary += ' + Tặng ' + bonusInfo.bonusTickets + ' Vé Ghim VIP (Ghim Top + Push App APK + Email)';
    }

    return {
      amountVnd: amount,
      tier: bonusInfo.tier,
      fastTrackTickets: bonusInfo.bonusTickets,
      freeTargetingTickets: 0,
      vatInvoiceEligible,
      hasVip: amount >= 5000000 ? 1 : 0,
      perkSummary
    };
  }

  /**
   * Nạp tiền vào tài khoản Doanh nghiệp / Creator (Credit Top-up) kèm cơ chế Thưởng Bonus Credit tạo form
   * và Gói Dịch Vụ Gia Tăng Đặc Quyền (Vé Ghim VIP, Lọc Sâu Đối Tượng)
   * Đảm bảo tính nguyên tử ACID
   */
  depositCredit(userId, amountVnd, description = 'Nạp tiền vào tài khoản') {
    const amount = Math.floor(Number(amountVnd));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Số tiền nạp phải là số dương hợp lệ');
    }

    const bonusInfo = this.calculateDepositBonus(amount);
    const enterprisePerks = this.calculateEnterprisePerks(amount);
    const bonusCreditVnd = bonusInfo.bonusCreditVnd;
    const totalCreditToAdd = amount + bonusCreditVnd;
    const bonusTickets = bonusInfo.bonusTickets;

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // Cập nhật số dư credit_balance và cộng thêm vé VIP (fast_track_tickets) cho tài khoản
      const updateRes = db.prepare(`
        UPDATE users 
        SET credit_balance = credit_balance + ?,
            fast_track_tickets = COALESCE(fast_track_tickets, 0) + ?,
            free_targeting_tickets = COALESCE(free_targeting_tickets, 0) + ?,
            has_vip_enterprise = CASE WHEN ? = 1 THEN 1 ELSE COALESCE(has_vip_enterprise, 0) END
        WHERE id = ?
      `).run(totalCreditToAdd, bonusTickets, enterprisePerks.freeTargetingTickets, enterprisePerks.hasVip, userId);

      if (updateRes.changes === 0) {
        throw new Error('Người dùng không tồn tại');
      }

      const user = db.prepare('SELECT credit_balance, point_balance, fast_track_tickets, free_targeting_tickets, has_vip_enterprise FROM users WHERE id = ?').get(userId);
      const newBalance = user.credit_balance;
      const newPointBalance = user.point_balance;

      const txId = crypto.randomUUID();
      const balanceAfterDepositOnly = newBalance - bonusCreditVnd;
      db.prepare(`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'DEPOSIT_CREDIT', 'VND', ?, ?, ?)
      `).run(txId, userId, null, amount, balanceAfterDepositOnly, description);

      // Nếu có bonus Credit, ghi nhận thêm giao dịch Sổ cái cho credit thưởng
      if (bonusCreditVnd > 0) {
        const txBonusId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
          VALUES (?, ?, ?, 'DEPOSIT_CREDIT', 'VND', ?, ?, ?)
        `).run(
          txBonusId, 
          userId, 
          txId, 
          bonusCreditVnd, 
          newBalance, 
          `Thưởng nạp tiền bậc ${bonusInfo.tier}: Tặng +${bonusInfo.bonusPercent}% Credit tạo form (+${bonusCreditVnd.toLocaleString('vi-VN')} Credit) & ${enterprisePerks.perkSummary}`
        );
      }

      db.exec('COMMIT');
      return { 
        success: true, 
        newBalance, 
        newPointBalance, 
        bonusCreditVnd, 
        bonusPercent: bonusInfo.bonusPercent, 
        tier: bonusInfo.tier, 
        bonusTickets,
        totalCreditVnd: bonusInfo.totalCreditVnd,
        enterprisePerks,
        fastTrackTickets: user.fast_track_tickets,
        freeTargetingTickets: user.free_targeting_tickets,
        hasVipEnterprise: user.has_vip_enterprise,
        txId 
      };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * Khóa tiền ký quỹ (Escrow Lock) khi Creator xuất bản khảo sát
   * Đảm bảo tính nguyên tử: Trừ tiền creator nếu đủ số dư, đổi trạng thái DRAFT -> ACTIVE
   */
  lockEscrowForSurvey(surveyId, userId, totalEscrowVnd, options = {}) {
    const escrowAmount = Math.floor(Number(totalEscrowVnd));
    if (!Number.isFinite(escrowAmount) || escrowAmount <= 0) {
      throw new Error('Số tiền ký quỹ không hợp lệ');
    }

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // 1. Kiểm tra khảo sát còn ở trạng thái DRAFT và thuộc sở hữu của creator không
      const survey = db.prepare('SELECT id, status, target_responses, escrow_locked_balance FROM surveys WHERE id = ? AND creator_id = ?').get(surveyId, userId);
      if (!survey) throw new Error('Khảo sát không tồn tại hoặc không thuộc quyền sở hữu');
      if (survey.status !== 'DRAFT') throw new Error('Khảo sát đã được xuất bản hoặc đã kết thúc');

      // 2a. Nếu kích hoạt Gói Dùng Thử Miễn Phí (First Survey Free Trial - 25 Lượt Đầu Miễn Phí)
      if (options.useFreeTrial) {
        const user = db.prepare('SELECT id, credit_balance, free_trial_surveys_available FROM users WHERE id = ?').get(userId);
        if (!user || (user.free_trial_surveys_available || 0) < 1) {
          throw new Error('Bạn đã sử dụng hết lượt khảo sát dùng thử miễn phí');
        }

        const target = survey.target_responses || 1;
        const costPerResp = Math.round(escrowAmount / target);
        const freeResponses = Math.min(25, target);
        const paidResponses = Math.max(0, target - freeResponses);
        const sponsoredAmount = freeResponses * costPerResp;
        const userPaidAmount = paidResponses * costPerResp;

        if (userPaidAmount > 0 && user.credit_balance < userPaidAmount) {
          throw new Error(`Bạn được tặng 25 lượt miễn phí, ${paidResponses} lượt còn lại cần ${userPaidAmount.toLocaleString('vi-VN')} đ (Số dư hiện tại: ${user.credit_balance.toLocaleString('vi-VN')} đ). Vui lòng nạp thêm quỹ.`);
        }

        // Trừ 1 lượt dùng thử và trừ tiền phần vượt quá (nếu có)
        db.prepare(`
          UPDATE users 
          SET free_trial_surveys_available = free_trial_surveys_available - 1,
              credit_balance = credit_balance - ? 
          WHERE id = ?
        `).run(userPaidAmount, userId);

        // Kích hoạt khảo sát sang ACTIVE và nạp đủ quỹ ký quỹ (phần sàn tài trợ + phần người dùng trả)
        db.prepare(`
          UPDATE surveys 
          SET escrow_locked_balance = ?, status = 'ACTIVE', is_free_trial = 1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND creator_id = ? AND status = 'DRAFT'
        `).run(escrowAmount, surveyId, userId);

        const newBal = user.credit_balance - userPaidAmount;

        // Ghi transaction tài trợ miễn phí
        const txFreeId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
          VALUES (?, ?, ?, 'ESCROW_LOCK', 'VND', 0, ?, ?)
        `).run(txFreeId, userId, surveyId, newBal, `[Tài Trợ Miễn Phí] Miễn phí ${freeResponses} lượt phản hồi đầu tay (Sàn tài trợ ${sponsoredAmount.toLocaleString('vi-VN')} đ)`);

        // Nếu có phần vượt quá 25 lượt, ghi transaction trừ tiền thật
        if (userPaidAmount > 0) {
          const txPaidId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
            VALUES (?, ?, ?, 'ESCROW_LOCK', 'VND', ?, ?, ?)
          `).run(txPaidId, userId, surveyId, -userPaidAmount, newBal, `Ký quỹ ${paidResponses} lượt khảo sát (vượt gói 25 lượt miễn phí): ${surveyId}`);
        }

        db.exec('COMMIT');
        return {
          success: true,
          isFreeTrial: true,
          freeResponses,
          paidResponses,
          sponsoredAmount,
          userPaidAmount,
          newCreditBalance: newBal,
          newEscrowBalance: escrowAmount,
          freeTrialSurveysAvailable: (user.free_trial_surveys_available - 1)
        };
      }

      // 2b. Trừ tiền nguyên tử với điều kiện credit_balance >= escrowAmount (Chống race condition / âm số dư)
      const updateCredit = db.prepare(`
        UPDATE users 
        SET credit_balance = credit_balance - ? 
        WHERE id = ? AND credit_balance >= ?
      `).run(escrowAmount, userId, escrowAmount);

      if (updateCredit.changes === 0) {
        const user = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(userId);
        const curBalance = user ? user.credit_balance : 0;
        throw new Error(`Số dư không đủ. Cần ${escrowAmount.toLocaleString('vi-VN')} đ, số dư hiện có: ${curBalance.toLocaleString('vi-VN')} đ`);
      }

      // 3. Cập nhật khảo sát sang ACTIVE và tăng quỹ ký quỹ
      const updateSurvey = db.prepare(`
        UPDATE surveys 
        SET escrow_locked_balance = escrow_locked_balance + ?, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND creator_id = ? AND status = 'DRAFT'
      `).run(escrowAmount, surveyId, userId);

      if (updateSurvey.changes === 0) {
        throw new Error('Khảo sát đã được xuất bản hoặc thay đổi trạng thái trước đó');
      }

      const updatedUser = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(userId);
      const updatedSurvey = db.prepare('SELECT escrow_locked_balance FROM surveys WHERE id = ?').get(surveyId);

      const txId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'ESCROW_LOCK', 'VND', ?, ?, ?)
      `).run(txId, userId, surveyId, -escrowAmount, updatedUser.credit_balance, `Ký quỹ chiến dịch khảo sát: ${surveyId}`);

      db.exec('COMMIT');
      return { success: true, newCreditBalance: updatedUser.credit_balance, newEscrowBalance: updatedSurvey.escrow_locked_balance };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * Trả điểm thưởng cho Respondent từ quỹ ký quỹ của khảo sát
   * Đảm bảo tính nguyên tử: Chống cộng điểm kép (Double Reward Race Condition),
   * bảo đảm không vượt quá số lượng mẫu mục tiêu (target_responses).
   */
  rewardSurveyCompletion(surveyId, respondentId, responseId, pointsReward, costPerResponseVnd) {
    const points = Math.floor(Number(pointsReward));
    const cost = Number(costPerResponseVnd);
    if (!Number.isFinite(points) || points <= 0) throw new Error('Điểm thưởng không hợp lệ');
    if (!Number.isFinite(cost) || cost < 0) throw new Error('Chi phí mẫu không hợp lệ');

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // 1. Kiểm tra khảo sát còn hoạt động và chưa đầy mẫu
      const survey = db.prepare('SELECT id, escrow_locked_balance, collected_responses, target_responses, status FROM surveys WHERE id = ?').get(surveyId);
      if (!survey) throw new Error('Khảo sát không tồn tại');
      if (survey.status !== 'ACTIVE') throw new Error('Khảo sát không còn nhận câu trả lời');
      if (survey.collected_responses >= survey.target_responses) {
        throw new Error('Khảo sát đã đạt đủ số lượng mẫu mục tiêu');
      }

      // 2. CHỐT CHẶN CHỐNG DOUBLE REWARD: Cập nhật bài làm với điều kiện status != 'VALIDATED' hoặc points_rewarded = 0
      const updateResp = db.prepare(`
        UPDATE responses 
        SET status = 'VALIDATED', points_rewarded = ?, submitted_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND respondent_id = ? AND (status != 'VALIDATED' OR points_rewarded = 0)
      `).run(points, responseId, respondentId);

      if (updateResp.changes === 0) {
        throw new Error('Bài làm khảo sát này đã được trả thưởng hoặc đã được xử lý trước đó');
      }

      // 3. Cập nhật tiến độ khảo sát nguyên tử (collected_responses < target_responses)
      const newEscrowBalance = Math.max(0, survey.escrow_locked_balance - cost);
      const newCollected = survey.collected_responses + 1;
      const newSurveyStatus = newCollected >= survey.target_responses ? 'COMPLETED' : 'ACTIVE';

      const updateSurvey = db.prepare(`
        UPDATE surveys 
        SET escrow_locked_balance = ?, collected_responses = collected_responses + 1, status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND collected_responses < target_responses
      `).run(newEscrowBalance, newSurveyStatus, surveyId);

      if (updateSurvey.changes === 0) {
        throw new Error('Khảo sát đã đạt đủ số lượng mẫu mục tiêu trong lúc xử lý');
      }

      // 4. Cộng điểm cho người làm khảo sát một cách nguyên tử
      const updateUser = db.prepare(`
        UPDATE users 
        SET point_balance = point_balance + ?, trust_score = MIN(100.0, trust_score + 0.5) 
        WHERE id = ?
      `).run(points, respondentId);

      if (updateUser.changes === 0) {
        throw new Error('Người làm khảo sát không tồn tại');
      }

      const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(respondentId);
      const newPointBalance = updatedUser.point_balance;

      // 5. Ghi log sổ cái kế toán kép
      const txId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'SURVEY_REWARD', 'POINT', ?, ?, ?)
      `).run(txId, respondentId, responseId, points, newPointBalance, `Thưởng hoàn thành khảo sát: ${surveyId}`);

      db.exec('COMMIT');
      return { success: true, newPointBalance, pointsReward: points, surveyStatus: newSurveyStatus };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * Hoàn quỹ ký quỹ dư về ví Creator khi đóng khảo sát sớm hoặc hoàn tất
   */
  refundRemainingEscrow(surveyId, creatorId) {
    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const survey = db.prepare('SELECT id, escrow_locked_balance, is_free_trial, status FROM surveys WHERE id = ? AND creator_id = ?').get(surveyId, creatorId);
      if (!survey) throw new Error('Khảo sát không tồn tại hoặc không thuộc quyền sở hữu');
      if (survey.status === 'CLOSED') throw new Error('Khảo sát đã được đóng trước đó');

      const refundAmount = survey.escrow_locked_balance;
      if (refundAmount <= 0) {
        db.prepare("UPDATE surveys SET status = 'CLOSED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(surveyId);
        db.exec('COMMIT');
        return { success: true, refundedAmount: 0 };
      }

      // Nếu khảo sát là gói dùng thử miễn phí do sàn tài trợ: thu hồi về sàn, không hoàn tiền vào ví user
      if (survey.is_free_trial === 1) {
        const updateSurvey = db.prepare(`
          UPDATE surveys 
          SET escrow_locked_balance = 0.0, status = 'CLOSED', updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND creator_id = ? AND escrow_locked_balance = ?
        `).run(surveyId, creatorId, refundAmount);

        if (updateSurvey.changes === 0) {
          throw new Error('Quỹ ký quỹ đã thay đổi hoặc khảo sát đã bị đóng');
        }

        const updatedUser = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(creatorId);
        const txId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
          VALUES (?, ?, ?, 'ESCROW_REFUND', 'VND', 0, ?, ?)
        `).run(txId, creatorId, surveyId, updatedUser.credit_balance, `Thu hồi ngân sách tài trợ dùng thử của sàn cho khảo sát: ${surveyId}`);

        db.exec('COMMIT');
        return { success: true, isFreeTrial: true, refundedAmount: 0, newCreditBalance: updatedUser.credit_balance };
      }

      // Đóng survey và thu hồi escrow nguyên tử
      const updateSurvey = db.prepare(`
        UPDATE surveys 
        SET escrow_locked_balance = 0.0, status = 'CLOSED', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND creator_id = ? AND escrow_locked_balance = ?
      `).run(surveyId, creatorId, refundAmount);

      if (updateSurvey.changes === 0) {
        throw new Error('Quỹ ký quỹ đã thay đổi hoặc khảo sát đã bị đóng');
      }

      // Hoàn tiền về tài khoản Creator
      db.prepare('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?').run(refundAmount, creatorId);
      const updatedUser = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(creatorId);

      const txId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'ESCROW_REFUND', 'VND', ?, ?, ?)
      `).run(txId, creatorId, surveyId, refundAmount, updatedUser.credit_balance, `Hoàn trả quỹ ký quỹ khảo sát: ${surveyId}`);

      db.exec('COMMIT');
      return { success: true, refundedAmount: refundAmount, newCreditBalance: updatedUser.credit_balance };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * Tạo yêu cầu rút tiền/đổi thẻ cào: Trừ điểm ngay lập tức (Atomic) để chống double spend
   * - Ngưỡng rút phá băng lần đầu: 10.000 điểm = 10.000 VNĐ (chỉ thẻ cào PHONE_CARD, phí 0đ)
   * - Ngưỡng thẻ cào tiêu chuẩn: 20.000 / 50.000 / 100.000 điểm (phí 0đ)
   * - Ngưỡng rút ngân hàng / MoMo: Mốc 50.000đ (thu 2.000đ phí, nhận 48.000đ); từ 100.000đ trở lên phí 0đ
   * - Ngưỡng Voucher: Tối thiểu 30.000 điểm (phí 0đ)
   * - Kiểm tra trust_score >= 60.0
   */
  requestPayout(userId, pointsAmount, payoutMethod, recipientInfo, feeVnd = null) {
    const points = Math.floor(Number(pointsAmount));
    if (!Number.isInteger(points) || points <= 0) {
      throw new Error('Số điểm rút phải là số nguyên dương hợp lệ');
    }

    const previousPayout = db.prepare(`
      SELECT COUNT(*) as count FROM payout_requests 
      WHERE user_id = ? AND status != 'REJECTED'
    `).get(userId);
    const previousPayoutCount = previousPayout ? previousPayout.count : 0;

    const isFirstTimePhoneCard = (previousPayoutCount === 0 && payoutMethod === 'PHONE_CARD');
    let minPoints = 20000;
    if (isFirstTimePhoneCard) {
      minPoints = config.ECONOMICS.MIN_FIRST_TIME_PAYOUT_POINTS || 10000;
    } else if (payoutMethod === 'PHONE_CARD') {
      minPoints = config.ECONOMICS.MIN_PAYOUT_POINTS || 20000;
    } else if (payoutMethod === 'BANK_TRANSFER' || payoutMethod === 'MOMO') {
      minPoints = 50000; // Ngân hàng / MoMo tối thiểu 50k
    } else if (payoutMethod === 'VOUCHER') {
      minPoints = 30000; // E-Voucher tối thiểu 30k
    }

    const rate = config.ECONOMICS.POINT_TO_VND_RATE || 1;
    const fiatAmountVnd = points * rate;

    if (points < minPoints) {
      const minVnd = minPoints * rate;
      throw new Error(`Số điểm rút tối thiểu là ${minPoints.toLocaleString()} điểm (tương đương ${minVnd.toLocaleString('vi-VN')} VNĐ)`);
    }

    // Xác định phí rút tiền
    let fee = 0;
    if (feeVnd !== null && feeVnd !== undefined) {
      fee = Math.max(0, Math.floor(Number(feeVnd) || 0));
    } else if (payoutMethod === 'PHONE_CARD' || payoutMethod === 'VOUCHER') {
      fee = config.ECONOMICS.PHONE_CARD_FEE_VND || 0;
    } else {
      fee = fiatAmountVnd < 100000 
        ? (config.ECONOMICS.BANK_TRANSFER_FEE_UNDER_100K_VND ?? 2000)
        : (config.ECONOMICS.BANK_TRANSFER_FEE_FROM_100K_VND ?? 0);
    }

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const user = db.prepare('SELECT point_balance, trust_score, status FROM users WHERE id = ?').get(userId);
      if (!user) throw new Error('Người dùng không tồn tại');
      if (user.status !== 'ACTIVE') throw new Error('Tài khoản đang bị tạm khóa hoặc cấm giao dịch');
      if (user.trust_score < 60) {
        throw new Error(`Điểm uy tín của bạn là ${user.trust_score.toFixed(1)}/100, cần tối thiểu 60.0 để thực hiện rút tiền`);
      }
      if (user.point_balance < points) {
        throw new Error(`Số dư điểm không đủ. Cần: ${points.toLocaleString()} điểm, Hiện có: ${user.point_balance.toLocaleString()} điểm`);
      }

      // CHỐT CHẶN CHỐNG DOUBLE SPEND: Trừ điểm nguyên tử với điều kiện point_balance >= points
      const deductResult = db.prepare(`
        UPDATE users 
        SET point_balance = point_balance - ? 
        WHERE id = ? AND point_balance >= ? AND status = 'ACTIVE'
      `).run(points, userId, points);

      if (deductResult.changes === 0) {
        throw new Error('Số dư điểm không đủ hoặc tài khoản đã thay đổi trạng thái trong lúc xử lý');
      }

      const netAmountVnd = Math.max(0, fiatAmountVnd - fee);
      const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(userId);
      const newPointBalance = updatedUser.point_balance;

      const recipientJson = typeof recipientInfo === 'string' ? recipientInfo : JSON.stringify(recipientInfo);
      const payoutId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO payout_requests (id, user_id, points_amount, fiat_amount_vnd, fee_vnd, net_amount_vnd, payout_method, recipient_info_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(payoutId, userId, points, fiatAmountVnd, fee, netAmountVnd, payoutMethod, recipientJson);

      const txId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'PAYOUT_DEDUCT', 'POINT', ?, ?, ?)
      `).run(txId, userId, payoutId, -points, newPointBalance, `Yêu cầu đổi quà / rút tiền mã: ${payoutId}`);

      db.exec('COMMIT');
      return { success: true, payoutId, netAmountVnd, feeVnd: fee, newPointBalance };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * Admin duyệt hoặc hoàn tất lệnh rút tiền
   */
  processPayout(payoutId, isApproved, adminNote = '') {
    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const payout = db.prepare('SELECT * FROM payout_requests WHERE id = ?').get(payoutId);
      if (!payout) throw new Error('Yêu cầu thanh toán không tồn tại');
      if (payout.status !== 'PENDING') throw new Error('Yêu cầu này đã được xử lý trước đó');

      const newStatus = isApproved ? 'COMPLETED' : 'REJECTED';
      const updateResult = db.prepare(`
        UPDATE payout_requests 
        SET status = ?, admin_note = ?, completed_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND status = 'PENDING'
      `).run(newStatus, adminNote, payoutId);

      if (updateResult.changes === 0) {
        throw new Error('Yêu cầu thanh toán đã được xử lý bởi phiên làm việc khác');
      }

      if (isApproved) {
        db.exec('COMMIT');
        return { success: true, status: 'COMPLETED' };
      } else {
        // Từ chối và hoàn điểm nguyên tử cho người dùng
        db.prepare('UPDATE users SET point_balance = point_balance + ? WHERE id = ?').run(payout.points_amount, payout.user_id);
        const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(payout.user_id);
        const restoredBalance = updatedUser ? updatedUser.point_balance : payout.points_amount;

        const txId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
          VALUES (?, ?, ?, 'PAYOUT_REFUND', 'POINT', ?, ?, ?)
        `).run(txId, payout.user_id, payoutId, payout.points_amount, restoredBalance, `Hoàn trả điểm yêu cầu rút bị từ chối: ${adminNote}`);

        db.exec('COMMIT');
        return { success: true, status: 'REJECTED', restoredBalance };
      }
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * Đổi Điểm Thưởng sang Credit tạo khảo sát (Point-to-Credit Swap)
   * Tỷ lệ quy đổi: 1 Point = 1 VNĐ, nhận thưởng +5% Credit (SWAP_BONUS_RATE = 1.05)
   * Tối thiểu 5.000 Point/lần
   * Khóa van 1 chiều: Trừ Point, cộng Credit, ghi sổ cái kép
   */
  swapPointsToCredit(userId, pointsAmount) {
    const points = Math.floor(Number(pointsAmount));
    const minSwapPoints = (config.ECONOMICS && config.ECONOMICS.MIN_SWAP_POINTS) || 5000;
    if (!Number.isInteger(points) || points < minSwapPoints) {
      const bonusRate = (config.ECONOMICS && config.ECONOMICS.SWAP_BONUS_RATE) || 1.05;
      throw new Error(`Số điểm đổi tối thiểu là ${minSwapPoints.toLocaleString()} điểm (tương đương ${Math.floor(minSwapPoints * bonusRate).toLocaleString('vi-VN')} Credit tạo khảo sát)`);
    }
    if (points > 10000000) {
      throw new Error('Số điểm đổi tối đa mỗi lần là 10,000,000 điểm');
    }

    const swapBonusRate = (config.ECONOMICS && config.ECONOMICS.SWAP_BONUS_RATE) || 1.05;
    const creditValueVnd = Math.floor(points * swapBonusRate);

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const user = db.prepare('SELECT point_balance, credit_balance, status FROM users WHERE id = ?').get(userId);
      if (!user) throw new Error('Người dùng không tồn tại');
      if (user.status !== 'ACTIVE') throw new Error('Tài khoản đang bị tạm khóa hoặc cấm giao dịch');
      if (user.point_balance < points) {
        throw new Error(`Số dư điểm không đủ. Cần: ${points.toLocaleString()} điểm, Hiện có: ${user.point_balance.toLocaleString()} điểm`);
      }

      // Trừ điểm nguyên tử đồng thời cộng credit với điều kiện chặn số dư âm point_balance >= points
      const deductResult = db.prepare(`
        UPDATE users 
        SET point_balance = point_balance - ?, credit_balance = credit_balance + ? 
        WHERE id = ? AND point_balance >= ? AND status = 'ACTIVE'
      `).run(points, creditValueVnd, userId, points);

      if (deductResult.changes === 0) {
        throw new Error('Số dư điểm không đủ để thực hiện quy đổi');
      }

      const updatedUser = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(userId);

      // Ghi nhận Sổ Cái Kế Toán Kép (Double-Entry: Ghi giảm POINT và ghi tăng VND Credit)
      const txPointId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'POINT_TO_CREDIT_SWAP', 'POINT', ?, ?, ?)
      `).run(
        txPointId, 
        userId, 
        null, 
        -points, 
        updatedUser.point_balance, 
        `Đổi ${points.toLocaleString()} điểm sang ${creditValueVnd.toLocaleString('vi-VN')} Credit tạo khảo sát (+5% thưởng tái đầu tư)`
      );

      const txCreditId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'POINT_TO_CREDIT_SWAP', 'VND', ?, ?, ?)
      `).run(
        txCreditId, 
        userId, 
        txPointId, 
        creditValueVnd, 
        updatedUser.credit_balance, 
        `Nhận ${creditValueVnd.toLocaleString('vi-VN')} Credit từ quy đổi ${points.toLocaleString()} điểm (+5% thưởng tái đầu tư)`
      );

      db.exec('COMMIT');
      return {
        success: true,
        pointsDeducted: points,
        creditAddedVnd: creditValueVnd,
        exchangeRate: '1 Point = 1.05 Credit (+5% thưởng tái đầu tư)',
        newPointBalance: updatedUser.point_balance,
        newCreditBalance: updatedUser.credit_balance
      };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * Tặng điểm an ủi (Consolation Reward) khi đáp viên không thuộc nhóm đối tượng sàng lọc (Screened Out)
   * Giúp tri ân thời gian của người làm bài và giữ chân người dùng vui vẻ.
   */
  awardConsolationReward(responseId, respondentId, surveyId, points = 20) {
    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // 1. Cập nhật bài làm với điểm an ủi
      try {
        db.prepare(`
          UPDATE responses 
          SET points_rewarded = ?, submitted_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(points, responseId);
      } catch (respErr) {
        // Bỏ qua lỗi cập nhật responses nếu có
      }

      // 2. Cộng điểm an ủi cho đáp viên
      db.prepare(`
        UPDATE users 
        SET point_balance = point_balance + ?, trust_score = MIN(100.0, trust_score + 0.1)
        WHERE id = ?
      `).run(points, respondentId);

      const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(respondentId);
      const newBalance = updatedUser ? updatedUser.point_balance : points;

      // 3. Ghi sổ cái kép Point Ledger với schema chuẩn
      const pointTxId = 'ptx_consolation_' + crypto.randomUUID();
      db.prepare(`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'SURVEY_REWARD', 'POINT', ?, ?, 'Điểm an ủi tri ân tham gia khảo sát sàng lọc')
      `).run(pointTxId, respondentId, responseId, points, newBalance);

      db.exec('COMMIT');

      return {
        success: true,
        consolationPoints: points,
        newPointBalance: newBalance
      };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }
}

module.exports = new LedgerService();
