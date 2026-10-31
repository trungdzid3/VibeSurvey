/**
 * matchingService.js - Thuật toán Đẩy Khảo sát Mục tiêu & Xếp hạng Bảng tin
 * Theo chỉ đạo chiến lược Gemini 4 Argon (SurvHub v2.0)
 */

class MatchingService {
  constructor() {
        this.UNIVERSITIES = [
      { code: 'ALL', name: 'Tất cả trường', domain: '', emailSuffix: [] },

      // I. ĐẠI HỌC QUỐC GIA HÀ NỘI (VNU)
      { code: 'VNU_HN', name: 'Đại học Quốc gia Hà Nội', shortName: 'ĐHQG Hà Nội', domain: 'vnu.edu.vn', emailSuffix: ['vnu.edu.vn'] },
      { code: 'UET', name: 'Trường ĐH Công nghệ - ĐHQGHN', shortName: 'Công nghệ VNU', domain: 'uet.vnu.edu.vn', emailSuffix: ['uet.vnu.edu.vn', 'vnu.edu.vn'] },
      { code: 'HUS', name: 'Trường ĐH Khoa học Tự nhiên - ĐHQGHN', shortName: 'KHTN VNU', domain: 'hus.edu.vn', emailSuffix: ['hus.edu.vn', 'vnu.edu.vn'] },
      { code: 'USSH_HN', name: 'Trường ĐH Khoa học Xã hội và Nhân văn - ĐHQGHN', shortName: 'KHXH&NV VNU HN', domain: 'sv.ussh.edu.vn', emailSuffix: ['sv.ussh.edu.vn', 'ussh.edu.vn', 'vnu.edu.vn'] },
      { code: 'ULIS', name: 'Trường ĐH Ngoại ngữ - ĐHQGHN', shortName: 'Ngoại ngữ VNU', domain: 'ulis.vnu.edu.vn', emailSuffix: ['ulis.vnu.edu.vn', 'vnu.edu.vn'] },
      { code: 'UEB', name: 'Trường ĐH Kinh tế - ĐHQGHN', shortName: 'Kinh tế VNU', domain: 'ueb.edu.vn', emailSuffix: ['ueb.edu.vn', 'ueb.vnu.edu.vn', 'vnu.edu.vn'] },
      { code: 'UED_HN', name: 'Trường ĐH Giáo dục - ĐHQGHN', shortName: 'Giáo dục VNU', domain: 'education.vnu.edu.vn', emailSuffix: ['education.vnu.edu.vn', 'vnu.edu.vn'] },
      { code: 'UMP_HN', name: 'Trường ĐH Y Dược - ĐHQGHN', shortName: 'Y Dược VNU HN', domain: 'ump.vnu.edu.vn', emailSuffix: ['ump.vnu.edu.vn', 'vnu.edu.vn'] },
      { code: 'VJU', name: 'Trường ĐH Việt Nhật - ĐHQGHN', shortName: 'Việt Nhật VNU', domain: 'st.vju.ac.vn', emailSuffix: ['st.vju.ac.vn', 'vju.ac.vn', 'vnu.edu.vn'] },
      { code: 'UL_HN', name: 'Trường ĐH Luật - ĐHQGHN', shortName: 'Luật VNU', domain: 'law.vnu.edu.vn', emailSuffix: ['law.vnu.edu.vn', 'vnu.edu.vn'] },
      { code: 'HSB', name: 'Trường Quản trị và Kinh doanh - ĐHQGHN', shortName: 'HSB VNU', domain: 'hsb.edu.vn', emailSuffix: ['hsb.edu.vn', 'vnu.edu.vn'] },
      { code: 'IS_VNU', name: 'Trường Quốc tế - ĐHQGHN', shortName: 'Quốc tế VNU', domain: 'isvnu.vn', emailSuffix: ['isvnu.vn', 'vnu.edu.vn'] },
      { code: 'SIS_VNU', name: 'Trường Khoa học liên ngành và Nghệ thuật - ĐHQGHN', shortName: 'KHLN&NT VNU', domain: 'sis.vnu.edu.vn', emailSuffix: ['sis.vnu.edu.vn', 'vnu.edu.vn'] },

      // II. ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH (VNUHCM)
      { code: 'VNU_HCM', name: 'Đại học Quốc gia TP.HCM', shortName: 'ĐHQG TP.HCM', domain: 'vnuhcm.edu.vn', emailSuffix: ['vnuhcm.edu.vn'] },
      { code: 'HCMUT', name: 'Trường ĐH Bách khoa - ĐHQG-HCM', shortName: 'Bách Khoa HCM', domain: 'hcmut.edu.vn', emailSuffix: ['hcmut.edu.vn'] },
      { code: 'HCMUS', name: 'Trường ĐH Khoa học Tự nhiên - ĐHQG-HCM', shortName: 'KHTN HCM', domain: 'student.hcmus.edu.vn', emailSuffix: ['student.hcmus.edu.vn', 'hcmus.edu.vn'] },
      { code: 'UIT', name: 'Trường ĐH Công nghệ Thông tin - ĐHQG-HCM', shortName: 'CNTT VNU HCM', domain: 'uit.edu.vn', emailSuffix: ['gm.uit.edu.vn', 'ms.uit.edu.vn', 'uit.edu.vn'] },
      { code: 'USSH_HCM', name: 'Trường ĐH Khoa học Xã hội và Nhân văn - ĐHQG-HCM', shortName: 'KHXH&NV VNU HCM', domain: 'hcmussh.edu.vn', emailSuffix: ['hcmussh.edu.vn'] },
      { code: 'UEL', name: 'Trường ĐH Kinh tế - Luật - ĐHQG-HCM', shortName: 'Kinh Tế Luật HCM', domain: 'st.uel.edu.vn', emailSuffix: ['st.uel.edu.vn', 'uel.edu.vn'] },
      { code: 'HCMIU', name: 'Trường ĐH Quốc tế - ĐHQG-HCM', shortName: 'ĐH Quốc Tế HCM', domain: 'student.hcmiu.edu.vn', emailSuffix: ['student.hcmiu.edu.vn', 'hcmiu.edu.vn'] },
      { code: 'AGU', name: 'Trường ĐH An Giang - ĐHQG-HCM', shortName: 'ĐH An Giang', domain: 'student.agu.edu.vn', emailSuffix: ['student.agu.edu.vn', 'agu.edu.vn'] },
      { code: 'UHS', name: 'Trường ĐH Khoa học Sức khỏe - ĐHQG-HCM', shortName: 'Khoa học Sức khỏe HCM', domain: 'uhsvnu.edu.vn', emailSuffix: ['uhsvnu.edu.vn', 'medvnu.edu.vn'] },

      // III. CÁC ĐẠI HỌC VÙNG & ĐẠI HỌC ĐA NGÀNH
      { code: 'HUST', name: 'Đại học Bách khoa Hà Nội', shortName: 'Bách Khoa HN', domain: 'sis.hust.edu.vn', emailSuffix: ['sis.hust.edu.vn', 'hust.edu.vn'] },
      { code: 'NEU', name: 'Đại học Kinh tế Quốc dân', shortName: 'Kinh Tế Quốc Dân', domain: 'st.neu.edu.vn', emailSuffix: ['st.neu.edu.vn', 'neu.edu.vn'] },
      { code: 'UEH', name: 'Đại học Kinh tế TP.HCM', shortName: 'UEH', domain: 'st.ueh.edu.vn', emailSuffix: ['st.ueh.edu.vn', 'student.isb.edu.vn', 'ueh.edu.vn'] },
      { code: 'HAUI', name: 'Đại học Công nghiệp Hà Nội', shortName: 'Công nghiệp HN', domain: 'st.haui.edu.vn', emailSuffix: ['st.haui.edu.vn', 'haui.edu.vn'] },
      { code: 'UDN', name: 'Đại học Đà Nẵng', shortName: 'ĐH Đà Nẵng', domain: 'udn.vn', emailSuffix: ['udn.vn'] },
      { code: 'DUT', name: 'Trường ĐH Bách khoa - ĐH Đà Nẵng', shortName: 'Bách Khoa ĐN', domain: 'sv.dut.udn.vn', emailSuffix: ['sv.dut.udn.vn', 'dut.udn.vn', 'dut.edu.vn'] },
      { code: 'DUE', name: 'Trường ĐH Kinh tế - ĐH Đà Nẵng', shortName: 'Kinh Tế ĐN', domain: 'due.udn.vn', emailSuffix: ['due.udn.vn', 'due.edu.vn'] },
      { code: 'UED_DN', name: 'Trường ĐH Sư phạm - ĐH Đà Nẵng', shortName: 'Sư Phạm ĐN', domain: 'ued.udn.vn', emailSuffix: ['ued.udn.vn'] },
      { code: 'UFL_DN', name: 'Trường ĐH Ngoại ngữ - ĐH Đà Nẵng', shortName: 'Ngoại Ngữ ĐN', domain: 'ufl.udn.vn', emailSuffix: ['ufl.udn.vn'] },
      { code: 'UTE_DN', name: 'Trường ĐH Sư phạm Kỹ thuật - ĐH Đà Nẵng', shortName: 'SPKT ĐN', domain: 'ute.udn.vn', emailSuffix: ['ute.udn.vn'] },
      { code: 'VKU', name: 'Trường ĐH CNTT và Truyền thông Việt - Hàn', shortName: 'VKU Đà Nẵng', domain: 'vku.udn.vn', emailSuffix: ['vku.udn.vn'] },
      { code: 'HUEUNI', name: 'Đại học Huế', shortName: 'ĐH Huế', domain: 'hueuni.edu.vn', emailSuffix: ['hueuni.edu.vn', 'husc.edu.vn', 'dhs.edu.vn', 'huemed-univ.edu.vn', 'huaf.edu.vn', 'hce.edu.vn', 'huflis.edu.vn', 'hul.edu.vn'] },
      { code: 'TNU', name: 'Đại học Thái Nguyên', shortName: 'ĐH Thái Nguyên', domain: 'tnu.edu.vn', emailSuffix: ['tnu.edu.vn', 'tnut.edu.vn', 'tnufl.edu.vn', 'tnue.edu.vn', 'tump.edu.vn', 'tuaf.edu.vn', 'tueba.edu.vn', 'ictu.edu.vn', 'tnus.edu.vn'] },
      { code: 'CTU', name: 'Đại học Cần Thơ', shortName: 'ĐH Cần Thơ', domain: 'student.ctu.edu.vn', emailSuffix: ['student.ctu.edu.vn', 'ctu.edu.vn'] },
      { code: 'TVU', name: 'Đại học Trà Vinh', shortName: 'ĐH Trà Vinh', domain: 'st.tvu.edu.vn', emailSuffix: ['st.tvu.edu.vn', 'tvu.edu.vn'] },

      // IV. KHỐI KỸ THUẬT, CÔNG NGHỆ, XÂY DỰNG, GIAO THÔNG & CÔNG NGHIỆP
      { code: 'UTC', name: 'Trường ĐH Giao thông Vận tải', shortName: 'GTVT', domain: 'st.utc.edu.vn', emailSuffix: ['st.utc.edu.vn', 'lms.utc.edu.vn', 'utc.edu.vn'] },
      { code: 'VIMARU', name: 'Trường ĐH Hàng hải Việt Nam', shortName: 'Hàng Hải VIMARU', domain: 'st.vimaru.edu.vn', emailSuffix: ['st.vimaru.edu.vn', 'vimaru.edu.vn'] },
      { code: 'PTIT', name: 'Học viện Công nghệ Bưu chính Viễn thông', shortName: 'Bưu Chính PTIT', domain: 'stu.ptit.edu.vn', emailSuffix: ['stu.ptit.edu.vn', 'ptit.edu.vn'] },
      { code: 'TLU', name: 'Trường ĐH Thủy lợi', shortName: 'Thủy Lợi', domain: 'e.tlu.edu.vn', emailSuffix: ['e.tlu.edu.vn', 'tlu.edu.vn'] },
      { code: 'HUCE', name: 'Trường ĐH Xây dựng Hà Nội', shortName: 'Xây Dựng HN', domain: 'huce.edu.vn', emailSuffix: ['huce.edu.vn', 'nuce.edu.vn'] },
      { code: 'HAU', name: 'Trường ĐH Kiến trúc Hà Nội', shortName: 'Kiến Trúc HN', domain: 'hau.edu.vn', emailSuffix: ['hau.edu.vn', 'st.hau.edu.vn'] },
      { code: 'HUMG', name: 'Trường ĐH Mỏ - Địa chất', shortName: 'Mỏ Địa Chất', domain: 'sv.humg.edu.vn', emailSuffix: ['sv.humg.edu.vn', 'humg.edu.vn'] },
      { code: 'EPU', name: 'Trường ĐH Điện lực', shortName: 'Điện Lực EPU', domain: 'epu.edu.vn', emailSuffix: ['epu.edu.vn', 'st.epu.edu.vn'] },
      { code: 'UTT', name: 'Trường ĐH Công nghệ Giao thông Vận tải', shortName: 'CN GTVT', domain: 'st.utt.edu.vn', emailSuffix: ['st.utt.edu.vn', 'utt.edu.vn'] },
      { code: 'VNUF', name: 'Trường ĐH Lâm nghiệp', shortName: 'Lâm Nghiệp', domain: 'vnuf.edu.vn', emailSuffix: ['vnuf.edu.vn', 'st.vnuf.edu.vn'] },
      { code: 'UNETI', name: 'Trường ĐH Kinh tế - Kỹ thuật Công nghiệp', shortName: 'UNETI', domain: 'sv.uneti.edu.vn', emailSuffix: ['sv.uneti.edu.vn', 'uneti.edu.vn'] },
      { code: 'HCMUTE', name: 'Trường ĐH Sư phạm Kỹ thuật TP.HCM', shortName: 'SPKT TP.HCM', domain: 'student.hcmute.edu.vn', emailSuffix: ['student.hcmute.edu.vn', 'hcmute.edu.vn'] },
      { code: 'IUH', name: 'Trường ĐH Công nghiệp TP.HCM', shortName: 'Công Nghiệp HCM', domain: 'student.iuh.edu.vn', emailSuffix: ['student.iuh.edu.vn', 'iuh.edu.vn'] },
      { code: 'HUIT', name: 'Trường ĐH Công Thương TP.HCM', shortName: 'Công Thương HUIT', domain: 'st.huit.edu.vn', emailSuffix: ['st.huit.edu.vn', 'huit.edu.vn', 'hufi.edu.vn'] },
      { code: 'UTH', name: 'Trường ĐH Giao thông Vận tải TP.HCM', shortName: 'GTVT TP.HCM', domain: 'sv.ut.edu.vn', emailSuffix: ['sv.ut.edu.vn', 'ut.edu.vn'] },
      { code: 'NLU', name: 'Trường ĐH Nông Lâm TP.HCM', shortName: 'Nông Lâm HCM', domain: 'st.hcmuaf.edu.vn', emailSuffix: ['st.hcmuaf.edu.vn', 'nlu.edu.vn'] },
      { code: 'UAH', name: 'Trường ĐH Kiến trúc TP.HCM', shortName: 'Kiến Trúc HCM', domain: 'uah.edu.vn', emailSuffix: ['uah.edu.vn', 'st.uah.edu.vn'] },
      { code: 'CTUT', name: 'Trường ĐH Kỹ thuật - Công nghệ Cần Thơ', shortName: 'KTCN Cần Thơ', domain: 'student.ctuet.edu.vn', emailSuffix: ['student.ctuet.edu.vn', 'ctuet.edu.vn'] },
      { code: 'VAA', name: 'Học viện Hàng không Việt Nam', shortName: 'Hàng Không VAA', domain: 'vaa.edu.vn', emailSuffix: ['vaa.edu.vn', 'st.vaa.edu.vn'] },
      { code: 'KMA', name: 'Học viện Kỹ thuật Mật mã', shortName: 'Mật Mã KMA', domain: 'actvn.edu.vn', emailSuffix: ['actvn.edu.vn', 'kma.edu.vn'] },
      { code: 'UTEHY', name: 'Trường ĐH Sư phạm Kỹ thuật Hưng Yên', shortName: 'SPKT Hưng Yên', domain: 'utehy.edu.vn', emailSuffix: ['utehy.edu.vn', 'st.utehy.edu.vn'] },
      { code: 'NUTE', name: 'Trường ĐH Sư phạm Kỹ thuật Nam Định', shortName: 'SPKT Nam Định', domain: 'nute.edu.vn', emailSuffix: ['nute.edu.vn'] },
      { code: 'VUTE', name: 'Trường ĐH Sư phạm Kỹ thuật Vinh', shortName: 'SPKT Vinh', domain: 'vute.edu.vn', emailSuffix: ['vute.edu.vn'] },
      { code: 'MUCE', name: 'Trường ĐH Xây dựng Miền Trung', shortName: 'Xây Dựng Miền Trung', domain: 'muce.edu.vn', emailSuffix: ['muce.edu.vn'] },
      { code: 'MTU', name: 'Trường ĐH Xây dựng Miền Tây', shortName: 'Xây Dựng Miền Tây', domain: 'mtu.edu.vn', emailSuffix: ['mtu.edu.vn'] },
      { code: 'VUI', name: 'Trường ĐH Công nghiệp Việt - Trì', shortName: 'CN Việt Trì', domain: 'vui.edu.vn', emailSuffix: ['vui.edu.vn'] },
      { code: 'QUI', name: 'Trường ĐH Công nghiệp Quảng Ninh', shortName: 'CN Quảng Ninh', domain: 'qui.edu.vn', emailSuffix: ['qui.edu.vn'] },
      { code: 'VIU', name: 'Trường ĐH Công nghiệp Việt - Hung', shortName: 'CN Việt Hung', domain: 'viu.edu.vn', emailSuffix: ['viu.edu.vn'] },
      { code: 'SDU', name: 'Trường ĐH Sao Đỏ', shortName: 'Sao Đỏ', domain: 'saodo.edu.vn', emailSuffix: ['saodo.edu.vn'] },
      { code: 'BAFU', name: 'Trường ĐH Nông - Lâm Bắc Giang', shortName: 'Nông Lâm Bắc Giang', domain: 'bafu.edu.vn', emailSuffix: ['bafu.edu.vn'] },
      { code: 'GUST', name: 'Học viện Khoa học và Công nghệ (VAST)', shortName: 'Học Viện KHCN', domain: 'gust-vast.vn', emailSuffix: ['gust-vast.vn', 'vast.vn'] },

      // V. KHỐI KINH TẾ, TÀI CHÍNH, NGÂN HÀNG, THƯƠNG MẠI & LUẬT
      { code: 'FTU', name: 'Trường ĐH Ngoại thương', shortName: 'Ngoại Thương', domain: 'ftu.edu.vn', emailSuffix: ['ftu.edu.vn'] },
      { code: 'UFM', name: 'Trường ĐH Tài chính - Marketing', shortName: 'Tài Chính Marketing', domain: 'sv.ufm.edu.vn', emailSuffix: ['sv.ufm.edu.vn', 'ufm.edu.vn'] },
      { code: 'TMU', name: 'Trường ĐH Thương mại', shortName: 'Thương Mại', domain: 'sv.tmu.edu.vn', emailSuffix: ['sv.tmu.edu.vn', 'tmu.edu.vn'] },
      { code: 'BA', name: 'Học viện Ngân hàng', shortName: 'HV Ngân Hàng', domain: 'hvnh.edu.vn', emailSuffix: ['hvnh.edu.vn', 'st.hvnh.edu.vn', 'ba.edu.vn'] },
      { code: 'HUB', name: 'Trường ĐH Ngân hàng TP.HCM', shortName: 'ĐH Ngân Hàng HCM', domain: 'st.hub.edu.vn', emailSuffix: ['st.hub.edu.vn', 'st.buh.edu.vn', 'buh.edu.vn', 'hub.edu.vn'] },
      { code: 'AOF', name: 'Học viện Tài chính', shortName: 'HV Tài Chính', domain: 'sv.hvtc.edu.vn', emailSuffix: ['sv.hvtc.edu.vn', 'hvtc.edu.vn', 'aof.edu.vn'] },
      { code: 'HOU', name: 'Trường ĐH Mở Hà Nội', shortName: 'ĐH Mở HN', domain: 'sv.hou.edu.vn', emailSuffix: ['sv.hou.edu.vn', 'hou.edu.vn'] },
      { code: 'OU', name: 'Trường ĐH Mở TP.HCM', shortName: 'ĐH Mở HCM', domain: 'ou.edu.vn', emailSuffix: ['ou.edu.vn'] },
      { code: 'VNUA', name: 'Học viện Nông nghiệp Việt Nam', shortName: 'HV Nông Nghiệp', domain: 'sv.vnua.edu.vn', emailSuffix: ['sv.vnua.edu.vn', 'vnua.edu.vn'] },
      { code: 'HLU', name: 'Trường ĐH Luật Hà Nội', shortName: 'Luật Hà Nội', domain: 'hlu.edu.vn', emailSuffix: ['hlu.edu.vn', 'sv.hlu.edu.vn'] },
      { code: 'HCMULAW', name: 'Trường ĐH Luật TP.HCM', shortName: 'Luật TP.HCM', domain: 'hcmulaw.edu.vn', emailSuffix: ['hcmulaw.edu.vn'] },
      { code: 'DKS', name: 'Trường ĐH Kiểm sát Hà Nội', shortName: 'Kiểm Sát HPU', domain: 'tks.edu.vn', emailSuffix: ['tks.edu.vn'] },
      { code: 'NAPA', name: 'Học viện Hành chính Quốc gia', shortName: 'Học Viện Hành Chính', domain: 'napa.vn', emailSuffix: ['napa.vn', 'truongnoivu.edu.vn'] },
      { code: 'DAV', name: 'Học viện Ngoại giao', shortName: 'Ngoại Giao', domain: 'dav.edu.vn', emailSuffix: ['dav.edu.vn'] },
      { code: 'AJC', name: 'Học viện Báo chí và Tuyên truyền', shortName: 'Báo Chí AJC', domain: 'st.ajc.edu.vn', emailSuffix: ['st.ajc.edu.vn', 'ajc.edu.vn'] },
      { code: 'TUU', name: 'Trường ĐH Công đoàn', shortName: 'Công Đoàn TUU', domain: 'dhcd.edu.vn', emailSuffix: ['dhcd.edu.vn'] },
      { code: 'ULSA', name: 'Trường ĐH Lao động - Xã hội', shortName: 'Lao Động Xã Hội', domain: 'ulsa.edu.vn', emailSuffix: ['ulsa.edu.vn', 'ulsa2.edu.vn'] },
      { code: 'VWA', name: 'Học viện Phụ nữ Việt Nam', shortName: 'HV Phụ Nữ', domain: 'hvpnvn.edu.vn', emailSuffix: ['hvpnvn.edu.vn'] },
      { code: 'VYA', name: 'Học viện Thanh thiếu niên Việt Nam', shortName: 'HV Thanh Thiếu Niên', domain: 'vya.edu.vn', emailSuffix: ['vya.edu.vn'] },
      { code: 'NAEM', name: 'Học viện Quản lý Giáo dục', shortName: 'HV QL Giáo Dục', domain: 'naem.edu.vn', emailSuffix: ['naem.edu.vn'] },
      { code: 'UFA', name: 'Trường ĐH Tài chính - Kế toán (Quảng Ngãi)', shortName: 'TCKT Quảng Ngãi', domain: 'tckt.edu.vn', emailSuffix: ['tckt.edu.vn'] },
      { code: 'UFBA', name: 'Trường ĐH Tài chính - Quản trị kinh doanh', shortName: 'TC-QTKD Hưng Yên', domain: 'tcqtkd.edu.vn', emailSuffix: ['tcqtkd.edu.vn'] },

      // VI. KHỐI Y - DƯỢC & KHOA HỌC SỨC KHỎE
      { code: 'HMU', name: 'Trường ĐH Y Hà Nội', shortName: 'ĐH Y Hà Nội', domain: 'hmu.edu.vn', emailSuffix: ['daihocyhanoi.edu.vn', 'hmu.edu.vn'] },
      { code: 'HUP', name: 'Trường ĐH Dược Hà Nội', shortName: 'Dược Hà Nội', domain: 'hup.edu.vn', emailSuffix: ['hup.edu.vn', 'st.hup.edu.vn'] },
      { code: 'UMP', name: 'Trường ĐH Y Dược TP.HCM', shortName: 'ĐH Y Dược HCM', domain: 'ump.edu.vn', emailSuffix: ['ump.edu.vn', 'yds.edu.vn'] },
      { code: 'PNTU', name: 'Trường ĐH Y Khoa Phạm Ngọc Thạch', shortName: 'Phạm Ngọc Thạch', domain: 'pnt.edu.vn', emailSuffix: ['pnt.edu.vn'] },
      { code: 'CTUMP', name: 'Trường ĐH Y Dược Cần Thơ', shortName: 'Y Dược Cần Thơ', domain: 'student.ctump.edu.vn', emailSuffix: ['student.ctump.edu.vn', 'ctump.edu.vn'] },
      { code: 'HPMU', name: 'Trường ĐH Y Dược Hải Phòng', shortName: 'Y Dược Hải Phòng', domain: 'hpmu.edu.vn', emailSuffix: ['hpmu.edu.vn', 'st.hpmu.edu.vn'] },
      { code: 'TBUMP', name: 'Trường ĐH Y Dược Thái Bình', shortName: 'Y Dược Thái Bình', domain: 'tbump.edu.vn', emailSuffix: ['tbump.edu.vn'] },
      { code: 'VUTM', name: 'Học viện Y - Dược học Cổ truyền Việt Nam', shortName: 'Y Dược Cổ Truyền', domain: 'vutm.edu.vn', emailSuffix: ['vutm.edu.vn'] },
      { code: 'HUPH', name: 'Trường ĐH Y tế Công cộng', shortName: 'Y Tế Công Cộng', domain: 'huph.edu.vn', emailSuffix: ['huph.edu.vn', 'st.huph.edu.vn'] },
      { code: 'NDUN', name: 'Trường ĐH Điều dưỡng Nam Định', shortName: 'Điều Dưỡng Nam Định', domain: 'ndun.edu.vn', emailSuffix: ['ndun.edu.vn'] },
      { code: 'DUMTP', name: 'Trường ĐH Kỹ thuật Y - Dược Đà Nẵng', shortName: 'KTYD Đà Nẵng', domain: 'dhktyduocdn.edu.vn', emailSuffix: ['dhktyduocdn.edu.vn'] },
      { code: 'HMTU', name: 'Trường ĐH Kỹ thuật Y tế Hải Dương', shortName: 'KTYT Hải Dương', domain: 'hmtu.edu.vn', emailSuffix: ['hmtu.edu.vn'] },

      // VII. KHỐI SƯ PHẠM, NGOẠI NGỮ, VĂN HÓA, NGHỆ THUẬT & THỂ THAO
      { code: 'HNUE', name: 'Trường ĐH Sư phạm Hà Nội', shortName: 'Sư Phạm HN', domain: 'hnue.edu.vn', emailSuffix: ['hnue.edu.vn'] },
      { code: 'HCMUE', name: 'Trường ĐH Sư phạm TP.HCM', shortName: 'Sư Phạm HCM', domain: 'student.hcmue.edu.vn', emailSuffix: ['student.hcmue.edu.vn', 'hcmue.edu.vn'] },
      { code: 'HANU', name: 'Trường ĐH Hà Nội', shortName: 'ĐH Hà Nội', domain: 's.hanu.edu.vn', emailSuffix: ['s.hanu.edu.vn', 'hanu.edu.vn'] },
      { code: 'HPU2', name: 'Trường ĐH Sư phạm Hà Nội 2', shortName: 'Sư Phạm HN 2', domain: 'hpu2.edu.vn', emailSuffix: ['hpu2.edu.vn', 'sv.hpu2.edu.vn'] },
      { code: 'HUC', name: 'Trường ĐH Văn hóa Hà Nội', shortName: 'Văn Hóa HN', domain: 'huc.edu.vn', emailSuffix: ['huc.edu.vn', 'st.huc.edu.vn'] },
      { code: 'HCMUC', name: 'Trường ĐH Văn hóa TP.HCM', shortName: 'Văn Hóa HCM', domain: 'hcmuc.edu.vn', emailSuffix: ['hcmuc.edu.vn'] },
      { code: 'VNUFA', name: 'Trường ĐH Mỹ thuật Việt Nam', shortName: 'Mỹ Thuật VN', domain: 'mythuatvietnam.edu.vn', emailSuffix: ['mythuatvietnam.edu.vn'] },
      { code: 'UAD', name: 'Trường ĐH Mỹ thuật Công nghiệp', shortName: 'Mỹ Thuật Công Nghiệp', domain: 'mythuatcongnghiep.edu.vn', emailSuffix: ['mythuatcongnghiep.edu.vn'] },
      { code: 'HCMUFA', name: 'Trường ĐH Mỹ thuật TP.HCM', shortName: 'Mỹ Thuật HCM', domain: 'hcmufa.edu.vn', emailSuffix: ['hcmufa.edu.vn'] },
      { code: 'SKDA', name: 'Trường ĐH Sân khấu - Điện ảnh Hà Nội', shortName: 'Sân Khấu ĐA HN', domain: 'skda.edu.vn', emailSuffix: ['skda.edu.vn'] },
      { code: 'SKDAHCM', name: 'Trường ĐH Sân khấu - Điện ảnh TP.HCM', shortName: 'Sân Khấu ĐA HCM', domain: 'skdahcm.edu.vn', emailSuffix: ['skdahcm.edu.vn'] },
      { code: 'VNAM', name: 'Học viện Âm nhạc Quốc gia Việt Nam', shortName: 'HV Âm Nhạc QG', domain: 'vnam.edu.vn', emailSuffix: ['vnam.edu.vn'] },
      { code: 'HCMCONS', name: 'Nhạc viện TP. Hồ Chí Minh', shortName: 'Nhạc Viện HCM', domain: 'hcmcons.vn', emailSuffix: ['hcmcons.vn'] },
      { code: 'VNAD', name: 'Học viện Múa Việt Nam', shortName: 'HV Múa VN', domain: 'vnad.edu.vn', emailSuffix: ['vnad.edu.vn'] },
      { code: 'UPES1', name: 'Trường ĐH Thể dục Thể thao Bắc Ninh', shortName: 'TDTT Bắc Ninh', domain: 'upes1.edu.vn', emailSuffix: ['upes1.edu.vn'] },
      { code: 'UPES', name: 'Trường ĐH Thể dục Thể thao TP.HCM', shortName: 'TDTT HCM', domain: 'upes.edu.vn', emailSuffix: ['upes.edu.vn'] },
      { code: 'DSUPES', name: 'Trường ĐH Thể dục Thể thao Đà Nẵng', shortName: 'TDTT Đà Nẵng', domain: 'upes3.edu.vn', emailSuffix: ['upes3.edu.vn'] },
      { code: 'TUCST', name: 'Trường ĐH VH-TT-DL Thanh Hóa', shortName: 'VHTTDL Thanh Hóa', domain: 'dvtdt.edu.vn', emailSuffix: ['dvtdt.edu.vn'] },
      { code: 'NUAE', name: 'Trường ĐH Sư phạm Nghệ thuật TW', shortName: 'SP Nghệ Thuật TW', domain: 'spnttw.edu.vn', emailSuffix: ['spnttw.edu.vn'] },
      { code: 'HUPES', name: 'Trường ĐH Sư phạm TDTT Hà Nội', shortName: 'SP TDTT HN', domain: 'hupes.edu.vn', emailSuffix: ['hupes.edu.vn'] },
      { code: 'UPES2', name: 'Trường ĐH Sư phạm TDTT TP.HCM', shortName: 'SP TDTT HCM', domain: 'upes2.edu.vn', emailSuffix: ['upes2.edu.vn'] },

      // VIII. KHỐI ĐẠI HỌC ĐỊA PHƯƠNG & CÔNG LẬP TỰ CHỦ
      { code: 'TDTU', name: 'Trường ĐH Tôn Đức Thắng', shortName: 'Tôn Đức Thắng', domain: 'student.tdtu.edu.vn', emailSuffix: ['student.tdtu.edu.vn', 'tdtu.edu.vn'] },
      { code: 'DTHU', name: 'Trường ĐH Đồng Tháp', shortName: 'ĐH Đồng Tháp', domain: 'student.dthu.edu.vn', emailSuffix: ['student.dthu.edu.vn', 'dthu.edu.vn'] },
      { code: 'DNU_DN', name: 'Trường ĐH Đồng Nai', shortName: 'ĐH Đồng Nai', domain: 'dnpu.edu.vn', emailSuffix: ['dnpu.edu.vn', 'sv.dnpu.edu.vn'] },
      { code: 'NTU', name: 'Trường ĐH Nha Trang', shortName: 'ĐH Nha Trang', domain: 'ntu.edu.vn', emailSuffix: ['ntu.edu.vn', 'st.ntu.edu.vn'] },
      { code: 'UKH', name: 'Trường ĐH Khánh Hòa', shortName: 'ĐH Khánh Hòa', domain: 'ukh.edu.vn', emailSuffix: ['ukh.edu.vn'] },
      { code: 'SGU', name: 'Trường ĐH Sài Gòn', shortName: 'ĐH Sài Gòn', domain: 'sv.sgu.edu.vn', emailSuffix: ['sv.sgu.edu.vn', 'sgu.edu.vn'] },
      { code: 'TDMU', name: 'Trường ĐH Thủ Dầu Một', shortName: 'Thủ Dầu Một', domain: 'student.tdmu.edu.vn', emailSuffix: ['student.tdmu.edu.vn', 'tdmu.edu.vn'] },
      { code: 'VU', name: 'Trường ĐH Vinh', shortName: 'ĐH Vinh', domain: 'vinhuni.edu.vn', emailSuffix: ['vinhuni.edu.vn'] },
      { code: 'DHP_HP', name: 'Trường ĐH Hải Phòng', shortName: 'ĐH Hải Phòng', domain: 'dhhp.edu.vn', emailSuffix: ['dhhp.edu.vn'] },
      { code: 'HLU_QN', name: 'Trường ĐH Hạ Long', shortName: 'ĐH Hạ Long', domain: 'daihochalong.edu.vn', emailSuffix: ['daihochalong.edu.vn'] },
      { code: 'HDU', name: 'Trường ĐH Hồng Đức', shortName: 'Hồng Đức Thanh Hóa', domain: 'hdu.edu.vn', emailSuffix: ['hdu.edu.vn'] },
      { code: 'QNU', name: 'Trường ĐH Quy Nhơn', shortName: 'ĐH Quy Nhơn', domain: 'qnu.edu.vn', emailSuffix: ['qnu.edu.vn', 'st.qnu.edu.vn'] },
      { code: 'DLU', name: 'Trường ĐH Đà Lạt', shortName: 'ĐH Đà Lạt', domain: 'dlu.edu.vn', emailSuffix: ['dlu.edu.vn'] },
      { code: 'TTN', name: 'Trường ĐH Tây Nguyên', shortName: 'ĐH Tây Nguyên', domain: 'ttn.edu.vn', emailSuffix: ['ttn.edu.vn'] },
      { code: 'UTB', name: 'Trường ĐH Tây Bắc', shortName: 'ĐH Tây Bắc', domain: 'utb.edu.vn', emailSuffix: ['utb.edu.vn'] },
      { code: 'HVU', name: 'Trường ĐH Hùng Vương', shortName: 'ĐH Hùng Vương', domain: 'hvu.edu.vn', emailSuffix: ['hvu.edu.vn'] },
      { code: 'TQU', name: 'Trường ĐH Tân Trào', shortName: 'ĐH Tân Trào', domain: 'daihoctantrao.edu.vn', emailSuffix: ['daihoctantrao.edu.vn'] },
      { code: 'TBU', name: 'Trường ĐH Thái Bình', shortName: 'ĐH Thái Bình', domain: 'tbu.edu.vn', emailSuffix: ['tbu.edu.vn'] },
      { code: 'HLU_NB', name: 'Trường ĐH Hoa Lư', shortName: 'ĐH Hoa Lư', domain: 'hluv.edu.vn', emailSuffix: ['hluv.edu.vn'] },
      { code: 'HTU', name: 'Trường ĐH Hà Tĩnh', shortName: 'ĐH Hà Tĩnh', domain: 'htu.edu.vn', emailSuffix: ['htu.edu.vn'] },
      { code: 'QBU', name: 'Trường ĐH Quảng Bình', shortName: 'ĐH Quảng Bình', domain: 'qbu.edu.vn', emailSuffix: ['qbu.edu.vn'] },
      { code: 'QNAMUNI', name: 'Trường ĐH Quảng Nam', shortName: 'ĐH Quảng Nam', domain: 'qnamuni.edu.vn', emailSuffix: ['qnamuni.edu.vn'] },
      { code: 'PDU', name: 'Trường ĐH Phạm Văn Đồng', shortName: 'Phạm Văn Đồng', domain: 'pdu.edu.vn', emailSuffix: ['pdu.edu.vn'] },
      { code: 'PYU', name: 'Trường ĐH Phú Yên', shortName: 'ĐH Phú Yên', domain: 'pyu.edu.vn', emailSuffix: ['pyu.edu.vn'] },
      { code: 'TGU', name: 'Trường ĐH Tiền Giang', shortName: 'ĐH Tiền Giang', domain: 'tgu.edu.vn', emailSuffix: ['tgu.edu.vn'] },
      { code: 'KGU', name: 'Trường ĐH Kiên Giang', shortName: 'ĐH Kiên Giang', domain: 'vnkgu.edu.vn', emailSuffix: ['vnkgu.edu.vn'] },
      { code: 'BLU', name: 'Trường ĐH Bạc Liêu', shortName: 'ĐH Bạc Liêu', domain: 'blu.edu.vn', emailSuffix: ['blu.edu.vn'] },
      { code: 'VGU', name: 'Trường ĐH Việt - Đức', shortName: 'Việt Đức VGU', domain: 'student.vgu.edu.vn', emailSuffix: ['student.vgu.edu.vn', 'vgu.edu.vn'] },
      { code: 'USTH', name: 'Trường ĐH Khoa học và Công nghệ Hà Nội', shortName: 'Việt Pháp USTH', domain: 'st.usth.edu.vn', emailSuffix: ['st.usth.edu.vn', 'usth.edu.vn'] },

      // IX. KHỐI QUÂN ĐỘI & CÔNG AN
      { code: 'MTA', name: 'Học viện Kỹ thuật Quân sự (Lê Quý Đôn)', shortName: 'Kỹ Thuật Quân Sự', domain: 'mta.edu.vn', emailSuffix: ['mta.edu.vn', 'lqdtu.edu.vn'] },
      { code: 'VMMU', name: 'Học viện Quân y', shortName: 'Học Viện Quân Y', domain: 'vmmu.edu.vn', emailSuffix: ['vmmu.edu.vn'] },
      { code: 'MSA', name: 'Học viện Khoa học Quân sự', shortName: 'HV KH Quân Sự', domain: 'msa.edu.vn', emailSuffix: ['msa.edu.vn'] },
      { code: 'TCU', name: 'Trường Sĩ quan Thông tin', shortName: 'SQ Thông Tin', domain: 'tcu.edu.vn', emailSuffix: ['tcu.edu.vn'] },
      { code: 'C500', name: 'Học viện An ninh Nhân dân', shortName: 'An Ninh Nhân Dân', domain: 'hvannd.edu.vn', emailSuffix: ['hvannd.edu.vn'] },
      { code: 'PPA', name: 'Học viện Cảnh sát Nhân dân', shortName: 'Cảnh Sát Nhân Dân', domain: 'hvcsnd.edu.vn', emailSuffix: ['hvcsnd.edu.vn'] },
      { code: 'TDNU', name: 'Trường ĐH Trần Đại Nghĩa (Vinhempich)', shortName: 'Trần Đại Nghĩa', domain: 'tdnu.edu.vn', emailSuffix: ['tdnu.edu.vn'] },
      { code: 'UFP', name: 'Trường ĐH Phòng cháy Chữa cháy', shortName: 'PCCC', domain: 'daihocpccc.edu.vn', emailSuffix: ['daihocpccc.edu.vn'] },

      // X. KHỐI ĐẠI HỌC TƯ THỤC & QUỐC TẾ
      { code: 'FPT', name: 'Đại học FPT', shortName: 'FPT University', domain: 'fpt.edu.vn', emailSuffix: ['fpt.edu.vn', 'fe.edu.vn'] },
      { code: 'PHENIKAA', name: 'Đại học Phenikaa', shortName: 'Phenikaa', domain: 'st.phenikaa-uni.edu.vn', emailSuffix: ['st.phenikaa-uni.edu.vn', 'phenikaa-uni.edu.vn'] },
      { code: 'TLU_TL', name: 'Trường ĐH Thăng Long', shortName: 'Thăng Long', domain: 'thanglong.edu.vn', emailSuffix: ['thanglong.edu.vn'] },
      { code: 'DNU_HN', name: 'Trường ĐH Đại Nam', shortName: 'Đại Nam', domain: 'dainam.edu.vn', emailSuffix: ['dainam.edu.vn', 'sv.dainam.edu.vn'] },
      { code: 'EAUT', name: 'Trường ĐH Công nghệ Đông Á', shortName: 'Công Nghệ Đông Á', domain: 'eaut.edu.vn', emailSuffix: ['eaut.edu.vn', 'daihoccongnghedonga.edu.vn'] },
      { code: 'PDU_HN', name: 'Trường ĐH Phương Đông', shortName: 'Phương Đông', domain: 'phuongdong.edu.vn', emailSuffix: ['phuongdong.edu.vn'] },
      { code: 'TDU_HN', name: 'Trường ĐH Thành Đô', shortName: 'Thành Đô', domain: 'thanhdo.edu.vn', emailSuffix: ['thanhdo.edu.vn'] },
      { code: 'FBU', name: 'Trường ĐH Tài chính - Ngân hàng Hà Nội', shortName: 'FBU Hà Nội', domain: 'fbu.edu.vn', emailSuffix: ['fbu.edu.vn'] },
      { code: 'NTU_HN', name: 'Trường ĐH Nguyễn Trãi', shortName: 'Nguyễn Trãi', domain: 'nguyentrai.edu.vn', emailSuffix: ['nguyentrai.edu.vn'] },
      { code: 'DDU', name: 'Trường ĐH Đông Đô', shortName: 'Đông Đô', domain: 'hdiu.edu.vn', emailSuffix: ['hdiu.edu.vn'] },
      { code: 'HBU_HN', name: 'Trường ĐH Hòa Bình', shortName: 'Hòa Bình', domain: 'daihochoabinh.edu.vn', emailSuffix: ['daihochoabinh.edu.vn'] },
      { code: 'HUBT', name: 'Trường ĐH Kinh doanh và Công nghệ Hà Nội', shortName: 'HUBT', domain: 'hubt.edu.vn', emailSuffix: ['hubt.edu.vn'] },
      { code: 'HPU_HP2', name: 'Trường ĐH Quản lý và Công nghệ Hải Phòng', shortName: 'HPU Hải Phòng', domain: 'hpu.edu.vn', emailSuffix: ['hpu.edu.vn'] },
      { code: 'UKB', name: 'Trường ĐH Kinh Bắc', shortName: 'Kinh Bắc', domain: 'ukb.edu.vn', emailSuffix: ['ukb.edu.vn'] },
      { code: 'BHIU', name: 'Trường ĐH Quốc tế Bắc Hà', shortName: 'Bắc Hà BHIU', domain: 'bhiu.edu.vn', emailSuffix: ['bhiu.edu.vn'] },
      { code: 'CVA', name: 'Trường ĐH Chu Văn An (Ecopark)', shortName: 'Chu Văn An', domain: 'cva.edu.vn', emailSuffix: ['cva.edu.vn'] },
      { code: 'LTVU', name: 'Trường ĐH Lương Thế Vinh', shortName: 'Lương Thế Vinh', domain: 'ltvu.edu.vn', emailSuffix: ['ltvu.edu.vn'] },
      { code: 'DHTV', name: 'Trường ĐH Trưng Vương', shortName: 'Trưng Vương', domain: 'dhtv.edu.vn', emailSuffix: ['dhtv.edu.vn'] },
      { code: 'VBU', name: 'Trường ĐH Việt Bắc', shortName: 'Việt Bắc', domain: 'vietbac.edu.vn', emailSuffix: ['vietbac.edu.vn'] },
      { code: 'THUV', name: 'Trường ĐH Tokyo Việt Nam', shortName: 'Tokyo Việt Nam', domain: 'tokyo-human.edu.vn', emailSuffix: ['tokyo-human.edu.vn'] },
      { code: 'BUV', name: 'Trường ĐH Anh Quốc Việt Nam', shortName: 'BUV', domain: 'st.buv.edu.vn', emailSuffix: ['st.buv.edu.vn', 'buv.edu.vn'] },
      { code: 'DTU', name: 'Đại học Duy Tân', shortName: 'Duy Tân', domain: 'dtu.edu.vn', emailSuffix: ['dtu.edu.vn'] },
      { code: 'UDA', name: 'Trường ĐH Đông Á (Đà Nẵng)', shortName: 'Đông Á ĐN', domain: 'donga.edu.vn', emailSuffix: ['donga.edu.vn'] },
      { code: 'DAU', name: 'Trường ĐH Kiến trúc Đà Nẵng', shortName: 'Kiến Trúc ĐN', domain: 'dau.edu.vn', emailSuffix: ['dau.edu.vn'] },
      { code: 'AUV', name: 'Trường ĐH Mỹ tại Việt Nam', shortName: 'ĐH Mỹ AUV', domain: 'auv.edu.vn', emailSuffix: ['auv.edu.vn'] },
      { code: 'PCTU', name: 'Trường ĐH Phan Châu Trinh', shortName: 'Phan Châu Trinh', domain: 'pctu.edu.vn', emailSuffix: ['pctu.edu.vn'] },
      { code: 'IUV', name: 'Trường ĐH Công nghiệp Vinh', shortName: 'CN Vinh', domain: 'iuv.edu.vn', emailSuffix: ['iuv.edu.vn'] },
      { code: 'VXUT', name: 'Trường ĐH Công nghệ Vạn Xuân', shortName: 'Vạn Xuân', domain: 'vxut.edu.vn', emailSuffix: ['vxut.edu.vn'] },
      { code: 'QTU', name: 'Trường ĐH Quang Trung', shortName: 'Quang Trung', domain: 'qtu.edu.vn', emailSuffix: ['qtu.edu.vn'] },
      { code: 'POU', name: 'Trường ĐH Thái Bình Dương', shortName: 'Thái Bình Dương', domain: 'pou.edu.vn', emailSuffix: ['pou.edu.vn'] },
      { code: 'YERSIN', name: 'Trường ĐH Yersin Đà Lạt', shortName: 'Yersin Đà Lạt', domain: 'yersin.edu.vn', emailSuffix: ['yersin.edu.vn'] },
      { code: 'UPT', name: 'Trường ĐH Phan Thiết', shortName: 'Phan Thiết', domain: 'upt.edu.vn', emailSuffix: ['upt.edu.vn'] },
      { code: 'BMU', name: 'Trường ĐH Y Dược Buôn Ma Thuột', shortName: 'Y Dược BMT', domain: 'bmu.edu.vn', emailSuffix: ['bmu.edu.vn', 'student.bmu.edu.vn'] },
      { code: 'HUFLIT', name: 'Trường ĐH Ngoại ngữ - Tin học TP.HCM', shortName: 'HUFLIT', domain: 'st.huflit.edu.vn', emailSuffix: ['st.huflit.edu.vn', 'huflit.edu.vn'] },
      { code: 'BDU', name: 'Trường ĐH Bình Dương', shortName: 'ĐH Bình Dương', domain: 'student.bdu.edu.vn', emailSuffix: ['student.bdu.edu.vn', 'bdu.edu.vn'] },
      { code: 'BETU', name: 'Trường ĐH Kinh tế - Kỹ thuật Bình Dương', shortName: 'KT-KT Bình Dương', domain: 'ktkt.edu.vn', emailSuffix: ['ktkt.edu.vn', 'betu.edu.vn'] },
      { code: 'VLU', name: 'Trường ĐH Văn Lang', shortName: 'Văn Lang', domain: 'vanlanguni.vn', emailSuffix: ['vanlanguni.vn', 'vlu.edu.vn'] },
      { code: 'HUTECH', name: 'Trường ĐH Công nghệ TP.HCM', shortName: 'HUTECH', domain: 'hutech.edu.vn', emailSuffix: ['hutech.edu.vn', 'sv.hutech.edu.vn'] },
      { code: 'HSU', name: 'Trường ĐH Hoa Sen', shortName: 'Hoa Sen', domain: 'sinhvien.hoasen.edu.vn', emailSuffix: ['sinhvien.hoasen.edu.vn', 'hoasen.edu.vn'] },
      { code: 'NTTU', name: 'Trường ĐH Nguyễn Tất Thành', shortName: 'Nguyễn Tất Thành', domain: 'ntt.edu.vn', emailSuffix: ['ntt.edu.vn', 'sv.ntt.edu.vn'] },
      { code: 'UEF', name: 'Trường ĐH Kinh tế - Tài chính TP.HCM', shortName: 'UEF', domain: 'uef.edu.vn', emailSuffix: ['uef.edu.vn'] },
      { code: 'HIU', name: 'Trường ĐH Quốc tế Hồng Bàng', shortName: 'Hồng Bàng HIU', domain: 'student.hiu.vn', emailSuffix: ['student.hiu.vn', 'hiu.vn'] },
      { code: 'VHU', name: 'Trường ĐH Văn Hiến', shortName: 'Văn Hiến', domain: 'sv.vhu.edu.vn', emailSuffix: ['sv.vhu.edu.vn', 'vhu.edu.vn'] },
      { code: 'SIU', name: 'Trường ĐH Quốc tế Sài Gòn', shortName: 'Quốc Tế Sài Gòn', domain: 'siu.edu.vn', emailSuffix: ['siu.edu.vn'] },
      { code: 'UMT', name: 'Trường ĐH Quản lý và Công nghệ TP.HCM', shortName: 'UMT TP.HCM', domain: 'st.umt.edu.vn', emailSuffix: ['st.umt.edu.vn', 'umt.edu.vn'] },
      { code: 'STU', name: 'Trường ĐH Công nghệ Sài Gòn', shortName: 'CN Sài Gòn STU', domain: 'student.stu.edu.vn', emailSuffix: ['student.stu.edu.vn', 'stu.edu.vn'] },
      { code: 'GDU', name: 'Trường ĐH Gia Định', shortName: 'Gia Định', domain: 'giadinh.edu.vn', emailSuffix: ['giadinh.edu.vn'] },
      { code: 'EIU', name: 'Trường ĐH Quốc tế Miền Đông', shortName: 'Quốc Tế Miền Đông', domain: 'eiu.edu.vn', emailSuffix: ['eiu.edu.vn'] },
      { code: 'LHU', name: 'Trường ĐH Lạc Hồng', shortName: 'Lạc Hồng', domain: 'lhu.edu.vn', emailSuffix: ['lhu.edu.vn', 'st.lhu.edu.vn'] },
      { code: 'DNTU', name: 'Trường ĐH Công nghệ Đồng Nai', shortName: 'CN Đồng Nai', domain: 'dntu.edu.vn', emailSuffix: ['dntu.edu.vn'] },
      { code: 'MUT', name: 'Trường ĐH Công nghệ Miền Đông', shortName: 'CN Miền Đông', domain: 'mut.edu.vn', emailSuffix: ['mut.edu.vn'] },
      { code: 'BVU', name: 'Trường ĐH Bà Rịa - Vũng Tàu', shortName: 'Bà Rịa Vũng Tàu', domain: 'bvu.edu.vn', emailSuffix: ['bvu.edu.vn'] },
      { code: 'DLA', name: 'Trường ĐH Kinh tế Công nghiệp Long An', shortName: 'Kinh Tế Long An', domain: 'daihoclongan.edu.vn', emailSuffix: ['daihoclongan.edu.vn'] },
      { code: 'TTU', name: 'Trường ĐH Tân Tạo', shortName: 'Tân Tạo', domain: 'ttu.edu.vn', emailSuffix: ['ttu.edu.vn'] },
      { code: 'NCTU', name: 'Trường ĐH Nam Cần Thơ', shortName: 'Nam Cần Thơ', domain: 'nctu.edu.vn', emailSuffix: ['nctu.edu.vn'] },
      { code: 'TDU_CT', name: 'Trường ĐH Tây Đô', shortName: 'Tây Đô', domain: 'tdu.edu.vn', emailSuffix: ['tdu.edu.vn'] },
      { code: 'VTTU', name: 'Trường ĐH Võ Trường Toản', shortName: 'Võ Trường Toản', domain: 'vttu.edu.vn', emailSuffix: ['vttu.edu.vn'] },
      { code: 'MKU', name: 'Trường ĐH Cửu Long', shortName: 'Cửu Long', domain: 'mku.edu.vn', emailSuffix: ['mku.edu.vn'] },
      { code: 'RMIT', name: 'RMIT University Vietnam', shortName: 'RMIT', domain: 'rmit.edu.vn', emailSuffix: ['rmit.edu.vn'] },
      { code: 'FUV', name: 'Trường ĐH Fulbright Việt Nam', shortName: 'Fulbright', domain: 'student.fulbright.edu.vn', emailSuffix: ['student.fulbright.edu.vn', 'fulbright.edu.vn'] },
      { code: 'VINUNI', name: 'VinUniversity', shortName: 'VinUni', domain: 'vinuni.edu.vn', emailSuffix: ['vinuni.edu.vn'] },

      // XI. HỆ THỐNG TRƯỜNG CAO ĐẲNG
      { code: 'CAOTHANG', name: 'Trường Cao đẳng Kỹ thuật Cao Thắng', shortName: 'CĐ Cao Thắng', domain: 'caothang.edu.vn', emailSuffix: ['caothang.edu.vn'] },
      { code: 'COFER', name: 'Trường Cao đẳng Kinh tế Đối ngoại', shortName: 'CĐ Kinh Tế Đối Ngoại', domain: 'cofer.edu.vn', emailSuffix: ['cofer.edu.vn'] },
      { code: 'HACTECH', name: 'Trường CĐ nghề Bách khoa Hà Nội', shortName: 'CĐ Bách Khoa HN', domain: 'hactech.edu.vn', emailSuffix: ['hactech.edu.vn'] },
      { code: 'POLY', name: 'Trường CĐ FPT Polytechnic', shortName: 'FPT Polytechnic', domain: 'fpt.edu.vn', emailSuffix: ['fpt.edu.vn', 'poly.edu.vn'] },
      { code: 'CTIM', name: 'Trường Cao đẳng CTIM', shortName: 'CĐ CTIM', domain: 'ctim.edu.vn', emailSuffix: ['ctim.edu.vn'] },
      { code: 'TDC', name: 'Trường Cao đẳng Công nghệ Thủ Đức', shortName: 'CĐ Thủ Đức TDC', domain: 'mail.tdc.edu.vn', emailSuffix: ['mail.tdc.edu.vn', 'tdc.edu.vn'] },
      { code: 'HCE_CD', name: 'Trường Cao đẳng Kinh tế TP.HCM', shortName: 'CĐ Kinh Tế HCM', domain: 'kthcm.edu.vn', emailSuffix: ['kthcm.edu.vn'] },
      { code: 'LTTC', name: 'Trường CĐ Kỹ thuật Lý Tự Trọng', shortName: 'CĐ Lý Tự Trọng', domain: 'lttc.edu.vn', emailSuffix: ['lttc.edu.vn'] },
      { code: 'HITC', name: 'Trường CĐ Công Thương TP.HCM', shortName: 'CĐ Công Thương HCM', domain: 'hitu.edu.vn', emailSuffix: ['hitu.edu.vn'] },
      { code: 'ITC', name: 'Trường CĐ Công nghệ Thông tin TP.HCM', shortName: 'CĐ CNTT ITC', domain: 'itc.edu.vn', emailSuffix: ['itc.edu.vn'] },
      { code: 'VIENDONG', name: 'Trường Cao đẳng Viễn Đông', shortName: 'CĐ Viễn Đông', domain: 'viendong.edu.vn', emailSuffix: ['viendong.edu.vn'] },
      { code: 'ICH', name: 'Trường Cao đẳng Quốc tế TP.HCM', shortName: 'CĐ Quốc Tế HCM', domain: 'ich.edu.vn', emailSuffix: ['ich.edu.vn'] },
      { code: 'DTDL', name: 'Trường CĐ Điện tử - Điện lạnh Hà Nội', shortName: 'CĐ Điện Lạnh HN', domain: 'dtdl.edu.vn', emailSuffix: ['dtdl.edu.vn'] },
      { code: 'HNIVC', name: 'Trường CĐ nghề Công nghiệp Hà Nội', shortName: 'CĐ CN Hà Nội', domain: 'hnivc.edu.vn', emailSuffix: ['hnivc.edu.vn'] },
      { code: 'HHT', name: 'Trường CĐ Công nghệ Cao Hà Nội', shortName: 'CĐ Công Nghệ Cao HN', domain: 'hht.edu.vn', emailSuffix: ['hht.edu.vn'] },
      { code: 'HCCT', name: 'Trường CĐ Thương mại và Du lịch Hà Nội', shortName: 'CĐ TM&DL Hà Nội', domain: 'hcct.edu.vn', emailSuffix: ['hcct.edu.vn'] },
      { code: 'CDSPTW', name: 'Trường CĐ Sư phạm Trung ương', shortName: 'CĐ Sư Phạm TW', domain: 'cdsptw.edu.vn', emailSuffix: ['cdsptw.edu.vn', 'nce.edu.vn'] },
      { code: 'CDTM', name: 'Trường Cao đẳng Thương mại (Đà Nẵng)', shortName: 'CĐ Thương Mại ĐN', domain: 'cdtm.edu.vn', emailSuffix: ['cdtm.edu.vn'] },
      { code: 'CCT', name: 'Trường CĐ CN-KT và Thủy lợi Miền Trung', shortName: 'CĐ Thủy Lợi MT', domain: 'cct.edu.vn', emailSuffix: ['cct.edu.vn'] },
      { code: 'CDHUE', name: 'Trường Cao đẳng Huế', shortName: 'CĐ Huế', domain: 'cdhue.edu.vn', emailSuffix: ['cdhue.edu.vn'] },
      { code: 'CYK', name: 'Trường Cao đẳng Y tế Khánh Hòa', shortName: 'CĐ Y Tế Khánh Hòa', domain: 'cyk.edu.vn', emailSuffix: ['cyk.edu.vn'] },
      { code: 'CDKTCNNT', name: 'Trường CĐ Kỹ thuật Công nghệ Nha Trang', shortName: 'CĐ KTCN Nha Trang', domain: 'cdktcnnt.edu.vn', emailSuffix: ['cdktcnnt.edu.vn'] },
      { code: 'NTC', name: 'Trường Cao đẳng Du lịch Nha Trang', shortName: 'CĐ Du Lịch Nha Trang', domain: 'ntc.edu.vn', emailSuffix: ['ntc.edu.vn'] },
      { code: 'CDYDSG', name: 'Trường CĐ Y Dược Sài Gòn', shortName: 'CĐ Y Dược Sài Gòn', domain: 'caodangyduocsaigon.vn', emailSuffix: ['caodangyduocsaigon.vn', 'caodangyduocnhatrang.vn'] }
    ];

    this.PROVINCES = [
      { code: 'HN', name: 'Hà Nội' },
      { code: 'HCM', name: 'TP. Hồ Chí Minh' },
      { code: 'DN', name: 'Đà Nẵng' },
      { code: 'CT', name: 'Cần Thơ' },
      { code: 'HP', name: 'Hải Phòng' },
      { code: 'OTHER', name: 'Tỉnh thành khác' }
    ];

    this.MAJORS = [
      { code: 'ECONOMICS', name: 'Kinh tế & Quản trị kinh doanh' },
      { code: 'IT_TECH', name: 'Công nghệ thông tin & Khoa học máy tính' },
      { code: 'MEDICINE', name: 'Y Dược & Chăm sóc sức khỏe' },
      { code: 'ENGINEERING', name: 'Kỹ thuật & Cơ khí - Tự động hóa' },
      { code: 'LANGUAGES', name: 'Ngoại ngữ & Khoa học xã hội' },
      { code: 'FREELANCE', name: 'Ngành nghề khác / Đã đi làm' }
    ];

    this.WEIGHTS = {
      university: 0.35,
      major: 0.25,
      age: 0.20,
      province: 0.10,
      gender: 0.10
    };
  }

