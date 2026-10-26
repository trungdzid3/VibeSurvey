/**
 * Bo kiem thu Tang 1: Anti-Fraud Engine Unit Test (Chong Gian Lan Da Tang)
 * Tham chieu nghiem ngat: KE_HOACH_TONG_THE.md va TUONG_LAI_HE_THONG.md
 * 1. Speed Trap: Tu luan 0s, Trac nghiem/Thang do/Grid tinh chuan, <35% REJECTED (-12d), 35-60% SUSPICIOUS (-5d).
 * 2. Attention Check Dong & Second-Chance Grace: Chen dong 30-80%, sai lan 1 co co hoi lan 2, sai ca 2 REJECTED (-12d).
 * 3. Straight-lining Variance: >= 5 cau thang do/hang luoi, sigma^2 = 0 -> SUSPICIOUS (-5d).
 * 4. Bo loc tu luan Open-Text: Cho phep so 0 va tu ngan tieng Viet ("Khong", "Co", "Ok"), chan spam ban phim va lap ky tu.
 * 5. Diem uy tin trust_score: Khoi tao 85, vung 80-100 nhan 100%, vung 40-79 tru 1%/diem, <40 auto ban.
 * 6. Auto-Ban bao ve Wi-Fi truong hoc: Chi ban khi >= 3 tai khoan trung device_fingerprint trong 24h.
 */

const assert = require('node:assert');
const antiFraudService = require('../server/services/antiFraudService');
const config = require('../server/config');
const db = require('../server/db/database');
const crypto = require('crypto');

console.log('===============================================================');
console.log('KIEM THU TANG 1: ANTI-FRAUD ENGINE (HE THONG CHONG GIAN LAN)');
console.log('===============================================================');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`     Chi tiet loi: ${err.message}`);
    throw err;
  }
}

// Bo cau hoi mau chuan
const sampleQuestions = [
  {
    id: 'q1',
    order_index: 1,
    type: 'SINGLE_CHOICE',
    content: 'Ban danh gia the nao ve chat luong dich vu?',
    options_json: JSON.stringify(['Rat te', 'Te', 'Binh thuong', 'Tot', 'Rat tot']),
    is_attention_check: 0,
    expected_answer: null
  },
  {
    id: 'q2',
    order_index: 2,
    type: 'LIKERT_SCALE',
    content: 'Muc do hai long cua ban ve toc do thanh toan',
    options_json: JSON.stringify(['1', '2', '3', '4', '5']),
    is_attention_check: 0,
    expected_answer: null
  },
  {
    id: 'q3',
    order_index: 3,
    type: 'SINGLE_CHOICE',
    content: 'De xac nhan ban dang doc ky, vui long chon phuong an Cam ket',
    options_json: JSON.stringify(['Bo qua', 'Khong ro', 'Cam ket', 'Khac']),
    is_attention_check: 1,
    expected_answer: 'Cam ket'
  },
  {
    id: 'q4',
    order_index: 4,
    type: 'LIKERT_SCALE',
    content: 'Ban co san sang gioi thieu cho ban be khong?',
    options_json: JSON.stringify(['1', '2', '3', '4', '5']),
    is_attention_check: 0,
    expected_answer: null
  },
  {
    id: 'q5',
    order_index: 5,
    type: 'LIKERT_SCALE',
    content: 'Muc do tin cay doi voi bao mat vi',
    options_json: JSON.stringify(['1', '2', '3', '4', '5']),
    is_attention_check: 0,
    expected_answer: null
  },
  {
    id: 'q6',
    order_index: 6,
    type: 'OPEN_TEXT',
    content: 'Hay dong gop y kien de hoan thien san pham tot hon',
    options_json: null,
    is_attention_check: 0,
    expected_answer: null
  }
];

