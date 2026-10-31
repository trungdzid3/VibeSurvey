const assert = require('assert');
const fs = require('fs');

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: MULTI-QUESTION SECTION RUNNER & RESTRICTIONS');
console.log('   Chuẩn Google Forms & Microsoft Forms Engine');
console.log('===============================================================');

const appJs = fs.readFileSync('public/app.js', 'utf8');

// 1. Kiểm tra sự hiện diện của các cấu trúc cốt lõi trong app.js
assert(appJs.includes('buildSurveySections('), 'Phải có buildSurveySections');
assert(appJs.includes('validateCurrentSection('), 'Phải có validateCurrentSection');
assert(appJs.includes('nextSection('), 'Phải có nextSection');
assert(appJs.includes('prevSection('), 'Phải có prevSection');
assert(appJs.includes('RestrictionEngine'), 'Phải có RestrictionEngine');
assert(appJs.includes('validateQuestionInput('), 'Phải có validateQuestionInput');
console.log('✅ [PASS] 1. Cấu trúc Section Runner & Restriction Engine đã hiện diện đầy đủ trong app.js');

// 2. Tạo môi trường mock để kiểm thử logic nghiệp vụ
// Trích xuất RestrictionEngine từ app.js
const restrictionEngineMatch = appJs.match(/window\.RestrictionEngine\s*=\s*\{([\s\S]*?)\n\};/);
assert(restrictionEngineMatch, 'Phải trích xuất được RestrictionEngine');
const RestrictionEngine = eval('({' + restrictionEngineMatch[1] + '})');

// Trích xuất buildSurveySections từ app.js
const buildSectionsMatch = appJs.match(/buildSurveySections\(questions[\s\S]*?\) \{([\s\S]*?)\n\s*\},/);
assert(buildSectionsMatch, 'Phải trích xuất được buildSurveySections');
const buildSurveySections = new Function('questions', 'surveyMeta', 'this.state = this.state || {}; ' + buildSectionsMatch[1]);

// Trích xuất validateQuestionInput
const vStart = appJs.indexOf('validateQuestionInput(q, val) {');
const vEnd = appJs.indexOf('handleSurveyInputRealtime(qId, inputEl) {', vStart);
const vBody = appJs.substring(vStart + 'validateQuestionInput(q, val) {'.length, vEnd).replace(/\s*\},?\s*$/, '');
const mockContext = { RestrictionEngine };
const validateQuestionInput = new Function('q', 'val', vBody).bind(mockContext);

// --- KIỂM THỬ 1: RESTRICTION ENGINE & VALIDATION FORMATS ---
console.log('\n--- KIỂM THỬ ĐỊNH DẠNG RÀNG BUỘC (RESTRICTION VALIDATION) ---');

// Email HUST
const emailQ = {
  id: 'q_email',
  type: 'SHORT_TEXT',
  validation: { type: 'EMAIL', rule: 'EMAIL' }
};
const emailMeta = RestrictionEngine.getMeta(emailQ.validation);
assert.strictEqual(emailMeta.validate('linh.sv@hust.edu.vn').valid, true, 'Email hợp lệ phải pass');
assert.strictEqual(emailMeta.validate('linh.sv@hust').valid, false);
assert.strictEqual(emailMeta.validate('khong-phai-email').valid, false);
console.log('✅ [PASS] Email restriction: Bắt đúng định dạng email, trả thông báo lỗi nội dòng chuẩn.');

// Số điện thoại (Là số)
const numberQ = {
  id: 'q_phone',
  type: 'SHORT_TEXT',
  validation: { type: 'NUMBER', rule: 'IS_NUMBER' }
};
const numberMeta = RestrictionEngine.getMeta(numberQ.validation);
assert.strictEqual(numberMeta.validate('0987654321').valid, true, 'Số nguyên hợp lệ phải pass');
assert.strictEqual(numberMeta.validate('098abc321').valid, false);
console.log('✅ [PASS] Number restriction (Là số): Bắt đúng định dạng số.');

// Mã số sinh viên (Trong khoảng 20000000 ~ 20270000)
const mssvQ = {
  id: 'q_mssv',
  type: 'SHORT_TEXT',
  validation: { type: 'NUMBER', rule: 'BETWEEN', min: 20000000, max: 20270000 }
};
const mssvMeta = RestrictionEngine.getMeta(mssvQ.validation);
assert.strictEqual(mssvMeta.validate('20210001').valid, true, 'MSSV trong khoảng 20000000-20270000 phải pass');
assert.strictEqual(mssvMeta.validate('19999999').valid, false);
assert.strictEqual(mssvMeta.validate('20280000').valid, false);
assert.strictEqual(mssvMeta.validate('chữ_khong_phai_so').valid, false);
console.log('✅ [PASS] Number range (Trong khoảng min ~ max): Bắt chuẩn khoảng giá trị theo ảnh thực tế 3.');

// Độ dài ký tự (Tối đa 5)
const lenQ = {
  id: 'q_len',
  type: 'SHORT_TEXT',
  validation: { type: 'LENGTH', rule: 'MAX_LENGTH', max: 5 }
};
const lenMeta = RestrictionEngine.getMeta(lenQ.validation);
assert.strictEqual(lenMeta.validate('12345').valid, true);
assert.strictEqual(lenMeta.validate('123456').valid, false);
console.log('✅ [PASS] Length restriction (Độ dài tối đa): Hoạt động chính xác.');

// URL
const urlQ = {
  id: 'q_url',
  type: 'SHORT_TEXT',
  validation: { type: 'URL', rule: 'URL' }
};
const urlMeta = RestrictionEngine.getMeta(urlQ.validation);
assert.strictEqual(urlMeta.validate('https://hust.edu.vn').valid, true);
assert.strictEqual(urlMeta.validate('hust_edu_vn').valid, false);
console.log('✅ [PASS] URL restriction: Bắt chuẩn giao thức http/https.');


