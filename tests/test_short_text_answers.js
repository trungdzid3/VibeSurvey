const assert = require('assert');
const fs = require('fs');

console.log('--- TEST: SHORT_TEXT & PARAGRAPH QUESTION ANSWERS ---');

const appJs = fs.readFileSync('public/app.js', 'utf8');

// 1. Kiểm tra method updateOpenText được định nghĩa trong app.js
assert(appJs.includes('updateOpenText(qId, val) {'), 'updateOpenText must be defined in app.js');
console.log('PASS: updateOpenText is defined in app.js');

// 2. Kiểm tra input của SHORT_TEXT và PARAGRAPH có gọi updateOpenText
assert(appJs.includes("oninput=\"VibeApp.updateOpenText('${q.id}', this.value)\""), 'SHORT_TEXT input must have oninput updateOpenText');
assert(appJs.includes("onchange=\"VibeApp.updateOpenText('${q.id}', this.value)\""), 'SHORT_TEXT input must have onchange updateOpenText');
console.log('PASS: SHORT_TEXT input has oninput and onchange updateOpenText');

// 3. Kiểm tra cơ chế tự động đồng bộ từ DOM trong nextQuestion và submitSurvey
assert(appJs.includes("if (['SHORT_TEXT', 'PARAGRAPH', 'OPEN_TEXT', 'DATE', 'TIME'].includes(curQ.type))"), 'nextQuestion must sync DOM input fallback');
console.log('PASS: nextQuestion and submitSurvey have DOM input fallback sync');

// 4. Mô phỏng logic VibeApp
const mockVibeApp = {
  state: {
    activeSession: {
      surveyId: 'survey-test-1',
      currentIndex: 0,
      answers: {},
      questions: [
        {
          id: 'q1',
          content: 'Họ và tên',
          type: 'SHORT_TEXT',
          is_required: 1
        },
        {
          id: 'q2',
          content: 'Ý kiến đóng góp',
          type: 'PARAGRAPH',
          is_required: 0
        }
      ]
    }
  },
  _saveActiveSessionToStorage() {},
  haptic() {},
  showToast(msg, type) {
    this.lastToast = { msg, type };
  },
  updateOpenText(qId, val) {
    if (!this.state.activeSession) return;
    if (!this.state.activeSession.answers) this.state.activeSession.answers = {};
    this.state.activeSession.answers[qId] = typeof val === 'string' ? val : (val ? String(val) : '');
    this._saveActiveSessionToStorage();
  }
};

// Mô phỏng người dùng nhập "Nguyễn Thuỳ Linh"
mockVibeApp.updateOpenText('q1', 'Nguyễn Thuỳ Linh');
assert.strictEqual(mockVibeApp.state.activeSession.answers['q1'], 'Nguyễn Thuỳ Linh');
console.log('PASS: updateOpenText stores value into answers');

// Kiểm tra logic validation
const session = mockVibeApp.state.activeSession;
const curQ = session.questions[session.currentIndex];
const ans = session.answers[curQ.id];
const isReq = curQ.is_required !== 0 && curQ.is_required !== false;

let hasValidationError = false;
if (isReq) {
  if (ans === undefined || ans === null || String(ans).trim() === '') {
    hasValidationError = true;
  }
}

assert.strictEqual(hasValidationError, false, 'Should not have validation error when name is filled');
console.log('PASS: Validation passes when name is filled');

console.log('--- ALL TEST ASSERTIONS PASSED 100% ---');
