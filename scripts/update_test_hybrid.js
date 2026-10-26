const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('tests/test_hybrid_all_in_one_account.js');
let content = fs.readFileSync(targetFile, 'utf8');

// Dọn dẹp emoji trong test
content = content.replace(/✅ /g, '').replace(/❌ /g, '').replace(/🎉 /g, '').replace(/🛡️ /g, '').replace(/🧪 /g, '');

const insertionTarget = 'assert.match(data.message, /không ở trạng thái hoạt động/i);\n    });';

const additionalTests = `assert.match(data.message, /không ở trạng thái hoạt động/i);
    });

    // 11. Gửi OTP xác thực email sinh viên (.edu.vn / .ac.vn)
    let studentOtp = null;
    await runTest('11. Gửi mã OTP xác thực email sinh viên qua API (POST /auth/student/send-otp)', async () => {
      // 11a. Thử gửi email thông thường không phải .edu.vn -> Bị chặn 400
      const resInvalid = await fetch(\`\${baseUrl}/auth/student/send-otp\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({ student_email: 'sinhvien@gmail.com' })
      });
      assert.strictEqual(resInvalid.status, 400);
      const dataInvalid = await resInvalid.json();
      assert.strictEqual(dataInvalid.success, false);
      assert.match(dataInvalid.message, /\\.edu\\.vn|\\.ac\\.vn/i);

      // 11b. Gửi email trường HUST chuẩn
      const resValid = await fetch(\`\${baseUrl}/auth/student/send-otp\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({
          student_email: \`sinhvien_\${uniqueSuffix}@sis.hust.edu.vn\`,
          university_code: 'HUST'
        })
      });
      const dataValid = await resValid.json();
      assert.strictEqual(resValid.status, 200);
      assert.strictEqual(dataValid.success, true);
      assert(dataValid.debugOtp, 'Phải trả về debugOtp trong môi trường test');
      studentOtp = dataValid.debugOtp;
    });

    // 12. Xác nhận OTP email sinh viên, kích hoạt Gói Sinh Viên
    await runTest('12. Xác thực OTP email sinh viên kích hoạt account_tier = STUDENT (POST /auth/student/verify-otp)', async () => {
      // 12a. Nhập sai OTP -> 400
      const resWrong = await fetch(\`\${baseUrl}/auth/student/verify-otp\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({ otp: '000000' })
      });
      assert.strictEqual(resWrong.status, 400);

      // 12b. Nhập đúng OTP
      const resCorrect = await fetch(\`\${baseUrl}/auth/student/verify-otp\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({ otp: studentOtp })
      });
      const dataCorrect = await resCorrect.json();
      assert.strictEqual(resCorrect.status, 200);
      assert.strictEqual(dataCorrect.success, true);
      assert.strictEqual(dataCorrect.user.is_student_verified, 1);
      assert.strictEqual(dataCorrect.user.account_tier, 'STUDENT');
    });

    // 13. Cập nhật hồ sơ cá nhân và nhận 30 lượt free/tháng cho Sinh viên
    await runTest('13. Điền 100% hồ sơ cá nhân mở khóa 30 lượt free/tháng cho Sinh viên (PUT /auth/profile/demographics)', async () => {
      // 13a. Điền thiếu trường -> Chưa hoàn thành 100%
      const resPartial = await fetch(\`\${baseUrl}/auth/profile/demographics\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({
          gender: 'NAM',
          province: 'HN'
        })
      });
      const dataPartial = await resPartial.json();
      assert.strictEqual(resPartial.status, 200);
      assert.strictEqual(dataPartial.isComplete, false);
      assert.strictEqual(dataPartial.user.profile_completed, 0);

      // 13b. Điền đầy đủ 100% 8 trường nhân khẩu học
      const resFull = await fetch(\`\${baseUrl}/auth/profile/demographics\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({
          gender: 'NAM',
          birth_date: '2003-05-15',
          province: 'HN',
          occupation: 'Sinh viên',
          university: 'HUST',
          major: 'IT_TECH',
          graduation_year: 2025,
          monthly_income: 'DƯỚI_5_TRIỆU'
        })
      });
      const dataFull = await resFull.json();
      assert.strictEqual(resFull.status, 200);
      assert.strictEqual(dataFull.isComplete, true);
      assert.strictEqual(dataFull.user.profile_completed, 1);
      assert.strictEqual(dataFull.user.free_quota_remaining, 30);
      assert(dataFull.user.demographic_locked_until, 'Phải thiết lập thời hạn khóa 90 ngày');
    });

    // 14. Kiểm tra khóa 90 ngày không cho sửa trường nhân khẩu học cốt lõi
    await runTest('14. Khóa 90 ngày bảo vệ trường cốt lõi (Ngày sinh, Giới tính, Trường học, Ngành học)', async () => {
      // 14a. Cố tình sửa ngày sinh -> Bị chặn 403
      const resLockBirth = await fetch(\`\${baseUrl}/auth/profile/demographics\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({
          birth_date: '2000-01-01'
        })
      });
      assert.strictEqual(resLockBirth.status, 403);
      const dataLockBirth = await resLockBirth.json();
      assert.strictEqual(dataLockBirth.success, false);
      assert.match(dataLockBirth.message, /khóa/i);

      // 14b. Sửa trường không cốt lõi (thu nhập, nghề nghiệp) -> Cho phép 200
      const resNonCore = await fetch(\`\${baseUrl}/auth/profile/demographics\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({
          occupation: 'Kỹ sư phần mềm thực tập',
          monthly_income: '5_ĐẾN_10_TRIỆU'
        })
      });
      assert.strictEqual(resNonCore.status, 200);
      const dataNonCore = await resNonCore.json();
      assert.strictEqual(dataNonCore.success, true);
      assert.strictEqual(dataNonCore.user.occupation, 'Kỹ sư phần mềm thực tập');
    });

    // 15. Hồ sơ Doanh nghiệp Cấp độ 1 (Hồ sơ thương hiệu cơ bản, mở ngay)
    await runTest('15. Kích hoạt Hồ sơ Doanh nghiệp Cấp độ 1 (POST /auth/enterprise/profile)', async () => {
      const resEntL1 = await fetch(\`\${baseUrl}/auth/enterprise/profile\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({
          level: 1,
          brand_name: 'TechCorp Vietnam',
          industry: 'Công nghệ thông tin',
          website_url: 'https://techcorp.vn',
          contact_phone: '0988888888'
        })
      });
      const dataEntL1 = await resEntL1.json();
      assert.strictEqual(resEntL1.status, 200);
      assert.strictEqual(dataEntL1.success, true);
      assert.strictEqual(dataEntL1.user.account_tier, 'ENTERPRISE');
      assert.strictEqual(dataEntL1.user.enterprise_verify_level, 1);
      assert.strictEqual(dataEntL1.user.brand_name, 'TechCorp Vietnam');
    });

    // 16. Hồ sơ Doanh nghiệp Cấp độ 2 (Định danh pháp nhân & thuế, mở quyền xuất VAT)
    await runTest('16. Kích hoạt Hồ sơ Doanh nghiệp Cấp độ 2 mở quyền xuất VAT (POST /auth/enterprise/profile)', async () => {
      // 16a. MST sai định dạng -> 400
      const resInvalidTax = await fetch(\`\${baseUrl}/auth/enterprise/profile\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({
          level: 2,
          company_legal_name: 'CÔNG TY TNHH TECHCORP VIỆT NAM',
          tax_id: '12345',
          headquarters_address: 'Tầng 12, Tòa nhà Bitexco, Q.1, TP.HCM',
          invoice_email: 'vat@techcorp.vn'
        })
      });
      assert.strictEqual(resInvalidTax.status, 400);

      // 16b. MST chuẩn 10 số hợp lệ
      const resValidTax = await fetch(\`\${baseUrl}/auth/enterprise/profile\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${respondentToken}\`
        },
        body: JSON.stringify({
          level: 2,
          company_legal_name: 'CÔNG TY TNHH TECHCORP VIỆT NAM',
          tax_id: '0101234567',
          headquarters_address: 'Tầng 12, Tòa nhà Bitexco, Q.1, TP.HCM',
          invoice_email: 'vat@techcorp.vn'
        })
      });
      const dataValidTax = await resValidTax.json();
      assert.strictEqual(resValidTax.status, 200);
      assert.strictEqual(dataValidTax.success, true);
      assert.strictEqual(dataValidTax.user.enterprise_verify_level, 2);
      assert.strictEqual(dataValidTax.user.company_legal_name, 'CÔNG TY TNHH TECHCORP VIỆT NAM');
      assert.strictEqual(dataValidTax.user.tax_id, '0101234567');
    });

    // 17. Cấp 25 lượt free đầu tay cho tài khoản Cá nhân (PERSONAL) hoàn thành Profile
    await runTest('17. Tài khoản Cá nhân (PERSONAL) điền 100% hồ sơ mở khóa 25 lượt free đầu tay', async () => {
      const personalEmail = \`personal_user_\${uniqueSuffix}@vibe-personal.com\`;
      const regRes = await fetch(\`\${baseUrl}/auth/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: personalEmail,
          password: 'Password@123',
          name: 'Người Dùng Cá Nhân',
          role: 'RESPONDENT'
        })
      });
      const regData = await regRes.json();
      const personalToken = regData.token;

      // Điền 100% hồ sơ cá nhân
      const profRes = await fetch(\`\${baseUrl}/auth/profile/demographics\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${personalToken}\`
        },
        body: JSON.stringify({
          gender: 'NỮ',
          birth_date: '1998-10-20',
          province: 'HCM',
          occupation: 'Nhân viên văn phòng',
          university: 'UEH',
          major: 'ECONOMICS',
          graduation_year: 2020,
          monthly_income: '15_ĐẾN_25_TRIỆU'
        })
      });
      const profData = await profRes.json();
      assert.strictEqual(profRes.status, 200);
      assert.strictEqual(profData.isComplete, true);
      assert.strictEqual(profData.user.profile_completed, 1);
      assert.strictEqual(profData.user.account_tier, 'PERSONAL');
      assert.strictEqual(profData.user.free_quota_remaining, 25);
    });`;

if (!content.includes(insertionTarget)) {
  console.error('Không tìm thấy insertion target trong test');
  process.exit(1);
}

content = content.replace(insertionTarget, additionalTests);
fs.writeFileSync(targetFile, content, 'utf8');
console.log('Đã cập nhật test_hybrid_all_in_one_account.js thành công');
