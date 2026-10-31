/**
 * Bo Kiem Thu Tinh Nang: Dien Dan Thao Luan & Chia Se Khao Sat Noi Bo (Survey Community Board)
 * Task 2.1 - Backend API & Database Verification
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
  console.log('BAT DAU KIEM THU: DIEN DAN THAO LUAN & CHIA SE KHAO SAT NOI BO');
  console.log('===============================================================');

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const creatorEmail1 = `creator1_${uniqueSuffix}@vibetest.vn`;
  const creatorEmail2 = `creator2_${uniqueSuffix}@vibetest.vn`;
  const eduStudentEmail = `student_forum_${uniqueSuffix}@hust.edu.vn`;
  const normalUserEmail = `normal_forum_${uniqueSuffix}@vibetest.vn`;
  const adminEmail = `admin_forum_${uniqueSuffix}@vibetest.vn`;
  const password = 'PasswordForum123!@#';

  let tokenCreator1 = null;
  let idCreator1 = null;
  let tokenCreator2 = null;
  let idCreator2 = null;
  let tokenEdu = null;
  let idEdu = null;
  let tokenNormal = null;
  let idNormal = null;
  let tokenAdmin = null;
  let idAdmin = null;

  let normalActiveSurveyId = null;
  let draftSurveyId = null;
  let eduExchangeSurveyId = null;

  let standardPostId = null;
  let eduExchangePostId = null;

  try {
    // 0. Chuan bi tai khoan va khao sat
    await runTest('Setup: Khoi tao tai khoan va cac khao sat phuc vu kiem thu', async () => {
      // 1. Creator 1 (Normal creator)
      const resC1 = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creatorEmail1, password, name: 'Creator Mot', role: 'CREATOR' })
      });
      const dataC1 = await resC1.json();
      tokenCreator1 = dataC1.token;
      idCreator1 = dataC1.user.id;

      // 2. Creator 2 (Khac chu so huu)
      const resC2 = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creatorEmail2, password, name: 'Creator Hai', role: 'CREATOR' })
      });
      const dataC2 = await resC2.json();
      tokenCreator2 = dataC2.token;
      idCreator2 = dataC2.user.id;

      // 3. Edu Student Creator
      const resEdu = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eduStudentEmail, password, name: 'Sinh Vien Edu', role: 'CREATOR' })
      });
      const dataEdu = await resEdu.json();
      tokenEdu = dataEdu.token;
      idEdu = dataEdu.user.id;
      db.prepare('UPDATE users SET is_student_verified = 1, student_karma = 100 WHERE id = ?').run(idEdu);

      // 4. Normal Respondent
      const resNorm = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalUserEmail, password, name: 'User Thuong', role: 'RESPONDENT' })
      });
      const dataNorm = await resNorm.json();
      tokenNormal = dataNorm.token;
      idNormal = dataNorm.user.id;

      // 5. Admin
      const resAdm = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password, name: 'Admin Forum', role: 'CREATOR' })
      });
      const dataAdm = await resAdm.json();
      tokenAdmin = dataAdm.token;
      idAdmin = dataAdm.user.id;
      db.prepare("UPDATE users SET role = 'ADMIN' WHERE id = ?").run(idAdmin);

      // Tao khao sat thuong ACTIVE cho Creator 1
      normalActiveSurveyId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO surveys (id, creator_id, title, description, category, target_responses, cost_per_response, reward_points_per_response, status)
        VALUES (?, ?, 'Khao sat tieu dung F&B 2026', 'Khao sat thuc te', 'Thi truong', 100, 2000, 100, 'ACTIVE')
      `).run(normalActiveSurveyId, idCreator1);

      // Tao khao sat o trang thai DRAFT cho Creator 1
      draftSurveyId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO surveys (id, creator_id, title, description, category, target_responses, cost_per_response, reward_points_per_response, status)
        VALUES (?, ?, 'Khao sat Ban Nhap chua kich hoat', 'Ban nhap', 'Thi truong', 100, 2000, 100, 'DRAFT')
      `).run(draftSurveyId, idCreator1);

      // Tao khao sat Trao Doi Sinh Vien ACTIVE cho Edu Student
      eduExchangeSurveyId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO surveys (id, creator_id, title, description, category, target_responses, cost_per_response, reward_points_per_response, status, is_student_exchange)
        VALUES (?, ?, 'De tai luan van Tot Nghiep Bach Khoa', 'Chi danh cho sinh vien', 'Hoc tap', 50, 0, 0, 'ACTIVE', 1)
      `).run(eduExchangeSurveyId, idEdu);
    });

    // 1. Anti-URL Spoofing: Chan tuyet doi link ngoai trong tieu de, noi dung va binh luan
    await runTest('Anti-URL: Chan chèn link ngoai (http/https/forms.gle/domain/ip) khi tao bai (400)', async () => {
      const forbiddenInputs = [
        { title: 'Khao sat hay lam link https://forms.gle/abc', content: 'Noi dung sach se' },
        { title: 'Tieu de binh thuong', content: 'Cac ban vao http://google.com lam giup nhe' },
        { title: 'Tieu de binh thuong', content: 'Form tai forms.office.com/r/xyz123' },
        { title: 'Tieu de binh thuong', content: 'Ghe qua trang web test-survey.vn xem them' },
        { title: 'Tieu de binh thuong', content: 'Ket noi ip 192.168.1.50 de lam bai' },
        { title: 'Vao www.facebook.com thao luan', content: 'Noi dung' }
      ];

      for (const item of forbiddenInputs) {
        const res = await fetch(`${baseUrl}/forum/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenCreator1}`
          },
          body: JSON.stringify({
            title: item.title,
            content: item.content,
            survey_id: normalActiveSurveyId
          })
        });

        assert.strictEqual(res.status, 400, `Phai chan input chua link: ${JSON.stringify(item)}`);
        const data = await res.json();
        assert.strictEqual(data.success, false);
        assert.ok(data.message.includes('liên kết ngoài'));
      }
    });

    // 2. Kiem tra quyen so huu khao sat va trang thai ACTIVE
    await runTest('Survey Attachment: Chan dang bai neu khong phai khao sat cua chinh minh (403)', async () => {
      // Creator 2 co tinh dinh kem khao sat cua Creator 1
      const res = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenCreator2}`
        },
        body: JSON.stringify({
          title: 'Chia se khao sat cua nguoi khac',
          content: 'Noi dung hop le khong chua link',
          survey_id: normalActiveSurveyId
        })
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('chính bạn tạo'));
    });

    await runTest('Survey Attachment: Chan dang bai neu khao sat khong o trang thai ACTIVE (400)', async () => {
      // Creator 1 dinh kem khao sat DRAFT
      const res = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenCreator1}`
        },
        body: JSON.stringify({
          title: 'Chia se khao sat ban nhap',
          content: 'Noi dung hop le khong chua link',
          survey_id: draftSurveyId
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('ACTIVE'));
    });

    // 3. Dang bai viet hop le
    await runTest('Post Creation: Tao bai viet hop le kem khao sat chinh chu thanh cong (201)', async () => {
      // Creator 1 dang bai viet thuong
      const res1 = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenCreator1}`
        },
        body: JSON.stringify({
          title: 'Nho moi nguoi lam giup khao sat F&B nhan 100 diem thuong',
          content: 'Khao sat nghien cuu thi truong nganh do uong nam 2026. Thoi gian lam khoang 3 phut.',
          survey_id: normalActiveSurveyId
        })
      });

      assert.strictEqual(res1.status, 201);
      const data1 = await res1.json();
      assert.strictEqual(data1.success, true);
      assert.ok(data1.postId);
      standardPostId = data1.postId;

      // Edu Student dang bai viet trao doi sinh vien
      const resEdu = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenEdu}`
        },
        body: JSON.stringify({
          title: 'Trao doi khao sat Khoa hoc May tinh Bach Khoa',
          content: 'Minh dang lam de tai tot nghiep, can 50 phieu khao sat. Minh se tra cheo lai khao sat cho cac ban!',
          survey_id: eduExchangeSurveyId
        })
      });

      assert.strictEqual(resEdu.status, 201);
      const dataEdu = await resEdu.json();
      assert.strictEqual(dataEdu.success, true);
      assert.ok(dataEdu.postId);
      eduExchangePostId = dataEdu.postId;
    });

    // 4. Cach ly khao sat Sinh Vien tren Dien Dan (Edu Isolation)
    await runTest('Edu Isolation: Khach vang lai va User thuong khong nhin thay bai viet sinh vien tren dien dan', async () => {
      // Khach vang lai goi GET /api/forum/posts
      const resGuest = await fetch(`${baseUrl}/forum/posts`);
      const dataGuest = await resGuest.json();
      assert.strictEqual(dataGuest.success, true);
      assert.ok(dataGuest.posts.some(p => p.id === standardPostId), 'Khach phai thay bai viet thuong');
      assert.strictEqual(dataGuest.posts.some(p => p.id === eduExchangePostId), false, 'Khach KHONG duoc thay bai viet sinh vien trao doi');

      // User thuong chua xac thuc edu goi GET /api/forum/posts
      const resNormal = await fetch(`${baseUrl}/forum/posts`, {
        headers: { 'Authorization': `Bearer ${tokenNormal}` }
      });
      const dataNormal = await resNormal.json();
      assert.strictEqual(dataNormal.success, true);
      assert.ok(dataNormal.posts.some(p => p.id === standardPostId), 'User thuong phai thay bai viet thuong');
      assert.strictEqual(dataNormal.posts.some(p => p.id === eduExchangePostId), false, 'User thuong KHONG duoc thay bai viet sinh vien trao doi');
    });

    await runTest('Edu Isolation: Sinh vien da xac thuc va Admin nhin thay ca bai thuong va bai sinh vien', async () => {
      // Sinh vien edu xem
      const resEdu = await fetch(`${baseUrl}/forum/posts`, {
        headers: { 'Authorization': `Bearer ${tokenEdu}` }
      });
      const dataEdu = await resEdu.json();
      assert.strictEqual(dataEdu.success, true);
      assert.ok(dataEdu.posts.some(p => p.id === standardPostId), 'Sinh vien phai thay bai viet thuong');
      assert.ok(dataEdu.posts.some(p => p.id === eduExchangePostId), 'Sinh vien phai thay bai viet sinh vien trao doi');

      // Admin xem
      const resAdmin = await fetch(`${baseUrl}/forum/posts`, {
        headers: { 'Authorization': `Bearer ${tokenAdmin}` }
      });
      const dataAdmin = await resAdmin.json();
      assert.strictEqual(dataAdmin.success, true);
      assert.ok(dataAdmin.posts.some(p => p.id === eduExchangePostId), 'Admin phai thay bai viet sinh vien trao doi');
    });

    // 5. Truoc tiep chi tiet bai viet (GET /api/forum/posts/:id)
    await runTest('Direct Access: Khach va User thuong bi chan 403 khi xem chi tiet bai viet sinh vien', async () => {
      // Khach xem
      const resG = await fetch(`${baseUrl}/forum/posts/${eduExchangePostId}`);
      assert.strictEqual(resG.status, 403);
      const dataG = await resG.json();
      assert.strictEqual(dataG.success, false);
      assert.ok(dataG.message.includes('Sinh Viên'));

      // User thuong xem
      const resN = await fetch(`${baseUrl}/forum/posts/${eduExchangePostId}`, {
        headers: { 'Authorization': `Bearer ${tokenNormal}` }
      });
      assert.strictEqual(resN.status, 403);
    });

    await runTest('Direct Access: Sinh vien va chu bai xem chi tiet bai viet thanh cong (200), tang view', async () => {
      const resEdu = await fetch(`${baseUrl}/forum/posts/${eduExchangePostId}`, {
        headers: { 'Authorization': `Bearer ${tokenEdu}` }
      });
      assert.strictEqual(resEdu.status, 200);
      const dataEdu = await resEdu.json();
      assert.strictEqual(dataEdu.success, true);
      assert.strictEqual(dataEdu.post.id, eduExchangePostId);
      assert.strictEqual(dataEdu.post.survey.is_student_exchange, true);
      assert.ok(dataEdu.post.views_count >= 1);
    });

    // 6. Binh luan bai viet
    await runTest('Comments: Chan chèn link ngoai trong binh luan (400)', async () => {
      const res = await fetch(`${baseUrl}/forum/posts/${standardPostId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenNormal}`
        },
        body: JSON.stringify({
          content: 'Minh da lam xong, nho ban lam giup link http://bit.ly/123 nhe'
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('liên kết ngoài'));
    });

    await runTest('Comments: Binh luan hop le thanh cong (201)', async () => {
      const res = await fetch(`${baseUrl}/forum/posts/${standardPostId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenNormal}`
        },
        body: JSON.stringify({
          content: 'Minh vua hoan thanh khao sat cua ban roi nhe, cau hoi rat hay!'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.comment.id);
      assert.strictEqual(data.comment.author.id, idNormal);
    });

    // 7. Tha tim / Bo tha tim (Like Toggle)
    await runTest('Likes: Tha tim va Bo tha tim cap nhat likes_count chinh xac', async () => {
      // Tha tim
      const resLike = await fetch(`${baseUrl}/forum/posts/${standardPostId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenNormal}`
        }
      });
      assert.strictEqual(resLike.status, 200);
      const dataLike = await resLike.json();
      assert.strictEqual(dataLike.success, true);
      assert.strictEqual(dataLike.is_liked, true);
      assert.strictEqual(dataLike.likes_count, 1);

      // Bo tha tim
      const resUnlike = await fetch(`${baseUrl}/forum/posts/${standardPostId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenNormal}`
        }
      });
      assert.strictEqual(resUnlike.status, 200);
      const dataUnlike = await resUnlike.json();
      assert.strictEqual(dataUnlike.success, true);
      assert.strictEqual(dataUnlike.is_liked, false);
      assert.strictEqual(dataUnlike.likes_count, 0);
    });

    // 8. Xoa bai viet (Delete Post)
    await runTest('Delete Post: Nguoi khac khong co quyen xoa bai viet (403)', async () => {
      const res = await fetch(`${baseUrl}/forum/posts/${standardPostId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenCreator2}` }
      });
      assert.strictEqual(res.status, 403);
    });

    await runTest('Delete Post: Chu bai xoa bai viet thanh cong (200), cascade comments va likes', async () => {
      const res = await fetch(`${baseUrl}/forum/posts/${standardPostId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenCreator1}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Kiem tra khong con trong DB
      const postInDb = db.prepare('SELECT id FROM forum_posts WHERE id = ?').get(standardPostId);
      assert.strictEqual(postInDb, undefined);
      const commentsInDb = db.prepare('SELECT COUNT(*) as count FROM forum_comments WHERE post_id = ?').get(standardPostId);
      assert.strictEqual(commentsInDb.count, 0);
    });

    // 9. Thao luan tu do & Phan khu Sinh vien
    await runTest('Free Discussion: Cho phep dang bai thao luan tu do khong kem khao sat (survey_id = null)', async () => {
      const res = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenNormal}`
        },
        body: JSON.stringify({
          title: 'Kinh nghiem thiet ke cau hoi khao sat khong bi roi',
          content: 'Moi nguoi thuong dat bao nhieu cau hoi trong mot bang hoi khao sat thi hop ly nhat?',
          post_type: 'COMMUNITY'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.post_type, 'COMMUNITY');

      const freePost = db.prepare('SELECT survey_id, post_type FROM forum_posts WHERE id = ?').get(data.postId);
      assert.strictEqual(freePost.survey_id, null);
      assert.strictEqual(freePost.post_type, 'COMMUNITY');

      // Lay chi tiet bai tu do
      const detailRes = await fetch(`${baseUrl}/forum/posts/${data.postId}`, {
        headers: { 'Authorization': `Bearer ${tokenNormal}` }
      });
      const detailData = await detailRes.json();
      assert.strictEqual(detailData.success, true);
      assert.strictEqual(detailData.post.survey, null);
    });

    await runTest('Student Hub: Chan user chua xac thuc dang bai vao Phan khu Sinh Vien (403)', async () => {
      const res = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenNormal}`
        },
        body: JSON.stringify({
          title: 'Bai viet vao goc sinh vien cua user thuong',
          content: 'Noi dung thu nghiem kiem tra quyen sinh vien',
          post_type: 'STUDENT'
        })
      });
      assert.strictEqual(res.status, 403);
    });

    await runTest('Student Hub: Cho phep sinh vien da xac thuc dang bai vao Phan khu Sinh Vien (201)', async () => {
      const res = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenEdu}`
        },
        body: JSON.stringify({
          title: 'Thao luan ve de tai tot nghiep nganh AI va Khoa hoc du lieu',
          content: 'Co ban nao dang lam ve Computer Vision cho de tai tot nghiep khong a?',
          post_type: 'STUDENT'
        })
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.post_type, 'STUDENT');
    });

    await runTest('Anti-Obfuscation URL: Chan link tra hinh co khoang trang quanh dau cham (400)', async () => {
      const res = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenNormal}`
        },
        body: JSON.stringify({
          title: 'Thu gui link ngoai co khoang trang',
          content: 'Cac ban vao forms . gle / abcxyz de lam khao sat giup minh nhe'
        })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.code, 'EXTERNAL_LINKS_PROHIBITED');
    });

    await runTest('False Positive Guard: Khong chan nham cau thoai thong thuong', async () => {
      const res = await fetch(`${baseUrl}/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenNormal}`
        },
        body: JSON.stringify({
          title: 'Chia se ve cach toi uu trai nghiem nguoi dung',
          content: 'Ban co the bo qua buoc nay hoac xoa phan ghi chu de form gon hon nhe.'
        })
      });
      assert.strictEqual(res.status, 201);
    });

    // =========================================================================
    // CAC TEST MO RONG: MICRO AI SENTINEL & SHADOWBAN KIEM DUYET DINH KY
    // =========================================================================
    const forumSentinelService = require('../server/services/forumSentinelService');

    await runTest('Micro AI Sentinel: Phat hien ky tu nguy trang homoglyphs va chuoi link cach quang', async () => {
      // Chuỗi lách luật tinh vi: homoglyphs + ký tự lạ + tên miền rút gọn
      const analysis1 = forumSentinelService.analyzeContent(
        'Khao sat ve tieu dung',
        'Cac ban vao bit(dot)ly/khao-sat-2026 giup minh nhe'
      );
      assert.strictEqual(analysis1.isViolation, true);
      assert.strictEqual(analysis1.flag, 'FLAGGED_SHORTENER_URL');

      const analysis2 = forumSentinelService.analyzeContent(
        'Xin y kien ve de tai tot nghiep',
        'Vui long xoa dau cach de lay link: f o r m s . g l e / t e s t 1 2 3'
      );
      assert.strictEqual(analysis2.isViolation, true);
      assert.strictEqual(analysis2.flag, 'FLAGGED_DISGUISED_SURVEY_URL');
    });

    await runTest('Micro AI Sentinel: Khong bao dong gia voi van ban thao luan tu do thuan tuy', async () => {
      const cleanAnalysis = forumSentinelService.analyzeContent(
        'Kinh nghiem hoc lap trinh',
        'Minh thay viec thiet ke he thong co ban nen chu trong vao ACID va kiem thu unit test day du.'
      );
      assert.strictEqual(cleanAnalysis.isViolation, false);
      assert.strictEqual(cleanAnalysis.flag, 'CLEAN');
    });

    let flaggedPostId = null;
    await runTest('Micro AI Sentinel: Quet dinh ky tu dong an bai viet vi pham va tru trust_score tac gia', async () => {
      // 1. Tạo một bài viết trực tiếp vào DB giả lập việc lách qua bộ lọc ban đầu
      flaggedPostId = crypto.randomUUID();
      const initialUser = db.prepare('SELECT trust_score FROM users WHERE id = ?').get(idNormal);
      const initialScore = initialUser.trust_score || 100.0;

      db.prepare(`
        INSERT INTO forum_posts (id, user_id, title, content, post_type, category, is_audited, is_hidden)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
      `).run(
        flaggedPostId,
        idNormal,
        'Nho moi nguoi giup khao sat gap',
        'Cac ban vao forms . office . com / r / abcdef de lam giup minh nhe',
        'COMMUNITY',
        'ALL'
      );

      // 2. Chạy chu trình quét thủ công của Sentinel
      const scanResult = forumSentinelService.scanPendingPosts(100);
      assert.ok(scanResult.scanned >= 1);
      assert.ok(scanResult.violations >= 1);

      // 3. Kiểm tra bài viết đã được cập nhật is_hidden = 1 và audit_flag chuẩn
      const postAfter = db.prepare('SELECT is_hidden, is_audited, audit_flag FROM forum_posts WHERE id = ?').get(flaggedPostId);
      assert.strictEqual(postAfter.is_hidden, 1);
      assert.strictEqual(postAfter.is_audited, 1);
      assert.strictEqual(postAfter.audit_flag, 'FLAGGED_DISGUISED_SURVEY_URL');

      // 4. Kiểm tra điểm uy tín trust_score của tác giả đã bị khấu trừ (-15 điểm)
      const userAfter = db.prepare('SELECT trust_score FROM users WHERE id = ?').get(idNormal);
      assert.strictEqual(userAfter.trust_score, Math.max(0, initialScore - 15.0));

      // 5. Kiểm tra log kiểm duyệt admin_audit_logs đã được lưu trữ
      const auditLog = db.prepare('SELECT * FROM admin_audit_logs WHERE target_id = ?').get(flaggedPostId);
      assert.ok(auditLog, 'Phai co ban ghi audit log');
      assert.strictEqual(auditLog.action, 'AUTO_HIDE_DISGUISED_URL');
      assert.strictEqual(auditLog.admin_id, 'SYSTEM_SENTINEL');
    });

    await runTest('Shadowban Access Control: Nguoi dung khac khong the xem bai viet bi an', async () => {
      // Người dùng khác (idEdu) gọi getPost tới bài bị ẩn -> phải nhận lỗi 403
      const resOther = await fetch(`${baseUrl}/forum/posts/${flaggedPostId}`, {
        headers: { 'Authorization': `Bearer ${tokenEdu}` }
      });
      assert.strictEqual(resOther.status, 403);
      const dataOther = await resOther.json();
      assert.strictEqual(dataOther.success, false);

      // Người dùng khác gọi listPosts -> bài bị ẩn không xuất hiện trong danh sách
      const resList = await fetch(`${baseUrl}/forum/posts`, {
        headers: { 'Authorization': `Bearer ${tokenEdu}` }
      });
      assert.strictEqual(resList.status, 200);
      const dataList = await resList.json();
      const existsInList = dataList.posts.some(p => p.id === flaggedPostId);
      assert.strictEqual(existsInList, false, 'Bai viet bi an khong duoc xuat hien trong danh sach cua nguoi khac');

      // Chính tác giả (idNormal) xem bài của mình -> vẫn truy cập được kèm nhãn is_hidden = true
      const resOwner = await fetch(`${baseUrl}/forum/posts/${flaggedPostId}`, {
        headers: { 'Authorization': `Bearer ${tokenNormal}` }
      });
      assert.strictEqual(resOwner.status, 200);
      const dataOwner = await resOwner.json();
      assert.strictEqual(dataOwner.post.is_hidden, true);

      // Admin xem bài bị ẩn -> vẫn xem được bình thường
      const resAdmin = await fetch(`${baseUrl}/forum/posts/${flaggedPostId}`, {
        headers: { 'Authorization': `Bearer ${tokenAdmin}` }
      });
      assert.strictEqual(resAdmin.status, 200);
      const dataAdmin = await resAdmin.json();
      assert.strictEqual(dataAdmin.post.is_hidden, true);
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
