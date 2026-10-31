const db = require('../db/database');
const ledgerService = require('../services/ledgerService');
const antiFraudService = require('../services/antiFraudService');
const auditLogService = require('../services/auditLogService');
const config = require('../config');

class AdminController {
  /**
   * Tổng quan kinh tế toàn diện hệ thống (Admin Economics & Platform Governance)
   */
  getOverview(req, res) {
    try {
      // 1. Số liệu người dùng (Loại trừ số dư tĩnh trong ví Admin khỏi thị trường)
      const userStats = db.prepare(`
        SELECT 
          COUNT(*) AS total_users,
          SUM(CASE WHEN role = 'RESPONDENT' THEN 1 ELSE 0 END) AS total_respondents,
          SUM(CASE WHEN role = 'CREATOR' THEN 1 ELSE 0 END) AS total_creators,
          SUM(CASE WHEN role != 'ADMIN' THEN credit_balance ELSE 0 END) AS total_creator_credit_balance,
          SUM(CASE WHEN role != 'ADMIN' THEN point_balance ELSE 0 END) AS total_active_points
        FROM users
      `).get();

      // 2. Số liệu khảo sát
      const surveyStats = db.prepare(`
        SELECT 
          COUNT(*) AS total_surveys,
          SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_surveys,
          SUM(collected_responses) AS total_collected_responses,
          SUM(escrow_locked_balance) AS total_escrow_locked
        FROM surveys
      `).get();

      // 3. Số liệu chi trả (Payouts)
      const payoutStats = db.prepare(`
        SELECT 
          COUNT(*) AS total_payout_requests,
          SUM(CASE WHEN status = 'COMPLETED' THEN net_amount_vnd ELSE 0 END) AS total_fiat_paid_vnd,
          SUM(CASE WHEN status = 'COMPLETED' THEN fee_vnd ELSE 0 END) AS total_payout_fees_earned_vnd,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_payout_count,
          SUM(CASE WHEN status = 'PENDING' THEN net_amount_vnd ELSE 0 END) AS pending_payout_vnd
        FROM payout_requests
      `).get();

      // 4. Các chỉ số kinh tế hệ thống chi tiết
      // a. Tổng tiền đã nạp qua sổ cái (VND) - Loại trừ nạp ảo nội bộ của Admin
      const depositRow = db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) AS total_deposited_vnd
        FROM point_transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.tx_type = 'DEPOSIT_CREDIT' AND t.currency = 'VND' AND (u.role IS NULL OR u.role != 'ADMIN')
      `).get();
      const totalDepositedVnd = depositRow.total_deposited_vnd || 0;

      // b. Tổng số dư Escrow đang ký quỹ bị khóa cho các khảo sát ACTIVE
      const escrowRow = db.prepare(`
        SELECT COALESCE(SUM(escrow_locked_balance), 0) AS escrow_locked_balance
        FROM surveys
        WHERE status = 'ACTIVE'
      `).get();
      const escrowLockedBalance = escrowRow.escrow_locked_balance || 0;

      // c. Tổng tiền đã chi trả thưởng cho đáp viên (1 Point = 10 VND)
      const respondentEarnedRow = db.prepare(`
        SELECT COALESCE(SUM(points_rewarded * 10), 0) AS total_respondent_earned_vnd
        FROM responses
        WHERE status = 'VALIDATED'
      `).get();
      const totalRespondentEarnedVnd = respondentEarnedRow.total_respondent_earned_vnd || 0;

      // d. Doanh thu Creator chi trả cho các mẫu hoàn thành hợp lệ
      const revenueRow = db.prepare(`
        SELECT COALESCE(SUM(collected_responses * cost_per_response), 0) AS total_creator_spend_vnd
        FROM surveys
      `).get();
      const totalCreatorSpendVnd = revenueRow.total_creator_spend_vnd || 0;

      // Lợi nhuận gộp từ chênh lệch khảo sát (Spread Margin)
      const grossSurveySpreadProfitVnd = Math.max(0, totalCreatorSpendVnd - totalRespondentEarnedVnd);

      // Phí xử lý rút tiền đã thực thu
      const payoutFeesEarnedVnd = payoutStats.total_payout_fees_earned_vnd || 0;

      // Doanh thu và lợi nhuận sàn thực thu (Platform Gross Profit)
      const grossPlatformProfitVnd = grossSurveySpreadProfitVnd + payoutFeesEarnedVnd;

      // e. Tổng số Point đang lưu hành trong ví người dùng (Circulating Point Liability)
      // TÀI SẢN TĨNH CỦA ADMIN KHÔNG TÍNH VÀO CÔNG NỢ THỊ TRƯỜNG
      const pointLiabilityRow = db.prepare(`
        SELECT COALESCE(SUM(point_balance), 0) AS circulating_point_liability
        FROM users
        WHERE role != 'ADMIN'
      `).get();
      const circulatingPointLiability = pointLiabilityRow.circulating_point_liability || 0;
      const circulatingPointLiabilityVnd = circulatingPointLiability * (config.ECONOMICS.POINT_TO_VND_RATE || 10);

      // f. Tổng số tiền rút đang chờ duyệt (Pending Payouts VND)
      const pendingPayoutVnd = payoutStats.pending_payout_vnd || 0;

      // g. Tổng số tiền rút đã chi trả thành công (Completed Payouts VND)
      const totalCompletedPayoutVnd = payoutStats.total_fiat_paid_vnd || 0;

      // h. Tổng điểm đã đổi sang Credit (+5% thưởng tái đầu tư) - Loại trừ Admin đổi test
      const swapRow = db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) AS swapped_credit_vnd
        FROM point_transactions t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.tx_type = 'POINT_TO_CREDIT_SWAP' AND t.currency = 'VND' AND (u.role IS NULL OR u.role != 'ADMIN')
      `).get();
      const swappedCreditVnd = swapRow.swapped_credit_vnd || 0;

      // i. Tỷ lệ take rate thực tế
      const actualTakeRatePct = totalCreatorSpendVnd > 0 
        ? ((grossSurveySpreadProfitVnd / totalCreatorSpendVnd) * 100).toFixed(1) 
        : (config.ECONOMICS.PLATFORM_TAKE_RATE * 100).toFixed(1);

