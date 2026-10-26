const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/services/ledgerService.js');
let code = fs.readFileSync(filePath, 'utf8');

const isCRLF = code.includes('\r\n');
if (isCRLF) {
  code = code.replace(/\r\n/g, '\n');
}

// 1. Thay thế khối calculateDepositBonus -> depositCredit
const targetBlock1 = `  /**
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
      const updateRes = db.prepare(\`
        UPDATE users 
        SET credit_balance = credit_balance + ?,
            fast_track_tickets = COALESCE(fast_track_tickets, 0) + ?,
            free_targeting_tickets = COALESCE(free_targeting_tickets, 0) + ?,
            has_vip_enterprise = CASE WHEN ? = 1 THEN 1 ELSE COALESCE(has_vip_enterprise, 0) END
        WHERE id = ?
      \`).run(totalCreditToAdd, enterprisePerks.fastTrackTickets, enterprisePerks.freeTargetingTickets, enterprisePerks.hasVip, userId);

      if (updateRes.changes === 0) {
        throw new Error('Người dùng không tồn tại');
      }

      const user = db.prepare('SELECT credit_balance, point_balance, fast_track_tickets, free_targeting_tickets, has_vip_enterprise FROM users WHERE id = ?').get(userId);
      const newBalance = user.credit_balance;
      const newPointBalance = user.point_balance;

      const txId = crypto.randomUUID();
      const balanceAfterDepositOnly = newBalance - bonusCreditVnd;
      db.prepare(\`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'DEPOSIT_CREDIT', 'VND', ?, ?, ?)
      \`).run(txId, userId, null, amount, balanceAfterDepositOnly, description);

      // Nếu có bonus Credit, ghi nhận thêm giao dịch Sổ cái cho credit thưởng
      if (bonusCreditVnd > 0) {
        const txBonusId = crypto.randomUUID();
        db.prepare(\`
          INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
          VALUES (?, ?, ?, 'DEPOSIT_CREDIT', 'VND', ?, ?, ?)
        \`).run(
          txBonusId, 
          userId, 
          txId, 
          bonusCreditVnd, 
          newBalance, 
          \`Thưởng nạp tiền bậc \${bonusInfo.tier}: Tặng +\${bonusInfo.bonusPercent}% Credit tạo form (+\${bonusCreditVnd.toLocaleString('vi-VN')}đ Credit) & \${enterprisePerks.perkSummary}\`
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
  }`;

const replacementBlock1 = `  /**
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
      const updateRes = db.prepare(\`
        UPDATE users 
        SET credit_balance = credit_balance + ?,
            fast_track_tickets = COALESCE(fast_track_tickets, 0) + ?,
            free_targeting_tickets = COALESCE(free_targeting_tickets, 0) + ?,
            has_vip_enterprise = CASE WHEN ? = 1 THEN 1 ELSE COALESCE(has_vip_enterprise, 0) END
        WHERE id = ?
      \`).run(totalCreditToAdd, bonusTickets, enterprisePerks.freeTargetingTickets, enterprisePerks.hasVip, userId);

      if (updateRes.changes === 0) {
        throw new Error('Người dùng không tồn tại');
      }

      const user = db.prepare('SELECT credit_balance, point_balance, fast_track_tickets, free_targeting_tickets, has_vip_enterprise FROM users WHERE id = ?').get(userId);
      const newBalance = user.credit_balance;
      const newPointBalance = user.point_balance;

      const txId = crypto.randomUUID();
      const balanceAfterDepositOnly = newBalance - bonusCreditVnd;
      db.prepare(\`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'DEPOSIT_CREDIT', 'VND', ?, ?, ?)
      \`).run(txId, userId, null, amount, balanceAfterDepositOnly, description);

      // Nếu có bonus Credit, ghi nhận thêm giao dịch Sổ cái cho credit thưởng
      if (bonusCreditVnd > 0) {
        const txBonusId = crypto.randomUUID();
        db.prepare(\`
          INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
          VALUES (?, ?, ?, 'DEPOSIT_CREDIT', 'VND', ?, ?, ?)
        \`).run(
          txBonusId, 
          userId, 
          txId, 
          bonusCreditVnd, 
          newBalance, 
          \`Thưởng nạp tiền bậc \${bonusInfo.tier}: Tặng +\${bonusInfo.bonusPercent}% Credit tạo form (+\${bonusCreditVnd.toLocaleString('vi-VN')} Credit) & \${enterprisePerks.perkSummary}\`
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
  }`;

if (!code.includes(targetBlock1)) {
  console.error('LỖI: targetBlock1 không khớp chính xác!');
  process.exit(1);
}
code = code.replace(targetBlock1, replacementBlock1);

