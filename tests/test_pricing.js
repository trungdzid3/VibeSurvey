/**
 * TEST SUITE: PRICING & UNIT ECONOMICS ENGINE (KIỂM TOÁN CÔNG THỨC CPI & TAKE RATE SÀN)
 * Quy chuẩn theo Mục 1 & Mục 10 trong KE_HOACH_TONG_THE.md:
 * - CPI = [(Base Rate * LOI) / (1 - Take Rate)] * M_IR + Phí Targeting
 * - Dynamic Take Rate: Ngắn 50%, Tiêu chuẩn 40%, Chuyên sâu 35%
 * - IR Multipliers: 1.0x, 1.35x, 1.8x, 2.5x
 * - Đối soát 100% dòng tiền: costPerResponseVnd = rewardValueVnd + platformProfitPerResponseVnd
 */

const assert = require('assert');
const config = require('../server/config');
const pricingService = require('../server/services/pricingService');

async function runPricingTests() {
  console.log('===============================================================');
  console.log('💹 BẮT ĐẦU KIỂM THỬ: PRICING & UNIT ECONOMICS ENGINE (CPI MATRIX)');
  console.log('===============================================================');

  let passedTests = 0;
  let totalTests = 0;

  async function runTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error('     Chi tiết lỗi:', err.message);
      throw err;
    }
  }

  // 1. Kiểm tra thuật toán ước tính thời lượng LOI theo loại câu hỏi
  await runTest('1. Ước tính LOI (Length of Interview) tự động theo trọng số thời gian câu hỏi', async () => {
    // 3 câu Single Choice (17s x 3 = 51s) + 1 câu Likert (20s) = 71s -> 1.2 phút
    const shortSurvey = [
      { type: 'SINGLE_CHOICE' },
      { type: 'SINGLE_CHOICE' },
      { type: 'SINGLE_CHOICE' },
      { type: 'LIKERT_SCALE' }
    ];
    const loi1 = pricingService.estimateLoi(shortSurvey);
    assert.strictEqual(loi1.loiSeconds, 71);
    assert.strictEqual(loi1.loiMinutes, 1.2);

    // Khảo sát có tự luận mở (45s)
    const mixedSurvey = [
      { type: 'SINGLE_CHOICE' }, // 17s
      { type: 'MULTIPLE_CHOICE' }, // 17s
      { type: 'LIKERT_SCALE' }, // 20s
      { type: 'OPEN_TEXT' } // 45s
    ];
    const loi2 = pricingService.estimateLoi(mixedSurvey);
    assert.strictEqual(loi2.loiSeconds, 99);
    assert.strictEqual(loi2.loiMinutes, 1.7);

    // Khảo sát trống -> fallback an toàn tối thiểu 1.0 phút
    const emptyLoi = pricingService.estimateLoi([]);
    assert.strictEqual(emptyLoi.loiMinutes, 1.0);
  });

  // 2. Kiểm tra Dynamic Take Rate theo phân khúc thời lượng (Short, Standard, Deep)
  await runTest('2. Dynamic Take Rate: Khảo sát ngắn 50%, tiêu chuẩn 40%, chuyên sâu 35%', async () => {
    // LOI <= 3 phút -> SHORT (50%)
    const tierShort = pricingService.getDynamicTakeRate(2.5);
    assert.strictEqual(tierShort.tierName, 'SHORT');
    assert.strictEqual(tierShort.takeRate, 0.50);

    // 3 < LOI <= 10 phút -> STANDARD (40%)
    const tierStandard = pricingService.getDynamicTakeRate(6.0);
    assert.strictEqual(tierStandard.tierName, 'STANDARD');
    assert.strictEqual(tierStandard.takeRate, 0.40);

    // LOI > 10 phút -> DEEP (35%)
    const tierDeep = pricingService.getDynamicTakeRate(15.0);
    assert.strictEqual(tierDeep.tierName, 'DEEP');
    assert.strictEqual(tierDeep.takeRate, 0.35);
  });

  // 3. Kiểm tra khảo sát ngắn (Micro-poll LOI 2 phút, Take Rate 50%, Đại chúng 1.0x)
  await runTest('3. Khảo sát Ngắn (Micro-Poll): Take Rate 50%, Base Rate 700đ/phút', async () => {
    // 7 câu trắc nghiệm (7 * 17 = 119s ~ 2.0 phút)
    const questions = Array(7).fill({ type: 'SINGLE_CHOICE' });
    const eco = pricingService.calculateSurveyEconomics(questions, 200);

    assert.strictEqual(eco.tierName, 'SHORT');
    assert.strictEqual(eco.targetTakeRate, 50.0);
    assert.strictEqual(eco.loiMinutes, 2.0);

    // CPI = (700 * 2.0) / (1 - 0.5) * 1.0 = 1400 / 0.5 = 2.800đ / phiếu
    assert.strictEqual(eco.costPerResponseVnd, 2800);
    // Respondent nhận 1.400đ = 140 Điểm
    assert.strictEqual(eco.rewardPointsPerResponse, 140);
    assert.strictEqual(eco.rewardValueVnd, 1400);
    // Sàn thu lời 1.400đ
    assert.strictEqual(eco.platformProfitPerResponseVnd, 1400);
    assert.strictEqual(eco.actualTakeRate, 50.0);

    // Tổng Escrow cho 200 mẫu = 560.000đ
    assert.strictEqual(eco.totalEscrowVnd, 560000);
    assert.strictEqual(eco.estimatedPlatformProfitVnd, 280000);

    // Đối soát toàn vẹn
    assert.strictEqual(eco.costPerResponseVnd, eco.rewardValueVnd + eco.platformProfitPerResponseVnd);
  });

  // 4. Kiểm tra khảo sát tiêu chuẩn (LOI 8 phút ~ 25 câu, Take Rate 40%, IR Trung bình 1.35x)
  await runTest('4. Khảo sát Tiêu chuẩn: IR 1.35x (Độ khó trung bình), Take Rate 40%', async () => {
    // 25 câu trắc nghiệm + likert (tương đương 8 phút)
    const questions = [
      ...Array(20).fill({ type: 'SINGLE_CHOICE' }), // 20 * 17s = 340s
      ...Array(7).fill({ type: 'LIKERT_SCALE' })    // 7 * 20s = 140s => 480s = 8.0 phút
    ];
    const eco = pricingService.calculateSurveyEconomics(questions, 500, { irTier: 'MEDIUM' });

    assert.strictEqual(eco.tierName, 'STANDARD');
    assert.strictEqual(eco.loiMinutes, 8.0);
    assert.strictEqual(eco.irMultiplier, 1.35);

    // Base respondent budget = 700 * 8.0 * 1.35 = 7.560đ -> 756 Điểm (7.560đ)
    assert.strictEqual(eco.rewardPointsPerResponse, 756);
    assert.strictEqual(eco.rewardValueVnd, 7560);

    // CPI = (700 * 8.0 / (1 - 0.40)) * 1.35 = (5600 / 0.6) * 1.35 = 9333.33 * 1.35 = 12.600đ
    assert.strictEqual(eco.costPerResponseVnd, 12600);

    // Sàn thu lời 12.600 - 7.560 = 5.040đ (40.0%)
    assert.strictEqual(eco.platformProfitPerResponseVnd, 5040);
    assert.strictEqual(eco.actualTakeRate, 40.0);

    // Tổng Escrow 500 mẫu = 6.300.000đ
    assert.strictEqual(eco.totalEscrowVnd, 6300000);
    assert.strictEqual(eco.estimatedPlatformProfitVnd, 2520000);

    // Đối soát bảo toàn số dư
    assert.strictEqual(eco.costPerResponseVnd, eco.rewardValueVnd + eco.platformProfitPerResponseVnd);
  });

  // 5. Kiểm tra khảo sát Chuyên sâu Ngách B2B (IR Niche 2.5x, LOI 15 phút, Phí Targeting +3 tiêu chí)
  await runTest('5. Khảo sát Chuyên Sâu Ngách B2B: IR 2.5x, Take Rate 35%, Phí lọc sâu +3.000đ/phiếu', async () => {
    // 50 câu (loiMinutes = 15.0)
    const questions = [
      ...Array(30).fill({ type: 'SINGLE_CHOICE' }), // 30 * 17 = 510s
      ...Array(12).fill({ type: 'LIKERT_SCALE' }),  // 12 * 20 = 240s
      ...Array(3).fill({ type: 'OPEN_TEXT' })       // 3 * 45 = 135s => 885s = 14.75 -> 14.8 min
    ];
    // Giả lập options chi tiết
    const eco = pricingService.calculateSurveyEconomics(questions, 100, {
      irTier: 'NICHE', // 2.5x
      targetingFilterCount: 3 // 3 tiêu chí lọc sâu: +3.000đ/phiếu
    });

    assert.strictEqual(eco.tierName, 'DEEP');
    assert.strictEqual(eco.targetTakeRate, 35.0);
    assert.strictEqual(eco.irMultiplier, 2.5);
    assert.strictEqual(eco.targetingFeeVnd, 3000);

    // Respondent nhận thù lao: 700 * 14.8 * 2.5 = 25.900đ -> 2.590 Điểm
    assert.strictEqual(eco.rewardPointsPerResponse, 2590);
    assert.strictEqual(eco.rewardValueVnd, 25900);

    // Base CPI = (700 * 14.8 / 0.65) * 2.5 = 15938.46 * 2.5 = 39846.15 -> 39846đ
    // CPI = 39846 + 3000 (targeting) = 42.846đ
    assert.strictEqual(eco.costPerResponseVnd, 42846);

    // Biên lợi nhuận sàn tăng lên nhờ phí dịch vụ Targeting (100% margin):
    // Profit = 42.846 - 25.900 = 16.946đ
    assert.strictEqual(eco.platformProfitPerResponseVnd, 16946);
    assert(eco.actualTakeRate > 35.0, 'Take rate thực tế tăng thêm nhờ phí Targeting');

    // Kiểm tra tính bảo toàn dòng tiền
    assert.strictEqual(eco.costPerResponseVnd, eco.rewardValueVnd + eco.platformProfitPerResponseVnd);
  });

  // 6. Kiểm tra Gói Hỏa tốc 6h (+25%) và Gói Báo cáo AI Insights (+500.000đ)
  await runTest('6. Phụ phí Dịch vụ Gia tăng: Gói Hỏa tốc (+25%) & Báo cáo AI Insights (+500k)', async () => {
    const questions = Array(10).fill({ type: 'SINGLE_CHOICE' }); // ~2.8 phút
    const standardEco = pricingService.calculateSurveyEconomics(questions, 100);

    const urgentEco = pricingService.calculateSurveyEconomics(questions, 100, {
      isUrgent6h: true,
      hasAiInsights: true
    });

    // CPI gói hỏa tốc phải cao hơn đúng 25% (làm tròn)
    assert(urgentEco.costPerResponseVnd > standardEco.costPerResponseVnd);
    const expectedUrgentCpi = Math.round(standardEco.costPerResponseVnd * 1.25);
    assert.strictEqual(urgentEco.costPerResponseVnd, expectedUrgentCpi);

    // Tổng Escrow phải cộng thêm đúng 500.000đ tiền báo cáo AI
    assert.strictEqual(urgentEco.aiInsightsFeeVnd, 500000);
    assert.strictEqual(urgentEco.totalEscrowVnd, (urgentEco.costPerResponseVnd * 100) + 500000);

    // Lợi nhuận sàn được cộng thêm 500.000đ
    assert.strictEqual(
      urgentEco.estimatedPlatformProfitVnd,
      (urgentEco.platformProfitPerResponseVnd * 100) + 500000
    );
  });

  // 7. Kiểm tra tương thích ngược hoàn toàn với API cũ (truyền customTakeRate dạng số)
  await runTest('7. Tính Tương Thích Ngược (Backward Compatibility) với các lời gọi cũ', async () => {
    const questions = [
      { type: 'SINGLE_CHOICE' },
      { type: 'LIKERT_SCALE' }
    ];
    // Gọi theo phong cách cũ: calculateSurveyEconomics(questions, 50, 0.30)
    const ecoOld = pricingService.calculateSurveyEconomics(questions, 50, 0.30);
    assert.strictEqual(ecoOld.targetTakeRate, 30.0);
    assert.strictEqual(ecoOld.tierName, 'CUSTOM');
    assert.strictEqual(ecoOld.costPerResponseVnd, ecoOld.rewardValueVnd + ecoOld.platformProfitPerResponseVnd);
  });

  console.log('---------------------------------------------------------------');
  console.log(`🎉 TEST PRICING HOÀN THÀNH: ${passedTests}/${totalTests} BÀI THÀNH CÔNG (100% PASS)`);
  console.log('===============================================================\n');

  return { passedTests, totalTests };
}

if (require.main === module) {
  runPricingTests().catch(err => {
    console.error('Lỗi kiểm thử Pricing:', err);
    process.exit(1);
  });
}

module.exports = runPricingTests;
