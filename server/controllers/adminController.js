const db = require('../db/database');
const ledgerService = require('../services/ledgerService');
const antiFraudService = require('../services/antiFraudService');
const config = require('../config');

class AdminController {
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
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_payout_count
        FROM payout_requests
      `).get();

      // 4. Doanh thu & Lợi nhuận sàn (Platform Economics)
      // Doanh thu Creator chi trả cho các mẫu hợp lệ = SUM(collected_responses * cost_per_response)
      const revenueRow = db.prepare(`
        SELECT SUM(collected_responses * cost_per_response) AS total_creator_spend_vnd
        FROM surveys
      `).get();
      const totalCreatorSpendVnd = revenueRow.total_creator_spend_vnd || 0;

      // Điểm thưởng đã trả cho các mẫu hợp lệ = SUM(points_rewarded * 10)
      const rewardRow = db.prepare(`
        SELECT SUM(points_rewarded * 10) AS total_rewards_issued_vnd
        FROM responses
        WHERE status = 'VALIDATED'
      `).get();
      const totalRewardsIssuedVnd = rewardRow.total_rewards_issued_vnd || 0;

      // Lợi nhuận gộp từ chênh lệch khảo sát (Spread Margin)
      const grossSurveySpreadProfitVnd = Math.max(0, totalCreatorSpendVnd - totalRewardsIssuedVnd);

      // Tổng lợi nhuận nền tảng = Lợi nhuận chênh lệch + Phí rút tiền
      const totalPlatformProfitVnd = grossSurveySpreadProfitVnd + (payoutStats.total_payout_fees_earned_vnd || 0);

      // Tỷ lệ take rate thực tế
      const actualTakeRatePct = totalCreatorSpendVnd > 0 
        ? ((grossSurveySpreadProfitVnd / totalCreatorSpendVnd) * 100).toFixed(1) 
        : (config.ECONOMICS.PLATFORM_TAKE_RATE * 100).toFixed(1);

      // 5. Thống kê chống gian lận
      const fraudCountRow = db.prepare('SELECT COUNT(*) AS total_fraud_caught FROM fraud_logs').get();

      return res.json({
        success: true,
        overview: {
          users: userStats,
          surveys: surveyStats,
          payouts: payoutStats,
          financials: {
            totalCreatorSpendVnd,
            totalRewardsIssuedVnd,
            grossSurveySpreadProfitVnd,
            payoutFeesEarnedVnd: payoutStats.total_payout_fees_earned_vnd || 0,
            totalPlatformProfitVnd,
            actualTakeRatePct: Number(actualTakeRatePct),
            targetTakeRatePct: config.ECONOMICS.PLATFORM_TAKE_RATE * 100,
            unrealizedLiabilityVnd: (userStats.total_active_points || 0) * config.ECONOMICS.POINT_TO_VND_RATE
          },
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

  listPayouts(req, res) {
    try {
      const { status } = req.query;
      let sql = `
        SELECT p.*, u.name AS user_name, u.email AS user_email, u.trust_score
        FROM payout_requests p
        JOIN users u ON p.user_id = u.id
      `;
      const params = [];
      const allowedStatus = ['PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'];
      if (status && allowedStatus.includes(String(status).toUpperCase())) {
        sql += ' WHERE p.status = ?';
        params.push(String(status).toUpperCase());
      }
      sql += ' ORDER BY p.created_at DESC';

      const payouts = db.prepare(sql).all(...params);
      return res.json({ success: true, payouts });
    } catch (err) {
      console.error('Lỗi listPayouts:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải danh sách yêu cầu thanh toán' });
    }
  }

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