// 2. Thay thế requestPayout
const targetBlock2 = `  /**
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

    const previousPayout = db.prepare(\`
      SELECT COUNT(*) as count FROM payout_requests 
      WHERE user_id = ? AND status != 'REJECTED'
    \`).get(userId);
    const previousPayoutCount = previousPayout ? previousPayout.count : 0;

    const isFirstTimePhoneCard = (previousPayoutCount === 0 && payoutMethod === 'PHONE_CARD');
    const minPoints = isFirstTimePhoneCard 
      ? (config.ECONOMICS.MIN_FIRST_TIME_PAYOUT_POINTS || 1000)
      : (config.ECONOMICS.MIN_PAYOUT_POINTS || 5000);

    const rate = config.ECONOMICS.POINT_TO_VND_RATE || 10;
    const fiatAmountVnd = points * rate;

    if (points < minPoints) {
      const minVnd = minPoints * rate;
      throw new Error(\`Số điểm rút tối thiểu là \${minPoints.toLocaleString()} điểm (tương đương \${minVnd.toLocaleString('vi-VN')} VNĐ)\`);
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
        throw new Error(\`Điểm uy tín của bạn là \${user.trust_score.toFixed(1)}/100, cần tối thiểu 60.0 để thực hiện rút tiền\`);
      }
      if (user.point_balance < points) {
        throw new Error(\`Số dư điểm không đủ. Cần: \${points.toLocaleString()} điểm, Hiện có: \${user.point_balance.toLocaleString()} điểm\`);
      }

      // CHỐT CHẶN CHỐNG DOUBLE SPEND: Trừ điểm nguyên tử với điều kiện point_balance >= points
      const deductResult = db.prepare(\`
        UPDATE users 
        SET point_balance = point_balance - ? 
        WHERE id = ? AND point_balance >= ? AND status = 'ACTIVE'
      \`).run(points, userId, points);

      if (deductResult.changes === 0) {
        throw new Error('Số dư điểm không đủ hoặc tài khoản đã thay đổi trạng thái trong lúc xử lý');
      }

      const netAmountVnd = Math.max(0, fiatAmountVnd - fee);
      const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(userId);
      const newPointBalance = updatedUser.point_balance;

      const recipientJson = typeof recipientInfo === 'string' ? recipientInfo : JSON.stringify(recipientInfo);
      const payoutId = crypto.randomUUID();
      db.prepare(\`
        INSERT INTO payout_requests (id, user_id, points_amount, fiat_amount_vnd, fee_vnd, net_amount_vnd, payout_method, recipient_info_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      \`).run(payoutId, userId, points, fiatAmountVnd, fee, netAmountVnd, payoutMethod, recipientJson);

      const txId = crypto.randomUUID();
      db.prepare(\`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'PAYOUT_DEDUCT', 'POINT', ?, ?, ?)
      \`).run(txId, userId, payoutId, -points, newPointBalance, \`Yêu cầu đổi quà / rút tiền mã: \${payoutId}\`);

      db.exec('COMMIT');
      return { success: true, payoutId, netAmountVnd, feeVnd: fee, newPointBalance };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }`;

const replacementBlock2 = `  /**
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

    const previousPayout = db.prepare(\`
      SELECT COUNT(*) as count FROM payout_requests 
      WHERE user_id = ? AND status != 'REJECTED'
    \`).get(userId);
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
      throw new Error(\`Số điểm rút tối thiểu là \${minPoints.toLocaleString()} điểm (tương đương \${minVnd.toLocaleString('vi-VN')} VNĐ)\`);
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
        throw new Error(\`Điểm uy tín của bạn là \${user.trust_score.toFixed(1)}/100, cần tối thiểu 60.0 để thực hiện rút tiền\`);
      }
      if (user.point_balance < points) {
        throw new Error(\`Số dư điểm không đủ. Cần: \${points.toLocaleString()} điểm, Hiện có: \${user.point_balance.toLocaleString()} điểm\`);
      }

      // CHỐT CHẶN CHỐNG DOUBLE SPEND: Trừ điểm nguyên tử với điều kiện point_balance >= points
      const deductResult = db.prepare(\`
        UPDATE users 
        SET point_balance = point_balance - ? 
        WHERE id = ? AND point_balance >= ? AND status = 'ACTIVE'
      \`).run(points, userId, points);

      if (deductResult.changes === 0) {
        throw new Error('Số dư điểm không đủ hoặc tài khoản đã thay đổi trạng thái trong lúc xử lý');
      }

      const netAmountVnd = Math.max(0, fiatAmountVnd - fee);
      const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(userId);
      const newPointBalance = updatedUser.point_balance;

      const recipientJson = typeof recipientInfo === 'string' ? recipientInfo : JSON.stringify(recipientInfo);
      const payoutId = crypto.randomUUID();
      db.prepare(\`
        INSERT INTO payout_requests (id, user_id, points_amount, fiat_amount_vnd, fee_vnd, net_amount_vnd, payout_method, recipient_info_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      \`).run(payoutId, userId, points, fiatAmountVnd, fee, netAmountVnd, payoutMethod, recipientJson);

      const txId = crypto.randomUUID();
      db.prepare(\`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'PAYOUT_DEDUCT', 'POINT', ?, ?, ?)
      \`).run(txId, userId, payoutId, -points, newPointBalance, \`Yêu cầu đổi quà / rút tiền mã: \${payoutId}\`);

      db.exec('COMMIT');
      return { success: true, payoutId, netAmountVnd, feeVnd: fee, newPointBalance };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }`;

