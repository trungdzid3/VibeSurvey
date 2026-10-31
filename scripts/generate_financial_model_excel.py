# -*- coding: utf-8 -*-
"""
Script tao Mo Hinh Tai Chinh & Tinh Toan Hoi Von VibeSurvey (Ban Chuan Khong Loi)
File xuat: MO_HINH_TAI_CHINH_HOI_VON_VIBESURVEY.xlsx
- Su dung ten sheet chuan: "Gia Dinh Dau Vao", "Dong Tien Hoi Von", "Du Phong 12 Thang"
- Dung write_string cho moi chuoi chu thich (khong de dau = o dau)
- 100% cong thuc chuan OpenXML tuong thich Microsoft Excel moi phien ban.
"""

import xlsxwriter
import os

OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "MO_HINH_TAI_CHINH_HOI_VON_V2.xlsx")

workbook = xlsxwriter.Workbook(OUTPUT_FILE)
workbook.set_calc_mode('auto')

# ==========================================
# DINH DANG STYLES (FINANCIAL MODELING STANDARD)
# ==========================================
font_family = "Segoe UI"

# Tieu de chinh
fmt_title = workbook.add_format({
    'font_name': font_family, 'font_size': 15, 'bold': True, 'font_color': '#FFFFFF',
    'bg_color': '#C2410C', 'align': 'left', 'valign': 'vcenter', 'border': 1
})
fmt_subtitle = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'italic': True, 'font_color': '#57534E',
    'align': 'left', 'valign': 'vcenter'
})

# Header bang
fmt_header = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'bold': True, 'font_color': '#09090B',
    'bg_color': '#E4E4E7', 'align': 'center', 'valign': 'vcenter', 'border': 1, 'text_wrap': True
})
fmt_header_accent = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'bold': True, 'font_color': '#FFFFFF',
    'bg_color': '#EA580C', 'align': 'center', 'valign': 'vcenter', 'border': 1, 'text_wrap': True
})

# Nhom de muc
fmt_section = workbook.add_format({
    'font_name': font_family, 'font_size': 10.5, 'bold': True, 'font_color': '#9A3412',
    'bg_color': '#FFEDD5', 'border': 1, 'align': 'left', 'valign': 'vcenter'
})

# O nhap gia dinh (INPUT CELL) - Mau vang nhat, chu dam, border xanh de nguoi dung nhap
fmt_input_num = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'bold': True, 'font_color': '#1E3A8A',
    'bg_color': '#FEF9C3', 'border': 1, 'align': 'right', 'num_format': '#,##0'
})
fmt_input_vnd = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'bold': True, 'font_color': '#1E3A8A',
    'bg_color': '#FEF9C3', 'border': 1, 'align': 'right', 'num_format': '#,##0" đ"'
})
fmt_input_pct = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'bold': True, 'font_color': '#1E3A8A',
    'bg_color': '#FEF9C3', 'border': 1, 'align': 'right', 'num_format': '0.0%'
})
fmt_input_text = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'bold': True, 'font_color': '#1E3A8A',
    'bg_color': '#FEF9C3', 'border': 1, 'align': 'center'
})

# O tinh toan (FORMULA / CALCULATION)
fmt_calc_vnd = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'border': 1, 'align': 'right', 'num_format': '#,##0" đ"'
})
fmt_calc_num = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'border': 1, 'align': 'right', 'num_format': '#,##0'
})
fmt_calc_pct = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'border': 1, 'align': 'right', 'num_format': '0.0%'
})

# O tong ket / KPI quan trong
fmt_kpi_label = workbook.add_format({
    'font_name': font_family, 'font_size': 9.5, 'bold': True, 'border': 1, 'bg_color': '#F4F4F5'
})
fmt_kpi_vnd = workbook.add_format({
    'font_name': font_family, 'font_size': 10, 'bold': True, 'border': 1, 'bg_color': '#F4F4F5',
    'align': 'right', 'num_format': '#,##0" đ"', 'font_color': '#09090B'
})
fmt_highlight_kpi = workbook.add_format({
    'font_name': font_family, 'font_size': 11, 'bold': True, 'border': 2, 'bg_color': '#DCFCE7',
    'align': 'right', 'num_format': '#,##0" đ"', 'font_color': '#166534'
})
fmt_highlight_months = workbook.add_format({
    'font_name': font_family, 'font_size': 11, 'bold': True, 'border': 2, 'bg_color': '#FEF3C7',
    'align': 'right', 'num_format': '0.0" Tháng"', 'font_color': '#92400E'
})

