/**
 * Micro AI Sentinel - Dịch Vụ Giám Sát & Quét Định Kỳ Nội Dung Diễn Đàn
 * Chuyên trách phát hiện & xử lý các hành vi lách luật chèn link ngoài tinh vi:
 * - Ký tự ngụy trang (Homoglyphs, Cyrillic, Zero-width unicode)
 * - Tách rời link bằng khoảng trắng, dấu phân cách lạ (*, _, #, ~)
 * - Thay thế dấu chấm / gạch chéo bằng chữ (dot, cham, slash, xuyet, [.]...)
 * - Mẫu câu hướng dẫn xóa khoảng trắng / nối link
 */

const crypto = require('crypto');
const db = require('../db/database');

class ForumSentinelService {
  constructor() {
    this.timer = null;
    this.isScanning = false;

    // Danh sách các domain và dịch vụ mục tiêu thường bị lách luật
    this.targetDomains = [
      'forms.gle',
      'forms.office.com',
      'docs.google.com/forms',
      'surveymonkey.com',
      'qualtrics.com',
      'typeform.com',
      'strawpoll.com',
      'bit.ly',
      'tinyurl.com',
      'cutt.ly',
      'shorturl.at',
      't.me',
      'zalo.me',
      'chat.zalo.me'
    ];

    // Bảng thay thế ký tự tương đồng (Homoglyphs) sang chuẩn ASCII Latin
    this.homoglyphMap = {
      'а': 'a', 'а́': 'a', 'а̀': 'a', 'ɑ': 'a', 'а': 'a',
      'b': 'b', 'в': 'b',
      'с': 'c', 'ϲ': 'c',
      'd': 'd', 'ԁ': 'd',
      'е': 'e', 'ѐ': 'e', 'ё': 'e', 'е́': 'e',
      'f': 'f',
      'ɡ': 'g',
      'h': 'h', 'һ': 'h',
      'і': 'i', 'ї': 'i', 'ı': 'i', '1': 'i', '!': 'i',
      'ј': 'j',
      'k': 'k', 'к': 'k',
      'l': 'l', 'ӏ': 'l', '|': 'l',
      'm': 'm', 'м': 'm',
      'n': 'n', 'п': 'n',
      'о': 'o', 'о́': 'o', '0': 'o',
      'р': 'p',
      'q': 'q',
      'r': 'r', 'г': 'r',
      'ѕ': 's', '$': 's', '5': 's',
      'т': 't', '+': 't',
      'u': 'u', 'υ': 'u',
      'v': 'v', 'ν': 'v',
      'w': 'w', 'ш': 'w',
      'х': 'x', 'ҳ': 'x',
      'у': 'y', 'ý': 'y',
      'z': 'z'
    };
  }

  /**
   * Khử dấu tiếng Việt cơ bản để phân tích ngữ nghĩa
   */
  removeVietnameseTones(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');
  }

  /**
   * Chuẩn hóa văn bản: gỡ Unicode ẩn, ánh xạ ký tự đồng dạng
   */
  normalizeText(str) {
    if (!str || typeof str !== 'string') return '';
    // Gỡ Zero-width unicode
    let cleaned = str.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ');
    // Chuyển sang chữ thường
    cleaned = cleaned.toLowerCase();
    // Thay thế homoglyphs
    let normalized = '';
    for (const char of cleaned) {
      normalized += this.homoglyphMap[char] || char;
    }
    return normalized;
  }