  /**
   * Tính toán điểm tương đồng (Match Score %) giữa người dùng và tiêu chí khảo sát
   * @param {Object} userDemo Hồ sơ nhân khẩu học người dùng
   * @param {Object} targetDemo Tiêu chí mục tiêu của khảo sát
   * @returns {Object} { matchScore: number, matchLabel: string, badgeColor: string }
   */
  calculateMatchScore(userDemo = {}, targetDemo = {}) {
    // Nếu khảo sát không đặt tiêu chí nào -> Phù hợp 100% với tất cả mọi người
    if (!targetDemo || Object.keys(targetDemo).length === 0) {
      return {
        matchScore: 100,
        matchLabel: 'Đại trà',
        badgeColor: 'text-slate-600 bg-slate-100'
      };
    }

    let totalWeight = 0;
    let earnedWeight = 0;

    // 1. Trường Đại học (w = 0.35)
    if (targetDemo.universities && targetDemo.universities.length > 0 && !targetDemo.universities.includes('ALL')) {
      const w = this.WEIGHTS.university;
      totalWeight += w;
      if (userDemo.university_code && targetDemo.universities.includes(userDemo.university_code)) {
        earnedWeight += w * 1.0;
      } else if (!userDemo.university_code) {
        earnedWeight += w * 0.3; // Chưa khai báo
      }
    }

    // 2. Ngành học / Nghề nghiệp (w = 0.25)
    if (targetDemo.majors && targetDemo.majors.length > 0 && !targetDemo.majors.includes('ALL')) {
      const w = this.WEIGHTS.major;
      totalWeight += w;
      if (userDemo.major_category && targetDemo.majors.includes(userDemo.major_category)) {
        earnedWeight += w * 1.0;
      } else if (!userDemo.major_category) {
        earnedWeight += w * 0.3;
      }
    }

    // 3. Tỉnh / Thành phố (w = 0.10)
    if (targetDemo.provinces && targetDemo.provinces.length > 0 && !targetDemo.provinces.includes('ALL')) {
      const w = this.WEIGHTS.province;
      totalWeight += w;
      if (userDemo.province_code && targetDemo.provinces.includes(userDemo.province_code)) {
        earnedWeight += w * 1.0;
      } else if (!userDemo.province_code) {
        earnedWeight += w * 0.3;
      }
    }

    // 4. Độ tuổi / Năm sinh (w = 0.20)
    if (targetDemo.age_min || targetDemo.age_max) {
      const w = this.WEIGHTS.age;
      totalWeight += w;
      const currentYear = new Date().getFullYear();
      const userAge = userDemo.birth_year ? (currentYear - userDemo.birth_year) : null;
      if (userAge !== null) {
        const min = targetDemo.age_min || 0;
        const max = targetDemo.age_max || 120;
        if (userAge >= min && userAge <= max) {
          earnedWeight += w * 1.0;
        }
      } else {
        earnedWeight += w * 0.3;
      }
    }

    // 5. Giới tính (w = 0.10)
    if (targetDemo.gender && targetDemo.gender !== 'ANY') {
      const w = this.WEIGHTS.gender;
      totalWeight += w;
      if (userDemo.gender && userDemo.gender === targetDemo.gender) {
        earnedWeight += w * 1.0;
      } else if (!userDemo.gender) {
        earnedWeight += w * 0.3;
      }
    }

    if (totalWeight === 0) {
      return {
        matchScore: 100,
        matchLabel: 'Đại trà',
        badgeColor: 'text-slate-600 bg-slate-100'
      };
    }

    const matchScore = Math.round((earnedWeight / totalWeight) * 100);

    let matchLabel = '';
    let badgeColor = '';
    if (matchScore >= 90) {
      matchLabel = 'Phù hợp 100%';
      badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (matchScore >= 70) {
      matchLabel = `Khớp ${matchScore}%`;
      badgeColor = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (matchScore >= 40) {
      matchLabel = `Phù hợp ${matchScore}%`;
      badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      matchLabel = 'Đại trà';
      badgeColor = 'text-slate-600 bg-slate-100 border-slate-200';
    }

    return {
      matchScore,
      matchLabel,
      badgeColor
    };
  }

  /**
   * Kiểm tra tính hợp lệ của email sinh viên (.edu.vn / .ac.vn)
   * @param {string} email Địa chỉ email cần kiểm tra
   * @param {string} [universityCode] Mã trường đại học (tùy chọn)
   * @returns {boolean} true nếu hợp lệ
   */
    isStudentEmailValid(email, universityCode = null) {
    if (!email || typeof email !== 'string') return false;
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) return false;

    const parts = cleanEmail.split('@');
    if (parts.length !== 2) return false;
    const [username, domainPart] = parts;

    // 1. Kiểm tra vệ sinh cú pháp phần tên tài khoản (Username trước @)
    if (!username || username.length < 2 || username.length > 64) return false;
    if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) return false;
    const usernameRegex = /^[a-z0-9_+-]+(\.[a-z0-9_+-]+)*$/;
    if (!usernameRegex.test(username)) return false;

    // 2. Chặn các tài khoản dùng chung của nhà trường / phòng ban quản lý
    const BLOCKED_USERNAMES = [
      'admin', 'administrator', 'root', 'postmaster', 'support', 'helpdesk',
      'contact', 'info', 'phongdaotao', 'ctsv', 'pdt', 'bgh', 'banbientap',
      'noreply', 'no-reply', 'mail', 'test', 'webmaster', 'security', 'vp',
      'phongcongtacsinhvien', 'daotao', 'tuyensinh'
    ];
    if (BLOCKED_USERNAMES.includes(username)) return false;

    // 3. Kiểm tra tiền tố chuẩn giáo dục hoặc các tên miền đào tạo Việt Nam được công nhận
    const isStandardEdu = domainPart.endsWith('.edu.vn') || 
                          domainPart.endsWith('.ac.vn') || 
                          domainPart.endsWith('.udn.vn');

    // Kiểm tra xem có thuộc danh bạ trường đã đăng ký (kể cả các đuôi đặc biệt như .vn)
    const isKnownSchool = this.UNIVERSITIES.some(u => {
      if (u.code === 'ALL' || !u.emailSuffix) return false;
      return u.emailSuffix.some(s => domainPart === s || domainPart.endsWith('.' + s));
    });

    if (!isStandardEdu && !isKnownSchool) return false;

    if (universityCode && universityCode !== 'ALL') {
      const uni = this.UNIVERSITIES.find(u => u.code === universityCode);
      if (uni && uni.emailSuffix && uni.emailSuffix.length > 0) {
        return uni.emailSuffix.some(suffix => domainPart === suffix || domainPart.endsWith('.' + suffix));
      }
    }

    return true;
  }

  /**
   * Nhận diện trường đại học từ đuôi email sinh viên
   * @param {string} email Địa chỉ email
   * @returns {Object|null} Thông tin trường hoặc null
   */
  detectUniversityFromEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const cleanEmail = email.toLowerCase().trim();
    const parts = cleanEmail.split('@');
    if (parts.length !== 2) return null;
    const domainPart = parts[1];

    for (const uni of this.UNIVERSITIES) {
      if (uni.code === 'ALL' || !uni.emailSuffix) continue;
      if (uni.emailSuffix.some(s => domainPart === s || domainPart.endsWith('.' + s))) {
        return uni;
      }
    }
    return null;
  }

  /**
   * Tính điểm xếp hạng ưu tiên hiển thị trên Feed (Feed Ranking Score)
   */
  calculateFeedRankingScore(matchScore, rewardPoints, collected, target) {
    const matchRatio = matchScore / 100;
    const rewardWeight = Math.log(1 + (rewardPoints || 100));
    const urgency = (target > 0 && (collected / target) >= 0.8) ? 1.4 : 1.0;
    return (matchRatio * matchRatio) * rewardWeight * urgency;
  }
}

module.exports = new MatchingService();