fmt_text = workbook.add_format({'font_name': font_family, 'font_size': 9.5, 'border': 1})
fmt_text_center = workbook.add_format({'font_name': font_family, 'font_size': 9.5, 'border': 1, 'align': 'center'})
fmt_note = workbook.add_format({'font_name': font_family, 'font_size': 8.5, 'italic': True, 'font_color': '#71717A', 'border': 1})

# Ten cac sheets chuan (khong chua dau cham hoac ky tu dac biet de tranh loi cong thuc)
SHEET1 = "Gia Dinh Dau Vao"
SHEET2 = "Dong Tien Hoi Von"
SHEET3 = "Du Phong 12 Thang"


# =====================================================================
# SHEET 1: BANG GIA DINH VA DU LIEU DAU VAO (INPUT ASSUMPTIONS)
# =====================================================================
ws1 = workbook.add_worksheet(SHEET1)
ws1.set_tab_color('#EA580C')
ws1.hide_gridlines(0)

ws1.set_column('A:A', 4)
ws1.set_column('B:B', 40)
ws1.set_column('C:C', 18)
ws1.set_column('D:D', 15)
ws1.set_column('E:E', 45)

ws1.merge_range('B2:E2', 'MÔ HÌNH DỰ TOÁN TÀI CHÍNH & THỜI GIAN HỒI VỐN - VIBESURVEY', fmt_title)
ws1.write_string('B3', 'Lưu ý: Các ô màu vàng nhạt [ ] là ô bạn có thể tự do thay đổi số liệu. Các ô còn lại tự động tính toán theo công thức.', fmt_subtitle)

# --- PHAN I: CHI PHI BAN DAU (CAPEX / ONE-OFF COSTS) ---
ws1.merge_range('B5:E5', 'I. CHI PHÍ ĐẦU TƯ BAN ĐẦU (CAPEX - TRẢ 1 LẦN DUY NHẤT)', fmt_section)
ws1.write_row('B6', ['Hạng Mục Chi Phí Khởi Tạo', 'Số Tiền (VNĐ)', 'Đơn Vị', 'Ghi Chú Giải Thích Thực Tế'], fmt_header)

capex_items = [
    ('Tài khoản Google Play Developer (25 USD)', 630000, 'Phí 1 lần', 'Đăng ký quyền phát hành APK trên Google Play Console'),
    ('Mua Tên Miền (.vn hoặc .com) năm đầu', 350000, 'Phí 1 lần', 'Tên miền thương hiệu chính thức (VD: vibesurvey.vn)'),
    ('Đăng ký kinh doanh & Thông báo Bộ Công Thương', 1500000, 'Phí 1 lần', 'Đăng ký website sàn TMĐT cung cấp dịch vụ trực tuyến'),
    ('Tích hợp Cổng Thanh Toán VietQR / Payout', 500000, 'Phí 1 lần', 'Phí kích hoạt webhook đối soát ngân hàng tự động'),
    ('Quỹ Thanh Khoản Trả Thưởng Mồi Ban Đầu', 5000000, 'Vốn lưu động', 'Tiền mặt có sẵn trong tài khoản để người dùng rút được ngay'),
    ('Chi phí dự phòng khởi tạo khác', 1000000, 'Dự phòng', 'Thiết kế nhận diện, server test, bảo mật ban đầu')
]

row = 7
for item in capex_items:
    ws1.write_string(f'B{row}', item[0], fmt_text)
    ws1.write_number(f'C{row}', item[1], fmt_input_vnd)
    ws1.write_string(f'D{row}', item[2], fmt_text_center)
    ws1.write_string(f'E{row}', item[3], fmt_note)
    row += 1

capex_total_row = row
ws1.write_string(f'B{row}', 'TỔNG VỐN ĐẦU TƯ BAN ĐẦU (TOTAL CAPEX)', fmt_kpi_label)
ws1.write_formula(f'C{row}', f'=SUM(C7:C{row-1})', fmt_highlight_kpi)
ws1.write_string(f'D{row}', 'VNĐ', fmt_header)
ws1.write_string(f'E{row}', 'Tổng số vốn tiền mặt cần có sẵn để bắt đầu vận hành', fmt_note)

