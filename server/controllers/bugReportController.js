const crypto = require('crypto');
const db = require('../db/database');
const auditLogService = require('../services/auditLogService');

class BugReportController {
  /**
   * POST /api/v1/bug-reports
   * Tiếp nhận báo cáo lỗi / phản ánh sự cố từ người dùng (kèm đăng tải ảnh)
   */
  createBugReport(req, res) {
    try {
      const {
        title,
        description,
        category = 'OTHER',
        severity = 'MEDIUM',
        image_url = null,
        device_info = null,
        reporter_name = null,
        reporter_email = null
      } = req.body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề sự cố ngắn gọn' });
      }

      if (!description || typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ success: false, message: 'Vui lòng mô tả chi tiết sự cố bạn đang gặp phải' });
      }

      const validCategories = ['UI_UX', 'SURVEY', 'CREATOR_STUDIO', 'PAYMENT', 'AUTH', 'OTHER'];
      const finalCategory = validCategories.includes(category) ? category : 'OTHER';

      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const finalSeverity = validSeverities.includes(severity) ? severity : 'MEDIUM';

      const userId = req.user ? req.user.id : null;
      const finalReporterName = req.user 
        ? (req.user.full_name || req.user.email) 
        : (reporter_name ? reporter_name.trim() : 'Khách vãng lai');
      const finalReporterEmail = req.user 
        ? req.user.email 
        : (reporter_email ? reporter_email.trim() : null);

      const id = `bug_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const deviceInfoString = typeof device_info === 'object' && device_info !== null 
        ? JSON.stringify(device_info) 
        : (device_info || null);

      const stmt = db.prepare(`
        INSERT INTO bug_reports (
          id, user_id, reporter_name, reporter_email,
          category, severity, title, description,
          image_url, device_info, status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `);

      stmt.run(
        id, userId, finalReporterName, finalReporterEmail,
        finalCategory, finalSeverity, title.trim(), description.trim(),
        image_url ? image_url.trim() : null, deviceInfoString
      );

      // Tự động tạo thông báo gửi đến các tài khoản ADMIN
      try {
        const admins = db.prepare("SELECT id FROM users WHERE role = 'ADMIN'").all();
        if (admins && admins.length > 0) {
          const notifStmt = db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, survey_id)
            VALUES (?, ?, ?, ?, 'BUG_REPORT', 0, CURRENT_TIMESTAMP, ?)
          `);
          const notifId = `notif_bug_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
          for (const admin of admins) {
            notifStmt.run(
              `${notifId}_${admin.id.substring(0, 5)}`,
              admin.id,
              'Báo cáo sự cố mới từ người dùng',
              `[${finalCategory}] ${title.trim()} (${finalReporterName})`,
              id
            );
          }
        }
      } catch (notifErr) {
        console.error('Lỗi khi gửi thông báo nội bộ cho admin về bug report:', notifErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Báo cáo sự cố đã được gửi thành công! Đội ngũ kỹ thuật sẽ tiếp nhận và xử lý sớm nhất.',
        reportId: id
      });
    } catch (err) {
      console.error('Lỗi createBugReport:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi ghi nhận báo lỗi: ' + err.message });
    }
  }

  /**
   * GET /api/v1/bug-reports/my
   * Lấy lịch sử báo cáo lỗi của người dùng hiện tại
   */
  getMyBugReports(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để xem lịch sử báo lỗi' });
      }

      const reports = db.prepare(`
        SELECT id, category, severity, title, description, image_url, status, admin_notes, resolved_at, created_at, updated_at
        FROM bug_reports
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(req.user.id);

      return res.json({
        success: true,
        reports: reports || []
      });
    } catch (err) {
      console.error('Lỗi getMyBugReports:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy lịch sử báo lỗi: ' + err.message });
    }
  }

  /**
   * GET /api/v1/admin/bug-reports
   * Dành cho Quản trị viên: Lấy toàn bộ danh sách báo lỗi kèm bộ lọc và thống kê
   */
  getAdminBugReports(req, res) {
    try {
      const { status = 'ALL', category = 'ALL', severity = 'ALL', q = '', page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Xây dựng điều kiện lọc
      const conditions = [];
      const params = [];

      if (status && status !== 'ALL') {
        conditions.push('status = ?');
        params.push(status);
      }
      if (category && category !== 'ALL') {
        conditions.push('category = ?');
        params.push(category);
      }
      if (severity && severity !== 'ALL') {
        conditions.push('severity = ?');
        params.push(severity);
      }
      if (q && q.trim()) {
        conditions.push('(title LIKE ? OR description LIKE ? OR reporter_name LIKE ? OR reporter_email LIKE ?)');
        const searchPattern = `%${q.trim()}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Thống kê tổng số lượng theo từng trạng thái
      const stats = {
        total: 0,
        pending: 0,
        investigating: 0,
        resolved: 0,
        rejected: 0
      };

      try {
        const statsRow = db.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'INVESTIGATING' THEN 1 ELSE 0 END) as investigating,
            SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
          FROM bug_reports
        `).get();

        if (statsRow) {
          stats.total = statsRow.total || 0;
          stats.pending = statsRow.pending || 0;
          stats.investigating = statsRow.investigating || 0;
          stats.resolved = statsRow.resolved || 0;
          stats.rejected = statsRow.rejected || 0;
        }
      } catch (statsErr) {
        console.error('Lỗi tính stats bug_reports:', statsErr);
      }

      // Đếm số lượng theo bộ lọc hiện tại
      const countStmt = db.prepare(`SELECT COUNT(*) as count FROM bug_reports ${whereClause}`);
      const filteredTotal = (countStmt.get(...params)?.count) || 0;

      // Lấy dữ liệu phân trang
      const queryParams = [...params, limitNum, offset];
      const reports = db.prepare(`
        SELECT * FROM bug_reports
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(...queryParams);

      return res.json({
        success: true,
        reports: reports || [],
        stats,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredTotal,
          totalPages: Math.ceil(filteredTotal / limitNum) || 1
        }
      });
    } catch (err) {
      console.error('Lỗi getAdminBugReports:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách báo lỗi admin: ' + err.message });
    }
  }

  /**
   * GET /api/v1/admin/bug-reports/:id
   * Lấy chi tiết một báo cáo sự cố theo ID
   */
  getBugReportById(req, res) {
    try {
      const { id } = req.params;
      const report = db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(id);
      if (!report) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo sự cố yêu cầu' });
      }
      return res.json({ success: true, report });
    } catch (err) {
      console.error('Lỗi getBugReportById:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
    }
  }

  /**
   * PATCH /api/v1/admin/bug-reports/:id
   * Dành cho Quản trị viên: Cập nhật trạng thái và phản hồi lời nhắn cho người dùng
   */
  updateBugReportStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, admin_notes } = req.body;

      const report = db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(id);
      if (!report) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo sự cố yêu cầu' });
      }

      const validStatuses = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái xử lý không hợp lệ' });
      }

      const resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : report.resolved_at;
      const cleanNotes = typeof admin_notes === 'string' ? admin_notes.trim() : (report.admin_notes || '');

      db.prepare(`
        UPDATE bug_reports
        SET status = ?, admin_notes = ?, resolved_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, cleanNotes, resolvedAt, id);

      // Nếu có user_id, gửi thông báo cập nhật trực tiếp đến tài khoản người dùng
      if (report.user_id) {
        try {
          const statusLabels = {
            PENDING: 'Chờ tiếp nhận',
            INVESTIGATING: 'Đang kiểm tra & xử lý',
            RESOLVED: 'Đã khắc phục hoàn tất',
            REJECTED: 'Đã đóng / Không thể tái hiện'
          };
          const statusText = statusLabels[status] || status;
          const notifId = `notif_bugup_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
          const noteExcerpt = cleanNotes ? ` Lời nhắn từ kỹ thuật: "${cleanNotes}"` : '';

          db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, survey_id)
            VALUES (?, ?, ?, ?, 'BUG_UPDATE', 0, CURRENT_TIMESTAMP, ?)
          `).run(
            notifId,
            report.user_id,
            `Cập nhật báo cáo sự cố: ${statusText}`,
            `Sự cố "${report.title}" của bạn đã được chuyển sang trạng thái [${statusText}].${noteExcerpt}`,
            report.id
          );
        } catch (notifErr) {
          console.error('Lỗi gửi thông báo cho user khi cập nhật bug report:', notifErr.message);
        }
      }

      // Ghi vết nhật ký kiểm toán cho Quản trị viên
      auditLogService.logAction({
        admin_id: req.user ? req.user.id : 'ADMIN',
        admin_name: req.user ? req.user.name : 'Quản trị viên',
        action: 'UPDATE_BUG_REPORT_STATUS',
        target_type: 'BUG_REPORT',
        target_id: id,
        details: {
          previous_status: report.status,
          new_status: status,
          admin_notes: cleanNotes,
          report_title: report.title
        },
        ip_address: req.ip || req.headers['x-forwarded-for'] || null
      });

      return res.json({
        success: true,
        message: 'Đã cập nhật trạng thái sự cố thành công!'
      });
    } catch (err) {
      console.error('Lỗi updateBugReportStatus:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật báo lỗi: ' + err.message });
    }
  }

  /**
   * DELETE /api/v1/admin/bug-reports/:id
   * Xóa bản ghi báo cáo lỗi spam
   */
  deleteBugReport(req, res) {
    try {
      const { id } = req.params;
      const report = db.prepare('SELECT id, title, category, status FROM bug_reports WHERE id = ?').get(id);
      const result = db.prepare('DELETE FROM bug_reports WHERE id = ?').run(id);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo lỗi để xóa' });
      }

      // Ghi vết nhật ký kiểm toán cho Quản trị viên
      auditLogService.logAction({
        admin_id: req.user ? req.user.id : 'ADMIN',
        admin_name: req.user ? req.user.name : 'Quản trị viên',
        action: 'DELETE_BUG_REPORT',
        target_type: 'BUG_REPORT',
        target_id: id,
        details: {
          report_title: report ? report.title : null,
          category: report ? report.category : null
        },
        ip_address: req.ip || req.headers['x-forwarded-for'] || null
      });

      return res.json({ success: true, message: 'Đã xóa bản ghi báo cáo lỗi thành công' });
    } catch (err) {
      console.error('Lỗi deleteBugReport:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa báo lỗi: ' + err.message });
    }
  }
}

module.exports = new BugReportController();
