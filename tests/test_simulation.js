/**
 * Bộ kiểm thử Tầng 4: Simulation Test & Economic Profit Engine Audit
 * Mô phỏng 100 lượt nộp bài từ các hành vi người dùng & bot khác nhau
 * Thống kê tỷ lệ phát hiện gian lận và xác nhận biên lợi nhuận sàn (Take Rate ~40%)
 */

const assert = require('node:assert');
const antiFraudService = require('../server/services/antiFraudService');
const pricingService = require('../server/services/pricingService');
const config = require('../server/config');

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Chi tiết lỗi: ${err.message}`);
    throw err;
  }
}

async function runSimulationTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TẦNG 4: CHAOS SIMULATION & MONETIZATION AUDIT');
  console.log('===============================================================');

  // Khảo sát mô phỏng chuẩn
  const simulationQuestions = [
    {
      id: 'q1',
      type: 'SINGLE_CHOICE',
      content: 'Bạn đang sinh sống tại khu vực nào ở Việt Nam?',
      options_json: JSON.stringify(['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Tỉnh thành khác']),
      is_attention_check: 0,
      expected_answer: null
    },
    {
      id: 'q2',
      type: 'LIKERT_SCALE',
      content: 'Mức độ bạn quan tâm đến các chương trình ưu đãi giảm giá khi mua sắm',
      options_json: JSON.stringify(['1', '2', '3', '4', '5']),
      is_attention_check: 0,
      expected_answer: null
    },
    {
      id: 'q3',
      type: 'SINGLE_CHOICE',
      content: 'Để chứng minh bạn đang đọc kỹ khảo sát, vui lòng chọn phương án Cam kết bảo mật',
      options_json: JSON.stringify(['Bỏ qua', 'Không quan tâm', 'Cam kết bảo mật', 'Ý kiến khác']),
      is_attention_check: 1,
      expected_answer: 'Cam kết bảo mật'
    },
    {
      id: 'q4',
      type: 'LIKERT_SCALE',
      content: 'Tần suất bạn sử dụng ví điện tử trong tuần',
      options_json: JSON.stringify(['1', '2', '3', '4', '5']),
      is_attention_check: 0,
      expected_answer: null
    },
    {
      id: 'q5',
      type: 'LIKERT_SCALE',
      content: 'Độ tin tưởng của bạn vào hệ thống xác thực sinh trắc học',
      options_json: JSON.stringify(['1', '2', '3', '4', '5']),
      is_attention_check: 0,
      expected_answer: null
    },
    {
      id: 'q6',
      type: 'OPEN_TEXT',
      content: 'Chia sẻ ngắn gọn kỳ vọng của bạn đối với nền tảng khảo sát trong tương lai',
      options_json: null,
      is_attention_check: 0,
      expected_answer: null
    }
  ];

  const tMin = antiFraudService.calculateMinCompletionTime(simulationQuestions);
  console.log(`ℹ️ Thời gian hoàn thành tối thiểu tính toán (T_min): ${tMin} giây`);

  // Tính toán kinh tế học của khảo sát (Mô phỏng phân khúc tiêu chuẩn Take Rate 40%)
  const surveyEconomics = pricingService.calculateSurveyEconomics(simulationQuestions, 100, 0.40);
  console.log(`ℹ️ Đơn giá Creator trả mỗi mẫu: ${surveyEconomics.costPerResponseVnd.toLocaleString('vi-VN')} VND`);
  console.log(`ℹ️ Điểm thưởng Respondent nhận: ${surveyEconomics.rewardPointsPerResponse} Điểm (${surveyEconomics.rewardValueVnd.toLocaleString('vi-VN')} VND)`);
  console.log(`ℹ️ Biên lợi nhuận sàn (Take Rate): ${surveyEconomics.actualTakeRate}%`);

  // 1. Chạy mô phỏng 100 lượt làm bài với 4 nhóm hành vi
  await runTest('1. Giả lập 100 lượt làm bài đa tầng: Người thật (40), Bot tốc độ (30), Người làm ẩu (20), Bot Straight-lining (10)', async () => {
    const stats = {
      total: 100,
      honestGroup: { total: 40, passed: 0, failed: 0 },
      speedTrapGroup: { total: 30, intercepted: 0, leaked: 0 },
      attentionFailGroup: { total: 20, intercepted: 0, leaked: 0 },
      straightLiningGroup: { total: 10, intercepted: 0, leaked: 0 }
    };

    // Nhóm 1: Người thật đọc kỹ (40 lượt)
    for (let i = 0; i < 40; i++) {
      const answers = {
        q1: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'][i % 3],
        q2: String((i % 4) + 2), // 2, 3, 4, 5
        q3: 'Cam kết bảo mật',   // Đúng câu bẫy
        q4: String((i % 3) + 3), // 3, 4, 5
        q5: String(((i + 1) % 4) + 1), // Đa dạng
        q6: `Tôi rất kỳ vọng nền tảng sẽ có thêm nhiều khảo sát chất lượng cao và quy đổi thẻ cào nhanh chóng mẫu số ${i + 1}.`
      };
      // Thời gian làm bài hợp lý: từ 1.3 * T_min đến 2.5 * T_min
      const durationSec = Math.floor(tMin * (1.3 + (i % 10) * 0.1));
      const res = antiFraudService.evaluateSubmission(simulationQuestions, answers, durationSec);

      if (res.status === 'VALIDATED') {
        stats.honestGroup.passed++;
      } else {
        stats.honestGroup.failed++;
      }
    }

    // Nhóm 2: Bot chạy nhanh (Speed Trap) (30 lượt)
    for (let i = 0; i < 30; i++) {
      const answers = {
        q1: 'Hà Nội',
        q2: '5',
        q3: 'Cam kết bảo mật', // Kể cả bot có biết câu bẫy nhưng làm quá nhanh
        q4: '5',
        q5: '5',
        q6: 'Ứng dụng dùng rất tốt và nhanh.'
      };
      // Bot submit chỉ trong 1 - 3 giây (cực nhanh < T_min)
      const durationSec = 1 + (i % 3);
      const res = antiFraudService.evaluateSubmission(simulationQuestions, answers, durationSec);

      if (res.status !== 'VALIDATED') {
        stats.speedTrapGroup.intercepted++;
      } else {
        stats.speedTrapGroup.leaked++;
      }
    }

    // Nhóm 3: Người làm ẩu sai câu bẫy (Attention Check Failure) (20 lượt)
    for (let i = 0; i < 20; i++) {
      const answers = {
        q1: 'Cần Thơ',
        q2: '4',
        q3: 'Bỏ qua', // TRƯỢT CÂU BẪY CHÚ Ý
        q4: '3',
        q5: '4',
        q6: 'Khảo sát cũng được, làm nhanh cho xong để lấy điểm.'
      };
      const durationSec = Math.floor(tMin * 1.4); // Thời gian làm bình thường
      const res = antiFraudService.evaluateSubmission(simulationQuestions, answers, durationSec);

      if (res.status !== 'VALIDATED') {
        stats.attentionFailGroup.intercepted++;
      } else {
        stats.attentionFailGroup.leaked++;
      }
    }

    // Nhóm 4: Bot chọn 1 đáp án thẳng tuột (Straight-lining) (10 lượt)
    for (let i = 0; i < 10; i++) {
      const answers = {
        q1: 'Hà Nội',
        q2: '5',
        q3: '5', // Vừa chọn cùng 1 đáp án vừa sai luôn cả text câu bẫy
        q4: '5',
        q5: '5',
        q6: '55555555555555555555' // Spam ký tự
      };
      const durationSec = Math.floor(tMin * 1.5);
      const res = antiFraudService.evaluateSubmission(simulationQuestions, answers, durationSec);

      if (res.status !== 'VALIDATED') {
        stats.straightLiningGroup.intercepted++;
      } else {
        stats.straightLiningGroup.leaked++;
      }
    }

    // XÁC NHẬN KẾT QUẢ ĐẠT CHUẨN 100%
    console.log('\n📊 KẾT QUẢ MÔ PHỎNG 100 LƯỢT LÀM BÀI:');
    console.log(`  👥 [Nhóm Người Thật]       Hợp lệ: ${stats.honestGroup.passed}/40 (${(stats.honestGroup.passed / 40 * 100).toFixed(1)}%) | Bị chặn nhầm: ${stats.honestGroup.failed}`);
    console.log(`  ⚡ [Nhóm Bot Tốc Độ]       Bị chặn: ${stats.speedTrapGroup.intercepted}/30 (${(stats.speedTrapGroup.intercepted / 30 * 100).toFixed(1)}%) | Lọt lưới: ${stats.speedTrapGroup.leaked}`);
    console.log(`  🎯 [Nhóm Sai Câu Bẫy]      Bị chặn: ${stats.attentionFailGroup.intercepted}/20 (${(stats.attentionFailGroup.intercepted / 20 * 100).toFixed(1)}%) | Lọt lưới: ${stats.attentionFailGroup.leaked}`);
    console.log(`  📏 [Nhóm Straight-lining]  Bị chặn: ${stats.straightLiningGroup.intercepted}/10 (${(stats.straightLiningGroup.intercepted / 10 * 100).toFixed(1)}%) | Lọt lưới: ${stats.straightLiningGroup.leaked}`);

    const totalFraud = 30 + 20 + 10; // 60
    const interceptedFraud = stats.speedTrapGroup.intercepted + stats.attentionFailGroup.intercepted + stats.straightLiningGroup.intercepted;
    const fraudDetectionRate = (interceptedFraud / totalFraud) * 100;
    console.log(`\n🛡️ TỔNG TỶ LỆ PHÁT HIỆN GIAN LẬN: ${interceptedFraud}/${totalFraud} (${fraudDetectionRate.toFixed(1)}%)`);

    assert.strictEqual(stats.honestGroup.passed, 40, '100% người dùng thật đọc kỹ phải được chấp thuận');
    assert.strictEqual(stats.honestGroup.failed, 0, '0% người dùng thật bị từ chối oan');
    assert.strictEqual(stats.speedTrapGroup.intercepted, 30, '100% bot chạy nhanh phải bị chặn đứng bởi Speed Trap');
    assert.strictEqual(stats.attentionFailGroup.intercepted, 20, '100% bài làm sai câu bẫy phải bị chặn bởi Attention Check');
    assert.strictEqual(stats.straightLiningGroup.intercepted, 10, '100% bot straight-lining phải bị loại bỏ');
    assert.strictEqual(fraudDetectionRate, 100.0, 'Tỷ lệ phát hiện gian lận tổng thể bắt buộc phải đạt 100%');
  });

  // 2. Xác nhận tính toán kinh tế học & Biên lợi nhuận sàn (Take Rate)
  await runTest('2. Kiểm toán dòng tiền kinh tế học sàn & Lợi nhuận gộp (Take Rate ~40%)', async () => {
    const validCount = 40; // 40 bài người thật được giải ngân
    const costPerResp = surveyEconomics.costPerResponseVnd;
    const rewardValue = surveyEconomics.rewardValueVnd;
    const profitPerResp = surveyEconomics.platformProfitPerResponseVnd;

    const totalGrossRevenueVnd = validCount * costPerResp;
    const totalRewardPaidVnd = validCount * rewardValue;
    const totalPlatformProfitVnd = validCount * profitPerResp;
    const calculatedTakeRate = (totalPlatformProfitVnd / totalGrossRevenueVnd) * 100;

    console.log('\n💰 BÁO CÁO TÀI CHÍNH CHIẾN DỊCH SAU MÔ PHỎNG:');
    console.log(`  💵 Doanh thu từ Creator (40 mẫu hợp lệ): ${totalGrossRevenueVnd.toLocaleString('vi-VN')} VND`);
    console.log(`  🎁 Chi phí trả thưởng Respondent:         ${totalRewardPaidVnd.toLocaleString('vi-VN')} VND (${(validCount * surveyEconomics.rewardPointsPerResponse).toLocaleString()} Điểm)`);
    console.log(`  📈 Lợi nhuận gộp sàn thu về:              ${totalPlatformProfitVnd.toLocaleString('vi-VN')} VND`);
    console.log(`  📊 Biên lợi nhuận thực tế (Take Rate):    ${calculatedTakeRate.toFixed(2)}% (Mục tiêu sàn: ~40%)`);

    assert(calculatedTakeRate >= 38.0 && calculatedTakeRate <= 42.0, `Biên lợi nhuận thực tế (${calculatedTakeRate}%) phải xoay quanh mức 40%`);
    assert.strictEqual(totalGrossRevenueVnd, totalRewardPaidVnd + totalPlatformProfitVnd, 'Doanh thu phải bằng tổng chi phí trả thưởng cộng lợi nhuận sàn');
  });

  console.log('---------------------------------------------------------------');
  console.log(`🎉 TẦNG 4 KẾT THÚC: ${passedTests}/${totalTests} BÀI KIỂM THỬ THÀNH CÔNG (100% PASS)`);
  console.log('===============================================================\n');

  return { passedTests, totalTests };
}

if (require.main === module) {
  runSimulationTests().catch(err => {
    console.error('Lỗi kiểm thử Tầng 4:', err);
    process.exit(1);
  });
}

module.exports = runSimulationTests;