# --- PHAN II: GIA DINH NGUOI DUNG NAP TIEN HANG THANG (MONTHLY USERS & DEPOSITS) ---
row += 2
ws1.merge_range(f'B{row}:E{row}', 'II. GIẢ ĐỊNH NGƯỜI TẠO KHẢO SÁT NẠP TIỀN HÀNG THÁNG (CREATOR DEPOSITS)', fmt_section)
row += 1
ws1.write_row(f'B{row}', ['Phân Khúc Khách Hàng', 'Số Người Nạp / Tháng', 'Mức Nạp TB (VNĐ)', 'Ghi Chú Đặc Thù Phân Khúc'], fmt_header)

row += 1
ws1.write_string(f'B{row}', '1. Sinh Viên (.edu.vn) - Đề tài NCKH, Khóa luận', fmt_text)
ws1.write_number(f'C{row}', 80, fmt_input_num)
ws1.write_number(f'D{row}', 45000, fmt_input_vnd)
ws1.write_string(f'E{row}', 'Mốc nạp 20k - 50k gom 50 - 100 mẫu khảo sát', fmt_note)

row += 1
ws1.write_string(f'B{row}', '2. Cá Nhân / Nghiên cứu thị trường độc lập', fmt_text)
ws1.write_number(f'C{row}', 40, fmt_input_num)
ws1.write_number(f'D{row}', 150000, fmt_input_vnd)
ws1.write_string(f'E{row}', 'Mốc nạp 100k - 200k gom 100 - 200 mẫu tiêu chuẩn', fmt_note)

row += 1
ws1.write_string(f'B{row}', '3. Doanh Nghiệp Vừa & Nhỏ (SME / Startup)', fmt_text)
ws1.write_number(f'C{row}', 10, fmt_input_num)
ws1.write_number(f'D{row}', 800000, fmt_input_vnd)
ws1.write_string(f'E{row}', 'Mốc nạp 500k - 1M gom 300 - 500 mẫu', fmt_note)

row += 1
ws1.write_string(f'B{row}', '4. Doanh Nghiệp Lớn (Enterprise B2B)', fmt_text)
ws1.write_number(f'C{row}', 2, fmt_input_num)
ws1.write_number(f'D{row}', 3000000, fmt_input_vnd)
ws1.write_string(f'E{row}', 'Gói 2M - 5M gom 1.000+ mẫu, bảo hành 1-1, xuất VAT', fmt_note)

row += 1
user_deposit_total_row = row
ws1.write_string(f'B{row}', 'Tổng Người Nạp & Tổng Tiền Nạp (GMV / Ký Quỹ)', fmt_kpi_label)
ws1.write_formula(f'C{row}', f'=SUM(C{row-4}:C{row-1})', fmt_kpi_vnd)
ws1.write_formula(f'D{row}', f'=(C{row-4}*D{row-4})+(C{row-3}*D{row-3})+(C{row-2}*D{row-2})+(C{row-1}*D{row-1})', fmt_highlight_kpi)
ws1.write_string(f'E{row}', 'Tổng số tiền Creator nạp vào ví Credit trên sàn mỗi tháng', fmt_note)

# --- PHAN III: TI LE BIEN LOI NHUAN SAN (TAKE-RATE) & DICH VU CONG THEM ---
row += 2
ws1.merge_range(f'B{row}:E{row}', 'III. BIÊN LỢI NHUẬN SÀN (TAKE-RATE) & NGUỒN THU PHỤ TRỢ', fmt_section)
row += 1
ws1.write_row(f'B{row}', ['Nguồn Doanh Thu Bổ Trợ Của Sàn', 'Giá Trị Giả Định', 'Đơn Vị', 'Ghi Chú Thực Tế Vận Hành'], fmt_header)

row += 1
take_rate_cell = f'C{row}'
ws1.write_string(f'B{row}', 'Tỷ lệ chiết khấu sàn bình quân (Avg Take-Rate)', fmt_text)
ws1.write_number(f'C{row}', 0.30, fmt_input_pct)
ws1.write_string(f'D{row}', '% trên GMV', fmt_text_center)
ws1.write_string(f'E{row}', 'Sàn giữ lại bình quân 30% tiền mẫu, 70% trả cho đáp viên', fmt_note)

row += 1
vip_count_cell = f'C{row}'
ws1.write_string(f'B{row}', 'Số gói Ghim VIP + Push APK bán được / tháng', fmt_text)
ws1.write_number(f'C{row}', 15, fmt_input_num)
ws1.write_string(f'D{row}', 'Gói (40k/gói)', fmt_text_center)
ws1.write_string(f'E{row}', 'Creator mua để gom mẫu hỏa tốc (Biên lợi nhuận > 90%)', fmt_note)

