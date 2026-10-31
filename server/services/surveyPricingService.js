/**
 * Dong Co Tinh Toan Bieu Phi & Kinh Te Hoc Khao Sat (Survey Pricing Engine)
 * Tach biet logic tinh toan gia CPI, Escrow, Creator Boost, chiet khau,
 * phu phi bo loc va phi voucher kho san / voucher rieng tu Controller va Config.
 * 
 * Quy chuan Unit Economics:
 * - Ty gia tien te: 1 Point = 1 VND, 1 Credit = 1 VND
 * - Bang gia san 3 phan khuc:
 *   + Sinh vien (STUDENT): 400d (Short) / 500d (Medium) / 600d (Long)
 *   + Ca nhan (PERSONAL): 800d (Short) / 1.000d (Medium) / 1.200d (Long)
 *   + Doanh nghiep (ENTERPRISE): 1.500d (Short) / 2.000d (Medium) / 2.500d (Long)
 * - 3 Nac SLA de xuat: Tiet kiem (1.0x), De xuat (+25%), Hoa toc (+60%)
 * - Creator Boost: 80% phan tien vuot san (Delta P) chia cho dap vien, 20% cho san
 * - Phu phi loc: SV +100d, Ca nhan +200d, Doanh nghiep 0d
 * - Chiet khau Doanh nghiep: 300 mau (-10%), 500 mau (-15%)
 * - Voucher tai tro rieng: Giam 20% CPI tren cac suat co voucher
 * - Hoan tien an toan: Math.min(escrow_locked_balance, Math.max(0, Total - collected*effective))
 */

const config = require('../config');

