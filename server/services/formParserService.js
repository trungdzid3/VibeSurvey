const url = require('url');
const net = require('net');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

class FormParserService {
  constructor() {
    // Whitelist các tên miền biểu mẫu an toàn chính chủ chống SSRF
    this.ALLOWED_FORM_DOMAINS = [
      'docs.google.com',
      'forms.gle',
      'forms.google.com',
      'drive.google.com',
      'forms.office.com',
      'forms.cloud.microsoft',
      'form.cloud.microsoft'
    ];

    // Bộ nhớ đệm xác thực Google Service Account & OAuth Token
    this._serviceAccountCache = null;
    this._accessTokenCache = null;
    this._accessTokenExpiry = 0;
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
      throw new Error(`Tên miền "${hostname}" không được hỗ trợ. Hệ thống chỉ hỗ trợ Google Forms (docs.google.com, forms.gle) và Microsoft Forms (forms.office.com, forms.cloud.microsoft, form.cloud.microsoft).`);
    }

    return {
      isValid: true,
      url: parsed.href,
      hostname,
      isGoogle: hostname === 'docs.google.com' || hostname === 'forms.gle' || hostname === 'forms.google.com' || hostname === 'drive.google.com',
      isMicrosoft: hostname === 'forms.office.com' || hostname === 'forms.cloud.microsoft' || hostname === 'form.cloud.microsoft'
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
   * 2. Bóc tách Google Forms từ HTML public (FB_PUBLIC_LOAD_DATA_)
   * Ánh xạ chuẩn 12 dạng câu hỏi theo mã item[3]:
   *  0 -> SHORT_TEXT
   *  1 -> PARAGRAPH
   *  2 -> SINGLE_CHOICE (đọc options từ item[4][0][1])
   *  3 -> DROPDOWN (đọc options từ item[4][0][1])
   *  4 -> MULTIPLE_CHOICE (đọc options từ item[4][0][1])
   *  5 -> LINEAR_SCALE (đọc thang từ item[4][0][1], nhãn từ item[4][0][3])
   *  7 -> LƯỚI MA TRẬN: rows từ item[4].map(r => r[3][0]), columns từ item[4][0][1].map(c => c[0])
   *       loại checkbox (item[4][0][11] === 1) -> CHECKBOX_GRID, ngược lại -> CHOICE_GRID
   *       cờ bắt buộc: item[4][0][2] === 1 -> is_required = 1
   *  9 -> DATE_INPUT
   * 10 -> TIME_INPUT
   * 13 -> FILE_UPLOAD
   * 18 -> RATING_STARS
   * Cờ bắt buộc is_required câu thường: item[4][0][2] === 1 -> is_required = 1, ngược lại 0.
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
            const qTitle = item[1] || (item[3] === 8 ? 'Mục không có tiêu đề' : '');
            const qDesc = item[2] ? String(item[2]).trim() : '';
            const qTypeNum = item[3];
            const qSubArray = item[4];
            const qData = qSubArray && qSubArray[0];

            if (!qTitle && qTypeNum !== 8 && qTypeNum !== 6) continue;

            let questionType = 'SINGLE_CHOICE';
            let options = null;
            let rows = null;
            let columns = null;
            let logic = null;
            let isRequired = 0;
            let minLabel = null;
            let maxLabel = null;
            let videoUrl = null;
            let imageUrl = null;

            // Trích xuất cờ bắt buộc is_required từ item[4][0][2] === 1
            if (qData && qData[2] === 1) {
              isRequired = 1;
            }

            switch (qTypeNum) {
              case 0: // SHORT_TEXT
                questionType = 'SHORT_TEXT';
                options = null;
                break;

              case 1: // PARAGRAPH
                questionType = 'PARAGRAPH';
                options = null;
                break;

              case 2: // SINGLE_CHOICE
              case 3: { // DROPDOWN
                questionType = qTypeNum === 2 ? 'SINGLE_CHOICE' : 'DROPDOWN';
                let rawOpts = null;
                if (qData && Array.isArray(qData[1])) {
                  rawOpts = qData[1];
                } else if (qData && Array.isArray(qData[0]) && Array.isArray(qData[0][1])) {
                  rawOpts = qData[0][1];
                } else if (Array.isArray(qSubArray)) {
                  for (const sub of qSubArray) {
                    if (sub && Array.isArray(sub[1])) {
                      rawOpts = sub[1];
                      break;
                    }
                  }
                }

                if (Array.isArray(rawOpts)) {
                  const logicOptions = {};
                  let hasLogic = false;

                  options = rawOpts.map(opt => {
                    const optVal = Array.isArray(opt) ? String(opt[0] || '').trim() : String(opt || '').trim();
                    if (Array.isArray(opt)) {
                      // Trích xuất điều hướng: opt[2] (action) hoặc opt[3] (target)
                      const rawAction = opt[2];
                      const rawTarget = opt[3] !== undefined ? opt[3] : null;

                      if (rawAction !== undefined && rawAction !== null && rawAction !== '' && rawAction !== 0) {
                        let actionStr = rawAction;
                        if (rawAction === 1 || rawAction === '1') actionStr = 'NEXT_PAGE';
                        else if (rawAction === 2 || rawAction === '2') actionStr = 'GO_TO_PAGE';
                        else if (rawAction === 3 || rawAction === '3') actionStr = 'SUBMIT_FORM';
                        else if (rawAction === 4 || rawAction === '4') actionStr = 'RESTART_FORM';

                        hasLogic = true;
                        logicOptions[optVal] = {
                          action: actionStr,
                          target: rawTarget ? String(rawTarget) : null
                        };
                      } else if (rawTarget !== null && rawTarget !== undefined && rawTarget !== '') {
                        hasLogic = true;
                        logicOptions[optVal] = {
                          action: 'GO_TO_PAGE',
                          target: String(rawTarget)
                        };
                      }
                    }
                    return optVal;
                  }).filter(Boolean);

                  if (hasLogic) {
                    logic = {
                      enabled: true,
                      options: logicOptions
                    };
                  }
                }
                break;
              }

              case 4: // MULTIPLE_CHOICE
                questionType = 'MULTIPLE_CHOICE';
                if (qData && Array.isArray(qData[1])) {
                  options = qData[1].map(opt => String(opt[0] || '').trim()).filter(Boolean);
                }
                break;

              case 5: { // LINEAR_SCALE (Phạm vi tuyến tính)
                questionType = 'LINEAR_SCALE';
                
                // 1. Trích xuất nhãn hai đầu từ qData[3] (Vị trí chuẩn trong Google Forms)
                if (qData && Array.isArray(qData[3])) {
                  if (qData[3][0] !== undefined && qData[3][0] !== null && String(qData[3][0]).trim() !== '') {
                    minLabel = String(qData[3][0]).trim();
                  }
                  if (qData[3][1] !== undefined && qData[3][1] !== null && String(qData[3][1]).trim() !== '') {
                    maxLabel = String(qData[3][1]).trim();
                  }
                }

                // 2. Quét dự phòng trong toàn bộ mảng qData nếu chưa tìm thấy nhãn
                if ((!minLabel || !maxLabel) && qData && Array.isArray(qData)) {
                  for (let i = 1; i < qData.length; i++) {
                    const el = qData[i];
                    if (Array.isArray(el) && el.length >= 2) {
                      const str0 = String(el[0] || '').trim();
                      const str1 = String(el[1] || '').trim();
                      if (str0 && str1 && !/^\d+$/.test(str0) && !/^\d+$/.test(str1)) {
                        if (!minLabel) minLabel = str0;
                        if (!maxLabel) maxLabel = str1;
                        break;
                      }
                    }
                  }
                }

                // 3. Quét trong mảng qSubArray
                if ((!minLabel || !maxLabel) && Array.isArray(qSubArray)) {
                  for (const sub of qSubArray) {
                    if (Array.isArray(sub) && Array.isArray(sub[3])) {
                      if (!minLabel && sub[3][0]) minLabel = String(sub[3][0]).trim();
                      if (!maxLabel && sub[3][1]) maxLabel = String(sub[3][1]).trim();
                    }
                  }
                }

                // 4. Trích xuất thang điểm (1 đến 5 hoặc 0 đến 10)
                if (qData && Array.isArray(qData[1]) && qData[1].length > 0) {
                  options = qData[1].map(opt => Array.isArray(opt) ? String(opt[0] || '').trim() : String(opt || '').trim()).filter(Boolean);
                } else if (qData && Array.isArray(qData[4]) && qData[4].length === 2 && typeof qData[4][0] === 'number') {
                  const start = qData[4][0];
                  const end = qData[4][1];
                  options = [];
                  for (let n = start; n <= end; n++) options.push(String(n));
                }

                if (!options || options.length === 0) {
                  options = ['1', '2', '3', '4', '5'];
                }
                break;
              }

              case 7: { // LƯỚI MA TRẬN: CHOICE_GRID hoặc CHECKBOX_GRID
                if (Array.isArray(qSubArray)) {
                  // rows từ item[4].map(r => r[3][0])
                  rows = qSubArray.map(r => {
                    if (r && Array.isArray(r[3]) && r[3][0]) return String(r[3][0]).trim();
                    if (r && r[1]) return String(r[1]).trim();
                    return '';
                  }).filter(Boolean);

                  // columns từ item[4][0][1].map(c => c[0])
                  if (qSubArray[0] && Array.isArray(qSubArray[0][1])) {
                    columns = qSubArray[0][1].map(c => {
                      if (Array.isArray(c)) return String(c[0] || '').trim();
                      return String(c || '').trim();
                    }).filter(Boolean);
                  }

                  // Cờ bắt buộc mỗi hàng đọc từ item[4][0][2] === 1
                  if (qSubArray[0] && qSubArray[0][2] === 1) {
                    isRequired = 1;
                  } else if (qSubArray.some(r => r && r[2] === 1)) {
                    isRequired = 1;
                  }

                  // Checkbox grid nếu item[4][0][11] === 1
                  const isCheckbox = qSubArray[0] && (qSubArray[0][11] === 1 || qSubArray[0][11] === true);
                  questionType = isCheckbox ? 'CHECKBOX_GRID' : 'CHOICE_GRID';
                  options = columns;
                } else {
                  questionType = 'CHOICE_GRID';
                }
                break;
              }

              case 9: // DATE_INPUT
                questionType = 'DATE_INPUT';
                options = null;
                break;

              case 10: // TIME_INPUT
                questionType = 'TIME_INPUT';
                options = null;
                break;

              case 13: // FILE_UPLOAD
                questionType = 'FILE_UPLOAD';
                options = null;
                break;

              case 6: // TITLE & DESCRIPTION BLOCK (Tt)
                questionType = 'TEXT_BLOCK';
                options = null;
                break;

              case 8: { // SECTION HEADER (== Thêm Phần)
                questionType = 'SECTION_HEADER';
                options = null;
                // Trích xuất điều hướng mặc định của phân đoạn nếu có
                try {
                  let defaultAction = null;
                  let targetSection = null;
                  let secData = qData || (Array.isArray(item[4]) ? item[4][0] : null) || item[5];
                  while (Array.isArray(secData) && secData.length === 1 && Array.isArray(secData[0])) {
                    secData = secData[0];
                  }

                  if (secData) {
                    if (Array.isArray(secData)) {
                      let act = null;
                      let tgt = null;
                      for (const el of secData) {
                        if (el === 1 || el === 2 || el === 3 || el === 4 || el === '1' || el === '2' || el === '3' || el === '4') {
                          act = el;
                        } else if (typeof el === 'string' && el.length > 0) {
                          tgt = el;
                        }
                      }
                      if (!act) {
                        act = (secData[0] !== undefined && secData[0] !== null) ? secData[0] : ((secData[2] !== undefined && secData[2] !== null) ? secData[2] : null);
                        tgt = tgt || ((secData[1] !== undefined && secData[1] !== null) ? secData[1] : ((secData[3] !== undefined && secData[3] !== null) ? secData[3] : null));
                      }

                      if (act !== null && act !== undefined && act !== '' && act !== 0) {
                        let actStr = act;
                        if (act === 1 || act === '1') actStr = 'NEXT_PAGE';
                        else if (act === 2 || act === '2') actStr = 'GO_TO_PAGE';
                        else if (act === 3 || act === '3') actStr = 'SUBMIT_FORM';
                        else if (act === 4 || act === '4') actStr = 'RESTART_FORM';
                        defaultAction = actStr;
                        targetSection = tgt ? String(tgt) : null;
                      }
                    } else if (typeof secData === 'object') {
                      defaultAction = secData.goToAction || secData.action || null;
                      targetSection = secData.goToSectionId || secData.target || null;
                    }
                  }
                  if (defaultAction || targetSection) {
                    logic = {
                      default_action: defaultAction,
                      target: targetSection
                    };
                  }
                } catch (e) {}
                break;
              }

              case 11: // IMAGE BLOCK
                questionType = 'IMAGE_BLOCK';
                options = null;
                break;

              case 12: { // VIDEO BLOCK (YouTube)
                questionType = 'VIDEO_BLOCK';
                options = null;
                // Trích xuất YouTube video id / url nếu có trong payload
                try {
                  const videoPayload = JSON.stringify(item);
                  const ytMatch = videoPayload.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
                  if (ytMatch && ytMatch[1]) {
                    videoUrl = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
                  }
                } catch(e) {}
                break;
              }

              case 18: // RATING_STARS
                questionType = 'RATING_STARS';
                options = ['1', '2', '3', '4', '5'];
                break;

              default:
                // Fallback nếu có options thì trắc nghiệm, ngược lại trả lời ngắn
                if (qData && Array.isArray(qData[1]) && qData[1].length > 0) {
                  questionType = 'SINGLE_CHOICE';
                  options = qData[1].map(opt => String(opt[0] || '').trim()).filter(Boolean);
                } else {
                  questionType = 'SHORT_TEXT';
                  options = null;
                }
                break;
            }

            const qObj = {
              order_index: qIndex++,
              type: questionType,
              content: (qTitle || (questionType === 'SECTION_HEADER' ? 'Mục' : '')).trim(),
              is_required: isRequired,
              options: options && options.length > 0 ? options : null
            };

            if (qDesc) qObj.description = qDesc;
            if (logic) qObj.logic = logic;
            if (minLabel) qObj.min_label = minLabel;
            if (maxLabel) qObj.max_label = maxLabel;
            if (videoUrl) qObj.video_url = videoUrl;
            if (imageUrl) qObj.image_url = imageUrl;
            if (rows && rows.length > 0) qObj.rows = rows;
            if (columns && columns.length > 0) qObj.columns = columns;

            // Trích xuất validation cho câu hỏi Text / Paragraph từ Google Forms
            if (questionType === 'SHORT_TEXT' || questionType === 'PARAGRAPH') {
              const rawValidationArray = (qData && Array.isArray(qData[4])) ? qData[4] : null;
              const validation = this._extractValidationRule({
                title: qTitle,
                description: qDesc,
                subtitle: qDesc,
                rawValidationArray
              });
              if (validation) {
                qObj.validation = validation;
                qObj.logic = qObj.logic || {};
                qObj.logic.validation = validation;
              }
            }

            questions.push(qObj);
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
   * 2b. Kiểm tra xem hệ thống đã được cấu hình Google Service Account hay chưa
   */
  hasServiceAccountConfigured() {
    return !!this.getServiceAccountCredentials();
  }

  /**
   * Lấy thông tin xác thực Google Service Account từ tệp JSON hoặc biến môi trường
   */
  getServiceAccountCredentials() {
    if (this._serviceAccountCache) {
      return this._serviceAccountCache;
    }

    try {
      // 1. Kiểm tra biến môi trường JSON trực tiếp (dành cho Render / Cloud Host)
      if (config.GOOGLE && config.GOOGLE.SERVICE_ACCOUNT_JSON && config.GOOGLE.SERVICE_ACCOUNT_JSON.trim()) {
        const parsed = JSON.parse(config.GOOGLE.SERVICE_ACCOUNT_JSON.trim());
        if (parsed.client_email && parsed.private_key) {
          this._serviceAccountCache = parsed;
          return parsed;
        }
      }

      // 2. Kiểm tra đường dẫn tệp cấu hình trên ổ đĩa
      const possiblePaths = [
        config.GOOGLE && config.GOOGLE.SERVICE_ACCOUNT_KEY_PATH,
        path.join(__dirname, '../config/google-service-account.json'),
        path.join(process.cwd(), 'google-service-account.json'),
        path.join(process.cwd(), 'server/config/google-service-account.json')
      ].filter(Boolean);

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed.client_email && parsed.private_key) {
            this._serviceAccountCache = parsed;
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('[FormParserService] Lỗi đọc tệp Google Service Account:', err.message);
    }

    return null;
  }

  /**
   * Lấy địa chỉ email của Google Service Account (để hiển thị cho người dùng thêm làm cộng tác viên)
   */
  getServiceAccountEmail() {
    const creds = this.getServiceAccountCredentials();
    if (creds && creds.client_email) {
      return creds.client_email;
    }
    return (config.GOOGLE && config.GOOGLE.SERVICE_ACCOUNT_EMAIL) ? config.GOOGLE.SERVICE_ACCOUNT_EMAIL : null;
  }

  /**
   * Tạo Access Token OAuth 2.0 từ Service Account bằng RS256 JWT (Thư viện Node.js thuần, 0 dependency)
   */
  async getGoogleServiceAccountAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    // Nếu token còn hạn ít nhất 60 giây thì dùng lại bộ nhớ đệm
    if (this._accessTokenCache && this._accessTokenExpiry > (now + 60)) {
      return this._accessTokenCache;
    }

    const creds = this.getServiceAccountCredentials();
    if (!creds || !creds.client_email || !creds.private_key) {
      throw new Error('Chưa cấu hình Google Service Account. Vui lòng thêm tệp google-service-account.json hoặc biến môi trường GOOGLE_SERVICE_ACCOUNT_JSON.');
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const payload = {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/forms.body.readonly https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const base64UrlEncode = (str) => {
      return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    signer.end();
    const signature = signer.sign(creds.private_key);
    const encodedSignature = signature
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${signatureInput}.${encodedSignature}`;

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(jwt)}`
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Không thể xác thực Google Service Account (${resp.status}): ${errText}`);
    }

    const tokenData = await resp.json();
    if (!tokenData.access_token) {
      throw new Error('Google OAuth không trả về access_token hợp lệ');
    }

    this._accessTokenCache = tokenData.access_token;
    this._accessTokenExpiry = now + (tokenData.expires_in || 3600);
    return tokenData.access_token;
  }

  /**
   * Trích xuất Form ID từ đường dẫn Google Forms (hỗ trợ cả dạng /d/ID, /d/e/ID/viewform hoặc link chỉnh sửa /edit)
   */
  extractGoogleFormId(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();

    // 1. Dạng /forms/d/e/<ID>/viewform
    const matchPub = trimmed.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/i);
    if (matchPub && matchPub[1]) {
      return { formId: matchPub[1], isPublished: true };
    }

    // 2. Dạng /forms/d/<ID>/edit hoặc /forms/d/<ID>/viewform
    const matchDoc = trimmed.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/i);
    if (matchDoc && matchDoc[1] && matchDoc[1] !== 'e') {
      return { formId: matchDoc[1], isPublished: false };
    }

    // 3. Chuỗi thuần form ID
    if (/^[a-zA-Z0-9_-]{20,80}$/.test(trimmed)) {
      return { formId: trimmed, isPublished: false };
    }

    return null;
  }

  /**
   * Bóc tách dữ liệu JSON từ Google Forms API v1 sang cấu trúc chuẩn 12 câu hỏi của SurvHub
   */
  parseGoogleFormsApiResponse(apiData, originalUrl) {
    if (!apiData) {
      throw new Error('Dữ liệu phản hồi từ Google Forms API không hợp lệ');
    }

    const title = (apiData.info && apiData.info.title) ? apiData.info.title.trim() : 'Khảo sát Google Forms';
    const description = (apiData.info && apiData.info.description) ? apiData.info.description.trim() : '';
    const questions = [];
    const items = apiData.items || [];
    let qIndex = 1;

    for (const item of items) {
      if (!item) continue;
      const itemTitle = (item.title || '').trim();
      const itemDesc = (item.description || '').trim();

      // 1. Câu hỏi đơn (questionItem)
      if (item.questionItem && item.questionItem.question) {
        const q = item.questionItem.question;
        const isRequired = q.required ? 1 : 0;
        let questionType = 'SINGLE_CHOICE';
        let options = null;
        let minLabel = null;
        let maxLabel = null;
        let imageUrl = null;

        if (item.questionItem.image && item.questionItem.image.sourceUri) {
          imageUrl = item.questionItem.image.sourceUri;
        }

        // Choice Question (Radio, Checkbox, Dropdown)
        let logic = null;
        if (q.choiceQuestion) {
          const cType = q.choiceQuestion.type;
          if (cType === 'CHECKBOX') {
            questionType = 'MULTIPLE_CHOICE';
          } else if (cType === 'DROP_DOWN') {
            questionType = 'DROPDOWN';
          } else {
            questionType = 'SINGLE_CHOICE';
          }

          if (Array.isArray(q.choiceQuestion.options)) {
            const logicOptions = {};
            let hasLogic = false;

            options = q.choiceQuestion.options.map(opt => {
              const optVal = opt.isOther ? 'Khác...' : (opt.value || '').trim();
              const goToAction = opt.goToAction || null;
              const goToSectionId = opt.goToSectionId || null;
              if (goToAction || goToSectionId) {
                hasLogic = true;
                logicOptions[optVal] = {
                  action: goToAction,
                  target: goToSectionId
                };
              }
              return optVal;
            }).filter(Boolean);

            if (hasLogic) {
              logic = {
                enabled: true,
                options: logicOptions
              };
            }
          }
        }
        // Text Question (Short Text hoặc Paragraph)
        else if (q.textQuestion) {
          questionType = q.textQuestion.paragraph ? 'PARAGRAPH' : 'SHORT_TEXT';
          options = null;
        }
        // Scale Question (Linear Scale)
        else if (q.scaleQuestion) {
          questionType = 'LINEAR_SCALE';
          const low = q.scaleQuestion.low !== undefined ? q.scaleQuestion.low : 1;
          const high = q.scaleQuestion.high !== undefined ? q.scaleQuestion.high : 5;
          minLabel = q.scaleQuestion.lowLabel || null;
          maxLabel = q.scaleQuestion.highLabel || null;
          options = [];
          for (let n = low; n <= high; n++) {
            options.push(String(n));
          }
        }
        // Date Question
        else if (q.dateQuestion) {
          questionType = 'DATE_INPUT';
          options = null;
        }
        // Time Question
        else if (q.timeQuestion) {
          questionType = 'TIME_INPUT';
          options = null;
        }
        // Rating Question
        else if (q.ratingQuestion) {
          questionType = 'RATING_STARS';
          const scale = q.ratingQuestion.ratingScaleLevel || 5;
          options = [];
          for (let n = 1; n <= scale; n++) {
            options.push(String(n));
          }
        }
        // File Upload Question
        else if (q.fileUploadQuestion) {
          questionType = 'FILE_UPLOAD';
          options = null;
        }

        const qObj = {
          order_index: qIndex++,
          type: questionType,
          content: itemTitle || `Câu hỏi ${qIndex - 1}`,
          is_required: isRequired,
          options: (options && options.length > 0) ? options : null
        };

        if (itemDesc) qObj.description = itemDesc;
        if (logic) qObj.logic = logic;
        if (minLabel) qObj.min_label = minLabel;
        if (maxLabel) qObj.max_label = maxLabel;
        if (imageUrl) qObj.image_url = imageUrl;

        // Trích xuất validation cho câu hỏi Text / Paragraph từ Google Forms API
        if (questionType === 'SHORT_TEXT' || questionType === 'PARAGRAPH') {
          const validation = this._extractValidationRule({
            title: itemTitle,
            description: itemDesc,
            subtitle: itemDesc
          });
          if (validation) {
            qObj.validation = validation;
            qObj.logic = qObj.logic || {};
            qObj.logic.validation = validation;
          }
        }

        questions.push(qObj);
      }
      // 2. Nhóm câu hỏi ma trận Lưới (questionGroupItem)
      else if (item.questionGroupItem) {
        const qGroup = item.questionGroupItem;
        const grid = qGroup.grid || {};
        const isCheckbox = grid.columns && grid.columns.type === 'CHECKBOX';
        const questionType = isCheckbox ? 'CHECKBOX_GRID' : 'CHOICE_GRID';

        let columns = [];
        if (grid.columns && Array.isArray(grid.columns.options)) {
          columns = grid.columns.options.map(c => (c.value || '').trim()).filter(Boolean);
        }

        let rows = [];
        let isRequired = 0;
        if (Array.isArray(qGroup.questions)) {
          rows = qGroup.questions.map(subQ => {
            if (subQ.required) isRequired = 1;
            return (subQ.rowQuestion && subQ.rowQuestion.title) ? subQ.rowQuestion.title.trim() : '';
          }).filter(Boolean);
        }

        const qObj = {
          order_index: qIndex++,
          type: questionType,
          content: itemTitle || `Bảng câu hỏi lưới ${qIndex - 1}`,
          is_required: isRequired,
          options: columns.length > 0 ? columns : null,
          columns: columns.length > 0 ? columns : null,
          rows: rows.length > 0 ? rows : null
        };

        if (itemDesc) qObj.description = itemDesc;
        questions.push(qObj);
      }
      // 3. Phân đoạn trang / Tiêu đề mục chuyển tiếp (pageBreakItem)
      else if (item.pageBreakItem) {
        const pb = item.pageBreakItem;
        const goToAction = pb.goToAction || item.goToAction || null;
        const goToSectionId = pb.goToSectionId || item.goToSectionId || null;

        let logic = null;
        if (goToAction || goToSectionId) {
          logic = {
            default_action: goToAction,
            target: goToSectionId
          };
        }

        const qObj = {
          order_index: qIndex++,
          type: 'SECTION_HEADER',
          content: itemTitle || `Mục ${qIndex - 1}`,
          is_required: 0,
          options: null
        };

        if (itemDesc) qObj.description = itemDesc;
        if (logic) qObj.logic = logic;

        questions.push(qObj);
      }
      // 4. Khối văn bản / Tiêu đề phụ (textItem)
      else if (item.textItem) {
        const qObj = {
          order_index: qIndex++,
          type: 'TEXT_BLOCK',
          content: itemTitle || `Nội dung ${qIndex - 1}`,
          is_required: 0,
          options: null
        };

        if (itemDesc) qObj.description = itemDesc;
        questions.push(qObj);
      }
    }

    // Embed URL
    let embedUrl = originalUrl || `https://docs.google.com/forms/d/${apiData.formId}/viewform`;
    if (embedUrl.includes('/viewform')) {
      embedUrl = embedUrl.replace('/viewform', '/viewform?embedded=true');
    } else if (!embedUrl.includes('embedded=true')) {
      embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'embedded=true';
    }

    return {
      source: 'GOOGLE_FORMS_API',
      title,
      description,
      originalUrl,
      embedUrl,
      questions,
      questionCount: questions.length
    };
  }

  /**
   * Gọi Google Forms API v1 để lấy cấu trúc biểu mẫu bằng Google Service Account hoặc User OAuth Access Token
   */
  async fetchFromGoogleFormsApi(formId, originalUrl, userAccessToken = null) {
    if (!formId) {
      throw new Error('Mã biểu mẫu Google Forms (Form ID) không hợp lệ');
    }

    const token = userAccessToken || (await this.getGoogleServiceAccountAccessToken());
    const apiUrl = `https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let resp;
    try {
      resp = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Thời gian kết nối Google Forms API vượt quá 10 giây');
      }
      throw new Error(`Lỗi kết nối Google Forms API: ${err.message}`);
    }
    clearTimeout(timeoutId);

    if (!resp.ok) {
      if (userAccessToken && (resp.status === 401 || resp.status === 403)) {
        const authErr = new Error('Tài khoản Google của bạn chưa được cấp quyền xem biểu mẫu này hoặc phiên làm việc đã hết hạn. Vui lòng kết nối lại tài khoản Google.');
        authErr.status = 401;
        authErr.statusCode = 401;
        authErr.code = 'USER_OAUTH_UNAUTHORIZED';
        throw authErr;
      }

      const saEmail = this.getServiceAccountEmail() || 'Service Account';
      if (resp.status === 403 || resp.status === 404) {
        const authErr = new Error(`Biểu mẫu Google Forms chưa được cấp quyền cho Service Account (${saEmail}). Vui lòng mở Google Forms > bấm biểu tượng Thêm cộng tác viên (Add collaborators) > Thêm email "${saEmail}" với quyền Biên tập viên (Editor), hoặc kết nối trực tiếp tài khoản Google của bạn.`);
        authErr.status = 401;
        authErr.statusCode = 401;
        authErr.serviceAccountEmail = saEmail;
        authErr.code = 'SERVICE_ACCOUNT_PERMISSION_DENIED';
        throw authErr;
      }

      const errText = await resp.text();
      throw new Error(`Google Forms API trả về lỗi ${resp.status}: ${errText}`);
    }

    const apiData = await resp.json();
    return this.parseGoogleFormsApiResponse(apiData, originalUrl);
  }

  /**
   * Helper an toan parse JSON hoac JavaScript Object Literal
   */
  _safeParseJsonOrObject(str) {
    if (!str || typeof str !== 'string') return null;
    try {
      return JSON.parse(str);
    } catch (e1) {
      try {
        const jsonStr = str
          .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']*)'/g, ':"$1"')
          .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(jsonStr);
      } catch (e2) {
        try {
          const fn = new Function(`return (${str});`);
          return fn();
        } catch (e3) {
          return null;
        }
      }
    }
  }

  /**
   * Helper trich xuat JSON hoac JS object literal theo bien bang thuat toan brace-matching
   */
  _extractJsonObject(html, varName) {
    const regex = new RegExp(`(?:var|let|const|window\\.)\\s*${varName}\\s*=\\s*`, 'i');
    const match = regex.exec(html);
    if (!match) return null;

    const startIdx = match.index + match[0].length;
    let openBraces = 0;
    let foundFirst = false;
    let jsonStart = -1;
    let inString = false;
    let stringChar = '';

    for (let i = startIdx; i < html.length; i++) {
      const ch = html[i];
      const prevCh = html[i - 1];

      if (inString) {
        if (ch === stringChar && prevCh !== '\\') {
          inString = false;
        }
        continue;
      }

      if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
        continue;
      }

      if (ch === '{') {
        if (!foundFirst) {
          foundFirst = true;
          jsonStart = i;
        }
        openBraces++;
      } else if (ch === '}') {
        openBraces--;
        if (foundFirst && openBraces === 0) {
          const rawStr = html.substring(jsonStart, i + 1);
          return this._safeParseJsonOrObject(rawStr);
        }
      }
    }
    return null;
  }

  /**
   * Helper trích xuất cấu trúc form JSON từ HTML Microsoft Forms
   */
  _extractMicrosoftFormData(html) {
    if (!html || typeof html !== 'string') return null;

    const candidateVars = ['runtimeForms', 'OfficeFormServerInfo', 'formContext', 'formData', 'formInfo'];
    for (const v of candidateVars) {
      const obj = this._extractJsonObject(html, v);
      if (obj) {
        if (obj.form) return obj.form;
        return obj;
      }
    }

    // Mẫu 4: <script id="__NEXT_DATA__" type="application/json">...</script>
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      const parsed = this._safeParseJsonOrObject(nextDataMatch[1]);
      if (parsed?.props?.pageProps?.form) return parsed.props.pageProps.form;
    }

    return null;
  }

  /**
   * Helper ánh xạ một câu hỏi Microsoft Forms
   * Choice: single -> SINGLE_CHOICE, multi -> MULTIPLE_CHOICE, dropdown -> DROPDOWN
   * TextField: multiline -> PARAGRAPH, ngược lại -> SHORT_TEXT
   * Rating: sao -> RATING_STARS, số/NPS -> LINEAR_SCALE
   * MatrixChoiceGroup / Likert -> CHOICE_GRID / CHECKBOX_GRID
   * DateTime -> DATE_INPUT, FileUpload -> FILE_UPLOAD
   * Cờ question.required === true -> is_required = 1
   */
  /**
   * Helper trích xuất các quy tắc giới hạn (Validation / Restrictions)
   * Áp dụng cho cả Microsoft Forms (q.questionInfo, Subtitle, Placeholder, Restrictions) và Google Forms
   */
  _extractValidationRule({ title = '', subtitle = '', placeholder = '', description = '', questionInfoObj = null, rawRestrictions = null, rawValidationArray = null }) {
    // 1. Nếu có rawValidationArray từ Google Forms (FB_PUBLIC_LOAD_DATA_ qData[4])
    if (Array.isArray(rawValidationArray) && rawValidationArray.length > 0) {
      for (const ruleItem of rawValidationArray) {
        if (!Array.isArray(ruleItem)) continue;
        const vType = ruleItem[0];
        const opType = ruleItem[1];
        const operands = Array.isArray(ruleItem[2]) ? ruleItem[2] : [];
        const customMsg = typeof ruleItem[3] === 'string' && ruleItem[3].trim() ? ruleItem[3].trim() : '';

        // 1.1 Number
        if (vType === 1) {
          if (opType === 7) { // Between
            const minVal = parseFloat(operands[0]) || 0;
            const maxVal = parseFloat(operands[1]) || 0;
            return {
              type: 'NUMBER',
              rule: 'BETWEEN',
              min: minVal,
              max: maxVal,
              placeholder: `Số phải nằm trong khoảng từ ${minVal} ~ ${maxVal}`,
              error_message: customMsg || `Số phải nằm trong khoảng từ ${minVal} ~ ${maxVal}`
            };
          }
          if (opType === 9) { // Is number
            return {
              type: 'NUMBER',
              rule: 'IS_NUMBER',
              placeholder: 'Giá trị phải là một số',
              error_message: customMsg || 'Giá trị phải là một số'
            };
          }
          if (opType === 1) { // Greater than
            const min = parseFloat(operands[0]) || 0;
            return {
              type: 'NUMBER',
              rule: 'GREATER_THAN',
              min,
              placeholder: `Lớn hơn ${min}`,
              error_message: customMsg || `Giá trị phải lớn hơn ${min}`
            };
          }
          if (opType === 2) { // Greater than or equal
            const min = parseFloat(operands[0]) || 0;
            return {
              type: 'NUMBER',
              rule: 'GREATER_THAN_OR_EQUAL',
              min,
              placeholder: `Lớn hơn hoặc bằng ${min}`,
              error_message: customMsg || `Giá trị phải lớn hơn hoặc bằng ${min}`
            };
          }
          if (opType === 3) { // Less than
            const max = parseFloat(operands[0]) || 0;
            return {
              type: 'NUMBER',
              rule: 'LESS_THAN',
              max,
              placeholder: `Nhỏ hơn ${max}`,
              error_message: customMsg || `Giá trị phải nhỏ hơn ${max}`
            };
          }
          if (opType === 4) { // Less than or equal
            const max = parseFloat(operands[0]) || 0;
            return {
              type: 'NUMBER',
              rule: 'LESS_THAN_OR_EQUAL',
              max,
              placeholder: `Nhỏ hơn hoặc bằng ${max}`,
              error_message: customMsg || `Giá trị phải nhỏ hơn hoặc bằng ${max}`
            };
          }
          if (opType === 10) { // Whole number
            return {
              type: 'NUMBER',
              rule: 'INTEGER',
              placeholder: 'Giá trị phải là số nguyên',
              error_message: customMsg || 'Giá trị phải là số nguyên'
            };
          }
        }

        // 1.2 Text (Email / URL)
        if (vType === 2) {
          if (opType === 3) { // Email
            return {
              type: 'EMAIL',
              placeholder: 'Vui lòng nhập email',
              error_message: customMsg || 'Vui lòng nhập đúng định dạng email'
            };
          }
          if (opType === 4) { // URL
            return {
              type: 'URL',
              placeholder: 'Vui lòng nhập URL hợp lệ',
              error_message: customMsg || 'Vui lòng nhập liên kết hợp lệ'
            };
          }
        }

        // 1.3 Length
        if (vType === 3) {
          if (opType === 1) { // Max char count
            const maxLen = parseInt(operands[0], 10) || 500;
            return {
              type: 'LENGTH',
              rule: 'MAX_LENGTH',
              max: maxLen,
              placeholder: `Tối đa ${maxLen} ký tự`,
              error_message: customMsg || `Độ dài không được vượt quá ${maxLen} ký tự`
            };
          }
          if (opType === 2) { // Min char count
            const minLen = parseInt(operands[0], 10) || 1;
            return {
              type: 'LENGTH',
              rule: 'MIN_LENGTH',
              min: minLen,
              placeholder: `Tối thiểu ${minLen} ký tự`,
              error_message: customMsg || `Độ dài phải có ít nhất ${minLen} ký tự`
            };
          }
        }
      }
    }

    // 2. Nếu có cấu trúc Restrictions từ Microsoft Forms
    const restrictionsList = [];
    if (questionInfoObj) {
      if (Array.isArray(questionInfoObj.Restrictions)) {
        restrictionsList.push(...questionInfoObj.Restrictions);
      } else if (typeof questionInfoObj.Restrictions === 'string') {
        try {
          const parsedR = JSON.parse(questionInfoObj.Restrictions);
          if (Array.isArray(parsedR)) restrictionsList.push(...parsedR);
          else if (parsedR && typeof parsedR === 'object') restrictionsList.push(parsedR);
        } catch (e) {}
      } else if (questionInfoObj.Restrictions && typeof questionInfoObj.Restrictions === 'object') {
        restrictionsList.push(questionInfoObj.Restrictions);
      }
      if (questionInfoObj.RestrictionOperator || questionInfoObj.RestrictionType) {
        restrictionsList.push(questionInfoObj);
      }
    }
    if (rawRestrictions) {
      if (Array.isArray(rawRestrictions)) restrictionsList.push(...rawRestrictions);
      else if (typeof rawRestrictions === 'object') restrictionsList.push(rawRestrictions);
    }

    for (const r of restrictionsList) {
      if (!r) continue;
      const op = String(r.RestrictionOperator || r.operator || r.Operator || '').toLowerCase();
      const typeStr = String(r.RestrictionType || r.type || r.Type || '').toLowerCase();
      const val1 = r.Min !== undefined ? r.Min : (r.Operand1 !== undefined ? r.Operand1 : (r.Value !== undefined ? r.Value : (r.min !== undefined ? r.min : null)));
      const val2 = r.Max !== undefined ? r.Max : (r.Operand2 !== undefined ? r.Operand2 : (r.max !== undefined ? r.max : null));

      if (op.includes('email') || typeStr.includes('email')) {
        return {
          type: 'EMAIL',
          placeholder: 'Vui lòng nhập email',
          error_message: 'Vui lòng nhập đúng định dạng email'
        };
      }
      if (op.includes('url') || typeStr.includes('url')) {
        return {
          type: 'URL',
          placeholder: 'Vui lòng nhập URL hợp lệ',
          error_message: 'Vui lòng nhập liên kết hợp lệ'
        };
      }
      if (op.includes('between')) {
        const minVal = parseFloat(val1) || 0;
        const maxVal = parseFloat(val2) || 0;
        return {
          type: 'NUMBER',
          rule: 'BETWEEN',
          min: minVal,
          max: maxVal,
          placeholder: `Số phải nằm trong khoảng từ ${minVal} ~ ${maxVal}`,
          error_message: `Số phải nằm trong khoảng từ ${minVal} ~ ${maxVal}`
        };
      }
      if (op.includes('isnumber') || op.includes('number') || typeStr.includes('number')) {
        return {
          type: 'NUMBER',
          rule: 'IS_NUMBER',
          placeholder: 'Giá trị phải là một số',
          error_message: 'Giá trị phải là một số'
        };
      }
      if (op.includes('maxlength') || op.includes('length')) {
        const maxLen = parseInt(val1 || val2, 10) || 500;
        return {
          type: 'LENGTH',
          rule: 'MAX_LENGTH',
          max: maxLen,
          placeholder: `Tối đa ${maxLen} ký tự`,
          error_message: `Độ dài không được vượt quá ${maxLen} ký tự`
        };
      }
    }

    // 3. Phân tích ngữ cảnh văn bản (Text / Subtitle / Placeholder / Title / Description)
    const combinedText = `${title} ${subtitle} ${placeholder} ${description}`.trim();
    if (!combinedText) return null;

    // 3.1 Email
    if (/(?:\bemail\b|thư\s*điện\s*tử|địa\s*chỉ\s*email)/i.test(combinedText)) {
      return {
        type: 'EMAIL',
        placeholder: 'Vui lòng nhập email',
        error_message: 'Vui lòng nhập đúng định dạng email'
      };
    }

    // 3.2 URL
    if (/(?:\burl\b|liên\s*kết|trang\s*web|website|\blink\b|https?:\/\/)/i.test(combinedText)) {
      return {
        type: 'URL',
        placeholder: 'Vui lòng nhập URL hợp lệ',
        error_message: 'Vui lòng nhập liên kết hợp lệ'
      };
    }

    // 3.3 Số nằm trong khoảng từ (Between)
    const betweenMatch = combinedText.match(/(?:số\s+phải\s+nằm\s+trong\s+khoảng\s+từ|trong\s+khoảng\s+từ|nằm\s+trong\s+khoảng\s+từ)\s*([0-9.,]+)\s*(?:đến|và|~|-)\s*([0-9.,]+)/i);
    if (betweenMatch) {
      const minVal = parseFloat(betweenMatch[1].replace(/,/g, ''));
      const maxVal = parseFloat(betweenMatch[2].replace(/,/g, ''));
      return {
        type: 'NUMBER',
        rule: 'BETWEEN',
        min: minVal,
        max: maxVal,
        placeholder: `Số phải nằm trong khoảng từ ${minVal} ~ ${maxVal}`,
        error_message: `Số phải nằm trong khoảng từ ${minVal} ~ ${maxVal}`
      };
    }

    // 3.4 Mã số sinh viên (MSSV) kèm khoảng hoặc min/max
    if (/(?:mã\s*số\s*sinh\s*viên|\bmssv\b)/i.test(combinedText)) {
      const mssvMatch = combinedText.match(/(\d{7,10})\s*(?:đến|và|~|-)\s*(\d{7,10})/);
      let minVal = 20000000;
      let maxVal = 20270000;
      if (mssvMatch) {
        minVal = parseInt(mssvMatch[1], 10);
        maxVal = parseInt(mssvMatch[2], 10);
      }
      return {
        type: 'NUMBER',
        rule: 'BETWEEN',
        min: minVal,
        max: maxVal,
        placeholder: `Số phải nằm trong khoảng từ ${minVal} ~ ${maxVal}`,
        error_message: `Số phải nằm trong khoảng từ ${minVal} ~ ${maxVal}`
      };
    }

    // 3.5 Số là số (IS_NUMBER) / Số điện thoại
    if (/(?:giá\s*trị\s*phải\s*là\s*một\s*số|phải\s*là\s*(?:một\s*)?số|số\s*điện\s*thoại|\bsđt\b|phone\s*number)/i.test(combinedText)) {
      return {
        type: 'NUMBER',
        rule: 'IS_NUMBER',
        placeholder: 'Giá trị phải là một số',
        error_message: 'Giá trị phải là một số'
      };
    }

    // 3.6 Độ dài (Length)
    const maxLenMatch = combinedText.match(/(?:tối\s*đa|không\s*quá|dưới)\s*(\d+)\s*ký\s*tự/i) || combinedText.match(/độ\s*dài\s*(?:tối\s*đa)?\s*(\d+)/i);
    if (maxLenMatch) {
      const maxLen = parseInt(maxLenMatch[1], 10);
      return {
        type: 'LENGTH',
        rule: 'MAX_LENGTH',
        max: maxLen,
        placeholder: `Tối đa ${maxLen} ký tự`,
        error_message: `Độ dài không được vượt quá ${maxLen} ký tự`
      };
    }

    const minLenMatch = combinedText.match(/(?:ít\s*nhất|tối\s*thiểu|từ)\s*(\d+)\s*ký\s*tự/i);
    if (minLenMatch) {
      const minLen = parseInt(minLenMatch[1], 10);
      return {
        type: 'LENGTH',
        rule: 'MIN_LENGTH',
        min: minLen,
        placeholder: `Tối thiểu ${minLen} ký tự`,
        error_message: `Độ dài phải có ít nhất ${minLen} ký tự`
      };
    }

    return null;
  }

  /**
   * Helper ánh xạ một câu hỏi Microsoft Forms
   * Hỗ trợ đầy đủ cả runtimeForms cũ và SPA REST API hiện đại (q.questionInfo JSON & choices displayText)
   */
  _parseMicrosoftQuestion(q, orderIndex) {
    const rawType = String(q.type || q.questionType || '');
    const title = String(q.title || q.name || q.prompt || `Câu hỏi ${orderIndex}`).trim();
    const isRequired = (q.required === true || q.isRequired === true) ? 1 : 0;

    const getChoiceLabel = (c) => {
      if (!c) return '';
      if (typeof c === 'string') return c.trim();
      return String(c.displayText || c.Description || c.description || c.title || c.name || c.text || '').trim();
    };

    let questionInfoObj = null;
    if (q.questionInfo) {
      try {
        questionInfoObj = typeof q.questionInfo === 'string' ? JSON.parse(q.questionInfo) : q.questionInfo;
      } catch(e) {}
    }

    let choicesList = [];
    if (Array.isArray(q.choices) && q.choices.length > 0) {
      choicesList = q.choices.map(getChoiceLabel).filter(Boolean);
    } else if (questionInfoObj && Array.isArray(questionInfoObj.Choices)) {
      choicesList = questionInfoObj.Choices.map(getChoiceLabel).filter(Boolean);
    }

    const isMulti = q.allowMultipleValues === true || q.isMultiChoice === true || q.multiSelection === true || q.multiSelect === true || questionInfoObj?.ChoiceType === 2;
    const isDropdown = q.isDropdown === true || q.subType === 'Dropdown' || q.displayType === 'Dropdown' || questionInfoObj?.OptionDisplayStyle === 'Dropdown';

    let questionType = 'SINGLE_CHOICE';
    let options = null;
    let rows = null;
    let columns = null;
    let minLabel = null;
    let maxLabel = null;

    const lowerType = rawType.toLowerCase();

    // 1. MatrixChoiceGroup / Likert
    if (lowerType.includes('matrix') || lowerType.includes('likert')) {
      questionType = isMulti ? 'CHECKBOX_GRID' : 'CHOICE_GRID';

      const rawRows = q.rows || q.subQuestions || q.questions || [];
      const rawCols = q.columns || (choicesList.length > 0 ? choicesList : (q.choices || q.options || []));

      rows = rawRows.map(r => typeof r === 'string' ? r.trim() : (r.title || r.name || r.text || String(r))).filter(Boolean);
      columns = rawCols.map(getChoiceLabel).filter(Boolean);
      options = columns;
    }
    // 2. Choice
    else if (lowerType.includes('choice')) {
      if (isMulti) {
        questionType = 'MULTIPLE_CHOICE';
      } else if (isDropdown) {
        questionType = 'DROPDOWN';
      } else {
        questionType = 'SINGLE_CHOICE';
      }

      options = choicesList;
    }
    // 3. TextField
    else if (lowerType.includes('text') || lowerType.includes('string')) {
      const isMultiline = q.isMultiline === true || q.isLongText === true || q.subType === 'MultiLine' || questionInfoObj?.Multiline === true;
      questionType = isMultiline ? 'PARAGRAPH' : 'SHORT_TEXT';
      options = null;
    }
    // 4. Rating & Net Promoter Score (NPS)
    else if (lowerType.includes('nps') || lowerType.includes('netpromoter')) {
      questionType = 'LINEAR_SCALE';
      options = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      minLabel = questionInfoObj?.LeftDescription || 'Hoàn toàn không có khả năng';
      maxLabel = questionInfoObj?.RightDescription || 'Rất có khả năng';
    }
    else if (lowerType.includes('rating') || lowerType.includes('score')) {
      const ratingType = String(q.ratingType || q.subType || q.iconType || '').toLowerCase();
      const maxLevel = parseInt(questionInfoObj?.RatingLevel || q.maxRating || q.ratingLevel || q.levelCount || 5, 10);
      const safeMax = Math.min(10, Math.max(2, isNaN(maxLevel) ? 5 : maxLevel));
      
      if (ratingType.includes('number') || ratingType.includes('linear')) {
        questionType = 'LINEAR_SCALE';
        options = [];
        for (let i = 1; i <= safeMax; i++) options.push(String(i));
      } else {
        questionType = 'RATING_STARS';
        options = [];
        for (let i = 1; i <= safeMax; i++) options.push(String(i));
      }
    }
    // 5. Ranking (Xếp thứ tự)
    else if (lowerType.includes('ranking') || lowerType.includes('rank') || lowerType.includes('order')) {
      questionType = 'RANKING';
      options = choicesList;
    }
    // 6. Section / Mục (Phân đoạn)
    else if (lowerType.includes('section') || lowerType.includes('page') || lowerType.includes('group')) {
      questionType = 'SECTION_HEADER';
      options = null;
    }
    // 7. DateTime
    else if (lowerType.includes('date')) {
      questionType = 'DATE_INPUT';
      options = null;
    }
    // 8. Time
    else if (lowerType.includes('time')) {
      questionType = 'TIME_INPUT';
      options = null;
    }
    // 9. FileUpload
    else if (lowerType.includes('file')) {
      questionType = 'FILE_UPLOAD';
      options = null;
    }
    // Fallback
    else {
      if (choicesList.length > 0) {
        questionType = isMulti ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE';
        options = choicesList;
      } else {
        questionType = 'SHORT_TEXT';
      }
    }

    const subtitle = String(q.subtitle || q.description || questionInfoObj?.Subtitle || '').trim();
    const placeholder = String(q.placeholder || questionInfoObj?.Placeholder || '').trim();

    const res = {
      order_index: orderIndex,
      type: questionType,
      content: title,
      is_required: isRequired,
      options: options && options.length > 0 ? options : null
    };

    if (subtitle) res.description = subtitle;
    if (minLabel) res.min_label = minLabel;
    if (maxLabel) res.max_label = maxLabel;
    if (rows && rows.length > 0) res.rows = rows;
    if (columns && columns.length > 0) res.columns = columns;

    // Trích xuất validation cho câu hỏi Microsoft Forms
    const validation = this._extractValidationRule({
      title,
      subtitle,
      placeholder,
      questionInfoObj,
      rawRestrictions: q.restrictions || q.restriction || null
    });

    if (validation) {
      res.validation = validation;
      res.logic = res.logic || {};
      res.logic.validation = validation;
    }

    return res;
  }

  /**
   * 3a. Bóc tách Microsoft Forms hiện đại (Async với SPA API Runtime & prefetchFormUrl)
   */
  async parseMicrosoftForms(html, originalUrl) {
    let title = 'Khảo sát Microsoft Forms';
    let description = '';
    const questions = [];

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      const extractedTitle = titleMatch[1].replace(/ - Microsoft Forms$/i, '').trim();
      if (extractedTitle && extractedTitle !== 'Microsoft Forms') {
        title = extractedTitle;
      }
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

    // 1. Kiểm tra cấu hình OfficeFormServerInfo (SPA Runtime của Microsoft Forms hiện đại)
    const serverInfo = this._extractJsonObject(html, 'OfficeFormServerInfo');
    if (serverInfo && serverInfo.prefetchFormUrl) {
      try {
        await this.validateFormUrlAsync(serverInfo.prefetchFormUrl);

        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'antiForgeryToken': serverInfo.antiForgeryToken || '',
          'x-ms-form-request-ring': serverInfo.ring || 'business',
          'x-ms-form-request-datacenter': serverInfo.datacenter || 'sea'
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const prefetchResp = await fetch(serverInfo.prefetchFormUrl, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (prefetchResp.status === 401) {
          const authErr = new Error("Biểu mẫu Microsoft Forms này đang bật chế độ 'Yêu cầu đăng nhập tài khoản Microsoft' hoặc 'Chỉ người trong tổ chức mới có thể phản hồi'. Vui lòng mở Microsoft Forms > Thu thập phản hồi (Collect responses) > Chọn 'Bất kỳ ai cũng có thể phản hồi' (Anyone can respond) và bỏ chọn 'Ghi lại tên' (Record name), hoặc sử dụng tính năng Dán Văn Bản Thông Minh (Smart Paste).");
          authErr.status = 401;
          authErr.statusCode = 401;
          authErr.isMicrosoft = true;
          throw authErr;
        }

        if (prefetchResp.ok) {
          const apiData = await prefetchResp.json();
          if (apiData) {
            if (apiData.error || apiData.code === '701' || (apiData.message && apiData.message.includes('Required user login'))) {
              const authErr = new Error("Biểu mẫu Microsoft Forms này đang bật chế độ 'Yêu cầu đăng nhập tài khoản Microsoft' hoặc 'Chỉ người trong tổ chức mới có thể phản hồi'. Vui lòng mở Microsoft Forms > Thu thập phản hồi (Collect responses) > Chọn 'Bất kỳ ai cũng có thể phản hồi' (Anyone can respond) và bỏ chọn 'Ghi lại tên' (Record name), hoặc sử dụng tính năng Dán Văn Bản Thông Minh (Smart Paste).");
              authErr.status = 401;
              authErr.statusCode = 401;
              authErr.isMicrosoft = true;
              throw authErr;
            }

            if (apiData.title) title = apiData.title;
            if (apiData.description) description = apiData.description;

            const rawQuestions = [...(apiData.questions || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
            const getChoiceLabel = (c) => {
              if (!c) return '';
              if (typeof c === 'string') return c.trim();
              return String(c.displayText || c.Description || c.description || c.title || c.name || c.text || '').trim();
            };

            // Quét trước để gom nhóm Ma trận Lưới Likert (MatrixChoiceGroup + MatrixChoice)
            const matrixGroups = new Map();
            for (const q of rawQuestions) {
              const typeStr = String(q.type || q.questionType || '').toLowerCase();
              if (typeStr.includes('matrixchoicegroup') || (typeStr.includes('matrix') && !q.groupId)) {
                const gId = q.id || q.groupId || 'matrix_group';
                let cols = [];
                if (Array.isArray(q.choices)) {
                  cols = q.choices.map(getChoiceLabel).filter(Boolean);
                }
                if (cols.length === 0 && q.questionInfo) {
                  try {
                    const qi = typeof q.questionInfo === 'string' ? JSON.parse(q.questionInfo) : q.questionInfo;
                    if (Array.isArray(qi.Choices)) {
                      cols = qi.Choices.map(getChoiceLabel).filter(Boolean);
                    }
                  } catch(e) {}
                }
                matrixGroups.set(gId, {
                  id: gId,
                  title: (q.title || 'Ma trận đánh giá').trim(),
                  columns: cols,
                  rows: [],
                  required: q.required === true,
                  isMultiChoice: q.isMultiChoice === true || q.allowMultipleValues === true
                });
              }
            }

            for (const q of rawQuestions) {
              const typeStr = String(q.type || q.questionType || '').toLowerCase();
              if (q.groupId && (typeStr.includes('matrix') || typeStr.includes('likert'))) {
                if (!matrixGroups.has(q.groupId)) {
                  matrixGroups.set(q.groupId, {
                    id: q.groupId,
                    title: 'Ma trận đánh giá',
                    columns: [],
                    rows: [],
                    required: false,
                    isMultiChoice: false
                  });
                }
                const grp = matrixGroups.get(q.groupId);
                const rowName = (q.title || q.name || '').trim();
                if (rowName && !grp.rows.includes(rowName)) {
                  grp.rows.push(rowName);
                }
                if (q.required) grp.required = true;
              }
            }

            let qIndex = 1;
            const processedMatrixGroupIds = new Set();

            for (const q of rawQuestions) {
              if (!q) continue;

              const typeStr = String(q.type || q.questionType || '').toLowerCase();
              const gId = q.groupId || (typeStr.includes('matrixchoicegroup') ? q.id : null);

              if (gId && matrixGroups.has(gId)) {
                if (!processedMatrixGroupIds.has(gId)) {
                  processedMatrixGroupIds.add(gId);
                  const grp = matrixGroups.get(gId);
                  questions.push({
                    order_index: qIndex++,
                    type: grp.isMultiChoice ? 'CHECKBOX_GRID' : 'CHOICE_GRID',
                    content: grp.title || 'Ma trận đánh giá',
                    is_required: grp.required ? 1 : 0,
                    rows: grp.rows.length > 0 ? grp.rows : ['Tiêu chí 1'],
                    columns: grp.columns.length > 0 ? grp.columns : ['Mức 1', 'Mức 2', 'Mức 3'],
                    options: grp.columns.length > 0 ? grp.columns : ['Mức 1', 'Mức 2', 'Mức 3']
                  });
                }
                continue;
              }

              const parsedQ = this._parseMicrosoftQuestion(q, qIndex++);
              if (parsedQ) {
                questions.push(parsedQ);
              }
            }

            if (questions.length > 0) {
              return {
                source: 'MICROSOFT_FORM',
                title,
                description,
                originalUrl,
                embedUrl,
                questions,
                questionCount: questions.length,
                note: `Đã bóc tách thành công ${questions.length} câu hỏi từ Microsoft Forms.`
              };
            }
          }
        }
      } catch (err) {
        if (err.status === 401 || err.statusCode === 401) {
          throw err;
        }
        console.warn('[FormParserService] Lỗi khi gọi prefetchFormUrl của Microsoft Forms:', err.message);
      }
    }

    // 2. Fallback sang parse tĩnh từ HTML (runtimeForms nhúng cũ hoặc mock test)
    const fallbackResult = this.parseMicrosoftFormsHtml(html, originalUrl);
    if (fallbackResult.questionCount > 0) {
      return fallbackResult;
    }

    return fallbackResult;
  }

  /**
   * 3. Bóc tách Microsoft Forms từ HTML public (runtimeForms / OfficeFormServerInfo)
   */
  parseMicrosoftFormsHtml(html, originalUrl) {
    let title = 'Khảo sát Microsoft Forms';
    let description = '';
    const questions = [];

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].replace(/ - Microsoft Forms$/i, '').trim();
    }

    const descMatch = html.match(/<meta property="og:description" content="([^"]+)">/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    // Bóc tách JSON nếu có trong HTML
    const formData = this._extractMicrosoftFormData(html);

    if (formData) {
      if (formData.title) title = formData.title;
      if (formData.description) description = formData.description;

      const rawQuestions = formData.questions || formData.items || [];
      const groupedMatrix = new Map();
      let qIndex = 1;

      for (const q of rawQuestions) {
        if (!q) continue;

        const typeStr = String(q.type || q.questionType || '').toLowerCase();
        const groupId = q.groupId || q.matrixGroupId;

        // Nếu là Likert/Matrix được chia thành các câu con có chung groupId
        if (groupId && (typeStr.includes('matrix') || typeStr.includes('likert'))) {
          if (!groupedMatrix.has(groupId)) {
            groupedMatrix.set(groupId, {
              order_index: qIndex++,
              type: (q.isMultiChoice || q.multiSelection) ? 'CHECKBOX_GRID' : 'CHOICE_GRID',
              content: q.groupTitle || q.matrixTitle || 'Ma trận đánh giá',
              is_required: (q.required === true || q.isRequired === true) ? 1 : 0,
              rows: [],
              columns: [],
              options: []
            });
          }
          const group = groupedMatrix.get(groupId);
          const rowTitle = q.title || q.name || q.prompt;
          if (rowTitle && !group.rows.includes(rowTitle)) {
            group.rows.push(rowTitle);
          }
          if (Array.isArray(q.choices) && group.columns.length === 0) {
            group.columns = q.choices.map(c => typeof c === 'string' ? c : (c.description || c.title || c.name || String(c))).filter(Boolean);
            group.options = group.columns;
          }
          continue;
        }

        const parsedQ = this._parseMicrosoftQuestion(q, qIndex++);
        if (parsedQ) {
          questions.push(parsedQ);
        }
      }

      for (const group of groupedMatrix.values()) {
        questions.push(group);
      }
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
      questions,
      questionCount: questions.length,
      note: questions.length > 0
        ? `Đã bóc tách thành công ${questions.length} câu hỏi từ Microsoft Forms.`
        : 'Microsoft Forms là Single-Page-App được render phía client. Đã trích xuất tiêu đề & embedUrl sẵn sàng hiển thị qua khung tương tác trực tiếp.'
    };
  }

  /**
   * 4. Bóc tách biểu mẫu từ URL ngoại vi (Google Forms / Microsoft Forms)
   * Chống SSRF toàn diện: Giám sát từng bước chuyển hướng (Redirect Validation), chặn IP nội bộ & giới hạn dung lượng
   */
  async parseFromUrl(rawUrl, customCookie = null, userAccessToken = null) {
    let currentUrl = (rawUrl || '').trim();

    const formIdInfo = this.extractGoogleFormId(currentUrl);

    // 0. Nếu người dùng đã cấp quyền OAuth cá nhân, ưu tiên gọi thẳng Google Forms API
    if (formIdInfo && formIdInfo.formId && userAccessToken) {
      try {
        return await this.fetchFromGoogleFormsApi(formIdInfo.formId, currentUrl, userAccessToken);
      } catch (userOAuthErr) {
        if (userOAuthErr.code === 'USER_OAUTH_UNAUTHORIZED' || userOAuthErr.code === 'SERVICE_ACCOUNT_PERMISSION_DENIED') {
          throw userOAuthErr;
        }
        console.warn('[FormParserService] User OAuth Forms API thất bại, chuyển sang quét fallback:', userOAuthErr.message);
      }
    }

    // 1. Nếu là Google Forms và URL ở dạng chỉnh sửa (/edit), ưu tiên dùng Google Forms API nếu có Service Account
    if (formIdInfo && formIdInfo.formId && (this.hasServiceAccountConfigured() || userAccessToken)) {
      if (currentUrl.includes('/edit')) {
        try {
          return await this.fetchFromGoogleFormsApi(formIdInfo.formId, currentUrl, userAccessToken);
        } catch (saErr) {
          if (saErr.code === 'SERVICE_ACCOUNT_PERMISSION_DENIED' || saErr.code === 'USER_OAUTH_UNAUTHORIZED' || saErr.status === 401) {
            throw saErr;
          }
          console.warn('[FormParserService] Gọi Google Forms API thất bại cho link /edit, chuyển sang fallback:', saErr.message);
        }
      }
    }

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

        const reqHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        };

        // Sử dụng cookie từ client gửi lên (customCookie) hoặc cấu hình hệ thống (GOOGLE_SYNC_COOKIE)
        const cookieToUse = (customCookie && typeof customCookie === 'string' && customCookie.trim()) 
          ? customCookie.trim() 
          : (config.GOOGLE && config.GOOGLE.SYNC_COOKIE ? config.GOOGLE.SYNC_COOKIE : '');

        if (cookieToUse) {
          reqHeaders['Cookie'] = cookieToUse;
        }

        const resp = await fetch(valid.url, {
          method: 'GET',
          headers: reqHeaders,
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

          // Phát hiện biểu mẫu Google Forms bật chế độ đăng nhập hoặc giới hạn tổ chức chuyển hướng đến Accounts
          if (location.includes('accounts.google.com') || location.includes('ServiceLogin')) {
            // Thử đồng bộ trực tiếp qua Google Forms API bằng Service Account hoặc User OAuth
            if (this.hasServiceAccountConfigured() || userAccessToken) {
              const fInfo = this.extractGoogleFormId(currentUrl) || this.extractGoogleFormId(rawUrl);
              if (fInfo && fInfo.formId) {
                try {
                  return await this.fetchFromGoogleFormsApi(fInfo.formId, currentUrl, userAccessToken);
                } catch (saErr) {
                  if (saErr.code === 'SERVICE_ACCOUNT_PERMISSION_DENIED' || saErr.code === 'USER_OAUTH_UNAUTHORIZED' || saErr.status === 401) {
                    throw saErr;
                  }
                }
              }
            }

            const saEmail = this.getServiceAccountEmail();
            let msg = "Biểu mẫu Google Forms này đang bật chế độ 'Yêu cầu đăng nhập tài khoản Google' hoặc 'Giới hạn trong tổ chức'.";
            if (saEmail) {
              msg += ` Vui lòng mở Google Forms > Thêm cộng tác viên (Add collaborators) > Thêm email: "${saEmail}" với quyền Biên tập viên, hoặc ủy quyền tài khoản Google để đồng bộ.`;
            } else {
              msg += " Vui lòng mở Google Forms > Cài đặt (Settings) > Tắt 'Giới hạn ở 1 câu trả lời' và cấp quyền công khai, hoặc ủy quyền tài khoản Google.";
            }

            const authErr = new Error(msg);
            authErr.status = 401;
            authErr.statusCode = 401;
            authErr.serviceAccountEmail = saEmail;
            authErr.code = 'SERVICE_ACCOUNT_PERMISSION_DENIED';
            throw authErr;
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
          if (resp.status === 401) {
            if (this.hasServiceAccountConfigured() || userAccessToken) {
              const fInfo = this.extractGoogleFormId(currentUrl) || this.extractGoogleFormId(rawUrl);
              if (fInfo && fInfo.formId) {
                try {
                  return await this.fetchFromGoogleFormsApi(fInfo.formId, currentUrl, userAccessToken);
                } catch (saErr) {
                  if (saErr.code === 'SERVICE_ACCOUNT_PERMISSION_DENIED' || saErr.code === 'USER_OAUTH_UNAUTHORIZED' || saErr.status === 401) {
                    throw saErr;
                  }
                }
              }
            }

            const saEmail = this.getServiceAccountEmail();
            let msg = "Biểu mẫu Google Forms này đang bật chế độ 'Yêu cầu đăng nhập tài khoản Google' hoặc 'Giới hạn trong tổ chức'.";
            if (saEmail) {
              msg += ` Vui lòng mở Google Forms > Thêm cộng tác viên (Add collaborators) > Thêm email: "${saEmail}" với quyền Biên tập viên, hoặc ủy quyền tài khoản Google để đồng bộ.`;
            } else {
              msg += " Vui lòng mở Google Forms > Cài đặt (Settings) > Tắt 'Giới hạn ở 1 câu trả lời' và cấp quyền công khai, hoặc ủy quyền tài khoản Google.";
            }

            const authErr = new Error(msg);
            authErr.status = 401;
            authErr.statusCode = 401;
            authErr.serviceAccountEmail = saEmail;
            authErr.code = 'SERVICE_ACCOUNT_PERMISSION_DENIED';
            throw authErr;
          }
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
        if (err.status === 401 || err.statusCode === 401 || err.code === 'SERVICE_ACCOUNT_PERMISSION_DENIED' || err.code === 'USER_OAUTH_UNAUTHORIZED' || err.isAuthRequired) {
          throw err;
        }
        throw new Error('Không thể tải nội dung biểu mẫu từ URL: ' + err.message);
      }
    }

    if (finalValid.isGoogle) {
      return this.parseGoogleFormsHtml(finalHtml, currentUrl);
    } else {
      return await this.parseMicrosoftForms(finalHtml, currentUrl);
    }
  }

  /**
   * 5. Smart Text Paste Parser: Tự động nhận diện câu hỏi từ văn bản thô (Word, Notion, Google Docs)
   * Nhận diện chuẩn xác:
   * - Trắc nghiệm (A, B, C hoặc -, *)
   * - Hộp kiểm ([ ])
   * - Ma trận Lưới (Hàng: ... | Cột: ...)
   * - Cờ bắt buộc is_required qua dấu * cuối câu hoặc cụm (bắt buộc)
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

    let title = 'Khảo sát mới';
    let description = '';
    const questions = [];

    // Mẫu regex nhận diện bắt đầu câu hỏi
    const questionStartRegex = /^(?:câu\s*(\d+)[:.]?|question\s*(\d+)[:.]?|q(\d+)[:.]?|(\d+)[.)/:-])\s*(.*)$/i;

    // Mẫu regex nhận diện đáp án trắc nghiệm
    const optionLetterRegex = /^[A-Za-z][.)/:-]\s*(.*)$/;
    const optionBulletRegex = /^[-*•–—]\s*(.*)$/;
    const optionCheckboxRegex = /^\[[ xX]?\]\s*(.*)$/;

    let currentQuestion = null;
    let readingMode = null; // 'ROWS' | 'COLUMNS' | null

    // Xử lý tiêu đề ở đầu văn bản (nếu dòng đầu không phải là câu hỏi)
    let startIndex = 0;
    if (!questionStartRegex.test(lines[0])) {
      title = lines[0]
        .replace(/^(?:tiêu đề|khảo sát|survey|tên bài)[:：]\s*/i, '')
        .trim() || lines[0].trim();
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
          rows: null,
          columns: null,
          hasCheckboxOptions: false
        };
        readingMode = null;
        continue;
      }

      if (currentQuestion) {
        // 1. Kiểm tra dòng chuyển chế độ Hàng / Cột cho Ma trận
        if (/^(?:hàng|rows)[:：]?$/i.test(line)) {
          readingMode = 'ROWS';
          if (!currentQuestion.rows) currentQuestion.rows = [];
          continue;
        }

        if (/^(?:cột|columns)[:：]?$/i.test(line)) {
          readingMode = 'COLUMNS';
          if (!currentQuestion.columns) currentQuestion.columns = [];
          continue;
        }

        // Kiểm tra dòng chứa cả Hàng và Cột: "Hàng: A, B | Cột: X, Y"
        const inlineMatrixMatch = line.match(/^(?:hàng|rows)[:：]\s*([^|]+)\s*\|\s*(?:cột|columns)[:：]\s*(.*)$/i);
        if (inlineMatrixMatch) {
          currentQuestion.rows = inlineMatrixMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
          currentQuestion.columns = inlineMatrixMatch[2].split(/[,;]/).map(s => s.trim()).filter(Boolean);
          continue;
        }

        // Kiểm tra dòng chỉ có "Hàng: A, B, C"
        const inlineRowsMatch = line.match(/^(?:hàng|rows)[:：]\s*(.+)$/i);
        if (inlineRowsMatch) {
          currentQuestion.rows = inlineRowsMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
          continue;
        }

        // Kiểm tra dòng chỉ có "Cột: X, Y, Z"
        const inlineColsMatch = line.match(/^(?:cột|columns)[:：]\s*(.+)$/i);
        if (inlineColsMatch) {
          currentQuestion.columns = inlineColsMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
          continue;
        }

        // Nếu đang ở chế độ đọc ROWS
        if (readingMode === 'ROWS') {
          const bullet = line.match(optionBulletRegex) || line.match(optionLetterRegex);
          const val = bullet ? bullet[1].trim() : line;
          if (val) {
            if (!currentQuestion.rows) currentQuestion.rows = [];
            currentQuestion.rows.push(val);
          }
          continue;
        }

        // Nếu đang ở chế độ đọc COLUMNS
        if (readingMode === 'COLUMNS') {
          const bullet = line.match(optionBulletRegex) || line.match(optionLetterRegex);
          const val = bullet ? bullet[1].trim() : line;
          if (val) {
            if (!currentQuestion.columns) currentQuestion.columns = [];
            currentQuestion.columns.push(val);
          }
          continue;
        }

        // 2. Kiểm tra phương án trắc nghiệm
        const checkMatch = line.match(optionCheckboxRegex);
        if (checkMatch) {
          currentQuestion.hasCheckboxOptions = true;
          currentQuestion.rawOptions.push(checkMatch[1].trim());
          continue;
        }

        const letterMatch = line.match(optionLetterRegex);
        if (letterMatch) {
          currentQuestion.rawOptions.push(letterMatch[1].trim());
          continue;
        }

        const bulletMatch = line.match(optionBulletRegex);
        if (bulletMatch) {
          currentQuestion.rawOptions.push(bulletMatch[1].trim());
          continue;
        }

        // Nếu câu hỏi đã có options và dòng ngắn -> option tiếp theo
        if (currentQuestion.rawOptions.length > 0 && line.length < 100 && !line.includes('?')) {
          currentQuestion.rawOptions.push(line);
          continue;
        }

        // Nếu là dòng chú thích thêm cho câu hỏi
        if (currentQuestion.rawOptions.length === 0) {
          currentQuestion.content += ' ' + line;
        }
      } else {
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
          questions.push(this._finalizeQuestion({
            content: line,
            rawOptions: [],
            rows: null,
            columns: null,
            hasCheckboxOptions: false
          }, questions.length + 1));
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
   * Helper xác định loại câu hỏi từ nội dung và options trong Smart Text
   */
  _finalizeQuestion(rawQ, orderIndex) {
    let content = rawQ.content.trim();
    let isRequired = 0;

    // Kiểm tra cờ bắt buộc qua dấu * cuối câu hoặc cụm (bắt buộc)
    if (/\*$/.test(content) || /\*\s*$/.test(content) || /\(\s*bắt\s*buộc\s*\)|\[\s*bắt\s*buộc\s*\]|\(\s*required\s*\)/i.test(content)) {
      isRequired = 1;
      content = content.replace(/\s*\*+\s*$/, '').replace(/\(\s*bắt\s*buộc\s*\)|\[\s*bắt\s*buộc\s*\]|\(\s*required\s*\)/gi, '').trim();
    }

    let rows = rawQ.rows;
    let columns = rawQ.columns;

    // Kiểm tra nếu trong content có cú pháp ma trận Hàng x Cột: (Hàng: ... | Cột: ...)
    if (!rows && !columns) {
      const matrixMatch = content.match(/(?:hàng|rows)[:：]\s*([^|]+)\s*\|\s*(?:cột|columns)[:：]\s*(.*)$/i);
      if (matrixMatch) {
        rows = matrixMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
        columns = matrixMatch[2].split(/[,;]/).map(s => s.trim()).filter(Boolean);
        content = content.replace(/(?:\(|\[)?\s*(?:hàng|rows)[:：][^)]*(?:\)|\])?/gi, '').trim();
      }
    }

    // 1. Nếu có ma trận Hàng x Cột -> CHOICE_GRID hoặc CHECKBOX_GRID
    if (rows && columns && rows.length > 0 && columns.length > 0) {
      const isCheckbox = /hộp\s*kiểm|checkbox|nhiều/i.test(content) || /hộp\s*kiểm|checkbox/i.test(rawQ.content);
      const qType = isCheckbox ? 'CHECKBOX_GRID' : 'CHOICE_GRID';
      return {
        order_index: orderIndex,
        type: qType,
        content,
        is_required: isRequired,
        rows,
        columns,
        options: columns
      };
    }

    const options = rawQ.rawOptions.map(opt => opt.trim()).filter(Boolean);
    const hasCheckboxOptions = rawQ.hasCheckboxOptions || options.some(opt => /^\[[ xX]?\]/.test(opt));
    const cleanOptions = options.map(opt => opt.replace(/^\[[ xX]?\]\s*/, '').trim());

    // 2. Xếp hạng sao (RATING_STARS)
    if (/đánh\s*giá\s*sao|xếp\s*hạng\s*sao|số\s*sao|star\s*rating|(?:từ\s*)?1\s*(?:đến|-|–)\s*5\s*sao/i.test(content)) {
      return {
        order_index: orderIndex,
        type: 'RATING_STARS',
        content,
        is_required: isRequired,
        options: ['1', '2', '3', '4', '5']
      };
    }

    // 3. Thang đo tuyến tính (LINEAR_SCALE)
    const isLinear = /thang\s*(?:đo|điểm)|likert|(?:từ\s*)?1\s*(?:đến|-|–)\s*(?:5|10)|đánh\s*giá\s*mức\s*độ|rất\s*đồng\s*ý|mức\s*độ\s*hài\s*lòng/i.test(content);
    if (isLinear && cleanOptions.length <= 2) {
      const minLab = cleanOptions[0] || (/hài\s*lòng/i.test(content) ? 'Rất không hài lòng' : 'Hoàn toàn không đồng ý');
      const maxLab = cleanOptions[1] || (/hài\s*lòng/i.test(content) ? 'Rất hài lòng' : 'Hoàn toàn đồng ý');
      return {
        order_index: orderIndex,
        type: 'LINEAR_SCALE',
        content,
        is_required: isRequired,
        min_label: minLab,
        max_label: maxLab,
        options: ['1', '2', '3', '4', '5']
      };
    }

    // 4. Không có options -> Xét các dạng tự luận / input đặc thù
    if (cleanOptions.length === 0) {
      if (/ngày\s*(?:sinh|tháng|bắt\s*đầu|kết\s*thúc)|chọn\s*ngày|date/i.test(content)) {
        return { order_index: orderIndex, type: 'DATE_INPUT', content, is_required: isRequired, options: null };
      }
      if (/giờ|thời\s*gian\s*\((?:giờ|phút)\)|time/i.test(content)) {
        return { order_index: orderIndex, type: 'TIME_INPUT', content, is_required: isRequired, options: null };
      }
      if (/tải\s*(?:lên\s*)?tệp|đính\s*kèm\s*file|upload\s*file|tải\s*ảnh/i.test(content)) {
        return { order_index: orderIndex, type: 'FILE_UPLOAD', content, is_required: isRequired, options: null };
      }
      if (/đoạn\s*văn|tự\s*luận\s*dài|chia\s*sẻ\s*chi\s*tiết|mô\s*tả\s*cụ\s*thể|paragraph/i.test(content)) {
        return { order_index: orderIndex, type: 'PARAGRAPH', content, is_required: isRequired, options: null };
      }
      return { order_index: orderIndex, type: 'SHORT_TEXT', content, is_required: isRequired, options: null };
    }

    // 5. Menu thả xuống (DROPDOWN)
    if (/menu\s*thả\s*xuống|dropdown|danh\s*sách\s*thả/i.test(content)) {
      return {
        order_index: orderIndex,
        type: 'DROPDOWN',
        content,
        is_required: isRequired,
        options: cleanOptions
      };
    }

    // 6. Trắc nghiệm chọn nhiều (MULTIPLE_CHOICE)
    const isMultiple = hasCheckboxOptions || /chọn\s*nhiều|nhiều\s*đáp\s*án|chọn\s*tất\s*cả|các\s*lựa\s*chọn\s*phù\s*hợp|hộp\s*kiểm|multiple/i.test(content);
    if (isMultiple) {
      return {
        order_index: orderIndex,
        type: 'MULTIPLE_CHOICE',
        content,
        is_required: isRequired,
        options: cleanOptions
      };
    }

    // 7. Mặc định là Trắc nghiệm 1 lựa chọn (SINGLE_CHOICE)
    return {
      order_index: orderIndex,
      type: 'SINGLE_CHOICE',
      content,
      is_required: isRequired,
      options: cleanOptions
    };
  }
}

module.exports = new FormParserService();