row += 1
voucher_gmv_cell = f'C{row}'
ws1.write_string(f'B{row}', 'Tổng giá trị Voucher Creator mua từ kho sàn', fmt_text)
ws1.write_number(f'C{row}', 3000000, fmt_input_vnd)
ws1.write_string(f'D{row}', 'VNĐ / tháng', fmt_text_center)
ws1.write_string(f'E{row}', 'Creator mua mã E-Voucher để tặng kèm người làm bài', fmt_note)

row += 1
voucher_comm_cell = f'C{row}'
ws1.write_string(f'B{row}', 'Hoa hồng chiết khấu bán Voucher thương hiệu', fmt_text)
ws1.write_number(f'C{row}', 0.08, fmt_input_pct)
ws1.write_string(f'D{row}', '% hoa hồng', fmt_text_center)
ws1.write_string(f'E{row}', 'Chiết khấu từ nhà phát hành voucher (Got It, UrBox, Shopee)', fmt_note)

row += 1
payout_count_cell = f'C{row}'
ws1.write_string(f'B{row}', 'Số lệnh rút tiền dưới 100k có thu phí 2.000đ', fmt_text)
ws1.write_number(f'C{row}', 120, fmt_input_num)
ws1.write_string(f'D{row}', 'Lệnh / tháng', fmt_text_center)
ws1.write_string(f'E{row}', 'Phí xử lý giao dịch rút tiền dưới 100.000đ', fmt_note)

# --- PHAN IV: CHI PHI DUY TRI CO DINH HANG THANG (MONTHLY OPEX) ---
row += 2
ws1.merge_range(f'B{row}:E{row}', 'IV. CHI PHÍ DUY TRÌ HÀNG THÁNG (OPEX: HẠ TẦNG, NHÂN SỰ, MARKETING)', fmt_section)
row += 1
ws1.write_row(f'B{row}', ['Khoản Mục Chi Phí Vận Hành Hàng Tháng', 'Chi Phí (VNĐ)', 'Tính Chất', 'Ghi Chú Cụ Thể'], fmt_header)

opex_start_row = row + 1
opex_items = [
    ('1. Thuê Máy Chủ VPS (Cloud Server Node.js + DB)', 250000, 'Cố định', 'VPS 2 Core, 4GB RAM (Hetzner / Vietnix / Oracle Cloud)'),
    ('2. Dịch vụ Email Transactional OTP (Brevo / SES)', 100000, 'Cố định', 'Gửi email xác thực OTP đăng ký & OTP sinh viên edu'),
    ('3. Cổng đối soát VietQR tự động (PayOS / Casso)', 100000, 'Cố định', 'Webhook xác nhận tiền nạp Creator 24/7 tức thì'),
    ('4. Lưu trữ đám mây Cloudflare R2 & Tên miền/tháng', 50000, 'Cố định', 'Lưu ảnh khảo sát, zero egress fee + phân bổ tên miền'),
    ('5. Lương Nhân Sự (Vận hành, CSKH, Kiểm duyệt form)', 3000000, 'Nhân sự', 'Giai đoạn đầu có thể đặt 0đ (tự làm) hoặc thuê CTV part-time'),
    ('6. Ngân sách mua Voucher sàn tài trợ khuyến mại', 1000000, 'Marketing', 'Mua voucher mồi để tặng đáp viên mới kích cầu'),
    ('7. Phí giao dịch chuyển khoản Payout ngân hàng', 300000, 'Biến phí', '~150 lệnh chuyển khoản duyệt thưởng x 2.000đ/lệnh'),
    ('8. Chi phí dự phòng phát sinh & bảo trì hệ thống', 500000, 'Dự phòng', 'Dự phòng lỗi, tải tăng đột biến, marketing học đường')
]

for item in opex_items:
    ws1.write_string(f'B{row+1}', item[0], fmt_text)
    ws1.write_number(f'C{row+1}', item[1], fmt_input_vnd)
    ws1.write_string(f'D{row+1}', item[2], fmt_text_center)
    ws1.write_string(f'E{row+1}', item[3], fmt_note)
    row += 1

