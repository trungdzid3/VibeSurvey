const config = require('../config');

class PricingService {
  /**
   * Phân loại độ dài câu hỏi thành 3 nhóm:
   * - Ngắn (SHORT): <= 10 câu
   * - Vừa (MEDIUM): 11 - 25 câu
   * - Dài (LONG): > 25 câu
   * @param {number|Array} questionInput Số lượng câu hoặc mảng câu hỏi
   * @returns {string} 'SHORT' | 'MEDIUM' | 'LONG'
   */
  getQuestionLengthCategory(questionInput) {
    let count = 0;
    if (Array.isArray(questionInput)) {
      count = questionInput.length;
    } else if (typeof questionInput === 'number') {
      count = Math.max(0, Math.floor(questionInput));
    }

    if (count <= 10) {
      return 'SHORT';
    } else if (count <= 25) {
      return 'MEDIUM';
    } else {
      return 'LONG';
    }
  }

  /**
   * Lấy Bảng Giá Sàn Tối Thiểu (P_sàn) và Thù lao cơ sở cho 3 phân khúc
   * Tham chiếu: KE_HOACH_TONG_THE.md Phần I Mục 2
   * 
   * @param {string} tier 'STUDENT' | 'PERSONAL' | 'ENTERPRISE'
   * @param {string|number} lengthInput 'SHORT' | 'MEDIUM' | 'LONG' hoặc số lượng câu hỏi
   * @returns {Object} { tier, lengthCategory, floorPrice, respondentRewardFloor, platformProfitFloor }
   */
  getFloorPrice(tier = 'PERSONAL', lengthInput = 'SHORT') {
    const normalizedTier = (typeof tier === 'string' ? tier.toUpperCase() : 'PERSONAL');
    const validTier = ['STUDENT', 'PERSONAL', 'ENTERPRISE'].includes(normalizedTier) ? normalizedTier : 'PERSONAL';

    let lengthCategory = 'SHORT';
    if (typeof lengthInput === 'number') {
      lengthCategory = this.getQuestionLengthCategory(lengthInput);
    } else if (typeof lengthInput === 'string') {
      const upper = lengthInput.toUpperCase();
      lengthCategory = ['SHORT', 'MEDIUM', 'LONG'].includes(upper) ? upper : 'SHORT';
    }

    const floorPrices = config.ECONOMICS.TIER_FLOOR_PRICES || {
      STUDENT: { SHORT: 400, MEDIUM: 500, LONG: 600 },
      PERSONAL: { SHORT: 800, MEDIUM: 1000, LONG: 1200 },
      ENTERPRISE: { SHORT: 1500, MEDIUM: 2000, LONG: 2500 }
    };

    const floorRewards = config.ECONOMICS.FLOOR_REWARDS || {
      STUDENT: {
        STANDARD: { SHORT: 350, MEDIUM: 450, LONG: 540 }
      },
      PERSONAL: {
        STANDARD: { SHORT: 600, MEDIUM: 750, LONG: 900 }
      },
      ENTERPRISE: {
        STANDARD: { SHORT: 1000, MEDIUM: 1300, LONG: 1600 }
      }
    };

    const floorPrice = floorPrices[validTier]?.[lengthCategory] || 1000;
    const respondentRewardFloor = floorRewards[validTier]?.STANDARD?.[lengthCategory] || Math.round(floorPrice * 0.75);
    const platformProfitFloor = floorPrice - respondentRewardFloor;

    return {
      tier: validTier,
      lengthCategory,
      floorPrice,
      respondentRewardFloor,
      platformProfitFloor
    };
  }

