const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// 1. UPDATE renderForumView
const forumStartMarker = '  // ==================== PHÂN HỆ DIỄN ĐÀN THẢO LUẬN KHẢO SÁT (COMMUNITY BOARD) ====================';
const forumMethodMarker = '  async renderForumView(root) {';
const forumEndMarker = '  handleForumFilterTag(tag) {';

const newForumViewBody = `  async renderForumView(root) {
    if (!root) return;
    const user = this.state.currentUser;

    root.innerHTML = \`
      <div class="py-16 flex flex-col items-center justify-center text-stone-400 space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-stone-200 border-t-orange-600"></div>
        <p class="text-xs text-stone-500 font-medium">Đang tải Diễn Đàn Khảo Sát...</p>
      </div>
    \`;

    try {
      const res = await this.api('/forum/posts');
      this.state.forumPosts = (res && res.posts) || [];
    } catch (err) {
      console.warn('Lỗi nạp bài viết diễn đàn:', err.message);
      this.state.forumPosts = [];
    }

    const posts = this.state.forumPosts || [];
    const openCommentIds = this.state.openCommentPostIds || [];
    const searchQuery = (this.state.forumSearchQuery || '').toLowerCase().trim();

    const filteredPosts = posts.filter(p => {
      if (!searchQuery) return true;
      const t = (p.title || '').toLowerCase();
      const c = (p.content || '').toLowerCase();
      const a = (p.author && p.author.name || '').toLowerCase();
      const s = (p.survey && p.survey.title || '').toLowerCase();
      return t.includes(searchQuery) || c.includes(searchQuery) || a.includes(searchQuery) || s.includes(searchQuery);
    });

    root.innerHTML = \`
      <div class="space-y-6 max-w-6xl mx-auto pb-16 px-2 sm:px-4">
        
        <!-- HEADER DIỄN ĐÀN: BANNER BENTO HIỆN ĐẠI CHUẨN STITCH -->
        <div class="bg-white dark:bg-[#18181B] rounded-3xl p-6 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs relative overflow-hidden space-y-5">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            <div class="flex items-start sm:items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <i data-lucide="messages-square" class="w-7 h-7 stroke-[2.2]"></i>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">SurvHub - Diễn Đàn Khảo Sát & Góc Đề Tài</h1>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 uppercase">Community Board</span>
                </div>
                <p class="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl">
                  Không gian chia sẻ bối cảnh đề tài nghiên cứu khoa học, kêu gọi đáp viên tương hỗ và phản biện học thuật đa trường viện.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button onclick="VibeApp.openCreateForumPostModal()" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-2 cursor-pointer">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>Đăng Bài Mới</span>
              </button>
            </div>
          </div>

          <!-- Quick Metrics Strip -->
          <div class="pt-4 flex flex-wrap items-center gap-6 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span><strong class="text-stone-800 dark:text-stone-200 font-bold">1.428</strong> bài thảo luận đang hoạt động</span>
            </div>
            <div class="flex items-center gap-1.5">
              <i data-lucide="users" class="w-4 h-4 text-orange-600"></i>
              <span><strong class="text-stone-800 dark:text-stone-200 font-bold">19.250+</strong> sinh viên viện trường kết nối</span>
            </div>
            <div class="flex items-center gap-1.5">
              <i data-lucide="arrow-left-right" class="w-4 h-4 text-amber-600"></i>
              <span><strong class="text-stone-800 dark:text-stone-200 font-bold">94.8%</strong> tỷ lệ hoàn thành khảo sát chéo</span>
            </div>
          </div>
        </div>

        <!-- THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC BÀI VIẾT (CHUẨN STITCH) -->
        <div class="space-y-3">
          <div class="bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-2 sm:p-2.5 flex items-center justify-between gap-3 shadow-xs">
            <div class="relative flex-1">
              <i data-lucide="search" class="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              <input type="text" 
                     value="\${this.escapeHtml(this.state.forumSearchQuery || '')}"
                     oninput="VibeApp.handleForumSearch(this.value)"
                     placeholder="Tìm kiếm bài viết, tác giả hoặc tên khảo sát, mã đề tài..." 
                     class="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-xs font-medium text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition-all">
            </div>
            <button onclick="VibeApp.renderForumView(document.getElementById('app-root'))" class="h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer" title="Làm mới bài viết">
              <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          <!-- Filter Tabs -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button onclick="VibeApp.handleForumFilterTag('')" class="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer \${!this.state.forumSearchQuery ? 'bg-orange-600 text-white shadow-xs' : 'bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'}">
              Tất cả thảo luận
            </button>
            <button onclick="VibeApp.handleForumFilterTag('Cần gấp')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50">
              🔥 Cần gấp đáp viên
            </button>
            <button onclick="VibeApp.handleForumFilterTag('Trao đổi chéo')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50">
              🔁 Trao đổi chéo form
            </button>
            <button onclick="VibeApp.handleForumFilterTag('Góp ý')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50">
              📐 Góp ý bảng hỏi & Scale
            </button>
            <button onclick="VibeApp.handleForumFilterTag('NCKH')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50">
              🏛️ NCKH Cấp Viện/ĐHQG
            </button>
          </div>
        </div>

        <!-- MAIN LAYOUT: FEED (8 COLS) + ASIDE SIDEBAR (4 COLS) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- PRIMARY COLUMN: FEED BÀI ĐĂNG (8 COLS) -->
          <div class="lg:col-span-8 space-y-4">
            
            <!-- Danh sách bài viết do người dùng đăng tải từ API (nếu có) -->
            \${filteredPosts.length > 0 ? filteredPosts.map(post => this.renderForumPostCardHtml(post, openCommentIds.includes(post.id))).join('') : ''}

            <!-- POST 1: GHIM TIÊU ĐIỂM TUẦN (ADMIN TRUNG - NCKH GEN 3.0) -->
            <article class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4 hover:border-orange-500/40 transition-all">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center font-black text-sm">
                    A
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Admin Trung</span>
                      <span class="px-1.5 py-0.2 rounded bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-[10px] font-bold">Quản Trị</span>
                      <i data-lucide="pin" class="w-3.5 h-3.5 text-orange-600"></i>
                    </div>
                    <span class="text-[11px] text-stone-400 font-medium">28 phút trước • Ban Học Thuật SurvHub</span>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-extrabold text-[10px] uppercase">
                  TIÊU ĐIỂM TUẦN
                </span>
              </div>

              <div class="space-y-1.5">
                <h2 class="text-sm sm:text-base font-bold text-stone-900 dark:text-white leading-snug">
                  Kêu gọi tham gia Đợt khảo sát & Ứng tuyển Tình nguyện viên NCKH Gen 3.0
                </h2>
                <p class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Mạng lưới Sinh viên Nghiên cứu Khoa học chính thức khởi động dự án khảo sát mẫu diện rộng về mức độ chuyển đổi số trong giáo dục đại học. Đáp viên hoàn thành được cấp chứng nhận số và cộng điểm khảo sát tương hỗ.
                </p>
              </div>

              <!-- Thẻ khảo sát đính kèm -->
              <div class="p-3.5 sm:p-4 rounded-2xl bg-stone-50/90 dark:bg-[#151518] border border-stone-200/80 dark:border-stone-800 space-y-3">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5 text-stone-500">
                    <span class="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-[10.5px] font-bold text-stone-700 dark:text-stone-300">Thị trường & Học thuật</span>
                    <span>• 6-8 phút</span>
                  </div>
                  <span class="font-mono font-bold text-orange-600 dark:text-orange-400">+1.547 Point</span>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <h3 class="text-xs sm:text-sm font-bold text-stone-900 dark:text-white leading-snug">
                      Đơn tuyển Tình nguyện viên Mạng lưới Câu lạc bộ Sinh viên Nghiên cứu khoa học Gen 3.0
                    </h3>
                    <p class="text-[11px] text-stone-500 truncate mt-0.5">
                      Mạng lưới CLB Sinh viên NCKH chính thức mở đơn tuyển thành viên Gen 3. Sổ tay thông tin: shub.vn/gen3
                    </p>
                  </div>
                  <button onclick="VibeApp.navigate('surveys')" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer">
                    <span>Tham Gia Khảo Sát</span>
                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
                <div class="space-y-1 pt-1 border-t border-stone-200/60 dark:border-stone-800">
                  <div class="flex items-center justify-between text-[10.5px] text-stone-500 font-mono">
                    <span>Thu thập: 120/100 mẫu hoàn chỉnh</span>
                    <span class="text-orange-600 font-bold">100% Hoàn thành</span>
                  </div>
                  <div class="w-full bg-stone-200/70 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div class="bg-orange-600 h-full rounded-full w-full"></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
                <div class="flex items-center gap-4">
                  <button class="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer">
                    <i data-lucide="heart" class="w-4 h-4"></i>
                    <span>86 Thích</span>
                  </button>
                  <button class="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                    <span>24 Bình luận</span>
                  </button>
                  <button class="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer">
                    <i data-lucide="share-2" class="w-4 h-4"></i>
                    <span>Chia sẻ</span>
                  </button>
                </div>
                <div class="text-[11px] text-stone-400 flex items-center gap-1">
                  <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                  <span>1.840 lượt xem</span>
                </div>
              </div>
            </article>

            <!-- POST 2: TRAO ĐỔI CHÉO FORM (HOÀNG MY - FTU) -->
            <article class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4 hover:border-orange-500/40 transition-all">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 dark:bg-stone-800 dark:text-orange-400 flex items-center justify-center font-black text-sm">
                    HM
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Hoàng My</span>
                      <span class="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold">ĐH Ngoại Thương</span>
                    </div>
                    <span class="text-[11px] text-stone-400 font-medium">1 giờ trước • Ngành Marketing Quốc tế</span>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-extrabold text-[10px] uppercase">
                  CẦN GẤP ĐÁP VIÊN
                </span>
              </div>

              <div class="space-y-1.5">
                <h2 class="text-sm sm:text-base font-bold text-stone-900 dark:text-white leading-snug">
                  Hỗ trợ điền chéo form luận văn tốt nghiệp: Hành vi người tiêu dùng Gen Z đối với mỹ phẩm thuần chay
                </h2>
                <p class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Chào mọi người, mình đang làm nghiên cứu khoá luận tốt nghiệp đề tài về nhận thức nhãn hàng xanh. Mình cam kết <strong class="text-stone-900 dark:text-white">điền trả 100%</strong> các form khảo sát trong phần bình luận bên dưới kèm ảnh chụp minh chứng. Nhờ các bạn giúp đỡ ạ!
                </p>
              </div>

              <!-- Thẻ khảo sát đính kèm -->
              <div class="p-3.5 sm:p-4 rounded-2xl bg-stone-50/90 dark:bg-[#151518] border border-stone-200/80 dark:border-stone-800 space-y-3">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5 text-stone-500">
                    <span class="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-[10.5px] font-bold text-stone-700 dark:text-stone-300">Luận văn Tốt nghiệp</span>
                    <span>• 4 phút</span>
                  </div>
                  <span class="font-mono font-bold text-orange-600 dark:text-orange-400">+150 Xu Đổi Voucher</span>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <h3 class="text-xs sm:text-sm font-bold text-stone-900 dark:text-white leading-snug">
                      [FTU-2025] Nghiên cứu tác động của yếu tố đạo đức sinh thái đến quyết định mua mỹ phẩm Vegan
                    </h3>
                    <p class="text-[11px] text-stone-500 truncate mt-0.5">
                      Đối tượng: Sinh viên & Người trẻ 18 - 26 tuổi tại các thành phố lớn. Đảm bảo bảo mật danh tính.
                    </p>
                  </div>
                  <button onclick="VibeApp.navigate('surveys')" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer">
                    <span>Điền Form Giúp My</span>
                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
                <div class="space-y-1 pt-1 border-t border-stone-200/60 dark:border-stone-800">
                  <div class="flex items-center justify-between text-[10.5px] text-stone-500 font-mono">
                    <span>Tiến độ mẫu: 312 / 400 mẫu</span>
                    <span class="text-orange-600 font-bold">78% Mục tiêu</span>
                  </div>
                  <div class="w-full bg-stone-200/70 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div class="bg-orange-600 h-full rounded-full" style="width: 78%;"></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
                <div class="flex items-center gap-4">
                  <button class="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer">
                    <i data-lucide="heart" class="w-4 h-4"></i>
                    <span>42 Thích</span>
                  </button>
                  <button class="flex items-center gap-1 text-orange-600 font-bold cursor-pointer">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                    <span>38 Bình luận (Đã điền chéo)</span>
                  </button>
                  <button class="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer">
                    <i data-lucide="share-2" class="w-4 h-4"></i>
                    <span>Chia sẻ</span>
                  </button>
                </div>
                <div class="text-[11px] text-stone-400 flex items-center gap-1">
                  <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                  <span>715 lượt xem</span>
                </div>
              </div>
            </article>

            <!-- POST 3: GÓP Ý THANG ĐO & PHẢN BIỆN PHƯƠNG PHÁP (LÊ TUẤN - BÁCH KHOA) -->
            <article class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4 hover:border-orange-500/40 transition-all">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 flex items-center justify-center font-black text-sm">
                    LT
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">Lê Tuấn</span>
                      <span class="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold">ĐH Bách Khoa TP.HCM</span>
                    </div>
                    <span class="text-[11px] text-stone-400 font-medium">3 giờ trước • Khoa Khoa học & Kỹ thuật Máy tính</span>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-extrabold text-[10px] uppercase">
                  GÓP Ý THANG ĐO
                </span>
              </div>

              <div class="space-y-1.5">
                <h2 class="text-sm sm:text-base font-bold text-stone-900 dark:text-white leading-snug">
                  Góp ý giúp mình thang đo Likert 5 điểm về mức độ sẵn sàng ứng dụng AI trong tự học của sinh viên
                </h2>
                <p class="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Nhóm mình đang chạy tiền kiểm định EFA cho 4 biến quan sát thuộc nhân tố “Kỳ vọng nỗ lực” (Effort Expectancy - UTAUT model). Mình cảm thấy câu hỏi số 3 và 4 đang có hiện tượng đa cộng tuyến cao. Mời thầy cô và các bạn chuyên định lượng góp ý giúp!
                </p>
              </div>

              <!-- Thang đo đề xuất EE1 - EE4 -->
              <div class="p-3.5 rounded-2xl bg-stone-50/90 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 text-xs space-y-2">
                <div class="text-[11px] uppercase tracking-wider font-bold text-orange-600 dark:text-orange-400">Thang đo đề xuất (EE1 - EE4):</div>
                <ul class="space-y-1.5 text-stone-600 dark:text-stone-400 list-disc list-inside">
                  <li><strong class="text-stone-900 dark:text-stone-200">EE1:</strong> Tôi thấy việc sử dụng các trợ lý AI (ChatGPT, Claude) trong học tập rất rõ ràng và dễ hiểu.</li>
                  <li><strong class="text-stone-900 dark:text-stone-200">EE2:</strong> Tôi không mất nhiều thời gian để thành thạo cách viết prompt tạo câu hỏi ôn thi.</li>
                  <li><strong class="text-stone-900 dark:text-stone-200">EE3:</strong> Việc tương tác với AI trong giải quyết bài tập lớn diễn ra rất dễ dàng đối với tôi.</li>
                  <li><strong class="text-stone-900 dark:text-stone-200">EE4:</strong> Tôi cảm thấy kỹ năng công nghệ cá nhân đủ để khai thác AI hiệu quả.</li>
                </ul>
              </div>

              <!-- Thống kê tương tác -->
              <div class="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
                <div class="flex items-center gap-4">
                  <button class="flex items-center gap-1 hover:text-orange-600 transition-colors cursor-pointer">
                    <i data-lucide="heart" class="w-4 h-4"></i>
                    <span>29 Quan tâm</span>
                  </button>
                  <button class="flex items-center gap-1 text-orange-600 font-bold cursor-pointer">
                    <i data-lucide="award" class="w-4 h-4"></i>
                    <span>15 Đóng góp học thuật</span>
                  </button>
                </div>
                <div class="text-[11px] text-stone-400 flex items-center gap-1">
                  <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                  <span>540 lượt xem</span>
                </div>
              </div>

              <!-- Phản biện phương pháp mẫu từ Giảng viên -->
              <div class="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                <span class="text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 block">Bình luận & Phản biện phương pháp (15)</span>
                
                <div class="flex items-start gap-2.5 bg-stone-50/80 dark:bg-stone-900/60 p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800">
                  <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                    TH
                  </div>
                  <div class="space-y-1 flex-1 text-xs">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-stone-900 dark:text-white">TS. Trần Hoàng</span>
                        <span class="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">Giảng viên phản biện</span>
                      </div>
                      <span class="text-[10.5px] text-stone-400">2 giờ trước</span>
                    </div>
                    <p class="text-stone-600 dark:text-stone-300 leading-relaxed">
                      Câu EE3 và EE1 bị trùng ngữ nghĩa “dễ dàng” (ease of use). Trong UTAUT gốc của Venkatesh (2003), biến EE4 nên chuyển về thang đo “Điều kiện hỗ trợ” (Facilitating Conditions) hơn là Nỗ lực. Em tách nhỏ ra chạy Cronbach’s Alpha thử nhé.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <!-- Load More button -->
            <div class="pt-2 flex justify-center">
              <button onclick="VibeApp.showToast('Đã tải danh sách thảo luận học thuật mới nhất.', 'info')" class="px-6 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#18181B] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer">
                <span>Tải thêm thảo luận học thuật</span>
                <i data-lucide="chevron-down" class="w-4 h-4"></i>
              </button>
            </div>

          </div>

          <!-- ASIDE SIDEBAR: WIDGETS NCKH & QUY CHUẨN ĐẠO ĐỨC (4 COLS) -->
          <aside class="lg:col-span-4 space-y-5">
            
            <!-- WIDGET 1: ĐỀ TÀI HOT TUẦN NÀY -->
            <div class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div class="flex items-center gap-2">
                  <i data-lucide="trending-up" class="w-4 h-4 text-orange-600"></i>
                  <h3 class="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">Đề Tài Hot Tuần Này</h3>
                </div>
                <span class="text-[10px] text-stone-400">Cập nhật 1h trước</span>
              </div>

              <div class="space-y-2.5 text-xs">
                <a href="#" onclick="event.preventDefault(); VibeApp.navigate('surveys');" class="block p-3 rounded-2xl bg-stone-50/80 dark:bg-stone-900/60 hover:border-orange-500/50 border border-stone-200/70 dark:border-stone-800 space-y-1 transition-all">
                  <span class="text-[10.5px] font-bold text-orange-600">#1 • Kinh tế số & Fintech</span>
                  <p class="font-bold text-stone-800 dark:text-stone-200 leading-snug">Hành vi tiếp nhận ví trả sau (BNPL) của sinh viên tài chính ngân hàng</p>
                  <span class="text-[11px] text-stone-400 block font-mono">420/500 mẫu • Thưởng 200 điểm</span>
                </a>

                <a href="#" onclick="event.preventDefault(); VibeApp.navigate('surveys');" class="block p-3 rounded-2xl bg-stone-50/80 dark:bg-stone-900/60 hover:border-orange-500/50 border border-stone-200/70 dark:border-stone-800 space-y-1 transition-all">
                  <span class="text-[10.5px] font-bold text-amber-600">#2 • Tâm lý học đường</span>
                  <p class="font-bold text-stone-800 dark:text-stone-200 leading-snug">Ảnh hưởng của FOMO trên Threads đến chất lượng giấc ngủ sinh viên năm nhất</p>
                  <span class="text-[11px] text-stone-400 block font-mono">580/600 mẫu • Thưởng 180 điểm</span>
                </a>

                <a href="#" onclick="event.preventDefault(); VibeApp.navigate('surveys');" class="block p-3 rounded-2xl bg-stone-50/80 dark:bg-stone-900/60 hover:border-orange-500/50 border border-stone-200/70 dark:border-stone-800 space-y-1 transition-all">
                  <span class="text-[10.5px] font-bold text-stone-500">#3 • Quản trị xanh</span>
                  <p class="font-bold text-stone-800 dark:text-stone-200 leading-snug">Sự sẵn sàng chi trả cho bao bì tái chế tại các chuỗi cà phê chuỗi</p>
                  <span class="text-[11px] text-stone-400 block font-mono">290/300 mẫu • Thưởng 120 điểm</span>
                </a>
              </div>
            </div>

            <!-- WIDGET 2: TOP HỖ TRỢ ĐIỀN FORM (LEADERBOARD) -->
            <div class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div class="flex items-center gap-2">
                  <i data-lucide="award" class="w-4 h-4 text-amber-500"></i>
                  <h3 class="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">Top Hỗ Trợ Điền Form</h3>
                </div>
                <button onclick="VibeApp.navigate('surveys')" class="text-[11px] font-bold text-orange-600 hover:underline">Xem BXH</button>
              </div>

              <div class="space-y-3 text-xs">
                <!-- Rank 1 -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-[11px] flex items-center justify-center font-mono">1</span>
                    <div>
                      <div class="font-bold text-stone-800 dark:text-stone-200">Minh Khang</div>
                      <span class="text-[10.5px] text-stone-400">ĐH Kinh tế Quốc dân</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-orange-600 font-mono">86 form</div>
                    <span class="text-[10px] text-stone-400">Hoàn thành</span>
                  </div>
                </div>

                <!-- Rank 2 -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[11px] flex items-center justify-center font-mono">2</span>
                    <div>
                      <div class="font-bold text-stone-800 dark:text-stone-200">Phương Linh</div>
                      <span class="text-[10.5px] text-stone-400">ĐHQG Hà Nội</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-orange-600 font-mono">74 form</div>
                    <span class="text-[10px] text-stone-400">Hoàn thành</span>
                  </div>
                </div>

                <!-- Rank 3 -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[11px] flex items-center justify-center font-mono">3</span>
                    <div>
                      <div class="font-bold text-stone-800 dark:text-stone-200">Đức Huy</div>
                      <span class="text-[10.5px] text-stone-400">ĐH Sư Phạm Kỹ Thuật</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-orange-600 font-mono">62 form</div>
                    <span class="text-[10px] text-stone-400">Hoàn thành</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- WIDGET 3: QUY ƯỚC ĐIỀN CHÉO 100% & QUY CHUẨN ĐẠO ĐỨC HỌC THUẬT -->
            <div class="rounded-3xl bg-gradient-to-br from-orange-50/70 to-amber-50/40 dark:from-orange-950/20 dark:to-stone-900 border border-orange-200/80 dark:border-orange-900/60 p-5 space-y-3">
              <div class="flex items-center gap-2 text-stone-900 dark:text-white">
                <i data-lucide="shield-check" class="w-4 h-4 text-orange-600"></i>
                <h4 class="text-xs font-bold uppercase tracking-wider">Quy Ước Điền Chéo 100%</h4>
              </div>
              <p class="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                SurvHub duy trì môi trường nghiên cứu trung thực. Vui lòng gửi ảnh chụp màn hình trang hoàn thành form khi yêu cầu bạn khác điền đối ứng. Các hành vi spam click hoặc spam link sẽ bị khóa quyền đổi voucher điểm tích luỹ.
              </p>
              <div class="pt-1">
                <button onclick="VibeApp.showToast('Quy chuẩn Đạo đức Học thuật SurvHub: Liêm chính dữ liệu, tôn trọng quyền ẩn danh của đáp viên và tuân thủ tiêu chuẩn IRB quốc tế.', 'info')" class="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer">
                  <span>Đọc Quy chuẩn Đạo đức Học thuật</span>
                  <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

          </aside>

        </div>

      </div>
    \`;

    if (window.lucide) window.lucide.createIcons();
  },`;

// Replace renderForumView
const forumStartIdx = content.indexOf(forumMethodMarker);
const forumEndIdx = content.indexOf(forumEndMarker);
if (forumStartIdx !== -1 && forumEndIdx !== -1) {
  content = content.substring(0, forumStartIdx) + newForumViewBody + '\n\n  ' + content.substring(forumEndIdx);
  console.log('Successfully replaced renderForumView');
} else {
  console.error('Could not locate renderForumView boundaries:', forumStartIdx, forumEndIdx);
  process.exit(1);
}

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('Saved app.js');