opex_end_row = row
row += 1
opex_total_row = row
ws1.write_string(f'B{row}', 'TỔNG CHI PHÍ VẬN HÀNH HÀNG THÁNG (TOTAL OPEX)', fmt_kpi_label)
ws1.write_formula(f'C{row}', f'=SUM(C{opex_start_row}:C{opex_end_row})', fmt_highlight_kpi)
ws1.write_string(f'D{row}', 'VNĐ / tháng', fmt_header)
ws1.write_string(f'E{row}', 'Tổng số tiền phải bỏ ra mỗi tháng để duy trì web/app', fmt_note)


# =====================================================================
# SHEET 2: MO HINH DONG TIEN, DIEM HOA VON & THOI GIAN HOI VON
# =====================================================================
ws2 = workbook.add_worksheet(SHEET2)
ws2.set_tab_color('#16A34A')
ws2.hide_gridlines(0)

ws2.set_column('A:A', 4)
ws2.set_column('B:B', 40)
ws2.set_column('C:C', 20)
ws2.set_column('D:D', 15)
ws2.set_column('E:E', 45)

ws2.merge_range('B2:E2', 'BẢNG TÍNH ĐIỂM HÒA VỐN & THỜI GIAN HOÀN VỐN (SOLVER & METRICS)', fmt_title)
ws2.write_string('B3', 'Toàn bộ số liệu tự động tính toán. Khi bạn sửa dữ liệu bên Sheet 1, bảng này sẽ tự động giải toán lại ngay lập tức.', fmt_subtitle)

# --- PHAN I: DOANH THU THUAN CUA SAN HANG THANG ---
ws2.merge_range('B5:E5', 'I. DOANH THU THUẦN SÀN THỰC THU (PLATFORM NET REVENUE)', fmt_section)
ws2.write_row('B6', ['Khoản Mục Doanh Thu Sàn', 'Giá Trị (VNĐ)', 'Tỷ Lệ', 'Công Thức & Nguồn Tính'], fmt_header)

ws2.write_string('B7', '1. Doanh thu chiết khấu khảo sát (Take-Rate)', fmt_text)
ws2.write_formula('C7', f"='{SHEET1}'!D{user_deposit_total_row}*'{SHEET1}'!{take_rate_cell}", fmt_calc_vnd)
ws2.write_formula('D7', '=C7/C12', fmt_calc_pct)
ws2.write_string('E7', 'Tính từ: Tổng tiền nạp Creator nhân Tỷ lệ Take-Rate', fmt_note)

ws2.write_string('B8', '2. Doanh thu bán gói Ghim VIP + Push APK', fmt_text)
ws2.write_formula('C8', f"='{SHEET1}'!{vip_count_cell}*40000", fmt_calc_vnd)
ws2.write_formula('D8', '=C8/C12', fmt_calc_pct)
ws2.write_string('E8', 'Tính từ: Số gói Ghim VIP nhân đơn giá 40.000đ/gói', fmt_note)

ws2.write_string('B9', '3. Hoa hồng chiết khấu bán Voucher kho sàn', fmt_text)
ws2.write_formula('C9', f"='{SHEET1}'!{voucher_gmv_cell}*'{SHEET1}'!{voucher_comm_cell}", fmt_calc_vnd)
ws2.write_formula('D9', '=C9/C12', fmt_calc_pct)
ws2.write_string('E9', 'Tính từ: Tổng giá trị Voucher bán ra nhân % Hoa hồng', fmt_note)

ws2.write_string('B10', '4. Doanh thu phí rút tiền dưới 100k (2.000đ/lệnh)', fmt_text)
ws2.write_formula('C10', f"='{SHEET1}'!{payout_count_cell}*2000", fmt_calc_vnd)
ws2.write_formula('D10', '=C10/C12', fmt_calc_pct)
ws2.write_string('E10', 'Tính từ: Số lệnh rút tiền nhân phí 2.000đ/lệnh', fmt_note)

ws2.write_string('B11', '5. Thu nhập phụ trợ khác (Dự phòng)', fmt_text)
ws2.write_number('C11', 0, fmt_calc_vnd)
ws2.write_number('D11', 0, fmt_calc_pct)
ws2.write_string('E11', 'Nguồn thu phụ trợ khác trong tương lai', fmt_note)

ws2.write_string('B12', 'TỔNG DOANH THU THUẦN SÀN (NET REVENUE)', fmt_header_accent)
ws2.write_formula('C12', '=SUM(C7:C11)', fmt_highlight_kpi)
ws2.write_string('D12', '100.0%', fmt_header_accent)
ws2.write_string('E12', 'Tổng tiền thực tế sàn giữ lại được mỗi tháng', fmt_note)

