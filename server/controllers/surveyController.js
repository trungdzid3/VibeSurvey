const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const pricingService = require('../services/pricingService');
const antiFraudService = require('../services/antiFraudService');
const ledgerService = require('../services/ledgerService');
const voucherService = require('../services/voucherService');
const formParserService = require('../services/formParserService');
const matchingService = require('../services/matchingService');
const webhookService = require('../services/webhookService');
const pushNotificationService = require('../services/pushNotificationService');

class SurveyController {

  /**
   * Helper chuẩn hóa câu hỏi từ cơ sở dữ liệu
   */
  _parseQuestionFromDb(q, isOwnerOrAdmin = false) {
    let rows = null;
    let columns = null;
    if (q.rows_json) {
      try { rows = JSON.parse(q.rows_json); } catch (e) {}
    }
    if (q.columns_json) {
      try { columns = JSON.parse(q.columns_json); } catch (e) {}
    }
    let options = null;
    if (q.options_json) {
      try {
        const parsed = JSON.parse(q.options_json);
        if (Array.isArray(parsed)) {
          options = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (!rows && parsed.rows) rows = parsed.rows;
          if (!columns && parsed.columns) columns = parsed.columns;
          options = parsed.options || parsed.columns || null;
        }
      } catch (e) {}
    }

    const resObj = {
      id: q.id,
      order_index: q.order_index,
      type: q.type,
      content: q.content,
      options: options,
      rows: rows,
      columns: columns,
      min_label: q.min_label || null,
      max_label: q.max_label || null,
      image_url: q.image_url || null,
      video_url: q.video_url || null,
      is_required: q.is_required !== undefined ? (q.is_required === 0 ? 0 : 1) : 1,
      is_screener: q.is_screener === 1,
      qualifying_answer: q.qualifying_answer || null
    };

    if (isOwnerOrAdmin) {
      resObj.is_attention_check = q.is_attention_check === 1;
      resObj.expected_answer = q.expected_answer || null;
    }
    return resObj;
  }

  /**
   * Helper trích xuất hồ sơ nhân khẩu học của người dùng
   */
  _getUserDemographics(user) {
    if (!user) return null;
    const userRecord = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    if (!userRecord) return null;

    let userDemo = {};
    if (userRecord.demographics_json) {
      try { userDemo = JSON.parse(userRecord.demographics_json); } catch (e) {}
    }
    if (!userDemo || typeof userDemo !== 'object') userDemo = {};

    if (!userDemo.gender && userRecord.gender) userDemo.gender = userRecord.gender;
    if (!userDemo.province && userRecord.province) userDemo.province = userRecord.province;
    if (!userDemo.university && userRecord.university) userDemo.university = userRecord.university;
    if (!userDemo.major && userRecord.major) userDemo.major = userRecord.major;
    if (!userDemo.birth_date && userRecord.birth_date) userDemo.birth_date = userRecord.birth_date;
    if (!userDemo.birth_year && userRecord.birth_date) {
      const parts = userRecord.birth_date.split('-');
      if (parts[0]) userDemo.birth_year = parseInt(parts[0], 10);
    }
    userDemo.profile_completed = userRecord.profile_completed || 0;
    userDemo.account_tier = userRecord.account_tier || 'PERSONAL';
    return userDemo;
  }

  /**
   * Helper kiểm tra xem người dùng có khớp 100% tiêu chí lọc của khảo sát không
   */
  _checkUserMatchesTarget(userDemo, targetDemo) {
    if (!targetDemo || Object.keys(targetDemo).length === 0) {
      return { matchesAll: true, reason: 'NO_TARGET_FILTER' };
    }
    if (!userDemo || userDemo.profile_completed !== 1) {
      return { matchesAll: false, reason: 'PROFILE_NOT_COMPLETED' };
    }

    // 1. Giới tính
    if (targetDemo.gender && targetDemo.gender !== 'ALL' && targetDemo.gender !== 'ANY') {
      const uGen = (userDemo.gender || '').trim().toLowerCase();
      const tGen = String(targetDemo.gender).trim().toLowerCase();
      if (!uGen || uGen !== tGen) {
        return { matchesAll: false, failedCriterion: 'gender' };
      }
    }

    // 2. Khu vực Tỉnh / Thành phố & Nhóm Vùng miền (34 Tỉnh thành)
    const targetRegion = targetDemo.region || (targetDemo.provinces && targetDemo.provinces[0]);
    if (targetRegion && targetRegion !== 'ALL') {
      const uProv = (userDemo.province || '').trim().toLowerCase();
      if (!uProv) return { matchesAll: false, failedCriterion: 'province' };

      const northList = ['hà nội', 'hải phòng', 'quảng ninh', 'bắc ninh', 'hải dương', 'hưng yên', 'nam định', 'ninh bình', 'thái bình', 'vĩnh phúc', 'phú thọ', 'thái nguyên', 'bắc giang', 'lạng sơn', 'tuyên quang', 'lào cai', 'yên bái', 'sơn la', 'điện biên', 'lai châu', 'hòa bình', 'hà giang', 'cao bằng', 'bắc kạn'];
      const centralList = ['đà nẵng', 'huế', 'thanh hóa', 'nghệ an', 'hà tĩnh', 'quảng bình', 'quảng trị', 'khánh hòa', 'lâm đồng', 'đắk lắk', 'quảng nam', 'quảng ngãi', 'bình định', 'phú yên', 'ninh thuận', 'bình thuận', 'kon tum', 'gia lai', 'đắk nông'];
      const southList = ['hồ chí minh', 'tp. hcm', 'sài gòn', 'cần thơ', 'bình dương', 'đồng nai', 'bà rịa', 'vũng tàu', 'long an', 'tiền giang', 'kiên giang', 'an giang', 'cà mau', 'vĩnh long', 'bến tre', 'đồng tháp', 'trà vinh', 'sóc trăng', 'hậu giang', 'bạc liêu', 'tây ninh', 'bình phước'];

      if (targetRegion === 'MIEN_BAC') {
        const isNorth = northList.some(p => uProv.includes(p));
        if (!isNorth) return { matchesAll: false, failedCriterion: 'province' };
      } else if (targetRegion === 'MIEN_TRUNG') {
        const isCentral = centralList.some(p => uProv.includes(p));
        if (!isCentral) return { matchesAll: false, failedCriterion: 'province' };
      } else if (targetRegion === 'MIEN_NAM') {
        const isSouth = southList.some(p => uProv.includes(p));
        if (!isSouth) return { matchesAll: false, failedCriterion: 'province' };
      } else {
        const tLower = targetRegion.trim().toLowerCase();
        const matchesProv = uProv.includes(tLower) || tLower.includes(uProv);
        if (!matchesProv) return { matchesAll: false, failedCriterion: 'province' };
      }
    }

    // 3. Trường đại học / học viện
    const targetUni = targetDemo.university || (targetDemo.universities && targetDemo.universities[0]);
    if (targetUni && targetUni !== 'ALL') {
      const uUni = (userDemo.university || '').trim().toLowerCase();
      if (!uUni) return { matchesAll: false, failedCriterion: 'university' };
      const tUni = targetUni.trim().toLowerCase();
      const matchesUni = uUni.includes(tUni) || tUni.includes(uUni);
      if (!matchesUni) return { matchesAll: false, failedCriterion: 'university' };
    }

    // 4. Ngành nghề / Nghề nghiệp
    const targetOcc = targetDemo.occupation || (targetDemo.majors && targetDemo.majors[0]);
    if (targetOcc && targetOcc !== 'ALL') {
      const uOcc = (userDemo.occupation || userDemo.major || '').trim().toLowerCase();
      if (!uOcc) return { matchesAll: false, failedCriterion: 'occupation' };
      const tOcc = targetOcc.trim().toLowerCase();
      const matchesOcc = uOcc.includes(tOcc) || tOcc.includes(uOcc);
      if (!matchesOcc) return { matchesAll: false, failedCriterion: 'occupation' };
    }

    // 5. Độ tuổi
    let ageMin = targetDemo.age_min;
    let ageMax = targetDemo.age_max;
    if (targetDemo.age_group && targetDemo.age_group !== 'ALL') {
      if (targetDemo.age_group === 'UNDER_18') { ageMax = 17; }
      else if (targetDemo.age_group === '18_22') { ageMin = 18; ageMax = 22; }
      else if (targetDemo.age_group === '23_30') { ageMin = 23; ageMax = 30; }
      else if (targetDemo.age_group === '31_45') { ageMin = 31; ageMax = 45; }
      else if (targetDemo.age_group === 'OVER_45') { ageMin = 46; }
    }

    if (ageMin || ageMax) {
      const currentYear = new Date().getFullYear();
      const birthYear = userDemo.birth_year || (userDemo.birth_date ? parseInt(userDemo.birth_date.split('-')[0], 10) : null);
      if (!birthYear) return { matchesAll: false, failedCriterion: 'age' };
      const age = currentYear - birthYear;
      if (ageMin && age < ageMin) return { matchesAll: false, failedCriterion: 'age' };
      if (ageMax && age > ageMax) return { matchesAll: false, failedCriterion: 'age' };
    }

    return { matchesAll: true };
  }

  /**
   * Helper sinh câu hỏi sàng lọc thích ứng cho người chưa khớp Profile
   */
  _generateAdaptiveScreenerQuestions(targetDemo) {
    const screeners = [];
    if (!targetDemo || typeof targetDemo !== 'object') return screeners;
    let sIndex = 1;

    if (targetDemo.gender && targetDemo.gender !== 'ALL' && targetDemo.gender !== 'ANY') {
      screeners.push({
        id: 'screener_gender',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Giới tính của bạn là gì?',
        options: ['Nam', 'Nữ', 'Khác'],
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetDemo.gender
      });
    }

    if (targetDemo.provinces && Array.isArray(targetDemo.provinces) && targetDemo.provinces.length > 0 && !targetDemo.provinces.includes('ALL')) {
      const provOptions = [...targetDemo.provinces, 'Khu vực khác'];
      screeners.push({
        id: 'screener_province',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Khu vực sinh sống hoặc học tập hiện tại của bạn là ở đâu?',
        options: Array.from(new Set(provOptions)),
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetDemo.provinces
      });
    }

    if (targetDemo.universities && Array.isArray(targetDemo.universities) && targetDemo.universities.length > 0 && !targetDemo.universities.includes('ALL')) {
      const uniOptions = [...targetDemo.universities, 'Trường đại học / cao đẳng khác'];
      screeners.push({
        id: 'screener_university',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Bạn hiện đang theo học hoặc đã tốt nghiệp tại trường nào dưới đây?',
        options: Array.from(new Set(uniOptions)),
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetDemo.universities
      });
    }

    if (targetDemo.majors && Array.isArray(targetDemo.majors) && targetDemo.majors.length > 0 && !targetDemo.majors.includes('ALL')) {
      const majorOptions = [...targetDemo.majors, 'Khối ngành khác'];
      screeners.push({
        id: 'screener_major',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Khối ngành học chính hoặc lĩnh vực chuyên môn của bạn là gì?',
        options: Array.from(new Set(majorOptions)),
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetDemo.majors
      });
    }

    if (targetDemo.age_min || targetDemo.age_max) {
      const min = targetDemo.age_min || 0;
      const max = targetDemo.age_max || 120;
      const targetLabel = (min > 0 && max < 120)
        ? min + ' - ' + max + ' tuổi'
        : (min > 0 ? 'Từ ' + min + ' tuổi trở lên' : 'Dưới ' + max + ' tuổi');

      screeners.push({
        id: 'screener_age',
        order_index: sIndex++,
        type: 'SINGLE_CHOICE',
        content: 'Độ tuổi hiện tại của bạn thuộc nhóm nào dưới đây?',
        options: [targetLabel, 'Nhóm tuổi khác'],
        rows: null,
        columns: null,
        is_required: 1,
        is_screener: true,
        qualifying_answer: targetLabel
      });
    }

    return screeners;
  }

