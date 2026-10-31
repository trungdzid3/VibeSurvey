/**
 * PUSH NOTIFICATION ENGINE & MOBILE HYBRID SERVICE
 * Quan ly dang ky Web Push, Android Capacitor Push & Ban thong bao day thoi gian thuc
 * Tu dong dong bo sang bang notifications va email_notifications_log
 */

const crypto = require('crypto');
const db = require('../db/database');
const config = require('../config');

class PushNotificationService {
  constructor() {
    // Ring-buffer luu tru cac thong bao day moi nhat phuc vu realtime polling tren SPA
    this.recentBroadcasts = [];
    this.maxRecentBroadcasts = 30;
  }

  /**
   * Dang ky kenh thong bao day (Web Push / Mobile Hybrid / Capacitor)
   * @param {string|null} userId ID nguoi dung neu da dang nhap
   * @param {Object} subscriptionData Du lieu dang ky tu trinh duyet hoac thiet bi
   * @returns {Object} Ket qua luu tru
   */
  saveSubscription(userId, subscriptionData = {}) {
    let endpoint = subscriptionData.endpoint;
    if (!endpoint || typeof endpoint !== 'string' || endpoint.trim().length === 0) {
      throw new Error('Endpoint dang ky thong bao day khong hop le');
    }
    endpoint = endpoint.trim();

    // Ho tro ca 2 format: keys_p256dh/keys_auth hoac subscription.keys.p256dh/auth
    let p256dh = subscriptionData.keys_p256dh || (subscriptionData.keys && subscriptionData.keys.p256dh) || null;
    let auth = subscriptionData.keys_auth || (subscriptionData.keys && subscriptionData.keys.auth) || null;
    let deviceType = (subscriptionData.device_type || 'WEB').toUpperCase();
    if (!['WEB', 'ANDROID', 'IOS'].includes(deviceType)) {
      deviceType = 'WEB';
    }

    // Xac thuc userId ton tai trong bang users de dam bao khoa ngoai (Foreign Key)
    let validUserId = null;
    if (userId) {
      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
      if (userExists) validUserId = userExists.id;
    }

    const existing = db.prepare('SELECT id, user_id FROM push_subscriptions WHERE endpoint = ?').get(endpoint);

    if (existing) {
      // Cap nhat user_id va lam moi last_active_at
      const targetUserId = validUserId || existing.user_id || null;
      db.prepare(`
        UPDATE push_subscriptions 
        SET user_id = ?, keys_p256dh = COALESCE(?, keys_p256dh), keys_auth = COALESCE(?, keys_auth), 
            device_type = ?, last_active_at = CURRENT_TIMESTAMP
        WHERE endpoint = ?
      `).run(targetUserId, p256dh, auth, deviceType, endpoint);

      return {
        success: true,
        id: existing.id,
        action: 'UPDATED',
        endpoint
      };
    }

    const id = 'psub_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO push_subscriptions (
        id, user_id, endpoint, keys_p256dh, keys_auth, device_type, created_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, validUserId, endpoint, p256dh, auth, deviceType);

