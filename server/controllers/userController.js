const crypto = require('crypto');
const db = require('../db/database');
const ledgerService = require('../services/ledgerService');

// Helper lấy ngày hiện tại định dạng YYYY-MM-DD theo múi giờ Việt Nam (UTC+7)
function getVietnamDateString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

// Helper tính ngày hôm trước theo chuỗi YYYY-MM-DD
function getVietnamYesterday(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Bảng thưởng điểm theo chuỗi ngày (Gamification Streaks)
function getStreakReward(streakDay) {
  switch (streakDay) {
    case 1: return { points: 50, badge: null };
    case 2: return { points: 80, badge: null };
    case 3: return { points: 120, badge: null };
    case 4: return { points: 160, badge: null };
    case 5: return { points: 200, badge: null };
    case 6: return { points: 250, badge: null };
    case 7: return { points: 500, badge: 'Badge Tích Cực' };
    default: return { points: 200, badge: null }; // Duy trì từ ngày 8 trở đi: +200 Point/ngày
  }
}

class UserController {
  /**
   * GET /api/v1/users/streak-info
   * Lấy thông tin chuỗi ngày của user đăng nhập, trạng thái hôm nay đã điểm danh chưa,
   * phần thưởng hôm nay và lộ trình 7 ngày tới.
   */
  getStreakInfo(req, res) {
    try {
      const userId = req.user.id;
      const todayStr = getVietnamDateString();
      const yesterdayStr = getVietnamYesterday(todayStr);

      const streakRow = db.prepare(`
        SELECT id, user_id, current_streak, max_streak, last_checkin_date, total_points_earned, updated_at
        FROM daily_streaks 
        WHERE user_id = ?
      `).get(userId) || {
        current_streak: 0,
        max_streak: 0,
        last_checkin_date: null,
        total_points_earned: 0
      };

      const hasCheckedInToday = streakRow.last_checkin_date === todayStr;
      const isStreakBroken = !hasCheckedInToday && streakRow.last_checkin_date !== null && streakRow.last_checkin_date !== yesterdayStr;

      // Xác định ngày chuỗi kế tiếp hoặc hiện tại
      let effectiveStreak = 1;
      if (hasCheckedInToday) {
        effectiveStreak = streakRow.current_streak;
      } else if (streakRow.last_checkin_date === yesterdayStr) {
        effectiveStreak = streakRow.current_streak + 1;
      } else {
        effectiveStreak = 1;
      }

      const todayReward = getStreakReward(effectiveStreak);

      // Xây dựng lộ trình 7 ngày
      const roadmap = [];
      for (let day = 1; day <= 7; day++) {
        const reward = getStreakReward(day);
        let status = 'LOCKED';

        if (hasCheckedInToday) {
          if (effectiveStreak >= 7) {
            status = 'CLAIMED';
          } else {
            status = day <= effectiveStreak ? 'CLAIMED' : 'LOCKED';
          }
        } else {
          if (effectiveStreak > 7) {
            status = 'CLAIMED';
          } else {
            if (day < effectiveStreak) {
              status = 'CLAIMED';
            } else if (day === effectiveStreak) {
              status = 'TODAY';
            } else {
              status = 'LOCKED';
            }
          }
        }

        roadmap.push({
          day,
          points: reward.points,
          badge: reward.badge,
          is_milestone: day === 7,
          status
        });
      }

      return res.json({
        success: true,
        streak: {
          current_streak: streakRow.current_streak,
          max_streak: streakRow.max_streak,
          last_checkin_date: streakRow.last_checkin_date,
          total_points_earned: streakRow.total_points_earned,
          has_checked_in_today: hasCheckedInToday,
          is_streak_broken: isStreakBroken,
          today_date: todayStr,
          next_streak_day: effectiveStreak,
          today_reward_points: todayReward.points,
          today_badge: todayReward.badge,
          roadmap
        }
      });
    } catch (err) {
      console.error('Lỗi getStreakInfo:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải thông tin chuỗi ngày điểm danh' });
    }
  }

  /**
   * POST /api/v1/users/checkin
   * Thực hiện điểm danh trong ngày (dựa theo ngày giờ VN UTC+7),
   * cộng điểm Point vào ví qua ledgerService, cập nhật daily_streaks, gửi thông báo vào notifications.
   */
  checkin(req, res) {
    try {
      const userId = req.user.id;
      const todayStr = getVietnamDateString();
      const yesterdayStr = getVietnamYesterday(todayStr);

      const streakRow = db.prepare(`
        SELECT id, user_id, current_streak, max_streak, last_checkin_date, total_points_earned
        FROM daily_streaks 
        WHERE user_id = ?
      `).get(userId);

      // Chặn điểm danh trùng lặp trong cùng 1 ngày
      if (streakRow && streakRow.last_checkin_date === todayStr) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã hoàn thành điểm danh ngày hôm nay rồi. Hãy quay lại vào ngày mai!'
        });
      }

      // Tính toán số ngày chuỗi mới
      let newStreak = 1;
      if (streakRow && streakRow.last_checkin_date === yesterdayStr) {
        newStreak = streakRow.current_streak + 1;
      }

      const reward = getStreakReward(newStreak);

      // 1. Cộng điểm vào ví thông qua ledgerService
      const ledgerResult = ledgerService.rewardDailyStreak(userId, reward.points, newStreak, todayStr);

      // 2. Cập nhật bảng daily_streaks nguyên tử
      const currentMax = streakRow ? streakRow.max_streak : 0;
      const newMax = Math.max(currentMax, newStreak);

      db.prepare(`
        INSERT INTO daily_streaks (user_id, current_streak, max_streak, last_checkin_date, total_points_earned, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          current_streak = excluded.current_streak,
          max_streak = MAX(daily_streaks.max_streak, excluded.max_streak),
          last_checkin_date = excluded.last_checkin_date,
          total_points_earned = daily_streaks.total_points_earned + excluded.total_points_earned,
          updated_at = CURRENT_TIMESTAMP
      `).run(userId, newStreak, newMax, todayStr, reward.points);

      // 3. Gửi thông báo vào bảng notifications
      const notifId = crypto.randomUUID();
      const notifTitle = newStreak === 7
        ? '[Điểm Danh] Chúc mừng! Đạt Mốc Vàng 7 ngày liên tiếp'
        : `[Điểm Danh] Duy trì chuỗi ${newStreak} ngày thành công`;
      const notifMsg = newStreak === 7
        ? `Bạn đã xuất sắc hoàn thành chuỗi 7 ngày liên tiếp, nhận +${reward.points} Point và mở khóa Badge Tích Cực!`
        : `Bạn đã điểm danh thành công Ngày ${newStreak} và nhận được +${reward.points} Point vào ví thưởng.`;

      db.prepare(`
        INSERT INTO notifications (id, user_id, survey_id, type, title, message, channel)
        VALUES (?, ?, null, 'DAILY_STREAK', ?, ?, 'ALL')
      `).run(notifId, userId, notifTitle, notifMsg);

      return res.json({
        success: true,
        message: newStreak === 7
          ? `Chúc mừng bạn đã đạt Mốc Vàng 7 ngày liên tiếp! Nhận +${reward.points} Point và Badge Tích Cực.`
          : `Điểm danh Ngày ${newStreak} thành công! Nhận +${reward.points} Point.`,
        streak: {
          current_streak: newStreak,
          max_streak: newMax,
          last_checkin_date: todayStr,
          points_earned: reward.points,
          badge: reward.badge,
          new_point_balance: ledgerResult.newPointBalance
        }
      });
    } catch (err) {
      console.error('Lỗi checkin:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Lỗi xử lý điểm danh hàng ngày'
      });
    }
  }
}

module.exports = new UserController();
