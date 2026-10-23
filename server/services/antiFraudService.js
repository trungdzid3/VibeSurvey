const config = require('../config');
const db = require('../db/database');
const crypto = require('crypto');

class AntiFraudService {
  /**
   * Tính toán thời gian tối thiểu hợp lý (T_min) cho bài khảo sát
   */
  calculateMinCompletionTime(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return 5;
    }

    let totalWords = 0;
    let totalActionTime = 0;

    for (const q of questions) {
      if (!q) continue;
      // Đếm số từ trong câu hỏi
      const words = String(q.content || '').trim().split(/\s+/).filter(Boolean).length;
      totalWords += words;

      // Đếm thêm số từ trong các lựa chọn nếu có
      if (q.options_json) {
        try {
          const opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
          if (Array.isArray(opts)) {
            for (const opt of opts) {
              totalWords += String(opt || '').trim().split(/\s+/).filter(Boolean).length;
            }
          }
        } catch (e) {
          // Bỏ qua lỗi parse
        }
      }

      // Thời gian thao tác tối thiểu
      if (q.type === 'OPEN_TEXT') {
        totalActionTime += config.ANTI_FRAUD.ACTION_TIME_SEC.TEXT; // 8.0s
      } else {
        totalActionTime += config.ANTI_FRAUD.ACTION_TIME_SEC.CHOICE; // 1.5s
      }
    }