    return {
      success: true,
      id,
      action: 'CREATED',
      endpoint
    };
  }

  /**
   * Huy dang ky thong bao day
   * @param {string} endpoint
   * @param {string|null} userId
   */
  removeSubscription(endpoint, userId = null) {
    if (!endpoint) return { success: false, message: 'Endpoint thieu' };
    if (userId) {
      db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND (user_id = ? OR user_id IS NULL)').run(endpoint, userId);
    } else {
      db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
    }
    return { success: true };
  }

  /**
   * Lay danh sach dang ky thong bao cua mot nguoi dung hoac toan he thong
   * @param {string|null} userId
   * @param {number} limit
   */
  getSubscriptions(userId = null, limit = 500) {
    if (userId) {
      return db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY last_active_at DESC LIMIT ?').all(userId, limit);
    }
    return db.prepare('SELECT * FROM push_subscriptions ORDER BY last_active_at DESC LIMIT ?').all(limit);
  }

  /**
   * Kiem tra mot khao sat co thuoc dien Thuong Cao hoac Hoa Toc hay khong:
   * - Goi HOA TOC (RUSH / FAST_TRACK)
   * - Hoac co Creator Boost >= 25% (hoac nấc RECOMMENDED +25%)
   * - Hoac tieu de / nhan co chua [HOA TOC], [Thuong Cao]
   * - Hoac thu lao tren 250 diem (~2.500d)
   * @param {Object} survey
   * @returns {boolean}
   */
  isHighRewardSurvey(survey) {
    if (!survey) return false;

    // 1. Kiem tra package_type hoac pricing_tier
    const tier = String(survey.pricing_tier || '').toUpperCase();
    const pkg = String(survey.package_type || '').toUpperCase();

    if (['RUSH', 'FAST_TRACK'].includes(tier) || ['RUSH', 'FAST_TRACK'].includes(pkg)) {
      return true;
    }

    // 2. Kiem tra nấc gia RECOMMENDED (tang 25% gia so voi san)
    if (tier === 'RECOMMENDED') {
      return true;
    }

    // 3. Kiem tra co is_fast_track
    if (survey.is_fast_track === 1 || survey.is_fast_track === true) {
      return true;
    }

    // 4. Kiem tra Creator Boost >= 25%
    if (survey.creator_boost !== undefined && survey.creator_boost !== null) {
      const boostVal = parseFloat(survey.creator_boost);
      if (!isNaN(boostVal) && boostVal >= 25) {
        return true;
      }
    }

    // 5. Kiem tra tieu de chua nhan dien thuong cao / hoa toc
    const title = String(survey.title || '');
    const upperTitle = title.toUpperCase();
    if (
      upperTitle.includes('HỎA TỐC') ||
      upperTitle.includes('HOA TOC') ||
      upperTitle.includes('THƯỞNG CAO') ||
      upperTitle.includes('THUONG CAO') ||
      upperTitle.includes('[FAST-TRACK]') ||
      upperTitle.includes('[RUSH]') ||
      upperTitle.includes('[VIP]')
    ) {
      return true;
    }

    // 6. Kiem tra diem thuong >= 250 diem (hoac cost_per_response >= 4000 VND)
    const rewardPoints = parseInt(survey.reward_points_per_response, 10) || 0;
    const costPerResp = parseFloat(survey.cost_per_response) || 0;
    if (rewardPoints >= 250 || costPerResp >= 4000) {
      return true;
    }

    return false;
  }

  /**
   * Kich hoat va phat thong bao day toi tat ca dap vien online va thiet bi da dang ky
   * Tu dong tao ban ghi trong bang notifications va email_notifications_log dong bo
   * @param {Object} survey Ban ghi khao sat tu co so du lieu
   * @returns {Object} Ket qua thong bao
   */
  sendHighRewardSurveyAlert(survey) {
    if (!survey || !survey.id) {
      throw new Error('Du lieu khao sat khong hop le de gui thong bao');
    }

    const rewardPoints = survey.reward_points_per_response || 0;
    const rewardVnd = rewardPoints * 10;
    const appBaseUrl = config.APP_URL || 'http://localhost:3000';
    const surveyUrl = `${appBaseUrl}/?survey=${survey.id}`;

    const notificationTitle = `[HỎA TỐC] Khảo sát mới: ${survey.title}`;
    const pushBody = `Khảo sát thù lao cao: nhận ngay +${rewardPoints.toLocaleString('vi-VN')} Điểm (~${rewardVnd.toLocaleString('vi-VN')} đ). Bấm để tham gia ngay!`;
    const emailSubject = `[SurvHub] [HỎA TỐC] Khảo sát mới thưởng cao: ${survey.title}`;

    // Xac thuc surveyId ton tai trong bang surveys de bao dam rang buoc khoa ngoai
    let validSurveyId = null;
    if (survey.id) {
      const sRow = db.prepare('SELECT id FROM surveys WHERE id = ?').get(survey.id);
      if (sRow) validSurveyId = sRow.id;
    }

    // 1. Tim tap dap vien dang hoat dong hoac da dang ky nhan thong bao
    const respondents = db.prepare(`
      SELECT u.id, u.email, u.name 
      FROM users u
      WHERE u.role = 'RESPONDENT' AND u.status = 'ACTIVE'
      ORDER BY u.last_active_at DESC, u.created_at DESC
      LIMIT 500
    `).all();

    let pushCount = 0;
    let emailCount = 0;

    const checkNotifExists = db.prepare(`
      SELECT id FROM notifications 
      WHERE user_id = ? AND survey_id = ? AND type IN ('HIGH_REWARD_SURVEY', 'FAST_TRACK_SURVEY')
    `);

    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, user_id, survey_id, type, title, message, channel, is_read, created_at)
      VALUES (?, ?, ?, 'HIGH_REWARD_SURVEY', ?, ?, 'ALL', 0, CURRENT_TIMESTAMP)
    `);

    const insertEmailLog = db.prepare(`
      INSERT INTO email_notifications_log (id, user_id, recipient_email, survey_id, subject, content_snippet, delivery_status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'SENT', CURRENT_TIMESTAMP)
    `);

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      for (const respondent of respondents) {
        // Tranh tao thong bao trung lap neu da tung ban
        const existingNotif = validSurveyId ? checkNotifExists.get(respondent.id, validSurveyId) : null;
        if (!existingNotif) {
          const notifId = 'notif_' + crypto.randomUUID();
          insertNotification.run(notifId, respondent.id, validSurveyId, notificationTitle, pushBody);
          pushCount++;

          const emailLogId = 'email_' + crypto.randomUUID();
          const emailSnippet = `Hệ thống vừa mở khảo sát thù lao cao "${survey.title}" với thù lao +${rewardPoints.toLocaleString('vi-VN')} Điểm. Tham gia ngay tại: ${surveyUrl}`;
          insertEmailLog.run(emailLogId, respondent.id, respondent.email, validSurveyId, emailSubject, emailSnippet);
          emailCount++;
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('Loi dong bo bang notifications va email_notifications_log:', err);
      throw err;
    }

    // 2. Lay danh sach thiet bi va Web Push da dang ky de gui Payload
    const subscriptions = db.prepare(`
      SELECT * FROM push_subscriptions 
      ORDER BY last_active_at DESC 
      LIMIT 1000
    `).all();

    const pushPayload = {
      id: 'alert_' + crypto.randomUUID(),
      survey_id: survey.id,
      title: notificationTitle,
      body: pushBody,
      reward_points: rewardPoints,
      reward_vnd: rewardVnd,
      url: `/?survey=${survey.id}`,
      type: 'HIGH_REWARD_SURVEY',
      timestamp: Date.now()
    };

    // 3. Luu vao bo nho dem phat song thoi gian thuc (Realtime Broadcast Buffer)
    this.recentBroadcasts.unshift(pushPayload);
    if (this.recentBroadcasts.length > this.maxRecentBroadcasts) {
      this.recentBroadcasts.pop();
    }

    return {
      success: true,
      surveyId: survey.id,
      surveyTitle: survey.title,
      pushCount,
      emailCount,
      subscribersCount: subscriptions.length,
      payload: pushPayload
    };
  }

  /**
   * Lay cac tin phat song thoi gian thuc gan nhat (danh cho Client polling / SSE)
   * @param {number} sinceTimestamp
   * @returns {Array}
   */
  getRecentBroadcasts(sinceTimestamp = 0) {
    if (!sinceTimestamp) {
      return this.recentBroadcasts.slice(0, 10);
    }
    return this.recentBroadcasts.filter(b => b.timestamp > sinceTimestamp);
  }
}

const pushNotificationService = new PushNotificationService();
module.exports = pushNotificationService;