      // j. Phân rã số lượng khảo sát theo 3 phân khúc (Sinh viên, Cá nhân, Doanh nghiệp)
      const surveyDistRow = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN s.package_type = 'STUDENT' OR u.account_tier = 'STUDENT' OR s.pricing_tier = 'STUDENT' THEN 1 ELSE 0 END), 0) AS student,
          COALESCE(SUM(CASE WHEN s.package_type = 'ENTERPRISE' OR u.account_tier = 'ENTERPRISE' OR s.pricing_tier = 'ENTERPRISE' THEN 1 ELSE 0 END), 0) AS enterprise,
          COALESCE(SUM(CASE WHEN (s.package_type IS NULL OR s.package_type = 'PERSONAL') AND (u.account_tier IS NULL OR u.account_tier = 'PERSONAL') AND (s.pricing_tier IS NULL OR (s.pricing_tier != 'STUDENT' AND s.pricing_tier != 'ENTERPRISE')) THEN 1 ELSE 0 END), 0) AS personal,
          COUNT(*) AS total
        FROM surveys s
        LEFT JOIN users u ON s.creator_id = u.id
      `).get();

      const surveyDistribution = {
        student: surveyDistRow.student || 0,
        personal: surveyDistRow.personal || 0,
        enterprise: surveyDistRow.enterprise || 0,
        total: surveyDistRow.total || 0
      };

      // k. 15 giao dịch sổ cái kép gần nhất từ bảng point_transactions
      const recentLedgerTransactions = db.prepare(`
        SELECT t.id, t.user_id, t.reference_id, t.tx_type, t.currency, t.amount, t.balance_after, t.description, t.created_at,
               u.name AS user_name, u.email AS user_email, u.role AS user_role
        FROM point_transactions t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT 15
      `).all();

      // l. Thống kê chống gian lận
      const fraudCountRow = db.prepare('SELECT COUNT(*) AS total_fraud_caught FROM fraud_logs').get();

      // m. Thống kê người dùng thời gian thực & Tỉ lệ giữ chân thực tế 100% từ Database
      // 1. Số người dùng đang hoạt động thực tế trong 15 phút qua (hoặc phiên hiện tại của Admin)
      const activeUsersRow = db.prepare(`
        SELECT COUNT(DISTINCT id) AS c 
        FROM users 
        WHERE last_active_at >= datetime('now', '-15 minutes')
      `).get();
      const activeUsersNow = (activeUsersRow && activeUsersRow.c > 0) ? activeUsersRow.c : 1;

      // 2. Số bài làm khảo sát đang ở trạng thái điền dở (IN_PROGRESS)
      const fillingRow = db.prepare(`
        SELECT COUNT(*) AS c 
        FROM responses 
        WHERE status = 'IN_PROGRESS'
      `).get();
      const fillingFormsNow = (fillingRow && fillingRow.c) ? fillingRow.c : 0;

      // 3. Tỉ lệ người dùng quay lại thực tế tính từ lịch sử tương tác (device_ip_logs)
      const retentionRow = db.prepare(`
        SELECT 
          COUNT(DISTINCT user_id) AS total_active_users,
          SUM(CASE WHEN days_active >= 2 THEN 1 ELSE 0 END) AS returned_after_first,
          SUM(CASE WHEN days_active >= 3 THEN 1 ELSE 0 END) AS frequent_users
        FROM (
          SELECT user_id, COUNT(DISTINCT date(created_at)) AS days_active 
          FROM device_ip_logs 
          WHERE user_id IS NOT NULL 
          GROUP BY user_id
        )
      `).get();

      const totalActive = (retentionRow && retentionRow.total_active_users) || 0;
      const returned1 = (retentionRow && retentionRow.returned_after_first) || 0;
      const returnedFreq = (retentionRow && retentionRow.frequent_users) || 0;

      const firstTimeRetentionRate = totalActive > 0 ? Number(((returned1 / totalActive) * 100).toFixed(1)) : 0;
      const repeatRetentionRate = totalActive > 0 ? Number(((returnedFreq / totalActive) * 100).toFixed(1)) : 0;

      // 4. Tỉ lệ hoàn thành biểu mẫu & thời gian điền trung bình thực tế từ bảng responses
      const respStats = db.prepare(`
        SELECT 
          COUNT(*) AS total_sessions,
          SUM(CASE WHEN status = 'VALIDATED' THEN 1 ELSE 0 END) AS validated_sessions,
          AVG(CASE WHEN status = 'VALIDATED' AND duration_sec > 0 THEN duration_sec ELSE NULL END) AS avg_duration
        FROM responses
      `).get();

      const totalSessions = (respStats && respStats.total_sessions) || 0;
      const validatedSessions = (respStats && respStats.validated_sessions) || 0;
      const completionRatePct = totalSessions > 0 ? Number(((validatedSessions / totalSessions) * 100).toFixed(1)) : 0;
      const avgCompletionTimeSec = Math.round((respStats && respStats.avg_duration) || 0);

      // 5. Điểm uy tín trung bình thực tế của các đáp viên trong bảng users
      const trustStats = db.prepare(`
        SELECT AVG(trust_score) AS avg_score, COUNT(*) AS count 
        FROM users 
        WHERE role = 'RESPONDENT'
      `).get();
      const avgTrustScore = (trustStats && trustStats.count > 0 && trustStats.avg_score != null)
        ? Number(Number(trustStats.avg_score).toFixed(1))
        : 0;

      return res.json({
        success: true,
        overview: {
          users: userStats,
          surveys: surveyStats,
          payouts: payoutStats,
          financials: {
            totalDepositedVnd,
            escrowLockedBalance,
            totalRespondentEarnedVnd,
            totalRespondentEarnVnd: totalRespondentEarnedVnd,
            totalCreatorSpendVnd,
            grossSurveySpreadProfitVnd,
            payoutFeesEarnedVnd,
            grossPlatformProfitVnd,
            totalPlatformProfitVnd: grossPlatformProfitVnd,
            circulatingPointLiability,
            circulatingPointLiabilityVnd,
            pendingPayoutVnd,
            totalCompletedPayoutVnd,
            swappedCreditVnd,
            actualTakeRatePct: Number(actualTakeRatePct),
            effectiveTakeRatePercent: Number(actualTakeRatePct),
            targetTakeRatePct: config.ECONOMICS.PLATFORM_TAKE_RATE * 100,
            unrealizedLiabilityVnd: circulatingPointLiabilityVnd
          },
          analytics: {
            activeUsersNow,
            fillingFormsNow,
            firstTimeRetentionRate,
            repeatRetentionRate,
            completionRatePct,
            avgCompletionTimeSec,
            avgTrustScore,
            totalActiveUsersSample: totalActive,
            totalSessionsSample: totalSessions
          },
          surveyDistribution,
          recentLedgerTransactions,
          fraud: {
            totalFraudCaught: fraudCountRow.total_fraud_caught || 0
          }
        }
      });
    } catch (err) {
      console.error('Lỗi getOverview:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải tổng quan quản trị' });
    }
  }

  /**
   * Danh sách yêu cầu rút tiền với bộ lọc phương thức, trạng thái và phân trang
   */
  listPayouts(req, res) {
    try {
      const { status, type, page = 1, limit = 20 } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      let whereClauses = [];
      let params = [];

      const allowedStatus = ['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'];
      if (status && allowedStatus.includes(String(status).toUpperCase())) {
        whereClauses.push('p.status = ?');
        params.push(String(status).toUpperCase());
      }

      const allowedMethods = ['BANK_TRANSFER', 'MOMO', 'PHONE_CARD'];
      if (type && allowedMethods.includes(String(type).toUpperCase())) {
        whereClauses.push('p.payout_method = ?');
        params.push(String(type).toUpperCase());
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      // Đếm tổng số bản ghi
      const countRow = db.prepare(`
        SELECT COUNT(*) AS total
        FROM payout_requests p
        JOIN users u ON p.user_id = u.id
        ${whereSql}
      `).get(...params);
      const totalItems = countRow.total || 0;
      const totalPages = Math.ceil(totalItems / limitNum) || 1;

      // Lấy dữ liệu phân trang kèm trust_score
      const sql = `
        SELECT p.*, u.name AS user_name, u.email AS user_email, u.trust_score
        FROM payout_requests p
        JOIN users u ON p.user_id = u.id
        ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const payouts = db.prepare(sql).all(...params, limitNum, offset);

      return res.json({
        success: true,
        payouts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems,
          totalPages
        }
      });
    } catch (err) {
      console.error('Lỗi listPayouts:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải danh sách yêu cầu thanh toán' });
    }
  }

  /**
   * Xử lý duyệt hoặc từ chối yêu cầu rút tiền
   */
  handlePayout(req, res) {
    try {
      const { id } = req.params;
      const { is_approved, action, admin_note } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, message: 'Mã yêu cầu thanh toán không hợp lệ' });
      }

      let approved = null;
      if (typeof is_approved === 'boolean') {
        approved = is_approved;
      } else if (typeof is_approved === 'string') {
        approved = is_approved === 'true' || is_approved === '1';
      } else if (action === 'APPROVE') {
        approved = true;
      } else if (action === 'REJECT') {
        approved = false;
      }

      if (approved === null) {
        return res.status(400).json({ success: false, message: 'Tham số is_approved phải là true/false hoặc action là APPROVE/REJECT' });
      }

      const safeAdminNote = String(admin_note || (approved ? 'Đã duyệt chi trả' : 'Từ chối')).trim().substring(0, 500);
      const result = ledgerService.processPayout(id, approved, safeAdminNote);

      // Ghi vết nhật ký kiểm toán cho Quản trị viên
      auditLogService.logAction({
        admin_id: req.user ? req.user.id : 'ADMIN',
        admin_name: req.user ? req.user.name : 'Quản trị viên',
        action: approved ? 'APPROVE_PAYOUT' : 'REJECT_PAYOUT',
        target_type: 'PAYOUT',
        target_id: id,
        details: {
          status: result.status,
          admin_note: safeAdminNote
        },
        ip_address: req.ip || req.headers['x-forwarded-for'] || null
      });

      return res.json({
        success: true,
        message: approved ? 'Đã phê duyệt lệnh rút thưởng thành công' : 'Đã từ chối lệnh rút thưởng và hoàn lại điểm cho người dùng',
        status: result.status
      });
    } catch (err) {
      console.error('Lỗi handlePayout:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Thống kê chi tiết các vi phạm theo 5 loại bẫy gian lận
   */
  getFraudStats(req, res) {
    try {
      const rows = db.prepare('SELECT id, reason, score_details_json, created_at FROM fraud_logs').all();

      let speedTrapCount = 0;
      let attentionCheckCount = 0;
      let straightLiningCount = 0;
      let openTextFilterCount = 0;
      let duplicateFingerprintCount = 0;

      for (const r of rows) {
        const reason = String(r.reason || '').toLowerCase();
        const details = String(r.score_details_json || '').toLowerCase();

        // 1. Bẫy Tốc độ (Speed Trap)
        if (reason.includes('quá nhanh') || reason.includes('thời lượng đọc') || reason.includes('speed') || details.includes('speedverdict') || details.includes('tmin')) {
          speedTrapCount++;
        }
        // 2. Bẫy Tập trung (Attention Check)
        if (reason.includes('độ chú ý') || reason.includes('độ tập trung') || reason.includes('attention') || details.includes('attentionscore') || details.includes('secondchance')) {
          attentionCheckCount++;
        }
        // 3. Phương sai thẳng hàng (Straight-lining)
        if (reason.includes('straight-lining') || reason.includes('giống hệt nhau') || reason.includes('phương sai') || details.includes('isstraightlining')) {
          straightLiningCount++;
        }
        // 4. Bộ lọc tự luận rác (Open-Text Filter)
        if (reason.includes('tự luận') || reason.includes('spam phím') || reason.includes('ký tự lặp') || reason.includes('quá ngắn') || reason.includes('open_text') || reason.includes('shannon')) {
          openTextFilterCount++;
        }
        // 5. Vân tay thiết bị & IP trùng lặp (Duplicate Fingerprint)
        if (reason.includes('multi_account') || reason.includes('ip/thiết bị') || reason.includes('auto_ban') || reason.includes('canh_bao_ip') || reason.includes('fingerprint') || details.includes('distinctusers')) {
          duplicateFingerprintCount++;
        }
      }

      const bannedIpsCount = db.prepare('SELECT COUNT(*) AS count FROM banned_ips').get().count || 0;
      const bannedUsersCount = db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'BANNED'").get().count || 0;

      return res.json({
        success: true,
        stats: {
          totalFraudLogs: rows.length,
          bannedIpsCount,
          bannedUsersCount,
          traps: {
            speedTrap: speedTrapCount,
            attentionCheck: attentionCheckCount,
            straightLining: straightLiningCount,
            openTextFilter: openTextFilterCount,
            duplicateFingerprint: duplicateFingerprintCount
          }
        }
      });
    } catch (err) {
      console.error('Lỗi getFraudStats:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải thống kê gian lận' });
    }
  }

  /**
   * Tìm kiếm tài khoản theo Email hoặc Google ID kèm lịch sử khảo sát
   */
  searchUsers(req, res) {
    try {
      const query = String(req.query.q || '').trim();
      if (!query) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập từ khóa tìm kiếm (Email hoặc Google ID)' });
      }

      const searchTerm = `%${query}%`;
      const users = db.prepare(`
        SELECT id, email, name, role, status, trust_score, credit_balance, point_balance,
               google_id, is_google_linked, account_tier, is_student_verified, ban_reason, banned_at, created_at
        FROM users
        WHERE email LIKE ? OR google_id LIKE ? OR id = ? OR name LIKE ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(searchTerm, searchTerm, query, searchTerm);

      // Truy xuất lịch sử các bài khảo sát đã làm cho từng tài khoản tìm thấy
      const usersWithHistory = users.map(user => {
        const responses = db.prepare(`
          SELECT r.id AS response_id, r.survey_id, r.status AS response_status,
                 r.started_at, r.submitted_at, r.duration_sec, r.quality_score, r.points_rewarded,
                 s.title AS survey_title, s.category AS survey_category, s.reward_points_per_response
          FROM responses r
          JOIN surveys s ON r.survey_id = s.id
          WHERE r.respondent_id = ?
          ORDER BY r.started_at DESC
          LIMIT 50
        `).all(user.id);

        return {
          ...user,
          responses
        };
      });

      return res.json({
        success: true,
        users: usersWithHistory
      });
    } catch (err) {
      console.error('Lỗi searchUsers:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tìm kiếm tài khoản' });
    }
  }

  /**
   * Mở khóa tài khoản (Unban): Đưa về ACTIVE, xóa ban_reason/banned_at và reset trust_score về 80 (nếu < 80)
   */
  unbanUser(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ' });
      }

      const user = db.prepare('SELECT id, email, name, status, trust_score FROM users WHERE id = ?').get(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng' });
      }

      const newTrustScore = user.trust_score < 80.0 ? 80.0 : user.trust_score;

      db.prepare(`
        UPDATE users
        SET status = 'ACTIVE',
            ban_reason = NULL,
            banned_at = NULL,
            trust_score = ?
        WHERE id = ?
      `).run(newTrustScore, id);

      auditLogService.logAction({
        admin_id: req.user ? req.user.id : 'ADMIN',
        admin_name: req.user ? req.user.name : 'Quản trị viên',
        action: 'UNBAN_USER',
        target_type: 'USER',
        target_id: id,
        details: {
          email: user.email,
          previous_status: user.status,
          restored_trust_score: newTrustScore
        },
        ip_address: req.ip || req.headers['x-forwarded-for'] || null
      });

      return res.json({
        success: true,
        message: `Đã mở khóa tài khoản ${user.email} thành công. Điểm uy tín được phục hồi về ${newTrustScore}.`,
        user: {
          id: user.id,
          email: user.email,
          status: 'ACTIVE',
          trust_score: newTrustScore
        }
      });
    } catch (err) {
      console.error('Lỗi unbanUser:', err);
      return res.status(500).json({ success: false, message: 'Lỗi mở khóa tài khoản' });
    }
  }

  /**
   * Danh sách nhật ký gian lận (100 bản ghi mới nhất)
   */
  listFraudLogs(req, res) {
    try {
      const logs = db.prepare(`
        SELECT f.*, u.name AS user_name, u.email AS user_email, u.trust_score, s.title AS survey_title
        FROM fraud_logs f
        LEFT JOIN users u ON f.user_id = u.id
        LEFT JOIN surveys s ON f.survey_id = s.id
        ORDER BY f.created_at DESC
        LIMIT 100
      `).all();

      return res.json({ success: true, logs });
    } catch (err) {
      console.error('Lỗi listFraudLogs:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải nhật ký chống gian lận' });
    }
  }

  /**
   * Lấy danh sách địa chỉ IP bị cấm
   */
  listBannedIps(req, res) {
    try {
      const bannedIps = antiFraudService.listBannedIps();
      return res.json({ success: true, bannedIps });
    } catch (err) {
      console.error('Lỗi listBannedIps:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải danh sách IP bị cấm' });
    }
  }

  /**
   * Gỡ cấm (Unban) cho địa chỉ IP
   */
  unbanIp(req, res) {
    try {
      const { ip_address } = req.body;
      if (!ip_address || typeof ip_address !== 'string') {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ IP hợp lệ để gỡ cấm' });
      }

      antiFraudService.unbanIp(ip_address);

      auditLogService.logAction({
        admin_id: req.user ? req.user.id : 'ADMIN',
        admin_name: req.user ? req.user.name : 'Quản trị viên',
        action: 'UNBAN_IP',
        target_type: 'IP',
        target_id: ip_address,
        details: { ip_address },
        ip_address: req.ip || req.headers['x-forwarded-for'] || null
      });

      return res.json({ success: true, message: `Đã gỡ cấm thành công cho địa chỉ IP ${ip_address}` });
    } catch (err) {
      console.error('Lỗi unbanIp:', err);
      return res.status(500).json({ success: false, message: 'Lỗi gỡ cấm địa chỉ IP' });
    }
  }

  /**
   * Thực thi lệnh quản trị nhanh qua Admin Command Console
   * Hỗ trợ các lệnh: /naptien, /congdiem, /trudiem, /trutien, /resetpoint, /ban, /unban, /setrole, /settier, /settrust, /info, /stats, /help
   */
  executeCommand(req, res) {
    try {
      const rawCommand = req.body.command;
      if (!rawCommand || typeof rawCommand !== 'string') {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lệnh quản trị cần thực thi' });
      }

      const tokens = this._parseCommandTokens(rawCommand);
      if (tokens.length === 0) {
        return res.status(400).json({ success: false, message: 'Lệnh không được để trống' });
      }

      let cmd = tokens[0].toLowerCase();
      if (!cmd.startsWith('/')) {
        cmd = '/' + cmd;
      }
      const args = tokens.slice(1);

      switch (cmd) {
        case '/help': {
          const helpText = [
            'DANH SÁCH LỆNH ADMIN CONSOLE HỖ TRỢ:',
            '  /naptien <email|id> <số_tiền>     : Nạp tiền Credit cho tài khoản (Ví dụ: /naptien user@vibesurvey.com 100k)',
            '  /trutien <email|id> <số_tiền>     : Trừ tiền Credit của tài khoản (Ví dụ: /trutien user@vibesurvey.com 50000)',
            '  /congdiem <email|id> <số_điểm>   : Cộng điểm Point cho tài khoản (Ví dụ: /congdiem user@vibesurvey.com 1000)',
            '  /trudiem <email|id> <số_điểm>    : Trừ điểm Point của tài khoản (Ví dụ: /trudiem user@vibesurvey.com 500)',
            '  /resetpoint <email|id|all>       : Reset điểm về 0 cho 1 tài khoản hoặc /resetpoint all xóa sạch thị trường',
            '  /resetcredit <email|id>          : Reset tiền Credit của tài khoản về 0 đ',
            '  /ban <email|id> [lý_do]          : Khóa tài khoản người dùng ngay lập tức',
            '  /unban <email|id>                : Mở khóa tài khoản người dùng',
            '  /banip <địa_chỉ_ip> [lý_do]      : Khóa địa chỉ IP vào danh sách cấm',
            '  /unbanip <địa_chỉ_ip>            : Gỡ cấm địa chỉ IP',
            '  /setrole <email|id> <role>       : Đổi vai trò (ADMIN, CREATOR, RESPONDENT)',
            '  /settier <email|id> <tier>       : Đổi phân hạng (STUDENT, ENTERPRISE_LEVEL_1, ENTERPRISE_LEVEL_2, REGULAR)',
            '  /settrust <email|id> <điểm>      : Cập nhật điểm uy tín (từ 0 đến 100)',
            '  /info <email|id>                 : Xem chi tiết thông số hồ sơ người dùng',
            '  /stats                           : Xem tóm tắt nhanh hiện trạng tài chính & người dùng',
            '  /cleantest                       : Dọn dẹp xóa sạch toàn bộ data test, tài khoản test và khảo sát test',
            '  /clear                           : Xóa sạch màn hình console'
          ].join('\n');
          return res.json({ success: true, command: rawCommand, output: helpText, type: 'HELP' });
        }

        case '/naptien':
        case '/napcredit':
        case '/topup': {
          if (args.length < 2) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /naptien <email_hoặc_id> <số_tiền>. Ví dụ: /naptien user@vibesurvey.com 100000' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          const amount = this._parseNumericAmount(args[1]);
          if (amount <= 0) {
            return res.status(400).json({ success: false, message: 'Số tiền nạp phải là số dương hợp lệ (> 0 đ)' });
          }

          db.prepare('UPDATE users SET credit_balance = credit_balance + ? WHERE id = ?').run(amount, user.id);
          const updated = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(user.id);
          
          const crypto = require('crypto');
          db.prepare(`
            INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
            VALUES (?, ?, ?, 'DEPOSIT_CREDIT', 'VND', ?, ?, ?)
          `).run(crypto.randomUUID(), user.id, null, amount, updated.credit_balance, `Nạp Credit qua Admin Console (+${amount.toLocaleString()} VND)`);

          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã nạp +${amount.toLocaleString('vi-VN')} đ Credit cho tài khoản ${user.email} (${user.name}). Số dư mới: ${updated.credit_balance.toLocaleString('vi-VN')} đ.`,
            type: 'SUCCESS'
          });
        }

        case '/trutien':
        case '/trucredit': {
          if (args.length < 2) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /trutien <email_hoặc_id> <số_tiền>. Ví dụ: /trutien user@vibesurvey.com 50000' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          const amount = this._parseNumericAmount(args[1]);
          if (amount <= 0) {
            return res.status(400).json({ success: false, message: 'Số tiền trừ phải là số dương hợp lệ (> 0 đ)' });
          }

          db.prepare('UPDATE users SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?').run(amount, user.id);
          const updated = db.prepare('SELECT credit_balance FROM users WHERE id = ?').get(user.id);

          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã trừ -${amount.toLocaleString('vi-VN')} đ Credit của tài khoản ${user.email}. Số dư mới: ${updated.credit_balance.toLocaleString('vi-VN')} đ.`,
            type: 'SUCCESS'
          });
        }

        case '/congdiem':
        case '/addpoint':
        case '/point': {
          if (args.length < 2) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /congdiem <email_hoặc_id> <số_điểm>. Ví dụ: /congdiem user@vibesurvey.com 1000' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          const points = this._parseNumericAmount(args[1]);
          if (points <= 0) {
            return res.status(400).json({ success: false, message: 'Số điểm cộng phải là số dương hợp lệ (> 0)' });
          }

          db.prepare('UPDATE users SET point_balance = point_balance + ? WHERE id = ?').run(points, user.id);
          const updated = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(user.id);

          const crypto = require('crypto');
          db.prepare(`
            INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
            VALUES (?, ?, ?, 'SURVEY_REWARD', 'POINT', ?, ?, ?)
          `).run(crypto.randomUUID(), user.id, null, points, updated.point_balance, `Cộng điểm thưởng qua Admin Console (+${points.toLocaleString()} PTS)`);

          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã cộng +${points.toLocaleString('vi-VN')} điểm cho tài khoản ${user.email} (${user.name}). Số dư mới: ${updated.point_balance.toLocaleString('vi-VN')} pts.`,
            type: 'SUCCESS'
          });
        }

        case '/trudiem':
        case '/subpoint': {
          if (args.length < 2) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /trudiem <email_hoặc_id> <số_điểm>. Ví dụ: /trudiem user@vibesurvey.com 500' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          const points = this._parseNumericAmount(args[1]);
          if (points <= 0) {
            return res.status(400).json({ success: false, message: 'Số điểm trừ phải là số dương hợp lệ (> 0)' });
          }

          db.prepare('UPDATE users SET point_balance = MAX(0, point_balance - ?) WHERE id = ?').run(points, user.id);
          const updated = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(user.id);

          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã trừ -${points.toLocaleString('vi-VN')} điểm của tài khoản ${user.email}. Số dư mới: ${updated.point_balance.toLocaleString('vi-VN')} pts.`,
            type: 'SUCCESS'
          });
        }

        case '/resetpoint': {
          if (args.length < 1) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /resetpoint <email_hoặc_id|all>. Ví dụ: /resetpoint all' });
          }
          if (args[0].toLowerCase() === 'all') {
            const countRow = db.prepare('SELECT COUNT(*) AS c FROM users WHERE point_balance > 0').get();
            db.prepare('UPDATE users SET point_balance = 0').run();
            db.prepare("DELETE FROM point_transactions WHERE currency = 'PTS' OR currency = 'POINT'").run();
            return res.json({
              success: true,
              command: rawCommand,
              output: `Thành công: Đã xóa sạch 100% điểm thưởng đang lưu hành trên toàn bộ thị trường (${countRow.c} tài khoản đã được reset về 0 pts).`,
              type: 'SUCCESS'
            });
          }

          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          db.prepare('UPDATE users SET point_balance = 0 WHERE id = ?').run(user.id);
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã reset số dư điểm của tài khoản ${user.email} về 0 pts.`,
            type: 'SUCCESS'
          });
        }

        case '/resetcredit': {
          if (args.length < 1) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /resetcredit <email_hoặc_id>. Ví dụ: /resetcredit user@vibesurvey.com' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          db.prepare('UPDATE users SET credit_balance = 0 WHERE id = ?').run(user.id);
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã reset số dư Credit của tài khoản ${user.email} về 0 đ.`,
            type: 'SUCCESS'
          });
        }

        case '/ban': {
          if (args.length < 1) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /ban <email_hoặc_id> [lý_do]' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          if (user.role === 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Không thể khóa tài khoản có quyền Quản trị viên (ADMIN)' });
          }
          const reason = args.slice(1).join(' ') || 'Bị khóa bởi Quản trị viên qua Command Console';
          db.prepare("UPDATE users SET status = 'BANNED', ban_reason = ?, banned_at = CURRENT_TIMESTAMP WHERE id = ?").run(reason, user.id);
          auditLogService.logAction({
            admin_id: req.user ? req.user.id : 'ADMIN',
            admin_name: req.user ? req.user.name : 'Quản trị viên',
            action: 'BAN_USER',
            target_type: 'USER',
            target_id: user.id,
            details: { email: user.email, reason, command: rawCommand },
            ip_address: req.ip || req.headers['x-forwarded-for'] || null
          });
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã khóa tài khoản ${user.email}. Lý do: "${reason}".`,
            type: 'SUCCESS'
          });
        }

        case '/unban': {
          if (args.length < 1) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /unban <email_hoặc_id>' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          db.prepare("UPDATE users SET status = 'ACTIVE', ban_reason = NULL, banned_at = NULL, trust_score = 85 WHERE id = ?").run(user.id);
          auditLogService.logAction({
            admin_id: req.user ? req.user.id : 'ADMIN',
            admin_name: req.user ? req.user.name : 'Quản trị viên',
            action: 'UNBAN_USER',
            target_type: 'USER',
            target_id: user.id,
            details: { email: user.email, command: rawCommand },
            ip_address: req.ip || req.headers['x-forwarded-for'] || null
          });
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã mở khóa tài khoản ${user.email}. Trạng thái hiện tại: ACTIVE, Điểm uy tín: 85đ.`,
            type: 'SUCCESS'
          });
        }

        case '/banip': {
          if (args.length < 1) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /banip <địa_chỉ_ip> [lý_do]' });
          }
          const ip = args[0];
          const reason = args.slice(1).join(' ') || 'Bị cấm bởi Quản trị viên qua Console';
          antiFraudService.banIp(ip, reason);
          auditLogService.logAction({
            admin_id: req.user ? req.user.id : 'ADMIN',
            admin_name: req.user ? req.user.name : 'Quản trị viên',
            action: 'BAN_IP',
            target_type: 'IP',
            target_id: ip,
            details: { ip, reason, command: rawCommand },
            ip_address: req.ip || req.headers['x-forwarded-for'] || null
          });
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã khóa địa chỉ IP ${ip}. Lý do: "${reason}".`,
            type: 'SUCCESS'
          });
        }

        case '/unbanip': {
          if (args.length < 1) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /unbanip <địa_chỉ_ip>' });
          }
          const ip = args[0];
          antiFraudService.unbanIp(ip);
          auditLogService.logAction({
            admin_id: req.user ? req.user.id : 'ADMIN',
            admin_name: req.user ? req.user.name : 'Quản trị viên',
            action: 'UNBAN_IP',
            target_type: 'IP',
            target_id: ip,
            details: { ip, command: rawCommand },
            ip_address: req.ip || req.headers['x-forwarded-for'] || null
          });
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã gỡ cấm cho địa chỉ IP ${ip}.`,
            type: 'SUCCESS'
          });
        }

        case '/setrole': {
          if (args.length < 2) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /setrole <email_hoặc_id> <ADMIN|CREATOR|RESPONDENT>' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          const role = args[1].toUpperCase();
          if (!['ADMIN', 'CREATOR', 'RESPONDENT'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Vai trò chỉ được là một trong các giá trị: ADMIN, CREATOR, RESPONDENT' });
          }
          db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
          auditLogService.logAction({
            admin_id: req.user ? req.user.id : 'ADMIN',
            admin_name: req.user ? req.user.name : 'Quản trị viên',
            action: 'SET_USER_ROLE',
            target_type: 'USER',
            target_id: user.id,
            details: { email: user.email, role, command: rawCommand },
            ip_address: req.ip || req.headers['x-forwarded-for'] || null
          });
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã thay đổi vai trò của ${user.email} thành ${role}.`,
            type: 'SUCCESS'
          });
        }

        case '/settier': {
          if (args.length < 2) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /settier <email_hoặc_id|me> <STUDENT|PERSONAL|ENTERPRISE>' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          let tier = args[1].toUpperCase();
          if (tier === 'REGULAR') tier = 'PERSONAL';
          db.prepare('UPDATE users SET account_tier = ? WHERE id = ?').run(tier, user.id);
          auditLogService.logAction({
            admin_id: req.user ? req.user.id : 'ADMIN',
            admin_name: req.user ? req.user.name : 'Quản trị viên',
            action: 'SET_USER_TIER',
            target_type: 'USER',
            target_id: user.id,
            details: { email: user.email, tier, command: rawCommand },
            ip_address: req.ip || req.headers['x-forwarded-for'] || null
          });
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã cập nhật phân hạng tài khoản của ${user.email} thành ${tier}.`,
            type: 'SUCCESS'
          });
        }

        case '/settrust': {
          if (args.length < 2) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /settrust <email_hoặc_id> <số_điểm (0-100)>' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          const score = Math.min(100, Math.max(0, parseFloat(args[1]) || 85));
          db.prepare('UPDATE users SET trust_score = ? WHERE id = ?').run(score, user.id);
          auditLogService.logAction({
            admin_id: req.user ? req.user.id : 'ADMIN',
            admin_name: req.user ? req.user.name : 'Quản trị viên',
            action: 'SET_TRUST_SCORE',
            target_type: 'USER',
            target_id: user.id,
            details: { email: user.email, trust_score: score, command: rawCommand },
            ip_address: req.ip || req.headers['x-forwarded-for'] || null
          });
          return res.json({
            success: true,
            command: rawCommand,
            output: `Thành công: Đã cập nhật điểm uy tín của ${user.email} thành ${score}đ.`,
            type: 'SUCCESS'
          });
        }

        case '/info': {
          if (args.length < 1) {
            return res.status(400).json({ success: false, message: 'Cú pháp: /info <email_hoặc_id>' });
          }
          const user = this._findTargetUser(args[0], req.user);
          if (!user) {
            return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản nào khớp với "${args[0]}"` });
          }
          const infoText = [
            `THÔNG TIN TÀI KHOẢN [${user.email}]:`,
            `  ID           : ${user.id}`,
            `  Tên          : ${user.name}`,
            `  Email        : ${user.email}`,
            `  Vai trò      : ${user.role}`,
            `  Phân hạng    : ${user.account_tier || 'Mặc định (REGULAR)'}`,
            `  Số dư Credit : ${(user.credit_balance || 0).toLocaleString('vi-VN')} đ`,
            `  Số dư Point  : ${(user.point_balance || 0).toLocaleString('vi-VN')} pts`,
            `  Điểm uy tín  : ${user.trust_score !== undefined ? user.trust_score : 85}đ`,
            `  Trạng thái   : ${user.status}`
          ].join('\n');
          return res.json({ success: true, command: rawCommand, output: infoText, type: 'INFO' });
        }

        case '/stats':
        case '/overview': {
          const uStats = db.prepare(`
            SELECT 
              COUNT(*) AS total,
              SUM(CASE WHEN role = 'CREATOR' THEN 1 ELSE 0 END) AS creators,
              SUM(CASE WHEN role = 'RESPONDENT' THEN 1 ELSE 0 END) AS respondents,
              SUM(CASE WHEN role != 'ADMIN' THEN point_balance ELSE 0 END) AS circulating_points
            FROM users
          `).get();
          const sStats = db.prepare(`SELECT COUNT(*) as total, COALESCE(SUM(escrow_locked_balance), 0) as escrow FROM surveys`).get();
          const pStats = db.prepare(`SELECT COUNT(*) as total FROM payout_requests WHERE status = 'PENDING'`).get();

          const statsText = [
            'TỔNG QUAN HỆ THỐNG:',
            `  Tài khoản : ${uStats.total} (Đáp viên: ${uStats.respondents || 0}, Doanh nghiệp: ${uStats.creators || 0})`,
            `  Khảo sát  : ${sStats.total} bài | Ký quỹ Escrow: ${(sStats.escrow || 0).toLocaleString('vi-VN')} đ`,
            `  Rút tiền  : ${pStats.total} yêu cầu đang chờ duyệt`,
            `  Thị trường: ${(uStats.circulating_points || 0).toLocaleString('vi-VN')} PTS điểm lưu hành`
          ].join('\n');
          return res.json({ success: true, command: rawCommand, output: statsText, type: 'INFO' });
        }

        case '/cleantest':
        case '/xoadatatest':
        case '/clean-test-data': {
          const { cleanAllTestData } = require('../../tests/test_cleanup_helper');
          const resCleanup = cleanAllTestData({ verbose: false });
          if (resCleanup.error) {
            return res.status(500).json({ success: false, message: `Lỗi khi dọn dẹp data test: ${resCleanup.error}` });
          }
          const outText = [
            'DỌN DẸP DỮ LIỆU KIỂM THỬ THÀNH CÔNG:',
            `  Đã xóa sạch: ${resCleanup.cleanedUsers} tài khoản test`,
            `  Đã xóa sạch: ${resCleanup.cleanedSurveys} khảo sát test`,
            '  Cơ sở dữ liệu đã được thanh lọc tinh khiết 100%!'
          ].join('\n');
          return res.json({ success: true, command: rawCommand, output: outText, type: 'CLEANUP' });
        }

        default:
          return res.status(400).json({
            success: false,
            message: `Lệnh "${tokens[0]}" không được nhận diện. Gõ /help để xem danh sách tất cả các lệnh khả dụng.`
          });
      }
    } catch (err) {
      console.error('Lỗi executeCommand:', err);
      return res.status(500).json({ success: false, message: err.message || 'Lỗi xử lý lệnh console' });
    }
  }

  /**
   * Phân tách câu lệnh thành các tham số (hỗ trợ dấu nháy kép cho chuỗi có khoảng trắng)
   */
  _parseCommandTokens(commandText) {
    const text = String(commandText || '').trim();
    const tokens = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if ((char === '"' || char === "'") && (!inQuote || quoteChar === char)) {
        inQuote = !inQuote;
        quoteChar = inQuote ? char : '';
      } else if (char === ' ' && !inQuote) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current.length > 0) {
      tokens.push(current);
    }
    return tokens;
  }

  /**
   * Chuyển đổi chuỗi số tiền hoặc điểm (hỗ trợ 100k, 1.5m, 100000)
   */
  _parseNumericAmount(val) {
    if (typeof val === 'number') return Math.floor(val);
    if (!val) return 0;
    const s = String(val).trim().toLowerCase().replace(/,/g, '');
    if (s.endsWith('k')) return Math.floor(parseFloat(s) * 1000);
    if (s.endsWith('m') || s.endsWith('tr') || s.endsWith('trieu') || s.endsWith('triệu')) {
      return Math.floor(parseFloat(s) * 1000000);
    }
    return Math.floor(parseFloat(s) || 0);
  }

  /**
   * Chuyển đổi trực tiếp phân hạng gói tài khoản (STUDENT <-> PERSONAL <-> ENTERPRISE) cho Admin
   */
  switchAdminTier(req, res) {
    try {
      const { tier } = req.body;
      let normalized = (tier || '').toUpperCase();
      if (normalized === 'REGULAR') normalized = 'PERSONAL';
      const validTiers = ['STUDENT', 'PERSONAL', 'ENTERPRISE'];
      if (!validTiers.includes(normalized)) {
        return res.status(400).json({ success: false, message: 'Phân hạng gói không hợp lệ. Hỗ trợ: STUDENT, PERSONAL, ENTERPRISE' });
      }

      db.prepare('UPDATE users SET account_tier = ? WHERE id = ?').run(normalized, req.user.id);
      const updatedUser = db.prepare('SELECT id, name, email, role, status, credit_balance, point_balance, account_tier, fast_track_tickets, enterprise_verify_level FROM users WHERE id = ?').get(req.user.id);

      auditLogService.logAction({
        admin_id: req.user ? req.user.id : 'ADMIN',
        admin_name: req.user ? req.user.name : 'Quản trị viên',
        action: 'SWITCH_ADMIN_TIER',
        target_type: 'USER',
        target_id: req.user.id,
        details: { new_tier: normalized },
        ip_address: req.ip || req.headers['x-forwarded-for'] || null
      });

      const label = normalized === 'STUDENT' ? 'Sinh Viên (Ưu đãi học thuật)' : (normalized === 'ENTERPRISE' ? 'Doanh Nghiệp' : 'Cá Nhân (Nghiên cứu tiêu chuẩn)');

      return res.json({
        success: true,
        message: `Đã chuyển sang gói ${label}`,
        tier: normalized,
        user: updatedUser
      });
    } catch (err) {
      console.error('Lỗi switchAdminTier:', err);
      return res.status(500).json({ success: false, message: 'Lỗi chuyển đổi phân hạng gói tài khoản' });
    }
  }

  /**
   * Tìm người dùng theo Email, ID, hoặc Alias thông minh (acc1, acc2, me, user, creator)
   */
  _findTargetUser(target, currentAdminUser = null) {
    if (!target) return null;
    const raw = String(target).trim();
    const lower = raw.toLowerCase();

    // 0. Hỗ trợ Alias thông minh
    if (lower === 'me' || lower === 'self' || lower === 'admin') {
      if (currentAdminUser && currentAdminUser.id) {
        const u = db.prepare('SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE id = ?').get(currentAdminUser.id);
        if (u) return u;
      }
      const adminU = db.prepare("SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE role = 'ADMIN' LIMIT 1").get();
      if (adminU) return adminU;
    }

    if (lower === 'acc1' || lower === 'user' || lower === 'user1' || lower === 'respondent') {
      let u = db.prepare('SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE LOWER(email) = ?').get('user@vibesurvey.com');
      if (!u) {
        u = db.prepare("SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE role = 'RESPONDENT' LIMIT 1").get();
      }
      if (u) return u;
    }

    if (lower === 'acc2' || lower === 'creator' || lower === 'creator1') {
      let u = db.prepare('SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE LOWER(email) = ?').get('creator@vibesurvey.com');
      if (!u) {
        u = db.prepare("SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE role = 'CREATOR' LIMIT 1").get();
      }
      if (u) return u;
    }

    if (lower === 'acc3') {
      const u = db.prepare('SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE LOWER(email) = ?').get('admin@vibesurvey.com');
      if (u) return u;
    }

    // 1. Tìm chính xác email
    let user = db.prepare('SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE LOWER(email) = LOWER(?)').get(raw);
    if (user) return user;

    // 2. Tìm chính xác ID
    user = db.prepare('SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE id = ?').get(raw);
    if (user) return user;

    // 3. Tìm gần đúng
    const matches = db.prepare('SELECT id, name, email, role, status, credit_balance, point_balance, trust_score, account_tier FROM users WHERE LOWER(email) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?) LIMIT 5').all(`%${raw}%`, `%${raw}%`);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const listStr = matches.map(m => `${m.email} (${m.name})`).join(', ');
      throw new Error(`Tìm thấy ${matches.length} tài khoản khớp với "${raw}": [${listStr}]. Vui lòng nhập chính xác Email hoặc ID.`);
    }
    return null;
  }

  /**
   * GET /api/v1/admin/analytics/trends
   * Dữ liệu chuỗi thời gian xu hướng tài chính và khảo sát
   */
  getAnalyticsTrends(req, res) {
    try {
      const days = Math.max(7, Math.min(parseInt(req.query.days, 10) || 14, 30));
      const list = [];
      let totalDeposits = 0;
      let totalPayouts = 0;
      let totalResponses = 0;
      let totalPoints = 0;
      let totalNewUsers = 0;

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const dep = db.prepare(`
          SELECT COALESCE(SUM(amount_vnd), 0) as total 
          FROM deposit_orders 
          WHERE status = 'COMPLETED' AND (DATE(paid_at) = ? OR (paid_at IS NULL AND DATE(created_at) = ?))
        `).get(dateStr, dateStr).total;

        const pay = db.prepare(`
          SELECT COALESCE(SUM(fiat_amount_vnd), 0) as total 
          FROM payout_requests 
          WHERE status = 'COMPLETED' AND (DATE(completed_at) = ? OR (completed_at IS NULL AND DATE(created_at) = ?))
        `).get(dateStr, dateStr).total;

        const resp = db.prepare(`
          SELECT COUNT(*) as count, COALESCE(SUM(points_rewarded), 0) as points 
          FROM responses 
          WHERE status = 'COMPLETED' AND (DATE(submitted_at) = ? OR (submitted_at IS NULL AND DATE(started_at) = ?))
        `).get(dateStr, dateStr);

        const users = db.prepare(`
          SELECT COUNT(*) as count 
          FROM users 
          WHERE DATE(created_at) = ?
        `).get(dateStr).count;

        totalDeposits += dep;
        totalPayouts += pay;
        totalResponses += resp.count;
        totalPoints += resp.points;
        totalNewUsers += users;

        list.push({
          date: dateStr,
          deposits: dep,
          payouts: pay,
          responses: resp.count,
          points: resp.points,
          newUsers: users
        });
      }

      return res.json({
        success: true,
        days,
        trends: list,
        summary: {
          totalDeposits,
          totalPayouts,
          totalResponses,
          totalPoints,
          totalNewUsers
        }
      });
    } catch (err) {
      console.error('Lỗi getAnalyticsTrends:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu xu hướng: ' + err.message });
    }
  }

  /**
   * GET /api/v1/admin/audit-logs
   * Danh sách nhật ký kiểm toán có phân trang và bộ lọc
   */
  getAuditLogs(req, res) {
    try {
      const { page = 1, limit = 20, action = null, target_type = null, admin_id = null, search = null } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(parseInt(limit, 10) || 20, 100));
      const offset = (pageNum - 1) * limitNum;

      const filter = {
        limit: limitNum,
        offset,
        action: action && action !== 'ALL' ? action : null,
        target_type: target_type && target_type !== 'ALL' ? target_type : null,
        admin_id: admin_id && admin_id !== 'ALL' ? admin_id : null,
        search: search ? search.trim() : null
      };

      const logs = auditLogService.getRecentLogs(filter);
      const total = auditLogService.countLogs(filter);

      return res.json({
        success: true,
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      });
    } catch (err) {
      console.error('Lỗi getAuditLogs:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải nhật ký kiểm toán: ' + err.message });
    }
  }
}

module.exports = new AdminController();
