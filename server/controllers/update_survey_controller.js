const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'surveyController.js');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Thêm các helper methods vào SurveyController nếu chưa có
const helperMethods = `
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

    // 2. Khu vực Tỉnh / Thành phố
    if (targetDemo.provinces && Array.isArray(targetDemo.provinces) && targetDemo.provinces.length > 0 && !targetDemo.provinces.includes('ALL')) {
      const uProv = (userDemo.province || userDemo.province_code || '').trim().toLowerCase();
      if (!uProv) return { matchesAll: false, failedCriterion: 'province' };
      const matchedProv = targetDemo.provinces.some(p => {
        const lp = String(p).trim().toLowerCase();
        return uProv === lp || uProv.includes(lp) || lp.includes(uProv);
      });
      if (!matchedProv) return { matchesAll: false, failedCriterion: 'province' };
    }

    // 3. Trường đại học
    if (targetDemo.universities && Array.isArray(targetDemo.universities) && targetDemo.universities.length > 0 && !targetDemo.universities.includes('ALL')) {
      const uUni = (userDemo.university || userDemo.university_code || '').trim().toLowerCase();
      if (!uUni) return { matchesAll: false, failedCriterion: 'university' };
      const matchedUni = targetDemo.universities.some(u => {
        const lu = String(u).trim().toLowerCase();
        return uUni === lu || uUni.includes(lu) || lu.includes(uUni);
      });
      if (!matchedUni) return { matchesAll: false, failedCriterion: 'university' };
    }

    // 4. Ngành học
    if (targetDemo.majors && Array.isArray(targetDemo.majors) && targetDemo.majors.length > 0 && !targetDemo.majors.includes('ALL')) {
      const uMajor = (userDemo.major || userDemo.major_category || '').trim().toLowerCase();
      if (!uMajor) return { matchesAll: false, failedCriterion: 'major' };
      const matchedMajor = targetDemo.majors.some(m => {
        const lm = String(m).trim().toLowerCase();
        return uMajor === lm || uMajor.includes(lm) || lm.includes(uMajor);
      });
      if (!matchedMajor) return { matchesAll: false, failedCriterion: 'major' };
    }

    // 5. Độ tuổi
    if (targetDemo.age_min || targetDemo.age_max) {
      const currentYear = new Date().getFullYear();
      const birthYear = userDemo.birth_year || (userDemo.birth_date ? parseInt(userDemo.birth_date.split('-')[0], 10) : null);
      if (!birthYear) return { matchesAll: false, failedCriterion: 'age' };
      const age = currentYear - birthYear;
      if (targetDemo.age_min && age < targetDemo.age_min) return { matchesAll: false, failedCriterion: 'age' };
      if (targetDemo.age_max && age > targetDemo.age_max) return { matchesAll: false, failedCriterion: 'age' };
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
`;

if (!code.includes('_parseQuestionFromDb')) {
  code = code.replace('class SurveyController {', 'class SurveyController {\n' + helperMethods);
}

// 2. Cập nhật getSurvey
const newGetSurvey = `  /**
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
        sponsor = db.prepare(\`
          SELECT id, brand_name, brand_logo, title, face_value_vnd, instructions, expiry_date, remaining_quantity
          FROM voucher_campaigns WHERE id = ?
        \`).get(survey.sponsor_campaign_id);
      }

      const isOwnerOrAdmin = user && (user.role === 'ADMIN' || survey.creator_id === user.id);

      if (!isOwnerOrAdmin) {
        const screenerResult = this._applyAdaptiveScreener(survey, dbQuestions, user, false);

        let existingResponse = null;
        let userVoucher = null;
        if (user) {
          existingResponse = db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(id, user.id);
          if (existingResponse) {
            userVoucher = db.prepare(\`
              SELECT vc.id, vc.code, vc.claimed_at, c.brand_name, c.brand_logo, c.title, c.instructions, c.expiry_date
              FROM voucher_codes vc
              JOIN voucher_campaigns c ON vc.campaign_id = c.id
              WHERE vc.claimed_response_id = ?
            \`).get(existingResponse.id);
          }
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
            auto_screener_bypassed: screenerResult.autoScreenerBypassed,
            auto_filled_demographics: screenerResult.autoFilledDemographics,
            questions: screenerResult.questions
          },
          questions: screenerResult.questions,
          auto_screener_bypassed: screenerResult.autoScreenerBypassed,
          auto_filled_demographics: screenerResult.autoFilledDemographics,
          userResponse: existingResponse || null,
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
  }`;

