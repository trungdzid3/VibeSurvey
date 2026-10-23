const crypto = require('crypto');
const db = require('../db/database');

class VoucherService {
  constructor() {
    this._safeRollback = this._safeRollback.bind(this);
    // Tự động khởi tạo voucher catalog nếu chưa có
    try {
      this.initCatalogVouchers();
    } catch (e) {
      console.error('[VoucherService] Khởi tạo catalog ban đầu gặp lỗi nhẹ:', e.message);
    }
  }

  /**
   * Helper an toàn để rollback transaction trong SQLite node:sqlite
   */
  _safeRollback() {
    try {
      db.exec('ROLLBACK');
    } catch (e) {
      // Transaction có thể đã được đóng hoặc rollback
    }
  }

  /**
   * 1. Khởi tạo sẵn các voucher thương hiệu uy tín (Shopee, Grab, Highlands, Phúc Long, CGV, Starbucks)
   */
  initCatalogVouchers() {
    const defaultCatalogs = [
      {
        id: 'cat_shopee_50k',
        brand_name: 'Shopee',
        brand_logo: '🛍️',
        title: 'Voucher Shopee 50K đơn từ 0đ',
        face_value_vnd: 50000,
        points_cost: 5000,
        total_quantity: 30,
        instructions: 'Nhập mã tại bước thanh toán trên Shopee App hoặc Website. Áp dụng cho mọi ngành hàng.',
        expiry_date: '2026-12-31',
        prefix: 'SHOPEE50K'
      },
      {
        id: 'cat_grab_30k',
        brand_name: 'Grab',
        brand_logo: '🚗',
        title: 'Mã Giảm 30K GrabFood / GrabBike',
        face_value_vnd: 30000,
        points_cost: 3000,
        total_quantity: 30,
        instructions: 'Áp dụng cho mọi chuyến đi GrabCar/GrabBike hoặc đơn đặt đồ ăn GrabFood trên toàn quốc.',
        expiry_date: '2026-12-31',
        prefix: 'GRAB30K'
      },
      {
        id: 'cat_highlands_50k',
        brand_name: 'Highlands Coffee',
        brand_logo: '☕',
        title: 'Voucher Highlands Coffee 50K',
        face_value_vnd: 50000,
        points_cost: 5000,
        total_quantity: 30,
        instructions: 'Đưa mã vạch hoặc đọc mã số cho nhân viên thu ngân tại quầy khi thanh toán.',
        expiry_date: '2026-12-31',
        prefix: 'HLCOFFEE50'
      },
      {
        id: 'cat_phuclong_30k',
        brand_name: 'Phúc Long',
        brand_logo: '🧋',
        title: 'Giảm 30K Trà Sữa Phúc Long Tea & Coffee',
        face_value_vnd: 30000,
        points_cost: 3000,
        total_quantity: 30,
        instructions: 'Áp dụng tại tất cả cửa hàng Phúc Long trên toàn quốc hoặc đặt hàng qua hotline/app.',
        expiry_date: '2026-12-31',
        prefix: 'PHUCLONG30'
      },
      {
        id: 'cat_cgv_100k',
        brand_name: 'CGV Cinemas',
        brand_logo: '🍿',
        title: 'Vé Xem Phim CGV 100K 2D',
        face_value_vnd: 100000,
        points_cost: 10000,
        total_quantity: 20,
        instructions: 'Đổi vé trên ứng dụng CGV Cinemas hoặc đưa mã cho nhân viên bán vé tại rạp.',
        expiry_date: '2026-12-31',
        prefix: 'CGVCINE100'
      },
      {
        id: 'cat_starbucks_100k',
        brand_name: 'Starbucks',
        brand_logo: '⭐',
        title: 'E-Voucher Starbucks 100K',
        face_value_vnd: 100000,
        points_cost: 10000,
        total_quantity: 20,
        instructions: 'Xuất trình mã e-voucher khi thanh toán tại mọi chi nhánh Starbucks Coffee tại Việt Nam.',
        expiry_date: '2026-12-31',
        prefix: 'SBUX100K'
      }
    ];

    let addedCount = 0;
    const checkCampaign = db.prepare("SELECT id FROM voucher_campaigns WHERE voucher_type = 'PLATFORM_CATALOG' AND brand_name = ?");
    const insertCampaign = db.prepare(`
      INSERT INTO voucher_campaigns (
        id, issuer_id, voucher_type, brand_name, brand_logo, title, 
        face_value_vnd, points_cost, total_quantity, remaining_quantity, 
        expiry_date, instructions
      ) VALUES (?, NULL, 'PLATFORM_CATALOG', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCode = db.prepare(`
      INSERT INTO voucher_codes (
        id, campaign_id, survey_id, code, status
      ) VALUES (?, ?, NULL, ?, 'AVAILABLE')
    `);

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      for (const cat of defaultCatalogs) {
        const found = checkCampaign.get(cat.brand_name);
        if (!found) {
          insertCampaign.run(
            cat.id,
            cat.brand_name,
            cat.brand_logo,
            cat.title,
            cat.face_value_vnd,
            cat.points_cost,
            cat.total_quantity,
            cat.total_quantity,
            cat.expiry_date,
            cat.instructions
          );

          // Tạo các mã voucher mẫu
          for (let i = 1; i <= cat.total_quantity; i++) {
            const codeStr = `${cat.prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            insertCode.run('vc_' + crypto.randomUUID(), cat.id, codeStr);
          }
          addedCount++;
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return { initialized: true, addedCount };
  }

  /**
   * 2. Lấy danh sách voucher thương hiệu kèm số lượng còn lại
   */
  listCatalogVouchers() {
    const campaigns = db.prepare(`
      SELECT 
        id, brand_name, brand_logo, title, face_value_vnd, 
        points_cost, total_quantity, remaining_quantity, expiry_date, instructions, created_at
      FROM voucher_campaigns
      WHERE voucher_type = 'PLATFORM_CATALOG'
      ORDER BY points_cost ASC, created_at DESC
    `).all();

    return campaigns.map(c => ({
      ...c,
      is_available: c.remaining_quantity > 0,
      stock_label: c.remaining_quantity > 0 ? `Còn ${c.remaining_quantity} mã` : 'Tạm hết hàng'
    }));
  }

  /**
   * 3. Creator tài trợ voucher của họ bằng cách tải lên danh sách mã (Zero Cash Model)
   */
  createSponsorVoucherCampaign(creatorId, campaignData, voucherCodesArray) {
    if (!creatorId) {
      throw new Error('Thiếu thông tin người tạo (creatorId)');
    }

    const {
      brand_name,
      brand_logo = '🎁',
      title,
      face_value_vnd = 0,
      instructions = '',
      expiry_date = null,
      survey_id = null
    } = campaignData || {};

    if (!brand_name || typeof brand_name !== 'string' || brand_name.trim().length === 0) {
      throw new Error('Tên thương hiệu/nhà tài trợ không được để trống');
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Tiêu đề ưu đãi/voucher không được để trống');
    }

    if (!Array.isArray(voucherCodesArray) || voucherCodesArray.length === 0) {
      throw new Error('Danh sách mã voucher phải là mảng và chứa ít nhất 1 mã');
    }

    // Làm sạch và khử trùng mã
    const cleanCodes = Array.from(new Set(
      voucherCodesArray
        .map(c => String(c || '').trim())
        .filter(c => c.length > 0)
    ));

    if (cleanCodes.length === 0) {
      throw new Error('Không có mã voucher hợp lệ sau khi lọc khoảng trắng');
    }

    const faceVal = Math.max(0, parseFloat(face_value_vnd) || 0);
    const campaignId = 'vc_sp_' + crypto.randomUUID();

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // 1. Nếu có survey_id, kiểm tra khảo sát thuộc creator
      if (survey_id) {
        const survey = db.prepare('SELECT id, creator_id, reward_mode FROM surveys WHERE id = ?').get(survey_id);
        if (!survey) {
          throw new Error('Khảo sát liên kết không tồn tại');
        }
        if (survey.creator_id !== creatorId) {
          throw new Error('Bạn không có quyền tài trợ voucher cho khảo sát này');
        }
      }

      // 2. Tạo chiến dịch voucher tài trợ
      db.prepare(`
        INSERT INTO voucher_campaigns (
          id, issuer_id, voucher_type, brand_name, brand_logo, title,
          face_value_vnd, points_cost, total_quantity, remaining_quantity,
          expiry_date, instructions
        ) VALUES (?, ?, 'CREATOR_SPONSORED', ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `).run(
        campaignId,
        creatorId,
        brand_name.trim(),
        brand_logo.trim(),
        title.trim(),
        faceVal,
        cleanCodes.length,
        cleanCodes.length,
        expiry_date,
        instructions ? instructions.trim() : null
      );

      // 3. Nạp danh sách mã
      const insertCode = db.prepare(`
        INSERT INTO voucher_codes (id, campaign_id, survey_id, code, status)
        VALUES (?, ?, ?, ?, ?)
      `);

      const initialStatus = survey_id ? 'RESERVED_FOR_SURVEY' : 'AVAILABLE';
      for (const code of cleanCodes) {
        insertCode.run(crypto.randomUUID(), campaignId, survey_id || null, code, initialStatus);
      }

      // 4. Nếu gắn với khảo sát, cập nhật survey
      if (survey_id) {
        db.prepare(`
          UPDATE surveys 
          SET sponsor_campaign_id = ?,
              reward_mode = CASE 
                WHEN reward_mode = 'POINTS_ONLY' THEN 'HYBRID_POINTS_AND_VOUCHER' 
                ELSE reward_mode 
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(campaignId, survey_id);
      }

      db.exec('COMMIT');

      return {
        success: true,
        campaignId,
        totalCodes: cleanCodes.length,
        brandName: brand_name.trim(),
        title: title.trim(),
        surveyId: survey_id || null
      };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * 4. Cấp phát NGUYÊN TỬ 1 mã voucher duy nhất chưa dùng cho người làm bài khi hoàn thành khảo sát
   * Chống trùng lặp 100% (Atomic, Idempotent & Concurrency Safe - Chống duplicate voucher claim)
   */
  claimVoucherForResponse(surveyId, campaignId, userId, responseId) {
    if (!surveyId && !campaignId) {
      throw new Error('Cần cung cấp surveyId hoặc campaignId để nhận voucher');
    }
    if (!userId) {
      throw new Error('Thiếu thông tin người nhận voucher (userId)');
    }

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // 1a. Chống cấp kép theo responseId: Kiểm tra bài làm này đã nhận mã voucher nào chưa
      if (responseId) {
        const alreadyClaimed = db.prepare(`
          SELECT vc.*, c.brand_name, c.brand_logo, c.title, c.instructions, c.expiry_date
          FROM voucher_codes vc
          JOIN voucher_campaigns c ON vc.campaign_id = c.id
          WHERE vc.claimed_response_id = ?
        `).get(responseId);

        if (alreadyClaimed) {
          db.exec('COMMIT');
          return {
            claimed: true,
            isNew: false,
            voucher: {
              id: alreadyClaimed.id,
              code: alreadyClaimed.code,
              brand_name: alreadyClaimed.brand_name,
              brand_logo: alreadyClaimed.brand_logo,
              title: alreadyClaimed.title,
              instructions: alreadyClaimed.instructions,
              expiry_date: alreadyClaimed.expiry_date,
              claimed_at: alreadyClaimed.claimed_at
            }
          };
        }
      }

      // 1b. Chống cấp kép theo UserId & SurveyId: Mỗi người dùng chỉ được nhận tối đa 1 mã cho 1 khảo sát
      if (surveyId && userId) {
        const alreadyClaimedSurvey = db.prepare(`
          SELECT vc.*, c.brand_name, c.brand_logo, c.title, c.instructions, c.expiry_date
          FROM voucher_codes vc
          JOIN voucher_campaigns c ON vc.campaign_id = c.id
          WHERE vc.survey_id = ? AND vc.claimed_by_user_id = ?
        `).get(surveyId, userId);

        if (alreadyClaimedSurvey) {
          db.exec('COMMIT');
          return {
            claimed: true,
            isNew: false,
            voucher: {
              id: alreadyClaimedSurvey.id,
              code: alreadyClaimedSurvey.code,
              brand_name: alreadyClaimedSurvey.brand_name,
              brand_logo: alreadyClaimedSurvey.brand_logo,
              title: alreadyClaimedSurvey.title,
              instructions: alreadyClaimedSurvey.instructions,
              expiry_date: alreadyClaimedSurvey.expiry_date,
              claimed_at: alreadyClaimedSurvey.claimed_at
            }
          };
        }
      }

      // 2. Tìm 1 mã còn khả dụng (ưu tiên mã của khảo sát hoặc mã chung của chiến dịch tài trợ)
      let availableCode = null;
      if (surveyId && campaignId) {
        availableCode = db.prepare(`
          SELECT id, campaign_id, code 
          FROM voucher_codes 
          WHERE campaign_id = ? AND (survey_id = ? OR survey_id IS NULL) AND status IN ('AVAILABLE', 'RESERVED_FOR_SURVEY')
          LIMIT 1
        `).get(campaignId, surveyId);
      } else if (surveyId) {
        availableCode = db.prepare(`
          SELECT id, campaign_id, code 
          FROM voucher_codes 
          WHERE survey_id = ? AND status IN ('AVAILABLE', 'RESERVED_FOR_SURVEY')
          LIMIT 1
        `).get(surveyId);
      } else {
        availableCode = db.prepare(`
          SELECT id, campaign_id, code 
          FROM voucher_codes 
          WHERE campaign_id = ? AND status IN ('AVAILABLE', 'RESERVED_FOR_SURVEY')
          LIMIT 1
        `).get(campaignId);
      }

      if (!availableCode) {
        db.exec('COMMIT');
        return {
          claimed: false,
          message: 'Số lượng voucher tài trợ cho khảo sát này đã được phát hết',
          voucher: null
        };
      }

      // 3. Khóa mã nguyên tử chống race condition (Atomic Claim với kiểm tra status AVAILABLE/RESERVED)
      const updateCode = db.prepare(`
        UPDATE voucher_codes 
        SET status = 'CLAIMED', 
            survey_id = COALESCE(survey_id, ?),
            claimed_by_user_id = ?, 
            claimed_response_id = ?, 
            claimed_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status IN ('AVAILABLE', 'RESERVED_FOR_SURVEY')
      `).run(surveyId || null, userId, responseId || null, availableCode.id);

      if (updateCode.changes === 0) {
        throw new Error('Mã voucher vừa được nhận bởi phiên khác, vui lòng thử lại');
      }

      // 4. Giảm số lượng còn lại trong chiến dịch
      db.prepare(`
        UPDATE voucher_campaigns 
        SET remaining_quantity = remaining_quantity - 1 
        WHERE id = ? AND remaining_quantity > 0
      `).run(availableCode.campaign_id);

      // 5. Lấy thông tin voucher hoàn chỉnh
      const campaign = db.prepare(`
        SELECT brand_name, brand_logo, title, instructions, expiry_date 
        FROM voucher_campaigns 
        WHERE id = ?
      `).get(availableCode.campaign_id);

      db.exec('COMMIT');

      return {
        claimed: true,
        isNew: true,
        voucher: {
          id: availableCode.id,
          code: availableCode.code,
          brand_name: campaign ? campaign.brand_name : '',
          brand_logo: campaign ? campaign.brand_logo : '🎁',
          title: campaign ? campaign.title : '',
          instructions: campaign ? campaign.instructions : '',
          expiry_date: campaign ? campaign.expiry_date : null,
          claimed_at: new Date().toISOString()
        }
      };
    } catch (err) {
      this._safeRollback();
      // Nếu xảy ra lỗi xung đột Unique Constraint do race condition đồng thời, tra cứu lại voucher đã được gán
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        try {
          const fallback = db.prepare(`
            SELECT vc.*, c.brand_name, c.brand_logo, c.title, c.instructions, c.expiry_date
            FROM voucher_codes vc
            JOIN voucher_campaigns c ON vc.campaign_id = c.id
            WHERE (vc.claimed_response_id = ? AND ? IS NOT NULL) 
               OR (vc.survey_id = ? AND vc.claimed_by_user_id = ? AND ? IS NOT NULL)
          `).get(responseId || null, responseId || null, surveyId || null, userId, surveyId || null);

          if (fallback) {
            return {
              claimed: true,
              isNew: false,
              voucher: {
                id: fallback.id,
                code: fallback.code,
                brand_name: fallback.brand_name,
                brand_logo: fallback.brand_logo,
                title: fallback.title,
                instructions: fallback.instructions,
                expiry_date: fallback.expiry_date,
                claimed_at: fallback.claimed_at
              }
            };
          }
        } catch (fbErr) {
          // Bỏ qua lỗi fallback
        }
      }
      throw err;
    }
  }

  /**
   * 5. Người dùng dùng điểm đổi voucher thương hiệu (Atomic point deduction & voucher assignment)
   */
  redeemCatalogVoucher(userId, campaignId) {
    if (!userId || !campaignId) {
      throw new Error('Thiếu userId hoặc campaignId');
    }

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // 1. Kiểm tra campaign
      const campaign = db.prepare(`
        SELECT * FROM voucher_campaigns 
        WHERE id = ? AND voucher_type = 'PLATFORM_CATALOG'
      `).get(campaignId);

      if (!campaign) {
        throw new Error('Loại voucher thương hiệu không tồn tại');
      }

      if (campaign.remaining_quantity <= 0) {
        // Tự động bổ sung 25 mã mới cho catalog thương hiệu nền tảng để trải nghiệm không bị gián đoạn
        const autoReplenishCodes = [];
        for (let i = 1; i <= 25; i++) {
          const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
          const cleanBrand = campaign.brand_name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          autoReplenishCodes.push(`${cleanBrand}-${randHex}-${Math.floor(1000 + Math.random() * 9000)}`);
        }

        const insertStmt = db.prepare(`
          INSERT INTO voucher_codes (id, campaign_id, survey_id, code, status)
          VALUES (?, ?, NULL, ?, 'AVAILABLE')
        `);
        for (const c of autoReplenishCodes) {
          insertStmt.run(crypto.randomUUID(), campaignId, c);
        }

        db.prepare(`
          UPDATE voucher_campaigns 
          SET total_quantity = total_quantity + 25, remaining_quantity = remaining_quantity + 25 
          WHERE id = ?
        `).run(campaignId);
      }

      // 2. Kiểm tra người dùng và số dư điểm
      const user = db.prepare('SELECT id, point_balance, status FROM users WHERE id = ?').get(userId);
      if (!user) throw new Error('Người dùng không tồn tại');
      if (user.status !== 'ACTIVE') throw new Error('Tài khoản của bạn đang bị khóa hoặc hạn chế giao dịch');

      const pointsCost = campaign.points_cost;
      if (user.point_balance < pointsCost) {
        throw new Error(`Bạn cần ${pointsCost.toLocaleString()} điểm để đổi voucher này (Hiện có: ${user.point_balance.toLocaleString()} điểm)`);
      }

      // 3. Lấy 1 mã voucher có sẵn
      let availableCode = db.prepare(`
        SELECT id, code FROM voucher_codes 
        WHERE campaign_id = ? AND status = 'AVAILABLE' 
        LIMIT 1
      `).get(campaignId);

      if (!availableCode) {
        // Bổ sung mã dự phòng tức thì nếu vừa bị lấy hết
        const fallbackCode = `${campaign.brand_name.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const newCodeId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO voucher_codes (id, campaign_id, survey_id, code, status)
          VALUES (?, ?, NULL, ?, 'AVAILABLE')
        `).run(newCodeId, campaignId, fallbackCode);

        db.prepare('UPDATE voucher_campaigns SET remaining_quantity = remaining_quantity + 1 WHERE id = ?').run(campaignId);
        availableCode = { id: newCodeId, code: fallbackCode };
      }

      // 4. Trừ điểm người dùng nguyên tử với chốt chặn point_balance >= pointsCost
      const deductPoints = db.prepare(`
        UPDATE users 
        SET point_balance = point_balance - ? 
        WHERE id = ? AND point_balance >= ? AND status = 'ACTIVE'
      `).run(pointsCost, userId, pointsCost);

      if (deductPoints.changes === 0) {
        throw new Error('Số dư điểm không đủ để thực hiện đổi voucher');
      }

      // 5. Cập nhật mã sang CLAIMED
      const claimCode = db.prepare(`
        UPDATE voucher_codes 
        SET status = 'CLAIMED', claimed_by_user_id = ?, claimed_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND status = 'AVAILABLE'
      `).run(userId, availableCode.id);

      if (claimCode.changes === 0) {
        throw new Error('Mã voucher đã được người khác đổi đồng thời, vui lòng thử lại');
      }

      // 6. Giảm số lượng còn lại
      db.prepare(`
        UPDATE voucher_campaigns 
        SET remaining_quantity = remaining_quantity - 1 
        WHERE id = ? AND remaining_quantity > 0
      `).run(campaignId);

      const updatedUser = db.prepare('SELECT point_balance FROM users WHERE id = ?').get(userId);

      // 7. Ghi nhận giao dịch sổ cái Double-Entry Ledger (Dùng PAYOUT_DEDUCT theo chuẩn CHECK constraint)
      const txId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO point_transactions (
          id, user_id, reference_id, tx_type, currency, amount, balance_after, description
        ) VALUES (?, ?, ?, 'PAYOUT_DEDUCT', 'POINT', ?, ?, ?)
      `).run(
        txId,
        userId,
        availableCode.id,
        -pointsCost,
        updatedUser.point_balance,
        `Đổi voucher thương hiệu: ${campaign.brand_name} - ${campaign.title}`
      );

      db.exec('COMMIT');

      return {
        success: true,
        message: `Đổi thành công voucher ${campaign.title}!`,
        voucher: {
          id: availableCode.id,
          code: availableCode.code,
          brand_name: campaign.brand_name,
          brand_logo: campaign.brand_logo,
          title: campaign.title,
          face_value_vnd: campaign.face_value_vnd,
          instructions: campaign.instructions,
          expiry_date: campaign.expiry_date,
          claimed_at: new Date().toISOString()
        },
        pointsDeducted: pointsCost,
        newPointBalance: updatedUser.point_balance
      };
    } catch (err) {
      this._safeRollback();
      throw err;
    }
  }

  /**
   * 6. Lấy danh sách voucher đã nhận của người dùng
   */
  getUserVouchers(userId) {
    if (!userId) return [];

    const vouchers = db.prepare(`
      SELECT 
        vc.id,
        vc.code,
        vc.status,
        vc.claimed_at,
        vc.survey_id,
        c.brand_name,
        c.brand_logo,
        c.title,
        c.face_value_vnd,
        c.instructions,
        c.expiry_date,
        c.voucher_type,
        s.title AS survey_title
      FROM voucher_codes vc
      JOIN voucher_campaigns c ON vc.campaign_id = c.id
      LEFT JOIN surveys s ON vc.survey_id = s.id
      WHERE vc.claimed_by_user_id = ?
      ORDER BY vc.claimed_at DESC
    `).all(userId);

    return vouchers;
  }
}

module.exports = new VoucherService();