class SurveyPricingService {
  /**
   * Phan loai do dai cau hoi thanh 3 nhom:
   * - Ngan (SHORT): <= 10 cau
   * - Vua (MEDIUM): 11 - 25 cau
   * - Dai (LONG): > 25 cau
   * @param {number|Array} questionInput So luong cau hoac mang cau hoi
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
   * Lay Bang Gia San Toi Thieu (P_san) va Thu lao co so cho 3 phan khuc
   * @param {string} tier 'STUDENT' | 'PERSONAL' | 'ENTERPRISE'
   * @param {string|number} lengthInput 'SHORT' | 'MEDIUM' | 'LONG' hoac so luong cau hoi
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
   * Lay thong tin 3 Nac Gia De Xuat theo SLA Gom Mau:
   * 1. Muc San Tiet Kiem (Floor) = P_san (3-5 ngay)
   * 2. Muc De Xuat Tieu Chuan (Recommended) = P_san * 1.25 (24-48 gio)
   * 3. Muc Gom Hoa Toc (Rush) = P_san * 1.60 (2-6 gio)
   * 
   * Creator Boost: Phan tien tang them Delta P chia theo ty le:
   * 80% cho nguoi dien / 20% cho san (Student, Personal, Enterprise deu ap dung 80/20)
   * 
   * @param {string} tier 'STUDENT' | 'PERSONAL' | 'ENTERPRISE'
   * @param {string|number} lengthInput 'SHORT' | 'MEDIUM' | 'LONG' hoac so luong cau
   * @returns {Object} 3 nac gia SLA kem thu lao va phi san chi tiet
   */
  getSlaPricingTiers(tier = 'PERSONAL', lengthInput = 'SHORT') {
    const floor = this.getFloorPrice(tier, lengthInput);
    const alpha = config.ECONOMICS.BOOST_REWARD_SHARE?.[floor.tier] || 0.80;
    const slaConfig = config.ECONOMICS.SLA_TIERS || {
      FLOOR: { multiplier: 1.0, label: 'Mức Sàn Tiết Kiệm', badge: 'Tiết kiệm', slaHours: '72-120h', slaText: '3 – 5 ngày', description: 'Tiết kiệm tối đa' },
      RECOMMENDED: { multiplier: 1.25, label: 'Mức Đề Xuất Tiêu Chuẩn', badge: '[Đề Xuất]', slaHours: '24-48h', slaText: '24 – 48 giờ', description: 'Cân bằng hoàn hảo' },
      RUSH: { multiplier: 1.60, label: 'Mức Gom Hỏa Tốc', badge: '[Thưởng Cao]', slaHours: '2-6h', slaText: '2 – 6 giờ', description: 'Gom nhanh trong ngày' }
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
   * Mo hinh Du Bao Toc Do Gom Mau & Thoi Gian Hoan Thanh Dong (Dynamic Velocity Engine)
   * @param {Object} params { targetResponses, questionCount, hasTargeting, targetFiltersCount, effectivePrice, floorPrice }
   * @returns {Object} { speedPerHour, hours, text, factors }
   */
  estimateDynamicVelocity(params = {}) {
    const targetN = Math.max(1, parseInt(params.targetResponses, 10) || 100);
    const qCount = Math.max(1, parseInt(params.questionCount, 10) || 5);
    const hasTargeting = Boolean(params.hasTargeting);
    const targetFiltersCount = parseInt(params.targetFiltersCount, 10) || 0;
    const floorPrice = Math.max(100, parseFloat(params.floorPrice) || 800);
    const effectivePrice = Math.max(floorPrice, parseFloat(params.effectivePrice) || floorPrice);

    let kLoi = 1.0;
    if (qCount <= 5) kLoi = 0.70;
    else if (qCount <= 12) kLoi = 1.00;
    else if (qCount <= 25) kLoi = 1.35;
    else kLoi = 1.80;

    let kTarget = 1.0;
    if (hasTargeting) {
      if (targetFiltersCount >= 3) kTarget = 2.20;
      else if (targetFiltersCount === 2) kTarget = 1.60;
      else kTarget = 1.25;
    }

    const baseSpeedPerHour = 3.5;
    const priceRatio = Math.max(1.0, effectivePrice / floorPrice);
    const vBoost = 1.0 + 5.5 * Math.pow(priceRatio - 1.0, 1.15);

    const speedPerHour = Math.max(0.2, (baseSpeedPerHour * vBoost) / (kLoi * kTarget));
    const hours = Math.max(0.25, targetN / speedPerHour);

    function formatEtaText(h) {
      if (h <= 0.75) return '~30 – 45 phút';
      if (h <= 1.5) return '~1 – 2 giờ';
      if (h <= 3.5) return '~2 – 4 giờ';
      if (h <= 7) return '~4 – 7 giờ';
      if (h <= 12) return '~8 – 12 giờ';
      if (h <= 18) return '~14 – 18 giờ';
      if (h <= 28) return '~20 – 28 giờ (khoảng 1 ngày)';
      if (h <= 48) return '~1.5 – 2 ngày';
      if (h <= 72) return '~2 – 3 ngày';
      if (h <= 120) return '~3 – 5 ngày';
      const days = Math.round(h / 24);
      return '~' + days + ' – ' + (days + 2) + ' ngày';
    }

    return {
      speedPerHour: parseFloat(speedPerHour.toFixed(1)),
      hours: parseFloat(hours.toFixed(1)),
      text: formatEtaText(hours),
      factors: {
        targetN,
        qCount,
        kLoi,
        kTarget,
        priceRatio: parseFloat(priceRatio.toFixed(2))
      }
    };
  }

  /**
   * Uoc tinh thoi luong phong van (LOI - Length of Interview) theo danh sach cau hoi
   * @param {Array} questions Danh sach cau hoi
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

    const rawMinutes = totalSeconds / 60;
    const loiMinutes = Math.max(1.0, Math.round(rawMinutes * 10) / 10);

    return {
      loiSeconds: totalSeconds,
      loiMinutes
    };
  }

  /**
   * Xac dinh bien loi nhuan san dong (Dynamic Take Rate) dua theo LOI
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
   * Tinh toan toan dien kinh te hoc khao sat theo Mo hinh 3 Phan khuc (Tier-Based Economics)
   * @param {Array|number} questions Danh sach cau hoi hoac so luong cau hoi
   * @param {number} targetResponses So luong mau muc tieu
   * @param {Object} options Tuy chon chi tiet
   * @returns {Object}
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

    // 1. Don gia co so truoc Boost
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

    // 2. Creator Boost: Phan tien tang them Delta P chia 80% cho nguoi dien, 20% cho san
    const deltaP = Math.max(0, basePrice - floorPrice);
    const alpha = config.ECONOMICS.BOOST_REWARD_SHARE?.[tier] || 0.80;
    const boostRespondent = Math.floor(alpha * deltaP);
    const boostPlatform = deltaP - boostRespondent;

    let respondentReward = respondentRewardFloor + boostRespondent;
    let platformProfit = platformProfitFloor + boostPlatform;

    // 3. Phu phi Bo loc Doi tuong & Auto-Screener
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

    const standardCostPerResponse = basePrice + targetingFee;
    let effectiveCostPerResponse = standardCostPerResponse;
    respondentReward += targetingRespondent;
    platformProfit += targetingPlatform;

    // 4. Chiet khau quy mo Doanh nghiep (Volume Discount)
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

    // 5. Khau tru Luot Dien Form Mien Phi (Free Quota)
    let freeResponsesApplied = 0;
    if (typeof options.freeResponsesApplied === 'number') {
      freeResponsesApplied = Math.max(0, Math.min(sampleCount, Math.floor(options.freeResponsesApplied)));
    } else if (options.useFreeQuota) {
      const remainingQuota = Math.max(0, parseInt(options.freeQuotaRemaining, 10) || 0);
      if (tier === 'STUDENT') {
        const maxEligible = Math.min(30, Math.floor(sampleCount / 50) * 10);
        freeResponsesApplied = Math.min(remainingQuota, maxEligible);
      } else if (tier === 'PERSONAL' && options.isFirstSurvey && sampleCount >= 50) {
        freeResponsesApplied = Math.min(remainingQuota, 25);
      }
    }

    const paidResponses = Math.max(0, sampleCount - freeResponsesApplied);

    // 6. Xu ly Tang Kem Voucher Doanh Nghiep (Hybrid Model: V ma / N mau voi V <= N)
    const voucherCount = Math.max(0, Math.min(sampleCount, parseInt(options.voucherCount, 10) || 0));
    let voucherDiscountVnd = 0;
    let surveyEscrowVnd = 0;

    if (tier === 'ENTERPRISE' && voucherCount > 0) {
      const cpiVoucher = Math.round(effectiveCostPerResponse * 0.80);
      const paidVoucherResponses = Math.min(paidResponses, voucherCount);
      const paidStandardResponses = Math.max(0, paidResponses - paidVoucherResponses);

      surveyEscrowVnd = (paidVoucherResponses * cpiVoucher) + (paidStandardResponses * effectiveCostPerResponse);
      voucherDiscountVnd = paidVoucherResponses * (effectiveCostPerResponse - cpiVoucher);
    } else {
      surveyEscrowVnd = paidResponses * effectiveCostPerResponse;
    }

    // 7. Toan hoc chong lo san khi dung luot mien phi
    let rewardPointsPerResponse = respondentReward;
    if (freeResponsesApplied > 0) {
      const minTakeRate = tier === 'STUDENT' ? 0.10 : 0.25;
      const rewardFund = Math.floor(surveyEscrowVnd * (1 - minTakeRate));
      rewardPointsPerResponse = Math.max(1, Math.floor(rewardFund / sampleCount));
    }

    const rewardValueVnd = rewardPointsPerResponse * (config.ECONOMICS.POINT_TO_VND_RATE || 1);
    const totalRewardPayoutVnd = rewardValueVnd * sampleCount;
    const platformProfitVnd = Math.max(0, surveyEscrowVnd - totalRewardPayoutVnd);
    const actualTakeRate = surveyEscrowVnd > 0 ? parseFloat(((platformProfitVnd / surveyEscrowVnd) * 100).toFixed(1)) : 0;

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
   * Tinh toan toan dien kinh te hoc khao sat (Tuong thich ca API cu va Mo hinh 3 Phan khuc)
   * @param {Array} questions Danh sach cau hoi
   * @param {number} targetResponses So luong mau muc tieu
   * @param {number|Object} options Tuy chon nang cao
   * @returns {Object}
   */
  calculateSurveyEconomics(questions = [], targetResponses = 100, options = {}) {
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

    if (opts.tier || opts.accountTier || opts.pricingModel === 'TIER_BASED') {
      return this.calculateTierEconomics(questions, targetResponses, opts);
    }

    // Fallback: Thuat toan CPI LOI Matrix nguyen ban cho tuong thich nguoc 100%
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
   * Tinh toan chi phi Ky quy (Escrow) khi Xuat ban khao sat (Publish Survey)
   * Tach biet logic phuc tap tu surveyController.publishSurvey
   * 
   * Quy tac:
   * 1. Neu khao sat la VOUCHER_ONLY (Zero Cash): Escrow = 0
   * 2. Neu Creator tai tro voucher rieng (CREATOR_SPONSORED) va V > 0:
   *    V suat co voucher giam 20% CPI, (N - V) suat tinh CPI goc
   * 3. Neu mua voucher tu Kho San (PLATFORM_CATALOG) va V > 0:
   *    voucherEscrowCost = V * face_value_vnd, CPI khao sat tinh N * cost_per_response
   * 
   * @param {Object} survey Ban ghi khao sat tu co so du lieu
   * @param {Object|null} sponsorCampaign Ban ghi chien dich voucher tai tro (neu co)
   * @returns {Object} { totalEscrow, totalCpiEscrow, voucherEscrowCost, discountedCpi, voucherSlots, isZeroCash }
   */
  calculatePublishEscrow(survey, sponsorCampaign = null) {
    if (!survey) {
      throw new Error('Dữ liệu khảo sát không hợp lệ để tính chi phí ký quỹ');
    }

    if (survey.reward_mode === 'VOUCHER_ONLY') {
      return {
        totalEscrow: 0,
        totalCpiEscrow: 0,
        voucherEscrowCost: 0,
        discountedCpi: 0,
        voucherSlots: 0,
        isZeroCash: true
      };
    }

    const targetN = Math.max(1, parseInt(survey.target_responses, 10) || 100);
    const rawSlots = survey.voucher_total_slots || survey.voucher_purchase_quantity || 0;
    const V = Math.min(targetN, Math.max(0, parseInt(rawSlots, 10) || 0));

    let voucherEscrowCost = 0;
    let totalCpiEscrow = 0;
    let discountedCpi = survey.cost_per_response;

    if (sponsorCampaign && sponsorCampaign.voucher_type === 'CREATOR_SPONSORED' && V > 0) {
      // Doanh nghiep tu tai len ma voucher rieng: giam 20% CPI cho V suat
      discountedCpi = Math.round(survey.cost_per_response * 0.80);
      totalCpiEscrow = (V * discountedCpi) + ((targetN - V) * survey.cost_per_response);
    } else {
      totalCpiEscrow = survey.cost_per_response * targetN;
      if (sponsorCampaign && sponsorCampaign.voucher_type === 'PLATFORM_CATALOG' && V > 0) {
        voucherEscrowCost = V * (sponsorCampaign.face_value_vnd || 0);
      }
    }

    const totalEscrow = totalCpiEscrow + voucherEscrowCost;

    return {
      totalEscrow,
      totalCpiEscrow,
      voucherEscrowCost,
      discountedCpi,
      voucherSlots: V,
      isZeroCash: false
    };
  }

  /**
   * Tinh toan Hoan tien Ky quy An toan khi Huy som hoac Het han
   * Cong thuc: Math.min(escrow_locked_balance, Math.max(0, TotalEscrow - (collected * effective_cost)))
   * 
   * @param {Object} params
   * @returns {Object}
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

    const effectiveCost = targetResponses > 0 ? (totalEscrowPaid / targetResponses) : 0;
    const rawRefund = Math.round(totalEscrowPaid - (collectedResponses * effectiveCost));
    const baseSafeRefund = Math.min(escrowLockedBalance, Math.max(0, rawRefund));

    let finalRefundAmount = baseSafeRefund;
    let penaltyApplied = false;
    let clawbackAmount = 0;
    let note = 'Hoàn tiền an toàn tiêu chuẩn';

    if (tier === 'ENTERPRISE' && (volumeDiscountRate > 0 || hasPromotionPackage)) {
      const isEarlyCancellation = (volumeDiscountRate >= 0.10 && collectedResponses < 300) ||
                                  (volumeDiscountRate >= 0.15 && collectedResponses < 500);

      if (isEarlyCancellation || (hasPromotionPackage && collectedResponses < targetResponses * 0.5)) {
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

module.exports = new SurveyPricingService();