// 1. Chot chan 1: Tinh toan thoi gian chuan (T_standard) & T_min (Speed Trap)
test('1. Chot chan 1: Thoi gian tu luan = 0s, chi tinh thoi gian chuan tren trac nghiem/thang do/luoi', () => {
  // Cau tu luan don le phai co T_standard = 0
  const openTextOnly = [
    { id: 'ot1', type: 'OPEN_TEXT', content: 'Gop y 1' },
    { id: 'ot2', type: 'SHORT_TEXT', content: 'Gop y 2' },
    { id: 'ot3', type: 'PARAGRAPH', content: 'Gop y 3' }
  ];
  assert.strictEqual(antiFraudService.calculateStandardTime(openTextOnly), 0, 'Thoi gian chuan cua cac cau tu luan phai bang 0s');
  assert.strictEqual(antiFraudService.calculateMinCompletionTime(openTextOnly), 0, 'T_min cua cau tu luan phai bang 0s');

  // Bo cau hoi hon hop: q1(10s) + q2(12s) + q3(10s) + q4(12s) + q5(12s) + q6(0s) = 56s
  const tStd = antiFraudService.calculateStandardTime(sampleQuestions);
  assert.strictEqual(tStd, 56, `Thoi gian chuan phai la 56s, thuc te: ${tStd}s`);

  // T_min = Math.ceil(56 * 0.35) = 20s
  const tMin = antiFraudService.calculateMinCompletionTime(sampleQuestions);
  assert.strictEqual(tMin, 20, `T_min phai la 20s (35% cua 56s), thuc te: ${tMin}s`);

  // Cau hoi Luoi ma tran: 3 hang x 5s = 15s
  const gridQuestions = [
    {
      id: 'g1',
      type: 'CHOICE_GRID',
      content: 'Danh gia cac tieu chi sau',
      options_json: JSON.stringify({
        rows: ['Giao dien', 'Toc do', 'Bao mat'],
        columns: ['Kem', 'Binh thuong', 'Tot']
      })
    }
  ];
  const gridTime = antiFraudService.calculateStandardTime(gridQuestions);
  assert.strictEqual(gridTime, 15, `Thoi gian cau hoi Luoi 3 hang phai la 15s (3 x 5s), thuc te: ${gridTime}s`);
});

// 2. Chot chan 1: Speed Trap phan loai <35% (REJECTED, -12d) va 35%-60% (SUSPICIOUS, -5d)
test('2. Chot chan 1: Bẫy toc do <35% bi REJECTED (-12d) va 35%-60% bi SUSPICIOUS (-5d)', () => {
  const tStd = antiFraudService.calculateStandardTime(sampleQuestions); // 56s
  const validAnswers = {
    q1: 'Tot',
    q2: '4',
    q3: 'Cam ket',
    q4: '5',
    q5: '4',
    q6: '0'
  };

  // Bot nop bai trong 5 giay (< 35% cua 56s = 19.6s)
  const botResult = antiFraudService.evaluateSubmission(sampleQuestions, validAnswers, 5);
  assert.strictEqual(botResult.isValid, false);
  assert.strictEqual(botResult.status, 'REJECTED_FRAUD');
  assert.strictEqual(botResult.trustScoreDelta, -12.0, 'Speed trap < 35% phai tru dung -12 diem uy tin');
  assert.strictEqual(botResult.scoreDetails.speedVerdict, 'REJECTED');

  // Nop nhanh trong 25 giay (trong khoang 35% - 60% cua 56s: 19.6s <= 25s < 33.6s)
  const suspiciousResult = antiFraudService.evaluateSubmission(sampleQuestions, validAnswers, 25);
  assert.strictEqual(suspiciousResult.isValid, false);
  assert.strictEqual(suspiciousResult.status, 'FLAGGED_MANUAL');
  assert.strictEqual(suspiciousResult.trustScoreDelta, -5.0, 'Speed trap 35%-60% phai danh dau SUSPICIOUS va tru -5 diem');
  assert.strictEqual(suspiciousResult.scoreDetails.speedVerdict, 'SUSPICIOUS');

  // Nop chuan tren 60% (35 giay >= 33.6s)
  const passResult = antiFraudService.evaluateSubmission(sampleQuestions, validAnswers, 40);
  assert.strictEqual(passResult.scoreDetails.speedVerdict, 'PASS');
  assert.strictEqual(passResult.status, 'VALIDATED');
  assert.strictEqual(passResult.trustScoreDelta, 2.0);
});

