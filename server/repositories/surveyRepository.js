/**
 * Kho Luu Tru & Truy Van Du Lieu Khao Sat (Survey Repository)
 * Data Access Layer tap hop toan bo cac truy van SQL lien quan den:
 * - Khao sat (surveys)
 * - Cau hoi (questions)
 * - Phan hoi / Bai lam (responses)
 * - Bao hanh so lieu (warranty_claims)
 */

const crypto = require('crypto');
const db = require('../db/database');

class SurveyRepository {
  /**
   * Helper chuan hoa cau hoi tu co so du lieu
   * @param {Object} q Ban ghi cau hoi tu bang questions
   * @param {boolean} isOwnerOrAdmin Co phai chu so huu hoac quan tri vien khong
   * @returns {Object} Doi tuong cau hoi da chuan hoa
   */
  parseQuestionFromDb(q, isOwnerOrAdmin = false) {
    if (!q) return null;

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

    let logic = null;
    if (q.logic_json) {
      try { logic = JSON.parse(q.logic_json); } catch (e) {}
    }

    const resObj = {
      id: q.id,
      order_index: q.order_index,
      type: q.type,
      content: q.content,
      options: options,
      rows: rows,
      columns: columns,
      logic: logic,
      validation: (logic && logic.validation) ? logic.validation : null,
      min_label: q.min_label || null,
      max_label: q.max_label || null,
      image_url: q.image_url || null,
      video_url: q.video_url || null,
      is_required: q.is_required !== undefined ? (q.is_required === 0 ? 0 : 1) : 1,
      is_screener: q.is_screener === 1,
      qualifying_answer: q.qualifying_answer || null
    };

    if (isOwnerOrAdmin) {
      resObj.is_attention_check = (q.is_attention_check === 1 || q.is_attention_check === true) ? 1 : 0;
      resObj.expected_answer = q.expected_answer || null;
    }

    return resObj;
  }

