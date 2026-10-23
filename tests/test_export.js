/**
 * Bộ kiểm thử Tầng 3: Export Survey Data Unit & Route Test
 * Kiểm tra các tính năng xuất dữ liệu khảo sát (CSV & JSON) cho Creator & Admin
 */

const assert = require('node:assert');
const surveyController = require('../server/controllers/surveyController');
const db = require('../server/db/database');

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ TÍNH NĂNG XUẤT DỮ LIỆU (CSV & JSON EXPORT)');
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

// Lấy survey mẫu và users từ database đã seed
const sampleSurvey = db.prepare('SELECT * FROM surveys LIMIT 1').get();
const creatorUser = db.prepare('SELECT * FROM users WHERE id = ?').get(sampleSurvey.creator_id);
const otherCreator = { id: 'fake-other-creator-id', role: 'CREATOR' };
const respondentUser = db.prepare("SELECT * FROM users WHERE role = 'RESPONDENT' LIMIT 1").get();
const adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();

// Mock response object
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(content) {
      this.body = content;
      return this;
    }
  };
  return res;
}

// === TEST 1: Khảo sát không tồn tại ===
test('1. Báo lỗi 404 khi khảo sát không tồn tại', () => {
  const req = {
    params: { id: 'non-existent-survey-id' },
    query: { format: 'csv' },
    user: adminUser
  };
  const res = createMockRes();
  surveyController.exportSurveyData(req, res);

  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(res.body.success, false);
  assert.match(res.body.message, /không tồn tại/i);
});

// === TEST 2: Respondent bị chặn không cho xuất dữ liệu ===
test('2. Chặn quyền Respondent tải dữ liệu (403 Forbidden)', () => {
  const req = {
    params: { id: sampleSurvey.id },
    query: { format: 'csv' },
    user: respondentUser
  };
  const res = createMockRes();
  surveyController.exportSurveyData(req, res);

  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body.success, false);
});

// === TEST 3: Creator khác không có quyền xuất dữ liệu ===
test('3. Chặn Creator lạ không phải chủ sở hữu khảo sát (403 Forbidden)', () => {
  const req = {
    params: { id: sampleSurvey.id },
    query: { format: 'csv' },
    user: otherCreator
  };
  const res = createMockRes();
  surveyController.exportSurveyData(req, res);

  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body.success, false);
});

// === TEST 4: Creator sở hữu tải dữ liệu định dạng CSV chuẩn RFC 4180 có UTF-8 BOM ===
test('4. Xuất dữ liệu định dạng CSV có UTF-8 BOM và headers đầy đủ cho Creator', () => {
  const req = {
    params: { id: sampleSurvey.id },
    query: { format: 'csv' },
    user: creatorUser
  };
  const res = createMockRes();
  surveyController.exportSurveyData(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['Content-Type'], 'text/csv; charset=utf-8');
  assert.match(res.headers['Content-Disposition'], /attachment; filename="survey_.*\.csv"/);
  
  // Kiểm tra UTF-8 BOM ở đầu chuỗi (giúp Excel hiển thị chuẩn tiếng Việt)
  assert.ok(res.body.startsWith('\uFEFF'), 'Nội dung CSV phải bắt đầu bằng UTF-8 BOM');

  // Kiểm tra các cột tiêu đề
  assert.ok(res.body.includes('Mã Phản Hồi (Response ID)'));
  assert.ok(res.body.includes('Tên Người Trả Lời (Respondent Name)'));
  assert.ok(res.body.includes('Điểm Chất Lượng (%)'));
  assert.ok(res.body.includes('Thời Gian Làm Bài (Giây)'));
});

// === TEST 5: Xuất dữ liệu định dạng JSON chuẩn cho Admin ===
test('5. Xuất dữ liệu định dạng JSON cấu trúc hợp lệ cho Admin', () => {
  const req = {
    params: { id: sampleSurvey.id },
    query: { format: 'json' },
    user: adminUser
  };
  const res = createMockRes();
  surveyController.exportSurveyData(req, res);

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.match(res.headers['Content-Disposition'], /attachment; filename="survey_.*\.json"/);

  const parsed = JSON.parse(res.body);
  assert.ok(parsed.survey);
  assert.strictEqual(parsed.survey.id, sampleSurvey.id);
  assert.ok(Array.isArray(parsed.questions));
  assert.ok(Array.isArray(parsed.responses));
  assert.strictEqual(typeof parsed.totalValidatedResponses, 'number');
});

// === TEST 6: Kiểm tra thoát ký tự CSV đặc biệt (Dấu ngoặc kép, dấu phẩy, mảng) ===
test('6. Thoát ký tự CSV an toàn khi câu trả lời có dấu phẩy hoặc ngoặc kép', () => {
  // Tạo phản hồi mẫu với ký tự đặc biệt
  const testRespId = 'test-special-response-' + Date.now();
  const testRespUser = db.prepare("SELECT id, name, email FROM users WHERE role = 'RESPONDENT' LIMIT 1").get();
  const questions = db.prepare('SELECT id FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(sampleSurvey.id);
  
  if (questions.length > 0) {
    const complexAnswer = {};
    complexAnswer[questions[0].id] = 'Tôi thích, "Shopee" và Lazada';
    
    // Ghi tạm vào db
    db.prepare(`
      INSERT OR REPLACE INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at, duration_sec, quality_score, points_rewarded, answers_payload)
      VALUES (?, ?, ?, 'VALIDATED', datetime('now', '-10 minutes'), datetime('now'), 120, 0.95, 500, ?)
    `).run(testRespId, sampleSurvey.id, testRespUser.id, JSON.stringify(complexAnswer));

    const req = {
      params: { id: sampleSurvey.id },
      query: { format: 'csv' },
      user: creatorUser
    };
    const res = createMockRes();
    surveyController.exportSurveyData(req, res);

    assert.strictEqual(res.statusCode, 200);
    // Ký tự "Shopee" phải được chuyển thành ""Shopee"" theo RFC 4180
    assert.ok(res.body.includes('""Shopee""'), 'Dấu ngoặc kép trong CSV phải được nhân đôi');

    // Dọn dẹp bản ghi tạm
    db.prepare('DELETE FROM responses WHERE id = ?').run(testRespId);
  }
});

console.log('---------------------------------------------------------------');
console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI THÀNH CÔNG (100% PASS)`);
console.log('===============================================================');