// 3. Chot chan 2: Attention Check Dong & Co che Second-Chance Grace
test('3. Chot chan 2: Attention Check dong giua bai va co che Second-Chance Grace tha thu lan 1', () => {
  // Sinh cau hoi bay dong
  const dynamicCheck = antiFraudService.generateDynamicAttentionCheck(10);
  assert(dynamicCheck.order_index >= 3 && dynamicCheck.order_index <= 8, 'Cau bay dong phai nam trong khoang 30% - 80% tien do');
  assert.strictEqual(dynamicCheck.is_attention_check, 1);
  assert(dynamicCheck.expected_answer.length > 0);

  // Sinh cau bay xac nhan lan 2
  const secondChanceCheck = antiFraudService.generateSecondChanceAttentionCheck(dynamicCheck);
  assert.strictEqual(secondChanceCheck.is_attention_check, 1);
  assert.strictEqual(secondChanceCheck.is_second_chance, 1);

  const questionsWithSecondChance = [
    ...sampleQuestions,
    secondChanceCheck
  ];

  // Tinh huong A: Nguoi dung sai lan 1, nhung DUNG o lan 2 (Second-Chance Grace) -> VALIDATED!
  const answersGracePass = {
    q1: 'Tot',
    q2: '4',
    q3: 'Sai dap an', // Sai lan 1
    [secondChanceCheck.id]: secondChanceCheck.expected_answer, // Dung lan 2
    q4: '5',
    q5: '4',
    q6: 'Khong'
  };
  const resultGracePass = antiFraudService.evaluateSubmission(questionsWithSecondChance, answersGracePass, 45);
  assert.strictEqual(resultGracePass.isValid, true, 'Dung o lan 2 phai duoc cong nhan hop le (Second-Chance Grace)');
  assert.strictEqual(resultGracePass.status, 'VALIDATED');
  assert.strictEqual(resultGracePass.trustScoreDelta, 2.0, 'Duoc tha thu lan 2 van nhan +2 diem uy tin');
  assert.strictEqual(resultGracePass.scoreDetails.secondChanceUsed, true);

  // Tinh huong B: Nguoi dung sai ca lan 1 VA lan 2 -> REJECTED (-12d)
  const answersBothFail = {
    q1: 'Tot',
    q2: '4',
    q3: 'Sai lan 1',
    [secondChanceCheck.id]: 'Sai ca lan 2',
    q4: '5',
    q5: '4',
    q6: 'Khong'
  };
  const resultBothFail = antiFraudService.evaluateSubmission(questionsWithSecondChance, answersBothFail, 45);
  assert.strictEqual(resultBothFail.isValid, false);
  assert.strictEqual(resultBothFail.status, 'REJECTED_FRAUD');
  assert.strictEqual(resultBothFail.trustScoreDelta, -12.0, 'Sai ca 2 lan phai bi REJECTED va tru dung -12 diem uy tin');
});