# --- PHAN II: CHI PHI & LOI NHUAN RONG HANG THANG ---
ws2.merge_range('B14:E14', 'II. CHI PHÍ & LỢI NHUẬN HOẠT ĐỘNG RÒNG HÀNG THÁNG (EBITDA)', fmt_section)
ws2.write_row('B15', ['Chỉ Số Tài Chính', 'Giá Trị (VNĐ)', 'Tỷ Suất', 'Ý Nghĩa Quản Trị'], fmt_header)

ws2.write_string('B16', '1. Tổng Doanh Thu Thuần Hàng Tháng', fmt_text)
ws2.write_formula('C16', '=C12', fmt_calc_vnd)
ws2.write_number('D16', 1.0, fmt_calc_pct)
ws2.write_string('E16', 'Chuyển từ mục Tổng Doanh Thu Thuần ở trên', fmt_note)

ws2.write_string('B17', '2. Tổng Chi Phí Vận Hành Hàng Tháng (OpEx)', fmt_text)
ws2.write_formula('C17', f"='{SHEET1}'!C{opex_total_row}", fmt_calc_vnd)
ws2.write_formula('D17', '=C17/C16', fmt_calc_pct)
ws2.write_string('E17', 'Server, email, cổng TT, nhân sự, voucher sàn, dự phòng', fmt_note)

ws2.write_string('B18', '3. LỢI NHUẬN HOẠT ĐỘNG RÒNG (MONTHLY NET PROFIT)', fmt_header_accent)
ws2.write_formula('C18', '=C16-C17', fmt_highlight_kpi)
ws2.write_formula('D18', '=C18/C16', fmt_header_accent)
ws2.write_string('E18', 'Tiền lời thực tế còn lại sau khi trừ hết chi phí vận hành', fmt_note)

# --- PHAN III: CHI SO HOI VON & DIEM HOA VON (BREAK-EVEN ANALYSIS) ---
ws2.merge_range('B20:E20', 'III. PHÂN TÍCH ĐIỂM HÒA VỐN & THỜI GIAN HOÀN VỐN (SOLVER METRICS)', fmt_section)
ws2.write_row('B21', ['Chỉ Số Tính Toán Hồi Vốn', 'Kết Quả Tính Toán', 'Đơn Vị', 'Ý Nghĩa & Cách Diễn Giải'], fmt_header)

ws2.write_string('B22', '1. Doanh thu thuần để hòa vốn hàng tháng', fmt_text)
ws2.write_formula('C22', '=C17', fmt_calc_vnd)
ws2.write_string('D22', 'VNĐ / tháng', fmt_text_center)
ws2.write_string('E22', 'Sàn cần thu về tối thiểu số tiền này mỗi tháng để không lỗ', fmt_note)

ws2.write_string('B23', '2. Tổng tiền Creator phải nạp (GMV) để hòa vốn', fmt_text)
ws2.write_formula('C23', f"=(C22-C8-C9-C10)/'{SHEET1}'!{take_rate_cell}", fmt_calc_vnd)
ws2.write_string('D23', 'VNĐ nạp / tháng', fmt_text_center)
ws2.write_string('E23', 'Tổng tiền nạp tối thiểu cần có để phần Take-Rate đủ bù OpEx', fmt_note)

ws2.write_string('B24', '3. Số khách hàng Creator nạp tiền để hòa vốn', fmt_text)
ws2.write_formula('C24', f"=C23/('{SHEET1}'!D{user_deposit_total_row}/'{SHEET1}'!C{user_deposit_total_row})", fmt_calc_num)
ws2.write_string('D24', 'Người nạp / tháng', fmt_text_center)
ws2.write_string('E24', 'Số khách nạp tiền bình quân mỗi tháng để sàn đạt điểm hòa vốn', fmt_note)

ws2.write_string('B25', '4. Tổng vốn đầu tư ban đầu cần thu hồi (CapEx)', fmt_text)
ws2.write_formula('C25', f"='{SHEET1}'!C{capex_total_row}", fmt_calc_vnd)
ws2.write_string('D25', 'VNĐ', fmt_text_center)
ws2.write_string('E25', 'Google Play, tên miền, BCT, quỹ trả thưởng mồi...', fmt_note)

ws2.write_string('B26', '5. THỜI GIAN HOÀN VỐN ĐẦU TƯ (PAYBACK PERIOD)', fmt_header_accent)
ws2.write_formula('C26', '=IF(C18<=0, 999, C25/C18)', fmt_highlight_months)
ws2.write_string('D26', 'Tháng', fmt_header_accent)
ws2.write_string('E26', 'Số tháng để lợi nhuận tích lũy bù đắp 100% vốn đầu tư ban đầu', fmt_note)

