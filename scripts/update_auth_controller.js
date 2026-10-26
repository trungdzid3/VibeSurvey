const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('server/controllers/authController.js');
let content = fs.readFileSync(targetFile, 'utf8');

// Tìm vị trí của class đóng cuối cùng
const lastBraceIdx = content.lastIndexOf('}');
if (lastBraceIdx === -1) {
  console.error('Không tìm thấy dấu đóng class');
  process.exit(1);
}

const newMethods = `
  /**
   * Gửi mã OTP xác thực email sinh viên (.edu.vn / .ac.vn)
   */
  async sendStudentEmailOtp(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để thực hiện thao tác này' });
      }

      const { student_email, university_code } = req.body;
      if (!student_email || typeof student_email !== 'string' || !student_email.includes('@')) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ email sinh viên hợp lệ' });
      }

      const cleanEmail = student_email.toLowerCase().trim();
      const matchingService = require('../services/matchingService');

      // Kiểm tra tính hợp lệ của email sinh viên (.edu.vn / .ac.vn và mã trường nếu có)
      const isValidDomain = matchingService.isStudentEmailValid(cleanEmail, university_code);
      if (!isValidDomain) {
        return res.status(400).json({
          success: false,
          message: 'Email sinh viên phải kết thúc bằng đuôi .edu.vn hoặc .ac.vn hợp lệ của trường đại học'
        });
      }

      // Kiểm tra email sinh viên đã được tài khoản khác xác thực chưa
      const existing = db.prepare('SELECT id FROM users WHERE student_email = ? AND id != ? AND is_student_verified = 1').get(cleanEmail, user.id);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Email sinh viên này đã được xác thực bởi một tài khoản khác trong hệ thống'
        });
      }

      // Kiểm tra cooldown gửi mã OTP (60 giây)
      const currentUserRow = db.prepare('SELECT student_otp_sent_at FROM users WHERE id = ?').get(user.id);
      if (currentUserRow && currentUserRow.student_otp_sent_at) {
        const lastSentTime = Number(currentUserRow.student_otp_sent_at);
        const now = Date.now();
        const secondsElapsed = Math.floor((now - lastSentTime) / 1000);
        if (secondsElapsed >= 0 && secondsElapsed < 60) {
          const waitSeconds = 60 - secondsElapsed;
          return res.status(429).json({
            success: false,
            message: \`Vui lòng đợi thêm \${waitSeconds} giây trước khi yêu cầu gửi lại mã OTP mới\`,
            retryAfter: waitSeconds
          });
        }
      }

      // Sinh OTP 6 chữ số ngẫu nhiên (hết hạn sau 5 phút)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000;
      const sentAt = Date.now();

      db.prepare(\`
        UPDATE users 
        SET student_email = ?, student_otp = ?, student_otp_expires_at = ?, student_otp_sent_at = ? 
        WHERE id = ?
      \`).run(cleanEmail, otp, expiresAt, sentAt, user.id);

      console.log(\`[STUDENT OTP] Gui ma xac thuc sinh vien den: \${cleanEmail} | Ma OTP: \${otp} (Hieu luc 5 phut)\`);

      // Gửi email qua sendSmartEmail
      const notificationService = require('../services/notificationService');
      const emailSubject = \`[VibeSurvey] Ma xac thuc email sinh vien: \${otp}\`;
      const emailHtml = \`
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div style="background: #0F172A; padding: 24px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">VIBESURVEY XAC THUC EMAIL SINH VIEN</h2>
            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Kich hoat Goi Sinh Vien va Dinh muc 30 luot khao sat mien phi moi thang</p>
          </div>
          <div style="padding: 28px 24px; text-align: center;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">Chao <strong>\${user.name || 'ban sinh vien'}</strong>,</p>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">Ma xac thuc OTP 6 chu so cua ban de xac minh email sinh vien la:</p>
            <div style="margin: 24px 0; background: #f8fafc; border: 2px dashed #0056D2; border-radius: 12px; padding: 16px; display: inline-block;">
              <span style="font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 6px; color: #0056D2;">\${otp}</span>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Ma co hieu luc trong <strong>5 phut</strong>. Tuyet doi khong chia se ma nay cho nguoi khac.</p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8;">
            VibeSurvey Platform - Nen tang khao sat va doi thuong uy tin
          </div>
        </div>
      \`;

      notificationService.sendSmartEmail({
        toEmail: cleanEmail,
        toName: user.name || 'Sinh viên',
        subject: emailSubject,
        htmlContent: emailHtml,
        textContent: \`Ma xac thuc email sinh vien cua ban la: \${otp}. Ma co hieu luc trong 5 phut.\`
      }).catch(e => console.warn('Loi gui Student Email OTP:', e.message));

      const parts = cleanEmail.split('@');
      const maskedEmail = parts[0].slice(0, 2) + '***' + (parts[0].length > 3 ? parts[0].slice(-1) : '') + '@' + parts[1];

      return res.json({
        success: true,
        message: \`Mã xác thực gồm 6 chữ số đã được gửi đến email \${maskedEmail}. Vui lòng nhập mã để hoàn tất!\`,
        maskedEmail,
        debugOtp: config.NODE_ENV !== 'production' ? otp : undefined
      });
    } catch (err) {
      console.error('Lỗi sendStudentEmailOtp:', err);
      return res.status(500).json({ success: false, message: 'Lỗi gửi mã xác thực sinh viên: ' + err.message });
    }
  }

  /**
   * Xác nhận OTP email sinh viên, kích hoạt account_tier = 'STUDENT'
   */
  async verifyStudentEmailOtp(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để thực hiện thao tác này' });
      }

      const { otp } = req.body;
      if (!otp || typeof otp !== 'string' || !otp.trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mã xác thực OTP 6 số' });
      }

      const cleanOtp = otp.trim();
      const row = db.prepare('SELECT student_email, student_otp, student_otp_expires_at, profile_completed, free_quota_remaining, account_tier FROM users WHERE id = ?').get(user.id);

      if (!row || !row.student_otp) {
        return res.status(400).json({ success: false, message: 'Chưa có mã xác thực nào được gửi hoặc mã đã được sử dụng' });
      }

      if (Date.now() > Number(row.student_otp_expires_at)) {
        return res.status(400).json({ success: false, message: 'Mã xác thực OTP đã hết hạn (sau 5 phút). Vui lòng yêu cầu mã mới' });
      }

      if (row.student_otp !== cleanOtp) {
        return res.status(400).json({ success: false, message: 'Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại' });
      }

      // Khớp OTP: cập nhật account_tier = 'STUDENT', is_student_verified = 1
      // Nếu đã xong profile (profile_completed = 1) thì kích hoạt free_quota_remaining = 30
      let newFreeQuota = row.free_quota_remaining || 0;
      if (row.profile_completed === 1) {
        newFreeQuota = Math.max(newFreeQuota, 30);
      }

      db.prepare(\`
        UPDATE users 
        SET is_student_verified = 1,
            account_tier = 'STUDENT',
            student_otp = NULL,
            student_otp_expires_at = NULL,
            free_quota_remaining = ?
        WHERE id = ?
      \`).run(newFreeQuota, user.id);

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      delete updatedUser.password_hash;
      delete updatedUser.email_otp;
      delete updatedUser.student_otp;

      return res.json({
        success: true,
        message: 'Xác thực email sinh viên thành công! Tài khoản đã được nâng cấp lên Gói Sinh Viên.',
        user: updatedUser
      });
    } catch (err) {
      console.error('Lỗi verifyStudentEmailOtp:', err);
      return res.status(500).json({ success: false, message: 'Lỗi xác nhận mã sinh viên: ' + err.message });
    }
  }

  /**
   * Cập nhật hồ sơ cá nhân và nhân khẩu học
   * Nhận các trường: gender, birth_date, province, occupation, university, major, graduation_year, monthly_income
   * Kiểm tra khóa 90 ngày: demographic_locked_until
   * Cấp 25 lượt free (Cá nhân) hoặc 30 lượt free/tháng (Sinh viên) khi hoàn thiện 100%
   */
  async updateDemographicProfile(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để cập nhật hồ sơ' });
      }

      const {
        gender,
        birth_date,
        province,
        occupation,
        university,
        major,
        graduation_year,
        monthly_income
      } = req.body;

      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      if (!userRow) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin người dùng' });
      }

      // Kiểm tra khóa 90 ngày cho các trường nhân khẩu học cốt lõi (birth_date, gender, university, major)
      const isLocked = userRow.demographic_locked_until && (new Date(userRow.demographic_locked_until).getTime() > Date.now());

      if (isLocked) {
        const hasCoreChange = 
          (birth_date !== undefined && userRow.birth_date && birth_date !== userRow.birth_date) ||
          (gender !== undefined && userRow.gender && gender !== userRow.gender) ||
          (university !== undefined && userRow.university && university !== userRow.university) ||
          (major !== undefined && userRow.major && major !== userRow.major);

        if (hasCoreChange) {
          return res.status(403).json({
            success: false,
            message: \`Hồ sơ nhân khẩu học cốt lõi (Ngày sinh, Giới tính, Trường học, Ngành học) đang bị khóa đến \${userRow.demographic_locked_until} để đảm bảo tính trung thực của dữ liệu khảo sát. Bạn chỉ có thể cập nhật các thông tin khác.\`
          });
        }
      }

      // Chuẩn bị dữ liệu cập nhật
      const newGender = gender !== undefined ? String(gender).trim() : userRow.gender;
      const newBirthDate = birth_date !== undefined ? String(birth_date).trim() : userRow.birth_date;
      const newProvince = province !== undefined ? String(province).trim() : userRow.province;
      const newOccupation = occupation !== undefined ? String(occupation).trim() : userRow.occupation;
      const newUniversity = university !== undefined ? String(university).trim() : userRow.university;
      const newMajor = major !== undefined ? String(major).trim() : userRow.major;
      const newGradYear = graduation_year !== undefined ? Number(graduation_year) || null : userRow.graduation_year;
      const newMonthlyIncome = monthly_income !== undefined ? String(monthly_income).trim() : userRow.monthly_income;

      // Kiểm tra xem đã điền đủ 100% các trường chưa
      const isComplete = Boolean(
        newGender &&
        newBirthDate &&
        newProvince &&
        newOccupation &&
        newUniversity &&
        newMajor &&
        newGradYear &&
        newMonthlyIncome
      );

      let profileCompleted = userRow.profile_completed || 0;
      let demographicLockedUntil = userRow.demographic_locked_until;
      let freeQuotaRemaining = userRow.free_quota_remaining || 0;
      let rewardGranted = false;
      let rewardMessage = '';

      // Khi điền đủ 100% các trường:
      if (isComplete) {
        profileCompleted = 1;
        const lockDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        demographicLockedUntil = lockDate.toISOString();

        // Cấp lượt miễn phí nếu lần đầu tiên hoàn tất (profile_completed chuyển từ 0 lên 1)
        if (userRow.profile_completed !== 1) {
          rewardGranted = true;
          if (userRow.account_tier === 'STUDENT') {
            freeQuotaRemaining = Math.max(freeQuotaRemaining, 30);
            rewardMessage = 'Bạn đã hoàn thiện 100% hồ sơ và được mở khóa 30 lượt điền form miễn phí/tháng của Gói Sinh Viên!';
          } else {
            // PERSONAL hoặc mặc định
            freeQuotaRemaining = Math.max(freeQuotaRemaining, 25);
            rewardMessage = 'Bạn đã hoàn thiện 100% hồ sơ và được mở khóa 25 lượt điền form miễn phí đầu tay của Gói Cá Nhân!';
          }
        }
      }

      // Cập nhật cả demographics_json để tương thích ngược
      const demographicsObj = {
        gender: newGender,
        birth_date: newBirthDate,
        birth_year: newBirthDate ? parseInt(newBirthDate.split('-')[0]) : null,
        province: newProvince,
        province_code: newProvince,
        occupation: newOccupation,
        university: newUniversity,
        university_code: newUniversity,
        major: newMajor,
        major_category: newMajor,
        graduation_year: newGradYear,
        monthly_income: newMonthlyIncome
      };

      db.prepare(\`
        UPDATE users 
        SET gender = ?,
            birth_date = ?,
            province = ?,
            occupation = ?,
            university = ?,
            major = ?,
            graduation_year = ?,
            monthly_income = ?,
            profile_completed = ?,
            demographic_locked_until = ?,
            free_quota_remaining = ?,
            demographics_json = ?
        WHERE id = ?
      \`).run(
        newGender,
        newBirthDate,
        newProvince,
        newOccupation,
        newUniversity,
        newMajor,
        newGradYear,
        newMonthlyIncome,
        profileCompleted,
        demographicLockedUntil,
        freeQuotaRemaining,
        JSON.stringify(demographicsObj),
        user.id
      );

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      delete updatedUser.password_hash;
      delete updatedUser.email_otp;
      delete updatedUser.student_otp;

      return res.json({
        success: true,
        message: rewardGranted 
          ? \`Cập nhật hồ sơ thành công! \${rewardMessage}\` 
          : 'Cập nhật hồ sơ nhân khẩu học thành công',
        isComplete,
        rewardGranted,
        user: {
          ...updatedUser,
          demographics: demographicsObj
        }
      });
    } catch (err) {
      console.error('Lỗi updateDemographicProfile:', err);
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật hồ sơ cá nhân: ' + err.message });
    }
  }

  /**
   * Đăng ký / Nâng cấp Hồ sơ Doanh nghiệp 2 Cấp độ
   * Cấp độ 1: Hồ sơ thương hiệu cơ bản (brand_name, industry, website_url, contact_phone) -> Kích hoạt ngay lập tức
   * Cấp độ 2: Định danh pháp nhân & thuế (company_legal_name, tax_id, headquarters_address, invoice_email) -> Mở quyền xuất VAT
   */
  async registerEnterpriseProfile(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để cập nhật hồ sơ doanh nghiệp' });
      }

      const {
        level = 1,
        brand_name,
        industry,
        website_url,
        contact_phone,
        company_legal_name,
        tax_id,
        headquarters_address,
        invoice_email
      } = req.body;

      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      if (!userRow) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      const targetLevel = Number(level) || 1;

      if (targetLevel === 2) {
        // Cấp độ 2: Định danh pháp nhân & thuế
        if (!company_legal_name || !tax_id || !headquarters_address || !invoice_email) {
          return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp đầy đủ: Tên pháp nhân công ty, Mã số thuế, Địa chỉ trụ sở và Email nhận hóa đơn'
          });
        }

        const cleanTaxId = String(tax_id).trim().replace(/\\s+/g, '');
        // Kiểm tra định dạng MST: 10 chữ số hoặc 13 chữ số (VD: 0101234567 hoặc 0101234567-001 hoặc 0101234567001)
        const taxIdRegex = /^(\\d{10}|\\d{13}|\\d{10}-\\d{3})$/;
        if (!taxIdRegex.test(cleanTaxId)) {
          return res.status(400).json({
            success: false,
            message: 'Mã số thuế không hợp lệ. Mã số thuế doanh nghiệp phải gồm 10 hoặc 13 chữ số.'
          });
        }

        const cleanInvoiceEmail = String(invoice_email).trim().toLowerCase();
        if (!cleanInvoiceEmail.includes('@')) {
          return res.status(400).json({
            success: false,
            message: 'Email nhận hóa đơn điện tử không hợp lệ'
          });
        }

        db.prepare(\`
          UPDATE users 
          SET account_tier = 'ENTERPRISE',
              enterprise_verify_level = 2,
              has_vip_enterprise = 1,
              company_legal_name = ?,
              tax_id = ?,
              headquarters_address = ?,
              invoice_email = ?,
              brand_name = COALESCE(?, brand_name, ?),
              industry = COALESCE(?, industry, 'Khác'),
              website_url = COALESCE(?, website_url),
              contact_phone = COALESCE(?, contact_phone)
          WHERE id = ?
        \`).run(
          String(company_legal_name).trim(),
          cleanTaxId,
          String(headquarters_address).trim(),
          cleanInvoiceEmail,
          brand_name ? String(brand_name).trim() : null,
          String(company_legal_name).trim(),
          industry ? String(industry).trim() : null,
          website_url ? String(website_url).trim() : null,
          contact_phone ? String(contact_phone).trim() : null,
          user.id
        );

        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        delete updatedUser.password_hash;
        delete updatedUser.email_otp;
        delete updatedUser.student_otp;

        return res.json({
          success: true,
          message: 'Xác thực hồ sơ doanh nghiệp Cấp độ 2 thành công! Đã kích hoạt quyền xuất hóa đơn VAT và mở khóa toàn diện Gói Doanh Nghiệp.',
          enterprise_level: 2,
          user: updatedUser
        });
      }

      // Cấp độ 1: Hồ sơ thương hiệu cơ bản
      if (!brand_name || !industry) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp Tên thương hiệu/Tổ chức và Lĩnh vực hoạt động'
        });
      }

      const currentVerifyLevel = Math.max(userRow.enterprise_verify_level || 0, 1);

      db.prepare(\`
        UPDATE users 
        SET account_tier = 'ENTERPRISE',
            enterprise_verify_level = ?,
            has_vip_enterprise = 1,
            brand_name = ?,
            industry = ?,
            website_url = ?,
            contact_phone = ?
        WHERE id = ?
      \`).run(
        currentVerifyLevel,
        String(brand_name).trim(),
        String(industry).trim(),
        website_url ? String(website_url).trim() : null,
        contact_phone ? String(contact_phone).trim() : null,
        user.id
      );

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      delete updatedUser.password_hash;
      delete updatedUser.email_otp;
      delete updatedUser.student_otp;

      return res.json({
        success: true,
        message: 'Kích hoạt hồ sơ doanh nghiệp Cấp độ 1 thành công! Bạn có thể sử dụng đầy đủ các tính năng của Gói Doanh Nghiệp ngay bây giờ.',
        enterprise_level: currentVerifyLevel,
        user: updatedUser
      });
    } catch (err) {
      console.error('Lỗi registerEnterpriseProfile:', err);
      return res.status(500).json({ success: false, message: 'Lỗi đăng ký hồ sơ doanh nghiệp: ' + err.message });
    }
  }
`;

// Chèn trước dấu đóng class cuối cùng
const newContent = content.slice(0, lastBraceIdx) + newMethods + '\n' + content.slice(lastBraceIdx);
fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('Đã cập nhật authController.js thành công');