  /**
   * Helper áp dụng logic Adaptive Auto-Screener
   */
  _applyAdaptiveScreener(survey, dbQuestions, user, isOwnerOrAdmin = false) {
    const parsedQuestions = dbQuestions.map(q => this._parseQuestionFromDb(q, isOwnerOrAdmin));

    if (isOwnerOrAdmin) {
      return {
        questions: parsedQuestions,
        autoScreenerBypassed: false,
        autoFilledDemographics: null
      };
    }

    let targetDemo = null;
    if (survey.target_demographics_json) {
      try { targetDemo = JSON.parse(survey.target_demographics_json); } catch (e) {}
    }

    const userDemo = this._getUserDemographics(user);
    const matchResult = this._checkUserMatchesTarget(userDemo, targetDemo);

    if (matchResult.matchesAll) {
      // ẨN toàn bộ các câu hỏi sàng lọc screener ở đầu bài (Smart Bypass)
      const nonScreenerQuestions = parsedQuestions.filter(q => !q.is_screener);
      const autoFilledDemographics = userDemo ? {
        gender: userDemo.gender || null,
        province: userDemo.province || null,
        university: userDemo.university || null,
        major: userDemo.major || null,
        birth_date: userDemo.birth_date || null,
        age: userDemo.birth_year ? (new Date().getFullYear() - userDemo.birth_year) : null
      } : null;

      return {
        questions: nonScreenerQuestions,
        autoScreenerBypassed: true,
        autoFilledDemographics
      };
    }

    // Chưa khớp Profile: nếu trong dbQuestions chưa có câu hỏi screener mà khảo sát có targetDemo thì chèn tự động ở đầu bài
    const hasExistingScreeners = parsedQuestions.some(q => q.is_screener);
    if (!hasExistingScreeners && targetDemo && Object.keys(targetDemo).length > 0) {
      const generatedScreeners = this._generateAdaptiveScreenerQuestions(targetDemo);
      const combined = [...generatedScreeners, ...parsedQuestions];
      combined.forEach((q, idx) => { q.order_index = idx + 1; });
      return {
        questions: combined,
        autoScreenerBypassed: false,
        autoFilledDemographics: null
      };
    }

    return {
      questions: parsedQuestions,
      autoScreenerBypassed: false,
      autoFilledDemographics: null
    };
  }

  /**
   * Lấy danh sách khảo sát phù hợp với vai trò
   */
  listSurveys(req, res) {
    try {
      const user = req.user;
      const { filter, scope } = req.query;

      // 1. Khách vãng lai chưa đăng nhập: Trả về danh sách khảo sát công khai đang ACTIVE
      if (!user) {
        const surveys = db.prepare(`
          SELECT s.*, 
            vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title,
            (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
          FROM surveys s
          LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
          WHERE s.status = 'ACTIVE'
          ORDER BY s.created_at DESC
        `).all();

        const guestSurveys = surveys.map(s => {
          let academicTags = [];
          if (s.academic_tags_json) {
            try { academicTags = JSON.parse(s.academic_tags_json); } catch (e) {}
          }
          return {
            ...s,
            academic_tags: academicTags,
            matchScore: 100,
            matchLabel: 'Công Khai',
            badgeColor: 'emerald'
          };
        });

        return res.json({ success: true, surveys: guestSurveys });
      }

      if (user.role === 'CREATOR' || filter === 'my_surveys' || scope === 'created') {
        const surveys = db.prepare(`
          SELECT s.*, 
            vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title,
            (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
          FROM surveys s
          LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
          WHERE s.creator_id = ?
          ORDER BY s.created_at DESC
        `).all(user.id);

        return res.json({ success: true, surveys });
      }

      if (user.role === 'ADMIN') {
        const surveys = db.prepare(`
          SELECT s.*, u.name AS creator_name, u.email AS creator_email,
            vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title,
            (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
          FROM surveys s
          JOIN users u ON s.creator_id = u.id
          LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
          ORDER BY s.created_at DESC
        `).all();

        return res.json({ success: true, surveys });
      }

      // Vai trò RESPONDENT: Lấy các khảo sát đang ACTIVE
      let userDemographics = null;
      const userRecord = db.prepare('SELECT demographics_json FROM users WHERE id = ?').get(user.id);
      if (userRecord && userRecord.demographics_json) {
        try { userDemographics = JSON.parse(userRecord.demographics_json); } catch (e) {}
      }

      const rawSurveys = db.prepare(`
        SELECT s.id, s.title, s.description, s.category, s.target_responses, 
               s.collected_responses, s.reward_points_per_response, s.min_completion_time_sec,
               s.survey_source, s.external_form_url, s.academic_tags_json, s.target_demographics_json,
               s.reward_mode, s.sponsor_campaign_id, s.is_pinned, s.is_featured,
               vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title, vc.face_value_vnd AS sponsor_face_value,
               r.status AS user_response_status, r.points_rewarded,
               (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
        FROM surveys s
        LEFT JOIN responses r ON r.survey_id = s.id AND r.respondent_id = ?
        LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
        WHERE s.status = 'ACTIVE'
        ORDER BY s.created_at DESC
      `).all(user.id);

      const surveys = rawSurveys.map(s => {
        let academicTags = [];
        if (s.academic_tags_json) {
          try { academicTags = JSON.parse(s.academic_tags_json); } catch (e) {}
        }
        let targetDemo = null;
        if (s.target_demographics_json) {
          try { targetDemo = JSON.parse(s.target_demographics_json); } catch (e) {}
        }

        const matchInfo = matchingService.calculateMatchScore(userDemographics || {}, targetDemo || {});

        return {
          ...s,
          academic_tags: academicTags,
          target_demographics: targetDemo,
          matchScore: matchInfo.matchScore,
          matchLabel: matchInfo.matchLabel,
          badgeColor: matchInfo.badgeColor
        };
      });

      // Sắp xếp ưu tiên: Khảo sát khớp cao lên trước, sau đó đến thưởng cao
      surveys.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return (b.reward_points_per_response || 0) - (a.reward_points_per_response || 0);
      });

