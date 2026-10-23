/**
 * Bộ kiểm thử Tầng 1: Anti-Fraud Engine Unit Test
 * Kiểm tra các chốt chặn chống gian lận: Speed Trap, Attention Check, Straight-lining, Entropy
 */

const assert = require('node:assert');
const antiFraudService = require('../server/services/antiFraudService');
const config = require('../server/config');

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ TẦNG 1: ANTI-FRAUD ENGINE');
console.log('===============================================================');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Chi tiết lỗi: ${err.message}`);
    throw err;
  }
}

// Bộ câu hỏi mẫu dùng để test
const sampleQuestions = [
  {
    id: 'q1',
    order_index: 1,
    type: 'SINGLE_CHOICE',
    content: 'Bạn đánh giá thế nào về chất lượng giao dịch của nền tảng?',
    options_json: JSON.stringify(['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Rất tốt']),
    is_attention_check: 0,
    expected_answer: null
  },
  {
    id: 'q2',
    order_index: 2,
    type: 'LIKERT_SCALE',
    content: 'Mức độ hài lòng của bạn đối với tốc độ thanh toán rút tiền',
    options_json: JSON.stringify(['1', '2', '3', '4', '5']),
    is_attention_check: 0,
    expected_answer: null
  },
  {
    id: 'q3',
    order_index: 3,
    type: 'SINGLE_CHOICE',
    content: 'Để xác nhận bạn đang đọc kỹ câu hỏi, vui lòng chọn phương án Cam kết',
    options_json: JSON.stringify(['Bỏ qua', 'Không rõ', 'Cam kết', 'Khác']),
    is_attention_check: 1,
    expected_answer: 'Cam kết'
  },
  {
    id: 'q4',
    order_index: 4,
    type: 'LIKERT_SCALE',
    content: 'Bạn có sẵn sàng giới thiệu nền tảng cho bạn bè hay đồng nghiệp không?',
    options_json: JSON.stringify(['1', '2', '3', '4', '5']),
    is_attention_check: 0,
    expected_answer: null
  },
  {
    id: 'q5',
    order_index: 5,
    type: 'LIKERT_SCALE',
    content: 'Mức độ tin cậy của bạn đối với hệ thống bảo mật ví',
    options_json: JSON.stringify(['1', '2', '3', '4', '5']),
    is_attention_check: 0,
    expected_answer: null
  },
  {
    id: 'q6',
    order_index: 6,
    type: 'OPEN_TEXT',
    content: 'Hãy đóng góp ý kiến để chúng tôi hoàn thiện sản phẩm tốt hơn',
    options_json: null,
    is_attention_check: 0,
    expected_answer: null
  }
];

// 1. Kiểm tra tính toán T_min
test('1. Tính toán thời gian tối thiểu hợp lý (T_min)', () => {
  const tMin = antiFraudService.calculateMinCompletionTime(sampleQuestions);
  assert(tMin > 10, `T_min phải lớn hơn 10 giây đối với bộ câu hỏi 6 câu, thực tế: ${tMin}s`);
  // Đảm bảo hàm trả về số nguyên dương
  assert(Number.isInteger(tMin));
});

// 2. Kiểm tra Shannon Entropy cho câu trả lời tự luận
test('2. Thuật toán Shannon Entropy phát hiện văn bản spam', () => {
  const spamRepetitive = 'aaaaaaaaaaaaaaaa';
  const spamPattern = 'asdfasdfasdfasdf';
  const meaningfulText = 'Giao diện web rất đẹp và tốc độ tải trang cực kỳ nhanh chóng.';

  const entropySpam = antiFraudService.calculateEntropy(spamRepetitive);
  const entropyMeaningful = antiFraudService.calculateEntropy(meaningfulText);

  assert(entropySpam === 0, `Entropy của chuỗi lặp toàn bộ phải bằng 0, thực tế: ${entropySpam}`);
  assert(entropyMeaningful > 3.0, `Entropy của câu văn tiếng Việt tự nhiên phải > 3.0, thực tế: ${entropyMeaningful}`);
});

// 3. Kiểm tra Speed Trap: Thời gian nộp bài < T_min
test('3. Bẫy Tốc Độ (Speed Trap): Chặn đứng bot nộp bài thần tốc', () => {
  const tMin = antiFraudService.calculateMinCompletionTime(sampleQuestions);
  const botDurationSec = 2; // Bot nộp bài chỉ trong 2 giây

  const answers = {
    q1: 'Tốt',
    q2: '4',
    q3: 'Cam kết',
    q4: '5',
    q5: '4',
    q6: 'Tôi cảm thấy ứng dụng hoạt động rất ổn định và giao diện mượt mà.'
  };

  const result = antiFraudService.evaluateSubmission(sampleQuestions, answers, botDurationSec);

  assert.strictEqual(result.isValid, false, 'Bài nộp trong 2s không được phép hợp lệ (isValid phải là false)');
  assert(
    result.reasons.some(r => r.includes('nhanh bất thường') || r.includes('Làm bài quá nhanh') || r.includes('bot/spam')) ||
    (result.internalReasons && result.internalReasons.some(r => r.includes('Làm bài quá nhanh') || r.includes('bot/spam'))),
    'Phải chứa lý do cảnh báo tốc độ'
  );
  assert(result.scoreDetails.speedRatio < 0.2, `speedRatio phải bị phạt nặng (< 0.2), thực tế: ${result.scoreDetails.speedRatio}`);
  assert(result.qualityScore < config.ANTI_FRAUD.MIN_QUALITY_SCORE, `qualityScore (${result.qualityScore}) phải nhỏ hơn ngưỡng ${config.ANTI_FRAUD.MIN_QUALITY_SCORE}`);
  assert.strictEqual(result.status, 'REJECTED_FRAUD', 'Trạng thái phải là REJECTED_FRAUD');
});

// 4. Kiểm tra Attention Check: Trả lời sai câu hỏi kiểm tra độ chú ý
test('4. Bẫy Tập Trung (Attention Check): Phạt thẳng tay về 0 điểm khi chọn sai', () => {
  const tMin = antiFraudService.calculateMinCompletionTime(sampleQuestions);
  const normalDuration = Math.ceil(tMin * 1.5);

  const wrongAttentionAnswers = {
    q1: 'Tốt',
    q2: '4',
    q3: 'Bỏ qua', // Đáp án đúng là 'Cam kết'
    q4: '5',
    q5: '4',
    q6: 'Trải nghiệm người dùng rất tốt, chúc dự án thành công.'
  };

  const result = antiFraudService.evaluateSubmission(sampleQuestions, wrongAttentionAnswers, normalDuration);

  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.scoreDetails.attentionScore, 0.0, 'attentionScore phải bằng 0.0');
  assert.strictEqual(result.qualityScore, 0.0, 'qualityScore phải bằng 0.0 khi trượt câu bẫy');
  assert.strictEqual(result.status, 'REJECTED_FRAUD');
  assert(
    result.reasons.some(r => r.includes('độ tập trung') || r.includes('độ chú ý')) ||
    (result.internalReasons && result.internalReasons.some(r => r.includes('độ chú ý'))),
    'Phải có lý do trượt câu hỏi kiểm tra độ chú ý/tập trung'
  );
});

// 5. Kiểm tra Straight-lining: Chọn liên tiếp cùng 1 đáp án cho mọi câu hỏi
test('5. Phương Sai Đường Thẳng (Straight-lining): Phạt nặng bot/user chọn 1 cột từ đầu đến cuối', () => {
  const tMin = antiFraudService.calculateMinCompletionTime(sampleQuestions);
  const normalDuration = Math.ceil(tMin * 1.5);

  // Chọn toàn bộ là '4' cho tất cả câu trắc nghiệm (bao gồm q1, q2, q3, q4, q5)
  // Để riêng kiểm tra straight-lining, giả lập 4 câu cùng 1 lựa chọn
  const straightLiningQuestions = [
    { id: 'sq1', type: 'LIKERT_SCALE', content: 'Câu 1' },
    { id: 'sq2', type: 'LIKERT_SCALE', content: 'Câu 2' },
    { id: 'sq3', type: 'LIKERT_SCALE', content: 'Câu 3' },
    { id: 'sq4', type: 'LIKERT_SCALE', content: 'Câu 4' }
  ];

  const straightAnswers = {
    sq1: '5',
    sq2: '5',
    sq3: '5',
    sq4: '5'
  };

  const result = antiFraudService.evaluateSubmission(straightLiningQuestions, straightAnswers, 60);

  assert(result.scoreDetails.varianceFactor <= 0.2, `varianceFactor phải <= 0.2 khi straight-lining, thực tế: ${result.scoreDetails.varianceFactor}`);
  assert(result.reasons.some(r => r.includes('Straight-lining') || r.includes('giống hệt nhau')), 'Phải cảnh báo Straight-lining');
  assert(result.qualityScore <= 0.2, 'qualityScore phải bị giảm mạnh');
  assert.strictEqual(result.isValid, false);
});

// 6. Kiểm tra câu trả lời tự luận rác (ngắn hoặc spam ký tự)
test('6. Kiểm duyệt văn bản tự luận rác (ngắn dưới 5 ký tự)', () => {
  const tMin = antiFraudService.calculateMinCompletionTime(sampleQuestions);
  const normalDuration = Math.ceil(tMin * 1.5);

  const shortTextAnswers = {
    q1: 'Tốt',
    q2: '4',
    q3: 'Cam kết',
    q4: '5',
    q5: '4',
    q6: 'ok' // Quá ngắn (< 5 ký tự)
  };

  const result = antiFraudService.evaluateSubmission(sampleQuestions, shortTextAnswers, normalDuration);

  assert(result.reasons.some(r => r.includes('tự luận quá ngắn')), 'Phải cảnh báo câu tự luận quá ngắn');
  assert(result.scoreDetails.varianceFactor <= 0.5, 'varianceFactor phải bị trừ 50%');
});

// 7. Kiểm tra bài làm hợp lệ từ người dùng thật (Valid Submission)
test('7. Bài làm hợp lệ từ người dùng đọc kỹ: Đạt qualityScore >= 0.8 và VALIDATED', () => {
  const tMin = antiFraudService.calculateMinCompletionTime(sampleQuestions);
  const honestDuration = Math.ceil(tMin * 1.4); // Người đọc kỹ, làm đàng hoàng

  const honestAnswers = {
    q1: 'Rất tốt',
    q2: '4',
    q3: 'Cam kết', // Đúng câu bẫy chú ý
    q4: '5',
    q5: '3',       // Không bị straight-lining
    q6: 'Hệ thống khảo sát cần bổ sung thêm tính năng thông báo qua Telegram khi có khảo sát mới.'
  };

  const result = antiFraudService.evaluateSubmission(sampleQuestions, honestAnswers, honestDuration);

  assert.strictEqual(result.isValid, true, 'Bài làm người thật đọc kỹ phải hợp lệ');
  assert.strictEqual(result.status, 'VALIDATED', 'Trạng thái phải là VALIDATED');
  assert(result.qualityScore >= config.ANTI_FRAUD.MIN_QUALITY_SCORE, `qualityScore (${result.qualityScore}) phải >= ${config.ANTI_FRAUD.MIN_QUALITY_SCORE}`);
  assert.strictEqual(result.scoreDetails.attentionScore, 1.0);
  assert.strictEqual(result.scoreDetails.varianceFactor, 1.0);
  assert.strictEqual(result.scoreDetails.speedRatio, 1.0);
  assert.strictEqual(result.reasons.length, 0, 'Không được có bất kỳ lý do cảnh báo nào');
});

console.log('---------------------------------------------------------------');
console.log(`🎉 TẦNG 1 KẾT THÚC: ${passedTests}/${totalTests} BÀI KIỂM THỬ THÀNH CÔNG (100% PASS)`);
console.log('===============================================================\n');

module.exports = { passedTests, totalTests };