    const readingTime = totalWords / config.ANTI_FRAUD.WORDS_PER_SECOND; // 5 từ/giây
    const tMin = Math.ceil(readingTime + totalActionTime);
    return Math.max(tMin, 5); // Tối thiểu 5 giây cho khảo sát cực ngắn
  }

  /**
   * Tính Shannon Entropy để phát hiện chuỗi gõ phím ngẫu nhiên hoặc lặp ký tự (ví dụ: "aaaaa", "asdfghjk")
   */
  calculateEntropy(str) {
    if (!str || str.length === 0) return 0;
    const freq = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    const len = str.length;
    for (const char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /**
   * Đánh giá chất lượng bài nộp và phát hiện gian lận
   * @param {Array} questions Danh sách câu hỏi kèm đáp án đúng câu bẫy từ DB
   * @param {Object} answersPayload Cặp { [question_id]: answer_value }
   * @param {number} durationSec Thời gian làm bài thực tế tính bằng giây
   * @returns {Object} { isValid, status, qualityScore, reasons, clientReasons, internalReasons, scoreDetails }
   */
  evaluateSubmission(questions, answersPayload, durationSec) {
    const internalReasons = [];
    const clientReasons = [];
    const validQuestions = Array.isArray(questions) ? questions : [];
    const payload = (answersPayload && typeof answersPayload === 'object' && !Array.isArray(answersPayload)) ? answersPayload : {};
    const duration = Math.max(0, parseInt(durationSec, 10) || 0);

    const tMin = this.calculateMinCompletionTime(validQuestions);

    // Chốt chặn 1: Bẫy Tốc độ (Speed Trap)
    let speedRatio = 1.0;
    if (duration < tMin) {
      internalReasons.push(`Làm bài quá nhanh (${duration}s so với tối thiểu ${tMin}s - Nghi ngờ bot/spam)`);
      clientReasons.push(`Thời gian hoàn thành (${duration}s) nhanh bất thường so với thời lượng đọc tối thiểu (${tMin}s)`);
      speedRatio = Math.max(0.1, duration / (1.2 * tMin));
    } else {
      speedRatio = Math.min(1.0, duration / (1.2 * tMin));
    }

    // Chốt chặn 2: Bẫy Tập trung (Attention Check) - BẢO MẬT: Tuyệt đối không để lộ câu hỏi bẫy cho client!
    let attentionScore = 1.0;
    const attentionQuestions = validQuestions.filter(q => q && q.is_attention_check === 1);
    for (const q of attentionQuestions) {
      const userAnswer = String(payload[q.id] || '').trim().toLowerCase();
      const expected = String(q.expected_answer || '').trim().toLowerCase();
      if (userAnswer !== expected) {
        attentionScore = 0.0;
        // Chi tiết kỹ thuật dành riêng cho Admin audit log
        internalReasons.push(`Trả lời sai câu hỏi kiểm tra độ chú ý (ID: ${q.id}, Câu: "${String(q.content || '').substring(0, 40)}...", Kỳ vọng: "${expected}", Nhận: "${userAnswer}")`);
        // Thông báo trung tính, an toàn gửi cho Client (không làm lộ câu hỏi nào là bẫy)
        clientReasons.push('Chưa đạt tiêu chuẩn kiểm tra độ tập trung và đọc hiểu yêu cầu bài khảo sát');
        break;
      }
    }

    // Chốt chặn 3: Phương sai đường thẳng (Straight-lining) và Văn bản rác
    let varianceFactor = 1.0;
    const scaleAnswers = [];
    for (const q of validQuestions) {
      if (!q) continue;
      if (q.type === 'LIKERT_SCALE' || q.type === 'SINGLE_CHOICE' || q.type === 'DROPDOWN' || q.type === 'RATING_STARS') {
        const val = payload[q.id];
        if (val !== undefined && val !== null) {
          scaleAnswers.push(String(val));
        }
      } else if (q.type === 'OPEN_TEXT') {
        const textVal = String(payload[q.id] || '').trim();
        if (textVal.length < 5) {
          varianceFactor *= 0.5;
          internalReasons.push(`Câu trả lời tự luận (ID: ${q.id}) quá ngắn (${textVal.length} ký tự)`);
          clientReasons.push('Câu trả lời tự luận quá ngắn hoặc chưa hoàn chỉnh');
        } else {
          const entropy = this.calculateEntropy(textVal);
          if (entropy < 1.8 && textVal.length >= 10) {
            varianceFactor *= 0.3;
            internalReasons.push(`Văn bản tự luận (ID: ${q.id}) có entropy thấp (${entropy.toFixed(2)}), dấu hiệu spam phím`);
            clientReasons.push('Văn bản tự luận có dấu hiệu ký tự lặp hoặc spam phím');
          }
        }
      }
    }

    // Kiểm tra straight-lining nếu có >= 4 câu lựa chọn
    if (scaleAnswers.length >= 4) {
      const firstVal = scaleAnswers[0];
      const allIdentical = scaleAnswers.every(v => v === firstVal);
      if (allIdentical) {
        varianceFactor *= 0.2;
        internalReasons.push('Chọn đáp án giống hệt nhau liên tiếp cho toàn bộ câu hỏi (Straight-lining)');
        clientReasons.push('Chọn đáp án giống hệt nhau liên tiếp cho toàn bộ câu hỏi (Straight-lining)');
      }
    }

    // Tính điểm chất lượng tổng hợp Q_final
    const qualityScore = parseFloat((attentionScore * varianceFactor * speedRatio).toFixed(2));

    let status = 'VALIDATED';
    if (qualityScore >= config.ANTI_FRAUD.MIN_QUALITY_SCORE) {
      status = 'VALIDATED';
    } else if (qualityScore >= config.ANTI_FRAUD.MANUAL_REVIEW_SCORE) {
      status = 'FLAGGED_MANUAL';
    } else {
      status = 'REJECTED_FRAUD';
    }

    return {
      isValid: status === 'VALIDATED',
      status,
      qualityScore,
      durationSec: duration,
      tMin,
      reasons: clientReasons, // Đảm bảo an toàn khi trả về client
      clientReasons,
      internalReasons,
      scoreDetails: {
        speedRatio: parseFloat(speedRatio.toFixed(2)),
        attentionScore,
        varianceFactor: parseFloat(varianceFactor.toFixed(2)),
        tMin
      }
    };
  }

  /**
   * Chuẩn hóa URL biểu mẫu Google/MS Forms để chống trùng lặp
   * Loại bỏ trailing slash, query parameters rác (usp=sharing, fbclid, ref...)
   */
  normalizeFormUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    try {
      const trimmed = rawUrl.trim();
      const parsed = new URL(trimmed);
      
      // Giữ pathname chuẩn
      let pathname = parsed.pathname.replace(/\/+$/, '');
      
      // Xóa các query rác
      const trackingParams = ['usp', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'ref', 'authuser'];
      trackingParams.forEach(p => parsed.searchParams.delete(p));

      const cleanSearch = parsed.searchParams.toString();
      const cleanUrl = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${pathname}${cleanSearch ? '?' + cleanSearch : ''}`;
      return cleanUrl;
    } catch (e) {
      // Nếu không parse được chuẩn URL thì trim và lowercase
      return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
    }
  }

  /**
   * Kiểm tra trùng lặp đường link biểu mẫu trong toàn bộ hệ thống
   */
  checkDuplicateFormUrl(normalizedUrl, excludeSurveyId = null) {
    if (!normalizedUrl) return { isDuplicate: false };

    let query = `
      SELECT id, creator_id, title, status, is_free_trial 
      FROM surveys 
      WHERE (normalized_form_url = ? OR external_form_url = ?)
    `;
    const params = [normalizedUrl, normalizedUrl];

    if (excludeSurveyId) {
      query += ' AND id != ?';
      params.push(excludeSurveyId);
    }

    const existing = db.prepare(query).get(...params);
    if (existing) {
      return {
        isDuplicate: true,
        existingSurvey: existing
      };
    }
    return { isDuplicate: false };
  }

  /**
   * Làm sạch địa chỉ IP từ request
   */
  cleanIpAddress(rawIp) {
    if (!rawIp || typeof rawIp !== 'string') return '127.0.0.1';
    let ip = rawIp.trim();
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    if (ip === '::1' || ip === 'localhost') {
      ip = '127.0.0.1';
    }
    return ip;
  }

  isLocalhost(ip) {
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
  }

  /**
   * Kiểm tra IP có bị cấm (Banned) hay không
   */
  checkIpBanned(rawIp) {
    const ip = this.cleanIpAddress(rawIp);
    if (this.isLocalhost(ip)) return null;
    const row = db.prepare('SELECT ip_address, reason, banned_at FROM banned_ips WHERE ip_address = ?').get(ip);
    return row || null;
  }

  /**
   * Giám sát IP & Thiết bị (Multi-Account Detection & Auto Ban IP)
   * - Ngưỡng 1 (>= 3 tài khoản trong 24h): Cảnh báo Khả Nghi gửi về Admin
   * - Ngưỡng 2 (>= 5 tài khoản trong 24h): Tự động BAN IP và khóa tài khoản
   */
  trackAndVerifyDeviceIp({ userId, rawIp, deviceFingerprint, action = 'ACTIVITY' }) {
    const ip = this.cleanIpAddress(rawIp);
    const safeFingerprint = deviceFingerprint && typeof deviceFingerprint === 'string' 
      ? deviceFingerprint.trim().substring(0, 100) 
      : null;

    // 1. Kiểm tra IP đã bị ban trước đó chưa
    const isBanned = this.checkIpBanned(ip);
    if (isBanned) {
      throw new Error(`Địa chỉ IP của bạn (${ip}) đã bị khóa truy cập do vi phạm chính sách nền tảng: ${isBanned.reason}`);
    }

    // 2. Ghi nhận nhật ký thiết bị/IP
    const logId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO device_ip_logs (id, user_id, ip_address, device_fingerprint, action)
      VALUES (?, ?, ?, ?, ?)
    `).run(logId, userId || null, ip, safeFingerprint, action);

    // 3. Đếm số lượng tài khoản khác nhau trên IP hoặc Device Fingerprint trong 24 giờ qua
    let userCountQuery = `
      SELECT COUNT(DISTINCT user_id) AS distinct_users, GROUP_CONCAT(DISTINCT user_id) AS user_ids
      FROM device_ip_logs 
      WHERE (ip_address = ? OR (device_fingerprint IS NOT NULL AND device_fingerprint = ?))
        AND user_id IS NOT NULL
        AND created_at >= datetime('now', '-24 hours')
    `;
    const stats = db.prepare(userCountQuery).get(ip, safeFingerprint || '___NONE___');
    const distinctUsers = stats ? (stats.distinct_users || 0) : 0;
    const userIds = stats && stats.user_ids ? stats.user_ids.split(',') : [];

    // 4. Ngưỡng 2: TỰ ĐỘNG BAN IP nếu >= 5 tài khoản (Không áp dụng cho IP nội bộ loopback 127.0.0.1)
    if (distinctUsers >= 5 && !this.isLocalhost(ip)) {
      const banReason = `Tự động Ban: Phát hiện ${distinctUsers} tài khoản hoạt động trên cùng một IP/Thiết bị trong 24h (Tấn công Sybil / Cày lượt dùng thử)`;
      db.prepare('INSERT OR IGNORE INTO banned_ips (ip_address, reason) VALUES (?, ?)').run(ip, banReason);

      // Tự động chuyển các tài khoản liên quan sang BANNED (Không bao giờ ban tài khoản Admin)
      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        db.prepare(`UPDATE users SET status = 'BANNED' WHERE id IN (${placeholders}) AND role != 'ADMIN'`).run(...userIds);
      }

      // Ghi log gian lận nghiêm trọng
      const fraudLogId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO fraud_logs (id, user_id, ip_address, device_fingerprint, reason, score_details_json)
        VALUES (?, ?, ?, ?, 'AUTO_BAN_IP_MULTI_ACCOUNT_BREACH', ?)
      `).run(
        fraudLogId, 
        userId || (userIds[0] || null), 
        ip, 
        safeFingerprint,
        JSON.stringify({ distinctUsers, userIds, action, alert_level: 'CRITICAL', banReason })
      );

      throw new Error(`Địa chỉ IP của bạn (${ip}) đã bị khóa tự động do phát hiện ${distinctUsers} tài khoản tạo/đăng nhập bất thường trên cùng một thiết bị.`);
    }

    // 5. Ngưỡng 1: CẢNH BÁO KHẢ NGHI CHO ADMIN nếu >= 3 tài khoản (Không áp dụng cho IP nội bộ loopback 127.0.0.1)
    if (distinctUsers >= 3 && !this.isLocalhost(ip)) {
      // Kiểm tra xem trong 1 giờ qua đã ghi cảnh báo khả nghi cho IP này chưa
      const recentAlert = db.prepare(`
        SELECT id FROM fraud_logs 
        WHERE ip_address = ? AND reason = 'CANH_BAO_KHA_NGHI_MULTI_ACCOUNT'
          AND created_at >= datetime('now', '-1 hour')
      `).get(ip);

      if (!recentAlert) {
        const fraudLogId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO fraud_logs (id, user_id, ip_address, device_fingerprint, reason, score_details_json)
          VALUES (?, ?, ?, ?, 'CANH_BAO_KHA_NGHI_MULTI_ACCOUNT', ?)
        `).run(
          fraudLogId,
          userId || null,
          ip,
          safeFingerprint,
          JSON.stringify({
            distinctUsers,
            userIds,
            action,
            alert_level: 'WARNING',
            message: `Phát hiện ${distinctUsers} tài khoản dùng chung một địa chỉ IP/Thiết bị trong 24h`
          })
        );
      }

      return { isSuspicious: true, distinctUsers, alertLevel: 'WARNING' };
    }

    return { isSuspicious: false, distinctUsers };
  }

  /**
   * Gỡ Ban cho địa chỉ IP (Dành cho Admin)
   */
  unbanIp(rawIp) {
    const ip = this.cleanIpAddress(rawIp);
    const result = db.prepare('DELETE FROM banned_ips WHERE ip_address = ?').run(ip);
    return { success: true, changes: result.changes };
  }

  /**
   * Lấy danh sách IP bị cấm
   */
  listBannedIps() {
    return db.prepare('SELECT ip_address, reason, banned_at FROM banned_ips ORDER BY banned_at DESC').all();
  }
}

module.exports = new AntiFraudService();
