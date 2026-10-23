/**
 * Bộ kiểm thử Tầng 7: Hybrid All-In-One Account Suite (MỤC 2)
 * Kiểm tra việc khai thông quyền hạn cho role RESPONDENT:
 * - Nạp tiền vào quỹ ký quỹ (POST /wallet/deposit)
 * - Bóc tách biểu mẫu (POST /surveys/parse-external)
 * - Tạo khảo sát mới (POST /surveys)
 * - Xuất bản và ký quỹ Escrow (POST /surveys/:id/publish)
 * - Xuất dữ liệu CSV/JSON cho bài của chính mình (GET /surveys/:id/export)
 * - Chặn 403 khi Respondent cố xuất dữ liệu của người khác
 * - Chặn 403 khi tài khoản không ở trạng thái ACTIVE (SUSPENDED)
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
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Chi tiết lỗi: ${err.message}`);
    throw err;
  }
}

async function runHybridAccountTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: TÀI KHOẢN TOÀN NĂNG (HYBRID ALL-IN-ONE ACCOUNT)');
  console.log('===============================================================');

  // Khởi động server nội bộ
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  const respondentEmail = `hybrid_user_${uniqueSuffix}@vibe-allinone.com`;
  const otherRespondentEmail = `other_user_${uniqueSuffix}@vibe-allinone.com`;
  const suspendedEmail = `suspended_user_${uniqueSuffix}@vibe-allinone.com`;
  const password = 'Password@123456';

  let respondentToken = null;
  let respondentId = null;
  let otherRespondentToken = null;
  let otherRespondentId = null;
  let suspendedToken = null;
  let suspendedId = null;
  let createdSurveyId = null;

  try {
    // 1. Đăng ký tài khoản thường (RESPONDENT)
    await runTest('1. Đăng ký tài khoản vai trò RESPONDENT', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: respondentEmail,
          password,
          name: 'Sinh Viên Nghiên Cứu (Hybrid User)',
          role: 'RESPONDENT'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.role, 'RESPONDENT');
      respondentToken = data.token;
      respondentId = data.user.id;

      // Đăng ký thêm 1 respondent khác để kiểm tra bảo mật phân quyền chéo
      const resOther = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otherRespondentEmail,
          password,
          name: 'Người Dùng Khác',
          role: 'RESPONDENT'
        })
      });
      const dataOther = await resOther.json();
      otherRespondentToken = dataOther.token;
      otherRespondentId = dataOther.user.id;

      // Đăng ký tài khoản và chuyển sang trạng thái SUSPENDED
      const resSuspended = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: suspendedEmail,
          password,
          name: 'Tài Khoản Tạm Khóa',
          role: 'RESPONDENT'
        })
      });
      const dataSuspended = await resSuspended.json();
      suspendedToken = dataSuspended.token;
      suspendedId = dataSuspended.user.id;
      db.prepare("UPDATE users SET status = 'SUSPENDED' WHERE id = ?").run(suspendedId);
    });

    // 2. RESPONDENT Nạp tiền vào quỹ ký quỹ (POST /wallet/deposit)
    await runTest('2. Respondent nạp tiền vào ví Credit tạo form (POST /wallet/deposit)', async () => {
      const depositAmount = 200000; // 200,000 VND (Tier Đồng: +3% bonus Credit = +6,000đ)
      const res = await fetch(`${baseUrl}/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${respondentToken}`
        },
        body: JSON.stringify({
          amount_vnd: depositAmount,
          description: 'Sinh viên nạp tiền tạo form luận văn'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.newCreditBalance, 204000); // 200k + 2%
    });

    // 3. RESPONDENT Bóc tách biểu mẫu (POST /surveys/parse-external)
    await runTest('3. Respondent bóc tách câu hỏi từ văn bản Smart Text (POST /surveys/parse-external)', async () => {
      const sampleText = `
        Câu 1: Giới tính của bạn là gì?
        A. Nam
        B. Nữ
        C. Khác

        Câu 2: Bạn đánh giá thế nào về chất lượng dịch vụ?
        1. Rất không hài lòng
        2. Không hài lòng
        3. Bình thường
        4. Hài lòng
        5. Rất hài lòng
      `;
      const res = await fetch(`${baseUrl}/surveys/parse-external`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${respondentToken}`
        },
        body: JSON.stringify({ text: sampleText })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.questionCount >= 2, true);
    });

    // 4. RESPONDENT Tạo khảo sát mới (POST /surveys)
    await runTest('4. Respondent tạo bài khảo sát mới (POST /surveys)', async () => {
      const surveyPayload = {
        title: 'Khảo Sát Luận Văn Sinh Viên ĐHQG - Tài Khoản Toàn Năng',
        description: 'Đề tài nghiên cứu hành vi tiêu dùng số của sinh viên',
        category: 'Học thuật',
        target_responses: 50,
        survey_source: 'INTERNAL_BUILDER',
        questions: [
          {
            type: 'SINGLE_CHOICE',
            content: 'Bạn đang là sinh viên năm mấy?',
            options: ['Năm 1', 'Năm 2', 'Năm 3', 'Năm 4', 'Đã tốt nghiệp'],
            is_attention_check: false
          },
          {
            type: 'SINGLE_CHOICE',
            content: 'Câu hỏi kiểm tra sự chú ý: Vui lòng chọn đáp án "Rất đồng ý"',
            options: ['Rất không đồng ý', 'Không đồng ý', 'Bình thường', 'Rất đồng ý'],
            is_attention_check: true,
            expected_answer: 'Rất đồng ý'
          },
          {
            type: 'OPEN_TEXT',
            content: 'Đóng góp ý kiến của bạn về dịch vụ:',
            options: null,
            is_attention_check: false
          }
        ]
      };

      const res = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${respondentToken}`
        },
        body: JSON.stringify(surveyPayload)
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
      assert(data.surveyId, 'Phải trả về surveyId');
      createdSurveyId = data.surveyId;
    });

    // 5. RESPONDENT Xuất bản khảo sát và Ký quỹ Escrow (POST /surveys/:id/publish)
    await runTest('5. Respondent xuất bản bài và ký quỹ Escrow thành công (POST /surveys/:id/publish)', async () => {
      const res = await fetch(`${baseUrl}/surveys/${createdSurveyId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${respondentToken}`
        }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert(data.totalEscrowVnd > 0);
      assert(data.newCreditBalance >= 0);

      // Kiểm tra DB: Trạng thái khảo sát đã là ACTIVE và có creator_id là respondentId
      const surveyRow = db.prepare('SELECT status, creator_id, escrow_locked_balance FROM surveys WHERE id = ?').get(createdSurveyId);
      assert.strictEqual(surveyRow.status, 'ACTIVE');
      assert.strictEqual(surveyRow.creator_id, respondentId);
      assert.strictEqual(surveyRow.escrow_locked_balance, data.totalEscrowVnd);
    });

    // 6. RESPONDENT Xem chi tiết khảo sát của chính mình (thấy đầy đủ câu bẫy)
    await runTest('6. Respondent là chủ sở hữu xem đầy đủ chi tiết câu hỏi khảo sát của mình', async () => {
      const res = await fetch(`${baseUrl}/surveys/${createdSurveyId}`, {
        headers: { Authorization: `Bearer ${respondentToken}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      const attQ = data.questions.find(q => q.is_attention_check === 1);
      assert(attQ, 'Chủ sở hữu khảo sát phải xem được cờ is_attention_check của bài mình');
      assert.strictEqual(attQ.expected_answer, 'Rất đồng ý');
    });

    // 7. RESPONDENT khác xem khảo sát thì câu bẫy bị lọc 100%
    await runTest('7. Respondent khác xem khảo sát thì cờ is_attention_check bị bóc tách 100%', async () => {
      const res = await fetch(`${baseUrl}/surveys/${createdSurveyId}`, {
        headers: { Authorization: `Bearer ${otherRespondentToken}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      for (const q of data.questions) {
        assert.strictEqual(q.is_attention_check, undefined, 'Câu bẫy phải bị bóc tách khỏi người làm bài');
        assert.strictEqual(q.expected_answer, undefined, 'Đáp án bẫy phải bị bóc tách khỏi người làm bài');
      }
    });

    // 8. RESPONDENT Xuất dữ liệu CSV khảo sát do chính mình tạo ra (GET /surveys/:id/export)
    await runTest('8. Respondent xuất file CSV dữ liệu khảo sát của chính mình (GET /surveys/:id/export)', async () => {
      // Giả lập có 1 phản hồi đã thẩm định (VALIDATED)
      const fakeRespId = 'resp_hybrid_' + crypto.randomUUID();
      db.prepare(`
        INSERT INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at, duration_sec, quality_score, points_rewarded, answers_payload)
        VALUES (?, ?, ?, 'VALIDATED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 65, 1.0, 150, ?)
      `).run(
        fakeRespId, 
        createdSurveyId, 
        otherRespondentId, 
        JSON.stringify({ q1: 'Năm 3', q2: 'Rất đồng ý', q3: 'Khảo sát rất hữu ích' })
      );

      const res = await fetch(`${baseUrl}/surveys/${createdSurveyId}/export?format=csv`, {
        headers: { Authorization: `Bearer ${respondentToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'text/csv; charset=utf-8');
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      assert.strictEqual(buf[0], 0xEF, 'Byte 0 phải là EF (BOM)');
      assert.strictEqual(buf[1], 0xBB, 'Byte 1 phải là BB (BOM)');
      assert.strictEqual(buf[2], 0xBF, 'Byte 2 phải là BF (BOM)');
      const csvText = buf.toString('utf8');
      assert(csvText.includes('Mã Phản Hồi (Response ID)'));
    });

    // 9. RESPONDENT khác cố xuất dữ liệu bài của người khác -> Bị 403 Forbidden
    await runTest('9. Chặn Respondent lạ xuất dữ liệu khảo sát không thuộc sở hữu (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/surveys/${createdSurveyId}/export?format=csv`, {
        headers: { Authorization: `Bearer ${otherRespondentToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /không có quyền/i);
    });

    // 10. Tài khoản SUSPENDED bị chặn không cho tạo khảo sát
    await runTest('10. Tài khoản SUSPENDED bị từ chối 403 khi tạo khảo sát', async () => {
      const res = await fetch(`${baseUrl}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${suspendedToken}`
        },
        body: JSON.stringify({
          title: 'Khảo sát trái phép từ tài khoản suspended',
          questions: [{ type: 'OPEN_TEXT', content: 'Test question?' }]
        })
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /không ở trạng thái hoạt động/i);
    });

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('---------------------------------------------------------------');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI THÀNH CÔNG (100% PASS)`);
  console.log('🛡️ MÔ HÌNH TÀI KHOẢN TOÀN NĂNG (ALL-IN-ONE) ĐÃ HOÀN TẤT & ĐẠT CHUẨN AN TOÀN!');
  console.log('===============================================================');
}

runHybridAccountTests().catch((err) => {
  console.error('Lỗi bộ kiểm thử Hybrid Account:', err);
  process.exit(1);
});
