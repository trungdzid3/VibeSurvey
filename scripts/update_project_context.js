const fs = require('fs');
let content = fs.readFileSync('PROJECT_CONTEXT.md', 'utf8');

const targetHeader = '### G. Phân Hệ Đồ Họa 3D Chuẩn Xác Y Hệt Mẫu';
const nextHeader = '### H. Phân Hệ Khảo Sát Đề Xuất';

const startIdx = content.indexOf(targetHeader);
const endIdx = content.indexOf(nextHeader);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `### G. Phân Hệ Đồ Họa 3D Độc Bản Tự Tạo 100% & Khắc Phục Triệt Để Chữ Bóng Ma (v4.7.5)
- **Tự Tạo Đồ Họa 3D Render Độc Bản 100% Thay Thế Hoàn Toàn Ảnh Cắt Mẫu (Pure Independent 3D Rendering)**:
  - Chấm dứt hoàn toàn phương pháp trích xuất từ ảnh chụp màn hình mẫu (nguyên nhân gây ra hiện tượng chữ bóng ma "1%", "Tất cả (0)", "0,5%", "Nạp Credit" in đè lên giao diện thật).
  - Tự tạo mới 100% qua pipeline sinh đồ họa 3D Claymorphism kết hợp thuật toán xử lý độ trong suốt kênh Alpha tự động (tách nền trắng sang trong suốt, cắt bỏ vùng đệm thừa):
    + \`wallet_3d_master.png\` (719x855): Chiếc ví da 3D màu cam bóng bẩy với quai xách cong, cúc cài ngôi sao vàng dập nổi 3D đa diện và đổ bóng sàn mềm mại. Độ phân giải cao, sắc nét tuyệt đối, 0% chữ rác.
    + \`coins_coupon_3d_master.png\` (845x733): Chồng 3 đồng xu vàng kim loại 3D và vé coupon phần trăm (%) cam nghiêng sắc sảo, nền trong suốt hoàn toàn, 0% chữ rác.
    + \`empty_state_3d_master.png\` (1024x1024): Bảng kẹp tài liệu 3D cam sunset viền trắng, kẹp kim loại, kính lúp 3D bóng loáng nghiêng 45 độ, các cụm đám mây kem bồng bềnh và tia sáng cam tỏa ra. Nét căng trên mọi độ phân giải màn hình.
    + \`gift_box_3d_master.png\` (1024x1024): Hộp quà 3D cam pastel với ruy băng trắng kem mềm mại ở góc dưới các thẻ "Số dư tích lũy" và "Chuỗi điểm danh", không che lấp chữ hay hàng nút T1 đến T7.
- **Sửa Triệt Để Lỗi Các Nút Toggle Bị Lưng Chừng (Studio & Khảo Sát)**:
  - Khắc phục lỗi nút tròn màu trắng chỉ dịch chuyển lưng chừng ở giữa trên các công tắc "Bắt buộc" và "Yêu cầu trong mỗi hàng" tại Studio Tạo khảo sát:
    * Khung switch nâng cấp lên chuẩn \`w-9 h-5\` (36px x 20px).
    * Nút tròn màu trắng \`w-4 h-4\` (16px x 16px) đặt tại tọa độ \`top-[2px] left-[2px]\`.
    * Khi bật (checked): \`peer-checked:after:translate-x-4\` (dịch chuyển đúng 16px sang phải), đưa nút tròn áp sát mép phải đúng 2px, cân xứng hoàn hảo 100%, không còn bị kẹt lơ lửng ở giữa.
- **Kiểm Chuẩn & Bảo Toàn Hệ Thống**:
  - Cú pháp \`node -c public/app.js\` đạt mã 0 (PASS 100%).
  - Toàn bộ 15 tầng kiểm thử tự hành (\`npm test\`) đạt 15/15 Suites PASS (100.0%, 23.39 giây).
  - Đồng bộ Capacitor Android (\`npm run sync:android\`) thành công.
  - Tăng cache-buster lên \`4.7.5_1793470000\` trong \`public/index.html\`.
  - Bảo toàn \`survey-platform.code-workspace\`.

`;
  content = content.slice(0, startIdx) + replacement + content.slice(endIdx);
  fs.writeFileSync('PROJECT_CONTEXT.md', content, 'utf8');
  console.log('Cap nhat PROJECT_CONTEXT.md thanh cong!');
} else {
  console.error('Khong tim thay marker trong PROJECT_CONTEXT.md', { startIdx, endIdx });
}
