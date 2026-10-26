/**
 * KIEM THU TASK 5: CAU HOI SANG LOC THICH UNG (ADAPTIVE AUTO-SCREENER), CO IS_REQUIRED & BAO HANH 1 DOI 1
 */

const assert = require('assert');
const crypto = require('crypto');
const app = require('../server/app');
const db = require('../server/db/database');

async function runTask5Tests() {
  console.log('===============================================================');
  console.log('BAT DAU KIEM THU TASK 5: IS_REQUIRED, GRID, AUTO-SCREENER & BAO HANH');
  console.log('===============================================================');

  // Khoi dong server test
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(3).toString('hex');
  const creatorEmail = `enterprise_${uniqueSuffix}@corp.vn`;
  const matchedUserEmail = `matched_${uniqueSuffix}@hust.edu.vn`;
  const unmatchedUserEmail = `unmatched_${uniqueSuffix}@gmail.com`;
  const password = 'Password@123';

  try {
    // 1. Dang ky tai khoan
    console.log('\n--- 1. Dang ky va thiet lap ho so kiem thu ---');
    
    // Creator Doanh nghiep
    const regCreatorRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: creatorEmail,
        password,
        name: 'Doanh Nghiep Test',
        role: 'CREATOR'
      })
    });
    const regCreatorData = await regCreatorRes.json();
    assert.strictEqual(regCreatorData.success, true);
    const creatorToken = regCreatorData.token;

    // Cap nhat goi Doanh nghiep va so du cho Creator
    db.prepare(`
      UPDATE users 
      SET account_tier = 'ENTERPRISE', credit_balance = 50000000, enterprise_verify_level = 1 
      WHERE email = ?
    `).run(creatorEmail);

    // Respondent 1: Khop 100% Profile (Nam, Ha Noi, BKT HUST, CNTT IT_TECH, 21 tuoi)
    const regUser1Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: matchedUserEmail,
        password,
        name: 'Nguyen Van Matched',
        role: 'RESPONDENT'
      })
    });
    const regUser1Data = await regUser1Res.json();
    assert.strictEqual(regUser1Data.success, true);
    const matchedToken = regUser1Data.token;

    // Cap nhat Profile 100% cho Respondent 1
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 21;
    const birthDate = `${birthYear}-05-15`;
    const demoPayload1 = {
      gender: 'Nam',
      birth_date: birthDate,
      province: 'Hà Nội',
      occupation: 'Sinh viên',
      university: 'HUST',
      major: 'IT_TECH',
      graduation_year: currentYear + 1,
      monthly_income: 'Dưới 5 triệu',
      birth_year: birthYear
    };

    const updateProfile1Res = await fetch(`${baseUrl}/auth/profile/demographics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${matchedToken}`
      },
      body: JSON.stringify(demoPayload1)
    });
    const updateProfile1Data = await updateProfile1Res.json();
    assert.strictEqual(updateProfile1Data.success, true);
    assert.strictEqual(updateProfile1Data.user.profile_completed, 1);
    console.log('  [PASS] Respondent 1 hoan thien 100% Profile khop DH Bach Khoa Ha Noi, CNTT, 21 tuoi, Nam.');

    // Respondent 2: Chua khop Profile (Chua hoan thien profile)
    const regUser2Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: unmatchedUserEmail,
        password,
        name: 'Tran Thi Unmatched',
        role: 'RESPONDENT'
      })
    });
    const regUser2Data = await regUser2Res.json();
    assert.strictEqual(regUser2Data.success, true);
    const unmatchedToken = regUser2Data.token;
    console.log('  [PASS] Respondent 2 chua khai bao day du Profile.');

    // 2. Tao khao sat co Choice Grid, Checkbox Grid va co is_required
    console.log('\n--- 2. Kiem thu luu tru co is_required va cau hoi Luoi Ma Tran (CHOICE_GRID, CHECKBOX_GRID) ---');
    const surveyPayload = {
      title: 'Khao sat Cong nghe & Thiet bi ' + uniqueSuffix,
      description: 'Khao sat danh gia chat luong san pham cong nghe',
      category: 'Thị trường',
      target_responses: 20,
      package_type: 'ENTERPRISE',
      pricing_tier: 'ENTERPRISE',
      target_demographics: {
        gender: 'Nam',
        provinces: ['HN', 'Hà Nội'],
        universities: ['HUST'],
        majors: ['IT_TECH'],
        age_min: 18,
        age_max: 25
      },
      questions: [
        {
          type: 'SINGLE_CHOICE',
          content: 'Ban co dang hoc DH Bach Khoa HN khong?',
          options: ['Co', 'Khong'],
          is_required: 1,
          is_screener: 1,
          qualifying_answer: 'Co'
        },
        {
          type: 'SHORT_TEXT',
          content: 'Ho ten day du cua ban la gi?',
          is_required: 1
        },
        {
          type: 'CHOICE_GRID',
          content: 'Danh gia muc do hai long ve cac thiet bi',
          rows: ['Dien thoai', 'Laptop', 'Tai nghe'],
          columns: ['Kem', 'Trung binh', 'Tot'],
          is_required: 1
        },
        {
          type: 'SHORT_TEXT',
          content: 'Gop y them (Khong bat buoc)',
          is_required: 0
        }
      ]
    };

    const createSurveyRes = await fetch(`${baseUrl}/surveys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatorToken}`
      },
      body: JSON.stringify(surveyPayload)
    });
    const createSurveyData = await createSurveyRes.json();
    assert.strictEqual(createSurveyData.success, true, 'Tao khao sat thanh cong');
    const surveyId = createSurveyData.surveyId;

    // Kiem tra du lieu questions luu trong DB
    const dbQuestions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(surveyId);
    assert.strictEqual(dbQuestions.length, 4);

    // Kiem tra cau 3 (CHOICE_GRID)
    const gridQ = dbQuestions[2];
    assert.strictEqual(gridQ.type, 'CHOICE_GRID');
    assert.strictEqual(gridQ.is_required, 1);
    const parsedRows = JSON.parse(gridQ.rows_json);
    const parsedCols = JSON.parse(gridQ.columns_json);
    assert.deepStrictEqual(parsedRows, ['Dien thoai', 'Laptop', 'Tai nghe']);
    assert.deepStrictEqual(parsedCols, ['Kem', 'Trung binh', 'Tot']);

    // Kiem tra cau 4 (is_required = 0)
    const optionalQ = dbQuestions[3];
    assert.strictEqual(optionalQ.is_required, 0);
    console.log('  [PASS] Luu tru thanh cong CHOICE_GRID voi rows, columns va is_required trong DB.');

    // Xuat ban khao sat
    const publishRes = await fetch(`${baseUrl}/surveys/${surveyId}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${creatorToken}` }
    });
    const publishData = await publishRes.json();
    assert.strictEqual(publishData.success, true, 'Xuat ban khao sat thanh cong');

    // 3. Kiem thu Adaptive Auto-Screener (Bypass cho nguoi khop 100% va Hien thi cho nguoi chua khop)
    console.log('\n--- 3. Kiem thu Adaptive Auto-Screener ---');

    // 3.1. Respondent 1 (Khop 100% Profile): Phai AN cau hoi screener va tra ve auto_screener_bypassed = true
    const sessionRes1 = await fetch(`${baseUrl}/surveys/${surveyId}/start-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${matchedToken}` }
    });
    const sessionData1 = await sessionRes1.json();
    assert.strictEqual(sessionData1.success, true);
    assert.strictEqual(sessionData1.auto_screener_bypassed, true, 'Nguoi khop 100% phai duoc bypassed');
    assert.strictEqual(sessionData1.auto_filled_demographics.gender, 'Nam');
    assert.strictEqual(sessionData1.auto_filled_demographics.university, 'HUST');

    // Danh sach cau hoi tra ve cho Respondent 1 KHONG duoc chua cau is_screener
    const returnedQIds1 = sessionData1.questions.map(q => q.id);
    assert.strictEqual(sessionData1.questions.some(q => q.is_screener), false, 'Khong duoc tra ve cau screener cho nguoi da khop');
    console.log('  [PASS] Smart Bypass thanh cong: An toan bo cau hoi screener doi voi Respondent 1 khop 100% Profile.');

    // 3.2. Respondent 2 (Chua khop Profile): Phai tra ve day du cau hoi screener va auto_screener_bypassed = false
    const sessionRes2 = await fetch(`${baseUrl}/surveys/${surveyId}/start-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${unmatchedToken}` }
    });
    const sessionData2 = await sessionRes2.json();
    assert.strictEqual(sessionData2.success, true);
    assert.strictEqual(sessionData2.auto_screener_bypassed, false, 'Nguoi chua khop khong duoc bypassed');
    assert.strictEqual(sessionData2.questions.some(q => q.is_screener), true, 'Phai hien thi cau screener cho nguoi chua khop');
    console.log('  [PASS] Adaptive Screener thanh cong: Hien thi cau hoi sang loc o dau bai doi voi Respondent 2.');

    // 4. Kiem thu Submit voi co is_required (Bat buoc tra loi)
    console.log('\n--- 4. Kiem thu rang buoc bat buoc is_required khi nop bai ---');

    // 4.1. Respondent 1 nop bai nhung bo trong cau hoi bat buoc -> Phai tra loi 400
    const submitEmptyRes = await fetch(`${baseUrl}/surveys/${surveyId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${matchedToken}`
      },
      body: JSON.stringify({
        duration_sec: 25,
        answers: {
          // Bo trong cau Ho ten va cau Grid
        }
      })
    });
    const submitEmptyData = await submitEmptyRes.json();
    assert.strictEqual(submitEmptyRes.status, 400, 'Bo trong cau bat buoc phai tra ma 400');
    assert.strictEqual(submitEmptyData.success, false);
    assert.strictEqual(submitEmptyData.message.includes('bắt buộc'), true);
    console.log('  [PASS] Chặn nop bai khi bo trong cau hoi bat buoc thuong thanh cong.');

    // 4.2. Respondent 1 nop bai nhung cau Luoi Ma Tran chi tra loi 1 hang (thieu cac hang khac) -> Phai tra loi 400
    const qFullNameId = dbQuestions[1].id;
    const qGridId = dbQuestions[2].id;
    const submitIncompleteGridRes = await fetch(`${baseUrl}/surveys/${surveyId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${matchedToken}`
      },
      body: JSON.stringify({
        duration_sec: 25,
        answers: {
          [qFullNameId]: 'Nguyen Van Matched',
          [qGridId]: {
            'Dien thoai': 'Tot'
            // Thieu 'Laptop' va 'Tai nghe'
          }
        }
      })
    });
    const submitIncompleteGridData = await submitIncompleteGridRes.json();
    assert.strictEqual(submitIncompleteGridRes.status, 400, 'Thieu hang trong ma tran phai tra ma 400');
    assert.strictEqual(submitIncompleteGridData.success, false);
    assert.strictEqual(submitIncompleteGridData.message.includes('đầy đủ hàng'), true);
    console.log('  [PASS] Chặn nop bai khi chua tra loi day du cac hang trong cau hoi Luoi Ma Tran thanh cong.');

    // 4.3. Respondent 1 nop day du hop le -> VALIDATED va tu dong Auto-Fill Profile
    const submitValidRes = await fetch(`${baseUrl}/surveys/${surveyId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${matchedToken}`
      },
      body: JSON.stringify({
        duration_sec: 35,
        answers: {
          [qFullNameId]: 'Nguyen Van Matched',
          [qGridId]: {
            'Dien thoai': 'Tot',
            'Laptop': 'Trung binh',
            'Tai nghe': 'Tot'
          }
          // Cau so 4 khong bat buoc (is_required = 0) duoc phep de trong!
        }
      })
    });
    const submitValidData = await submitValidRes.json();
    assert.strictEqual(submitValidRes.status, 200);
    assert.strictEqual(submitValidData.success, true);
    assert.strictEqual(submitValidData.status, 'VALIDATED');

    // Kiem tra DB xem answers_payload co duoc Auto-Fill profile ngam khong
    const resp1Record = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = (SELECT id FROM users WHERE email = ?)').get(surveyId, matchedUserEmail);
    const savedAnswers1 = JSON.parse(resp1Record.answers_payload);
    assert.strictEqual(savedAnswers1['__profile_gender'], 'Nam');
    assert.strictEqual(savedAnswers1['__profile_university'], 'HUST');
    assert.strictEqual(savedAnswers1['__profile_major'], 'IT_TECH');
    console.log('  [PASS] Nop bai thanh cong, cau optional bo trong hop le, Auto-Fill du lieu Profile ngam vao ket qua.');

    // 4.4. Kiem thu Screen-Out an toan cho Respondent 2 (tra loi sai cau sang loc)
    console.log('\n--- 4.4 Kiem thu Screen-Out an toan (0 Point, +0.2 trust_score) ---');
    const screenerQId = dbQuestions[0].id;
    // Dat trust_score khoi diem la 85 de kiem tra cong +0.2 khong bi cham tran 100
    db.prepare('UPDATE users SET trust_score = 85.0 WHERE email = ?').run(unmatchedUserEmail);
    const oldTrust2 = 85.0;

    const screenOutSubmitRes = await fetch(`${baseUrl}/surveys/${surveyId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${unmatchedToken}`
      },
      body: JSON.stringify({
        duration_sec: 15,
        answers: {
          [screenerQId]: 'Khong', // Sai tieu chi 'Co'
          [qFullNameId]: 'Tran Thi Unmatched',
          [qGridId]: { 'Dien thoai': 'Tot', 'Laptop': 'Tot', 'Tai nghe': 'Tot' }
        }
      })
    });
    const screenOutData = await screenOutSubmitRes.json();
    assert.strictEqual(screenOutData.success, true);
    assert.strictEqual(screenOutData.screened_out, true);
    assert.strictEqual(screenOutData.status, 'SCREENED_OUT');
    assert.strictEqual(screenOutData.consolationPoints, 0, 'Screen-out khong tang point tien mat');
    assert.strictEqual(screenOutData.trustScoreBonus, 0.2, 'Screen-out cong +0.2 trust_score');

    const newTrust2 = db.prepare('SELECT trust_score FROM users WHERE email = ?').get(unmatchedUserEmail).trust_score;
    assert.strictEqual(parseFloat(newTrust2.toFixed(1)), parseFloat((oldTrust2 + 0.2).toFixed(1)));
    console.log('  [PASS] Screen-Out an toan hoat dong chuan xac: status SCREENED_OUT, 0 Point tien mat, +0.2 diem uy tin.');

    // 5. Kiem thu Tinh nang Bao Hanh 1 Doi 1 (Goi Doanh Nghiep - Toi da 15% trong 7 ngay)
    console.log('\n--- 5. Kiem thu Bao Hanh 1 Doi 1 (Warranty Claim) ---');

    // Chuan bi them du lieu mau de test bao hanh (tao 10 responses hop le)
    // De 15% cua 10 mau = Math.floor(10 * 0.15) = 1 mau duoc doi
    for (let i = 1; i <= 9; i++) {
      const dummyUserId = crypto.randomUUID();
      const dummyRespId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role)
        VALUES (?, ?, 'hash', ?, 'RESPONDENT')
      `).run(dummyUserId, `dummy_${i}_${uniqueSuffix}@test.vn`, `Dummy Respondent ${i}`);

      db.prepare(`
        INSERT INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at, duration_sec, quality_score, points_rewarded)
        VALUES (?, ?, ?, 'VALIDATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 30, 0.95, 1000)
      `).run(dummyRespId, surveyId, dummyUserId);
    }

    // Cap nhat collected_responses = 10, status = 'COMPLETED'
    db.prepare(`
      UPDATE surveys 
      SET collected_responses = 10, status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(surveyId);

    // Lay 2 response VALIDATED tu cac dummy users de bao toan response cua Respondent 1
    const dummyResponses = db.prepare("SELECT id FROM responses WHERE survey_id = ? AND status = 'VALIDATED' AND respondent_id != (SELECT id FROM users WHERE email = ?) LIMIT 3").all(surveyId, matchedUserEmail);
    const respId1 = dummyResponses[0].id;
    const respId2 = dummyResponses[1].id;

    // 5.1. Thu yeu cau doi 2 mau khi han muc chi cho phep 1 mau (15% cua 10 = 1) -> Phai bao loi
    const claimExcessRes = await fetch(`${baseUrl}/surveys/${surveyId}/warranty-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatorToken}`
      },
      body: JSON.stringify({
        response_ids: [respId1, respId2],
        reason: 'Mau tra loi khong nghiem tuc'
      })
    });
    const claimExcessData = await claimExcessRes.json();
    assert.strictEqual(claimExcessRes.status, 400, 'Vuot qua han muc 15% phai tra ve 400');
    assert.strictEqual(claimExcessData.success, false);
    assert.strictEqual(claimExcessData.message.includes('15%'), true);
    console.log('  [PASS] Chặn yeu cau doi mau vuot qua han muc 15% thanh cong.');

    // 5.2. Thu yeu cau boi nguoi khong phai Doanh nghiep -> Phai bao loi
    const nonEnterpriseToken = matchedToken;
    const claimForbiddenRes = await fetch(`${baseUrl}/surveys/${surveyId}/warranty-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nonEnterpriseToken}`
      },
      body: JSON.stringify({
        response_ids: [respId1],
        reason: 'Test quyen'
      })
    });
    assert.strictEqual(claimForbiddenRes.status, 403, 'Khong phai chu so huu hoac admin bi chan 403');
    console.log('  [PASS] Chặn nguoi khong phai chu so huu bao hanh thanh cong.');

    // 5.3. Yeu cau hop le 1 mau (dung 15% cua 10)
    const claimValidRes = await fetch(`${baseUrl}/surveys/${surveyId}/warranty-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatorToken}`
      },
      body: JSON.stringify({
        response_ids: [respId1],
        reason: 'Phieu tra loi nghi van bot AI sao chep'
      })
    });
    const claimValidData = await claimValidRes.json();
    assert.strictEqual(claimValidRes.status, 200);
    assert.strictEqual(claimValidData.success, true);
    assert.strictEqual(claimValidData.replacedCount, 1);
    assert.strictEqual(claimValidData.newCollectedResponses, 9, 'Da tru 1 mau hop le de thu bu');

    // Kiem tra trang thai response trong DB
    const updatedRespRecord = db.prepare('SELECT status FROM responses WHERE id = ?').get(respId1);
    assert.strictEqual(updatedRespRecord.status, 'WARRANTY_REPLACED');

    // Kiem tra khao sat tu dong mo lai thanh ACTIVE de thu bu
    const updatedSurveyRecord = db.prepare('SELECT status, collected_responses FROM surveys WHERE id = ?').get(surveyId);
    assert.strictEqual(updatedSurveyRecord.status, 'ACTIVE');
    assert.strictEqual(updatedSurveyRecord.collected_responses, 9);

    // Kiem tra log trong bang warranty_claims
    const warrantyLog = db.prepare('SELECT * FROM warranty_claims WHERE survey_id = ?').get(surveyId);
    assert.ok(warrantyLog);
    assert.strictEqual(warrantyLog.replaced_count, 1);
    assert.strictEqual(warrantyLog.creator_id, (db.prepare('SELECT id FROM users WHERE email = ?').get(creatorEmail)).id);
    console.log('  [PASS] Yeu cau bao hanh 1 doi 1 thanh cong: status WARRANTY_REPLACED, survey mo lai ACTIVE, ghi log DB day du.');

    // 5.4. Kiem tra xuat file du lieu co chua cac cot Auto-Fill nhan khau hoc
    console.log('\n--- 5.4 Kiem thu Xuat du lieu khao sat (CSV & JSON) voi Auto-Fill ---');
    const exportJsonRes = await fetch(`${baseUrl}/surveys/${surveyId}/export?format=json`, {
      headers: { 'Authorization': `Bearer ${creatorToken}` }
    });
    const exportJsonData = await exportJsonRes.json();
    assert.strictEqual(exportJsonData.totalValidatedResponses, 9);
    // Kiem tra phan hoi dau tien co demographics auto-fill
    const firstExportResp = exportJsonData.responses.find(r => r.respondentEmail === matchedUserEmail);
    assert.ok(firstExportResp);
    assert.strictEqual(firstExportResp.demographics.gender, 'Nam');
    assert.strictEqual(firstExportResp.demographics.university, 'HUST');

    const exportCsvRes = await fetch(`${baseUrl}/surveys/${surveyId}/export?format=csv`, {
      headers: { 'Authorization': `Bearer ${creatorToken}` }
    });
    const exportCsvText = await exportCsvRes.text();
    assert.strictEqual(exportCsvText.includes('Giới Tính (Auto-Fill)'), true);
    assert.strictEqual(exportCsvText.includes('Trường ĐH (Auto-Fill)'), true);
    console.log('  [PASS] Xuat file CSV va JSON hien thi day du cot nhan khau hoc Auto-Fill cho Creator.');

    console.log('\n===============================================================');
    console.log('TAT CA CAC MUC KIEM THU TASK 5 DA DAT 100% PASS!');
    console.log('===============================================================');
  } finally {
    server.close();
  }
}

runTask5Tests().catch(err => {
  console.error('\n[FAIL] LOI KIEM THU TASK 5:', err);
  process.exit(1);
});