ws2.write_string('B27', '6. Tình trạng hoàn vốn (Solver Status)', fmt_text)
ws2.write_formula('C27', '=IF(C18<=0, "CHƯA HÒA VỐN (ĐANG LỖ)", IF(C26<=6, "HOÀN VỐN NHANH (<6T)", IF(C26<=12, "HOÀN VỐN KHẢ QUAN (6-12T)", "HOÀN VỐN TRUNG HẠN (>12T)")))', fmt_input_text)
ws2.write_string('D27', 'Đánh giá', fmt_text_center)
ws2.write_string('E27', 'Tự động cảnh báo về tốc độ hồi vốn theo mức lãi ròng', fmt_note)


# =====================================================================
# SHEET 3: DU PHONG DONG TIEN 12 THANG & PHAN TICH DO NHAY (SCENARIOS)
# =====================================================================
ws3 = workbook.add_worksheet(SHEET3)
ws3.set_tab_color('#2563EB')
ws3.hide_gridlines(0)

ws3.set_column('A:A', 4)
ws3.set_column('B:B', 34)
for col_letter in ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']:
    ws3.set_column(f'{col_letter}:{col_letter}', 14)

ws3.merge_range('B2:O2', 'DỰ PHÓNG DÒNG TIỀN RÒNG 12 THÁNG & PHÂN TÍCH ĐỘ NHẠY', fmt_title)
ws3.write_string('B3', 'Mô phỏng sự tăng trưởng người dùng qua 12 tháng và nhận diện chính xác thời điểm dòng tiền tích lũy chuyển sang số Dương.', fmt_subtitle)

# Header 12 thang
months_header = ['Chỉ Số / Mốc Thời Gian', 'Khởi Tạo (T0)'] + [f'Tháng {i}' for i in range(1, 13)] + ['Tổng Cộng (12T)']
ws3.write_row('B5', months_header, fmt_header_accent)

# 1. He so tang truong nguoi dung
growth_multipliers = [0, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.7, 2.0, 2.3, 2.7, 3.1, 3.5]
ws3.write_string('B6', 'Hệ số tăng trưởng quy mô (%)', fmt_text)
ws3.write_string('C6', '-', fmt_text_center)
for m_idx in range(1, 13):
    ws3.write_number(5, 2 + m_idx, growth_multipliers[m_idx], fmt_calc_pct)
ws3.write_string('O6', '-', fmt_text_center)

# 2. Doanh thu thuan
ws3.write_string('B7', '1. Doanh Thu Thuần Sàn (VNĐ)', fmt_text)
ws3.write_number('C7', 0, fmt_calc_vnd)
for m_idx in range(1, 13):
    col_let = xlsxwriter.utility.xl_col_to_name(2 + m_idx)
    ws3.write_formula(f'{col_let}7', f"='{SHEET2}'!C12*{col_let}6", fmt_calc_vnd)
ws3.write_formula('O7', '=SUM(D7:N7)', fmt_highlight_kpi)

# 3. Chi phi van hanh
opex_growth = [0, 0.7, 0.8, 0.9, 1.0, 1.05, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7]
ws3.write_string('B8', '2. Chi Phí Vận Hành OpEx (VNĐ)', fmt_text)
ws3.write_number('C8', 0, fmt_calc_vnd)
for m_idx in range(1, 13):
    col_let = xlsxwriter.utility.xl_col_to_name(2 + m_idx)
    ws3.write_formula(f'{col_let}8', f"='{SHEET2}'!C17*{opex_growth[m_idx]}", fmt_calc_vnd)
ws3.write_formula('O8', '=SUM(D8:N8)', fmt_kpi_vnd)

# 4. Dong tien hoat dong thang
ws3.write_string('B9', '3. Dòng Tiền Hoạt Động Tháng (VNĐ)', fmt_header)
ws3.write_number('C9', 0, fmt_calc_vnd)
for m_idx in range(1, 13):
    col_let = xlsxwriter.utility.xl_col_to_name(2 + m_idx)
    ws3.write_formula(f'{col_let}9', f"={col_let}7-{col_let}8", fmt_calc_vnd)
ws3.write_formula('O9', '=SUM(D9:N9)', fmt_highlight_kpi)

