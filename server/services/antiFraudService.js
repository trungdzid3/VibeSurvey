const config = require('../config');
const db = require('../db/database');
const crypto = require('crypto');

class AntiFraudService {
  constructor() {
    this.DEFAULT_INITIAL_TRUST_SCORE = 85.0;
  }

  /**
   * Tính thời gian chuẩn (T_standard) của bài khảo sát:
   * - Trắc nghiệm (SINGLE_CHOICE, MULTIPLE_CHOICE, DROPDOWN): 10 giây/câu
   * - Thang đo (LIKERT_SCALE, LINEAR_SCALE, RATING_STARS): 12 giây/câu
   * - Ma trận Lưới (CHOICE_GRID, CHECKBOX_GRID): 5 giây / mỗi hàng trong câu hỏi Lưới
   * - Câu tự luận (OPEN_TEXT, SHORT_TEXT, PARAGRAPH): 0 giây
   * - Câu hỏi khác (DATE_INPUT, TIME_INPUT, FILE_UPLOAD): 5 giây
   */
  calculateStandardTime(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      return 0;
    }

    let totalStandardSec = 0;

    for (const q of questions) {
      if (!q) continue;
      const type = String(q.type || '').toUpperCase();

      if (type === 'OPEN_TEXT' || type === 'SHORT_TEXT' || type === 'PARAGRAPH') {
        // Tự luận = 0 giây theo quy chuẩn KE_HOACH_TONG_THE.md
        continue;
      } else if (type === 'LIKERT_SCALE' || type === 'LINEAR_SCALE' || type === 'RATING_STARS') {
        totalStandardSec += 12;
      } else if (type === 'CHOICE_GRID' || type === 'CHECKBOX_GRID') {
        // Đếm số hàng trong câu hỏi Lưới
        let rowCount = 2; // Mặc định tối thiểu 2 hàng
        if (q.options_json) {
          try {
            const parsed = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
            if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
              rowCount = parsed.rows.length;
            } else if (Array.isArray(parsed) && parsed.length > 0) {
              rowCount = parsed.length;
            }
          } catch (e) {
            rowCount = 2;
          }
        }
        totalStandardSec += (rowCount * 5); // 5s/hàng
      } else if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE' || type === 'DROPDOWN') {
        totalStandardSec += 10;
      } else if (type === 'DATE_INPUT' || type === 'TIME_INPUT' || type === 'FILE_UPLOAD') {
        totalStandardSec += 5;
      } else {
        totalStandardSec += 10;
      }
    }

    return totalStandardSec;
  }

  /**
   * Tính toán thời gian tối thiểu hợp lý (T_min) cho bài khảo sát:
   * Ngưỡng tối thiểu để không bị phạt REJECTED (< 35% thời gian chuẩn)
   */
  calculateMinCompletionTime(questions) {
    const tStandard = this.calculateStandardTime(questions);
    if (tStandard === 0) {
      return 0;
    }
    // Ngưỡng 35% của thời gian chuẩn
    return Math.max(1, Math.ceil(tStandard * 0.35));
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
   * Tính phương sai toán học (sigma^2) của một mảng số
   */
  calculateVariance(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    const n = numbers.length;
    const mean = numbers.reduce((a, b) => a + b, 0) / n;
    const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    return parseFloat(variance.toFixed(4));
  }

  /**
   * Chốt chặn 4: Bộ lọc câu trả lời tự luận rác (Open-Text Filter)
   * - Cho phép hợp lệ 100% số 0 hoặc từ ngắn thực tế trong tiếng Việt ("0", "Không", "Có", "Chưa", "Bình thường", "Ok", ...)
   * - Chỉ chặn chuỗi gõ phím loạn xạ vô nghĩa rõ ràng (asdfgh, qwerty) hoặc lặp 1 ký tự liên tiếp từ 5 lần trở lên (aaaaa, 11111)
   */
  validateOpenTextAnswer(text) {
    if (text === null || text === undefined) {
      return { isValid: true, reason: null };
    }
    const raw = String(text).trim();
    if (raw.length === 0) {
      return { isValid: true, reason: null };
    }

    const lower = raw.toLowerCase();

    // 1. Chặn lặp 1 ký tự liên tiếp từ 5 lần trở lên (ví dụ: aaaaa, 111111, .....)
    if (/(.)\1{4,}/i.test(raw)) {
      return {
        isValid: false,
        reason: 'Phát hiện lặp 1 ký tự liên tiếp từ 5 lần trở lên (spam phím)'
      };
    }

    // 2. Chặn chuỗi gõ bàn phím loạn xạ vô nghĩa rõ ràng
    const keyboardSpamPattern = /(asdfgh|qwerty|zxcvbn|dfghjk|ghjkl|yuiop|poiuy|lkjhg|mnbvc|123456)/i;
    if (keyboardSpamPattern.test(raw)) {
      return {
        isValid: false,
        reason: 'Phát hiện chuỗi gõ phím bàn phím loạn xạ vô nghĩa'
      };
    }

    // 3. Cho phép hợp lệ 100% số 0 hoặc các số tự nhiên / thập phân hợp lệ (không bị lặp vô nghĩa)
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
      return { isValid: true, reason: null };
    }

    // 4. Cho phép các từ ngắn thực tế trong tiếng Việt
    const validShortWords = new Set([
      '0', 'có', 'co', 'không', 'khong', 'chưa', 'chua', 'ok', 'oke', 'okay',
      'ko', 'k', 'không có', 'khong co', 'chưa có', 'chua co', 'bình thường',
      'binh thuong', 'tốt', 'tot', 'rất tốt', 'rat tot', 'ổn', 'on', 'k rõ',
      'không biết', 'khong biet', 'đồng ý', 'dong y', 'hài lòng', 'hai long',
      'tạm được', 'tam duoc', 'bình thường thôi', 'chưa rõ', 'chuẩn', 'chuan'
    ]);
    if (validShortWords.has(lower)) {
      return { isValid: true, reason: null };
    }

    // 5. Kiểm tra entropy với văn bản dài (độ dài >= 15 mà entropy < 1.5)
    if (raw.length >= 15) {
      const entropy = this.calculateEntropy(raw);
      if (entropy < 1.5) {
        return {
          isValid: false,
          reason: `Văn bản có entropy quá thấp (${entropy.toFixed(2)}), dấu hiệu spam phím`
        };
      }
    }

    return { isValid: true, reason: null };
  }

  /**
   * Chốt chặn 2: Sinh câu hỏi bẫy chú ý động giữa bài (từ 30% đến 80% tiến độ)
   */
  generateDynamicAttentionCheck(totalQuestions, seed = null) {
    const total = Math.max(2, parseInt(totalQuestions, 10) || 5);
    const minIndex = Math.max(1, Math.floor(total * 0.3));
    const maxIndex = Math.max(minIndex, Math.floor(total * 0.8));
    const targetIndex = Math.floor(minIndex + Math.random() * (maxIndex - minIndex + 1));

    const optionsPool = [
      ['Rất đồng ý', 'Đồng ý', 'Trung lập', 'Không đồng ý', 'Cam kết đọc kỹ'],
      ['Lựa chọn A', 'Lựa chọn B', 'Chính xác', 'Lựa chọn D'],
      ['Không bao giờ', 'Hiếm khi', 'Đôi khi', 'Luôn luôn', 'Xác nhận chú ý'],
      ['1 sao', '2 sao', '3 sao', '4 sao', '5 sao', 'Tôi đang tập trung']
    ];
    const pickPool = optionsPool[Math.floor(Math.random() * optionsPool.length)];
    const expected = pickPool[pickPool.length - 1];

    return {
      id: 'dynamic_attention_' + crypto.randomUUID().substring(0, 8),
      order_index: targetIndex,
      type: 'SINGLE_CHOICE',
      content: `Để xác nhận bạn đang đọc kỹ nội dung câu hỏi, vui lòng chọn phương án "${expected}".`,
      options_json: JSON.stringify(pickPool),
      is_attention_check: 1,
      is_dynamic: 1,
      expected_answer: expected,
      is_required: 1
    };
  }

  /**
   * Sinh câu hỏi bẫy xác nhận lần 2 (Cơ chế Second-Chance Grace)
   */
  generateSecondChanceAttentionCheck(originalQuestion = null) {
    const retryOptions = ['Bỏ qua', 'Nhầm lẫn', 'Tôi đọc hiểu và cam kết', 'Không quan tâm'];
    const expected = 'Tôi đọc hiểu và cam kết';

    return {
      id: 'attention_second_chance_' + crypto.randomUUID().substring(0, 8),
      type: 'SINGLE_CHOICE',
      content: `Cảnh báo tập trung: Bạn vừa chọn chưa đúng câu hỏi đọc hiểu trước đó. Để tiếp tục nhận thưởng, vui lòng chọn chính xác phương án "${expected}".`,
      options_json: JSON.stringify(retryOptions),
      is_attention_check: 1,
      is_second_chance: 1,
      expected_answer: expected,
      is_required: 1
    };
  }

  /**
   * Chốt chặn 5: Tính tiền thưởng thực nhận theo điểm uy tín trust_score
   * - 80 <= S <= 100: Nhận 100% thưởng gốc
   * - 40 <= S < 80: Thực nhận = Thưởng gốc * [1 - (80 - S) / 100]. Khấu trừ lũy tiến 1% mỗi điểm dưới 80.
   *   (40 <= S < 60: Tạm khóa rút tiền cho tới khi S >= 60)
   * - S < 40: 0 Point, tự động khóa nick (BAN)
   */
  calculatePayoutByTrustScore(baseReward, trustScore) {
    const s = typeof trustScore === 'number' ? trustScore : this.DEFAULT_INITIAL_TRUST_SCORE;
    const base = Math.max(0, parseInt(baseReward, 10) || 0);

    if (s >= 80.0) {
      return {
        baseReward: base,
        trustScore: s,
        payoutMultiplier: 1.0,
        effectiveReward: base,
        deductedAmount: 0,
        deductionRate: 0,
        zone: 'STANDARD',
        canWithdraw: true,
        isBanned: false
      };
    }

    if (s >= 40.0) {
      const deficit = 80.0 - s;
      const deductionRate = Math.min(0.4, Math.max(0, deficit / 100.0));
      const payoutMultiplier = 1.0 - deductionRate;
      const effectiveReward = Math.round(base * payoutMultiplier);
      const deductedAmount = base - effectiveReward;

      return {
        baseReward: base,
        trustScore: s,
        payoutMultiplier: parseFloat(payoutMultiplier.toFixed(2)),
        effectiveReward,
        deductedAmount,
        deductionRate: parseFloat(deductionRate.toFixed(2)),
        zone: 'WARNING',
        canWithdraw: s >= 60.0,
        isBanned: false
      };
    }

    return {
      baseReward: base,
      trustScore: s,
      payoutMultiplier: 0.0,
      effectiveReward: 0,
      deductedAmount: base,
      deductionRate: 1.0,
      zone: 'CRITICAL',
      canWithdraw: false,
      isBanned: true
    };
  }

  /**
   * Cập nhật điểm uy tín trust_score của người dùng theo sự kiện
   * - VALIDATED: +2.0 (tối đa 100.0)
   * - SCREENED_OUT: +0.2 (tối đa 100.0)
   * - SUSPICIOUS / FLAGGED_MANUAL: -5.0 (tối thiểu 0.0)
   * - REJECTED / REJECTED_FRAUD: -12.0 (tối thiểu 0.0)
   */
  updateUserTrustScore(userId, eventType, dbInstance = db) {
    if (!userId) return null;
    const row = dbInstance.prepare('SELECT trust_score, status, role FROM users WHERE id = ?').get(userId);
    if (!row) return null;

    const currentScore = row.trust_score !== null && row.trust_score !== undefined
      ? parseFloat(row.trust_score)
      : this.DEFAULT_INITIAL_TRUST_SCORE;

    let delta = 0;
    if (eventType === 'VALIDATED') delta = 2.0;
    else if (eventType === 'SCREENED_OUT') delta = 0.2;
    else if (eventType === 'SUSPICIOUS' || eventType === 'FLAGGED_MANUAL') delta = -5.0;
    else if (eventType === 'REJECTED' || eventType === 'REJECTED_FRAUD') delta = -12.0;

    let newScore = Math.min(100.0, Math.max(0.0, currentScore + delta));
    newScore = parseFloat(newScore.toFixed(1));

    let newStatus = row.status;
    let isBanned = false;
    if (newScore < 40.0 && row.role !== 'ADMIN') {
      newStatus = 'BANNED';
      isBanned = true;
    }

    dbInstance.prepare('UPDATE users SET trust_score = ?, status = ? WHERE id = ?').run(newScore, newStatus, userId);

    if (isBanned && row.status !== 'BANNED') {
      const fraudLogId = crypto.randomUUID();
      dbInstance.prepare(`
        INSERT INTO fraud_logs (id, user_id, reason, score_details_json)
        VALUES (?, ?, 'AUTO_BAN_LOW_TRUST_SCORE', ?)
      `).run(
        fraudLogId,
        userId,
        JSON.stringify({ oldScore: currentScore, newScore, delta, eventType, alert: 'CRITICAL' })
      );
    }

    return {
      userId,
      oldScore: currentScore,
      newScore,
      delta,
      status: newStatus,
      isBanned
    };
  }

  /**
   * Đánh giá chất lượng bài nộp và phát hiện gian lận qua 5 chốt chặn kỹ thuật
   * @param {Array} questions Danh sách câu hỏi kèm đáp án đúng câu bẫy từ DB
   * @param {Object} answersPayload Cặp { [question_id]: answer_value }
   * @param {number} durationSec Thời gian làm bài thực tế tính bằng giây
   * @returns {Object} Kết quả kiểm duyệt chi tiết
   */
  evaluateSubmission(questions, answersPayload, durationSec) {
    const internalReasons = [];
    const clientReasons = [];
    const validQuestions = Array.isArray(questions) ? questions : [];
    const payload = (answersPayload && typeof answersPayload === 'object' && !Array.isArray(answersPayload))
      ? answersPayload
      : {};
    const duration = Math.max(0, parseInt(durationSec, 10) || 0);

    const tStandard = this.calculateStandardTime(validQuestions);
    const tMin = this.calculateMinCompletionTime(validQuestions);

    // CHỐT CHẶN 1: Bẫy Tốc độ (Speed Trap)
    // T_standard chỉ tính trên câu trắc nghiệm, thang đo và ma trận lưới (tự luận = 0s)
    let speedRatio = 1.0;
    let speedVerdict = 'PASS';

    if (tStandard > 0) {
      if (duration < tStandard * 0.35) {
        // < 35% thời gian chuẩn -> REJECTED, trừ -12 điểm uy tín
        speedVerdict = 'REJECTED';
        speedRatio = Math.max(0.05, duration / tStandard);
        internalReasons.push(`Làm bài quá nhanh (${duration}s < 35% chuẩn ${tStandard}s) - Nghi ngờ bot/spam, phạt REJECTED`);
        clientReasons.push(`Thời gian hoàn thành (${duration}s) quá ngắn so với thời lượng đọc tối thiểu (${tMin}s)`);
      } else if (duration < tStandard * 0.60) {
        // 35% đến < 60% thời gian chuẩn -> SUSPICIOUS, trừ -5 điểm uy tín
        speedVerdict = 'SUSPICIOUS';
        speedRatio = Math.max(0.5, (duration / tStandard) * 0.85);
        internalReasons.push(`Làm bài nhanh (${duration}s trong ngưỡng 35%-60% chuẩn ${tStandard}s) - Đánh dấu SUSPICIOUS`);
        clientReasons.push(`Bạn hoàn thành bài tương đối nhanh (${duration}s / chuẩn ${tStandard}s)`);
      } else {
        // >= 60% thời gian chuẩn: Đạt yêu cầu tốc độ
        speedVerdict = 'PASS';
        speedRatio = 1.0;
      }
    } else {
      speedVerdict = 'PASS';
      speedRatio = 1.0;
    }

    // CHỐT CHẶN 2: Bẫy Tập trung Động (Attention Check) & Cơ chế Second-Chance Grace
    let attentionScore = 1.0;
    let secondChanceUsed = false;
    const attentionQuestions = validQuestions.filter(q => q && q.is_attention_check === 1);

    if (attentionQuestions.length > 0) {
      // Phân loại câu bẫy chính và câu bẫy lần 2 (second-chance)
      const primaryChecks = attentionQuestions.filter(q => !q.is_second_chance && !String(q.id).includes('second_chance') && !String(q.id).includes('retry'));
      const secondChanceChecks = attentionQuestions.filter(q => q.is_second_chance || String(q.id).includes('second_chance') || String(q.id).includes('retry'));

      // Kiểm tra câu bẫy chính
      let primaryFailed = false;
      for (const q of (primaryChecks.length > 0 ? primaryChecks : attentionQuestions)) {
        const userAnswer = String(payload[q.id] || '').trim().toLowerCase();
        const expected = String(q.expected_answer || '').trim().toLowerCase();
        if (userAnswer !== expected) {
          primaryFailed = true;
          break;
        }
      }

      if (primaryFailed) {
        // Người làm chọn sai lần 1 -> Kiểm tra câu xác nhận thứ hai (Second-Chance)
        if (secondChanceChecks.length > 0) {
          let secondFailed = false;
          for (const sq of secondChanceChecks) {
            const userAnswer2 = String(payload[sq.id] || '').trim().toLowerCase();
            const expected2 = String(sq.expected_answer || '').trim().toLowerCase();
            if (userAnswer2 !== expected2) {
              secondFailed = true;
              break;
            }
          }

          if (!secondFailed) {
            // Chọn đúng ở lần 2 -> Vẫn VALIDATED và không bị trừ điểm uy tín
            secondChanceUsed = true;
            attentionScore = 1.0;
            internalReasons.push('Đã kích hoạt và vượt qua thành công cơ chế sửa sai lần 2 (Second-Chance Grace)');
          } else {
            // Sai cả 2 lần liên tiếp -> REJECTED
            attentionScore = 0.0;
            internalReasons.push('Trả lời sai cả 2 lần liên tiếp câu hỏi kiểm tra độ chú ý (Second-Chance thất bại)');
            clientReasons.push('Chưa đạt tiêu chuẩn kiểm tra độ tập trung sau 2 lần xác nhận');
          }
        } else {
          // Không có câu thứ hai trong bộ dữ liệu nộp -> Đánh trượt
          attentionScore = 0.0;
          internalReasons.push('Trả lời sai câu hỏi kiểm tra độ chú ý');
          clientReasons.push('Chưa đạt tiêu chuẩn kiểm tra độ tập trung và đọc hiểu yêu cầu bài khảo sát');
        }
      }
    }

    // CHỐT CHẶN 3 & 4: Straight-lining Variance & Bộ lọc tự luận rác
    let varianceFactor = 1.0;
    let isStraightLining = false;
    const scaleNumericValues = [];

    for (const q of validQuestions) {
      if (!q) continue;
      const type = String(q.type || '').toUpperCase();

      if (type === 'LIKERT_SCALE' || type === 'LINEAR_SCALE' || type === 'RATING_STARS') {
        const val = payload[q.id];
        if (val !== undefined && val !== null) {
          const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
          if (!isNaN(num)) {
            scaleNumericValues.push(num);
          }
        }
      } else if (type === 'CHOICE_GRID') {
        const val = payload[q.id];
        if (val && typeof val === 'object') {
          for (const rowKey in val) {
            const rowVal = val[rowKey];
            const num = parseFloat(String(rowVal).replace(/[^\d.-]/g, ''));
            if (!isNaN(num)) {
              scaleNumericValues.push(num);
            }
          }
        }
      } else if (type === 'OPEN_TEXT' || type === 'SHORT_TEXT' || type === 'PARAGRAPH') {
        const textVal = payload[q.id];
        const textValidation = this.validateOpenTextAnswer(textVal);
        if (!textValidation.isValid) {
          varianceFactor *= 0.3;
          internalReasons.push(`Câu trả lời tự luận (ID: ${q.id}) không hợp lệ: ${textValidation.reason}`);
          clientReasons.push('Văn bản tự luận có dấu hiệu ký tự lặp hoặc spam phím vô nghĩa');
        }
      }
    }

    // Kiểm tra Straight-lining: áp dụng với bài có từ 5 câu thang đo hoặc 5 hàng câu hỏi Lưới
    if (scaleNumericValues.length >= 5) {
      const variance = this.calculateVariance(scaleNumericValues);
      if (variance === 0) {
        isStraightLining = true;
        varianceFactor *= 0.2;
        internalReasons.push(`Chọn cùng một đáp án từ đầu đến cuối cho ${scaleNumericValues.length} câu thang đo/lưới (Straight-lining, phương sai = 0)`);
        clientReasons.push('Chọn đáp án giống hệt nhau liên tiếp cho toàn bộ câu hỏi (Straight-lining)');
      }
    } else if (scaleNumericValues.length === 4) {
      // Giữ tương thích ngược hỗ trợ 4 câu lựa chọn như test cũ
      const variance = this.calculateVariance(scaleNumericValues);
      if (variance === 0) {
        varianceFactor *= 0.2;
        internalReasons.push('Chọn đáp án giống hệt nhau liên tiếp (Straight-lining 4 câu)');
        clientReasons.push('Chọn đáp án giống hệt nhau liên tiếp cho toàn bộ câu hỏi (Straight-lining)');
      }
    }

    // TÍNH ĐIỂM CHẤT LƯỢNG VÀ KẾT LUẬN CUỐI CÙNG
    const qualityScore = parseFloat((attentionScore * varianceFactor * speedRatio).toFixed(2));

    let status = 'VALIDATED';
    let trustScoreDelta = 2.0;

    if (attentionScore === 0.0 || speedVerdict === 'REJECTED') {
      // Vi phạm nghiêm trọng -> REJECTED_FRAUD, trừ -12 điểm uy tín
      status = 'REJECTED_FRAUD';
      trustScoreDelta = -12.0;
    } else if (speedVerdict === 'SUSPICIOUS' || isStraightLining || qualityScore < config.ANTI_FRAUD.MIN_QUALITY_SCORE) {
      // Nghi vấn -> FLAGGED_MANUAL (SUSPICIOUS), trừ -5 điểm uy tín
      status = 'FLAGGED_MANUAL';
      trustScoreDelta = -5.0;
    } else {
      // Hợp lệ 100% -> VALIDATED, cộng +2 điểm uy tín
      status = 'VALIDATED';
      trustScoreDelta = 2.0;
    }

    return {
      isValid: status === 'VALIDATED',
      status,
      qualityScore,
      trustScoreDelta,
      durationSec: duration,
      tStandard,
      tMin,
      reasons: clientReasons,
      clientReasons,
      internalReasons,
      scoreDetails: {
        speedRatio: parseFloat(speedRatio.toFixed(2)),
        speedVerdict,
        attentionScore,
        secondChanceUsed,
        varianceFactor: parseFloat(varianceFactor.toFixed(2)),
        isStraightLining,
        tStandard,
        tMin
      }
    };
  }

  /**
   * Chuẩn hóa URL biểu mẫu Google/MS Forms để chống trùng lặp
   */
  normalizeFormUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    try {
      const trimmed = rawUrl.trim();
      const parsed = new URL(trimmed);

      let pathname = parsed.pathname.replace(/\/+$/, '');
      const trackingParams = ['usp', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'ref', 'authuser'];
      trackingParams.forEach(p => parsed.searchParams.delete(p));

      const cleanSearch = parsed.searchParams.toString();
      const cleanUrl = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${pathname}${cleanSearch ? '?' + cleanSearch : ''}`;
      return cleanUrl;
    } catch (e) {
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
   * Chốt chặn Bổ trợ: Giám sát Thiết bị & IP (Bảo vệ Wi-Fi trường học / ký túc xá)
   * - Tách biệt rõ ràng IP và mã phần cứng thiết bị (device_fingerprint).
   * - Chỉ tự động khóa nick (Auto-Ban) khi phát hiện >= 3 tài khoản trùng device_fingerprint trong 24h.
   * - Nhiều thiết bị khác nhau dùng chung một IP Wi-Fi trường học hoàn toàn hợp lệ và KHÔNG bị khóa.
   */
  trackAndVerifyDeviceIp({ userId, rawIp, deviceFingerprint, action = 'ACTIVITY' }) {
    const ip = this.cleanIpAddress(rawIp);
    const safeFingerprint = deviceFingerprint && typeof deviceFingerprint === 'string'
      ? deviceFingerprint.trim().substring(0, 100)
      : null;

    // 1. Kiểm tra IP đã nằm trong danh sách cấm thủ công của Admin chưa
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

    // 3. AUTO-BAN CHỈ THEO DEVICE_FINGERPRINT (Ngưỡng >= 3 tài khoản trong 24h)
    // Bảo vệ tuyệt đối sinh viên dùng chung mạng Wi-Fi trường học / ký túc xá
    if (safeFingerprint && safeFingerprint !== 'browser_web') {
      const deviceQuery = `
        SELECT COUNT(DISTINCT user_id) AS distinct_users, GROUP_CONCAT(DISTINCT user_id) AS user_ids
        FROM device_ip_logs 
        WHERE device_fingerprint = ?
          AND user_id IS NOT NULL
          AND created_at >= datetime('now', '-24 hours')
      `;
      const devStats = db.prepare(deviceQuery).get(safeFingerprint);
      const devDistinctUsers = devStats ? (devStats.distinct_users || 0) : 0;
      const devUserIds = devStats && devStats.user_ids ? devStats.user_ids.split(',') : [];

      if (devDistinctUsers >= 3) {
        const banReason = `Tự động Ban: Phát hiện ${devDistinctUsers} tài khoản hoạt động trên cùng một mã phần cứng thiết bị (device_fingerprint) trong 24h (Tấn công Multi-Account)`;

        // Tự động chuyển các tài khoản sang BANNED (không ban Admin)
        if (devUserIds.length > 0) {
          const placeholders = devUserIds.map(() => '?').join(',');
          db.prepare(`UPDATE users SET status = 'BANNED' WHERE id IN (${placeholders}) AND role != 'ADMIN'`).run(...devUserIds);
        }

        const fraudLogId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO fraud_logs (id, user_id, ip_address, device_fingerprint, reason, score_details_json)
          VALUES (?, ?, ?, ?, 'AUTO_BAN_DEVICE_MULTI_ACCOUNT_BREACH', ?)
        `).run(
          fraudLogId,
          userId || (devUserIds[0] || null),
          ip,
          safeFingerprint,
          JSON.stringify({ devDistinctUsers, devUserIds, action, alert_level: 'CRITICAL', banReason })
        );

        throw new Error(`Thiết bị của bạn đã bị khóa do phát hiện ${devDistinctUsers} tài khoản hoạt động bất thường trên cùng một phần cứng trong 24h.`);
      }
    }

    // 4. THEO DÕI & XỬ LÝ AN NINH IP (CHỐNG SPAM ĐĂNG KÝ NHIỀU TÀI KHOẢN MỚI TRÊN 1 IP)
    // Bảo vệ tuyệt đối sinh viên dùng chung mạng Wi-Fi trường học / ký túc xá khi đăng nhập (LOGIN / ACTIVITY)
    if (!this.isLocalhost(ip)) {
      const isRegisterAction = String(action || '').toUpperCase().includes('REGISTER');

      if (isRegisterAction) {
        const ipQuery = `
          SELECT COUNT(DISTINCT user_id) AS distinct_users, GROUP_CONCAT(DISTINCT user_id) AS user_ids
          FROM device_ip_logs 
          WHERE ip_address = ?
            AND user_id IS NOT NULL
            AND action LIKE '%REGISTER%'
            AND created_at >= datetime('now', '-24 hours')
        `;
        const ipStats = db.prepare(ipQuery).get(ip);
        const ipDistinctUsers = ipStats ? (ipStats.distinct_users || 0) : 0;
        const ipUserIds = ipStats && ipStats.user_ids ? ipStats.user_ids.split(',') : [];

        // Ngưỡng 2: TỰ ĐỘNG BAN IP nếu >= 5 tài khoản đăng ký mới trong 24h
        const banThreshold = action === 'REGISTER_PRECHECK' ? 4 : 5;
        if (ipDistinctUsers >= banThreshold) {
          const countForMsg = ipDistinctUsers + (action === 'REGISTER_PRECHECK' ? 1 : 0);
          const banReason = `Tự động Ban: Phát hiện ${countForMsg} tài khoản đăng ký mới trên cùng một IP trong 24h (Tấn công Sybil / Cày lượt dùng thử)`;
          db.prepare('INSERT OR IGNORE INTO banned_ips (ip_address, reason) VALUES (?, ?)').run(ip, banReason);

          if (ipUserIds.length > 0) {
            const placeholders = ipUserIds.map(() => '?').join(',');
            db.prepare(`UPDATE users SET status = 'BANNED' WHERE id IN (${placeholders}) AND role != 'ADMIN'`).run(...ipUserIds);
          }

          const fraudLogId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO fraud_logs (id, user_id, ip_address, device_fingerprint, reason, score_details_json)
            VALUES (?, ?, ?, ?, 'AUTO_BAN_IP_MULTI_ACCOUNT_BREACH', ?)
          `).run(
            fraudLogId,
            userId || (ipUserIds[0] || null),
            ip,
            safeFingerprint,
            JSON.stringify({ ipDistinctUsers: countForMsg, ipUserIds, action, alert_level: 'CRITICAL', banReason })
          );

          throw new Error(`Địa chỉ IP của bạn (${ip}) đã bị khóa tự động do phát hiện ${countForMsg} tài khoản tạo bất thường trên cùng một địa chỉ.`);
        }

        // Ngưỡng 1: CẢNH BÁO KHẢ NGHI CHO ADMIN nếu >= 3 tài khoản đăng ký mới trong 24h
        if (ipDistinctUsers >= 3) {
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
                ipDistinctUsers,
                ipUserIds,
                action,
                alert_level: 'WARNING',
                message: `Phát hiện ${ipDistinctUsers} tài khoản đăng ký mới dùng chung một địa chỉ IP trong 24h`
              })
            );
          }

          return { isSuspicious: true, ipDistinctUsers, alertLevel: 'WARNING' };
        }
      }

      return { isSuspicious: false };
    }

    return { isSuspicious: false };
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
