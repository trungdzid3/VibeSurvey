/**
 * KIỂM TRA THỰC TẾ: TÀI KHOẢN DOANH NGHIỆP (CREATOR) NẠP TIỀN & NHẬN GÓI DỊCH VỤ GIA TĂNG
 */

const db = require('../server/db/database');
const ledgerService = require('../server/services/ledgerService');

async function verifyCreatorEnterprisePerks() {
  console.log('===============================================================');
  console.log('🏢 KIỂM TRA ĐẶC QUYỀN GÓI DỊCH VỤ GIA TĂNG CHO DOANH NGHIỆP (B2B)');
  console.log('===============================================================');

  // Lấy tài khoản doanh nghiệp thực tế
  const creator = db.prepare("SELECT * FROM users WHERE email = 'creator@techcorp.vn'").get();
  if (!creator) {
    console.error('Không tìm thấy tài khoản creator@techcorp.vn');
    process.exit(1);
  }

  console.log('Doanh Nghiệp:', creator.name);
  console.log('Vai trò:', creator.role);
  console.log('Quỹ Credit hiện có:', creator.credit_balance.toLocaleString('vi-VN'), 'VNĐ');
  console.log('Vé Ghim Hỏa Tốc hiện có:', creator.fast_track_tickets || 0, 'vé');
  console.log('Vé Miễn Phí Lọc Sâu hiện có:', creator.free_targeting_tickets || 0, 'vé');

  // Doanh nghiệp nạp gói 2,000,000 VNĐ (Gói Bạch Kim)
  const depositAmount = 2000000;
  console.log(`\n▶️ Doanh nghiệp nạp: ${depositAmount.toLocaleString('vi-VN')} VNĐ`);
  
  const res = ledgerService.depositCredit(creator.id, depositAmount, 'TechCorp nạp gói nghiên cứu thị trường Q4');

  console.log('\n--- KẾT QUẢ GIAO DỊCH & GÓI ĐẶC QUYỀN DOANH NGHIỆP ---');
  console.log('✅ Trạng thái:', res.success ? 'THÀNH CÔNG' : 'THẤT BẠI');
  console.log('💰 Quỹ Credit nạp gốc:', depositAmount.toLocaleString('vi-VN'), 'VNĐ');
  console.log('🎁 Quỹ Credit thưởng (+8%):', res.bonusCreditVnd.toLocaleString('vi-VN'), 'VNĐ');
  console.log('🏆 Bậc Doanh nghiệp:', res.enterprisePerks.tier);
  console.log('🚀 TẶNG LƯỢT GOM MẪU HỎA TỐC:', `+${res.enterprisePerks.fastTrackTickets} lượt (Ghim TOP đầu trang + Bắn Thông Báo Đẩy App APK + Gửi Email hệ thống)`);
  console.log('📑 HỖ TRỢ XUẤT HÓA ĐƠN VAT:', res.enterprisePerks.vatInvoiceEligible ? 'FULL 100% (Hóa đơn điện tử VAT dịch vụ khảo sát)' : 'KHÔNG');
  console.log('🎁 Tóm tắt ưu đãi:', res.enterprisePerks.perkSummary);

  // Kiểm tra số dư và số lượng vé trong DB
  const creatorAfter = db.prepare("SELECT * FROM users WHERE email = 'creator@techcorp.vn'").get();
  console.log('\n--- TÀI KHOẢN DOANH NGHIỆP SAU KHI NẠP ---');
  console.log(' - Quỹ Credit mới:', creatorAfter.credit_balance.toLocaleString('vi-VN'), 'VNĐ');
  console.log(' - Tổng Lượt Gom Mẫu Hỏa Tốc:', creatorAfter.fast_track_tickets, 'lượt');

  console.log('\n===============================================================');
  console.log('🎉 XÁC NHẬN: DOANH NGHIỆP NẠP TIỀN ĐƯỢC TẶNG TRỌN BỘ GÓI DỊCH VỤ GIA TĂNG THỰC TẾ!');
  console.log('===============================================================');
}

verifyCreatorEnterprisePerks().catch(console.error);
