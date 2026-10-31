/**
 * Dich Vu Nhat Ky Hoat Dong Quan Tri Vien (Admin Audit Log Service)
 * Luu tru va truy van cac hanh dong nhay cam cua Admin nhu:
 * - Phe duyet / Tu choi lenh rut tien
 * - Khoa / Mo khoa tai khoan nguoi dung
 * - Duyet / Tu choi chien dich khao sat hoac voucher
 * - Dieu chinh diem / so du nguoi dung
 */

const crypto = require('crypto');
const db = require('../db/database');

class AuditLogService {
  /**
   * Ghi lai mot hanh dong cua quan tri vien
   * @param {Object} params
   * @param {string} params.admin_id - ID cua quan tri vien (bat buoc)
   * @param {string} [params.admin_name] - Ten hien thi cua quan tri vien
   * @param {string} params.action - Ten hanh dong (vi du: APPROVE_PAYOUT, BAN_USER) (bat buoc)
   * @param {string} [params.target_type] - Loai doi tuong bi tac dong (USER, SURVEY, PAYOUT, VOUCHER)
   * @param {string} [params.target_id] - ID cua doi tuong bi tac dong
   * @param {string|Object} [params.details] - Thong tin chi tiet hoac ly do
   * @param {string} [params.ip_address] - Dia chi IP thuc hien hanh dong
   * @returns {Object|null}
   */
  logAction({ admin_id, admin_name = null, action, target_type = null, target_id = null, details = null, ip_address = null }) {
    if (!admin_id || !action) {
      console.warn('[AuditLog] Bo qua ghi nhat ky: thieu admin_id hoac action');
      return null;
    }

    try {
      const id = crypto.randomUUID();
      let serializedDetails = details;
      if (details !== null && typeof details === 'object') {
        serializedDetails = JSON.stringify(details);
      } else if (details !== null) {
        serializedDetails = String(details);
      }

      const stmt = db.prepare(`
        INSERT INTO admin_audit_logs (
          id, admin_id, admin_name, action, target_type, target_id, details, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        String(admin_id),
        admin_name ? String(admin_name) : null,
        String(action),
        target_type ? String(target_type) : null,
        target_id ? String(target_id) : null,
        serializedDetails,
        ip_address ? String(ip_address) : null
      );

      return {
        id,
        admin_id,
        admin_name,
        action,
        target_type,
        target_id,
        details: serializedDetails,
        ip_address
      };
    } catch (err) {
      console.error('[AuditLog] Loi khi ghi nhat ky quan tri:', err.message);
      return null;
    }
  }

  /**
   * Lay danh sach cac ban ghi nhat ky quan tri gan day
   * @param {Object} [options]
   * @param {number} [options.limit=50] - So luong ban ghi toi da
   * @param {number} [options.offset=0] - Vi tri bat dau
   * @param {string} [options.admin_id] - Loc theo ID quan tri vien
   * @param {string} [options.action] - Loc theo hanh dong
   * @param {string} [options.target_type] - Loc theo loai doi tuong
   * @param {string} [options.search] - Tu khoa tim kiem tu do
   * @returns {Array<Object>}
   */
  getRecentLogs({ limit = 50, offset = 0, admin_id = null, action = null, target_type = null, search = null } = {}) {
    try {
      const conditions = [];
      const params = [];

      if (admin_id) {
        conditions.push('admin_id = ?');
        params.push(admin_id);
      }
      if (action) {
        conditions.push('action = ?');
        params.push(action);
      }
      if (target_type) {
        conditions.push('target_type = ?');
        params.push(target_type);
      }
      if (search) {
        conditions.push('(action LIKE ? OR admin_name LIKE ? OR target_id LIKE ? OR details LIKE ? OR ip_address LIKE ?)');
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
      const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

      const sql = `
        SELECT id, admin_id, admin_name, action, target_type, target_id, details, ip_address, created_at
        FROM admin_audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(safeLimit, safeOffset);
      const rows = db.prepare(sql).all(...params);

      // Tu dong chuyen chuoi JSON trong details thanh object neu hop le
      return rows.map((row) => {
        let parsedDetails = row.details;
        if (row.details && typeof row.details === 'string') {
          try {
            parsedDetails = JSON.parse(row.details);
          } catch {
            // Giu nguyen dang chuoi neu khong phai JSON hop le
          }
        }
        return {
          ...row,
          details: parsedDetails
        };
      });
    } catch (err) {
      console.error('[AuditLog] Loi khi lay nhat ky quan tri:', err.message);
      return [];
    }
  }

  /**
   * Dem tong so ban ghi nhat ky quan tri phu hop voi bo loc
   */
  countLogs({ admin_id = null, action = null, target_type = null, search = null } = {}) {
    try {
      const conditions = [];
      const params = [];

      if (admin_id) {
        conditions.push('admin_id = ?');
        params.push(admin_id);
      }
      if (action) {
        conditions.push('action = ?');
        params.push(action);
      }
      if (target_type) {
        conditions.push('target_type = ?');
        params.push(target_type);
      }
      if (search) {
        conditions.push('(action LIKE ? OR admin_name LIKE ? OR target_id LIKE ? OR details LIKE ? OR ip_address LIKE ?)');
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const row = db.prepare(`SELECT COUNT(*) as count FROM admin_audit_logs ${whereClause}`).get(...params);
      return row ? row.count : 0;
    } catch (err) {
      console.error('[AuditLog] Loi khi dem nhat ky quan tri:', err.message);
      return 0;
    }
  }

  /**
   * Lay chi tiet mot ban ghi nhat ky theo ID
   * @param {string} id
   * @returns {Object|null}
   */
  getLogById(id) {
    if (!id) return null;
    try {
      const row = db.prepare('SELECT * FROM admin_audit_logs WHERE id = ?').get(id);
      if (!row) return null;

      let parsedDetails = row.details;
      if (row.details && typeof row.details === 'string') {
        try {
          parsedDetails = JSON.parse(row.details);
        } catch {
          // Giu nguyen chuoi
        }
      }
      return {
        ...row,
        details: parsedDetails
      };
    } catch (err) {
      console.error('[AuditLog] Loi khi lay chi tiet ban ghi:', err.message);
      return null;
    }
  }
}

module.exports = new AuditLogService();
