const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const funcs = ['selectSingleOption', 'toggleMultipleOption', 'updateOpenText', 'selectChoiceGridCell', 'toggleCheckboxGridCell', 'handleFileUploadChange'];

funcs.forEach(fn => {
  const methodRegex = new RegExp(`(^|\\n)\\s*${fn}\\s*\\(`, 'm');
  const match = app.match(methodRegex);
  console.log(`Method ${fn}: ${match ? 'DEFINED' : 'NOT DEFINED'}`);
});
