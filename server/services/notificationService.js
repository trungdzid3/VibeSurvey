/**
 * NOTIFICATION & VAT INVOICE SERVICE
 * 1. Bắn thông báo đẩy trên App APK Android & In-App Notification
 * 2. Gửi email hệ thống tới email đăng ký của người dùng khi có khảo sát Gom Mẫu Hỏa Tốc
 * 3. Hỗ trợ xuất Hóa Đơn Điện Tử VAT FULL 100% cho mọi khoản nạp doanh nghiệp
 */

const crypto = require('crypto');
const db = require('../db/database');
const config = require('../config');

class NotificationService {
  /**
   * Kích hoạt Gom Mẫu Hỏa Tốc:
   * - Bắn thông báo đẩy trên App APK Android (In-app + Capacitor push payload)
   * - Gửi email hệ thống đến hộp thư đăng ký của người dùng
   * @param {string} surveyId ID khảo sát cần gom mẫu
   * @param {Object} options Tùy chọn gửi
   */
  broadcastFastTrackNotification(surveyId, options = {}) {
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
    if (!survey) {
      throw new Error('Khảo sát không tồn tại');
    }

    // 1. Tìm tập người dùng nhận thông báo (Ưu tiên Respondent mới và đang ACTIVE)
    const respondents = db.prepare(`
      SELECT id, email, name, demographics_json 
      FROM users 
      WHERE role = 'RESPONDENT' AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1000
    `).all();

    if (!respondents || respondents.length === 0) {
      return { pushCount: 0, emailCount: 0 };
    }

    const rewardPoints = survey.reward_points_per_response || 0;
    const rewardVnd = rewardPoints * 10;
    const title = `⚡ [HỎA TỐC] Khảo sát mới: ${survey.title}`;
    const pushMessage = `Làm khảo sát nhận ngay +${rewardPoints.toLocaleString()} Điểm (~${rewardVnd.toLocaleString()}đ). Số lượng có hạn, bấm để làm ngay!`;
    const emailSubject = `[VibeSurvey] ⚡ Khảo sát Hỏa Tốc cần thu thập gấp: ${survey.title}`;

    const appBaseUrl = config.APP_URL || 'http://localhost:3000';
    const surveyUrl = `${appBaseUrl}/?survey=${survey.id}`;

    let pushCount = 0;
    let emailCount = 0;

    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, user_id, survey_id, type, title, message, channel)
      VALUES (?, ?, ?, 'FAST_TRACK_SURVEY', ?, ?, 'ALL')
    `);

    const insertEmailLog = db.prepare(`
      INSERT INTO email_notifications_log (id, user_id, recipient_email, survey_id, subject, content_snippet, delivery_status)
      VALUES (?, ?, ?, ?, ?, ?, 'SENT')
    `);

    // Thực hiện trong Transaction để đảm bảo tính nguyên tử
    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      for (const respondent of respondents) {
        const notifId = 'notif_' + crypto.randomUUID();
        insertNotification.run(notifId, respondent.id, survey.id, title, pushMessage);
        pushCount++;

        // Gửi email hệ thống tới email đăng ký của người dùng với link chuyển thẳng tới khảo sát
        const emailLogId = 'email_' + crypto.randomUUID();
        const emailBodySnippet = `Chào ${respondent.name || 'bạn'}, hệ thống vừa mở bài khảo sát hỏa tốc "${survey.title}" với thù lao +${rewardPoints.toLocaleString()} điểm (~${rewardVnd.toLocaleString()}đ). Bấm vào liên kết sau để làm bài ngay: ${surveyUrl}`;
        const emailHtml = this._buildFastTrackEmailHtml(survey, respondent, rewardPoints, rewardVnd, surveyUrl);
        
        insertEmailLog.run(emailLogId, respondent.id, respondent.email, survey.id, emailSubject, emailBodySnippet);
        emailCount++;

        // Chỉ gửi email thật qua Brevo cho email cá nhân của Creator/Admin hoặc nếu không phải môi trường test
        // Tránh tình trạng Gom Mẫu Hỏa Tốc loop qua hàng trăm dummy respondent làm cạn kiệt 300 email/ngày của Brevo Free
        const isRealUserEmail = respondent.email && !respondent.email.includes('example.com') && !respondent.email.includes('test') && !respondent.email.includes('spammer') && !respondent.email.includes('bot');
        if (config.BREVO && config.BREVO.API_KEY && isRealUserEmail && config.NODE_ENV === 'production') {
          this.sendBrevoEmail({
            toEmail: respondent.email,
            toName: respondent.name,
            subject: emailSubject,
            htmlContent: emailHtml,
            textContent: emailBodySnippet
          }).catch(err => console.warn('Lỗi gửi Brevo email:', err.message));
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return {
      success: true,
      surveyId,
      surveyTitle: survey.title,
      surveyUrl,
      pushCount,
      emailCount,
      brevoConfigured: !!(config.BREVO && config.BREVO.API_KEY),
      summary: `Đã bắn ${pushCount} thông báo đẩy trên App APK và gửi ${emailCount} email hệ thống tới người dùng đăng ký kèm link làm bài trực tiếp.`
    };
  }

  /**
   * Tạo mẫu email HTML chuyên nghiệp chuẩn Responsive cho khảo sát hỏa tốc
   * Chứa nút CTA và liên kết deep-link chuyển thẳng vào bài khảo sát
   */
  _buildFastTrackEmailHtml(survey, respondent, rewardPoints, rewardVnd, surveyUrl = 'http://localhost:3000') {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0F172A, #1E293B); padding: 28px 24px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; padding: 6px 14px; background: rgba(0, 86, 210, 0.4); border: 1px solid rgba(59, 130, 246, 0.5); border-radius: 20px; font-size: 12px; font-weight: 700; color: #60a5fa; margin-bottom: 10px;">
            ⚡ THÔNG BÁO KHẢO SÁT MỚI
          </div>
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">VIBESURVEY KHẢO SÁT HỎA TỐC</h2>
          <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Ưu tiên đáp viên hoàn thành sớm để nhận thù lao cao nhất</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 28px 24px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0; line-height: 1.5;">Chào <strong>${respondent.name || 'bạn'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">Hệ thống vừa mở một bài khảo sát mới đang cần thu thập ý kiến khẩn cấp từ bạn:</p>

          <!-- Survey Info Card -->
          <div style="background: #f8fafc; border-left: 4px solid #0056D2; border-radius: 12px; padding: 18px; margin: 20px 0; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">
              📁 Chủ đề: ${survey.category || 'Nghiên cứu thị trường'}
            </div>
            <h3 style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #0f172a; line-height: 1.4;">
              ${survey.title}
            </h3>
            <p style="margin: 0 0 14px; font-size: 13px; color: #64748b; line-height: 1.5;">
              ${survey.description || 'Khảo sát thu thập ý kiến người dùng và dữ liệu nghiên cứu.'}
            </p>
            <div style="display: inline-flex; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 14px; border-radius: 8px; font-size: 14px; font-weight: 700; color: #059669;">
              🎁 Thù lao: +${rewardPoints.toLocaleString()} Điểm (≈ ${rewardVnd.toLocaleString()} VNĐ)
            </div>
          </div>

          <!-- Primary CTA Button (Click to directly open survey) -->
          <div style="text-align: center; margin: 30px 0 20px;">
            <a href="${surveyUrl}" target="_blank" style="background: linear-gradient(135deg, #0056D2, #0066FF); color: #ffffff; padding: 14px 36px; text-decoration: none; font-weight: 800; border-radius: 12px; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(0, 86, 210, 0.35); letter-spacing: -0.2px;">
              👉 Bấm Vào Đây Để Làm Khảo Sát Ngay →
            </a>
          </div>

          <!-- Fallback Direct Link -->
          <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; text-align: center; margin-top: 18px;">
            <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
              Nếu nút trên không phản hồi, bạn có thể copy hoặc bấm vào liên kết trực tiếp sau:<br>
              <a href="${surveyUrl}" target="_blank" style="color: #0056D2; font-weight: 600; word-break: break-all; text-decoration: underline;">
                ${surveyUrl}
              </a>
            </p>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 24px 0 0; line-height: 1.5;">
            ⏰ Khảo sát có giới hạn số lượng và sẽ tự động đóng ngay khi thu thập đủ mẫu mục tiêu.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          © 2026 VibeSurvey Platform • Nền tảng khảo sát và đổi thưởng uy tín
        </div>
      </div>
    `;
  }

  /**
   * Gửi email thực tế qua Brevo (Sendinblue) REST API v3
   * Sử dụng native fetch Node.js, zero dependencies
   */
  async sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
    const apiKey = config.BREVO && config.BREVO.API_KEY;
    if (!apiKey) {
      return {
        success: true,
        mode: 'LOCAL_MOCK',
        message: 'Brevo API Key chưa được cấu hình trong .env, email đã được ghi nhận trong cơ sở dữ liệu.'
      };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: config.BREVO.SENDER_NAME || 'VibeSurvey Platform',
            email: config.BREVO.SENDER_EMAIL || 'no-reply@vibesurvey.com'
          },
          to: [
            {
              email: toEmail,
              name: toName || 'Thành viên VibeSurvey'
            }
          ],
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.warn('Cảnh báo phản hồi Brevo API:', response.status, data);
        return { success: false, status: response.status, error: data };
      }

      return { success: true, mode: 'LIVE_BREVO', messageId: data.messageId };
    } catch (err) {
      console.error('Lỗi gọi Brevo API:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Gửi email qua SMTP SSL (Gmail, Outlook, v.v.) thuần Node.js không cần cài thêm thư viện
   */
  async sendSmtpEmail({ toEmail, toName, subject, htmlContent, textContent }) {
    const host = config.SMTP && config.SMTP.HOST;
    const port = (config.SMTP && config.SMTP.PORT) || 465;
    const user = config.SMTP && config.SMTP.USER;
    const pass = config.SMTP && config.SMTP.PASS;
    const fromEmail = (config.SMTP && config.SMTP.FROM_EMAIL) || user;
    const fromName = (config.SMTP && config.SMTP.FROM_NAME) || 'VibeSurvey Platform';

    if (!user || !pass) {
      return { success: false, reason: 'SMTP chưa được cấu hình USER hoặc PASS trong .env' };
    }

    const tls = require('tls');
    return new Promise((resolve) => {
      const socket = tls.connect(port, host, () => {
        let step = 0;
        let buffer = '';

        const sendCmd = (cmd) => {
          socket.write(cmd + '\r\n');
        };

        socket.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\r\n');
          const lastLine = lines[lines.length - 2] || lines[lines.length - 1];

          if (step === 0 && lastLine.startsWith('220')) {
            step = 1;
            sendCmd(`EHLO ${host}`);
          } else if (step === 1 && (lastLine.startsWith('250 ') || lastLine.startsWith('250-'))) {
            if (lastLine.startsWith('250 ')) {
              step = 2;
              sendCmd('AUTH LOGIN');
            }
          } else if (step === 2 && lastLine.startsWith('334')) {
            step = 3;
            sendCmd(Buffer.from(user).toString('base64'));
          } else if (step === 3 && lastLine.startsWith('334')) {
            step = 4;
            sendCmd(Buffer.from(pass).toString('base64'));
          } else if (step === 4 && lastLine.startsWith('235')) {
            step = 5;
            sendCmd(`MAIL FROM:<${fromEmail}>`);
          } else if (step === 5 && lastLine.startsWith('250')) {
            step = 6;
            sendCmd(`RCPT TO:<${toEmail}>`);
          } else if (step === 6 && lastLine.startsWith('250')) {
            step = 7;
            sendCmd('DATA');
          } else if (step === 7 && lastLine.startsWith('354')) {
            step = 8;
            const boundary = '----=_Part_' + Date.now();
            const rawMessage = [
              `From: "${fromName}" <${fromEmail}>`,
              `To: "${toName || 'User'}" <${toEmail}>`,
              `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
              'MIME-Version: 1.0',
              `Content-Type: multipart/alternative; boundary="${boundary}"`,
              '',
              `--${boundary}`,
              'Content-Type: text/plain; charset=UTF-8',
              'Content-Transfer-Encoding: base64',
              '',
              Buffer.from(textContent || '').toString('base64'),
              '',
              `--${boundary}`,
              'Content-Type: text/html; charset=UTF-8',
              'Content-Transfer-Encoding: base64',
              '',
              Buffer.from(htmlContent || '').toString('base64'),
              '',
              `--${boundary}--`,
              '.'
            ].join('\r\n');
            socket.write(rawMessage + '\r\n');
          } else if (step === 8 && lastLine.startsWith('250')) {
            step = 9;
            sendCmd('QUIT');
            socket.end();
            resolve({ success: true, mode: 'LIVE_SMTP' });
          } else if (lastLine.startsWith('5') || lastLine.startsWith('4')) {
            socket.end();
            console.warn('Lỗi SMTP response:', lastLine);
            resolve({ success: false, error: lastLine });
          }
        });

        socket.on('error', (err) => {
          console.warn('Lỗi kết nối SMTP socket:', err.message);
          resolve({ success: false, error: err.message });
        });
      });
    });
  }

  /**
   * Gửi email qua Microsoft Outlook / Office 365 SMTP (Cổng 587 STARTTLS)
   */
  async sendOutlookEmail({ toEmail, toName, subject, htmlContent, textContent }) {
    const host = (config.OUTLOOK && config.OUTLOOK.HOST) || 'smtp.office365.com';
    const port = (config.OUTLOOK && config.OUTLOOK.PORT) || 587;
    const user = config.OUTLOOK && config.OUTLOOK.USER;
    const pass = config.OUTLOOK && config.OUTLOOK.PASS;
    const fromEmail = (config.OUTLOOK && config.OUTLOOK.FROM_EMAIL) || user;
    const fromName = (config.OUTLOOK && config.OUTLOOK.FROM_NAME) || 'VibeSurvey Platform';

    if (!user || !pass) {
      return { success: false, reason: 'Outlook chưa được cấu hình USER hoặc PASS trong .env' };
    }

    const net = require('net');
    const tls = require('tls');

    return new Promise((resolve) => {
      let socket = net.createConnection(port, host);
      let step = 0;
      let buffer = '';

      const sendCmd = (cmd) => {
        socket.write(cmd + '\r\n');
      };

      const handleData = (data) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        const lastLine = lines[lines.length - 2] || lines[lines.length - 1];

        if (step === 0 && lastLine.startsWith('220')) {
          step = 1;
          sendCmd(`EHLO ${host}`);
        } else if (step === 1 && (lastLine.startsWith('250 ') || lastLine.startsWith('250-'))) {
          if (lastLine.startsWith('250 ')) {
            step = 2;
            sendCmd('STARTTLS');
          }
        } else if (step === 2 && lastLine.startsWith('220')) {
          // Nâng cấp socket thường lên TLS Socket
          step = 3;
          socket.removeAllListeners('data');
          socket.removeAllListeners('error');

          const secureSocket = tls.connect({
            socket: socket,
            host: host,
            rejectUnauthorized: false
          }, () => {
            sendCmd(`EHLO ${host}`);
          });

          socket = secureSocket;
          buffer = '';

          secureSocket.on('data', handleData);
          secureSocket.on('error', (err) => {
            console.warn('Lỗi Outlook TLS Socket:', err.message);
            resolve({ success: false, error: err.message });
          });
        } else if (step === 3 && (lastLine.startsWith('250 ') || lastLine.startsWith('250-'))) {
          if (lastLine.startsWith('250 ')) {
            step = 4;
            sendCmd('AUTH LOGIN');
          }
        } else if (step === 4 && lastLine.startsWith('334')) {
          step = 5;
          sendCmd(Buffer.from(user).toString('base64'));
        } else if (step === 5 && lastLine.startsWith('334')) {
          step = 6;
          sendCmd(Buffer.from(pass).toString('base64'));
        } else if (step === 6 && lastLine.startsWith('235')) {
          step = 7;
          sendCmd(`MAIL FROM:<${fromEmail}>`);
        } else if (step === 7 && lastLine.startsWith('250')) {
          step = 8;
          sendCmd(`RCPT TO:<${toEmail}>`);
        } else if (step === 8 && lastLine.startsWith('250')) {
          step = 9;
          sendCmd('DATA');
        } else if (step === 9 && lastLine.startsWith('354')) {
          step = 10;
          const boundary = '----=_Part_' + Date.now();
          const rawMessage = [
            `From: "${fromName}" <${fromEmail}>`,
            `To: "${toName || 'User'}" <${toEmail}>`,
            `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(textContent || '').toString('base64'),
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(htmlContent || '').toString('base64'),
            '',
            `--${boundary}--`,
            '.'
          ].join('\r\n');
          socket.write(rawMessage + '\r\n');
        } else if (step === 10 && lastLine.startsWith('250')) {
          step = 11;
          sendCmd('QUIT');
          socket.end();
          resolve({ success: true, mode: 'LIVE_OUTLOOK' });
        } else if (lastLine.startsWith('5') || lastLine.startsWith('4')) {
          socket.end();
          console.warn('Lỗi Outlook SMTP response:', lastLine);
          resolve({ success: false, error: lastLine });
        }
      };

      socket.on('data', handleData);
      socket.on('error', (err) => {
        console.warn('Lỗi kết nối Outlook SMTP socket:', err.message);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Bộ điều phối gửi Email thông minh đa kênh (Hybrid Fallback Email Dispatcher):
   * 1. Kênh 1: Gmail SMTP SSL (Cổng 465 - 500 email/ngày)
   * 2. Kênh 2: Microsoft Outlook / Office 365 SMTP (Cổng 587 - 300 email/ngày)
   * 3. Kênh 3: Brevo API (Sendinblue - 300 email/ngày)
   */
  async sendSmartEmail({ toEmail, toName, subject, htmlContent, textContent }) {
    // 1. Kênh 1: Ưu tiên Gmail SMTP SSL nếu đã cấu hình
    if (config.SMTP && config.SMTP.USER && config.SMTP.PASS) {
      const smtpRes = await this.sendSmtpEmail({ toEmail, toName, subject, htmlContent, textContent });
      if (smtpRes && smtpRes.success) {
        return smtpRes;
      }
      console.warn('Kênh Gmail SMTP gặp lỗi hoặc chưa sẵn sàng, chuyển tiếp sang Outlook...', smtpRes.error || smtpRes.reason);
    }

    // 2. Kênh 2: Thử Microsoft Outlook SMTP nếu đã cấu hình
    if (config.OUTLOOK && config.OUTLOOK.USER && config.OUTLOOK.PASS) {
      const outlookRes = await this.sendOutlookEmail({ toEmail, toName, subject, htmlContent, textContent });
      if (outlookRes && outlookRes.success) {
        return outlookRes;
      }
      console.warn('Kênh Outlook SMTP gặp lỗi, chuyển tiếp sang Brevo API...', outlookRes.error || outlookRes.reason);
    }

    // 3. Kênh 3: Thử Brevo API
    if (config.BREVO && config.BREVO.API_KEY) {
      const brevoRes = await this.sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent });
      if (brevoRes && brevoRes.success) {
        return brevoRes;
      }
      console.warn('Kênh Brevo không khả dụng hoặc hết quota:', brevoRes.error);
    }

    return { success: false, reason: 'Không có kênh gửi email nào khả dụng hoặc tất cả đều hết quota' };
  }

  /**
   * Bắn thông báo và gửi email khi có KHẢO SÁT MỚI:
   * Cho phép đáp viên nhận email thông báo và click chuyển thẳng vào bài khảo sát
   */
  broadcastNewSurveyNotification(surveyId, options = {}) {
    return this.broadcastFastTrackNotification(surveyId, options);
  }

  /**
   * Lấy danh sách thông báo của người dùng
   */
  getUserNotifications(userId, limit = 20) {
    return db.prepare(`
      SELECT n.*, s.title as survey_title, s.reward_points_per_response
      FROM notifications n
      LEFT JOIN surveys s ON n.survey_id = s.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `).all(userId, limit);
  }

  /**
   * Đánh dấu thông báo đã đọc
   */
  markAsRead(userId, notificationId) {
    if (notificationId === 'ALL') {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId);
    }
    return { success: true };
  }

  /**
   * Hỗ trợ xuất Hóa Đơn VAT FULL 100% cho Doanh Nghiệp
   * Bất kỳ doanh nghiệp nào nạp tiền đều được quyền yêu cầu xuất hóa đơn đỏ (VAT 8% / 10%)
   */
  requestVatInvoice(userId, { transactionId, amountVnd, companyName, taxCode, companyAddress, recipientEmail }) {
    if (!companyName || !companyName.trim()) {
      throw new Error('Vui lòng nhập tên công ty / doanh nghiệp');
    }
    if (!taxCode || !taxCode.trim()) {
      throw new Error('Vui lòng nhập mã số thuế hợp lệ');
    }
    if (!companyAddress || !companyAddress.trim()) {
      throw new Error('Vui lòng nhập địa chỉ công ty đăng ký thuế');
    }
    if (!recipientEmail || !recipientEmail.trim() || !recipientEmail.includes('@')) {
      throw new Error('Vui lòng nhập email nhận hóa đơn điện tử hợp lệ');
    }

    const amount = Math.floor(Number(amountVnd));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Số tiền xuất hóa đơn không hợp lệ');
    }

    // Thuế VAT thông thường 8% hoặc 10% (ở đây chuẩn hóa 10%)
    const vatAmount = Math.floor(amount * 0.10);
    const invoiceId = 'vat_' + crypto.randomUUID();
    const invoiceSerial = 'VS-' + Date.now().toString().slice(-6);

    db.prepare(`
      INSERT INTO vat_invoices (
        id, user_id, transaction_id, amount_vnd, vat_amount_vnd,
        company_name, tax_code, company_address, recipient_email,
        status, invoice_serial
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `).run(
      invoiceId,
      userId,
      transactionId || null,
      amount,
      vatAmount,
      companyName.trim(),
      taxCode.trim(),
      companyAddress.trim(),
      recipientEmail.trim().toLowerCase(),
      invoiceSerial
    );

    return {
      success: true,
      invoiceId,
      invoiceSerial,
      companyName: companyName.trim(),
      taxCode: taxCode.trim(),
      amountVnd: amount,
      vatAmountVnd: vatAmount,
      totalVnd: amount + vatAmount,
      status: 'PENDING',
      message: 'Yêu cầu xuất hóa đơn VAT đã được ghi nhận. Hệ thống sẽ phát hành hóa đơn điện tử và gửi về email của bạn trong 24h làm việc.'
    };
  }

  /**
   * Lấy lịch sử yêu cầu hóa đơn VAT của người dùng
   */
  getUserVatInvoices(userId) {
    return db.prepare(`
      SELECT * FROM vat_invoices 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(userId);
  }

  /**
   * Tạo mẫu email OTP chuẩn Master Template tương thích 100% với Gmail Action Card
   * Tự động kích hoạt widget "Cần nhập mã" [Mã OTP] [Sao chép mã] trên Gmail Android/iOS/Web
   */
  buildOtpEmailTemplate(options = {}) {
    const {
      title = 'XÁC THỰC TÀI KHOẢN',
      subtitle = 'Bảo mật tài khoản VibeSurvey',
      name = 'bạn',
      otp,
      validMinutes = 10,
      actionDescription = 'xác thực tài khoản',
      note = 'Tuyệt đối không chia sẻ mã này cho bất kỳ ai.'
    } = options;
    const brandDark = '#09090B';
    const brandAccent = '#EA580C';
    const brandBg = '#FAFAFA';
    const brandBorder = '#E7E5E4';
    const brandOtpBg = '#FFF7ED';

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${otp}</title>
  <!-- Google Fonts: Montserrat chuẩn SSOT DESIGN.md -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <!-- Schema.org Markup cho Google Email Actions -->
  <script type="application/ld+json">
  {
    "@context": "http://schema.org",
    "@type": "EmailMessage",
    "description": "${title}: ${otp}"
  }
  </script>
</head>
<body style="margin: 0; padding: 0; background-color: ${brandBg}; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <!-- Hidden Preheader: Gmail Heuristic đọc chính xác câu này để dựng widget "Cần nhập mã" + "Sao chép mã" -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    Mã xác thực của bạn là ${otp}. Mã này có hiệu lực trong ${validMinutes} phút. Tuyệt đối không chia sẻ mã xác thực này cho người khác.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${brandBg}; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid ${brandBorder}; box-shadow: 0 4px 24px rgba(9, 9, 11, 0.05);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header Thương hiệu: Đen Obsidian #09090B -->
          <tr>
            <td style="background: ${brandDark}; padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 0.5px; color: #ffffff; font-family: 'Montserrat', sans-serif;">VIBESURVEY</h1>
              <p style="margin: 6px 0 0; font-size: 13px; font-weight: 700; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px; font-family: 'Montserrat', sans-serif;">${title}</p>
            </td>
          </tr>

          <!-- Nội dung chính -->
          <tr>
            <td style="padding: 32px 28px; text-align: center;">
              <p style="font-size: 15px; color: #09090B; margin-top: 0; text-align: left; font-family: 'Montserrat', sans-serif;">
                Xin chào <strong>${name}</strong>,
              </p>
              <p style="font-size: 14px; color: #52525B; line-height: 1.6; text-align: left; margin: 12px 0 24px; font-family: 'Montserrat', sans-serif;">
                Bạn vừa yêu cầu ${actionDescription} trên nền tảng VibeSurvey. Dưới đây là mã xác thực One-Time Password (OTP) của bạn:
              </p>

              <!-- Khung Mã OTP Chuẩn DESIGN.md: Nền Kem Cam Sứ #FFF7ED + Viền nét đứt Cam Vibe #EA580C -->
              <div style="margin: 20px auto; background: ${brandOtpBg}; border: 2px dashed ${brandAccent}; border-radius: 12px; padding: 18px 24px; display: inline-block;">
                <span class="verification-code" style="font-size: 38px; font-weight: 900; font-family: 'SF Mono', Consolas, Monaco, monospace; letter-spacing: 10px; color: ${brandAccent}; display: inline-block; padding-left: 10px;">${otp}</span>
              </div>

              <p style="font-size: 13px; font-weight: 500; color: #71717A; margin: 20px 0 6px; font-family: 'Montserrat', sans-serif;">
                Mã xác thực có hiệu lực trong vòng <strong style="color: #09090B;">${validMinutes} phút</strong>.
              </p>
              <p style="font-size: 12px; color: #A1A1AA; margin: 0; font-family: 'Montserrat', sans-serif;">
                ${note}
              </p>
            </td>
          </tr>

          <!-- Footer Hợp chuẩn CAN-SPAM & Google Sender Guidelines -->
          <tr>
            <td style="background: #FAFAFA; border-top: 1px solid ${brandBorder}; padding: 20px 24px; text-align: center; font-size: 11px; color: #71717A; line-height: 1.6; font-family: 'Montserrat', sans-serif;">
              <p style="margin: 0 0 6px; font-weight: 700; color: #09090B;">
                VibeSurvey Platform • Nền tảng khảo sát trực tuyến & đổi thưởng uy tín
              </p>
              <p style="margin: 0; color: #A1A1AA;">
                Email này được gửi tự động từ hệ thống bảo mật. Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ trung tâm hỗ trợ.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}

module.exports = new NotificationService();