// 4. Chot chan 3: Phuong sai duong thang (Straight-lining Variance cho >= 5 cau thang do / hang luoi)
test('4. Chot chan 3: Phuong sai duong thang (Straight-lining) voi sigma^2 = 0 tren >= 5 cau thang do', () => {
  // 5 cau thang do chon toan bo gia tri '4' -> Phuong sai = 0
  const straight5Questions = [
    { id: 's1', type: 'LIKERT_SCALE', content: 'C1' },
    { id: 's2', type: 'LIKERT_SCALE', content: 'C2' },
    { id: 's3', type: 'LIKERT_SCALE', content: 'C3' },
    { id: 's4', type: 'LIKERT_SCALE', content: 'C4' },
    { id: 's5', type: 'LIKERT_SCALE', content: 'C5' }
  ];

  const straightAnswers = {
    s1: '4',
    s2: '4',
    s3: '4',
    s4: '4',
    s5: '4'
  };

  const resultStraight = antiFraudService.evaluateSubmission(straight5Questions, straightAnswers, 60);
  assert.strictEqual(resultStraight.scoreDetails.isStraightLining, true);
  assert.strictEqual(resultStraight.status, 'FLAGGED_MANUAL', 'Straight-lining phai bi danh dau SUSPICIOUS (FLAGGED_MANUAL)');
  assert.strictEqual(resultStraight.trustScoreDelta, -5.0, 'Straight-lining phai bi tru -5 diem uy tin');

  // Cau hoi Luoi voi 5 hang deu chon cung cot 3
  const gridStraight = [
    {
      id: 'grid1',
      type: 'CHOICE_GRID',
      content: 'Danh gia 5 tieu chi',
      options_json: JSON.stringify({
        rows: ['R1', 'R2', 'R3', 'R4', 'R5'],
        columns: ['1', '2', '3', '4', '5']
      })
    }
  ];
  const gridStraightAnswers = {
    grid1: { R1: 3, R2: 3, R3: 3, R4: 3, R5: 3 }
  };
  const resultGridStraight = antiFraudService.evaluateSubmission(gridStraight, gridStraightAnswers, 60);
  assert.strictEqual(resultGridStraight.scoreDetails.isStraightLining, true);
  assert.strictEqual(resultGridStraight.status, 'FLAGGED_MANUAL');

  // Co bien thien: khong bi straight-lining
  const diverseAnswers = {
    s1: '3',
    s2: '4',
    s3: '5',
    s4: '4',
    s5: '2'
  };
  const resultDiverse = antiFraudService.evaluateSubmission(straight5Questions, diverseAnswers, 60);
  assert.strictEqual(resultDiverse.scoreDetails.isStraightLining, false);
});

// 5. Chot chan 4: Bo loc tu luan Open-Text (Chap nhan so 0 va tu ngan, chi chan spam)
test('5. Chot chan 4: Chap nhan hop le so 0 va tu ngan tieng Viet, chan dung spam ban phim', () => {
  // Cac truong hop hop le 100%
  const validCases = ['0', 'Không', 'Có', 'Chưa', 'Bình thường', 'Ok', 'Không có', 'ko', 'k', '100', '3.14'];
  for (const text of validCases) {
    const check = antiFraudService.validateOpenTextAnswer(text);
    assert.strictEqual(check.isValid, true, `Cau tra loi "${text}" phai duoc cong nhan hop le 100%`);
  }

  // Cac truong hop vi pham: lap ky tu >= 5 lan
  const repeatCases = ['aaaaa', '111111', 'bbbbbbb', '......'];
  for (const text of repeatCases) {
    const check = antiFraudService.validateOpenTextAnswer(text);
    assert.strictEqual(check.isValid, false, `Chuoi lap "${text}" phai bi chan`);
  }

  // Cac truong hop vi pham: go ban phim loan xa
  const keyboardMash = ['asdfghjk', 'qwertyuiop', 'zxcvbnm', 'lkjhgfdsa'];
  for (const text of keyboardMash) {
    const check = antiFraudService.validateOpenTextAnswer(text);
    assert.strictEqual(check.isValid, false, `Chuoi spam phim "${text}" phai bi chan`);
  }
});

