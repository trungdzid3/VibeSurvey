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
   * Tạo giao dịch nạp tiền cho Creator
   */
  /**
   * Tính toán thưởng bonus nạp tiền bằng Credit tạo form theo bậc thang (Tiered Deposit Bonus)
   * Nạp nhiều hơn một chút thì bonus thêm một chút hợp lý ("hơn 1 tẹo thôi"):
   * - Dưới 100K: 0%
   * - 100K - 499K: +2% (VD: 100K -> +2,000đ Credit tạo form)
   * - 500K - 999K: +4% (VD: 500K -> +20,000đ Credit tạo form)
   * - 1M - 1.99M: +6% (VD: 1M -> +60,000đ Credit tạo form, tổng nhận 1.060.000đ)
   * - 2M - 4.99M: +8% (VD: 2M -> +160,000đ Credit tạo form, tổng nhận 2.160.000đ)
   * - 5M - 9.99M: +10% (VD: 5M -> +500,000đ Credit tạo form, tổng nhận 5.500.000đ)
   * - Từ 10M trở lên: +12% (VD: 10M -> +1,200,000đ Credit tạo form, tổng nhận 11.200.000đ)
   */
  calculateDepositBonus(amountVnd) {
    const amount = Math.floor(Number(amountVnd) || 0);
    let bonusRate = 0;
    let tier = 'Cơ bản';

    if (amount >= 10000000) {
      bonusRate = 0.12;
      tier = 'Doanh Nghiệp Đối Tác (+12%)';
    } else if (amount >= 5000000) {
      bonusRate = 0.10;
      tier = 'Doanh Nghiệp Kim Cương (+10%)';
    } else if (amount >= 2000000) {
      bonusRate = 0.08;
      tier = 'Doanh Nghiệp Bạch Kim (+8%)';
    } else if (amount >= 1000000) {
      bonusRate = 0.06;
      tier = 'Doanh Nghiệp Vàng (+6%)';
    } else if (amount >= 500000) {
      bonusRate = 0.04;
      tier = 'Bạc (Silver +4%)';
    } else if (amount >= 100000) {
      bonusRate = 0.02;
      tier = 'Đồng (Bronze +2%)';
    }

    const bonusCreditVnd = Math.floor(amount * bonusRate);
    return {
      amountVnd: amount,
      bonusRate,
      bonusPercent: Math.round(bonusRate * 100),
      tier,
      bonusCreditVnd,
      totalCreditVnd: amount + bonusCreditVnd
    };
  }

  /**
   * Tính toán gói dịch vụ gia tăng đặc quyền cho Doanh nghiệp (Enterprise Perks)
   * - Hỗ trợ Xuất Hóa Đơn Điện Tử VAT FULL 100% cho mọi khoản nạp doanh nghiệp
   * - Tặng lượt Gom Mẫu Hỏa Tốc (Ghim đầu trang + Bắn Thông Báo Đẩy trên App APK + Gửi Email hệ thống)
   */
  calculateEnterprisePerks(amountVnd) {
    const amount = Math.floor(Number(amountVnd) || 0);
    let fastTrackTickets = 0;
    const vatInvoiceEligible = true; // FULL VAT 100% cho doanh nghiệp
    let tier = 'Tiêu chuẩn';
    let perkSummary = 'Hỗ trợ xuất hóa đơn VAT Full 100%';

    if (amount >= 10000000) {
      fastTrackTickets = 20;
      tier = 'Doanh Nghiệp Đối Tác';
      perkSummary = 'Tặng 20 Lượt Gom Mẫu Hỏa Tốc (Ghim Top + Push App APK + Gửi Email) + Xuất Hóa Đơn VAT FULL 100%';
    } else if (amount >= 5000000) {
      fastTrackTickets = 10;
      tier = 'Doanh Nghiệp Kim Cương';
      perkSummary = 'Tặng 10 Lượt Gom Mẫu Hỏa Tốc (Ghim Top + Push App APK + Gửi Email) + Xuất Hóa Đơn VAT FULL 100%';
    } else if (amount >= 2000000) {
      fastTrackTickets = 4;
      tier = 'Doanh Nghiệp Bạch Kim';
      perkSummary = 'Tặng 4 Lượt Gom Mẫu Hỏa Tốc (Ghim Top + Push App APK + Gửi Email) + Xuất Hóa Đơn VAT FULL 100%';
    } else if (amount >= 1000000) {
      fastTrackTickets = 2;
      tier = 'Doanh Nghiệp Vàng';
      perkSummary = 'Tặng 2 Lượt Gom Mẫu Hỏa Tốc (Ghim Top + Push App APK + Gửi Email) + Xuất Hóa Đơn VAT FULL 100%';
    }

    return {
      amountVnd: amount,
      tier,
      fastTrackTickets,
      freeTargetingTickets: 0,
      vatInvoiceEligible,
      hasVip: amount >= 5000000 ? 1 : 0,
      perkSummary
    };
  }

  /**
   * Nạp tiền vào tài khoản Doanh nghiệp / Creator (Credit Top-up) kèm cơ chế Thưởng Bonus Credit tạo form
   * và Gói Dịch Vụ Gia Tăng Đặc Quyền (Vé Hỏa Tốc, Lọc Sâu Đối Tượng)
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

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // Cập nhật số dư credit_balance và cộng thêm vé dịch vụ gia tăng cho tài khoản
      const updateRes = db.prepare(`
        UPDATE users 
        SET credit_balance = credit_balance + ?,
            fast_track_tickets = COALESCE(fast_track_tickets, 0) + ?,
            free_targeting_tickets = COALESCE(free_targeting_tickets, 0) + ?,
            has_vip_enterprise = CASE WHEN ? = 1 THEN 1 ELSE COALESCE(has_vip_enterprise, 0) END
        WHERE id = ?
      `).run(totalCreditToAdd, enterprisePerks.fastTrackTickets, enterprisePerks.freeTargetingTickets, enterprisePerks.hasVip, userId);

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
          `Thưởng nạp tiền bậc ${bonusInfo.tier}: Tặng +${bonusInfo.bonusPercent}% Credit tạo form (+${bonusCreditVnd.toLocaleString('vi-VN')}đ Credit) & ${enterprisePerks.perkSummary}`
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

      // 2a. Nếu kích hoạt Gói Dùng Thử Miễn Phí (First Survey Free Trial - 25 Lượt)
      if (options.useFreeTrial) {
        const user = db.prepare('SELECT id, credit_balance, free_trial_surveys_available FROM users WHERE id = ?').get(userId);
        if (!user || (user.free_trial_surveys_available || 0) < 1) {
          throw new Error('Bạn đã sử dụng hết lượt khảo sát dùng thử miễn phí');
        }
        if (survey.target_responses > 25) {
          throw new Error('Gói khảo sát miễn phí áp dụng tối đa 25 lượt phản hồi. Vui lòng giảm số mẫu xuống 25 hoặc nạp quỹ.');
        }

        // Trừ 1 lượt dùng thử
        db.prepare('UPDATE users SET free_trial_surveys_available = free_trial_surveys_available - 1 WHERE id = ?').run(userId);

        // Kích hoạt khảo sát sang ACTIVE và nạp quỹ tài trợ do sàn cấp
        db.prepare(`
          UPDATE surveys 
          SET escrow_locked_balance = ?, status = 'ACTIVE', is_free_trial = 1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ? AND creator_id = ? AND status = 'DRAFT'
        `).run(escrowAmount, surveyId, userId);

        const txId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
          VALUES (?, ?, ?, 'ESCROW_LOCK', 'VND', 0, ?, ?)
        `).run(txId, userId, surveyId, user.credit_balance, `[Tài Trợ Miễn Phí] Gói dùng thử 25 lượt phản hồi đầu tay (Sàn tài trợ ${escrowAmount.toLocaleString('vi-VN')} đ)`);

        db.exec('COMMIT');
        return {
          success: true,
          isFreeTrial: true,
          newCreditBalance: user.credit_balance,
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
   * - Ngưỡng rút phá băng lần đầu: 1,000 điểm = 10,000 VNĐ (chỉ thẻ cào PHONE_CARD)
   * - Ngưỡng rút tiêu chuẩn: 5,000 điểm = 50,000 VNĐ
   * - Phí thẻ cào: 0đ (miễn phí 100%)
   * - Phí ngân hàng: Rút < 100k thu 2,000đ; Rút >= 100k miễn phí
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
    const minPoints = isFirstTimePhoneCard 
      ? (config.ECONOMICS.MIN_FIRST_TIME_PAYOUT_POINTS || 1000)
      : (config.ECONOMICS.MIN_PAYOUT_POINTS || 5000);

    const rate = config.ECONOMICS.POINT_TO_VND_RATE || 10;
    const fiatAmountVnd = points * rate;

    if (points < minPoints) {
      const minVnd = minPoints * rate;
      throw new Error(`Số điểm rút tối thiểu là ${minPoints.toLocaleString()} điểm (tương đương ${minVnd.toLocaleString('vi-VN')} VNĐ)`);
    }

    // Xác định phí rút tiền
    let fee = 0;
    if (feeVnd !== null && feeVnd !== undefined) {
      fee = Math.max(0, Math.floor(Number(feeVnd) || 0));
    } else if (payoutMethod === 'PHONE_CARD') {
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
   * Chính sách Sàn: Đổi điểm sang credit tạo form nhận ÍT HƠN giá trị gốc (Không thể nhiều hơn hoặc ngang giá)
   * Tỷ lệ chiết khấu: 1 Point = 7 VND Credit (Tương đương 70% giá trị danh nghĩa, sàn thu phí chênh lệch 30%)
   * Bảo đảm tính nguyên tử ACID, chống race condition số dư âm & ghi nhận sổ cái kép đầy đủ
   */
  swapPointsToCredit(userId, pointsAmount) {
    const points = Math.floor(Number(pointsAmount));
    if (!Number.isInteger(points) || points < 1000) {
      throw new Error('Số điểm đổi tối thiểu là 1,000 điểm (tương đương 7,000 VNĐ Credit tạo khảo sát)');
    }
    if (points > 10000000) {
      throw new Error('Số điểm đổi tối đa mỗi lần là 10,000,000 điểm');
    }

    const SWAP_DISCOUNT_RATE = 0.70; // Chỉ nhận 70% giá trị danh nghĩa (1 Điểm = 7 VNĐ Credit, sàn hưởng chênh lệch 30%)
    const creditValueVnd = Math.floor((points * 10) * SWAP_DISCOUNT_RATE);

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
        `Đổi ${points.toLocaleString()} điểm sang ${creditValueVnd.toLocaleString('vi-VN')}đ Credit tạo khảo sát (Tỷ lệ chiết khấu sàn 30%, nhận 70%)`
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
        `Nhận ${creditValueVnd.toLocaleString('vi-VN')}đ Credit từ quy đổi ${points.toLocaleString()} điểm (Chiết khấu sàn 30%)`
      );

      db.exec('COMMIT');
      return {
        success: true,
        pointsDeducted: points,
        creditAddedVnd: creditValueVnd,
        exchangeRate: '1 Point = 7 VND Credit (-30% so với giá trị danh nghĩa)',
        newPointBalance: updatedUser.point_balance,
        newCreditBalance: updatedUser.credit_balance
      };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }
}

module.exports = new LedgerService();