# 5. Von dau tu ban dau CapEx
ws3.write_string('B10', '4. Vốn Đầu Tư Ban Đầu CapEx (VNĐ)', fmt_text)
ws3.write_formula('C10', f"='{SHEET1}'!C{capex_total_row}", fmt_calc_vnd)
for m_idx in range(1, 13):
    col_let = xlsxwriter.utility.xl_col_to_name(2 + m_idx)
    ws3.write_number(f'{col_let}10', 0, fmt_calc_vnd)
ws3.write_formula('O10', '=C10', fmt_calc_vnd)

# 6. Dong tien tich luy
ws3.write_string('B11', '5. DÒNG TIỀN TÍCH LŨY (VNĐ)', fmt_header_accent)
ws3.write_formula('C11', '=-C10', fmt_highlight_kpi)
for m_idx in range(1, 13):
    col_let = xlsxwriter.utility.xl_col_to_name(2 + m_idx)
    prev_col = xlsxwriter.utility.xl_col_to_name(1 + m_idx)
    ws3.write_formula(f'{col_let}11', f"={prev_col}11+{col_let}9", fmt_highlight_kpi)
ws3.write_formula('O11', '=N11', fmt_highlight_kpi)

# 7. Trang thai thu hoi von
ws3.write_string('B12', 'Trạng thái thu hồi vốn', fmt_text)
ws3.write_string('C12', 'Âm vốn ban đầu', fmt_note)
for m_idx in range(1, 13):
    col_let = xlsxwriter.utility.xl_col_to_name(2 + m_idx)
    ws3.write_formula(f'{col_let}12', f'=IF({col_let}11>=0, "ĐÃ HỒI VỐN", "Đang thu hồi")', fmt_note)
ws3.write_formula('O12', '=IF(O11>=0, "CÓ LÃI RÒNG", "Chưa hồi đủ")', fmt_note)

# --- PHAN II: BANG PHAN TICH DO NHAY 3 KICH BAN (SCENARIOS TABLE) ---
ws3.merge_range('B15:H15', 'BẢNG SO SÁNH ĐỘ NHẠY 3 KỊCH BẢN VẬN HÀNH (SCENARIO SENSITIVITY MATRIX)', fmt_section)
ws3.write_row('B16', ['Kịch Bản Kinh Doanh', 'Số Người Nạp / Tháng', 'GMV Nạp (VNĐ)', 'Doanh Thu Thuần (VNĐ)', 'Chi Phí OpEx (VNĐ)', 'Lãi Ròng / Tháng (VNĐ)', 'Thời Gian Hồi Vốn (Tháng)'], fmt_header)

scenarios = [
    ('1. Kịch Bản Thận Trọng (Conservative - 50% kỳ vọng)', 0.50),
    ('2. Kịch Bản Cơ Sở (Base Case - 100% giả định)', 1.00),
    ('3. Kịch Bản Lạc Quan (Optimistic - 180% tăng trưởng)', 1.80)
]

s_row = 17
for sc in scenarios:
    factor = sc[1]
    ws3.write_string(f'B{s_row}', sc[0], fmt_text)
    ws3.write_formula(f'C{s_row}', f"='{SHEET1}'!C{user_deposit_total_row}*{factor}", fmt_calc_num)
    ws3.write_formula(f'D{s_row}', f"='{SHEET1}'!D{user_deposit_total_row}*{factor}", fmt_calc_vnd)
    ws3.write_formula(f'E{s_row}', f"='{SHEET2}'!C12*{factor}", fmt_calc_vnd)
    ws3.write_formula(f'F{s_row}', f"='{SHEET2}'!C17*(1 + ({factor}-1)*0.25)", fmt_calc_vnd)
    ws3.write_formula(f'G{s_row}', f'=E{s_row}-F{s_row}', fmt_highlight_kpi)
    ws3.write_formula(f'H{s_row}', f"=IF(G{s_row}<=0, 999, '{SHEET2}'!C25/G{s_row})", fmt_highlight_months)
    s_row += 1

ws3.write_string('B21', 'Hướng dẫn sử dụng:', fmt_kpi_label)
ws3.merge_range('C21:H21', 'Chỉ cần chỉnh sửa các số liệu giả định tại Sheet 1, toàn bộ bảng dự phóng 12 tháng và 3 kịch bản độ nhạy sẽ tự động giải toán (Solver) lại tức thì!', fmt_note)

workbook.close()
print(f"[HOAN TAT] Da tao tep Excel thanh cong: {OUTPUT_FILE}")
