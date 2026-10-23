const voucherService = require('../services/voucherService');

class VoucherController {
  /**
   * GET /api/v1/vouchers/catalog
   * Lấy danh mục Voucher thương hiệu trên Chợ Voucher
   */
  getCatalog(req, res) {
    try {
      const vouchers = voucherService.listCatalogVouchers();
      return res.json({
        success: true,
        catalog: vouchers,
        vouchers,
        count: vouchers.length
      });
    } catch (err) {
      console.error('Lỗi getCatalog vouchers:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải danh mục voucher: ' + err.message });
    }
  }

  /**
   * POST /api/v1/vouchers/catalog/:id/redeem hoặc POST /api/v1/vouchers/redeem
   * Đổi Voucher từ Chợ Voucher bằng điểm tích lũy
   */
  redeemCatalog(req, res) {
    try {
      const user = req.user;
      const campaignId = req.params.id || req.body.campaign_id || req.body.voucher_campaign_id || req.body.id;

      if (!campaignId) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn voucher cần đổi' });
      }

      const result = voucherService.redeemCatalogVoucher(user.id, campaignId);
      return res.json({
        success: true,
        message: 'Đổi voucher thành công! Mã ưu đãi đã được lưu an toàn vào Ví Voucher của bạn.',
        ...result
      });
    } catch (err) {
      console.error('Lỗi redeemCatalog voucher:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  redeemVoucher(req, res) {
    return this.redeemCatalog(req, res);
  }

  /**
   * POST /api/v1/vouchers/sponsor-upload
   * Creator tài trợ voucher của họ bằng cách tải lên danh sách mã (Zero Cash Model)
   */
  uploadSponsorVouchers(req, res) {
    try {
      const user = req.user;
      const {
        brand_name,
        brand_logo,
        title,
        face_value_vnd,
        instructions,
        expiry_date,
        survey_id,
        codes
      } = req.body;

      if (!brand_name || !title) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên thương hiệu và tiêu đề voucher' });
      }

      let codesArray = [];
      if (Array.isArray(codes)) {
        codesArray = codes;
      } else if (typeof codes === 'string') {
        codesArray = codes.split(/[\r\n,]+/).map(c => c.trim()).filter(Boolean);
      }

      if (codesArray.length === 0) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ít nhất 1 mã voucher hợp lệ' });
      }

      const campaignData = {
        brand_name,
        brand_logo: brand_logo || '🎁',
        title,
        face_value_vnd: face_value_vnd || 0,
        instructions: instructions || '',
        expiry_date: expiry_date || null,
        survey_id: survey_id || null
      };

      const result = voucherService.createSponsorVoucherCampaign(user.id, campaignData, codesArray);

      return res.status(201).json({
        success: true,
        message: `Đã tải lên và kích hoạt thành công ${result.totalCodes} mã voucher tài trợ!`,
        campaign: result
      });
    } catch (err) {
      console.error('Lỗi uploadSponsorVouchers:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/vouchers/my-vouchers
   * Lấy danh sách Voucher người dùng đang sở hữu
   */
  getMyVouchers(req, res) {
    try {
      const user = req.user;
      const vouchers = voucherService.getUserVouchers(user.id);
      return res.json({
        success: true,
        vouchers,
        count: vouchers.length
      });
    } catch (err) {
      console.error('Lỗi getMyVouchers:', err);
      return res.status(500).json({ success: false, message: 'Lỗi tải ví voucher: ' + err.message });
    }
  }
}

module.exports = new VoucherController();