  /**
   * Thuật toán phân tích nội dung (De-obfuscation & Heuristic NLP)
   * @param {string} title Tiêu đề
   * @param {string} content Nội dung
   * @returns {object} Kết quả phân tích { isViolation, flag, reason, matchedSnippet }
   */
  analyzeContent(title = '', content = '') {
    const rawCombined = `${title || ''} \n ${content || ''}`;
    if (!rawCombined.trim()) {
      return { isViolation: false, flag: 'EMPTY', reason: null, matchedSnippet: null };
    }

    const norm = this.normalizeText(rawCombined);
    const nonTone = this.removeVietnameseTones(norm);

    // 1. Kiểm tra mẫu câu hướng dẫn xóa dấu cách / ghép link lách luật
    const instructionPatterns = [
      /(?:xoa|bo|go)\s*(?:dau\s*)?(?:cach|khoang\s*trang|space|phim\s*cach)/i,
      /(?:xoa|bo)\s*(?:dau\s*)?(?:cham|dot)/i,
      /(?:ghep|noi)\s*(?:link|chu|lai)\s*(?:giup|ho|nhe|gium)?/i,
      /(?:copy|dan)\s*(?:link|vao\s*trinh\s*duyet)/i,
      /(?:dien|lam)\s*(?:khao\s*sat|form)\s*(?:o|tai|qua|giup)\s*(?:link\s*ngoai|link\s*duoi)/i
    ];

    let hasEvasionInstruction = false;
    let matchedInstruction = null;
    for (const pattern of instructionPatterns) {
      const match = nonTone.match(pattern);
      if (match) {
        hasEvasionInstruction = true;
        matchedInstruction = match[0];
        break;
      }
    }

    // 2. Chuẩn bị chuỗi De-obfuscation:
    // Biến đổi các từ thay thế chấm / gạch chéo
    let deobf = norm
      .replace(/\s*(?:\[\.\]|\(\.\)|\[dot\]|\(dot\)|\bdot\b|\bcham\b|\bchấm\b|\bd0t\b)\s*/gi, '.')
      .replace(/\s*(?:\[\/\]|\(\/\)|\[slash\]|\(slash\)|\bxuyet\b|\bxoet\b|\bgach\b)\s*/gi, '/');

    // 3. Quét phát hiện giao thức mạng bị chèn khoảng trắng: h t t p : / /
    if (/(?:https?|ftp|file)\s*:\s*\/\s*\//i.test(deobf)) {
      return {
        isViolation: true,
        flag: 'FLAGGED_DISGUISED_PROTOCOL',
        reason: 'Phát hiện liên kết giao thức mạng ngụy trang khoảng trắng.',
        matchedSnippet: 'giao thức http/https ngụy trang'
      };
    }

    // 4. Quét tên miền mục tiêu khi bị phân tách bằng khoảng trắng hoặc ký tự rác
    // Tạo bản rút gọn toàn bộ khoảng trắng và ký tự ngăn cách trong phạm vi nghi vấn
    const strippedNoSpaces = deobf.replace(/[\s\*\_\-\#\~\^\`\(\)\[\]\{\}\<\>]/g, '');

    for (const domain of this.targetDomains) {
      const domainClean = domain.replace(/[\.\/]/g, '');
      if (strippedNoSpaces.includes(domainClean)) {
        return {
          isViolation: true,
          flag: 'FLAGGED_DISGUISED_SURVEY_URL',
          reason: `Phát hiện tên miền dịch vụ biểu mẫu bên ngoài (${domain}) được ngụy trang bằng cách chèn khoảng trắng hoặc ký tự rác.`,
          matchedSnippet: domain
        };
      }
    }

    // 5. Kết hợp: Nếu có câu hướng dẫn xóa cách + xuất hiện dấu hiệu đuôi tên miền
    if (hasEvasionInstruction) {
      const domainSuffixes = ['com', 'gle', 'vn', 'net', 'org', 'me', 'ly', 'io', 'cc', 'app'];
      for (const suffix of domainSuffixes) {
        // Kiểm tra xem có cấu trúc text + '.' + suffix hoặc text + suffix trong chuỗi nén
        const suffixRegex = new RegExp(`[a-z0-9]{3,}\\.${suffix}`, 'i');
        if (suffixRegex.test(deobf) || strippedNoSpaces.includes(`.${suffix}`)) {
          return {
            isViolation: true,
            flag: 'FLAGGED_INSTRUCTION_EVASION_LINK',
            reason: `Phát hiện câu lệnh hướng dẫn xóa khoảng trắng lách luật ('${matchedInstruction}') kèm liên kết ngụy trang.`,
            matchedSnippet: matchedInstruction
          };
        }
      }
    }

    // 6. Quét các URL rút gọn ngụy trang (bit ly, tiny url...)
    const shortenerPattern = /\b(?:bit|tinyurl|cutt|shorturl)\s*(?:\.|\s*dot\s*|\s*cham\s*)\s*(?:ly|com|at)\b/i;
    if (shortenerPattern.test(norm)) {
      return {
        isViolation: true,
        flag: 'FLAGGED_SHORTENER_URL',
        reason: 'Phát hiện dịch vụ rút gọn liên kết ngụy trang.',
        matchedSnippet: 'URL shortener disguised'
      };
    }

    return {
      isViolation: false,
      flag: 'CLEAN',
      reason: null,
      matchedSnippet: null
    };
  }

  /**
   * Quét và xử lý các bài viết diễn đàn chưa kiểm duyệt
   * @param {number} limit Số lượng bài viết quét trong mỗi đợt
   */
  scanPendingPosts(limit = 50) {
    try {
      const posts = db.prepare(`
        SELECT id, user_id, title, content, created_at
        FROM forum_posts
        WHERE is_audited = 0 OR is_audited IS NULL
        LIMIT ?
      `).all(limit);

      if (!posts || posts.length === 0) {
        return { scanned: 0, violations: 0 };
      }

      let violationCount = 0;

      for (const post of posts) {
        const result = this.analyzeContent(post.title, post.content);

        if (result.isViolation) {
          violationCount++;
          // 1. Tự động ẩn bài viết (Shadowban) và đánh dấu vi phạm
          db.prepare(`
            UPDATE forum_posts
            SET is_hidden = 1,
                is_audited = 1,
                audit_flag = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(result.flag, post.id);

          // 2. Khấu trừ điểm tín nhiệm (trust_score) của tác giả (-15 điểm)
          try {
            db.prepare(`
              UPDATE users
              SET trust_score = MAX(0, trust_score - 15.0)
              WHERE id = ?
            `).run(post.user_id);
          } catch (e) {
            // Trường hợp DB khác biệt về trust_score
          }

          // 3. Ghi log kiểm duyệt tự động
          try {
            const logId = crypto.randomUUID();
            const details = JSON.stringify({
              reason: result.reason,
              matched: result.matchedSnippet,
              title: post.title,
              flag: result.flag
            });

            db.prepare(`
              INSERT INTO admin_audit_logs (
                id, admin_id, admin_name, action, target_type, target_id, details
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              logId,
              'SYSTEM_SENTINEL',
              'SurvHub Micro AI Sentinel',
              'AUTO_HIDE_DISGUISED_URL',
              'FORUM_POST',
              post.id,
              details
            );
          } catch (e) {
            // An toàn bỏ qua lỗi log nếu bảng chưa sẵn sàng
          }
        } else {
          // Bài viết hợp lệ, đánh dấu đã kiểm duyệt sạch
          db.prepare(`
            UPDATE forum_posts
            SET is_audited = 1,
                audit_flag = 'CLEAN'
            WHERE id = ?
          `).run(post.id);
        }
      }

      return { scanned: posts.length, violations: violationCount };
    } catch (err) {
      console.error('[ForumSentinel] Lỗi khi quét bài viết:', err.message);
      return { scanned: 0, violations: 0, error: err.message };
    }
  }

  /**
   * Quét và xử lý các bình luận diễn đàn chưa kiểm duyệt
   * @param {number} limit Số lượng bình luận quét trong mỗi đợt
   */
  scanPendingComments(limit = 100) {
    try {
      const comments = db.prepare(`
        SELECT id, post_id, user_id, content, created_at
        FROM forum_comments
        WHERE is_audited = 0 OR is_audited IS NULL
        LIMIT ?
      `).all(limit);

      if (!comments || comments.length === 0) {
        return { scanned: 0, violations: 0 };
      }

      let violationCount = 0;

      for (const comment of comments) {
        const result = this.analyzeContent('', comment.content);

        if (result.isViolation) {
          violationCount++;
          // Ẩn bình luận vi phạm
          db.prepare(`
            UPDATE forum_comments
            SET is_hidden = 1,
                is_audited = 1
            WHERE id = ?
          `).run(comment.id);

          // Khấu trừ điểm tín nhiệm
          try {
            db.prepare(`
              UPDATE users
              SET trust_score = MAX(0, trust_score - 10.0)
              WHERE id = ?
            `).run(comment.user_id);
          } catch (e) {}

          // Ghi audit log
          try {
            const logId = crypto.randomUUID();
            db.prepare(`
              INSERT INTO admin_audit_logs (
                id, admin_id, admin_name, action, target_type, target_id, details
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              logId,
              'SYSTEM_SENTINEL',
              'SurvHub Micro AI Sentinel',
              'AUTO_HIDE_DISGUISED_URL',
              'FORUM_COMMENT',
              comment.id,
              JSON.stringify({ reason: result.reason, flag: result.flag, post_id: comment.post_id })
            );
          } catch (e) {}
        } else {
          db.prepare(`
            UPDATE forum_comments
            SET is_audited = 1
            WHERE id = ?
          `).run(comment.id);
        }
      }

      return { scanned: comments.length, violations: violationCount };
    } catch (err) {
      console.error('[ForumSentinel] Lỗi khi quét bình luận:', err.message);
      return { scanned: 0, violations: 0, error: err.message };
    }
  }

  /**
   * Chạy một chu trình kiểm tra toàn diện
   */
  runPeriodicAudit() {
    if (this.isScanning) return;
    this.isScanning = true;
    try {
      const postResult = this.scanPendingPosts(50);
      const commentResult = this.scanPendingComments(100);
      if (postResult.violations > 0 || commentResult.violations > 0) {
        console.log(`[ForumSentinel] Đã xử lý ${postResult.violations} bài viết và ${commentResult.violations} bình luận vi phạm link ngoài trá hình.`);
      }
    } catch (err) {
      console.error('[ForumSentinel] Lỗi trong chu trình audit:', err.message);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Bắt đầu tiến trình kiểm tra định kỳ ngầm
   * @param {number} intervalMs Thời gian chu kỳ (mặc định 60 giây)
   */
  startPeriodicScan(intervalMs = 60000) {
    if (this.timer) return;
    // Chạy kiểm tra đợt đầu sau 3 giây
    setTimeout(() => {
      this.runPeriodicAudit();
    }, 3000);

    // Chu kỳ định kỳ
    this.timer = setInterval(() => {
      this.runPeriodicAudit();
    }, intervalMs);

    // Không cản trở tắt tiến trình Node.js
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  /**
   * Dừng tiến trình kiểm tra định kỳ
   */
  stopPeriodicScan() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = new ForumSentinelService();