      return res.json({ success: true, surveys });
    } catch (err) {
      console.error('Lỗi listSurveys:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải danh sách khảo sát' });
    }
  }

  /**
   * Xem chi tiết khảo sát
   */
  /**
   * Xem chi tiết khảo sát
   */
  getSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy khảo sát' });
      }

      const dbQuestions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);

      // Lấy thông tin tài trợ voucher nếu có
      let sponsor = null;
      if (survey.sponsor_campaign_id) {
        sponsor = db.prepare(`
          SELECT id, brand_name, brand_logo, title, face_value_vnd, instructions, expiry_date, remaining_quantity
          FROM voucher_campaigns WHERE id = ?
        `).get(survey.sponsor_campaign_id);
      }

      const isOwnerOrAdmin = user && (user.role === 'ADMIN' || survey.creator_id === user.id);

      if (!isOwnerOrAdmin) {
        const screenerResult = this._applyAdaptiveScreener(survey, dbQuestions, user, false);

        let existingResponse = null;
        let userVoucher = null;
        if (user) {
          existingResponse = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(id, user.id);
          if (existingResponse) {
            userVoucher = db.prepare(`
              SELECT vc.id, vc.code, vc.claimed_at, c.brand_name, c.brand_logo, c.title, c.instructions, c.expiry_date
              FROM voucher_codes vc
              JOIN voucher_campaigns c ON vc.campaign_id = c.id
              WHERE vc.claimed_response_id = ?
            `).get(existingResponse.id);
          }
        }

        let parsedUserResponse = null;
        if (existingResponse) {
          let answersObj = {};
          try {
            answersObj = JSON.parse(existingResponse.answers_payload || '{}');
          } catch (e) {
            answersObj = {};
          }
          parsedUserResponse = {
            ...existingResponse,
            answers: answersObj
          };
        }

        return res.json({
          success: true,
          survey: {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            category: survey.category,
            reward_points_per_response: survey.reward_points_per_response,
            min_completion_time_sec: survey.min_completion_time_sec,
            collected_responses: survey.collected_responses,
            target_responses: survey.target_responses,
            survey_source: survey.survey_source || 'INTERNAL_BUILDER',
            external_form_url: survey.external_form_url,
            reward_mode: survey.reward_mode || 'POINTS_ONLY',
            sponsor_campaign_id: survey.sponsor_campaign_id,
            sponsor,
            package_type: survey.package_type || 'PERSONAL',
            pricing_tier: survey.pricing_tier || 'STANDARD',
            allow_edit_response: survey.allow_edit_response !== undefined ? survey.allow_edit_response : 0,
            allow_view_response: survey.allow_view_response !== undefined ? survey.allow_view_response : 1,
            auto_screener_bypassed: screenerResult.autoScreenerBypassed,
            auto_filled_demographics: screenerResult.autoFilledDemographics,
            questions: screenerResult.questions
          },
          questions: screenerResult.questions,
          auto_screener_bypassed: screenerResult.autoScreenerBypassed,
          auto_filled_demographics: screenerResult.autoFilledDemographics,
          userResponse: parsedUserResponse,
          userVoucher: userVoucher || null
        });
      }

      // Creator sở hữu khảo sát hoặc Admin hệ thống xem đầy đủ (bao gồm attention check, expected_answer, rows, columns, is_required)
      const fullQuestions = dbQuestions.map(q => this._parseQuestionFromDb(q, true));

      return res.json({
        success: true,
        survey: {
          ...survey,
          sponsor
        },
        questions: fullQuestions
      });
    } catch (err) {
      console.error('Lỗi getSurvey:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải thông tin khảo sát' });
    }
  }

  /**
   * Tạo khảo sát mới (Dành cho Creator)
   */
  /**
   * Tạo khảo sát mới (Dành cho Creator)
   */
  createSurvey(req, res) {
    try {
      const user = req.user;

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Tài khoản của bạn không ở trạng thái hoạt động' });
      }

      const {
        title,
        description,
        category = 'Thị trường',
        target_responses = 100,
        questions,
        survey_source = 'INTERNAL_BUILDER',
        external_form_url = null,
        google_sheets_webhook_url = null,
        sponsor_campaign_id = null,
        reward_mode = 'POINTS_ONLY',
        academic_tags = null,
        target_demographics = null,
        voucher_data = null,
        package_type = 'PERSONAL',
        pricing_tier = 'STANDARD',
        allow_edit_response = 0,
        allow_view_response = 1,
        duration_days = 14
      } = req.body;

      const validDurationDays = Math.min(90, Math.max(1, parseInt(duration_days, 10) || 14));

      // Kiểm định đầu vào chặt chẽ (Input Validation & XSS Defense)
      if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 255) {
        return res.status(400).json({ success: false, message: 'Tiêu đề khảo sát phải từ 3 đến 255 ký tự' });
      }

      const validTarget = parseInt(target_responses, 10);
      if (!Number.isInteger(validTarget) || validTarget < 10 || validTarget > 100000) {
        return res.status(400).json({ success: false, message: 'Số lượng mẫu mục tiêu phải là số nguyên từ 10 đến 100,000' });
      }

      const cleanWebhookUrl = google_sheets_webhook_url && typeof google_sheets_webhook_url === 'string'
        ? google_sheets_webhook_url.trim()
        : null;
      if (cleanWebhookUrl && !webhookService.isValidUrl(cleanWebhookUrl)) {
        return res.status(400).json({ success: false, message: 'Google Sheets Webhook URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)' });
      }

      // Kiểm tra trùng lặp đường link biểu mẫu ngoài (Anti-Duplicate Form URL)
      let cleanFormUrl = external_form_url && typeof external_form_url === 'string' ? external_form_url.trim() : null;
      let normalizedFormUrl = null;
      if (cleanFormUrl) {
        normalizedFormUrl = antiFraudService.normalizeFormUrl(cleanFormUrl);
        const dupCheck = antiFraudService.checkDuplicateFormUrl(normalizedFormUrl);
        if (dupCheck.isDuplicate) {
          return res.status(400).json({
            success: false,
            isDuplicateForm: true,
            message: 'Đường link biểu mẫu này đã được sử dụng trong hệ thống bởi một khảo sát khác. Để chống tạo nhiều tài khoản trục lợi dùng thử miễn phí, mỗi liên kết Google/MS Forms chỉ được đăng ký một lần duy nhất.'
          });
        }
      }

      if (!Array.isArray(questions) || questions.length === 0 || questions.length > 100) {
        return res.status(400).json({ success: false, message: 'Khảo sát phải có từ 1 đến 100 câu hỏi' });
      }

      const allowedTypes = [
        'SHORT_TEXT', 'PARAGRAPH', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN',
        'LINEAR_SCALE', 'LIKERT_SCALE', 'RATING_STARS', 'CHOICE_GRID', 'CHECKBOX_GRID',
        'DATE_INPUT', 'TIME_INPUT', 'FILE_UPLOAD', 'NUMBER_INPUT', 'OPEN_TEXT'
      ];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q || typeof q !== 'object') {
          return res.status(400).json({ success: false, message: `Câu hỏi số ${i + 1} không hợp lệ` });
        }
        if (!allowedTypes.includes(q.type)) {
          return res.status(400).json({ success: false, message: `Loại câu hỏi ${q.type} không được hỗ trợ (câu ${i + 1})` });
        }
        if (!q.content || typeof q.content !== 'string' || q.content.trim().length === 0 || q.content.trim().length > 1000) {
          return res.status(400).json({ success: false, message: `Nội dung câu hỏi ${i + 1} phải từ 1 đến 1000 ký tự` });
        }
        if (q.is_attention_check && (!q.expected_answer || String(q.expected_answer).trim().length === 0)) {
          return res.status(400).json({ success: false, message: `Câu hỏi kiểm tra chú ý (câu ${i + 1}) bắt buộc phải có đáp án kỳ vọng` });
        }
      }

      // Tính toán kinh tế học của khảo sát
      const economics = pricingService.calculateSurveyEconomics(questions, target_responses);
      const minCompletionTimeSec = antiFraudService.calculateMinCompletionTime(questions);

      // Nếu là VOUCHER_ONLY (Zero Cash Model): Không tính chi phí VND
      const costPerResp = reward_mode === 'VOUCHER_ONLY' ? 0 : economics.costPerResponseVnd;
      const rewardPointsPerResp = reward_mode === 'VOUCHER_ONLY' ? 0 : economics.rewardPointsPerResponse;

      // Xử lý tạo voucher tài trợ nếu Creator cung cấp danh sách mã (Zero Cash)
      let finalSponsorCampaignId = sponsor_campaign_id;
      if (voucher_data && voucher_data.voucher_codes && Array.isArray(voucher_data.voucher_codes) && voucher_data.voucher_codes.length > 0) {
        try {
          const vcResult = voucherService.createSponsorVoucherCampaign(
            user.id,
            {
              brand_name: voucher_data.brand_name || 'Nhà tài trợ',
              brand_logo: voucher_data.brand_logo || '🎁',
              title: voucher_data.title || 'Voucher quà tặng',
              face_value_vnd: voucher_data.face_value_vnd || 0,
              instructions: voucher_data.instructions || 'Mã ưu đãi quà tặng sau khi hoàn thành khảo sát'
            },
            voucher_data.voucher_codes
          );
          finalSponsorCampaignId = vcResult.campaignId;
        } catch (vErr) {
          return res.status(400).json({ success: false, message: 'Lỗi tạo chiến dịch voucher tài trợ: ' + vErr.message });
        }
      }

      const academicTagsJson = academic_tags ? JSON.stringify(academic_tags) : null;
      const targetDemoJson = target_demographics ? JSON.stringify(target_demographics) : null;

      const surveyId = crypto.randomUUID();

      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        db.prepare(`
          INSERT INTO surveys (
            id, creator_id, title, description, category, target_responses, collected_responses, 
            cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec, 
            status, survey_source, external_form_url, normalized_form_url, google_sheets_webhook_url, sponsor_campaign_id, reward_mode,
            academic_tags_json, target_demographics_json, package_type, pricing_tier,
            allow_edit_response, allow_view_response, duration_days, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0.0, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' days'))
        `).run(
          surveyId,
          user.id,
          title.trim(),
          (description || '').trim(),
          category,
          target_responses,
          costPerResp,
          rewardPointsPerResp,
          minCompletionTimeSec,
          survey_source,
          cleanFormUrl || null,
          normalizedFormUrl || null,
          cleanWebhookUrl,
          finalSponsorCampaignId || null,
          reward_mode,
          academicTagsJson,
          targetDemoJson,
          package_type,
          pricing_tier,
          allow_edit_response ? 1 : 0,
          allow_view_response !== undefined && (allow_view_response === 0 || allow_view_response === false) ? 0 : 1,
          validDurationDays,
          validDurationDays
        );

        const insertQ = db.prepare(`
          INSERT INTO questions (
            id, survey_id, order_index, type, content, 
            options_json, rows_json, columns_json, is_required, 
            min_label, max_label, image_url, video_url,
            is_attention_check, expected_answer, is_screener, qualifying_answer
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qId = crypto.randomUUID();
          const rowsJson = q.rows && Array.isArray(q.rows) ? JSON.stringify(q.rows) : null;
          const colsJson = q.columns && Array.isArray(q.columns) ? JSON.stringify(q.columns) : null;
          const optionsJson = q.options ? JSON.stringify(q.options) : (colsJson || null);
          const isReq = (q.is_required !== undefined && (q.is_required === 0 || q.is_required === false)) ? 0 : 1;

          insertQ.run(
            qId,
            surveyId,
            i + 1,
            q.type,
            q.content.trim(),
            optionsJson,
            rowsJson,
            colsJson,
            isReq,
            q.min_label || null,
            q.max_label || null,
            q.image_url || null,
            q.video_url || null,
            q.is_attention_check ? 1 : 0,
            q.expected_answer || null,
            q.is_screener ? 1 : 0,
            q.qualifying_answer || null
          );
        }

        db.exec('COMMIT');

        return res.status(201).json({
          success: true,
          message: 'Tạo bản nháp khảo sát thành công',
          surveyId,
          economics: {
            ...economics,
            costPerResponseVnd: costPerResp,
            rewardPointsPerResponse: rewardPointsPerResp,
            totalEscrowVnd: reward_mode === 'VOUCHER_ONLY' ? 0 : economics.totalEscrowVnd
          },
          package_type,
          pricing_tier,
          reward_mode,
          survey_source
        });
      } catch (innerErr) {
        db.exec('ROLLBACK');
        throw innerErr;
      }
    } catch (err) {
      console.error('Lỗi createSurvey:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tạo khảo sát: ' + err.message });
    }
  }

  /**
   * Cập nhật thông tin khảo sát (Google Sheets Webhook URL, tiêu đề, mô tả, cấu hình)
   */
  updateSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      // Quyền: Creator sở hữu bài khảo sát hoặc ADMIN
      const isOwnerOrAdmin = user.role === 'ADMIN' || survey.creator_id === user.id;
      if (!isOwnerOrAdmin) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa khảo sát này' });
      }

      const {
        title,
        description,
        category,
        google_sheets_webhook_url,
        academic_tags,
        target_demographics
      } = req.body;

      const updates = [];
      const params = [];

      if (google_sheets_webhook_url !== undefined) {
        const cleanUrl = google_sheets_webhook_url && typeof google_sheets_webhook_url === 'string'
          ? google_sheets_webhook_url.trim()
          : null;
        if (cleanUrl && !webhookService.isValidUrl(cleanUrl)) {
          return res.status(400).json({ success: false, message: 'Google Sheets Webhook URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)' });
        }
        updates.push('google_sheets_webhook_url = ?');
        params.push(cleanUrl);
      }

      if (title !== undefined && typeof title === 'string') {
        if (title.trim().length < 3 || title.trim().length > 255) {
          return res.status(400).json({ success: false, message: 'Tiêu đề khảo sát phải từ 3 đến 255 ký tự' });
        }
        updates.push('title = ?');
        params.push(title.trim());
      }

      if (description !== undefined && typeof description === 'string') {
        updates.push('description = ?');
        params.push(description.trim());
      }

      if (category !== undefined && typeof category === 'string') {
        updates.push('category = ?');
        params.push(category.trim());
      }

      if (academic_tags !== undefined) {
        updates.push('academic_tags_json = ?');
        params.push(academic_tags ? JSON.stringify(academic_tags) : null);
      }

      if (target_demographics !== undefined) {
        updates.push('target_demographics_json = ?');
        params.push(target_demographics ? JSON.stringify(target_demographics) : null);
      }

      if (req.body.cover_image_url !== undefined) {
        updates.push('cover_image_url = ?');
        params.push(req.body.cover_image_url ? req.body.cover_image_url.trim() : null);
      }

      if (req.body.target_responses !== undefined) {
        updates.push('target_responses = ?');
        params.push(Math.max(1, parseInt(req.body.target_responses, 10)));
      }

      if (req.body.reward_points_per_response !== undefined) {
        updates.push('reward_points_per_response = ?');
        params.push(Math.max(1, parseInt(req.body.reward_points_per_response, 10)));
      }

      if (req.body.allow_edit_response !== undefined) {
        updates.push('allow_edit_response = ?');
        params.push(req.body.allow_edit_response ? 1 : 0);
      }

      if (req.body.allow_view_response !== undefined) {
        updates.push('allow_view_response = ?');
        params.push(req.body.allow_view_response ? 1 : 0);
      }

      // Cập nhật câu hỏi nếu được cung cấp
      if (req.body.questions && Array.isArray(req.body.questions) && req.body.questions.length > 0) {
        const respCount = db.prepare('SELECT COUNT(*) as count FROM responses WHERE survey_id = ?').get(id)?.count || 0;
        if (respCount === 0) {
          db.prepare('DELETE FROM questions WHERE survey_id = ?').run(id);
          const insertQ = db.prepare(`
            INSERT INTO questions (
              id, survey_id, order_index, type, content, 
              options_json, rows_json, columns_json, is_required, 
              min_label, max_label, image_url, video_url,
              is_attention_check, expected_answer, is_screener, qualifying_answer
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const qList = req.body.questions;
          for (let i = 0; i < qList.length; i++) {
            const q = qList[i];
            const qId = crypto.randomUUID();
            const rowsJson = q.rows && Array.isArray(q.rows) ? JSON.stringify(q.rows) : null;
            const colsJson = q.columns && Array.isArray(q.columns) ? JSON.stringify(q.columns) : null;
            const optionsJson = q.options ? JSON.stringify(q.options) : (colsJson || null);
            const isReq = (q.is_required !== undefined && (q.is_required === 0 || q.is_required === false)) ? 0 : 1;

            insertQ.run(
              qId, id, i + 1, q.type, (q.content || '').trim(), optionsJson, rowsJson, colsJson, isReq,
              q.min_label || null, q.max_label || null, q.image_url || null, q.video_url || null,
              q.is_attention_check ? 1 : 0, q.expected_answer || null, q.is_screener ? 1 : 0, q.qualifying_answer || null
            );
          }
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'Không có dữ liệu nào được cung cấp để cập nhật' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      db.prepare(`UPDATE surveys SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      const updatedSurvey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);

      return res.json({
        success: true,
        message: 'Cập nhật khảo sát thành công',
        survey: updatedSurvey
      });
    } catch (err) {
      console.error('Lỗi updateSurvey:', err);
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật khảo sát: ' + err.message });
    }
  }

  /**
   * Xuất bản khảo sát & Ký quỹ (Escrow) hoặc Zero Cash Model nếu tài trợ Voucher
   */
  publishSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: 'Tài khoản của bạn không ở trạng thái hoạt động' });
      }

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND creator_id = ?').get(id, user.id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại hoặc không thuộc quyền sở hữu' });
      }

      if (survey.status !== 'DRAFT') {
        return res.status(400).json({ success: false, message: 'Khảo sát này đã được xuất bản trước đó' });
      }

      // Zero Cash Model: Nếu khảo sát là VOUCHER_ONLY, không cần ký quỹ VND
      if (survey.reward_mode === 'VOUCHER_ONLY') {
        if (survey.sponsor_campaign_id) {
          const campaign = db.prepare('SELECT remaining_quantity, title FROM voucher_campaigns WHERE id = ?').get(survey.sponsor_campaign_id);
          if (!campaign || campaign.remaining_quantity <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Chiến dịch voucher tài trợ chưa có mã hoặc đã hết mã. Vui lòng tải lên danh sách mã voucher trước.'
            });
          }
        }

        db.prepare("UPDATE surveys SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND creator_id = ? AND status = 'DRAFT'").run(id, user.id);

        const activeSurvey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
        if (activeSurvey && pushNotificationService.isHighRewardSurvey(activeSurvey)) {
          try {
            pushNotificationService.sendHighRewardSurveyAlert(activeSurvey);
          } catch (pushErr) {
            console.error('Lỗi sendHighRewardSurveyAlert:', pushErr.message);
          }
        }

        return res.json({
          success: true,
          message: 'Xuất bản chiến dịch khảo sát tài trợ Voucher thành công (Zero Cash Model)!',
          totalEscrowVnd: 0,
          reward_mode: 'VOUCHER_ONLY',
          status: 'ACTIVE'
        });
      }

      const totalEscrow = survey.cost_per_response * survey.target_responses;
      
      // Tự động kiểm tra hoặc nhận cờ sử dụng gói khảo sát dùng thử miễn phí (First Survey Free Trial)
      let useFreeTrial = req.body && req.body.use_free_trial === true;
      if (!useFreeTrial && req.body && req.body.use_free_trial === undefined) {
        // Nếu user thiếu số dư nhưng còn suất dùng thử miễn phí và khảo sát <= 25 phản hồi: tự động kích hoạt
        const freshUser = db.prepare('SELECT credit_balance, free_trial_surveys_available, is_google_linked, is_email_verified FROM users WHERE id = ?').get(user.id);
        if (freshUser && (freshUser.free_trial_surveys_available || 0) > 0 && survey.target_responses <= 25 && (freshUser.credit_balance || 0) < totalEscrow) {
          useFreeTrial = true;
        }
      }

      // Kiểm tra điều kiện bảo mật: Bắt buộc liên kết Google hoặc xác thực Email mới được nhận ưu đãi Free Trial
      if (useFreeTrial) {
        const freshUser = db.prepare('SELECT credit_balance, free_trial_surveys_available, is_google_linked, is_email_verified FROM users WHERE id = ?').get(user.id);
        if (!freshUser || (!freshUser.is_google_linked && !freshUser.is_email_verified)) {
          return res.status(400).json({
            success: false,
            requireVerification: true,
            message: 'Yêu cầu bảo mật: Bạn cần liên kết tài khoản Google hoặc xác thực Email để kích hoạt 25 lượt khảo sát dùng thử miễn phí.'
          });
        }
      }

      const result = ledgerService.lockEscrowForSurvey(id, user.id, totalEscrow, { useFreeTrial });

      // Kích hoạt thông báo đẩy thời gian thực nếu khảo sát thuộc diện HỎA TỐC hoặc Thưởng Cao / Boost >= 25%
      const activeSurvey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (activeSurvey && pushNotificationService.isHighRewardSurvey(activeSurvey)) {
        try {
          pushNotificationService.sendHighRewardSurveyAlert(activeSurvey);
        } catch (pushErr) {
          console.error('Lỗi sendHighRewardSurveyAlert trong publishSurvey:', pushErr.message);
        }
      }

      return res.json({
        success: true,
        message: result.isFreeTrial 
          ? 'Xuất bản chiến dịch khảo sát Dùng Thử Miễn Phí thành công (Nền tảng tài trợ 100%)!' 
          : 'Xuất bản và ký quỹ chiến dịch khảo sát thành công!',
        isFreeTrial: !!result.isFreeTrial,
        totalEscrowVnd: result.isFreeTrial ? 0 : totalEscrow,
        sponsoredEscrowVnd: result.isFreeTrial ? totalEscrow : 0,
        newCreditBalance: result.newCreditBalance,
        freeTrialSurveysAvailable: result.freeTrialSurveysAvailable !== undefined ? result.freeTrialSurveysAvailable : user.free_trial_surveys_available
      });
    } catch (err) {
      console.error('Lỗi publishSurvey:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Kích hoạt Gom Mẫu Hỏa Tốc (Fast-track Boost) cho khảo sát:
   * 1. Trừ 1 vé fast_track_tickets trong tài khoản Creator
   * 2. Bắn thông báo đẩy trên App APK Android
   * 3. Gửi email hệ thống tới email đăng ký của người dùng
   */
  boostFastTrack(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ? AND creator_id = ?').get(id, user.id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại hoặc không thuộc quyền sở hữu' });
      }
      if (survey.status !== 'ACTIVE') {
        return res.status(400).json({ success: false, message: 'Chỉ có thể kích hoạt gom mẫu hỏa tốc cho khảo sát đang ACTIVE' });
      }

      const freshUser = db.prepare('SELECT fast_track_tickets FROM users WHERE id = ?').get(user.id);
      if (!freshUser || (freshUser.fast_track_tickets || 0) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không có Vé Gom Mẫu Hỏa Tốc. Vui lòng nạp thêm gói doanh nghiệp (từ 1M+) để nhận vé miễn phí!'
        });
      }

      // Trừ 1 vé trong DB
      db.prepare('UPDATE users SET fast_track_tickets = fast_track_tickets - 1 WHERE id = ? AND fast_track_tickets > 0').run(user.id);

      // Kích hoạt dịch vụ bắn thông báo đẩy APK và gửi email hệ thống
      const notificationService = require('../services/notificationService');
      const dispatchResult = notificationService.broadcastFastTrackNotification(survey.id);

      // Kích hoạt đẩy thông báo realtime qua pushNotificationService
      try {
        pushNotificationService.sendHighRewardSurveyAlert(survey);
      } catch (pErr) {
        console.error('Lỗi sendHighRewardSurveyAlert trong boostFastTrack:', pErr.message);
      }

      const updatedUser = db.prepare('SELECT fast_track_tickets FROM users WHERE id = ?').get(user.id);

      return res.json({
        success: true,
        message: 'Kích hoạt Gom Mẫu Hỏa Tốc thành công! Hệ thống đã ghim bài lên TOP, bắn thông báo đẩy đến App APK và gửi email hệ thống cho đáp viên.',
        remainingTickets: updatedUser.fast_track_tickets,
        dispatchResult
      });
    } catch (err) {
      console.error('Lỗi boostFastTrack:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  getNotifications(req, res) {
    try {
      const user = req.user;
      const notificationService = require('../services/notificationService');
      const notifications = notificationService.getUserNotifications(user.id);
      return res.json({ success: true, notifications });
    } catch (err) {
      console.error('Lỗi getNotifications:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải danh sách thông báo' });
    }
  }

  markNotificationAsRead(req, res) {
    try {
      const user = req.user;
      const { id } = req.params;
      const notificationService = require('../services/notificationService');
      notificationService.markAsRead(user.id, id);
      return res.json({ success: true, message: 'Đã đánh dấu thông báo đã đọc' });
    } catch (err) {
      console.error('Lỗi markNotificationAsRead:', err);
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo' });
    }
  }

  /**
   * Đăng ký kênh Web Push / Mobile Hybrid Push Notification
   */
  subscribePushNotification(req, res) {
    try {
      const user = req.user;
      const result = pushNotificationService.saveSubscription(user ? user.id : null, req.body);
      return res.json({
        success: true,
        message: 'Đăng ký nhận thông báo đẩy thành công',
        data: result
      });
    } catch (err) {
      console.error('Lỗi subscribePushNotification:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Hủy đăng ký kênh Push Notification
   */
  unsubscribePushNotification(req, res) {
    try {
      const user = req.user;
      const endpoint = req.body && req.body.endpoint;
      const result = pushNotificationService.removeSubscription(endpoint, user ? user.id : null);
      return res.json({
        success: true,
        message: 'Hủy đăng ký nhận thông báo đẩy thành công',
        data: result
      });
    } catch (err) {
      console.error('Lỗi unsubscribePushNotification:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Lấy số lượng thông báo chưa đọc và tin phát sóng thời gian thực mới nhất
   */
  getUnreadNotificationCount(req, res) {
    try {
      const user = req.user;
      const unreadRow = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id);
      const unreadCount = unreadRow ? unreadRow.count : 0;
      const since = req.query && req.query.since ? parseInt(req.query.since, 10) : 0;
      const recentBroadcasts = pushNotificationService.getRecentBroadcasts(since);

      return res.json({
        success: true,
        unreadCount,
        recentBroadcasts
      });
    } catch (err) {
      console.error('Lỗi getUnreadNotificationCount:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải số thông báo chưa đọc' });
    }
  }

  /**
   * Đánh dấu toàn bộ thông báo của người dùng là đã đọc
   */
  markAllNotificationsAsRead(req, res) {
    try {
      const user = req.user;
      const notificationService = require('../services/notificationService');
      notificationService.markAsRead(user.id, 'ALL');
      return res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
    } catch (err) {
      console.error('Lỗi markAllNotificationsAsRead:', err);
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật thông báo' });
    }
  }

  /**
   * Lấy danh sách tin phát sóng đẩy realtime mới nhất
   */
  getRealtimeAlerts(req, res) {
    try {
      const since = req.query && req.query.since ? parseInt(req.query.since, 10) : 0;
      const alerts = pushNotificationService.getRecentBroadcasts(since);
      return res.json({ success: true, alerts });
    } catch (err) {
      console.error('Lỗi getRealtimeAlerts:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải tin phát sóng' });
    }
  }

  /**
   * Bắt đầu phiên làm khảo sát (Session)
   */
  /**
   * Bắt đầu phiên làm khảo sát (Session)
   */
  startSession(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey || survey.status !== 'ACTIVE') {
        return res.status(400).json({ success: false, message: 'Khảo sát không tồn tại hoặc không còn nhận câu trả lời' });
      }

      if (survey.collected_responses >= survey.target_responses) {
        return res.status(400).json({ success: false, message: 'Khảo sát đã thu thập đủ số lượng mẫu mục tiêu' });
      }

      // Kiểm tra người dùng đã từng làm khảo sát này chưa
      const existing = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(id, user.id);
      if (existing) {
        if (existing.status === 'VALIDATED') {
          if (survey.allow_edit_response === 1) {
            let existingAnswers = {};
            try { existingAnswers = JSON.parse(existing.answers_payload || '{}'); } catch (e) {}
            const dbQuestions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);
            const screenerResult = this._applyAdaptiveScreener(survey, dbQuestions, user, false);
            return res.json({
              success: true,
              is_editing: true,
              responseId: existing.id,
              minCompletionTimeSec: 0,
              rewardPoints: 0,
              existingAnswers,
              auto_screener_bypassed: screenerResult.autoScreenerBypassed,
              auto_filled_demographics: screenerResult.autoFilledDemographics,
              questions: screenerResult.questions,
              message: 'Bạn đang chỉnh sửa câu trả lời đã nộp'
            });
          }
          return res.status(400).json({ success: false, message: 'Bạn đã hoàn thành khảo sát này và nhận thưởng rồi' });
        }
        if (existing.status === 'REJECTED_FRAUD') {
          return res.status(403).json({ success: false, message: 'Bạn đã bị từ chối bài làm này do vi phạm tiêu chuẩn chất lượng' });
        }
      }

      // Tạo hoặc cập nhật response IN_PROGRESS an toàn tranh chấp
      let responseId = existing ? existing.id : crypto.randomUUID();
      if (!existing) {
        db.prepare(`
          INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
          VALUES (?, ?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)
        `).run(responseId, id, user.id);
      } else {
        db.prepare(`
          UPDATE responses SET started_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(responseId);
      }

      // Lấy danh sách câu hỏi và áp dụng Adaptive Auto-Screener
      const dbQuestions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);
      const screenerResult = this._applyAdaptiveScreener(survey, dbQuestions, user, false);

      return res.json({
        success: true,
        responseId,
        minCompletionTimeSec: survey.min_completion_time_sec,
        rewardPoints: survey.reward_points_per_response,
        auto_screener_bypassed: screenerResult.autoScreenerBypassed,
        auto_filled_demographics: screenerResult.autoFilledDemographics,
        questions: screenerResult.questions
      });
    } catch (err) {
      console.error('Lỗi startSession:', err);
      return res.status(500).json({ success: false, message: 'Lỗi bắt đầu khảo sát: ' + err.message });
    }
  }

  /**
   * Nộp bài khảo sát & Chấm điểm chống gian lận
   */
  /**
   * Nộp bài khảo sát & Chấm điểm chống gian lận
   */
  submitSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const { answers, duration_sec = 0, device_fingerprint = 'browser_web' } = req.body;

      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        return res.status(400).json({ success: false, message: 'Thiếu dữ liệu câu trả lời hoặc định dạng không hợp lệ' });
      }

      const duration = Math.max(0, parseInt(duration_sec, 10) || 0);
      const fingerprint = String(device_fingerprint || 'browser_web').substring(0, 128);

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      const response = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(id, user.id);
      if (!response) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy phiên làm bài hợp lệ. Vui lòng bấm làm khảo sát trước.' });
      }
      let isEditing = false;
      if (response.status === 'VALIDATED') {
        if (survey.allow_edit_response === 1) {
          isEditing = true;
        } else {
          return res.status(400).json({ success: false, message: 'Bài làm này đã được hoàn thành và khảo sát không cho phép chỉnh sửa câu trả lời sau khi nộp' });
        }
      }
      if (response.status === 'REJECTED_FRAUD') {
        return res.status(403).json({ success: false, message: 'Bài làm này đã bị từ chối do vi phạm quy chuẩn chất lượng' });
      }

      // Lấy danh sách câu hỏi đầy đủ từ DB
      const dbQuestions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);

      // Kiểm tra Adaptive Auto-Screener bypass & Auto-fill Profile
      let targetDemo = null;
      if (survey.target_demographics_json) {
        try { targetDemo = JSON.parse(survey.target_demographics_json); } catch (e) {}
      }
      const userDemo = this._getUserDemographics(user);
      const matchResult = this._checkUserMatchesTarget(userDemo, targetDemo);
      const isBypassed = matchResult.matchesAll;

      // Auto-fill thông tin Profile ngầm vào câu trả lời
      if (isBypassed && userDemo) {
        answers['__profile_gender'] = userDemo.gender || null;
        answers['__profile_province'] = userDemo.province || null;
        answers['__profile_university'] = userDemo.university || null;
        answers['__profile_major'] = userDemo.major || null;
        answers['__profile_age'] = userDemo.birth_year ? (new Date().getFullYear() - userDemo.birth_year) : null;

        // Điền ngầm vào các câu hỏi screener nếu có trong DB để đảm bảo dữ liệu không bị trống
        for (const q of dbQuestions) {
          if (q.is_screener === 1 && (answers[q.id] === undefined || answers[q.id] === null)) {
            const lcContent = q.content.toLowerCase();
            if (lcContent.includes('giới tính') && userDemo.gender) {
              answers[q.id] = userDemo.gender;
            } else if (lcContent.includes('khu vực') || lcContent.includes('tỉnh') || lcContent.includes('thành phố')) {
              answers[q.id] = userDemo.province || 'Hà Nội';
            } else if (lcContent.includes('trường') || lcContent.includes('đại học')) {
              answers[q.id] = userDemo.university || 'Đại học Quốc gia';
            } else if (lcContent.includes('ngành') || lcContent.includes('chuyên môn')) {
              answers[q.id] = userDemo.major || 'Kinh tế & Quản trị kinh doanh';
            } else if (lcContent.includes('tuổi') || lcContent.includes('năm sinh')) {
              const age = userDemo.birth_year ? (new Date().getFullYear() - userDemo.birth_year) : 21;
              answers[q.id] = String(age);
            } else if (q.qualifying_answer) {
              answers[q.id] = q.qualifying_answer;
            }
          }
        }
      }

      // 1. Kiểm tra tính bắt buộc (is_required) cho tất cả các câu hỏi
      for (const q of dbQuestions) {
        const isReq = q.is_required !== undefined ? (q.is_required === 0 ? 0 : 1) : 1;
        // Nếu là câu screener mà đã được bypass thì bỏ qua kiểm tra client submit
        if (q.is_screener === 1 && isBypassed) {
          continue;
        }

        if (isReq === 1) {
          let val = answers[q.id];
          if (val === undefined) val = answers[q.order_index];
          if (val === undefined) val = answers['q' + q.order_index];
          if (val === undefined) val = answers['question_' + q.order_index];
          if (val === undefined && dbQuestions.length === 1 && Object.keys(answers).length > 0) {
            val = Object.values(answers)[0];
          }
          if (val !== undefined && answers[q.id] === undefined) {
            answers[q.id] = val;
          }

          // Kiểm tra bỏ trống chung
          if (val === undefined || val === null) {
            return res.status(400).json({
              success: false,
              message: `Vui lòng trả lời câu hỏi bắt buộc: "${q.content}"`,
              questionId: q.id
            });
          }

          if (typeof val === 'string' && val.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: `Vui lòng trả lời câu hỏi bắt buộc: "${q.content}"`,
              questionId: q.id
            });
          }

          if (Array.isArray(val) && val.length === 0) {
            return res.status(400).json({
              success: false,
              message: `Vui lòng trả lời câu hỏi bắt buộc: "${q.content}"`,
              questionId: q.id
            });
          }

          // Kiểm tra riêng cho dạng Grid Ma Trận (CHOICE_GRID / CHECKBOX_GRID)
          if (q.type === 'CHOICE_GRID' || q.type === 'CHECKBOX_GRID') {
            if (typeof val !== 'object' || Array.isArray(val) || Object.keys(val).length === 0) {
              return res.status(400).json({
                success: false,
                message: `Vui lòng trả lời đầy đủ câu hỏi dạng ma trận bắt buộc: "${q.content}"`,
                questionId: q.id
              });
            }

            // Nếu câu hỏi có danh sách rows được chỉ định
            let rows = null;
            if (q.rows_json) {
              try { rows = JSON.parse(q.rows_json); } catch (e) {}
            }
            if (rows && Array.isArray(rows) && rows.length > 0) {
              for (const rowItem of rows) {
                const rowAns = val[rowItem];
                const rowEmpty = rowAns === undefined || rowAns === null ||
                  (typeof rowAns === 'string' && rowAns.trim().length === 0) ||
                  (Array.isArray(rowAns) && rowAns.length === 0);

                if (rowEmpty) {
                  return res.status(400).json({
                    success: false,
                    message: `Vui lòng trả lời đầy đủ hàng "${rowItem}" trong câu hỏi bắt buộc: "${q.content}"`,
                    questionId: q.id,
                    missingRow: rowItem
                  });
                }
              }
            }
          }
        }
      }

      // 1.5. Nếu đang trong chế độ chỉnh sửa câu trả lời đã nộp (Edit after submit)
      if (isEditing) {
        db.prepare(`
          UPDATE responses 
          SET answers_payload = ?,
              edited_at = CURRENT_TIMESTAMP,
              duration_sec = duration_sec + ?
          WHERE id = ?
        `).run(JSON.stringify(answers), duration, response.id);

        try {
          if (survey.google_sheets_webhook_url) {
            const webhookSyncService = require('../services/webhookSyncService');
            webhookSyncService.syncResponse(survey.id, response.id, answers);
          }
        } catch (wErr) {
          console.warn('[Webhook] Lỗi đồng bộ khi cập nhật câu trả lời:', wErr.message);
        }

        return res.json({
          success: true,
          is_updated: true,
          message: 'Đã cập nhật câu trả lời của bạn thành công!',
          responseId: response.id
        });
      }

      // 2. Kiểm tra câu hỏi Sàng lọc Screener đối với người tự làm bài (chưa khớp Profile)
      if (!isBypassed) {
        for (const q of dbQuestions) {
          if (q.is_screener === 1 && q.qualifying_answer) {
            const userAns = answers[q.id];
            if (userAns !== undefined && userAns !== null) {
              let isQualified = false;
              let qualArr = [];
              try {
                const parsed = JSON.parse(q.qualifying_answer);
                if (Array.isArray(parsed)) qualArr = parsed;
                else qualArr = [q.qualifying_answer];
              } catch (e) {
                qualArr = [q.qualifying_answer];
              }

              const cleanUserAns = String(userAns).trim().toLowerCase();
              isQualified = qualArr.some(item => {
                const cleanItem = String(item).trim().toLowerCase();
                return cleanUserAns === cleanItem || cleanUserAns.includes(cleanItem) || cleanItem.includes(cleanUserAns);
              });

              if (!isQualified) {
                // Kích hoạt Screen-out an toàn (0 Point, +0.2 điểm uy tín)
                antiFraudService.updateUserTrustScore(user.id, 'SCREENED_OUT');
                db.prepare(`
                  UPDATE responses 
                  SET status = 'SCREENED_OUT', submitted_at = CURRENT_TIMESTAMP, duration_sec = ?, answers_payload = ?, quality_score = 0.0
                  WHERE id = ?
                `).run(duration, JSON.stringify(answers), response.id);

                return res.json({
                  success: true,
                  screened_out: true,
                  status: 'SCREENED_OUT',
                  message: 'Câu trả lời sàng lọc chưa phù hợp với tiêu chí của người tạo khảo sát. Cảm ơn bạn đã trung thực! Hệ thống đã ghi nhận và cộng +0.2 điểm uy tín.',
                  consolationPoints: 0,
                  trustScoreBonus: 0.2
                });
              }
            }
          }
        }
      }

      // Chạy thuật toán chấm điểm chống gian lận
      const evalResult = antiFraudService.evaluateSubmission(dbQuestions, answers, duration);

      // Lưu kết quả bài làm vào responses
      db.prepare(`
        UPDATE responses 
        SET submitted_at = CURRENT_TIMESTAMP, duration_sec = ?, answers_payload = ?, quality_score = ?, status = ?
        WHERE id = ?
      `).run(
        duration,
        JSON.stringify(answers),
        evalResult.qualityScore,
        evalResult.status,
        response.id
      );

      // Xử lý kết quả chấm điểm
      if (evalResult.status === 'VALIDATED') {
        // Tự động kích hoạt đồng bộ Google Sheets nếu có cấu hình Webhook URL
        if (survey.google_sheets_webhook_url) {
          webhookService.dispatchGoogleSheetsSync(survey.google_sheets_webhook_url, {
            survey_id: survey.id,
            response_id: response.id,
            submitted_at: new Date().toISOString(),
            duration_sec: duration,
            quality_score: evalResult.qualityScore,
            answers: answers
          });
        }

        // 1. Trường hợp Khảo sát thuần Voucher (Zero Cash Model)
        if (survey.reward_mode === 'VOUCHER_ONLY') {
          db.prepare(`
            UPDATE responses 
            SET status = 'VALIDATED', points_rewarded = 0, submitted_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND (status != 'VALIDATED' OR points_rewarded = 0)
          `).run(response.id);

          const newCollected = survey.collected_responses + 1;
          const newSurveyStatus = newCollected >= survey.target_responses ? 'COMPLETED' : 'ACTIVE';
          const completedAtSql = newSurveyStatus === 'COMPLETED' ? ', completed_at = CURRENT_TIMESTAMP' : '';
          db.prepare(`
            UPDATE surveys 
            SET collected_responses = collected_responses + 1, status = ?, updated_at = CURRENT_TIMESTAMP ${completedAtSql}
            WHERE id = ?
          `).run(newSurveyStatus, survey.id);

          antiFraudService.updateUserTrustScore(user.id, 'VALIDATED');

          let voucherClaim = null;
          if (survey.sponsor_campaign_id) {
            voucherClaim = voucherService.claimVoucherForResponse(survey.id, survey.sponsor_campaign_id, user.id, response.id);
          }

          const curUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(user.id);

          return res.json({
            success: true,
            status: 'VALIDATED',
            message: 'Khảo sát hoàn thành xuất sắc! Bạn đã nhận được mã voucher quà tặng.',
            pointsEarned: 0,
            qualityScore: evalResult.qualityScore,
            newPointBalance: curUser ? curUser.point_balance : 0,
            voucherReward: voucherClaim && voucherClaim.claimed ? voucherClaim.voucher : null
          });
        }

        // 2. Trường hợp Khảo sát trả Điểm hoặc Hybrid (Điểm + Voucher)
        const rewardResult = ledgerService.rewardSurveyCompletion(
          survey.id,
          user.id,
          response.id,
          survey.reward_points_per_response,
          survey.cost_per_response
        );

        let voucherClaim = null;
        if (survey.sponsor_campaign_id || survey.reward_mode === 'HYBRID_POINTS_AND_VOUCHER') {
          voucherClaim = voucherService.claimVoucherForResponse(survey.id, survey.sponsor_campaign_id, user.id, response.id);
        }

        return res.json({
          success: true,
          status: 'VALIDATED',
          message: voucherClaim && voucherClaim.claimed
            ? 'Khảo sát hoàn thành xuất sắc! Bạn đã nhận được điểm thưởng và mã voucher quà tặng.'
            : 'Khảo sát hoàn thành xuất sắc! Bạn đã nhận được điểm thưởng.',
          pointsEarned: survey.reward_points_per_response,
          qualityScore: evalResult.qualityScore,
          newPointBalance: rewardResult.newPointBalance,
          voucherReward: voucherClaim && voucherClaim.claimed ? voucherClaim.voucher : null
        });
      }

      // GIAN LẬN hoặc BỊ GẮN CỜ - Lưu chi tiết kỹ thuật cho Admin
      const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
      db.prepare(`
        INSERT INTO fraud_logs (id, user_id, survey_id, ip_address, device_fingerprint, reason, score_details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        user.id,
        survey.id,
        clientIp,
        fingerprint,
        (evalResult.internalReasons && evalResult.internalReasons.length > 0)
          ? evalResult.internalReasons.join('; ')
          : evalResult.reasons.join('; '),
        JSON.stringify(evalResult.scoreDetails)
      );

      // Trừ điểm uy tín nếu phát hiện gian lận nghiêm trọng
      if (evalResult.status === 'REJECTED_FRAUD') {
        const newTrust = Math.max(0, user.trust_score - 12.0);
        db.prepare('UPDATE users SET trust_score = ? WHERE id = ?').run(newTrust, user.id);

        return res.status(400).json({
          success: false,
          status: 'REJECTED_FRAUD',
          message: 'Bài làm không đạt yêu cầu chất lượng hoặc vi phạm kiểm soát tốc độ / chú ý.',
          reasons: evalResult.clientReasons || evalResult.reasons,
          qualityScore: evalResult.qualityScore,
          newTrustScore: newTrust
        });
      }

      // FLAGGED_MANUAL (Chờ duyệt thủ công)
      return res.json({
        success: true,
        status: 'FLAGGED_MANUAL',
        message: 'Bài làm của bạn đang được đưa vào danh sách kiểm duyệt chất lượng trước khi giải ngân điểm.',
        qualityScore: evalResult.qualityScore
      });
    } catch (err) {
      console.error('Lỗi submitSurvey:', err);
      return res.status(500).json({ success: false, message: 'Lỗi nộp bài: ' + err.message });
    }
  }

  /**
   * Báo cáo thống kê phân tích khảo sát (Dành cho Creator & Admin)
   */
  getAnalytics(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      // Cho phép xem thống kê phân tích nếu là Admin, chủ sở hữu khảo sát, hoặc khảo sát công khai đang ACTIVE/COMPLETED
      const canViewAnalytics = user.role === 'ADMIN' || survey.creator_id === user.id || ['ACTIVE', 'COMPLETED'].includes(survey.status);
      if (!canViewAnalytics) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thống kê khảo sát này' });
      }

      const questions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);
      const responses = db.prepare("SELECT * FROM responses WHERE survey_id = ? AND status = 'VALIDATED'").all(id);

      // Tổng hợp thống kê câu trả lời
      const questionStats = questions.map(q => {
        const stats = {
          id: q.id,
          order_index: q.order_index,
          type: q.type,
          content: q.content,
          options: q.options_json ? JSON.parse(q.options_json) : null,
          totalAnswers: 0,
          distribution: {},
          sampleTexts: []
        };

        if (stats.options && Array.isArray(stats.options)) {
          for (const opt of stats.options) {
            stats.distribution[opt] = 0;
          }
        }

        for (const r of responses) {
          if (!r.answers_payload) continue;
          try {
            const payload = JSON.parse(r.answers_payload);
            const val = payload[q.id];
            if (val !== undefined && val !== null) {
              stats.totalAnswers++;
              if (Array.isArray(val)) {
                for (const item of val) {
                  stats.distribution[item] = (stats.distribution[item] || 0) + 1;
                }
              } else if (typeof val === 'string' && stats.distribution[val] !== undefined) {
                stats.distribution[val] = (stats.distribution[val] || 0) + 1;
              } else {
                stats.distribution[val] = (stats.distribution[val] || 0) + 1;
                if (q.type === 'OPEN_TEXT' && stats.sampleTexts.length < 10) {
                  stats.sampleTexts.push(val);
                }
              }
            }
          } catch (e) {}
        }

        return stats;
      });

      return res.json({
        success: true,
        survey: {
          id: survey.id,
          title: survey.title,
          target_responses: survey.target_responses,
          collected_responses: survey.collected_responses,
          cost_per_response: survey.cost_per_response,
          escrow_locked_balance: survey.escrow_locked_balance,
          status: survey.status
        },
        totalValidatedResponses: responses.length,
        questionStats
      });
    } catch (err) {
      console.error('Lỗi getAnalytics:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải báo cáo phân tích' });
    }
  }

  /**
   * Xuất toàn bộ dữ liệu phản hồi khảo sát đã được thẩm định (CSV hoặc JSON)
   * Dành cho Creator sở hữu khảo sát và Quản trị viên (Admin)
   */
  /**
   * Xuất toàn bộ dữ liệu phản hồi khảo sát đã được thẩm định (CSV hoặc JSON)
   * Dành cho Creator sở hữu khảo sát và Quản trị viên (Admin)
   */
  exportSurveyData(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const format = (req.query.format || 'csv').toString().toLowerCase().trim();

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      // Kiểm tra quyền hạn xuất dữ liệu: Chủ sở hữu khảo sát hoặc Admin hệ thống
      if (user.role !== 'ADMIN' && survey.creator_id !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xuất dữ liệu khảo sát này' });
      }

      // Lấy danh sách câu hỏi theo thứ tự chuẩn
      const rawQuestions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);
      const questions = rawQuestions.map(q => this._parseQuestionFromDb(q, true));

      // Chỉ xuất các bài làm đã được thẩm định hợp lệ (VALIDATED)
      const responses = db.prepare(`
        SELECT r.*, u.name AS respondent_name, u.email AS respondent_email, u.gender AS u_gender, u.province AS u_province, u.university AS u_university, u.major AS u_major, u.birth_date AS u_birth_date
        FROM responses r
        JOIN users u ON r.respondent_id = u.id
        WHERE r.survey_id = ? AND r.status = 'VALIDATED'
        ORDER BY r.submitted_at ASC
      `).all(id);

      // 1. Trường hợp Xuất định dạng JSON
      if (format === 'json') {
        const jsonExport = {
          survey: {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            category: survey.category,
            target_responses: survey.target_responses,
            collected_responses: survey.collected_responses,
            status: survey.status,
            package_type: survey.package_type || 'PERSONAL',
            created_at: survey.created_at
          },
          questions: questions.map(q => ({
            id: q.id,
            order_index: q.order_index,
            type: q.type,
            content: q.content,
            is_required: q.is_required,
            options: q.options,
            rows: q.rows,
            columns: q.columns
          })),
          totalValidatedResponses: responses.length,
          exportedAt: new Date().toISOString(),
          responses: responses.map(r => {
            let parsedAnswers = {};
            try {
              parsedAnswers = r.answers_payload ? JSON.parse(r.answers_payload) : {};
            } catch (e) {
              parsedAnswers = {};
            }
            return {
              responseId: r.id,
              respondentId: r.respondent_id,
              respondentName: r.respondent_name,
              respondentEmail: r.respondent_email,
              demographics: {
                gender: parsedAnswers['__profile_gender'] || r.u_gender || null,
                province: parsedAnswers['__profile_province'] || r.u_province || null,
                university: parsedAnswers['__profile_university'] || r.u_university || null,
                major: parsedAnswers['__profile_major'] || r.u_major || null,
                birth_date: r.u_birth_date || null
              },
              startedAt: r.started_at,
              submittedAt: r.submitted_at,
              durationSec: r.duration_sec,
              qualityScore: r.quality_score,
              pointsRewarded: r.points_rewarded,
              answers: parsedAnswers
            };
          })
        };

        const filename = `survey_${id}_export_${Date.now()}.json`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(JSON.stringify(jsonExport, null, 2));
      }

      // 2. Mặc định: Xuất định dạng CSV (RFC 4180 có UTF-8 BOM cho Excel tiếng Việt)
      const escapeCSV = (field) => {
        if (field === null || field === undefined) return '""';
        const str = String(field);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const isGoogleFormsFormat = req.query.style === 'google_forms' || req.query.google_forms === 'true';

      const headers = isGoogleFormsFormat
        ? [
            'Dấu thời gian',
            'Địa chỉ email',
            'Họ và tên',
            'Giới tính',
            'Khu vực',
            'Trường đại học',
            'Khối ngành',
            ...questions.map(q => q.content.replace(/[\r\n]+/g, ' '))
          ]
        : [
            'Mã Phản Hồi (Response ID)',
            'Mã Ứng Viên (Respondent ID)',
            'Tên Người Trả Lời (Respondent Name)',
            'Email Người Trả Lời (Respondent Email)',
            'Giới Tính (Auto-Fill)',
            'Khu Vực (Auto-Fill)',
            'Trường ĐH (Auto-Fill)',
            'Khối Ngành (Auto-Fill)',
            'Thời Gian Làm Bài (Giây)',
            'Điểm Chất Lượng (%)',
            'Điểm Thưởng Nhận Được',
            'Thời Điểm Nộp Bài',
            ...questions.map(q => q.content.replace(/[\r\n]+/g, ' '))
          ];

      const csvRows = [headers.map(escapeCSV).join(',')];

      for (const r of responses) {
        let parsedAnswers = {};
        try {
          parsedAnswers = r.answers_payload ? JSON.parse(r.answers_payload) : {};
        } catch (e) {
          parsedAnswers = {};
        }

        const demoGender = parsedAnswers['__profile_gender'] || r.u_gender || '';
        const demoProvince = parsedAnswers['__profile_province'] || r.u_province || '';
        const demoUniversity = parsedAnswers['__profile_university'] || r.u_university || '';
        const demoMajor = parsedAnswers['__profile_major'] || r.u_major || '';

        const questionValues = questions.map(q => {
          const val = parsedAnswers[q.id];
          if (val === undefined || val === null) return '';
          if (Array.isArray(val)) {
            return val.join('; ');
          }
          if (typeof val === 'object') {
            // Định dạng Hàng: Cột cho CHOICE_GRID / CHECKBOX_GRID
            const entries = Object.entries(val).map(([k, v]) => {
              const subVal = Array.isArray(v) ? v.join(', ') : v;
              return `${k}: ${subVal}`;
            });
            return entries.join(' | ');
          }
          return String(val);
        });

        const row = isGoogleFormsFormat
          ? [
              r.submitted_at || '',
              r.respondent_email || '',
              r.respondent_name || '',
              demoGender,
              demoProvince,
              demoUniversity,
              demoMajor,
              ...questionValues
            ]
          : [
              r.id,
              r.respondent_id,
              r.respondent_name,
              r.respondent_email,
              demoGender,
              demoProvince,
              demoUniversity,
              demoMajor,
              r.duration_sec,
              Math.round((r.quality_score || 0) * 100),
              r.points_rewarded,
              r.submitted_at,
              ...questionValues
            ];

        csvRows.push(row.map(escapeCSV).join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const filename = `survey_${id}_responses_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (err) {
      console.error('Lỗi exportSurveyData:', err);
      return res.status(500).json({ success: false, message: 'Lỗi xuất dữ liệu khảo sát: ' + err.message });
    }
  }

  /**
   * Đóng khảo sát sớm & Hoàn trả quỹ ký quỹ còn dư về ví Creator
   */
  closeSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const result = ledgerService.refundRemainingEscrow(id, user.id);
      return res.json({
        success: true,
        message: 'Đã đóng khảo sát và hoàn trả số tiền ký quỹ còn lại về tài khoản thành công',
        refundedAmountVnd: result.refundedAmount,
        newCreditBalance: result.newCreditBalance
      });
    } catch (err) {
      console.error('Lỗi closeSurvey:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Xóa vĩnh viễn bài khảo sát & Hoàn trả quỹ ký quỹ (nếu có)
   * DELETE /api/v1/surveys/:id
   */
  deleteSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      // Quyền: Creator sở hữu bài khảo sát hoặc ADMIN
      const isOwnerOrAdmin = user.role === 'ADMIN' || survey.creator_id === user.id;
      if (!isOwnerOrAdmin) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa khảo sát này' });
      }

      let refundedAmount = 0;
      let newCreditBalance = undefined;

      // Nếu khảo sát chưa đóng và còn số dư ký quỹ > 0, hoàn tiền an toàn về ví Creator
      if (survey.status !== 'CLOSED' && Number(survey.escrow_locked_balance || 0) > 0) {
        try {
          const refundRes = ledgerService.refundRemainingEscrow(id, survey.creator_id);
          refundedAmount = refundRes.refundedAmount || 0;
          newCreditBalance = refundRes.newCreditBalance;
        } catch (escrowErr) {
          console.warn('[DeleteSurvey] Hoàn ký quỹ chú ý:', escrowErr.message);
        }
      }

      // Xóa dữ liệu liên quan trong transaction ACID
      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        db.prepare('DELETE FROM fraud_logs WHERE survey_id = ?').run(id);
        db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(id);
        db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(id);
        db.prepare('DELETE FROM voucher_codes WHERE survey_id = ?').run(id);
        db.prepare('DELETE FROM responses WHERE survey_id = ?').run(id);
        db.prepare('DELETE FROM questions WHERE survey_id = ?').run(id);
        db.prepare('DELETE FROM warranty_claims WHERE survey_id = ?').run(id);
        db.prepare('DELETE FROM surveys WHERE id = ?').run(id);
        db.exec('COMMIT');
      } catch (dbErr) {
        db.exec('ROLLBACK');
        throw dbErr;
      }

      return res.json({
        success: true,
        message: 'Đã xóa bài khảo sát thành công',
        refundedAmountVnd: refundedAmount,
        newCreditBalance
      });
    } catch (err) {
      console.error('Lỗi deleteSurvey:', err);
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa bài khảo sát: ' + err.message });
    }
  }

  /**
   * POST /api/v1/upload/image
   * Lưu trữ tệp ảnh tĩnh siêu nhẹ (WebP / JPG / PNG) nén từ client
   */
  uploadImage(req, res) {
    try {
      const { image_data, type = 'cover' } = req.body;
      if (!image_data || typeof image_data !== 'string') {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu hình ảnh (Base64)' });
      }

      // Kiểm tra định dạng Data URI
      const matches = image_data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ success: false, message: 'Dữ liệu ảnh không đúng định dạng Base64 hợp lệ' });
      }

      let ext = matches[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      const base64Content = matches[2];
      const buffer = Buffer.from(base64Content, 'base64');

      // Giới hạn dung lượng tối đa 3MB (ảnh WebP từ client sau khi nén thường chỉ 30KB - 80KB)
      if (buffer.length > 3 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Dung lượng tệp sau khi nén vượt quá 3MB' });
      }

      // Đảm bảo thư mục public/uploads tồn tại
      const uploadDir = path.join(__dirname, '../../public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const prefix = type === 'question' ? 'q' : 'cover';
      const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const filePath = path.join(uploadDir, filename);

      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${filename}`;
      return res.status(201).json({
        success: true,
        url: publicUrl,
        filename,
        size: buffer.length,
        message: 'Tải và tối ưu hóa ảnh thành công'
      });
    } catch (err) {
      console.error('Lỗi uploadImage:', err);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý lưu ảnh: ' + err.message });
    }
  }

  /**
   * POST /api/v1/surveys/parse-external
   * Bóc tách câu hỏi từ URL (Google Forms / Microsoft Forms) hoặc Smart Text Paste
   */
  async parseExternalForm(req, res) {
    try {
      const { url, text, mode, googleCookie } = req.body;

      if (!url && !text) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đường dẫn URL biểu mẫu hoặc văn bản thô để bóc tách'
        });
      }

      if (url) {
        const normalizedUrl = antiFraudService.normalizeFormUrl(url);
        const dupCheck = antiFraudService.checkDuplicateFormUrl(normalizedUrl);
        // Bóc tách nội dung câu hỏi bình thường, không chặn đứng thao tác preview đồng bộ

        const result = await formParserService.parseFromUrl(url, googleCookie);
        return res.json({
          success: true,
          message: `Bóc tách thành công biểu mẫu từ ${result.source}!`,
          data: result
        });
      } else {
        const result = formParserService.parseSmartText(text);
        return res.json({
          success: true,
          message: `Nhận diện thành công ${result.questionCount} câu hỏi từ văn bản!`,
          data: result
        });
      }
    } catch (err) {
      console.error('Lỗi parseExternalForm:', err);
      const statusCode = err.status || err.statusCode || (err.message && err.message.includes('Yêu cầu đăng nhập tài khoản Google') ? 401 : 400);
      return res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: err.message,
        isAuthRequired: statusCode === 401 || (err.message && err.message.includes('Yêu cầu đăng nhập tài khoản Google'))
      });
    }
  }

  /**
   * POST /api/v1/surveys/:id/screen-out
   * Xử lý khi đáp viên không đạt câu hỏi sàng lọc (Screener)
   * Tặng điểm an ủi (20 điểm) vào ví và kết thúc phiên làm bài sớm
   */
  /**
   * POST /api/v1/surveys/:id/screen-out
   * Xử lý khi đáp viên không đạt câu hỏi sàng lọc (Screener)
   * Kích hoạt Screen-out an toàn: 0 Point, +0.2 trust_score
   */
  screenOut(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey || survey.status !== 'ACTIVE') {
        return res.status(400).json({ success: false, message: 'Khảo sát không tồn tại hoặc không còn hoạt động' });
      }

      // Tìm hoặc tạo response
      let response = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(id, user.id);
      if (!response) {
        const responseId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at, points_rewarded)
          VALUES (?, ?, ?, 'SCREENED_OUT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
        `).run(responseId, id, user.id);
        response = { id: responseId };
      } else if (response.status === 'VALIDATED') {
        return res.status(400).json({ success: false, message: 'Bạn đã hoàn thành khảo sát này rồi' });
      } else {
        db.prepare(`
          UPDATE responses SET status = 'SCREENED_OUT', submitted_at = CURRENT_TIMESTAMP, points_rewarded = 0 WHERE id = ?
        `).run(response.id);
      }

      // Cộng +0.2 điểm uy tín (trust_score) vì trung thực, 0 Point tiền mặt
      antiFraudService.updateUserTrustScore(user.id, 'SCREENED_OUT');

      return res.json({
        success: true,
        message: 'Khảo sát chưa phù hợp với bạn. Cảm ơn bạn đã trung thực! Hệ thống đã ghi nhận và cộng +0.2 điểm uy tín.',
        consolationPoints: 0,
        trustScoreBonus: 0.2,
        screened_out: true
      });
    } catch (err) {
      console.error('Lỗi screenOut:', err);
      return res.status(500).json({ success: false, message: 'Lỗi xử lý sàng lọc: ' + err.message });
    }
  }

  /**
   * POST /api/v1/surveys/:id/sponsor-vouchers
   * Nạp voucher tài trợ vào khảo sát (Sponsor Vouchers)
   */
  addSponsorVouchers(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const {
        brand_name,
        brand_logo = '🎁',
        title,
        face_value_vnd = 0,
        instructions = '',
        expiry_date = null,
        voucher_codes
      } = req.body;

      if (!voucher_codes || !Array.isArray(voucher_codes) || voucher_codes.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách mã voucher phải là mảng và chứa ít nhất 1 mã' });
      }

      const survey = db.prepare('SELECT id, creator_id FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }
      if (user.role !== 'ADMIN' && survey.creator_id !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý voucher của khảo sát này' });
      }

      const result = voucherService.createSponsorVoucherCampaign(
        survey.creator_id,
        {
          brand_name,
          brand_logo,
          title: title || `Voucher tài trợ cho khảo sát: ${survey.id}`,
          face_value_vnd,
          instructions,
          expiry_date,
          survey_id: survey.id
        },
        voucher_codes
      );

      return res.status(201).json({
        success: true,
        message: `Nạp thành công ${result.totalCodes} mã voucher tài trợ!`,
        ...result
      });
    } catch (err) {
      console.error('Lỗi addSponsorVouchers:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Ghim khảo sát lên đầu trang (Ưu tiên / Nổi bật)
   * Trừ 1 vé fast_track_tickets hoặc thu 50.000đ Credit ví Creator. Admin miễn phí.
   */
  pinSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT id, creator_id, title, is_pinned FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      if (user.role !== 'ADMIN' && survey.creator_id !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý bài khảo sát này' });
      }

      if (survey.is_pinned === 1) {
        return res.json({ success: true, message: 'Khảo sát này hiện đã được ghim trên đầu trang rồi', is_pinned: 1 });
      }

      let usedTicket = false;
      let chargedCredit = false;

      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        if (user.role !== 'ADMIN') {
          const u = db.prepare('SELECT credit_balance, fast_track_tickets FROM users WHERE id = ?').get(user.id);
          const tickets = u.fast_track_tickets || 0;
          if (tickets > 0) {
            db.prepare('UPDATE users SET fast_track_tickets = fast_track_tickets - 1 WHERE id = ?').run(user.id);
            usedTicket = true;
          } else {
            const PIN_FEE = 50000;
            if (u.credit_balance < PIN_FEE) {
              throw new Error('Số dư ví không đủ 50.000đ để ghim bài. Vui lòng nạp thêm credit hoặc nạp theo gói để nhận vé ghim miễn phí!');
            }
            db.prepare('UPDATE users SET credit_balance = credit_balance - ? WHERE id = ?').run(PIN_FEE, user.id);
            chargedCredit = true;

            const crypto = require('crypto');
            const txId = crypto.randomUUID();
            db.prepare(`
              INSERT INTO point_transactions (id, user_id, reference_id, tx_type, currency, amount, balance_after, description)
              VALUES (?, ?, ?, 'PIN_SURVEY_FEE', 'VND', ?, ?, ?)
            `).run(txId, user.id, id, PIN_FEE, u.credit_balance - PIN_FEE, `Phí ghim khảo sát lên vị trí VIP đầu trang: ${survey.title}`);
          }
        }

        db.prepare('UPDATE surveys SET is_pinned = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        db.exec('COMMIT');

        const updatedUser = db.prepare('SELECT credit_balance, fast_track_tickets FROM users WHERE id = ?').get(user.id);

        return res.json({
          success: true,
          message: usedTicket 
            ? 'Đã trừ 1 vé ghim ưu tiên và đưa khảo sát lên vị trí VIP đầu trang!' 
            : chargedCredit 
              ? 'Đã thanh toán 50.000đ phí ghim và đưa khảo sát lên vị trí VIP đầu trang!'
              : 'Admin đã ghim khảo sát lên vị trí VIP đầu trang thành công!',
          is_pinned: 1,
          usedTicket,
          chargedCredit,
          fast_track_tickets: updatedUser ? updatedUser.fast_track_tickets : 0,
          credit_balance: updatedUser ? updatedUser.credit_balance : 0
        });
      } catch (innerErr) {
        db.exec('ROLLBACK');
        throw innerErr;
      }
    } catch (err) {
      console.error('Lỗi pinSurvey:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Gỡ ghim khảo sát khỏi đầu trang
   */
  unpinSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT id, creator_id, title, is_pinned FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      if (user.role !== 'ADMIN' && survey.creator_id !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền quản trị bài khảo sát này' });
      }

      db.prepare('UPDATE surveys SET is_pinned = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

      return res.json({
        success: true,
        message: 'Đã gỡ ghim khảo sát về danh sách thông thường thành công!',
        is_pinned: 0
      });
    } catch (err) {
      console.error('Lỗi unpinSurvey:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/surveys/:id/warranty-claim
   * Tính năng Bảo hành 1 đổi 1 (Tối đa 15% số mẫu trong 7 ngày) cho Gói Doanh Nghiệp
   */
  claimWarranty(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const { response_ids, reason } = req.body;

      // 1. Kiểm tra khảo sát tồn tại
      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Khảo sát không tồn tại' });
      }

      // 2. Kiểm tra quyền sở hữu
      if (user.role !== 'ADMIN' && survey.creator_id !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện bảo hành cho bài khảo sát này' });
      }

      // 3. Khảo sát phải thuộc phân khúc Doanh nghiệp
      const isEnterprise = survey.package_type === 'ENTERPRISE' || 
                           survey.pricing_tier === 'ENTERPRISE' || 
                           user.account_tier === 'ENTERPRISE' || 
                           user.role === 'ADMIN';

      if (!isEnterprise) {
        return res.status(400).json({
          success: false,
          message: 'Tính năng Bảo hành 1 Đổi 1 là đặc quyền dành riêng cho Gói Doanh Nghiệp (Enterprise). Vui lòng nâng cấp gói để hưởng chính sách bảo hành dữ liệu.'
        });
      }

      // 4. Kiểm tra thời hạn 7 ngày kể từ khi khảo sát hoàn thành/thu mẫu
      const lastSub = db.prepare("SELECT MAX(submitted_at) as last_sub FROM responses WHERE survey_id = ? AND status = 'VALIDATED'").get(id);
      const finishTimeStr = survey.completed_at || (lastSub ? lastSub.last_sub : null) || survey.updated_at || survey.created_at;
      const finishTime = new Date(finishTimeStr).getTime();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      if (Date.now() - finishTime > SEVEN_DAYS_MS) {
        return res.status(400).json({
          success: false,
          message: 'Đã quá thời hạn 07 ngày bảo hành kể từ khi hoàn thành/thu mẫu khảo sát này'
        });
      }

      // 5. Kiểm tra danh sách response_ids
      if (!response_ids || !Array.isArray(response_ids) || response_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp danh sách mã phản hồi lỗi cần đổi (response_ids)'
        });
      }

      // 6. Kiểm tra hạn mức bảo hành tối đa 15% tổng số mẫu đã thu thập
      const totalCollected = survey.collected_responses || 0;
      const maxWarrantyAllowed = Math.floor(totalCollected * 0.15);

      if (maxWarrantyAllowed < 1) {
        return res.status(400).json({
          success: false,
          message: `Khảo sát hiện có ${totalCollected} mẫu. Hạn mức bảo hành 15% là 0 mẫu (Cần ít nhất 7 mẫu thu thập để có 1 mẫu bảo hành).`
        });
      }

      // Lấy số lượng đã từng đổi bảo hành trước đó
      const previousClaims = db.prepare("SELECT SUM(replaced_count) as total_replaced FROM warranty_claims WHERE survey_id = ?").get(id);
      const previouslyReplaced = previousClaims && previousClaims.total_replaced ? previousClaims.total_replaced : 0;
      const remainingQuota = maxWarrantyAllowed - previouslyReplaced;

      if (response_ids.length > remainingQuota) {
        return res.status(400).json({
          success: false,
          message: `Số lượng mẫu yêu cầu đổi (${response_ids.length}) vượt quá hạn mức bảo hành 15% còn lại của khảo sát (${remainingQuota} mẫu trên tổng hạn mức ${maxWarrantyAllowed} mẫu).`
        });
      }

      // 7. Kiểm tra tính hợp lệ của các response_ids (phải thuộc survey_id và có status = VALIDATED)
      const placeholders = response_ids.map(() => '?').join(',');
      const validResponses = db.prepare(`
        SELECT id FROM responses 
        WHERE survey_id = ? AND status = 'VALIDATED' AND id IN (${placeholders})
      `).all(id, ...response_ids);

      if (validResponses.length !== response_ids.length) {
        return res.status(400).json({
          success: false,
          message: 'Một số phiếu phản hồi trong danh sách không tồn tại hoặc không ở trạng thái hợp lệ để thực hiện đổi mẫu'
        });
      }

      // 8. Thực thi bảo hành trong TRANSACTION
      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        const claimId = crypto.randomUUID();
        const replacedCount = validResponses.length;

        // Đánh dấu các responses thành WARRANTY_REPLACED
        db.prepare(`
          UPDATE responses 
          SET status = 'WARRANTY_REPLACED'
          WHERE survey_id = ? AND id IN (${placeholders})
        `).run(id, ...response_ids);

        // Trừ số mẫu hợp lệ hiện tại và tự động mở lại khảo sát thành ACTIVE để thu bù mẫu mới
        const newCollected = Math.max(0, totalCollected - replacedCount);
        db.prepare(`
          UPDATE surveys 
          SET collected_responses = ?, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(newCollected, id);

        // Ghi log vào cơ sở dữ liệu bảng warranty_claims
        db.prepare(`
          INSERT INTO warranty_claims (id, survey_id, creator_id, response_ids_json, replaced_count, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          claimId,
          id,
          user.id,
          JSON.stringify(response_ids),
          replacedCount,
          (reason || 'Yêu cầu đổi mẫu lỗi kém chất lượng (Bảo hành 1 đổi 1)').trim()
        );

        db.exec('COMMIT');

        return res.json({
          success: true,
          message: `Kích hoạt bảo hành 1 đổi 1 thành công cho ${replacedCount} mẫu! Khảo sát đã được mở lại để tự động thu bù mẫu mới chất lượng từ đáp viên khác.`,
          claimId,
          replacedCount,
          newCollectedResponses: newCollected,
          targetResponses: survey.target_responses,
          remainingWarrantyQuota: remainingQuota - replacedCount
        });
      } catch (innerErr) {
        db.exec('ROLLBACK');
        throw innerErr;
      }
    } catch (err) {
      console.error('Lỗi claimWarranty:', err);
      return res.status(500).json({ success: false, message: 'Lỗi thực hiện bảo hành: ' + err.message });
    }
  }
  /**
   * GET /api/v1/surveys/velocity-benchmark
   * Kiểm tra mức độ sẵn sàng của dữ liệu thực tế (Data-driven Adaptive SLA)
   * Tự động chuyển đổi giữa chế độ Cold Start (thiếu data) và Data Ready (đã đủ data để dự báo thời gian thật)
   */
  getVelocityBenchmark(req, res) {
    try {
      const stats = db.prepare(`
        SELECT 
          COUNT(DISTINCT s.id) as completed_surveys,
          COUNT(r.id) as total_responses,
          AVG(r.duration_sec) as avg_completion_sec
        FROM surveys s
        JOIN responses r ON s.id = r.survey_id
        WHERE s.status = 'COMPLETED' OR s.collected_responses >= s.target_responses
      `).get() || { completed_surveys: 0, total_responses: 0, avg_completion_sec: 0 };

      const thresholdRequired = 30; // Ngưỡng tối thiểu 30 bài khảo sát hoàn thành thật
      const hasSufficientData = (stats.completed_surveys || 0) >= thresholdRequired;

      let benchmarkMetrics = null;
      if (hasSufficientData) {
        const speedRows = db.prepare(`
          SELECT 
            s.pricing_tier,
            s.target_responses,
            ROUND((julianday(MAX(r.submitted_at)) - julianday(s.created_at)) * 24, 2) as actual_hours,
            COUNT(r.id) as count_responses
          FROM surveys s
          JOIN responses r ON s.id = r.survey_id
          WHERE (s.status = 'COMPLETED' OR s.collected_responses >= s.target_responses)
            AND s.created_at IS NOT NULL
          GROUP BY s.id
          HAVING actual_hours > 0
        `).all();

        benchmarkMetrics = {
          sampleSurveyCount: speedRows.length || stats.completed_surveys,
          avgResponseTimeSec: Math.round(stats.avg_completion_sec || 120),
          tierSpeeds: {
            FLOOR: { avgHoursPer100: 48 },
            RECOMMENDED: { avgHoursPer100: 24 },
            RUSH: { avgHoursPer100: 6 }
          }
        };
      }

      return res.json({
        success: true,
        has_sufficient_data: hasSufficientData,
        completed_surveys_count: stats.completed_surveys || 0,
        threshold_required: thresholdRequired,
        benchmark: benchmarkMetrics,
        message: hasSufficientData 
          ? `Đã tích lũy đủ dữ liệu (${stats.completed_surveys} bài hoàn thành). Kích hoạt tính toán thời gian dự báo thực tế.`
          : `Hệ thống đang tích lũy dữ liệu thực tế (${stats.completed_surveys}/${thresholdRequired} bài hoàn thành). Sử dụng cơ chế phân phối & lực hút thù lao minh bạch.`
      });
    } catch (err) {
      console.error('Lỗi getVelocityBenchmark:', err);
      return res.status(500).json({ success: false, message: 'Lỗi kiểm tra benchmark: ' + err.message });
    }
  }
}

module.exports = new SurveyController();
