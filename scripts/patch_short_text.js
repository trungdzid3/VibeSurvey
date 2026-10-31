const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');

const oldStr = 'oninput="VibeApp.updateOpenText(\'${q.id}\', this.value); VibeApp.handleSurveyInputRealtime(\'${q.id}\', this)"';
const newStr = 'oninput="VibeApp.updateOpenText(\'${q.id}\', this.value)"';

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  console.log('Replaced oninput in SHORT_TEXT');
} else {
  console.log('oldStr not found');
}

// Kiểm tra trong updateOpenText
const oldUpdateOpenText = `  updateOpenText(qId, val) {
    if (!this.state.activeSession) return;
    if (!this.state.activeSession.answers) this.state.activeSession.answers = {};
    this.state.activeSession.answers[qId] = typeof val === 'string' ? val : (val ? String(val) : '');
    this._saveActiveSessionToStorage();
  },`;

const newUpdateOpenText = `  updateOpenText(qId, val) {
    if (!this.state.activeSession) return;
    if (!this.state.activeSession.answers) this.state.activeSession.answers = {};
    this.state.activeSession.answers[qId] = typeof val === 'string' ? val : (val ? String(val) : '');
    this._saveActiveSessionToStorage();
    const inputEl = document.getElementById(\`survey-answer-input-\${qId}\`);
    if (inputEl && typeof this.handleSurveyInputRealtime === 'function') {
      this.handleSurveyInputRealtime(qId, inputEl);
    }
  },`;

if (code.includes(oldUpdateOpenText)) {
  code = code.replace(oldUpdateOpenText, newUpdateOpenText);
  console.log('Updated updateOpenText to trigger realtime validation');
} else {
  console.log('oldUpdateOpenText not found or already updated');
}

fs.writeFileSync('public/app.js', code, 'utf8');