// 6. Chot chan 5: Co che Diem Uy Tin trust_score & Khau tru thuong luy tien
test('6. Chot chan 5: Cong thuc khau tru thuong luy tien theo trust_score va nguong Auto-Ban', () => {
  const baseReward = 1000; // 1.000 Point

  // Vung 80 - 100 diem: Nhan du 100%
  const p100 = antiFraudService.calculatePayoutByTrustScore(baseReward, 100.0);
  assert.strictEqual(p100.effectiveReward, 1000);
  assert.strictEqual(p100.deductedAmount, 0);
  assert.strictEqual(p100.canWithdraw, true);
  assert.strictEqual(p100.isBanned, false);

  const p85 = antiFraudService.calculatePayoutByTrustScore(baseReward, 85.0);
  assert.strictEqual(p85.effectiveReward, 1000);

  // Vung 40 - 79 diem: Khau tru luy tien 1% cho moi diem duoi 80
  // S = 75: thieu 5 diem -> tru 5% -> nhan 950 Point
  const p75 = antiFraudService.calculatePayoutByTrustScore(baseReward, 75.0);
  assert.strictEqual(p75.effectiveReward, 950);
  assert.strictEqual(p75.deductedAmount, 50);
  assert.strictEqual(p75.canWithdraw, true);

  // S = 65: thieu 15 diem -> tru 15% -> nhan 850 Point
  const p65 = antiFraudService.calculatePayoutByTrustScore(baseReward, 65.0);
  assert.strictEqual(p65.effectiveReward, 850);
  assert.strictEqual(p65.deductedAmount, 150);
  assert.strictEqual(p65.canWithdraw, true);

  // S = 50: thieu 30 diem -> tru 30% -> nhan 700 Point, tam khoa rut tien (40 <= S < 60)
  const p50 = antiFraudService.calculatePayoutByTrustScore(baseReward, 50.0);
  assert.strictEqual(p50.effectiveReward, 700);
  assert.strictEqual(p50.deductedAmount, 300);
  assert.strictEqual(p50.canWithdraw, false, 'Diem uy tin 50 phai tam khoa rut tien cho toi khi >= 60');

  // S < 40: Khoa tai khoan, nhan 0 Point
  const p35 = antiFraudService.calculatePayoutByTrustScore(baseReward, 35.0);
  assert.strictEqual(p35.effectiveReward, 0);
  assert.strictEqual(p35.isBanned, true, 'Diem uy tin < 40 phai tu dong khoa tai khoan (Auto-Ban)');
  assert.strictEqual(p35.canWithdraw, false);
});