if (!code.includes(targetBlock2)) {
  console.error('LỖI: targetBlock2 không khớp chính xác!');
  process.exit(1);
}
code = code.replace(targetBlock2, replacementBlock2);

// 3. Thay thế swapPointsToCredit
const targetBlock3 = `  /**
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
        throw new Error(\`Số dư điểm không đủ. Cần: \${points.toLocaleString()} điểm, Hiện có: \${user.point_balance.toLocaleString()} điểm\`);
      }

      // Trừ điểm nguyên tử đồng thời cộng credit với điều kiện chặn số dư âm point_balance >= points
      const deductResult = db.prepare(\`
        UPDATE users 
        SET point_balance = point_balance - ?, credit_balance = credit_balance + ? 
        WHERE id = ? AND point_balance >= ? AND status = 'ACTIVE'
      \`).run(points, creditValueVnd, userId, points);

      if (deductResult.changes === 0) {
        throw new Error('Số dư điểm không đủ để thực hiện quy đổi');
      }

      const updatedUser = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(userId);

      // Ghi nhận Sổ Cái Kế Toán Kép (Double-Entry: Ghi giảm POINT và ghi tăng VND Credit)
      const txPointId = crypto.randomUUID();
      db.prepare(\`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'POINT_TO_CREDIT_SWAP', 'POINT', ?, ?, ?)
      \`).run(
        txPointId, 
        userId, 
        null, 
        -points, 
        updatedUser.point_balance, 
        \`Đổi \${points.toLocaleString()} điểm sang \${creditValueVnd.toLocaleString('vi-VN')}đ Credit tạo khảo sát (Tỷ lệ chiết khấu sàn 30%, nhận 70%)\`
      );

      const txCreditId = crypto.randomUUID();
      db.prepare(\`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'POINT_TO_CREDIT_SWAP', 'VND', ?, ?, ?)
      \`).run(
        txCreditId, 
        userId, 
        txPointId, 
        creditValueVnd, 
        updatedUser.credit_balance, 
        \`Nhận \${creditValueVnd.toLocaleString('vi-VN')}đ Credit từ quy đổi \${points.toLocaleString()} điểm (Chiết khấu sàn 30%)\`
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
  }`;

const replacementBlock3 = `  /**
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
      throw new Error(\`Số điểm đổi tối thiểu là \${minSwapPoints.toLocaleString()} điểm (tương đương \${Math.floor(minSwapPoints * bonusRate).toLocaleString('vi-VN')} Credit tạo khảo sát)\`);
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
        throw new Error(\`Số dư điểm không đủ. Cần: \${points.toLocaleString()} điểm, Hiện có: \${user.point_balance.toLocaleString()} điểm\`);
      }

      // Trừ điểm nguyên tử đồng thời cộng credit với điều kiện chặn số dư âm point_balance >= points
      const deductResult = db.prepare(\`
        UPDATE users 
        SET point_balance = point_balance - ?, credit_balance = credit_balance + ? 
        WHERE id = ? AND point_balance >= ? AND status = 'ACTIVE'
      \`).run(points, creditValueVnd, userId, points);

      if (deductResult.changes === 0) {
        throw new Error('Số dư điểm không đủ để thực hiện quy đổi');
      }

      const updatedUser = db.prepare('SELECT point_balance, credit_balance FROM users WHERE id = ?').get(userId);

      // Ghi nhận Sổ Cái Kế Toán Kép (Double-Entry: Ghi giảm POINT và ghi tăng VND Credit)
      const txPointId = crypto.randomUUID();
      db.prepare(\`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'POINT_TO_CREDIT_SWAP', 'POINT', ?, ?, ?)
      \`).run(
        txPointId, 
        userId, 
        null, 
        -points, 
        updatedUser.point_balance, 
        \`Đổi \${points.toLocaleString()} điểm sang \${creditValueVnd.toLocaleString('vi-VN')} Credit tạo khảo sát (+5% thưởng tái đầu tư)\`
      );

      const txCreditId = crypto.randomUUID();
      db.prepare(\`
        INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
        VALUES (?, ?, ?, 'POINT_TO_CREDIT_SWAP', 'VND', ?, ?, ?)
      \`).run(
        txCreditId, 
        userId, 
        txPointId, 
        creditValueVnd, 
        updatedUser.credit_balance, 
        \`Nhận \${creditValueVnd.toLocaleString('vi-VN')} Credit từ quy đổi \${points.toLocaleString()} điểm (+5% thưởng tái đầu tư)\`
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
  }`;

if (!code.includes(targetBlock3)) {
  console.error('LỖI: targetBlock3 không khớp chính xác!');
  process.exit(1);
}
code = code.replace(targetBlock3, replacementBlock3);

if (isCRLF) {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('SUCCESS: server/services/ledgerService.js patched safely!');
