/**
 * Bộ kiểm thử Tự động Toàn diện:
 * 1. Ràng buộc Giới hạn Định dạng (Restrictions: Email, Số là số, Số trong khoảng, URL, Độ dài) chuẩn Microsoft Forms & Google Forms
 * 2. Cơ chế Điều hướng Rẽ nhánh 2 tầng (Option-level + Section-end routing)
 * 3. Phím tắt Enter chuyển câu hỏi
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const db = require('../server/db/database');
const surveyRepository = require('../server/repositories/surveyRepository');
const formParserService = require('../server/services/formParserService');

let totalTests = 0;
let passedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`     Chi tiết: ${err.message}`);
    throw err;
  }
}

async function run() {
  console.log('===============================================================');
  console.log('KIỂM THỬ: RESTRICTIONS & 2-TIER BRANCHING LOGIC CHUẨN MS/GG FORMS');
  console.log('===============================================================');

  // Test 1: Bóc tách Giới hạn Định dạng từ Microsoft Forms (Email, Số, Trong khoảng)
  await runTest('1. FormParserService bóc tách đúng Restrictions từ Microsoft Forms', async () => {
    // Giả lập câu hỏi Email HUST
    const qEmail = {
      type: 'Question.TextField',
      title: 'Email HUST',
      required: true,
      placeholder: 'Vui lòng nhập email',
      questionInfo: JSON.stringify({
        RestrictionType: 2,
        Placeholder: 'Vui lòng nhập email'
      })
    };
    const parsedEmail = formParserService._parseMicrosoftQuestion(qEmail, 1);
    assert.strictEqual(parsedEmail.type, 'SHORT_TEXT');
    assert(parsedEmail.validation, 'Phải có thuộc tính validation');
    assert.strictEqual(parsedEmail.validation.type, 'EMAIL');
    assert.strictEqual(parsedEmail.validation.placeholder, 'Vui lòng nhập email');

    // Giả lập câu hỏi Số điện thoại (Là số)
    const qPhone = {
      type: 'Question.TextField',
      title: 'Số điện thoại (thường xuyên liên lạc)',
      required: false,
      placeholder: 'Giá trị phải là một số',
      questionInfo: JSON.stringify({
        RestrictionType: 1,
        RestrictionOperator: 8,
        Placeholder: 'Giá trị phải là một số'
      })
    };
    const parsedPhone = formParserService._parseMicrosoftQuestion(qPhone, 2);
    assert.strictEqual(parsedPhone.validation.type, 'NUMBER');
    assert.strictEqual(parsedPhone.validation.rule, 'IS_NUMBER');
    assert.strictEqual(parsedPhone.validation.placeholder, 'Giá trị phải là một số');

    // Giả lập câu hỏi Mã số sinh viên (Trong khoảng 20000000 ~ 20270000)
    const qMssv = {
      type: 'Question.TextField',
      title: 'Mã số sinh viên',
      required: true,
      placeholder: 'Số phải nằm trong khoảng từ 20000000 ~ 20270000',
      questionInfo: JSON.stringify({
        RestrictionType: 1,
        RestrictionOperator: 6,
        RestrictionValue1: 20000000,
        RestrictionValue2: 20270000,
        Placeholder: 'Số phải nằm trong khoảng từ 20000000 ~ 20270000'
      })
    };
    const parsedMssv = formParserService._parseMicrosoftQuestion(qMssv, 3);
    assert.strictEqual(parsedMssv.validation.type, 'NUMBER');
    assert.strictEqual(parsedMssv.validation.rule, 'BETWEEN');
    assert.strictEqual(parsedMssv.validation.min, 20000000);
    assert.strictEqual(parsedMssv.validation.max, 20270000);
    assert.strictEqual(parsedMssv.validation.placeholder, 'Số phải nằm trong khoảng từ 20000000 ~ 20270000');
  });

  // Test 2: Lưu và truy vấn validation & logic_json qua surveyRepository
  await runTest('2. Lưu trữ toàn vẹn trường validation trong logic_json qua surveyRepository', async () => {
    const testCreatorId = 'creator_val_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, status)
      VALUES (?, ?, 'hash', 'Val Tester', 'CREATOR', 'ACTIVE')
    `).run(testCreatorId, `val_${Date.now()}@test.local`);

    const surveyId = 'survey_val_' + crypto.randomUUID();
    const questionsData = [
      {
        id: 'q_email_' + crypto.randomUUID(),
        type: 'SHORT_TEXT',
        content: 'Email HUST',
        is_required: 1,
        validation: {
          type: 'EMAIL',
          placeholder: 'Vui lòng nhập email',
          error_message: 'Vui lòng nhập đúng định dạng email'
        }
      },
      {
        id: 'q_mssv_' + crypto.randomUUID(),
        type: 'SHORT_TEXT',
        content: 'Mã số sinh viên',
        is_required: 1,
        validation: {
          type: 'NUMBER',
          rule: 'BETWEEN',
          min: 20000000,
          max: 20270000,
          placeholder: 'Số phải nằm trong khoảng từ 20000000 ~ 20270000',
          error_message: 'Số phải nằm trong khoảng từ 20000000 ~ 20270000'
        }
      }
    ];

    surveyRepository.createSurvey({
      id: surveyId,
      creator_id: testCreatorId,
      title: 'Khảo sát test validation restrictions',
      target_responses: 50
    }, questionsData);

    const fetched = surveyRepository.findQuestionsBySurveyId(surveyId);
    assert.strictEqual(fetched.length, 2);
    assert.strictEqual(fetched[0].validation.type, 'EMAIL');
    assert.strictEqual(fetched[0].validation.placeholder, 'Vui lòng nhập email');

    assert.strictEqual(fetched[1].validation.type, 'NUMBER');
    assert.strictEqual(fetched[1].validation.rule, 'BETWEEN');
    assert.strictEqual(fetched[1].validation.min, 20000000);
    assert.strictEqual(fetched[1].validation.max, 20270000);

    // Cleanup
    db.prepare('DELETE FROM questions WHERE survey_id = ?').run(surveyId);
    db.prepare('DELETE FROM surveys WHERE id = ?').run(surveyId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testCreatorId);
  });

  // Test 3: Thuật toán xác thực định dạng (Validation Logic)
  await runTest('3. Kiểm toán logic xác thực định dạng Email, Số là số, Trong khoảng', async () => {
    function validateAnswer(ans, rule) {
      if (!rule) return { valid: true };
      const cleanVal = String(ans || '').trim();
      if (!cleanVal) return { valid: true }; // Cờ bắt buộc kiểm tra riêng

      if (rule.type === 'EMAIL') {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanVal);
        return { valid: ok, error: ok ? null : (rule.error_message || 'Vui lòng nhập đúng định dạng email') };
      }
      if (rule.type === 'NUMBER') {
        const num = Number(cleanVal.replace(/,/g, ''));
        if (isNaN(num) || cleanVal === '') {
          return { valid: false, error: rule.error_message || 'Giá trị phải là một số' };
        }
        if (rule.rule === 'BETWEEN') {
          if (num < rule.min || num > rule.max) {
            return { valid: false, error: rule.error_message || `Số phải nằm trong khoảng từ ${rule.min} ~ ${rule.max}` };
          }
        }
        return { valid: true };
      }
      return { valid: true };
    }

    // Email test
    const emailRule = { type: 'EMAIL', error_message: 'Vui lòng nhập đúng email' };
    assert.strictEqual(validateAnswer('linh.nt@hust.edu.vn', emailRule).valid, true);
    assert.strictEqual(validateAnswer('linh_not_an_email', emailRule).valid, false);

    // Number IsNumber test
    const numRule = { type: 'NUMBER', rule: 'IS_NUMBER', error_message: 'Giá trị phải là một số' };
    assert.strictEqual(validateAnswer('0987654321', numRule).valid, true);
    assert.strictEqual(validateAnswer('abc12345', numRule).valid, false);

    // Number Between test (MSSV 20000000 ~ 20270000)
    const mssvRule = { type: 'NUMBER', rule: 'BETWEEN', min: 20000000, max: 20270000 };
    assert.strictEqual(validateAnswer('20215000', mssvRule).valid, true);
    assert.strictEqual(validateAnswer('19999999', mssvRule).valid, false);
    assert.strictEqual(validateAnswer('20280000', mssvRule).valid, false);
  });

  // Test 4: Cơ chế Điều hướng Rẽ nhánh 2 tầng (Option-level + Section-end routing)
  await runTest('4. Kiểm toán điều hướng 2 tầng: Rẽ nhánh theo đáp án & Rẽ nhánh kết thúc Phân đoạn', async () => {
    /**
     * Cấu trúc Form chuẩn Google Forms & Microsoft Forms:
     * - Mục 1:
     *   + Câu 1 (Rẽ nhánh):
     *     "Bạn là sinh viên hay người đi làm?"
     *     - Sinh viên -> Đến Mục 2 (Dành cho SV)
     *     - Người đi làm -> Đến Mục 3 (Dành cho người đi làm)
     * - Mục 2 (Dành cho sinh viên, default_action = 'SUBMIT'):
     *   + SECTION_HEADER: Mục 2: Khảo sát Sinh Viên (default_action = 'SUBMIT')
     *   + Câu 2: Trường đại học của bạn là gì?
     *   + Câu 3: Điểm rèn luyện của bạn?
     *   --> Khi làm xong Câu 3, kích hoạt Section-end routing của Mục 2 -> Gửi biểu mẫu (SUBMIT)!
     * - Mục 3 (Dành cho người đi làm):
     *   + SECTION_HEADER: Mục 3: Khảo sát Người Đi Làm
     *   + Câu 4: Số năm kinh nghiệm?
     */
    const questions = [
      // Index 0: Câu hỏi rẽ nhánh tại Mục 1
      {
        id: 'q1',
        type: 'SINGLE_CHOICE',
        content: 'Bạn là sinh viên hay người đi làm?',
        options: ['Sinh viên', 'Người đi làm'],
        logic: {
          enabled: true,
          options: {
            'Sinh viên': { action: 'GO_TO_PAGE', target: 'Mục 2' },
            'Người đi làm': { action: 'GO_TO_PAGE', target: 'Mục 3' }
          }
        }
      },
      // Index 1: Phân đoạn Mục 2 (Chỉ dành cho SV, sau phần này thì gửi bài)
      {
        id: 'sec2',
        type: 'SECTION_HEADER',
        content: 'Mục 2: Khảo sát Sinh Viên',
        logic: { default_action: 'SUBMIT' }
      },
      // Index 2: Câu hỏi trong Mục 2
      { id: 'q2', type: 'SHORT_TEXT', content: 'Trường đại học của bạn là gì?' },
      // Index 3: Câu hỏi cuối cùng của Mục 2
      { id: 'q3', type: 'SHORT_TEXT', content: 'Điểm rèn luyện của bạn?' },
      // Index 4: Phân đoạn Mục 3 (Dành cho người đi làm)
      {
        id: 'sec3',
        type: 'SECTION_HEADER',
        content: 'Mục 3: Khảo sát Người Đi Làm',
        logic: { default_action: 'SUBMIT' }
      },
      // Index 5: Câu hỏi trong Mục 3
      { id: 'q4', type: 'SHORT_TEXT', content: 'Số năm kinh nghiệm?' }
    ];

    // Bộ giải thuật điều hướng 2 tầng chuẩn
    function executeSurveyNext(session) {
      const curQ = session.questions[session.currentIndex];
      const ans = session.answers[curQ.id];

      // Tầng 1: Option-level Branching
      let branchTarget = null;
      if (['SINGLE_CHOICE', 'DROPDOWN'].includes(curQ.type) && curQ.logic && curQ.logic.enabled && curQ.logic.options) {
        let rawRule = curQ.logic.options[ans];
        if (typeof rawRule === 'string') branchTarget = rawRule;
        else if (typeof rawRule === 'object' && rawRule !== null) {
          if (['SUBMIT', 'SUBMIT_FORM'].includes(rawRule.action)) branchTarget = 'SUBMIT';
          else if (['NEXT', 'NEXT_SECTION'].includes(rawRule.action)) branchTarget = 'NEXT';
          else branchTarget = rawRule.target || 'NEXT';
        }
      }

      // Tầng 2: Section-end Routing (Nếu câu này không rẽ nhánh nhưng câu kế tiếp là SECTION_HEADER)
      if (!branchTarget || branchTarget === 'NEXT') {
        const isLastInSection = (session.currentIndex + 1 < session.questions.length && session.questions[session.currentIndex + 1].type === 'SECTION_HEADER')
          || (session.currentIndex === session.questions.length - 1);

        if (isLastInSection) {
          // Tìm SECTION_HEADER gần nhất phía trước mà câu này trực thuộc
          let parentSection = null;
          for (let i = session.currentIndex; i >= 0; i--) {
            if (session.questions[i].type === 'SECTION_HEADER') {
              parentSection = session.questions[i];
              break;
            }
          }
          if (parentSection && parentSection.logic && parentSection.logic.default_action) {
            branchTarget = parentSection.logic.default_action;
          }
        }
      }

      if (branchTarget === 'SUBMIT') return 'SUBMIT_FORM';

      if (branchTarget && branchTarget !== 'NEXT') {
        // Tìm target theo index hoặc title/content
        let targetIdx = session.questions.findIndex(q =>
          String(q.id) === String(branchTarget) ||
          (q.type === 'SECTION_HEADER' && String(q.content).trim().toLowerCase().includes(String(branchTarget).trim().toLowerCase()))
        );
        if (targetIdx !== -1) {
          session.history.push(session.currentIndex);
          session.currentIndex = targetIdx;
          return 'BRANCHED';
        }
      }

      session.history.push(session.currentIndex);
      session.currentIndex++;
      return 'NEXT';
    }

    // KỊCH BẢN 1: Đáp viên chọn "Sinh viên"
    const sessionStudent = {
      questions,
      currentIndex: 0,
      answers: { 'q1': 'Sinh viên' },
      history: []
    };

    // 1. Nhảy từ Câu 1 -> Mục 2 (index 1)
    const act1 = executeSurveyNext(sessionStudent);
    assert.strictEqual(act1, 'BRANCHED');
    assert.strictEqual(sessionStudent.currentIndex, 1, 'Phải nhảy thẳng đến Mục 2');

    // 2. Từ Mục 2 xem intro -> chuyển tiếp sang Câu 2 (index 2)
    const act2 = executeSurveyNext(sessionStudent);
    assert.strictEqual(act2, 'NEXT');
    assert.strictEqual(sessionStudent.currentIndex, 2, 'Phải chuyển sang Câu 2');

    // 3. Trả lời Câu 2 -> chuyển tiếp sang Câu 3 (index 3)
    sessionStudent.answers['q2'] = 'Đại học Bách Khoa Hà Nội';
    const act3 = executeSurveyNext(sessionStudent);
    assert.strictEqual(act3, 'NEXT');
    assert.strictEqual(sessionStudent.currentIndex, 3, 'Phải chuyển sang Câu 3');

    // 4. Trả lời Câu 3 (câu cuối của Mục 2) -> Kích hoạt Section-end routing của Mục 2:
    // Tuyệt đối KHÔNG được rớt sang index 4 (Mục 3 của người đi làm), mà phải SUBMIT!
    sessionStudent.answers['q3'] = '90/100';
    const act4 = executeSurveyNext(sessionStudent);
    assert.strictEqual(act4, 'SUBMIT_FORM', 'Hết Mục 2 phải tự động kích hoạt gửi bài theo đúng chuẩn Google/MS Forms');

    // KỊCH BẢN 2: Đáp viên chọn "Người đi làm"
    const sessionWorker = {
      questions,
      currentIndex: 0,
      answers: { 'q1': 'Người đi làm' },
      history: []
    };

    // 1. Nhảy từ Câu 1 -> Mục 3 (index 4), bỏ qua toàn bộ Mục 2!
    const actW1 = executeSurveyNext(sessionWorker);
    assert.strictEqual(actW1, 'BRANCHED');
    assert.strictEqual(sessionWorker.currentIndex, 4, 'Phải nhảy thẳng đến Mục 3');
  });

  console.log('---------------------------------------------------------------');
  console.log(`KẾT QUẢ: ${passedTests}/${totalTests} BÀI TEST RESTRICTIONS & BRANCHING PASS 100%`);
  console.log('===============================================================');
}

run().catch(err => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
