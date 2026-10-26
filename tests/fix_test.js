const fs = require('fs');
const path = require('path');

const testPath = path.join(__dirname, 'test_task5_adaptive_screener_warranty.js');
let code = fs.readFileSync(testPath, 'utf8');

const targetStr = `    const demoPayload1 = {
      gender: 'Nam',
      province: 'Hà Nội',
      university: 'HUST',
      major: 'IT_TECH',
      birth_date: birthDate,
      birth_year: birthYear
    };`;

const replacementStr = `    const demoPayload1 = {
      gender: 'Nam',
      birth_date: birthDate,
      province: 'Hà Nội',
      occupation: 'Sinh viên',
      university: 'HUST',
      major: 'IT_TECH',
      graduation_year: currentYear + 1,
      monthly_income: 'Dưới 5 triệu',
      birth_year: birthYear
    };`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(testPath, code, 'utf8');
console.log('Đã cập nhật demoPayload1 thành công');
