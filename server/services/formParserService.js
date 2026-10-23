const url = require('url');
const net = require('net');
const dns = require('dns').promises;

class FormParserService {
  constructor() {
    // Whitelist các tên miền biểu mẫu an toàn chính chủ chống SSRF
    this.ALLOWED_FORM_DOMAINS = [
      'docs.google.com',
      'forms.gle',
      'forms.office.com',
      'forms.cloud.microsoft'
    ];
  }

  /**
   * Helper kiểm tra xem một IP có thuộc dải mạng nội bộ / link-local / loopback / cloud metadata không
   */
  isPrivateOrInternalIp(ip) {
    if (!ip || typeof ip !== 'string') return false;

    // Chuẩn hóa IPv4-mapped IPv6 (ví dụ: ::ffff:127.0.0.1)
    let cleanIp = ip.trim();
    if (cleanIp.startsWith('::ffff:')) {
      cleanIp = cleanIp.substring(7);
    }

    // Nếu không phải là địa chỉ IP dạng số (nghĩa là tên miền như docs.google.com) -> Trả về false
    if (!net.isIP(cleanIp)) {
      return false;
    }

    // Kiểm tra IPv4
    if (net.isIPv4(cleanIp)) {
      const parts = cleanIp.split('.').map(p => parseInt(p, 10));
      if (parts.length !== 4 || parts.some(isNaN)) return true;

      const [b0, b1] = parts;

      // 0.0.0.0/8 (Mạng hiện tại / Unspecified)
      if (b0 === 0) return true;

      // 127.0.0.0/8 (Loopback: 127.0.0.1 - 127.255.255.255)
      if (b0 === 127) return true;

      // 10.0.0.0/8 (Dải mạng nội bộ Class A: 10.x.x.x)
      if (b0 === 10) return true;

      // 172.16.0.0/12 (Dải mạng nội bộ Class B: 172.16.x.x - 172.31.x.x)
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

      // 192.168.0.0/16 (Dải mạng nội bộ Class C: 192.168.x.x)
      if (b0 === 192 && b1 === 168) return true;

      // 169.254.0.0/16 (Link-Local & Cloud Metadata Service AWS/GCP/Azure 169.254.169.254)
      if (b0 === 169 && b1 === 254) return true;

      // 100.64.0.0/10 (Carrier-Grade NAT)
      if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

      // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
      if (b0 >= 224) return true;

      // Broadcast
      if (cleanIp === '255.255.255.255') return true;

      return false;
    }

    // Kiểm tra IPv6
    if (net.isIPv6(cleanIp)) {
      const lower = cleanIp.toLowerCase();
      // ::1 (Loopback), :: (Unspecified)
      if (lower === '::1' || lower === '::') return true;
      // fe80::/10 (Link-Local)
      if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;
      // fc00::/7 (Unique Local Address: fc00:: - fdff::)
      if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;
      return false;
    }

    return false;
  }

