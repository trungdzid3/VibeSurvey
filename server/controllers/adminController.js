const db = require('../db/database');
const ledgerService = require('../services/ledgerService');
const antiFraudService = require('../services/antiFraudService');
const config = require('../config');

class AdminController {
  /**
   * Tổng quan kinh tế toàn diện hệ thống (Admin Economics & Platform Governance)
   */
  getOverview(req, res) {
    try {
      // 1. Số liệu người dùng
      const userStats = db.prepare(`
        SELECT 
          COUNT(*) AS total_users,
          SUM(CASE WHEN role = 'RESPONDENT' THEN 1 ELSE 0 END) AS total_respondents,
          SUM(CASE WHEN role = 'CREATOR' THEN 1 ELSE 0 END) AS total_creators,
          SUM(credit_balance) AS total_creator_credit_balance,
          SUM(point_balance) AS total_active_points
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
      // a. Tổng tiền đã nạp qua sổ cái (VND)
      const depositRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total_deposited_vnd
        FROM point_transactions
        WHERE tx_type = 'DEPOSIT_CREDIT' AND currency = 'VND'
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
      const pointLiabilityRow = db.prepare(`
        SELECT COALESCE(SUM(point_balance), 0) AS circulating_point_liability
        FROM users
      `).get();
      const circulatingPointLiability = pointLiabilityRow.circulating_point_liability || 0;
      const circulatingPointLiabilityVnd = circulatingPointLiability * (config.ECONOMICS.POINT_TO_VND_RATE || 10);

      // f. Tổng số tiền rút đang chờ duyệt (Pending Payouts VND)
      const pendingPayoutVnd = payoutStats.pending_payout_vnd || 0;

      // g. Tổng số tiền rút đã chi trả thành công (Completed Payouts VND)
      const totalCompletedPayoutVnd = payoutStats.total_fiat_paid_vnd || 0;

      // h. Tổng điểm đã đổi sang Credit (+5% thưởng tái đầu tư)
      const swapRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS swapped_credit_vnd
        FROM point_transactions
        WHERE tx_type = 'POINT_TO_CREDIT_SWAP' AND currency = 'VND'
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
      return res.json({ success: true, message: `Đã gỡ cấm thành công cho địa chỉ IP ${ip_address}` });
    } catch (err) {
      console.error('Lỗi unbanIp:', err);
      return res.status(500).json({ success: false, message: 'Lỗi gỡ cấm địa chỉ IP' });
    }
  }
}

module.exports = new AdminController();