// 7. Chot chan 5: Bien dong trust_score (+2.0 VALIDATED, +0.2 SCREENED_OUT, -5.0 SUSPICIOUS, -12.0 REJECTED)
test('7. Chot chan 5: Cap nhat trust_score voi cac muc bien dong chuan', () => {
  const testUserId = 'test_user_trust_' + crypto.randomUUID().substring(0, 8);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, trust_score, status)
    VALUES (?, ?, 'hash', 'Test User', 'RESPONDENT', 85.0, 'ACTIVE')
  `).run(testUserId, `${testUserId}@example.com`);

  // VALIDATED: +2.0 -> 87.0
  const u1 = antiFraudService.updateUserTrustScore(testUserId, 'VALIDATED');
  assert.strictEqual(u1.newScore, 87.0);

  // SCREENED_OUT: +0.2 -> 87.2
  const u2 = antiFraudService.updateUserTrustScore(testUserId, 'SCREENED_OUT');
  assert.strictEqual(u2.newScore, 87.2);

  // SUSPICIOUS: -5.0 -> 82.2
  const u3 = antiFraudService.updateUserTrustScore(testUserId, 'SUSPICIOUS');
  assert.strictEqual(u3.newScore, 82.2);

  // REJECTED: -12.0 -> 70.2
  const u4 = antiFraudService.updateUserTrustScore(testUserId, 'REJECTED');
  assert.strictEqual(u4.newScore, 70.2);

  // Giam lien tiep de kiem tra Auto-Ban khi S < 40
  antiFraudService.updateUserTrustScore(testUserId, 'REJECTED'); // 70.2 - 12 = 58.2
  antiFraudService.updateUserTrustScore(testUserId, 'REJECTED'); // 58.2 - 12 = 46.2
  const uBan = antiFraudService.updateUserTrustScore(testUserId, 'REJECTED'); // 46.2 - 12 = 34.2 (< 40)
  assert(uBan.newScore < 40.0);
  assert.strictEqual(uBan.isBanned, true);
  assert.strictEqual(uBan.status, 'BANNED', 'Khi trust_score < 40 phai tu dong chuyen status = BANNED');
});

// 8. Chot chan Bo tro: Auto-Ban theo device_fingerprint va bao ve Wi-Fi truong hoc
test('8. Chot chan Bo tro: Bao ve Wi-Fi truong hoc (nhieu tai khoan cung IP hop le), chi Ban khi >= 3 tai khoan trung device_fingerprint', () => {
  const schoolWifiIp = '113.161.45.88'; // IP Wi-Fi cong cong cua truong dai hoc

  // Tinh huong 1: 5 sinh vien khac nhau dung 5 may khac nhau (5 device_fingerprint khac nhau) cung IP Wi-Fi truong
  for (let i = 1; i <= 5; i++) {
    const studentUserId = `student_${crypto.randomUUID().substring(0, 8)}`;
    const studentDevice = `device_hardware_${crypto.randomUUID().substring(0, 8)}`;
    
    // Tao user de tranh loi FK
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, status)
      VALUES (?, ?, 'hash', 'Student', 'RESPONDENT', 'ACTIVE')
    `).run(studentUserId, `${studentUserId}@school.edu.vn`);

    // Goi ham kiem tra IP/Device
    const res = antiFraudService.trackAndVerifyDeviceIp({
      userId: studentUserId,
      rawIp: schoolWifiIp,
      deviceFingerprint: studentDevice,
      action: 'LOGIN'
    });
    assert.strictEqual(res.isSuspicious, false, 'Sinh vien khac may dung chung Wi-Fi truong khong duoc bi chan');
  }

  // Tinh huong 2: Gian lan Multi-Account - Cung 1 may (trung device_fingerprint) tao 3 tai khoan khac nhau trong 24h
  const cheatDevice = 'device_sybil_attacker_' + crypto.randomUUID().substring(0, 8);
  const u1 = 'cheater_1_' + crypto.randomUUID().substring(0, 6);
  const u2 = 'cheater_2_' + crypto.randomUUID().substring(0, 6);
  const u3 = 'cheater_3_' + crypto.randomUUID().substring(0, 6);

  for (const uid of [u1, u2, u3]) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, status)
      VALUES (?, ?, 'hash', 'Cheater', 'RESPONDENT', 'ACTIVE')
    `).run(uid, `${uid}@fake.com`);
  }

  // Lan 1 va Lan 2: Hoat dong binh thuong
  antiFraudService.trackAndVerifyDeviceIp({ userId: u1, rawIp: '1.2.3.4', deviceFingerprint: cheatDevice, action: 'REGISTER' });
  antiFraudService.trackAndVerifyDeviceIp({ userId: u2, rawIp: '1.2.3.4', deviceFingerprint: cheatDevice, action: 'REGISTER' });

  // Lan 3: Cham nguong >= 3 tai khoan tren 1 device_fingerprint -> Phai nem loi Auto-Ban!
  assert.throws(() => {
    antiFraudService.trackAndVerifyDeviceIp({ userId: u3, rawIp: '1.2.3.4', deviceFingerprint: cheatDevice, action: 'REGISTER' });
  }, /Thiết bị của bạn đã bị khóa do phát hiện 3 tài khoản/);

  // Kiem tra cac tai khoan nay da bi chuyen sang BANNED trong DB
  const userCheck1 = db.prepare('SELECT status FROM users WHERE id = ?').get(u1);
  const userCheck2 = db.prepare('SELECT status FROM users WHERE id = ?').get(u2);
  assert.strictEqual(userCheck1.status, 'BANNED', 'Tai khoan 1 phai bi Auto-Ban');
  assert.strictEqual(userCheck2.status, 'BANNED', 'Tai khoan 2 phai bi Auto-Ban');
});

console.log('---------------------------------------------------------------');
console.log(`KET THUC KIEM THU: ${passedTests}/${totalTests} BAI KIEM THU THANH CONG (100% PASS)`);
console.log('===============================================================\n');

module.exports = { passedTests, totalTests };