  /**
   * 1. Kiểm tra an toàn URL chống SSRF (Đồng bộ)
   * Chặn triệt để IP nội bộ (127.0.0.1, localhost, 10.x, 192.168.x, 169.254.x)
   * Chỉ cho phép Whitelist domain chính chủ: docs.google.com, forms.gle, forms.office.com, forms.cloud.microsoft
   */
  validateFormUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new Error('Vui lòng cung cấp đường dẫn URL biểu mẫu hợp lệ');
    }

    let parsed;
    try {
      parsed = new URL(rawUrl.trim());
    } catch (e) {
      throw new Error('Định dạng URL không hợp lệ');
    }

    // 1. Chỉ cho phép giao thức HTTPS và HTTP chuẩn
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Giao thức URL không an toàn (chỉ hỗ trợ https/http)');
    }

    // 2. Chặn các cổng bất thường (chỉ cho phép cổng mặc định 443 và 80)
    if (parsed.port && parsed.port !== '443' && parsed.port !== '80') {
      throw new Error(`Cổng "${parsed.port}" không được phép vì lý do an toàn mạng`);
    }

    const hostname = parsed.hostname.toLowerCase();

    // 3. Chặn triệt để hostname cục bộ / private network / link-local / cloud metadata
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname === '0.0.0.0' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      this.isPrivateOrInternalIp(hostname)
    ) {
      throw new Error('Truy cập địa chỉ nội bộ bị từ chối');
    }

    // 4. Kiểm tra Whitelist domain chính chủ nghiêm ngặt (Strict Whitelist Check)
    const isAllowed = this.ALLOWED_FORM_DOMAINS.includes(hostname);

    if (!isAllowed) {
      throw new Error(`Tên miền "${hostname}" không được hỗ trợ. Hệ thống chỉ hỗ trợ Google Forms (docs.google.com, forms.gle) và Microsoft Forms (forms.office.com, forms.cloud.microsoft).`);
    }

    return {
      isValid: true,
      url: parsed.href,
      hostname,
      isGoogle: hostname === 'docs.google.com' || hostname === 'forms.gle',
      isMicrosoft: hostname === 'forms.office.com' || hostname === 'forms.cloud.microsoft'
    };
  }

  /**
   * 1b. Kiểm tra bất đồng bộ URL chống SSRF qua DNS Rebinding
   * Phân giải IP thực tế của hostname trước khi thực hiện kết nối HTTP
   */
  async validateFormUrlAsync(rawUrl) {
    const valid = this.validateFormUrl(rawUrl);

    // Kiểm tra DNS Rebinding: Phân giải tên miền và đối chiếu dải IP thực tế
    try {
      const addresses = await dns.lookup(valid.hostname, { all: true });
      for (const entry of addresses) {
        if (this.isPrivateOrInternalIp(entry.address)) {
          throw new Error(`Tên miền "${valid.hostname}" phân giải về địa chỉ IP nội bộ (${entry.address}). Truy cập bị từ chối chống SSRF.`);
        }
      }
    } catch (dnsErr) {
      if (dnsErr.message.includes('SSRF') || dnsErr.message.includes('nội bộ')) {
        throw dnsErr;
      }
      throw new Error(`Không thể phân giải địa chỉ máy chủ "${valid.hostname}": ${dnsErr.message}`);
    }

    return valid;
  }

  /**
   * 2. Bóc tách Google Forms từ HTML public
   */
  parseGoogleFormsHtml(html, originalUrl) {
    let title = 'Khảo sát Google Form';
    let description = '';
    const questions = [];

    // Tìm thẻ title
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/i) || 
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/ - Google (Forms|Biểu mẫu)$/i, '').trim();
    }

    const descMatch = html.match(/<meta property="og:description" content="([^"]+)">/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    // Trích xuất biến dữ liệu cốt lõi FB_PUBLIC_LOAD_DATA_
    const dataMatch = html.match(/var\s+FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
    if (dataMatch && dataMatch[1]) {
      try {
        const formData = JSON.parse(dataMatch[1]);
        if (formData && Array.isArray(formData[1])) {
          if (formData[1][8]) title = formData[1][8];
          if (formData[1][0]) description = formData[1][0];

          const items = formData[1][1] || [];
          let qIndex = 1;

          for (const item of items) {
            if (!item || !Array.isArray(item)) continue;
            const qTitle = item[1];
            const qTypeNum = item[3]; // 0: text, 1: textarea, 2: radio, 3: dropdown, 4: checkbox, 5: scale
            const qData = item[4] && item[4][0];

            if (!qTitle) continue;

            let questionType = 'SINGLE_CHOICE';
            let options = [];

            if (qTypeNum === 0 || qTypeNum === 1) {
              questionType = 'OPEN_TEXT';
              options = null;
            } else if (qTypeNum === 4) {
              questionType = 'MULTIPLE_CHOICE';
              if (qData && Array.isArray(qData[1])) {
                options = qData[1].map(opt => String(opt[0] || '').trim()).filter(Boolean);
              }
            } else if (qTypeNum === 5) {
              questionType = 'LIKERT_SCALE';
              options = ['1 - Hoàn toàn không đồng ý', '2 - Không đồng ý', '3 - Trung lập', '4 - Đồng ý', '5 - Hoàn toàn đồng ý'];
            } else {
              // 2: radio hoặc 3: dropdown
              questionType = 'SINGLE_CHOICE';
              if (qData && Array.isArray(qData[1])) {
                options = qData[1].map(opt => String(opt[0] || '').trim()).filter(Boolean);
              }
            }

            questions.push({
              order_index: qIndex++,
              type: questionType,
              content: qTitle.trim(),
              options: options && options.length > 0 ? options : null
            });
          }
        }
      } catch (err) {
        console.warn('[FormParserService] Không thể parse FB_PUBLIC_LOAD_DATA_ JSON:', err.message);
      }
    }

    // Tạo link embed an toàn
    let embedUrl = originalUrl;
    if (embedUrl.includes('/viewform')) {
      embedUrl = embedUrl.replace('/viewform', '/viewform?embedded=true');
    } else if (!embedUrl.includes('embedded=true')) {
      embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'embedded=true';
    }

    return {
      source: 'GOOGLE_FORM',
      title,
      description,
      originalUrl,
      embedUrl,
      questions,
      questionCount: questions.length
    };
  }

  /**
   * 3. Bóc tách Microsoft Forms
   */
  parseMicrosoftFormsHtml(html, originalUrl) {
    let title = 'Khảo sát Microsoft Forms';
    let description = '';

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/ - Microsoft Forms$/i, '').trim();
    }

    const descMatch = html.match(/<meta property="og:description" content="([^"]+)">/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    // Chuẩn hóa link embed Microsoft Forms
    let embedUrl = originalUrl;
    if (!embedUrl.includes('embed=true')) {
      embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'embed=true';
    }

    return {
      source: 'MICROSOFT_FORM',
      title,
      description,
      originalUrl,
      embedUrl,
      questions: [],
      questionCount: 0,
      note: 'Microsoft Forms là Single-Page-App được render phía client. Đã trích xuất tiêu đề & embedUrl sẵn sàng hiển thị qua khung tương tác trực tiếp.'
    };
  }

  /**
   * 4. Bóc tách biểu mẫu từ URL ngoại vi (Google Forms / Microsoft Forms)
   * Chống SSRF toàn diện: Giám sát từng bước chuyển hướng (Redirect Validation), chặn IP nội bộ & giới hạn dung lượng
   */
  async parseFromUrl(rawUrl) {
    let currentUrl = (rawUrl || '').trim();
    let redirectCount = 0;
    const MAX_REDIRECTS = 3;
    let finalHtml = '';
    let finalValid = null;

    while (redirectCount <= MAX_REDIRECTS) {
      // Xác thực an toàn URL & DNS ở từng chặng (hop)
      const valid = await this.validateFormUrlAsync(currentUrl);
      finalValid = valid;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const resp = await fetch(valid.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          redirect: 'manual', // Chặn tự động chuyển hướng không kiểm soát chống SSRF
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Xử lý chuyển hướng an toàn (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(resp.status)) {
          const location = resp.headers.get('location');
          if (!location) {
            throw new Error('Máy chủ phản hồi chuyển hướng nhưng thiếu tiêu đề Location');
          }

          const nextUrl = new URL(location, currentUrl).href;
          redirectCount++;
          if (redirectCount > MAX_REDIRECTS) {
            throw new Error('Số lần chuyển hướng vượt quá giới hạn an toàn (tối đa 3 lần)');
          }

          // Chuyển hướng sang URL mới, vòng lặp tiếp theo sẽ kiểm tra validateFormUrlAsync(nextUrl)
          currentUrl = nextUrl;
          continue;
        }

        if (!resp.ok) {
          throw new Error(`Máy chủ biểu mẫu trả về mã phản hồi ${resp.status}`);
        }

        // Kiểm tra dung lượng phản hồi (chặn HTTP response bomb / DoS bộ nhớ, giới hạn tối đa 5MB)
        const contentLength = parseInt(resp.headers.get('content-length'), 10);
        if (!isNaN(contentLength) && contentLength > 5 * 1024 * 1024) {
          throw new Error('Dung lượng trang biểu mẫu vượt quá giới hạn an toàn 5MB');
        }

        finalHtml = await resp.text();
        if (finalHtml.length > 5 * 1024 * 1024) {
          throw new Error('Dung lượng trang biểu mẫu vượt quá giới hạn an toàn 5MB');
        }

        break;
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new Error('Thời gian tải biểu mẫu vượt quá 8 giây. Vui lòng kiểm tra lại URL hoặc dùng tính năng Dán Văn Bản Thông Minh (Smart Paste).');
        }
        throw new Error('Không thể tải nội dung biểu mẫu từ URL: ' + err.message);
      }
    }

    if (finalValid.isGoogle) {
      return this.parseGoogleFormsHtml(finalHtml, currentUrl);
    } else {
      return this.parseMicrosoftFormsHtml(finalHtml, currentUrl);
    }
  }

  /**
   * 5. Smart Text Paste Parser: Tự động nhận diện câu hỏi từ văn bản thô (Word, Notion, Google Docs)
   */
  parseSmartText(rawText) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      throw new Error('Vui lòng dán nội dung văn bản khảo sát');
    }

    const lines = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      throw new Error('Văn bản không có nội dung hợp lệ');
    }

    let title = 'Khảo sát khảo sát ý kiến';
    let description = '';
    const questions = [];

    // Mẫu regex nhận diện bắt đầu câu hỏi
    // VD: "Câu 1:", "Câu 1.", "1.", "1/", "1)", "Question 1:", "Q1:", "1 - ", "Bài 1:"
    const questionStartRegex = /^(?:câu\s*(\d+)[:.]?|question\s*(\d+)[:.]?|q(\d+)[:.]?|(\d+)[.)/:-])\s*(.*)$/i;

    // Mẫu regex nhận diện đáp án trắc nghiệm
    // VD: "A.", "A)", "a.", "- ", "* ", "• ", "[ ]", "( )"
    const optionLetterRegex = /^[A-Za-z][.)/:-]\s*(.*)$/;
    const optionBulletRegex = /^[-*•–—]\s*(.*)$/;
    const optionCheckboxRegex = /^\[[ xX]?\]\s*(.*)$/;

    let currentQuestion = null;
    let titleAssigned = false;

    // Xử lý tiêu đề ở đầu văn bản (nếu dòng đầu không phải là câu hỏi)
    let startIndex = 0;
    if (!questionStartRegex.test(lines[0])) {
      title = lines[0]
        .replace(/^(?:tiêu đề|khảo sát|survey|tên bài)[:：]\s*/i, '')
        .trim() || lines[0].trim();
      titleAssigned = true;
      startIndex = 1;

      // Nếu dòng thứ hai cũng không phải câu hỏi, có thể là mô tả
      if (lines[1] && !questionStartRegex.test(lines[1]) && !optionLetterRegex.test(lines[1])) {
        description = lines[1]
          .replace(/^(?:mô tả|giới thiệu|description)[:：]\s*/i, '')
          .trim();
        startIndex = 2;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      const qMatch = line.match(questionStartRegex);

      if (qMatch) {
        // Lưu câu hỏi trước đó nếu có
        if (currentQuestion) {
          questions.push(this._finalizeQuestion(currentQuestion, questions.length + 1));
        }

        const rawContent = qMatch[5] ? qMatch[5].trim() : line;
        currentQuestion = {
          content: rawContent || `Câu hỏi ${questions.length + 1}`,
          rawOptions: [],
          typeHint: null
        };
        continue;
      }

      // Kiểm tra có phải phương án trắc nghiệm không
      if (currentQuestion) {
        const letterMatch = line.match(optionLetterRegex);
        const bulletMatch = line.match(optionBulletRegex);
        const checkMatch = line.match(optionCheckboxRegex);

        if (letterMatch) {
          currentQuestion.rawOptions.push(letterMatch[1].trim());
          continue;
        }

        if (bulletMatch) {
          currentQuestion.rawOptions.push(bulletMatch[1].trim());
          continue;
        }

        if (checkMatch) {
          currentQuestion.rawOptions.push(checkMatch[1].trim());
          continue;
        }

        // Nếu câu hỏi chưa có options và dòng này ngắn, không có dấu ? -> có thể là option tiếp
        if (currentQuestion.rawOptions.length > 0 && line.length < 100 && !line.includes('?')) {
          currentQuestion.rawOptions.push(line);
          continue;
        }

        // Nếu là dòng chú thích thêm cho câu hỏi
        if (currentQuestion.rawOptions.length === 0) {
          currentQuestion.content += ' ' + line;
        }
      } else {
        // Chưa có câu hỏi hiện tại, dòng này có thể là mô tả
        if (!description) {
          description = line;
        }
      }
    }

    // Đẩy câu hỏi cuối cùng
    if (currentQuestion) {
      questions.push(this._finalizeQuestion(currentQuestion, questions.length + 1));
    }

    // Nếu văn bản không theo định dạng số, thử tách theo mỗi dòng có dấu ?
    if (questions.length === 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('?') || line.length > 10) {
          questions.push({
            order_index: questions.length + 1,
            type: 'OPEN_TEXT',
            content: line,
            options: null
          });
        }
      }
    }

    return {
      source: 'SMART_PASTE',
      title: title || 'Khảo sát mới',
      description: description || '',
      questions,
      questionCount: questions.length
    };
  }

  /**
   * Helper xác định loại câu hỏi từ nội dung và options
   */
  _finalizeQuestion(rawQ, orderIndex) {
    const content = rawQ.content.trim();
    const options = rawQ.rawOptions.map(opt => opt.trim()).filter(Boolean);

    // 1. Kiểm tra Thang đo Likert (1-5 sao, thang điểm 1-5, mức độ hài lòng/đồng ý)
    const isLikert = /thang\s*(?:đo|điểm)|likert|(?:từ\s*)?1\s*(?:đến|-|–)\s*5|đánh\s*giá\s*mức\s*độ|rất\s*đồng\s*ý|mức\s*độ\s*hài\s*lòng/i.test(content);
    if (isLikert && options.length <= 1) {
      return {
        order_index: orderIndex,
        type: 'LIKERT_SCALE',
        content,
        options: ['1 - Rất không hài lòng / Hoàn toàn không đồng ý', '2 - Không hài lòng / Không đồng ý', '3 - Bình thường / Trung lập', '4 - Hài lòng / Đồng ý', '5 - Rất hài lòng / Hoàn toàn đồng ý']
      };
    }

    // 2. Kiểm tra Trắc nghiệm chọn nhiều (Multiple Choice)
    const isMultiple = /chọn\s*nhiều|nhiều\s*đáp\s*án|chọn\s*tất\s*cả|các\s*lựa\s*chọn\s*phù\s*hợp|multiple/i.test(content);
    if (options.length > 0) {
      return {
        order_index: orderIndex,
        type: isMultiple ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
        content,
        options
      };
    }

    // 3. Không có options -> Câu hỏi mở (OPEN_TEXT)
    return {
      order_index: orderIndex,
      type: 'OPEN_TEXT',
      content,
      options: null
    };
  }
}

module.exports = new FormParserService();
