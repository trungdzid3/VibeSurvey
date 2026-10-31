/**
 * Bo Kiem Thu Tinh Nang: Khao Sat Trao Doi Sinh Vien (Edu Karma Exchange)
 * Task 1 - Backend Logic & Database Verification
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const app = require('../server/app');
const db = require('../server/db/database');

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`     Chi tiet loi: ${err.message}`);
    throw err;
  }
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('BAT DAU KIEM THU: KHAN SAT TRAO DOI SINH VIEN (EDU KARMA EXCHANGE)');
  console.log('===============================================================');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const normalUserEmail = `normal_${uniqueSuffix}@vibetest.vn`;
  const studentUserEmail = `student_${uniqueSuffix}@hust.edu.vn`;
  const studentRespondentEmail = `respondent_edu_${uniqueSuffix}@neu.edu.vn`;
  const password = 'PasswordEdu123!@#';

  let normalToken = null;
  let normalId = null;
  let studentToken = null;
  let studentId = null;
  let studentRespondentToken = null;
  let studentRespondentId = null;
  let exchangeSurveyId = null;

  try {
    // 1. Kiem tra CSDL: Cac cot student_karma va is_student_exchange ton tai
    await runTest('CSDL: Kiem tra cot student_karma trong users va is_student_exchange trong surveys', async () => {
      const userCols = db.prepare('PRAGMA table_info(users)').all();
      assert.ok(userCols.some(c => c.name === 'student_karma'), 'users phai co cot student_karma');

      const surveyCols = db.prepare('PRAGMA table_info(surveys)').all();
      assert.ok(surveyCols.some(c => c.name === 'is_student_exchange'), 'surveys phai co cot is_student_exchange');
    });

    // 2. Dang ky & Dang nhap: Tra ve student_karma mac dinh = 0
    await runTest('Auth: Dang ky & Dang nhap tra ve student_karma = 0', async () => {
      // Dang ky normal user
      const resNormal = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalUserEmail,
          password,
          name: 'Nguoi Dung Thuong',
          role: 'CREATOR'
        })
      });
      const dataNormal = await resNormal.json();
      assert.strictEqual(dataNormal.success, true);
      assert.strictEqual(dataNormal.user.student_karma, 0);
      normalToken = dataNormal.token;
      normalId = dataNormal.user.id;

      // Dang ky student creator
      const resStudent = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentUserEmail,
          password,
          name: 'Sinh Vien Creator',
          role: 'CREATOR'
        })
      });
      const dataStudent = await resStudent.json();
      assert.strictEqual(dataStudent.success, true);
      studentToken = dataStudent.token;
      studentId = dataStudent.user.id;

      // Gia lap xac thuc sinh vien cho student creator
      db.prepare('UPDATE users SET is_student_verified = 1, student_karma = 50, free_quota_remaining = 0 WHERE id = ?').run(studentId);

      // Dang ky student respondent
      const resStudentResp = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentRespondentEmail,
          password,
          name: 'Sinh Vien Dap Vien',
          role: 'RESPONDENT'
        })
      });
      const dataStudentResp = await resStudentResp.json();
      assert.strictEqual(dataStudentResp.success, true);
      studentRespondentToken = dataStudentResp.token;
      studentRespondentId = dataStudentResp.user.id;

      // Gia lap xac thuc sinh vien cho respondent
      db.prepare('UPDATE users SET is_student_verified = 1, student_karma = 0 WHERE id = ?').run(studentRespondentId);

      // Kiem tra endpoint /auth/me
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      const meData = await meRes.json();
      assert.strictEqual(meData.success, true);
      assert.strictEqual(meData.user.student_karma, 50);
      assert.strictEqual(meData.user.is_student_verified, 1);
    });

    // 3. Tao khao sat: Chan nguoi dung chua xac thuc sinh vien tao is_student_exchange = 1
    await runTest('Survey Creation: Chan user chua xac thuc tao khao sat is_student_exchange (403)', async () => {
      const res = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${normalToken}`
        },
        body: JSON.stringify({
          title: 'Khao sat thuong co tinh tao exchange',
          description: 'Test chan quyen',
          target_responses: 30,
          is_student_exchange: 1,
          questions: [
            {
              order_index: 1,
              type: 'SHORT_TEXT',
              content: 'Ban hoc nganh gi?',
              is_required: 1
            }
          ]
        })
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Sinh Viên'));
    });

    // 4. Tao khao sat: Cho phep sinh vien da xac thuc tao khao sat is_student_exchange = 1
    await runTest('Survey Creation: Sinh vien da xac thuc tao khao sat is_student_exchange thanh cong', async () => {
      const res = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          title: 'Khao sat Nghien cuu Khoa hoc Sinh vien 2026',
          description: 'De tai tot nghiep Bach Khoa',
          target_responses: 30,
          is_student_exchange: 1,
          questions: [
            {
              order_index: 1,
              type: 'SHORT_TEXT',
              content: 'Ban hoc nganh gi?',
              is_required: 1
            }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.is_student_exchange, 1);
      assert.strictEqual(data.economics.totalEscrowVnd, 0); // 0 VND escrow
      exchangeSurveyId = data.surveyId;

      const inDb = db.prepare('SELECT is_student_exchange, status FROM surveys WHERE id = ?').get(exchangeSurveyId);
      assert.strictEqual(inDb.is_student_exchange, 1);
      assert.strictEqual(inDb.status, 'DRAFT');
    });

    // 5. Xuat ban khao sat: Chan xuat ban neu thieu Karma va Free Quota
    await runTest('Publish Survey: Chan xuat ban neu khong du Karma', async () => {
      // Set student_karma = 10, free_quota_remaining = 0 trong khi can 30
      db.prepare('UPDATE users SET student_karma = 10, free_quota_remaining = 0 WHERE id = ?').run(studentId);

      const res = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`
        }
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Karma'));
    });

    // 6. Xuat ban khao sat: Xuat ban thanh cong khi du Karma, tru Karma & khong tru VND
    await runTest('Publish Survey: Xuat ban thanh cong bang Karma, tru Karma & khong tru VND', async () => {
      // Set student_karma = 50, credit_balance = 100000 VND
      db.prepare('UPDATE users SET student_karma = 50, credit_balance = 100000 WHERE id = ?').run(studentId);

      const res = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`
        }
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.is_student_exchange, 1);
      assert.strictEqual(data.status, 'ACTIVE');

      const creatorAfter = db.prepare('SELECT student_karma, credit_balance FROM users WHERE id = ?').get(studentId);
      assert.strictEqual(creatorAfter.student_karma, 20); // 50 - 30 = 20
      assert.strictEqual(creatorAfter.credit_balance, 100000); // Khong bi tru VND!
    });

    // 7. Cach ly hien thi (Visibility Isolation):
    // - Khach vang lai (unauthenticated) KHONG thay
    // - Nguoi dung thuong (is_student_verified != 1) KHONG thay
    // - Sinh vien da xac thuc (is_student_verified == 1) THAY
    // - Admin THAY
    await runTest('Visibility: Khach vang lai khong nhin thay khao sat trao doi sinh vien', async () => {
      const res = await fetch(`${baseUrl}/surveys`);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      const found = data.surveys.some(s => s.id === exchangeSurveyId);
      assert.strictEqual(found, false, 'Khach vang lai khong duoc phep thay khao sat sinh vien');
    });

    await runTest('Visibility: Nguoi dung thuong khong nhin thay khao sat trao doi sinh vien', async () => {
      const res = await fetch(`${baseUrl}/surveys`, {
        headers: { 'Authorization': `Bearer ${normalToken}` }
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      const found = data.surveys.some(s => s.id === exchangeSurveyId);
      assert.strictEqual(found, false, 'Nguoi dung chua xac thuc edu khong duoc phep thay');
    });

    await runTest('Visibility: Sinh vien da xac thuc nhin thay khao sat trao doi sinh vien', async () => {
      const res = await fetch(`${baseUrl}/surveys`, {
        headers: { 'Authorization': `Bearer ${studentRespondentToken}` }
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      const found = data.surveys.some(s => s.id === exchangeSurveyId);
      assert.strictEqual(found, true, 'Sinh vien edu phai nhin thay khao sat sinh vien');
    });

    // 8. Chan truy cap truc tiep (Direct Access 403 Forbidden):
    // - Khach truy cap getSurvey(id) -> 403 Forbidden
    // - Nguoi dung thuong truy cap getSurvey(id) -> 403 Forbidden
    // - Sinh vien truy cap getSurvey(id) -> 200 OK
    // - Creator truy cap getSurvey(id) -> 200 OK
    await runTest('Direct Access: Khach vang lai bi chan 403 khi truy cap getSurvey', async () => {
      const res = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}`);
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Sinh Viên'));
    });

    await runTest('Direct Access: Nguoi dung thuong bi chan 403 khi truy cap getSurvey', async () => {
      const res = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}`, {
        headers: { 'Authorization': `Bearer ${normalToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Sinh Viên'));
    });

    await runTest('Direct Access: Sinh vien va Creator truy cap getSurvey thanh cong (200)', async () => {
      const resEdu = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}`, {
        headers: { 'Authorization': `Bearer ${studentRespondentToken}` }
      });
      assert.strictEqual(resEdu.status, 200);
      const dataEdu = await resEdu.json();
      assert.strictEqual(dataEdu.success, true);

      const resCreator = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      assert.strictEqual(resCreator.status, 200);
      const dataCreator = await resCreator.json();
      assert.strictEqual(dataCreator.success, true);
    });

    // 9. Lam khao sat & Nop bai:
    // - Nguoi dung thuong bat dau lam bai bi chan 403
    // - Sinh vien lam bai thanh cong, nhan +1 Karma (thay vi diem), collected_responses tang
    await runTest('Session: Chan nguoi dung thuong startSession khao sat sinh vien (403)', async () => {
      const res = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}/start-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${normalToken}`
        }
      });
      assert.strictEqual(res.status, 403);
    });

    await runTest('Session & Submit: Sinh vien lam bai hop le nhan +1 Karma va khong nhan Point/VND', async () => {
      // Sinh vien startSession
      const startRes = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}/start-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentRespondentToken}`
        }
      });
      assert.strictEqual(startRes.status, 200);
      const startData = await startRes.json();
      assert.strictEqual(startData.success, true);
      assert.strictEqual(startData.is_student_exchange, 1);
      assert.strictEqual(startData.rewardKarma, 1);

      const questionId = startData.questions[0].id;

      // Sinh vien nop bai hop le
      const submitRes = await fetch(`${baseUrl}/surveys/${exchangeSurveyId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentRespondentToken}`
        },
        body: JSON.stringify({
          answers: { [questionId]: 'Cong nghe Thong tin Bach Khoa' },
          duration_sec: 25,
          device_fingerprint: 'edu_device_fingerprint_test'
        })
      });

      assert.strictEqual(submitRes.status, 200);
      const submitData = await submitRes.json();
      assert.strictEqual(submitData.success, true);
      assert.strictEqual(submitData.status, 'VALIDATED');
      assert.strictEqual(submitData.is_student_exchange, 1);
      assert.strictEqual(submitData.karmaEarned, 1);
      assert.strictEqual(submitData.pointsEarned, 0);

      // Kiem tra trong DB: Dap vien duoc cong +1 student_karma, point_balance giu nguyen 0
      const respUser = db.prepare('SELECT student_karma, point_balance FROM users WHERE id = ?').get(studentRespondentId);
      assert.strictEqual(respUser.student_karma, 1);
      assert.strictEqual(respUser.point_balance, 0);

      // Kiem tra khao sat: collected_responses tang len 1
      const surveyAfter = db.prepare('SELECT collected_responses FROM surveys WHERE id = ?').get(exchangeSurveyId);
      assert.strictEqual(surveyAfter.collected_responses, 1);
    });

    console.log('\n===============================================================');
    console.log(`KET QUA KIEM THU: HOAN THANH ${passedTests}/${totalTests} TESTS DAT CHUAN 100%`);
    console.log('===============================================================');
  } finally {
    server.close();
  }
}

runAllTests().catch((err) => {
  console.error('Loi tong the:', err);
  process.exit(1);
});