// 3. Cập nhật createSurvey
const newCreateSurvey = `  /**
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
        pricing_tier = 'STANDARD'
      } = req.body;

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
          return res.status(400).json({ success: false, message: \`Câu hỏi số \${i + 1} không hợp lệ\` });
        }
        if (!allowedTypes.includes(q.type)) {
          return res.status(400).json({ success: false, message: \`Loại câu hỏi \${q.type} không được hỗ trợ (câu \${i + 1})\` });
        }
        if (!q.content || typeof q.content !== 'string' || q.content.trim().length === 0 || q.content.trim().length > 1000) {
          return res.status(400).json({ success: false, message: \`Nội dung câu hỏi \${i + 1} phải từ 1 đến 1000 ký tự\` });
        }
        if (q.is_attention_check && (!q.expected_answer || String(q.expected_answer).trim().length === 0)) {
          return res.status(400).json({ success: false, message: \`Câu hỏi kiểm tra chú ý (câu \${i + 1}) bắt buộc phải có đáp án kỳ vọng\` });
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
        db.prepare(\`
          INSERT INTO surveys (
            id, creator_id, title, description, category, target_responses, collected_responses, 
            cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec, 
            status, survey_source, external_form_url, normalized_form_url, google_sheets_webhook_url, sponsor_campaign_id, reward_mode,
            academic_tags_json, target_demographics_json, package_type, pricing_tier
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0.0, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \`).run(
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
          pricing_tier
        );

        const insertQ = db.prepare(\`
          INSERT INTO questions (
            id, survey_id, order_index, type, content, 
            options_json, rows_json, columns_json, is_required, 
            is_attention_check, expected_answer, is_screener, qualifying_answer
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        \`);

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
  }`;

// 4. Cập nhật startSession
const newStartSession = `  /**
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
          return res.status(400).json({ success: false, message: 'Bạn đã hoàn thành khảo sát này và nhận thưởng rồi' });
        }
        if (existing.status === 'REJECTED_FRAUD') {
          return res.status(403).json({ success: false, message: 'Bạn đã bị từ chối bài làm này do vi phạm tiêu chuẩn chất lượng' });
        }
      }

      // Tạo hoặc cập nhật response IN_PROGRESS an toàn tranh chấp
      let responseId = existing ? existing.id : crypto.randomUUID();
      if (!existing) {
        db.prepare(\`
          INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
          VALUES (?, ?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)
        \`).run(responseId, id, user.id);
      } else {
        db.prepare(\`
          UPDATE responses SET started_at = CURRENT_TIMESTAMP WHERE id = ?
        \`).run(responseId);
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
  }`;