  /**
   * Tim khao sat theo ID
   * @param {string} id ID khao sat
   * @returns {Object|null}
   */
  findById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM surveys WHERE id = ?').get(id) || null;
  }

  /**
   * Tim khao sat theo ID va ID nguoi tao
   * @param {string} id ID khao sat
   * @param {string} creatorId ID nguoi tao (Creator)
   * @returns {Object|null}
   */
  findByIdAndCreator(id, creatorId) {
    if (!id || !creatorId) return null;
    return db.prepare('SELECT * FROM surveys WHERE id = ? AND creator_id = ?').get(id, creatorId) || null;
  }

  /**
   * Lay danh sach cau hoi dang tho (raw) tu bang questions
   * @param {string} surveyId ID khao sat
   * @returns {Array<Object>}
   */
  findRawQuestionsBySurveyId(surveyId) {
    if (!surveyId) return [];
    return db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(surveyId);
  }

  /**
   * Lay danh sach cau hoi cua mot bai khao sat
   * @param {string} surveyId ID khao sat
   * @param {boolean} isOwnerOrAdmin Co kem dap an ky vong cua cau bay khong
   * @returns {Array<Object>}
   */
  findQuestionsBySurveyId(surveyId, isOwnerOrAdmin = false) {
    if (!surveyId) return [];
    const rows = db.prepare('SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC').all(surveyId);
    return rows.map((q) => this.parseQuestionFromDb(q, isOwnerOrAdmin));
  }

  /**
   * Tim khao sat kem day du danh sach cau hoi da chuan hoa
   * @param {string} id ID khao sat
   * @param {boolean} isOwnerOrAdmin Co kem thong tin bao mat (bay chu y) khong
   * @returns {Object|null}
   */
  findWithQuestions(id, isOwnerOrAdmin = false) {
    const survey = this.findById(id);
    if (!survey) return null;

    const questions = this.findQuestionsBySurveyId(id, isOwnerOrAdmin);
    return {
      ...survey,
      questions
    };
  }

  /**
   * Tao khao sat moi kem danh sach cau hoi trong mot giao dich nguyen tu (ACID Transaction)
   * @param {Object} surveyData Du lieu bang surveys
   * @param {Array<Object>} questionsData Danh sach cau hoi bang questions
   * @returns {Object} { surveyId, questionsCount }
   */
  createSurvey(surveyData, questionsData = []) {
    const surveyId = surveyData.id || crypto.randomUUID();

    const insertSurveyStmt = db.prepare(`
      INSERT INTO surveys (
        id, creator_id, title, description, category, cover_image_url, target_responses, collected_responses, 
        cost_per_response, reward_points_per_response, escrow_locked_balance, min_completion_time_sec, 
        status, survey_source, external_form_url, normalized_form_url, google_sheets_webhook_url, sponsor_campaign_id, reward_mode,
        academic_tags_json, target_demographics_json, package_type, pricing_tier,
        allow_edit_response, allow_view_response, is_student_exchange, duration_days, expires_at, voucher_purchase_quantity,
        voucher_dist_mode, voucher_total_slots
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0.0, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' days'), ?, ?, ?)
    `);

    const insertQuestionStmt = db.prepare(`
      INSERT INTO questions (
        id, survey_id, order_index, type, content, 
        options_json, rows_json, columns_json, logic_json, is_required, 
        min_label, max_label, image_url, video_url,
        is_attention_check, expected_answer, is_screener, qualifying_answer
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      insertSurveyStmt.run(
        surveyId,
        surveyData.creator_id,
        surveyData.title,
        surveyData.description || '',
        surveyData.category || 'Thị trường',
        surveyData.cover_image_url || null,
        surveyData.target_responses || 100,
        surveyData.cost_per_response || 0,
        surveyData.reward_points_per_response || 0,
        surveyData.min_completion_time_sec || 15,
        surveyData.survey_source || 'INTERNAL_BUILDER',
        surveyData.external_form_url || null,
        surveyData.normalized_form_url || null,
        surveyData.google_sheets_webhook_url || null,
        surveyData.sponsor_campaign_id || null,
        surveyData.reward_mode || 'POINTS_ONLY',
        surveyData.academic_tags_json || null,
        surveyData.target_demographics_json || null,
        surveyData.package_type || 'PERSONAL',
        surveyData.pricing_tier || 'STANDARD',
        surveyData.allow_edit_response ? 1 : 0,
        surveyData.allow_view_response !== undefined && (surveyData.allow_view_response === 0 || surveyData.allow_view_response === false) ? 0 : 1,
        surveyData.is_student_exchange ? 1 : 0,
        surveyData.duration_days || 14,
        surveyData.duration_days || 14,
        surveyData.voucher_purchase_quantity || 0,
        surveyData.voucher_dist_mode || 'FIRST_COME',
        surveyData.voucher_total_slots || 0
      );

      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        const qId = crypto.randomUUID();
        const rowsJson = q.rows && Array.isArray(q.rows) ? JSON.stringify(q.rows) : (q.rows_json || null);
        const colsJson = q.columns && Array.isArray(q.columns) ? JSON.stringify(q.columns) : (q.columns_json || null);
        const optionsJson = q.options ? JSON.stringify(q.options) : (q.options_json || colsJson || null);
        let logicObj = null;
        if (q.logic) {
          try {
            logicObj = typeof q.logic === 'string' ? JSON.parse(q.logic) : { ...q.logic };
          } catch(e) {
            logicObj = {};
          }
        } else if (q.logic_json) {
          try { logicObj = JSON.parse(q.logic_json); } catch(e) {}
        }
        if (q.validation) {
          logicObj = logicObj || {};
          logicObj.validation = q.validation;
        }
        const logicJson = logicObj && Object.keys(logicObj).length > 0 ? JSON.stringify(logicObj) : null;
        const isReq = (q.is_required !== undefined && (q.is_required === 0 || q.is_required === false)) ? 0 : 1;

        insertQuestionStmt.run(
          qId,
          surveyId,
          i + 1,
          q.type,
          q.content ? q.content.trim() : '',
          optionsJson,
          rowsJson,
          colsJson,
          logicJson,
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
      return {
        surveyId,
        questionsCount: questionsData.length
      };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Cap nhat thong tin bai khao sat va danh sach cau hoi (neu chua co bai lam)
   * @param {string} id ID khao sat
   * @param {Object} updates Cac truong cap nhat cua khao sat
   * @param {Array<Object>|null} [newQuestions=null] Danh sach cau hoi moi neu muon cap nhat lai
   * @returns {Object} Ban ghi khao sat sau khi cap nhat
   */
  updateSurvey(id, updates = {}, newQuestions = null) {
    if (!id) throw new Error('Thieu survey ID');

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      if (newQuestions && Array.isArray(newQuestions) && newQuestions.length > 0) {
        const respCount = db.prepare('SELECT COUNT(*) as count FROM responses WHERE survey_id = ?').get(id)?.count || 0;
        if (respCount === 0) {
          db.prepare('DELETE FROM questions WHERE survey_id = ?').run(id);
          const insertQ = db.prepare(`
            INSERT INTO questions (
              id, survey_id, order_index, type, content, 
              options_json, rows_json, columns_json, logic_json, is_required, 
              min_label, max_label, image_url, video_url,
              is_attention_check, expected_answer, is_screener, qualifying_answer
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (let i = 0; i < newQuestions.length; i++) {
            const q = newQuestions[i];
            const qId = q.id || crypto.randomUUID();
            const rowsJson = q.rows && Array.isArray(q.rows) ? JSON.stringify(q.rows) : (q.rows_json || null);
            const colsJson = q.columns && Array.isArray(q.columns) ? JSON.stringify(q.columns) : (q.columns_json || null);
            const optionsJson = q.options ? JSON.stringify(q.options) : (q.options_json || colsJson || null);
            let logicObj = null;
        if (q.logic) {
          try {
            logicObj = typeof q.logic === 'string' ? JSON.parse(q.logic) : { ...q.logic };
          } catch(e) {
            logicObj = {};
          }
        } else if (q.logic_json) {
          try { logicObj = JSON.parse(q.logic_json); } catch(e) {}
        }
        if (q.validation) {
          logicObj = logicObj || {};
          logicObj.validation = q.validation;
        }
        const logicJson = logicObj && Object.keys(logicObj).length > 0 ? JSON.stringify(logicObj) : null;
            const isReq = (q.is_required !== undefined && (q.is_required === 0 || q.is_required === false)) ? 0 : 1;

            insertQ.run(
              qId,
              id,
              i + 1,
              q.type,
              q.content ? q.content.trim() : '',
              optionsJson,
              rowsJson,
              colsJson,
              logicJson,
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
        }
      }

      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'id') continue;
        updateFields.push(`${key} = ?`);
        params.push(value);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        const sql = `UPDATE surveys SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...params);
      }

      db.exec('COMMIT');
      return this.findById(id);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Cap nhat trang thai cua khao sat
   * @param {string} id ID khao sat
   * @param {string} status Trang thai moi (DRAFT, ACTIVE, PAUSED, COMPLETED, CLOSED)
   * @param {string|null} [creatorId=null] Neu truyen, chi cap nhat neu dung chu so huu
   * @param {string|null} [expectedCurrentStatus=null] Neu truyen, chi cap nhat neu trang thai hien tai khop
   * @returns {boolean}
   */
  updateStatus(id, status, creatorId = null, expectedCurrentStatus = null) {
    if (!id || !status) return false;

    const conditions = ['id = ?'];
    const params = [status, id];

    if (creatorId) {
      conditions.push('creator_id = ?');
      params.push(creatorId);
    }
    if (expectedCurrentStatus) {
      conditions.push('status = ?');
      params.push(expectedCurrentStatus);
    }

    const sql = `UPDATE surveys SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE ${conditions.join(' AND ')}`;
    const result = db.prepare(sql).run(...params);
    return result.changes > 0;
  }

  /**
   * Cap nhat trang thai ghim bai khao sat
   * @param {string} id ID khao sat
   * @param {boolean|number} isPinned 1 hoac 0
   * @returns {boolean}
   */
  updateIsPinned(id, isPinned) {
    if (!id) return false;
    const val = isPinned ? 1 : 0;
    const res = db.prepare('UPDATE surveys SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(val, id);
    return res.changes > 0;
  }

  /**
   * Tang so phan hoi da thu thap va tu dong danh dau hoan thanh neu dat muc tieu
   * @param {string} surveyId ID khao sat
   * @returns {Object|null} Ban ghi khao sat sau khi cap nhat
   */
  incrementCollectedResponses(surveyId) {
    if (!surveyId) return null;

    db.prepare(`
      UPDATE surveys 
      SET collected_responses = collected_responses + 1,
          status = CASE 
            WHEN collected_responses + 1 >= target_responses THEN 'COMPLETED'
            ELSE status
          END,
          completed_at = CASE 
            WHEN collected_responses + 1 >= target_responses THEN CURRENT_TIMESTAMP
            ELSE completed_at
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(surveyId);

    return this.findById(surveyId);
  }

  /**
   * Cap nhat so du quy ky quy bi khoa (Escrow)
   * @param {string} surveyId ID khao sat
   * @param {number} newBalance So du moi
   * @returns {boolean}
   */
  updateEscrowLockedBalance(surveyId, newBalance) {
    if (!surveyId) return false;
    const res = db.prepare('UPDATE surveys SET escrow_locked_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newBalance, surveyId);
    return res.changes > 0;
  }

  /**
   * Thong ke tong hop so lieu phan hoi cua bai khao sat
   * @param {string} surveyId ID khao sat
   * @returns {Object}
   */
  getSurveyStats(surveyId) {
    if (!surveyId) return null;

    const row = db.prepare(`
      SELECT 
        COUNT(*) as total_responses,
        SUM(CASE WHEN status = 'VALIDATED' THEN 1 ELSE 0 END) as validated_responses,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_responses,
        SUM(CASE WHEN status = 'FLAGGED_MANUAL' THEN 1 ELSE 0 END) as flagged_responses,
        SUM(CASE WHEN status = 'REJECTED_FRAUD' THEN 1 ELSE 0 END) as rejected_responses,
        SUM(CASE WHEN status = 'SCREENED_OUT' THEN 1 ELSE 0 END) as screened_out_responses,
        SUM(CASE WHEN status = 'WARRANTY_REPLACED' THEN 1 ELSE 0 END) as warranty_replaced_responses,
        COALESCE(SUM(points_rewarded), 0) as total_points_rewarded,
        COALESCE(AVG(CASE WHEN status = 'VALIDATED' THEN duration_sec ELSE NULL END), 0) as avg_duration_sec,
        COALESCE(AVG(CASE WHEN status = 'VALIDATED' THEN quality_score ELSE NULL END), 0.0) as avg_quality_score
      FROM responses
      WHERE survey_id = ?
    `).get(surveyId);

    return {
      total_responses: row?.total_responses || 0,
      validated_responses: row?.validated_responses || 0,
      in_progress_responses: row?.in_progress_responses || 0,
      flagged_responses: row?.flagged_responses || 0,
      rejected_responses: row?.rejected_responses || 0,
      screened_out_responses: row?.screened_out_responses || 0,
      warranty_replaced_responses: row?.warranty_replaced_responses || 0,
      total_points_rewarded: row?.total_points_rewarded || 0,
      avg_duration_sec: Math.round(row?.avg_duration_sec || 0),
      avg_quality_score: parseFloat((row?.avg_quality_score || 0).toFixed(2))
    };
  }

  /**
   * Lay danh sach khao sat cong khai dang ACTIVE danh cho khach vang lai
   * @returns {Array<Object>}
   */
  listPublicSurveys() {
    const sql = `
      SELECT s.*, 
        vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title,
        (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
      FROM surveys s
      LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
      WHERE s.status = 'ACTIVE' AND (s.is_student_exchange IS NULL OR s.is_student_exchange = 0)
      ORDER BY s.created_at DESC
    `;
    return db.prepare(sql).all();
  }

  /**
   * Lay danh sach khao sat thuoc so huu cua Creator
   * @param {string} creatorId ID cua Creator
   * @returns {Array<Object>}
   */
  listCreatorSurveys(creatorId) {
    if (!creatorId) return [];
    const sql = `
      SELECT s.*, 
        vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title,
        (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
      FROM surveys s
      LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
      WHERE s.creator_id = ?
      ORDER BY s.created_at DESC
    `;
    return db.prepare(sql).all(creatorId);
  }

  /**
   * Lay toan bo danh sach khao sat tren he thong danh cho Admin
   * @returns {Array<Object>}
   */
  listAdminSurveys() {
    const sql = `
      SELECT s.*, u.name AS creator_name, u.email AS creator_email,
        vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title,
        (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
      FROM surveys s
      JOIN users u ON s.creator_id = u.id
      LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
      ORDER BY s.created_at DESC
    `;
    return db.prepare(sql).all();
  }

  /**
   * Lay danh sach khao sat ACTIVE kem trang thai lam bai cua Respondent
   * @param {string} respondentId ID cua Respondent
   * @returns {Array<Object>}
   */
  listRespondentSurveys(respondentId, isStudentVerified = 0) {
    if (!respondentId) return [];
    const studentFilter = isStudentVerified === 1 ? '' : 'AND (s.is_student_exchange IS NULL OR s.is_student_exchange = 0)';
    const sql = `
      SELECT s.id, s.title, s.description, s.category, s.cover_image_url, s.target_responses, 
             s.collected_responses, s.reward_points_per_response, s.min_completion_time_sec,
             s.survey_source, s.external_form_url, s.academic_tags_json, s.target_demographics_json,
             s.reward_mode, s.sponsor_campaign_id, s.is_pinned, s.is_featured, s.is_student_exchange,
             vc.brand_name AS sponsor_brand_name, vc.brand_logo AS sponsor_brand_logo, vc.title AS sponsor_voucher_title, vc.face_value_vnd AS sponsor_face_value,
             r.status AS user_response_status, r.points_rewarded,
             (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
      FROM surveys s
      LEFT JOIN responses r ON r.survey_id = s.id AND r.respondent_id = ?
      LEFT JOIN voucher_campaigns vc ON s.sponsor_campaign_id = vc.id
      WHERE s.status = 'ACTIVE' ${studentFilter}
      ORDER BY s.created_at DESC
    `;
    return db.prepare(sql).all(respondentId);
  }

  /**
   * Danh sach khao sat theo cac che do va bo loc
   * @param {Object} options
   * @param {string} [options.role='GUEST'] Vaitro: GUEST, RESPONDENT, CREATOR, ADMIN
   * @param {string} [options.creator_id] ID nguoi tao
   * @param {string} [options.status] Trang thai khao sat
   * @param {string} [options.category] Chuyen muc
   * @param {number} [options.limit=100] Gioi han
   * @param {number} [options.offset=0] Vi tri bat dau
   * @returns {Array<Object>}
   */
  listSurveys(options = {}) {
    const { role = 'GUEST', creator_id = null, status = null, category = null, limit = 100, offset = 0 } = options;

    // 1. Che do Creator: Lay cac khao sat do Creator so huu
    if (role === 'CREATOR' || creator_id) {
      const conditions = ['s.creator_id = ?'];
      const params = [creator_id];

      if (status && status !== 'all') {
        conditions.push('s.status = ?');
        params.push(status.toUpperCase());
      }
      if (category && category !== 'ALL') {
        conditions.push('s.category = ?');
        params.push(category);
      }

      params.push(limit, offset);
      const sql = `
        SELECT s.*, 
               (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
        FROM surveys s
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;
      return db.prepare(sql).all(...params);
    }

    // 2. Che do Admin: Lay tat ca khao sat tren he thong
    if (role === 'ADMIN') {
      const conditions = [];
      const params = [];

      if (status && status !== 'all') {
        conditions.push('s.status = ?');
        params.push(status.toUpperCase());
      }
      if (category && category !== 'ALL') {
        conditions.push('s.category = ?');
        params.push(category);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(limit, offset);

      const sql = `
        SELECT s.*, 
               (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
        FROM surveys s
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `;
      return db.prepare(sql).all(...params);
    }

    // 3. Che do Khach vang lai (Guest) / Cong khai
    if (role === 'GUEST') {
      const sql = `
        SELECT s.id, s.title, s.description, s.category, s.cover_image_url, s.reward_points_per_response, 
               s.min_completion_time_sec, s.target_responses, s.collected_responses, s.created_at, s.status,
               s.survey_source, s.reward_mode, s.academic_tags_json, s.is_pinned, s.is_featured, s.is_student_exchange,
               (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
        FROM surveys s
        WHERE s.status = 'ACTIVE' AND (s.is_student_exchange IS NULL OR s.is_student_exchange = 0)
        ORDER BY s.is_pinned DESC, s.is_featured DESC, s.created_at DESC
        LIMIT ? OFFSET ?
      `;
      return db.prepare(sql).all(limit, offset);
    }

    // 4. Che do Respondent: Lay danh sach cac khao sat dang ACTIVE de phoi ghep
    const isStudentVerified = options.is_student_verified === 1 ? 1 : 0;
    const studentFilter = isStudentVerified === 1 ? '' : 'AND (s.is_student_exchange IS NULL OR s.is_student_exchange = 0)';
    const sql = `
      SELECT s.id, s.title, s.description, s.category, s.cover_image_url, s.reward_points_per_response, 
             s.min_completion_time_sec, s.target_responses, s.collected_responses, s.created_at, s.status,
             s.survey_source, s.reward_mode, s.academic_tags_json, s.target_demographics_json, s.sponsor_campaign_id,
             s.is_pinned, s.is_featured, s.is_student_exchange,
             (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
      FROM surveys s
      WHERE s.status = 'ACTIVE' ${studentFilter}
      ORDER BY s.is_pinned DESC, s.is_featured DESC, s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    return db.prepare(sql).all(limit, offset);
  }

  // ==============================================================
  // THAO TAC PHAN HOI (RESPONSES)
  // ==============================================================

  /**
   * Tim phan hoi theo surveyId va respondentId
   * @param {string} surveyId ID khao sat
   * @param {string} respondentId ID nguoi lam
   * @returns {Object|null}
   */
  findResponse(surveyId, respondentId) {
    if (!surveyId || !respondentId) return null;
    return db.prepare('SELECT * FROM responses WHERE survey_id = ? AND respondent_id = ?').get(surveyId, respondentId) || null;
  }

  /**
   * Tim phan hoi theo ID
   * @param {string} id ID phan hoi
   * @returns {Object|null}
   */
  findResponseById(id) {
    if (!id) return null;
    return db.prepare('SELECT * FROM responses WHERE id = ?').get(id) || null;
  }

  /**
   * Lay danh sach phan hoi cua mot khao sat
   * @param {string} surveyId ID khao sat
   * @param {string|null} [status='VALIDATED'] Loc theo trang thai hoac null de lay tat ca
   * @returns {Array<Object>}
   */
  listResponsesBySurveyId(surveyId, status = 'VALIDATED') {
    if (!surveyId) return [];
    if (status) {
      return db.prepare('SELECT * FROM responses WHERE survey_id = ? AND status = ? ORDER BY submitted_at DESC').all(surveyId, status);
    }
    return db.prepare('SELECT * FROM responses WHERE survey_id = ? ORDER BY started_at DESC').all(surveyId);
  }

  /**
   * Lay danh sach phan hoi kem thong tin nguoi dung phuc vu xuat du lieu Excel/CSV/JSON/SPSS
   * @param {string} surveyId ID khao sat
   * @returns {Array<Object>}
   */
  listResponsesForExport(surveyId) {
    if (!surveyId) return [];
    const sql = `
      SELECT r.*, u.email as respondent_email, u.name as respondent_name, u.gender as respondent_gender,
             u.province as respondent_province, u.occupation as respondent_occupation, u.birth_date as respondent_birth_date
      FROM responses r
      LEFT JOIN users u ON r.respondent_id = u.id
      WHERE r.survey_id = ? AND r.status = 'VALIDATED'
      ORDER BY r.submitted_at ASC
    `;
    return db.prepare(sql).all(surveyId);
  }

  /**
   * Khoi tao phan hoi moi (IN_PROGRESS)
   * @param {Object} responseData
   * @returns {Object}
   */
  createResponse(responseData) {
    const id = responseData.id || crypto.randomUUID();
    const startedAt = responseData.started_at || new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
      VALUES (?, ?, ?, 'IN_PROGRESS', ?)
    `);
    stmt.run(id, responseData.survey_id, responseData.respondent_id, startedAt);

    return this.findResponseById(id);
  }

  /**
   * Cap nhat phan hoi
   * @param {string} id ID phan hoi
   * @param {Object} updates Cac truong can cap nhat
   * @returns {boolean}
   */
  updateResponse(id, updates = {}) {
    if (!id) return false;
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      params.push(value);
    }

    if (fields.length === 0) return true;
    params.push(id);

    const sql = `UPDATE responses SET ${fields.join(', ')} WHERE id = ?`;
    const res = db.prepare(sql).run(...params);
    return res.changes > 0;
  }

  /**
   * Cap nhat khi nguoi dung chinh sua lai cau tra loi da nop
   * @param {string} id ID phan hoi
   * @param {string} answersPayload Chuoi JSON cau tra loi
   * @returns {boolean}
   */
  updateEditedResponse(id, answersPayload) {
    if (!id) return false;
    const res = db.prepare(`
      UPDATE responses
      SET answers_payload = ?,
          edited_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(answersPayload, id);
    return res.changes > 0;
  }

  /**
   * Danh dau nguoi dung bi loai tai cau hoi sang loc (SCREENED_OUT)
   * @param {string} surveyId ID khao sat
   * @param {string} respondentId ID nguoi lam
   * @param {string} responseId ID phan hoi
   * @param {string|null} [answersPayload=null] Cau tra loi da nhap
   * @returns {boolean}
   */
  markScreenedOut(surveyId, respondentId, responseId, answersPayload = null) {
    if (!surveyId || !respondentId) return false;

    if (responseId) {
      db.prepare(`
        UPDATE responses 
        SET status = 'SCREENED_OUT', 
            submitted_at = CURRENT_TIMESTAMP, 
            quality_score = 0.5, 
            answers_payload = COALESCE(?, answers_payload)
        WHERE id = ?
      `).run(answersPayload, responseId);
      return true;
    }

    const existing = this.findResponse(surveyId, respondentId);
    if (existing) {
      db.prepare(`
        UPDATE responses 
        SET status = 'SCREENED_OUT', 
            submitted_at = CURRENT_TIMESTAMP, 
            quality_score = 0.5,
            answers_payload = COALESCE(?, answers_payload)
        WHERE id = ?
      `).run(answersPayload, existing.id);
    } else {
      const newId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO responses (id, survey_id, respondent_id, status, started_at, submitted_at, quality_score, answers_payload)
        VALUES (?, ?, ?, 'SCREENED_OUT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0.5, ?)
      `).run(newId, surveyId, respondentId, answersPayload);
    }
    return true;
  }

  /**
   * Dem so luong phan hoi hop le (VALIDATED) cua mot khao sat
   * @param {string} surveyId ID khao sat
   * @returns {number}
   */
  countValidResponses(surveyId) {
    if (!surveyId) return 0;
    const row = db.prepare("SELECT COUNT(*) as count FROM responses WHERE survey_id = ? AND status = 'VALIDATED'").get(surveyId);
    return row?.count || 0;
  }

  // ==============================================================
  // XOA KHAO SAT & CAC BANG LIEN QUAN (CASCADE SAFE TRANSACTION)
  // ==============================================================

  /**
   * Xoa vinh vien khao sat va tat ca cac du lieu lien quan
   * @param {string} id ID khao sat can xoa
   * @returns {boolean}
   */
  deleteSurvey(id) {
    if (!id) return false;

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // 1. Dọn dẹp diễn đàn đính kèm khảo sát (forum_comments, forum_post_likes, forum_posts)
      db.prepare('DELETE FROM forum_comments WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id = ?)').run(id);
      db.prepare('DELETE FROM forum_post_likes WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id = ?)').run(id);
      db.prepare('DELETE FROM forum_posts WHERE survey_id = ?').run(id);

      // 2. Gỡ bỏ khóa ngoại voucher_codes trỏ tới responses của khảo sát
      db.prepare('UPDATE voucher_codes SET claimed_response_id = NULL WHERE claimed_response_id IN (SELECT id FROM responses WHERE survey_id = ?)').run(id);

      // 3. Xử lý voucher_codes gắn với survey_id: bảo toàn mã đã CLAIMED cho người nhận, xóa mã chưa phát
      db.prepare("UPDATE voucher_codes SET survey_id = NULL WHERE survey_id = ? AND status = 'CLAIMED'").run(id);
      db.prepare('DELETE FROM voucher_codes WHERE survey_id = ?').run(id);

      // 4. Dọn dẹp logs, thông báo, khiếu nại bảo hành
      db.prepare('DELETE FROM fraud_logs WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM warranty_claims WHERE survey_id = ?').run(id);

      // 5. Xóa responses và questions
      db.prepare('DELETE FROM responses WHERE survey_id = ?').run(id);
      db.prepare('DELETE FROM questions WHERE survey_id = ?').run(id);
      const res = db.prepare('DELETE FROM surveys WHERE id = ?').run(id);

      db.exec('COMMIT');
      return res.changes > 0;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  // ==============================================================
  // BAO HANH SO LIEU (WARRANTY CLAIMS)
  // ==============================================================

  /**
   * Lay thong ke bao hanh cua bai khao sat
   * @param {string} surveyId ID khao sat
   * @returns {Object}
   */
  getWarrantyStats(surveyId) {
    if (!surveyId) return { totalReplaced: 0, lastSubmittedAt: null };

    const lastSub = db.prepare("SELECT MAX(submitted_at) as last_sub FROM responses WHERE survey_id = ? AND status = 'VALIDATED'").get(surveyId);
    const prevClaims = db.prepare("SELECT SUM(replaced_count) as total_replaced FROM warranty_claims WHERE survey_id = ?").get(surveyId);

    return {
      totalReplaced: prevClaims?.total_replaced || 0,
      lastSubmittedAt: lastSub?.last_sub || null
    };
  }

  /**
   * Thuc hien bao hanh thay the cac phan hoi kem chat luong
   * @param {Object} claimData Thong tin yeu cau bao hanh
   * @param {Array<string>} responseIds Danh sach ID bai lam bi thay the
   * @param {string} surveyId ID khao sat
   * @param {number} replacedCount So luong mau thay the
   * @returns {boolean}
   */
  createWarrantyClaim(claimData, responseIds, surveyId, replacedCount) {
    if (!surveyId || !Array.isArray(responseIds) || responseIds.length === 0) return false;

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      db.prepare(`
        INSERT INTO warranty_claims (id, survey_id, creator_id, response_ids_json, replaced_count, reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        claimData.id || crypto.randomUUID(),
        surveyId,
        claimData.creator_id,
        JSON.stringify(responseIds),
        replacedCount,
        claimData.reason || 'Bảo hành mẫu kém chất lượng'
      );

      const placeholders = responseIds.map(() => '?').join(',');
      db.prepare(`
        UPDATE responses 
        SET status = 'WARRANTY_REPLACED' 
        WHERE id IN (${placeholders})
      `).run(...responseIds);

      db.prepare(`
        UPDATE surveys 
        SET collected_responses = MAX(0, collected_responses - ?),
            status = 'ACTIVE',
            completed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(replacedCount, surveyId);

      db.exec('COMMIT');
      return true;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  // ==============================================================
  // BENCHMARK TOC DO GOM MAU (VELOCITY)
  // ==============================================================

  /**
   * Lay so lieu thong ke ve thoi gian hoan thanh cua cac khao sat da chay
   * @param {string|null} [category=null] Chuyen muc khao sat
   * @returns {Array<Object>}
   */
  getVelocityBenchmarkRows(category = null) {
    const conditions = ["s.status = 'COMPLETED'", 's.completed_at IS NOT NULL'];
    const params = [];

    if (category && category !== 'ALL') {
      conditions.push('s.category = ?');
      params.push(category);
    }

    const sql = `
      SELECT 
        s.id, s.category, s.target_responses, s.cost_per_response, s.reward_points_per_response,
        s.created_at, s.completed_at,
        (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) as question_count
      FROM surveys s
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.completed_at DESC
      LIMIT 50
    `;
    return db.prepare(sql).all(...params);
  }
}

module.exports = new SurveyRepository();
