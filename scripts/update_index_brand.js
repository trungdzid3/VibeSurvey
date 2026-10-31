const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(/VibeSurvey - Nền tảng Khảo sát Trực tuyến & Phân tích Dữ liệu Hàng Đầu/g, 'SurvHub - Nền tảng Khảo sát Trực tuyến & Phân tích Dữ liệu Học Thuật Hàng Đầu');
html = html.replace(/VibeSurvey • Khảo Sát Tích Điểm & Đổi Thưởng/g, 'SurvHub • Nền Tảng Khảo Sát & Nghiên Cứu Học Thuật');
html = html.replace(/Vibe<span class="text-orange-600">Survey<\/span>/g, 'Surv<span class="text-orange-600">Hub</span>');
html = html.replace(/alt="VibeSurvey Logo"/g, 'alt="SurvHub Logo"');
html = html.replace(/Đang tải VibeSurvey\.\.\./g, 'Đang tải SurvHub...');
html = html.replace(/Công ty Cổ phần Công nghệ VibeSurvey/g, 'Công ty Cổ phần Công nghệ SurvHub');
html = html.replace(/Tòa nhà VibeTech/g, 'Tòa nhà SurvHub Tech');
html = html.replace(/hotro@vibesurvey\.vn/g, 'hotro@survhub.vn');
html = html.replace(/business@vibesurvey\.vn/g, 'business@survhub.vn');
html = html.replace(/ketoan@vibesurvey\.vn/g, 'ketoan@survhub.vn');
html = html.replace(/fb\.com\/VibeSurveyOfficial/g, 'fb.com/SurvHubOfficial');
html = html.replace(/VibeSurvey Việt Nam/g, 'SurvHub Việt Nam');
html = html.replace(/@VibeSurveyVN/g, '@SurvHubVN');
html = html.replace(/© 2026 VibeSurvey Ecosystem JSC/g, '© 2026 SurvHub Ecosystem JSC');
html = html.replace(/Đăng nhập vào VibeSurvey/g, 'Đăng nhập vào SurvHub');
html = html.replace(/Logo VibeSurvey Tròn/g, 'Logo SurvHub Tròn');
html = html.replace(/Google sẽ cho phép <span class="text-white font-medium">VibeSurvey<\/span>/g, 'Google sẽ cho phép <span class="text-white font-medium">SurvHub</span>');
html = html.replace(/của VibeSurvey để hiểu cách VibeSurvey/g, 'của SurvHub để hiểu cách SurvHub');
html = html.replace(/Báo lỗi hoặc góp ý cho VibeSurvey/g, 'Báo lỗi hoặc góp ý cho SurvHub');

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Updated public/index.html successfully');