// 5. Cập nhật submitSurvey
const newSubmitSurvey = `  /**
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
      if (response.status === 'VALIDATED') {
        return res.status(400).json({ success: false, message: 'Bài làm này đã được chấm điểm và trả thưởng trước đó' });
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
          const val = answers[q.id];

          // Kiểm tra bỏ trống chung
          if (val === undefined || val === null) {
            return res.status(400).json({
              success: false,
              message: \`Vui lòng trả lời câu hỏi bắt buộc: "\${q.content}"\`,
              questionId: q.id
            });
          }

          if (typeof val === 'string' && val.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: \`Vui lòng trả lời câu hỏi bắt buộc: "\${q.content}"\`,
              questionId: q.id
            });
          }

          if (Array.isArray(val) && val.length === 0) {
            return res.status(400).json({
              success: false,
              message: \`Vui lòng trả lời câu hỏi bắt buộc: "\${q.content}"\`,
              questionId: q.id
            });
          }

          // Kiểm tra riêng cho dạng Grid Ma Trận (CHOICE_GRID / CHECKBOX_GRID)
          if (q.type === 'CHOICE_GRID' || q.type === 'CHECKBOX_GRID') {
            if (typeof val !== 'object' || Array.isArray(val) || Object.keys(val).length === 0) {
              return res.status(400).json({
                success: false,
                message: \`Vui lòng trả lời đầy đủ câu hỏi dạng ma trận bắt buộc: "\${q.content}"\`,
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
                    message: \`Vui lòng trả lời đầy đủ hàng "\${rowItem}" trong câu hỏi bắt buộc: "\${q.content}"\`,
                    questionId: q.id,
                    missingRow: rowItem
                  });
                }
              }
            }
          }
        }
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
                db.prepare(\`
                  UPDATE responses 
                  SET status = 'SCREENED_OUT', submitted_at = CURRENT_TIMESTAMP, duration_sec = ?, answers_payload = ?, quality_score = 0.0
                  WHERE id = ?
                \`).run(duration, JSON.stringify(answers), response.id);

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
      db.prepare(\`
        UPDATE responses 
        SET submitted_at = CURRENT_TIMESTAMP, duration_sec = ?, answers_payload = ?, quality_score = ?, status = ?
        WHERE id = ?
      \`).run(
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
          db.prepare(\`
            UPDATE responses 
            SET status = 'VALIDATED', points_rewarded = 0, submitted_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND (status != 'VALIDATED' OR points_rewarded = 0)
          \`).run(response.id);

          const newCollected = survey.collected_responses + 1;
          const newSurveyStatus = newCollected >= survey.target_responses ? 'COMPLETED' : 'ACTIVE';
          const completedAtSql = newSurveyStatus === 'COMPLETED' ? ', completed_at = CURRENT_TIMESTAMP' : '';
          db.prepare(\`
            UPDATE surveys 
            SET collected_responses = collected_responses + 1, status = ?, updated_at = CURRENT_TIMESTAMP \${completedAtSql}
            WHERE id = ?
          \`).run(newSurveyStatus, survey.id);

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
      db.prepare(\`
        INSERT INTO fraud_logs (id, user_id, survey_id, ip_address, device_fingerprint, reason, score_details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      \`).run(
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
  }`;

// 6. Cập nhật screenOut
const newScreenOut = `  /**
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
        db.prepare(\`
          INSERT INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at, points_rewarded)
          VALUES (?, ?, ?, 'SCREENED_OUT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
        \`).run(responseId, id, user.id);
        response = { id: responseId };
      } else if (response.status === 'VALIDATED') {
        return res.status(400).json({ success: false, message: 'Bạn đã hoàn thành khảo sát này rồi' });
      } else {
        db.prepare(\`
          UPDATE responses SET status = 'SCREENED_OUT', submitted_at = CURRENT_TIMESTAMP, points_rewarded = 0 WHERE id = ?
        \`).run(response.id);
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
  }`;

// 7. Thêm claimWarranty
const newClaimWarranty = `  /**
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
          message: \`Khảo sát hiện có \${totalCollected} mẫu. Hạn mức bảo hành 15% là 0 mẫu (Cần ít nhất 7 mẫu thu thập để có 1 mẫu bảo hành).\`
        });
      }

      // Lấy số lượng đã từng đổi bảo hành trước đó
      const previousClaims = db.prepare("SELECT SUM(replaced_count) as total_replaced FROM warranty_claims WHERE survey_id = ?").get(id);
      const previouslyReplaced = previousClaims && previousClaims.total_replaced ? previousClaims.total_replaced : 0;
      const remainingQuota = maxWarrantyAllowed - previouslyReplaced;

      if (response_ids.length > remainingQuota) {
        return res.status(400).json({
          success: false,
          message: \`Số lượng mẫu yêu cầu đổi (\${response_ids.length}) vượt quá hạn mức bảo hành 15% còn lại của khảo sát (\${remainingQuota} mẫu trên tổng hạn mức \${maxWarrantyAllowed} mẫu).\`
        });
      }

      // 7. Kiểm tra tính hợp lệ của các response_ids (phải thuộc survey_id và có status = VALIDATED)
      const placeholders = response_ids.map(() => '?').join(',');
      const validResponses = db.prepare(\`
        SELECT id FROM responses 
        WHERE survey_id = ? AND status = 'VALIDATED' AND id IN (\${placeholders})
      \`).all(id, ...response_ids);

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
        db.prepare(\`
          UPDATE responses 
          SET status = 'WARRANTY_REPLACED'
          WHERE survey_id = ? AND id IN (\${placeholders})
        \`).run(id, ...response_ids);

        // Trừ số mẫu hợp lệ hiện tại và tự động mở lại khảo sát thành ACTIVE để thu bù mẫu mới
        const newCollected = Math.max(0, totalCollected - replacedCount);
        db.prepare(\`
          UPDATE surveys 
          SET collected_responses = ?, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        \`).run(newCollected, id);

        // Ghi log vào cơ sở dữ liệu bảng warranty_claims
        db.prepare(\`
          INSERT INTO warranty_claims (id, survey_id, creator_id, response_ids_json, replaced_count, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        \`).run(
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
          message: \`Kích hoạt bảo hành 1 đổi 1 thành công cho \${replacedCount} mẫu! Khảo sát đã được mở lại để tự động thu bù mẫu mới chất lượng từ đáp viên khác.\`,
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
  }`;

