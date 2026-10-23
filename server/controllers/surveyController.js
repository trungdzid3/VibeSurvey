const crypto = require('crypto');
const db = require('../db/database');
const pricingService = require('../services/pricingService');
const antiFraudService = require('../services/antiFraudService');
const ledgerService = require('../services/ledgerService');
const voucherService = require('../services/voucherService');
const formParserService = require('../services/formParserService');
const matchingService = require('../services/matchingService');
const webhookService = require('../services/webhookService');

class SurveyController {
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
               s.reward_mode, s.sponsor_campaign_id,
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
  getSurvey(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
      if (!survey) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy khảo sát' });
      }

      const questions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);

      // Lấy thông tin tài trợ voucher nếu có
      let sponsor = null;
      if (survey.sponsor_campaign_id) {
        sponsor = db.prepare(`
          SELECT id, brand_name, brand_logo, title, face_value_vnd, instructions, expiry_date, remaining_quantity
          FROM voucher_campaigns WHERE id = ?
        `).get(survey.sponsor_campaign_id);
      }

      // BẢO MẬT TUYỆT ĐỐI: Chỉ Creator tạo ra khảo sát này hoặc Admin mới được xem cờ attention check!
      // Nếu là Respondent hoặc khách vãng lai: Bóc tách hoàn toàn cờ is_attention_check và expected_answer
      const isOwnerOrAdmin = user && (user.role === 'ADMIN' || survey.creator_id === user.id);

      if (!isOwnerOrAdmin) {
        const sanitizedQuestions = questions.map(q => ({
          id: q.id,
          order_index: q.order_index,
          type: q.type,
          content: q.content,
          options: q.options_json ? JSON.parse(q.options_json) : null,
          is_screener: q.is_screener === 1,
          qualifying_answer: q.qualifying_answer || null
        }));

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
            questions: sanitizedQuestions
          },
          questions: sanitizedQuestions,
          userResponse: existingResponse || null,
          userVoucher: userVoucher || null
        });
      }

      // Creator sở hữu khảo sát hoặc Admin hệ thống xem đầy đủ (bao gồm cờ attention check và expected_answer)
      const fullQuestions = questions.map(q => ({
        ...q,
        options: q.options_json ? JSON.parse(q.options_json) : null
      }));

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
        voucher_data = null
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

      const allowedTypes = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'LIKERT_SCALE', 'OPEN_TEXT'];
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
            academic_tags_json, target_demographics_json
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0.0, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)
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
          targetDemoJson
        );

        const insertQ = db.prepare(`
          INSERT INTO questions (id, survey_id, order_index, type, content, options_json, is_attention_check, expected_answer, is_screener, qualifying_answer)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qId = crypto.randomUUID();
          insertQ.run(
            qId,
            surveyId,
            i + 1,
            q.type,
            q.content.trim(),
            q.options ? JSON.stringify(q.options) : null,
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
        db.prepare(`
          INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
          VALUES (?, ?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)
        `).run(responseId, id, user.id);
      } else {
        db.prepare(`
          UPDATE responses SET started_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(responseId);
      }

      // Lấy danh sách câu hỏi đã xóa dấu vết câu bẫy (Sanitized), giữ cờ screener cho client xử lý sàng lọc
      const questions = db.prepare('SELECT id, order_index, type, content, options_json, is_screener, qualifying_answer FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);
      const sanitizedQuestions = questions.map(q => ({
        id: q.id,
        order_index: q.order_index,
        type: q.type,
        content: q.content,
        options: q.options_json ? JSON.parse(q.options_json) : null,
        is_screener: q.is_screener === 1,
        qualifying_answer: q.qualifying_answer || null
      }));

      return res.json({
        success: true,
        responseId,
        minCompletionTimeSec: survey.min_completion_time_sec,
        rewardPoints: survey.reward_points_per_response,
        questions: sanitizedQuestions
      });
    } catch (err) {
      console.error('Lỗi startSession:', err);
      return res.status(500).json({ success: false, message: 'Lỗi bắt đầu khảo sát: ' + err.message });
    }
  }

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
      if (response.status === 'VALIDATED') {
        return res.status(400).json({ success: false, message: 'Bài làm này đã được chấm điểm và trả thưởng trước đó' });
      }
      if (response.status === 'REJECTED_FRAUD') {
        return res.status(403).json({ success: false, message: 'Bài làm này đã bị từ chối do vi phạm quy chuẩn chất lượng' });
      }

      // Lấy danh sách câu hỏi đầy đủ từ DB (bao gồm câu bẫy) để đối chiếu ngầm trên server
      const dbQuestions = db.prepare('SELECT * FROM questions WHERE survey_id = ?').all(id);

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
        // Tự động kích hoạt đồng bộ Google Sheets bất đồng bộ nếu có cấu hình Webhook URL
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
          db.prepare(`
            UPDATE surveys 
            SET collected_responses = collected_responses + 1, status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(newSurveyStatus, survey.id);

          db.prepare('UPDATE users SET trust_score = MIN(100.0, trust_score + 0.5) WHERE id = ?').run(user.id);

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
        const newTrust = Math.max(0, user.trust_score - 15.0);
        db.prepare('UPDATE users SET trust_score = ? WHERE id = ?').run(newTrust, user.id);

        return res.status(400).json({
          success: false,
          status: 'REJECTED_FRAUD',
          message: 'Bài làm không đạt yêu cầu chất lượng hoặc vi phạm kiểm soát tốc độ / chú ý.',
          // BẢO MẬT TUYỆT ĐỐI: Trả về clientReasons đã được bóc tách an toàn, không chứa nội dung câu bẫy
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
      const questions = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(id);

      // Chỉ xuất các bài làm đã được thẩm định hợp lệ (VALIDATED)
      const responses = db.prepare(`
        SELECT r.*, u.name AS respondent_name, u.email AS respondent_email
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
            created_at: survey.created_at
          },
          questions: questions.map(q => ({
            id: q.id,
            order_index: q.order_index,
            type: q.type,
            content: q.content,
            options: q.options_json ? JSON.parse(q.options_json) : null
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

      // Xây dựng danh sách tiêu đề cột (Headers): Hỗ trợ format google_forms chuẩn Google Forms hoặc full chuẩn sàn
      const isGoogleFormsFormat = req.query.style === 'google_forms' || req.query.google_forms === 'true';

      const headers = isGoogleFormsFormat
        ? [
            'Dấu thời gian',
            'Địa chỉ email',
            'Họ và tên',
            ...questions.map(q => q.content.replace(/[\r\n]+/g, ' '))
          ]
        : [
            'Mã Phản Hồi (Response ID)',
            'Mã Ứng Viên (Respondent ID)',
            'Tên Người Trả Lời (Respondent Name)',
            'Email Người Trả Lời (Respondent Email)',
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

        const questionValues = questions.map(q => {
          const val = parsedAnswers[q.id];
          if (val === undefined || val === null) return '';
          if (Array.isArray(val)) {
            return val.join('; ');
          }
          return String(val);
        });

        const row = isGoogleFormsFormat
          ? [
              r.submitted_at || '',
              r.respondent_email || '',
              r.respondent_name || '',
              ...questionValues
            ]
          : [
              r.id,
              r.respondent_id,
              r.respondent_name,
              r.respondent_email,
              r.duration_sec,
              Math.round((r.quality_score || 0) * 100),
              r.points_rewarded,
              r.submitted_at,
              ...questionValues
            ];

        csvRows.push(row.map(escapeCSV).join(','));
      }

      // Ký tự BOM UTF-8 (\uFEFF) giúp Microsoft Excel hiển thị đúng tiếng Việt có dấu
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
   * POST /api/v1/surveys/parse-external
   * Bóc tách câu hỏi từ URL (Google Forms / Microsoft Forms) hoặc Smart Text Paste
   */
  async parseExternalForm(req, res) {
    try {
      const { url, text, mode } = req.body;

      if (!url && !text) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đường dẫn URL biểu mẫu hoặc văn bản thô để bóc tách'
        });
      }

      if (url) {
        const normalizedUrl = antiFraudService.normalizeFormUrl(url);
        const dupCheck = antiFraudService.checkDuplicateFormUrl(normalizedUrl);
        if (dupCheck.isDuplicate) {
          return res.status(400).json({
            success: false,
            isDuplicateForm: true,
            message: 'Đường link biểu mẫu này đã được sử dụng trong hệ thống bởi một khảo sát khác. Để chống tạo nhiều tài khoản trục lợi dùng thử miễn phí, mỗi liên kết Google/MS Forms chỉ được đăng ký một lần duy nhất.'
          });
        }

        const result = await formParserService.parseFromUrl(url);
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
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/surveys/:id/screen-out
   * Xử lý khi đáp viên không đạt câu hỏi sàng lọc (Screener)
   * Tặng điểm an ủi (20 điểm) vào ví và kết thúc phiên làm bài sớm
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
          INSERT INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at)
          VALUES (?, ?, ?, 'SCREENED_OUT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(responseId, id, user.id);
        response = { id: responseId };
      } else if (response.status === 'VALIDATED') {
        return res.status(400).json({ success: false, message: 'Bạn đã hoàn thành khảo sát này rồi' });
      } else if (response.status === 'SCREENED_OUT') {
        return res.status(400).json({ success: false, message: 'Bạn đã được ghi nhận kết thúc sớm khảo sát này' });
      } else {
        // Cập nhật status thành SCREENED_OUT
        db.prepare(`
          UPDATE responses SET status = 'SCREENED_OUT', submitted_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(response.id);
      }

      // Tặng điểm an ủi 20 điểm
      const consolationPoints = 20;
      try {
        ledgerService.awardConsolationReward(response.id, user.id, id, consolationPoints);
      } catch (ledgerErr) {
        console.error('Lỗi tặng điểm an ủi:', ledgerErr);
        // Không throw lỗi vì screened out vẫn nên được ghi nhận
      }

      return res.json({
        success: true,
        message: 'Khảo sát chưa phù hợp với bạn. Cảm ơn bạn đã tham gia!',
        consolationPoints,
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
}

module.exports = new SurveyController();