  /**
   * Lấy thông tin 3 Nấc Giá Đề Xuất theo SLA Gom Mẫu:
   * 1. Mức Sàn Tiết Kiệm (Minimum Floor) = P_sàn (3-5 ngày)
   * 2. Mức Đề Xuất Tiêu Chuẩn (Recommended) = P_sàn * 1.25 (24-48 giờ)
   * 3. Mức Gom Hỏa Tốc (Rush / Custom Boost) = P_sàn * 1.60 (2-6 giờ)
   * Kèm phân chia phần tiền tăng thêm Delta P (Creator Boost):
   * - Sinh viên: 85% cho người điền / 15% cho sàn
   * - Cá nhân & Doanh nghiệp: 80% cho người điền / 20% cho sàn
   * 
   * @param {string} tier 'STUDENT' | 'PERSONAL' | 'ENTERPRISE'
   * @param {string|number} lengthInput 'SHORT' | 'MEDIUM' | 'LONG' hoặc số lượng câu
   * @returns {Object} 3 nấc giá SLA kèm thù lao và phí sàn chi tiết
   */
  getSlaPricingTiers(tier = 'PERSONAL', lengthInput = 'SHORT') {
    const floor = this.getFloorPrice(tier, lengthInput);
    const alpha = config.ECONOMICS.BOOST_REWARD_SHARE?.[floor.tier] || (floor.tier === 'STUDENT' ? 0.85 : 0.80);
    const slaConfig = config.ECONOMICS.SLA_TIERS || {
      FLOOR: { multiplier: 1.0, label: 'Mức Sàn Tiết Kiệm', badge: 'Tiết kiệm', slaHours: '72-120h', slaText: '3 – 5 ngày' },
      RECOMMENDED: { multiplier: 1.25, label: 'Mức Đề Xuất Tiêu Chuẩn', badge: '[Đề Xuất]', slaHours: '24-48h', slaText: '24 – 48 giờ' },
      RUSH: { multiplier: 1.60, label: 'Mức Gom Hỏa Tốc', badge: '[Thưởng Cao]', slaHours: '2-6h', slaText: '2 – 6 giờ' }
    };

    const buildTierDetails = (key) => {
      const cfg = slaConfig[key];
      const pricePerResponse = Math.round(floor.floorPrice * cfg.multiplier);
      const deltaP = Math.max(0, pricePerResponse - floor.floorPrice);
      const boostRespondent = Math.floor(alpha * deltaP);
      const boostPlatform = deltaP - boostRespondent;

      const respondentReward = floor.respondentRewardFloor + boostRespondent;
      const platformProfit = floor.platformProfitFloor + boostPlatform;
      const takeRatePct = pricePerResponse > 0 ? parseFloat(((platformProfit / pricePerResponse) * 100).toFixed(1)) : 0;

      return {
        key,
        label: cfg.label,
        badge: cfg.badge,
        slaHours: cfg.slaHours,
        slaText: cfg.slaText,
        description: cfg.description,
        multiplier: cfg.multiplier,
        pricePerResponse,
        deltaP,
        respondentReward,
        platformProfit,
        takeRatePct
      };
    };

    return {
      tier: floor.tier,
      lengthCategory: floor.lengthCategory,
      floorPrice: floor.floorPrice,
      boostShareRate: alpha,
      tiers: {
        FLOOR: buildTierDetails('FLOOR'),
        RECOMMENDED: buildTierDetails('RECOMMENDED'),
        RUSH: buildTierDetails('RUSH')
      }
    };
  }

