/**
 * Test Suite: Review & Edit Responses (Xem Lại & Sửa Câu Trả Lời Chuẩn Google / Microsoft Forms)
 */

const assert = require('node:assert');
const db = require('../server/db/database');
const surveyController = require('../server/controllers/surveyController');
const crypto = require('crypto');

console.log('===============================================================');
console.log('BẮT ĐẦU KIỂM THỬ: XEM LẠI VÀ CHỈNH SỬA CÂU TRẢ LỜI (REVIEW & EDIT)');
console.log('===============================================================');

async function runTests() {
  let creator = db.prepare("SELECT * FROM users WHERE email = 'creator@vibesurvey.com'").get();
  if (!creator) {
    db.prepare("INSERT INTO users (id, email, password_hash, name, role, credit_balance) VALUES ('test_creator_fixed', 'creator@vibesurvey.com', 'hash', 'Test Creator', 'CREATOR', 1000000)").run();
    creator = db.prepare("SELECT * FROM users WHERE email = 'creator@vibesurvey.com'").get();
  }
  let respondent = db.prepare("SELECT * FROM users WHERE email = 'user@vibesurvey.com'").get();
  if (!respondent) {
    db.prepare("INSERT INTO users (id, email, password_hash, name, role, point_balance) VALUES ('test_resp_fixed', 'user@vibesurvey.com', 'hash', 'Test Respondent', 'RESPONDENT', 50000)").run();
    respondent = db.prepare("SELECT * FROM users WHERE email = 'user@vibesurvey.com'").get();
  }

  assert.ok(creator, 'Creator phải tồn tại');
  assert.ok(respondent, 'Respondent phải tồn tại');

  // Đảm bảo respondent không còn response cũ của test survey
  const testSurveyId = 'test_review_edit_' + Date.now();
  const testNoEditSurveyId = 'test_no_edit_' + Date.now();

  try {
    // 1. Tạo Khảo Sát A có Cho Phép Sửa (allow_edit_response: 1) và Cho Phép Xem Lại (allow_view_response: 1)
    console.log('\n--- 1. Creator tạo khảo sát hỗ trợ Xem lại & Chỉnh sửa câu trả lời ---');
    db.prepare(`
      INSERT INTO surveys (
        id, creator_id, title, description, category, target_responses, cost_per_response, 
        reward_points_per_response, escrow_locked_balance, min_completion_time_sec, status,
        allow_edit_response, allow_view_response
      ) VALUES (?, ?, ?, ?, ?, 10, 1000, 800, 10000, 0, 'ACTIVE', 1, 1)
    `).run(testSurveyId, creator.id, 'Khảo sát Test Review & Edit', 'Mô tả test', 'Công nghệ');

    db.prepare(`
      INSERT INTO questions (id, survey_id, order_index, type, content, is_required, options_json)
      VALUES (?, ?, 1, 'SINGLE_CHOICE', 'Bạn thích ngôn ngữ nào?', 1, ?)
    `).run('q_test_1', testSurveyId, JSON.stringify(['JavaScript', 'Python', 'Go']));

    db.prepare(`
      INSERT INTO questions (id, survey_id, order_index, type, content, is_required)
      VALUES (?, ?, 2, 'SHORT_TEXT', 'Góp ý thêm của bạn?', 0)
    `).run('q_test_2', testSurveyId);

    const surveyRow = db.prepare('SELECT * FROM surveys WHERE id = ?').get(testSurveyId);
    assert.strictEqual(surveyRow.allow_edit_response, 1, 'Survey phải có allow_edit_response = 1');
    assert.strictEqual(surveyRow.allow_view_response, 1, 'Survey phải có allow_view_response = 1');
    console.log('  [PASS] 1. Khảo sát A được tạo thành công với allow_edit_response = 1 và allow_view_response = 1');

    // 2. Respondent nộp bài lần đầu (Nộp mới)
    console.log('\n--- 2. Respondent làm bài và nộp lần đầu ---');
    // Khởi tạo session IN_PROGRESS
    const initialResponseId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
      VALUES (?, ?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)
    `).run(initialResponseId, testSurveyId, respondent.id);

    const initialPointBalance = respondent.point_balance;

    const mockReqSubmit1 = {
      params: { id: testSurveyId },
      user: respondent,
      body: {
        answers: {
          q_test_1: 'JavaScript',
          q_test_2: 'Rất tuyệt vời'
        },
        duration_sec: 10,
        device_fingerprint: 'test_device_fp'
      }
    };

    let submit1Result = null;
    const mockResSubmit1 = {
      status(code) { this.statusCode = code; return this; },
      json(data) { submit1Result = data; return this; }
    };

    surveyController.submitSurvey(mockReqSubmit1, mockResSubmit1);
    assert.ok(submit1Result, 'Phải có kết quả submit lần 1');
    assert.strictEqual(submit1Result.success, true, 'Submit lần 1 phải thành công');
    assert.strictEqual(submit1Result.pointsEarned, 800, 'Respondent phải nhận được 800 điểm');

    const updatedRespUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(respondent.id);
    assert.strictEqual(updatedRespUser.point_balance, initialPointBalance + 800, 'Số dư điểm phải tăng thêm đúng 800 Point');

    const savedResp1 = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(testSurveyId, respondent.id);
    assert.strictEqual(savedResp1.status, 'VALIDATED', 'Response status phải là VALIDATED');
    assert.strictEqual(savedResp1.edited_at, null, 'edited_at lần đầu phải là null');
    const parsedAns1 = JSON.parse(savedResp1.answers_payload);
    assert.strictEqual(parsedAns1.q_test_1, 'JavaScript', 'Câu 1 ban đầu phải là JavaScript');
    console.log('  [PASS] 2. Respondent nộp bài lần đầu thành công, nhận thưởng và ghi nhận đáp án ban đầu');

    // 3. Respondent xem lại bài làm (Review Response)
    console.log('\n--- 3. Respondent mở xem lại bài làm ---');
    const mockReqGet = {
      params: { id: testSurveyId },
      user: respondent
    };
    let getResult = null;
    const mockResGet = {
      status(code) { this.statusCode = code; return this; },
      json(data) { getResult = data; return this; }
    };

    surveyController.getSurvey(mockReqGet, mockResGet);
    assert.ok(getResult.success, 'getSurvey phải thành công');
    assert.ok(getResult.userResponse, 'Phải trả về userResponse cho respondent');
    assert.strictEqual(getResult.userResponse.answers.q_test_1, 'JavaScript', 'userResponse.answers phải chứa đúng đáp án đã chọn');
    assert.strictEqual(getResult.survey.allow_edit_response, 1, 'Survey phải có allow_edit_response = 1');
    assert.strictEqual(getResult.survey.allow_view_response, 1, 'Survey phải có allow_view_response = 1');
    console.log('  [PASS] 3. Respondent xem lại bài làm, API trả về đúng dữ liệu userResponse và cấu hình xem/sửa');

    // 4. Respondent kích hoạt chế độ chỉnh sửa (startSession cho phép sửa)
    console.log('\n--- 4. Respondent bắt đầu phiên chỉnh sửa câu trả lời ---');
    const mockReqStartEdit = {
      params: { id: testSurveyId },
      user: respondent
    };
    let startEditResult = null;
    const mockResStartEdit = {
      status(code) { this.statusCode = code; return this; },
      json(data) { startEditResult = data; return this; }
    };

    surveyController.startSession(mockReqStartEdit, mockResStartEdit);
    assert.ok(startEditResult.success, 'startSession phải thành công');
    assert.strictEqual(startEditResult.is_editing, true, 'is_editing phải là true');
    assert.strictEqual(startEditResult.existingAnswers.q_test_1, 'JavaScript', 'existingAnswers phải khớp với đáp án cũ');
    console.log('  [PASS] 4. startSession mở lại phiên thành công ở chế độ is_editing = true với đáp án cũ đã điền sẵn');

    // 5. Respondent nộp lại câu trả lời đã chỉnh sửa (Sửa từ JavaScript sang Python)
    console.log('\n--- 5. Respondent nộp câu trả lời mới đã chỉnh sửa ---');
    const pointBeforeEdit = (db.prepare('SELECT point_balance FROM users WHERE id = ?').get(respondent.id)).point_balance;

    const mockReqSubmitEdit = {
      params: { id: testSurveyId },
      user: respondent,
      body: {
        answers: {
          q_test_1: 'Python',
          q_test_2: 'Tôi đã đổi ý, chọn Python vì có AI!'
        },
        duration_sec: 5,
        device_fingerprint: 'test_device_fp'
      }
    };

    let submitEditResult = null;
    const mockResSubmitEdit = {
      status(code) { this.statusCode = code; return this; },
      json(data) { submitEditResult = data; return this; }
    };

    surveyController.submitSurvey(mockReqSubmitEdit, mockResSubmitEdit);
    assert.ok(submitEditResult, 'Phải có kết quả khi nộp bản sửa');
    assert.strictEqual(submitEditResult.success, true, 'Cập nhật phải thành công');
    assert.strictEqual(submitEditResult.is_updated, true, 'is_updated phải là true');

    const pointAfterEdit = (db.prepare('SELECT point_balance FROM users WHERE id = ?').get(respondent.id)).point_balance;
    assert.strictEqual(pointAfterEdit, pointBeforeEdit, 'Điểm thưởng KHÔNG ĐƯỢC tăng thêm khi chỉnh sửa bài làm');

    const savedRespAfterEdit = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(testSurveyId, respondent.id);
    assert.ok(savedRespAfterEdit.edited_at !== null, 'edited_at phải được ghi nhận');
    const parsedAnsAfterEdit = JSON.parse(savedRespAfterEdit.answers_payload);
    assert.strictEqual(parsedAnsAfterEdit.q_test_1, 'Python', 'Đáp án mới phải được cập nhật thành Python');
    assert.strictEqual(parsedAnsAfterEdit.q_test_2, 'Tôi đã đổi ý, chọn Python vì có AI!', 'Nội dung góp ý mới phải được lưu chính xác');
    console.log('  [PASS] 5. Câu trả lời cập nhật thành công, edited_at được lưu, không phát sinh trả thưởng trùng lặp');

    // 6. Kiểm tra Khảo Sát B: KHÔNG cho phép sửa (allow_edit_response = 0)
    console.log('\n--- 6. Khảo sát B không cho phép sửa (allow_edit_response = 0) ---');
    db.prepare(`
      INSERT INTO surveys (
        id, creator_id, title, description, category, target_responses, cost_per_response, 
        reward_points_per_response, escrow_locked_balance, min_completion_time_sec, status,
        allow_edit_response, allow_view_response
      ) VALUES (?, ?, ?, ?, ?, 10, 1000, 800, 10000, 0, 'ACTIVE', 0, 1)
    `).run(testNoEditSurveyId, creator.id, 'Khảo sát No Edit', 'Test no edit', 'Kinh tế');

    db.prepare(`
      INSERT INTO questions (id, survey_id, order_index, type, content, is_required)
      VALUES (?, ?, 1, 'SHORT_TEXT', 'Họ tên bạn?', 1)
    `).run('q_no_edit_1', testNoEditSurveyId);

    // Tạo response đã VALIDATED
    db.prepare(`
      INSERT INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at, answers_payload)
      VALUES (?, ?, ?, 'VALIDATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `).run(crypto.randomUUID(), testNoEditSurveyId, respondent.id, JSON.stringify({ q_no_edit_1: 'Nguyễn Văn A' }));

    // Thử gọi startSession -> phải bị chặn 400
    let startBlocked = null;
    surveyController.startSession(
      { params: { id: testNoEditSurveyId }, user: respondent },
      {
        status(code) { this.statusCode = code; return this; },
        json(data) { startBlocked = { code: this.statusCode, data }; return this; }
      }
    );
    assert.strictEqual(startBlocked.code, 400, 'Phải trả về mã lỗi 400');
    assert.ok(startBlocked.data.message.includes('hoàn thành khảo sát'), 'Thông báo phải nêu rõ đã hoàn thành');

    // Thử gọi submitSurvey -> phải bị từ chối
    let submitBlocked = null;
    surveyController.submitSurvey(
      { params: { id: testNoEditSurveyId }, user: respondent, body: { answers: { q_no_edit_1: 'Tên Mới' } } },
      {
        status(code) { this.statusCode = code; return this; },
        json(data) { submitBlocked = { code: this.statusCode, data }; return this; }
      }
    );
    assert.strictEqual(submitBlocked.code, 400, 'submitSurvey phải trả về mã lỗi 400');
    assert.ok(submitBlocked.data.message.includes('không cho phép chỉnh sửa'), 'Thông báo phải nêu rõ không cho phép chỉnh sửa');
    console.log('  [PASS] 6. Khảo sát không cho phép sửa chặn đứng thành công nỗ lực startSession và submit lại');

    console.log('\n===============================================================');
    console.log('TẤT CẢ 6/6 BÀI TEST XEM LẠI & SỬA CÂU TRẢ LỜI ĐÃ PASS 100%!');
    console.log('===============================================================');
  } finally {
    // Dọn dẹp dữ liệu test
    db.prepare('DELETE FROM responses WHERE survey_id IN (?, ?)').run(testSurveyId, testNoEditSurveyId);
    db.prepare('DELETE FROM questions WHERE survey_id IN (?, ?)').run(testSurveyId, testNoEditSurveyId);
    db.prepare('DELETE FROM surveys WHERE id IN (?, ?)').run(testSurveyId, testNoEditSurveyId);
  }
}

runTests().catch(err => {
  console.error('\n❌ BÀI TEST THẤT BẠI:', err);
  process.exit(1);
});