// --- KIỂM THỬ 2: SECTION BUILDER (CHUẨN GOOGLE FORMS & MICROSOFT FORMS) ---
console.log('\n--- KIỂM THỬ SECTION BUILDER (GOM CÂU HỎI THEO PHÂN ĐOẠN) ---');

const sampleQuestions = [
  // Section 1 (Implicit / Mặc định từ đầu khảo sát)
  { id: 'q1', type: 'SINGLE_CHOICE', content: 'Bạn là ai?' },
  { id: 'q2', type: 'SHORT_TEXT', content: 'Email HUST', validation: { type: 'EMAIL', rule: 'EMAIL' }, is_required: 1 },
  // Section 2 (Break)
  { id: 'sec2_hdr', type: 'SECTION_HEADER', content: 'Thông tin cá nhân nâng cao', rows: ['Vui lòng điền chi tiết'] },
  { id: 'q3', type: 'SHORT_TEXT', content: 'Mã số sinh viên', is_required: 1 },
  { id: 'q4', type: 'SHORT_TEXT', content: 'Số điện thoại', is_required: 0 },
  // Section 3 (Break)
  { id: 'sec3_hdr', type: 'SECTION_HEADER', content: 'Khảo sát ý kiến', rows: [] },
  { id: 'q5', type: 'MULTIPLE_CHOICE', content: 'Đánh giá môn học' }
];

const builtSections = buildSurveySections.call({ state: { activeSession: { survey: { title: 'Khảo sát HUST' } } } }, sampleQuestions, { title: 'Khảo sát HUST' });

assert.strictEqual(builtSections.length, 3, 'Phải tạo thành 3 Section');
assert.strictEqual(builtSections[0].questions.length, 2, 'Section 1 phải chứa 2 câu hỏi (q1, q2)');
assert.strictEqual(builtSections[1].questions.length, 2, 'Section 2 phải chứa 2 câu hỏi (q3, q4) như Ảnh 4 thực tế');
assert.strictEqual(builtSections[1].title, 'Thông tin cá nhân nâng cao');
assert.strictEqual(builtSections[1].description, 'Vui lòng điền chi tiết');
assert.strictEqual(builtSections[2].questions.length, 1, 'Section 3 phải chứa 1 câu hỏi (q5)');
console.log('✅ [PASS] Section Builder gom câu hỏi chính xác theo từng Phân đoạn, không coi SECTION_HEADER là câu hỏi đơn lẻ.');


// --- KIỂM THỬ 3: SECTION VALIDATION (CHẶN NỘP / TIẾP TỤC KHI CHƯA HỢP LỆ) ---
console.log('\n--- KIỂM THỬ SECTION VALIDATION ---');

const secStart = appJs.indexOf('validateCurrentSection(curSection) {');
const secEnd = appJs.indexOf('resolveSectionTarget(rawTarget, sections) {', secStart);
let secBody = appJs.substring(secStart + 'validateCurrentSection(curSection) {'.length, secEnd).trim();
if (secBody.endsWith(',')) secBody = secBody.slice(0, -1).trim();
if (secBody.endsWith('}')) secBody = secBody.slice(0, -1).trim();

// Mock DOM elements cho môi trường Node test
global.document = {
  querySelectorAll: () => [],
  getElementById: (id) => null
};

global.window = { RestrictionEngine };

const mockSession = {
  answers: {
    'q_email': 'linh.sv@hust.edu.vn',
  }
};
const mockAppForSec = {
  state: { activeSession: mockSession },
  RestrictionEngine,
  _saveActiveSessionToStorage: () => {},
  validateQuestionInput,
  escapeHtml: (s) => s,
  showToast(msg) { this.lastToast = msg; }
};
const validateCurrentSection = new Function('curSection', secBody).bind(mockAppForSec);

const testSection = {
  id: 'test_sec',
  title: 'Phần 1',
  questions: [
    { id: 'q_email', type: 'SHORT_TEXT', is_required: 1, validation: { type: 'EMAIL', rule: 'EMAIL' } },
    { id: 'q_req', type: 'SHORT_TEXT', is_required: 1, content: 'Bắt buộc điền' }
  ]
};

// Chưa điền q_req -> validateCurrentSection phải trả về false
const isValid1 = validateCurrentSection(testSection);
assert.strictEqual(isValid1, false, 'Phải chặn khi có câu hỏi bắt buộc chưa điền');
console.log('✅ [PASS] Chặn chuyển phần khi còn câu hỏi bắt buộc chưa hoàn thành.');

// Điền q_req nhưng email sai định dạng
mockSession.answers['q_req'] = 'Đã điền';
mockSession.answers['q_email'] = 'sai-dinh-dang';
const isValid2 = validateCurrentSection(testSection);
assert.strictEqual(isValid2, false, 'Phải chặn khi có câu hỏi sai định dạng ràng buộc');
console.log('✅ [PASS] Chặn chuyển phần khi có câu hỏi vi phạm ràng buộc định dạng.');

// Điền đúng cả 2
mockSession.answers['q_email'] = 'chuan@hust.edu.vn';
const isValid3 = validateCurrentSection(testSection);
assert.strictEqual(isValid3, true, 'Hợp lệ cả 2 thì phải cho phép tiếp tục');
console.log('✅ [PASS] Cho phép chuyển tiếp sang phân đoạn kế tiếp khi toàn bộ câu hỏi đều hợp lệ.');

console.log('\n===============================================================');
console.log('🏆 KẾT QUẢ: TOÀN BỘ 100% CÁC BÀI TEST SECTION RUNNER & RESTRICTIONS ĐÃ ĐẠT!');
console.log('===============================================================');