// 8. Cập nhật exportSurveyData để hiển thị Grid ma trận và thông tin Demographic Auto-fill
const newExportSurveyData = `  /**
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
      const responses = db.prepare(\`
        SELECT r.*, u.name AS respondent_name, u.email AS respondent_email, u.gender AS u_gender, u.province AS u_province, u.university AS u_university, u.major AS u_major, u.birth_date AS u_birth_date
        FROM responses r
        JOIN users u ON r.respondent_id = u.id
        WHERE r.survey_id = ? AND r.status = 'VALIDATED'
        ORDER BY r.submitted_at ASC
      \`).all(id);

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

        const filename = \`survey_\${id}_export_\${Date.now()}.json\`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', \`attachment; filename="\${filename}"\`);
        return res.status(200).send(JSON.stringify(jsonExport, null, 2));
      }

      // 2. Mặc định: Xuất định dạng CSV (RFC 4180 có UTF-8 BOM cho Excel tiếng Việt)
      const escapeCSV = (field) => {
        if (field === null || field === undefined) return '""';
        const str = String(field);
        return \`"\${str.replace(/"/g, '""')}"\`;
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
            ...questions.map(q => q.content.replace(/[\\r\\n]+/g, ' '))
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
            ...questions.map(q => q.content.replace(/[\\r\\n]+/g, ' '))
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
              return \`\${k}: \${subVal}\`;
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

      const csvContent = '\\uFEFF' + csvRows.join('\\r\\n');
      const filename = \`survey_\${id}_responses_\${Date.now()}.csv\`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', \`attachment; filename="\${filename}"\`);
      return res.status(200).send(csvContent);
    } catch (err) {
      console.error('Lỗi exportSurveyData:', err);
      return res.status(500).json({ success: false, message: 'Lỗi xuất dữ liệu khảo sát: ' + err.message });
    }
  }`;

// Thay thế các methods trong file
// Thay getSurvey:
code = code.replace(/getSurvey\(req, res\) \{[\s\S]*?\n  \}/, newGetSurvey.trim());

// Thay createSurvey:
code = code.replace(/createSurvey\(req, res\) \{[\s\S]*?\n  \}/, newCreateSurvey.trim());

// Thay startSession:
code = code.replace(/startSession\(req, res\) \{[\s\S]*?\n  \}/, newStartSession.trim());

// Thay submitSurvey:
code = code.replace(/submitSurvey\(req, res\) \{[\s\S]*?\n  \}/, newSubmitSurvey.trim());

// Thay screenOut:
code = code.replace(/screenOut\(req, res\) \{[\s\S]*?\n  \}/, newScreenOut.trim());

// Thay exportSurveyData:
code = code.replace(/exportSurveyData\(req, res\) \{[\s\S]*?\n  \}/, newExportSurveyData.trim());

// Thêm claimWarranty vào trước method cuối cùng hoặc trước module.exports
if (!code.includes('claimWarranty(')) {
  code = code.replace(/\n\}\s*\nmodule\.exports = new SurveyController\(\);/, '\n' + newClaimWarranty + '\n}\n\nmodule.exports = new SurveyController();');
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Đã cập nhật toàn bộ surveyController.js thành công.');
