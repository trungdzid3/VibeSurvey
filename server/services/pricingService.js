const config = require('../config');

class PricingService {
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
   * Xác định biên lợi nhuận sàn (Dynamic Take Rate) dựa theo thời lượng LOI
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
   * Tính toán toàn diện kinh tế học khảo sát (CPI Matrix & Unit Economics)
   * Áp dụng công thức chuẩn:
   * CPI = [(Base Rate * LOI) / (1 - Take Rate)] * M_IR + Phí Targeting
   * 
   * @param {Array} questions Danh sách câu hỏi
   * @param {number} targetResponses Số lượng mẫu mục tiêu (mặc định 100)
   * @param {number|Object} options Tùy chọn nâng cao hoặc customTakeRate
   */
  calculateSurveyEconomics(questions = [], targetResponses = 100, options = {}) {
    // 1. Phân giải tham số tùy chọn (Hỗ trợ tương thích ngược nếu truyền customTakeRate dạng number)
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

    // 2. Tính trọng số và thời lượng LOI
    let totalWeight = 0;
    for (const q of questions) {
      if (!q) continue;
      const w = config.ECONOMICS.QUESTION_WEIGHTS ? (config.ECONOMICS.QUESTION_WEIGHTS[q.type] || 1.0) : 1.0;
      totalWeight += w;
    }

    const { loiSeconds, loiMinutes } = this.estimateLoi(questions);

    // 3. Xác định Take Rate sàn
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

    // 4. Xác định hệ số độ hiếm tệp khách (M_IR)
    let irMultiplier = 1.0;
    if (typeof opts.irMultiplier === 'number') {
      irMultiplier = opts.irMultiplier;
    } else if (opts.irTier && config.ECONOMICS.IR_MULTIPLIERS && config.ECONOMICS.IR_MULTIPLIERS[opts.irTier]) {
      irMultiplier = config.ECONOMICS.IR_MULTIPLIERS[opts.irTier];
    }

    // 5. Tính phí Targeting nhân khẩu học (nếu có lọc sâu)
    const filterCount = Math.max(0, parseInt(opts.targetingFilterCount, 10) || 0);
    const targetingFeeRate = config.ECONOMICS.TARGETING_FEE_PER_FILTER_VND || 1000;
    const targetingFeeVnd = filterCount * targetingFeeRate;

    // 6. Tính toán CPI (Cost Per Interview) theo công thức chuẩn hóa
    const baseRatePerMin = config.ECONOMICS.BASE_PAYOUT_PER_MINUTE_VND || 700;
    
    // Thù lao người dùng cơ bản theo thời lượng và độ khó (được bảo toàn cho Respondent)
    const respondentBudgetVnd = Math.round(baseRatePerMin * loiMinutes * irMultiplier);

    // CPI cơ sở trước phí targeting
    const baseCpi = (baseRatePerMin * loiMinutes / (1 - takeRate)) * irMultiplier;

    // Tổng CPI trước các phụ phí dự án
    let rawCpi = baseCpi + targetingFeeVnd;

    // Gói Hỏa tốc hoàn thành trong 6h (+25% tổng dự án)
    const isUrgent6h = Boolean(opts.isUrgent6h);
    if (isUrgent6h) {
      const urgentSurcharge = config.ECONOMICS.FAST_DELIVERY_SURCHARGE_RATE || 0.25;
      rawCpi = rawCpi * (1 + urgentSurcharge);
    }

    // Đơn giá Creator trả cho 1 phiếu khảo sát hợp lệ (làm tròn VNĐ)
    const costPerResponseVnd = Math.round(rawCpi);

    // 7. Điểm thưởng quy đổi trả cho Respondent (1 Point = 10 VND)
    const pointRate = config.ECONOMICS.POINT_TO_VND_RATE || 10;
    const rewardPointsPerResponse = Math.floor(respondentBudgetVnd / pointRate);
    const rewardValueVnd = rewardPointsPerResponse * pointRate;

    // 8. Lợi nhuận sàn trên 1 mẫu hoàn thành
    const platformProfitPerResponseVnd = costPerResponseVnd - rewardValueVnd;
    const actualTakeRate = costPerResponseVnd > 0 ? (platformProfitPerResponseVnd / costPerResponseVnd) * 100 : 0;

    // 9. Tính tổng chi phí ký quỹ Escrow và Lợi nhuận toàn chiến dịch
    const sampleCount = Math.max(1, parseInt(targetResponses, 10) || 100);
    const surveyEscrowVnd = costPerResponseVnd * sampleCount;

    // Phụ phí gói báo cáo AI Insights & SPSS (+500,000đ/dự án)
    const hasAiInsights = Boolean(opts.hasAiInsights);
    const aiInsightsFeeVnd = hasAiInsights ? (config.ECONOMICS.AI_INSIGHTS_REPORT_FEE_VND || 500000) : 0;

    const totalEscrowVnd = surveyEscrowVnd + aiInsightsFeeVnd;
    const estimatedPlatformProfitVnd = (platformProfitPerResponseVnd * sampleCount) + aiInsightsFeeVnd;

    return {
      totalQuestions: questions.length,
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
      actualTakeRate: parseFloat(actualTakeRate.toFixed(1)), // %
      targetResponses: sampleCount,
      surveyEscrowVnd,
      aiInsightsFeeVnd,
      totalEscrowVnd,
      estimatedPlatformProfitVnd
    };
  }
}

module.exports = new PricingService();