  /**
   * Ước tính thời lượng phỏng vấn (LOI - Length of Interview) theo danh sách câu hỏi
   * @param {Array} questions Danh sách câu hỏi
   * @returns {Object} { loiSeconds, loiMinutes }
   */
  estimateLoi(questions = []) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return { loiSeconds: 60, loiMinutes: 1.0 };
    }

    let totalSeconds = 0;
    const loiMap = config.ECONOMICS.QUESTION_LOI_SECONDS || {
      SINGLE_CHOICE: 17,
      MULTIPLE_CHOICE: 17,
      DROPDOWN: 15,
      LIKERT_SCALE: 20,
      RATING_STARS: 12,
      NUMBER_INPUT: 15,
      DATE_INPUT: 15,
      OPEN_TEXT: 45
    };

    for (const q of questions) {
      if (!q) continue;
      const sec = loiMap[q.type] || 17;
      totalSeconds += sec;
    }

    // Thời lượng tối thiểu là 1 phút, làm tròn đến 1 chữ số thập phân
    const rawMinutes = totalSeconds / 60;
    const loiMinutes = Math.max(1.0, Math.round(rawMinutes * 10) / 10);

    return {
      loiSeconds: totalSeconds,
      loiMinutes
    };
  }

  /**
   * Xác định biên lợi nhuận sàn (Dynamic Take Rate) dựa theo thời lượng LOI (Tương thích ngược)
   * - Ngắn (1 - 3 phút): 50%
   * - Tiêu chuẩn (3 - 10 phút): 40%
   * - Chuyên sâu (> 10 phút): 35%
   * @param {number} loiMinutes 
   * @returns {Object} { takeRate, tierName }
   */
  getDynamicTakeRate(loiMinutes) {
    const dynamicConfig = config.ECONOMICS.DYNAMIC_TAKE_RATE || {
      SHORT: 0.50,
      STANDARD: 0.40,
      DEEP: 0.35
    };

    if (loiMinutes <= 3.0) {
      return { takeRate: dynamicConfig.SHORT, tierName: 'SHORT' };
    } else if (loiMinutes <= 10.0) {
      return { takeRate: dynamicConfig.STANDARD, tierName: 'STANDARD' };
    } else {
      return { takeRate: dynamicConfig.DEEP, tierName: 'DEEP' };
    }
  }

  /**
   * Tính toán toàn diện kinh tế học khảo sát theo Mô hình 3 Phân khúc (Tier-Based Economics)
   * Tham chiếu KE_HOACH_TONG_THE.md Phần I & Phần II
   * 
   * @param {Array|number} questions Danh sách câu hỏi hoặc số lượng câu hỏi
   * @param {number} targetResponses Số lượng mẫu mục tiêu (mặc định 100)
   * @param {Object} options Tùy chọn chi tiết
   */
  calculateTierEconomics(questions = [], targetResponses = 100, options = {}) {
    const sampleCount = Math.max(1, parseInt(targetResponses, 10) || 100);
    const questionCount = Array.isArray(questions) ? questions.length : (typeof questions === 'number' ? questions : 0);
    const lengthCategory = this.getQuestionLengthCategory(questionCount);

    const rawTier = options.accountTier || options.tier || 'PERSONAL';
    const tier = ['STUDENT', 'PERSONAL', 'ENTERPRISE'].includes(String(rawTier).toUpperCase())
      ? String(rawTier).toUpperCase()
      : 'PERSONAL';

    const floorInfo = this.getFloorPrice(tier, lengthCategory);
    const floorPrice = floorInfo.floorPrice;
    const respondentRewardFloor = floorInfo.respondentRewardFloor;
    const platformProfitFloor = floorInfo.platformProfitFloor;

    // 1. Xác định Đơn giá cơ sở trước Boost
    let basePrice = floorPrice;
    if (typeof options.pricePerResponse === 'number' && options.pricePerResponse > 0) {
      basePrice = Math.max(floorPrice, Math.round(options.pricePerResponse));
    } else if (typeof options.costPerResponseVnd === 'number' && options.costPerResponseVnd > 0) {
      basePrice = Math.max(floorPrice, Math.round(options.costPerResponseVnd));
    } else if (options.slaTier) {
      const slaKey = String(options.slaTier).toUpperCase();
      const slaTiers = this.getSlaPricingTiers(tier, lengthCategory).tiers;
      if (slaTiers[slaKey]) {
        basePrice = slaTiers[slaKey].pricePerResponse;
      }
    }

    // 2. Tính toán phần tiền tăng thêm Delta P (Creator Boost)
    const deltaP = Math.max(0, basePrice - floorPrice);
    const alpha = config.ECONOMICS.BOOST_REWARD_SHARE?.[tier] || (tier === 'STUDENT' ? 0.85 : 0.80);
    const boostRespondent = Math.floor(alpha * deltaP);
    const boostPlatform = deltaP - boostRespondent;

    let respondentReward = respondentRewardFloor + boostRespondent;
    let platformProfit = platformProfitFloor + boostPlatform;

    // 3. Phụ phí Bộ lọc Đối tượng & Auto-Screener
    const hasTargeting = Boolean(options.hasTargeting || options.targetingFilterCount > 0);
    let targetingFee = 0;
    let targetingRespondent = 0;
    let targetingPlatform = 0;

    if (hasTargeting) {
      targetingFee = config.ECONOMICS.TARGETING_FEE?.[tier] || 0;
      const split = config.ECONOMICS.TARGETING_FEE_SPLIT?.[tier] || { respondent: 0, platform: 0 };
      targetingRespondent = split.respondent;
      targetingPlatform = split.platform;
    }

    // Đơn giá chuẩn 1 mẫu sau phụ phí
    const standardCostPerResponse = basePrice + targetingFee;
    let effectiveCostPerResponse = standardCostPerResponse;
    respondentReward += targetingRespondent;
    platformProfit += targetingPlatform;

    // 4. Chiết khấu quy mô Doanh nghiệp (Volume Discount)
    let volumeDiscountRate = 0;
    let volumeDiscountVnd = 0;
    let perks = [];

    if (tier === 'ENTERPRISE') {
      const discounts = config.ECONOMICS.ENTERPRISE_VOLUME_DISCOUNTS || [
        { minResponses: 500, discountRate: 0.15, perks: ['FREE_VIP_PIN', 'FREE_PUSH_EMAIL', 'SPSS_EXPORT'] },
        { minResponses: 300, discountRate: 0.10, perks: ['FREE_PUSH_EMAIL'] },
        { minResponses: 100, discountRate: 0.00, perks: ['FREE_PUSH_EMAIL'] }
      ];

      for (const d of discounts) {
        if (sampleCount >= d.minResponses) {
          volumeDiscountRate = d.discountRate;
          perks = d.perks;
          break;
        }
      }

      if (volumeDiscountRate > 0) {
        effectiveCostPerResponse = Math.round(standardCostPerResponse * (1 - volumeDiscountRate));
        volumeDiscountVnd = (standardCostPerResponse - effectiveCostPerResponse) * sampleCount;
      }
    }

    // 5. Khấu trừ Lượt Điền Form Miễn Phí (Free Quota)
    let freeResponsesApplied = 0;
    if (typeof options.freeResponsesApplied === 'number') {
      freeResponsesApplied = Math.max(0, Math.min(sampleCount, Math.floor(options.freeResponsesApplied)));
    } else if (options.useFreeQuota) {
      const remainingQuota = Math.max(0, parseInt(options.freeQuotaRemaining, 10) || 0);
      if (tier === 'STUDENT') {
        // Sinh viên: tối đa 30 lượt/tháng, cứ 50 mẫu được trừ 10 lượt
        const maxEligible = Math.min(30, Math.floor(sampleCount / 50) * 10);
        freeResponsesApplied = Math.min(remainingQuota, maxEligible);
      } else if (tier === 'PERSONAL' && options.isFirstSurvey && sampleCount >= 50) {
        // Cá nhân bài đầu tiên: 25 lượt
        freeResponsesApplied = Math.min(remainingQuota, 25);
      }
    }

    const paidResponses = Math.max(0, sampleCount - freeResponsesApplied);

    // 6. Xử lý Tặng Kèm Voucher (Hybrid Model: V mã / N mẫu với V <= N)
    const voucherCount = Math.max(0, Math.min(sampleCount, parseInt(options.voucherCount, 10) || 0));
    let voucherDiscountVnd = 0;
    let surveyEscrowVnd = 0;

    if (tier === 'ENTERPRISE' && voucherCount > 0) {
      // Suất có Voucher: Giảm 20% CPI
      const cpiVoucher = Math.round(effectiveCostPerResponse * 0.80);
      const paidVoucherResponses = Math.min(paidResponses, voucherCount);
      const paidStandardResponses = Math.max(0, paidResponses - paidVoucherResponses);

      surveyEscrowVnd = (paidVoucherResponses * cpiVoucher) + (paidStandardResponses * effectiveCostPerResponse);
      voucherDiscountVnd = paidVoucherResponses * (effectiveCostPerResponse - cpiVoucher);
    } else {
      surveyEscrowVnd = paidResponses * effectiveCostPerResponse;
    }

    // 7. Toán học chống lỗ khi dùng lượt miễn phí (Công thức mục I.3 KE_HOACH_TONG_THE.md)
    let rewardPointsPerResponse = respondentReward;
    if (freeResponsesApplied > 0) {
      // Sàn bảo toàn phí duy trì: SV trích 10%, Cá nhân trích 25%
      const minTakeRate = tier === 'STUDENT' ? 0.10 : 0.25;
      const rewardFund = Math.floor(surveyEscrowVnd * (1 - minTakeRate));
      rewardPointsPerResponse = Math.max(1, Math.floor(rewardFund / sampleCount));
    }

    const rewardValueVnd = rewardPointsPerResponse * (config.ECONOMICS.POINT_TO_VND_RATE || 1);
    const totalRewardPayoutVnd = rewardValueVnd * sampleCount;
    const platformProfitVnd = Math.max(0, surveyEscrowVnd - totalRewardPayoutVnd);
    const actualTakeRate = surveyEscrowVnd > 0 ? parseFloat(((platformProfitVnd / surveyEscrowVnd) * 100).toFixed(1)) : 0;

    // Phụ phí dịch vụ gia tăng tùy chọn
    const isUrgent6h = Boolean(options.isUrgent6h);
    const hasAiInsights = Boolean(options.hasAiInsights);
    const aiInsightsFeeVnd = hasAiInsights ? (config.ECONOMICS.AI_INSIGHTS_REPORT_FEE_VND || 500000) : 0;
    const totalEscrowVnd = surveyEscrowVnd + aiInsightsFeeVnd;

    return {
      tier,
      lengthCategory,
      totalQuestions: questionCount,
      targetResponses: sampleCount,
      floorPrice,
      basePrice,
      deltaP,
      hasTargeting,
      targetingFee,
      standardCostPerResponse,
      costPerResponseVnd: effectiveCostPerResponse,
      volumeDiscountRate,
      volumeDiscountVnd,
      perks,
      freeResponsesApplied,
      paidResponses,
      voucherCount,
      voucherDiscountVnd,
      surveyEscrowVnd,
      aiInsightsFeeVnd,
      totalEscrowVnd,
      rewardPointsPerResponse,
      rewardValueVnd,
      totalRewardPayoutVnd,
      platformProfitVnd,
      actualTakeRate,
      pointToVndRate: config.ECONOMICS.POINT_TO_VND_RATE || 1
    };
  }

  /**
   * Tính toán toàn diện kinh tế học khảo sát (Tương thích cả API cũ và Mô hình 3 Phân khúc)
   * 
   * @param {Array} questions Danh sách câu hỏi
   * @param {number} targetResponses Số lượng mẫu mục tiêu (mặc định 100)
   * @param {number|Object} options Tùy chọn nâng cao hoặc customTakeRate
   */
  calculateSurveyEconomics(questions = [], targetResponses = 100, options = {}) {
    // 1. Phân giải tham số tùy chọn
    let customTakeRate = null;
    let opts = {};

    if (typeof options === 'number') {
      customTakeRate = options;
    } else if (typeof options === 'object' && options !== null) {
      opts = options;
      if (typeof opts.customTakeRate === 'number') {
        customTakeRate = opts.customTakeRate;
      }
    }

    // 2. Nếu có chỉ định rõ ràng phân khúc (STUDENT, PERSONAL, ENTERPRISE) hoặc cờ TIER_BASED
    if (opts.tier || opts.accountTier || opts.pricingModel === 'TIER_BASED') {
      return this.calculateTierEconomics(questions, targetResponses, opts);
    }

    // 3. Fallback: Thuật toán CPI LOI Matrix nguyên bản cho tương thích ngược 100%
    let totalWeight = 0;
    if (Array.isArray(questions)) {
      for (const q of questions) {
        if (!q) continue;
        const w = config.ECONOMICS.QUESTION_WEIGHTS ? (config.ECONOMICS.QUESTION_WEIGHTS[q.type] || 1.0) : 1.0;
        totalWeight += w;
      }
    }

    const { loiSeconds, loiMinutes } = this.estimateLoi(questions);

    let takeRate;
    let tierName;
    if (customTakeRate !== null) {
      takeRate = customTakeRate;
      tierName = 'CUSTOM';
    } else {
      const dynamic = this.getDynamicTakeRate(loiMinutes);
      takeRate = dynamic.takeRate;
      tierName = dynamic.tierName;
    }

    let irMultiplier = 1.0;
    if (typeof opts.irMultiplier === 'number') {
      irMultiplier = opts.irMultiplier;
    } else if (opts.irTier && config.ECONOMICS.IR_MULTIPLIERS && config.ECONOMICS.IR_MULTIPLIERS[opts.irTier]) {
      irMultiplier = config.ECONOMICS.IR_MULTIPLIERS[opts.irTier];
    }

    const filterCount = Math.max(0, parseInt(opts.targetingFilterCount, 10) || 0);
    const targetingFeeRate = config.ECONOMICS.TARGETING_FEE_PER_FILTER_VND || 1000;
    const targetingFeeVnd = filterCount * targetingFeeRate;

    const baseRatePerMin = config.ECONOMICS.BASE_PAYOUT_PER_MINUTE_VND || 700;
    const respondentBudgetVnd = Math.round(baseRatePerMin * loiMinutes * irMultiplier);
    const baseCpi = (baseRatePerMin * loiMinutes / (1 - takeRate)) * irMultiplier;

    let rawCpi = baseCpi + targetingFeeVnd;

    const isUrgent6h = Boolean(opts.isUrgent6h);
    if (isUrgent6h) {
      const urgentSurcharge = config.ECONOMICS.FAST_DELIVERY_SURCHARGE_RATE || 0.25;
      rawCpi = rawCpi * (1 + urgentSurcharge);
    }

    const costPerResponseVnd = Math.round(rawCpi);
    // Nếu trong options cũ có POINT_TO_VND_RATE hoặc mặc định 10 trong bài test cũ, hoặc tỷ giá mới
    const pointRate = opts.pointToVndRate || (opts.useNewRate ? config.ECONOMICS.POINT_TO_VND_RATE : 10);
    const rewardPointsPerResponse = Math.floor(respondentBudgetVnd / pointRate);
    const rewardValueVnd = rewardPointsPerResponse * pointRate;

    const platformProfitPerResponseVnd = costPerResponseVnd - rewardValueVnd;
    const actualTakeRate = costPerResponseVnd > 0 ? (platformProfitPerResponseVnd / costPerResponseVnd) * 100 : 0;

    const sampleCount = Math.max(1, parseInt(targetResponses, 10) || 100);
    const surveyEscrowVnd = costPerResponseVnd * sampleCount;

    const hasAiInsights = Boolean(opts.hasAiInsights);
    const aiInsightsFeeVnd = hasAiInsights ? (config.ECONOMICS.AI_INSIGHTS_REPORT_FEE_VND || 500000) : 0;

    const totalEscrowVnd = surveyEscrowVnd + aiInsightsFeeVnd;
    const estimatedPlatformProfitVnd = (platformProfitPerResponseVnd * sampleCount) + aiInsightsFeeVnd;

    return {
      totalQuestions: Array.isArray(questions) ? questions.length : 0,
      totalWeight: parseFloat(totalWeight.toFixed(2)),
      loiSeconds,
      loiMinutes,
      tierName,
      targetTakeRate: parseFloat((takeRate * 100).toFixed(1)),
      irMultiplier,
      targetingFilterCount: filterCount,
      targetingFeeVnd,
      isUrgent6h,
      hasAiInsights,
      costPerResponseVnd,
      rewardPointsPerResponse,
      rewardValueVnd,
      platformProfitPerResponseVnd,
      actualTakeRate: parseFloat(actualTakeRate.toFixed(1)),
      targetResponses: sampleCount,
      surveyEscrowVnd,
      aiInsightsFeeVnd,
      totalEscrowVnd,
      estimatedPlatformProfitVnd
    };
  }

  /**
   * Tính toán Hoàn tiền Ký quỹ An toàn khi Huỷ sớm hoặc Hết hạn
   * Tham chiếu KE_HOACH_TONG_THE.md Phần V Mục 3
   * 
   * Công thức:
   * Math.min(escrowLockedBalance, Math.max(0, totalEscrowPaid - (collectedResponses * effectiveCost)))
   * 
   * Có chốt chặn chống lách Chiết khấu quy mô Doanh nghiệp và thu hồi phí gói dịch vụ 40.000đ.
   * Có xử lý hoàn lượt free: Chỉ hoàn nếu collectedResponses === 0.
   * 
   * @param {Object} params Tham số đóng khảo sát
   * @returns {Object} Kết quả hoàn tiền chi tiết
   */
  calculateEscrowRefund(params = {}) {
    const totalEscrowPaid = Math.max(0, parseInt(params.totalEscrowPaid, 10) || 0);
    const targetResponses = Math.max(1, parseInt(params.targetResponses, 10) || 1);
    const collectedResponses = Math.max(0, parseInt(params.collectedResponses, 10) || 0);
    const escrowLockedBalance = Math.max(0, parseInt(params.escrowLockedBalance, 10) || 0);
    const tier = String(params.tier || 'PERSONAL').toUpperCase();
    const freeResponsesApplied = Math.max(0, parseInt(params.freeResponsesApplied, 10) || 0);
    const hasPromotionPackage = Boolean(params.hasPromotionPackage);
    const volumeDiscountRate = parseFloat(params.volumeDiscountRate) || 0;

    // Chi phí thực thu bình quân trên mỗi mẫu
    const effectiveCost = targetResponses > 0 ? (totalEscrowPaid / targetResponses) : 0;

    // Công thức cơ sở chuẩn hóa
    const rawRefund = Math.round(totalEscrowPaid - (collectedResponses * effectiveCost));
    const baseSafeRefund = Math.min(escrowLockedBalance, Math.max(0, rawRefund));

    let finalRefundAmount = baseSafeRefund;
    let penaltyApplied = false;
    let clawbackAmount = 0;
    let note = 'Hoàn tiền an toàn tiêu chuẩn';

    // Chốt chặn chống Doanh nghiệp lách chiết khấu quy mô
    if (tier === 'ENTERPRISE' && (volumeDiscountRate > 0 || hasPromotionPackage)) {
      const isEarlyCancellation = (volumeDiscountRate >= 0.10 && collectedResponses < 300) ||
                                  (volumeDiscountRate >= 0.15 && collectedResponses < 500);

      if (isEarlyCancellation || (hasPromotionPackage && collectedResponses < targetResponses * 0.5)) {
        // Truy thu theo đơn giá chuẩn chưa giảm
        const stdCostPerResponse = params.standardCostPerResponse ||
          Math.round(effectiveCost / (1 - volumeDiscountRate));
        const actualCost = Math.round(collectedResponses * stdCostPerResponse);
        const packageFee = hasPromotionPackage ? (config.ECONOMICS.PROMOTION_PACKAGE_FEE_VND || 40000) : 0;

        const enterpriseRefund = Math.max(0, Math.min(escrowLockedBalance, totalEscrowPaid - actualCost - packageFee));
        clawbackAmount = Math.max(0, baseSafeRefund - enterpriseRefund);
        finalRefundAmount = enterpriseRefund;
        penaltyApplied = clawbackAmount > 0;
        note = 'Truy thu chiết khấu quy mô và phí dịch vụ do đóng khảo sát sớm';
      }
    }

    // Quy tắc hoàn lượt điền form miễn phí:
    // - Đã có người làm (> 0): KHÔNG hoàn lượt free (chống lách mẫu)
    // - Chưa có ai làm (== 0): Khôi phục 100% lượt free
    const refundFreeQuota = collectedResponses === 0 ? freeResponsesApplied : 0;

    return {
      totalEscrowPaid,
      targetResponses,
      collectedResponses,
      remainingResponses: Math.max(0, targetResponses - collectedResponses),
      effectiveCostPerResponse: Math.round(effectiveCost),
      escrowLockedBalance,
      refundAmount: finalRefundAmount,
      refundFreeQuota,
      penaltyApplied,
      clawbackAmount,
      note
    };
  }
}

module.exports = new PricingService();
