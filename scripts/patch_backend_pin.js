const fs = require('fs');

console.log('--- 1. Cập nhật backend: Thêm API pin / unpin survey ---');

// A. server/controllers/surveyController.js
let sc = fs.readFileSync('server/controllers/surveyController.js', 'utf8');

const pinMethods = `
  /**
   * Ghim khảo sát lên đầu trang (Ưu tiên / Nổi bật)
   * Trừ 1 vé fast_track_tickets hoặc thu 50.000đ Credit ví Creator. Admin miễn phí.
   */
  pinSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT id, creator_id, title, is_pinned FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      if (user.role !== 'ADMIN' && survey.creator_id !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý bài khảo sát này' });
      }

      if (survey.is_pinned === 1) {
        return res.json({ success: true, message: 'Khảo sát này hiện đã được ghim trên đầu trang rồi', is_pinned: 1 });
      }

      let usedTicket = false;
      let chargedCredit = false;

      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        if (user.role !== 'ADMIN') {
          const u = db.prepare('SELECT credit_balance, fast_track_tickets FROM users WHERE id = ?').get(user.id);
          const tickets = u.fast_track_tickets || 0;
          if (tickets > 0) {
            db.prepare('UPDATE users SET fast_track_tickets = fast_track_tickets - 1 WHERE id = ?').run(user.id);
            usedTicket = true;
          } else {
            const PIN_FEE = 50000;
            if (u.credit_balance < PIN_FEE) {
              throw new Error('Số dư ví không đủ 50.000đ để ghim bài. Vui lòng nạp thêm credit hoặc nạp theo gói để nhận vé ghim miễn phí!');
            }
            db.prepare('UPDATE users SET credit_balance = credit_balance - ? WHERE id = ?').run(PIN_FEE, user.id);
            chargedCredit = true;

            const crypto = require('crypto');
            const txId = crypto.randomUUID();
            db.prepare(\`
              INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
              VALUES (?, ?, ?, 'PIN_SURVEY_FEE', 'VND', ?, ?, ?)
            \`).run(txId, user.id, id, PIN_FEE, u.credit_balance - PIN_FEE, \`Phí ghim khảo sát lên vị trí VIP đầu trang: \${survey.title}\`);
          }
        }

        db.prepare('UPDATE surveys SET is_pinned = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        db.exec('COMMIT');

        const updatedUser = db.prepare('SELECT credit_balance, fast_track_tickets FROM users WHERE id = ?').get(user.id);

        return res.json({
          success: true,
          message: usedTicket 
            ? 'Đã trừ 1 vé ghim ưu tiên và đưa khảo sát lên vị trí VIP đầu trang!' 
            : chargedCredit 
              ? 'Đã thanh toán 50.000đ phí ghim và đưa khảo sát lên vị trí VIP đầu trang!'
              : 'Admin đã ghim khảo sát lên vị trí VIP đầu trang thành công!',
          is_pinned: 1,
          usedTicket,
          chargedCredit,
          fast_track_tickets: updatedUser ? updatedUser.fast_track_tickets : 0,
          credit_balance: updatedUser ? updatedUser.credit_balance : 0
        });
      } catch (innerErr) {
        db.exec('ROLLBACK');
        throw innerErr;
      }
    } catch (err) {
      console.error('Lỗi pinSurvey:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Gỡ ghim khảo sát khỏi đầu trang
   */
  unpinSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT id, creator_id, title, is_pinned FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      if (user.role !== 'ADMIN' && survey.creator_id !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền quản trị bài khảo sát này' });
      }

      db.prepare('UPDATE surveys SET is_pinned = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

      return res.json({
        success: true,
        message: 'Đã gỡ ghim khảo sát về danh sách thông thường thành công!',
        is_pinned: 0
      });
    } catch (err) {
      console.error('Lỗi unpinSurvey:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
`;

if (!sc.includes('pinSurvey(req, res)')) {
  sc = sc.replace('module.exports = new SurveyController();', pinMethods + '\n}\n\nmodule.exports = new SurveyController();');
  // Xóa bớt 1 dấu } thừa nếu có
  sc = sc.replace(/\n\}\n\}\n\nmodule\.exports = new SurveyController\(\);/, '\n}\n\nmodule.exports = new SurveyController();');
  fs.writeFileSync('server/controllers/surveyController.js', sc, 'utf8');
  console.log('✅ Đã thêm pinSurvey và unpinSurvey vào surveyController.js');
}

// B. server/routes/api.js
let api = fs.readFileSync('server/routes/api.js', 'utf8');
if (!api.includes('/surveys/:id/pin')) {
  api = api.replace(
    "router.post('/surveys/:id/boost-fast-track', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.boostFastTrack(req, res));",
    `router.post('/surveys/:id/boost-fast-track', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.boostFastTrack(req, res));
router.post('/surveys/:id/pin', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.pinSurvey(req, res));
router.post('/surveys/:id/unpin', authenticateToken, requireRole(['RESPONDENT', 'CREATOR', 'ADMIN']), (req, res) => surveyController.unpinSurvey(req, res));`
  );
  fs.writeFileSync('server/routes/api.js', api, 'utf8');
  console.log('✅ Đã thêm routes /surveys/:id/pin và /surveys/:id/unpin vào api.js');
}
