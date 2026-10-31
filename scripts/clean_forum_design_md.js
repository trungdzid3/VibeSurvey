const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Định nghĩa hàm renderForumView hoàn toàn mới, 100% chuẩn DESIGN.md:
// - Không emoji, không sticker
// - Tiêu đề tinh gọn: "Diễn Đàn"
// - Số liệu thật từ database / API
// - Xóa sạch 100% các bài viết mock cứng và huy chương giả
// - Các nút liên kết dữ liệu thật (đăng bài, tìm kiếm, lọc tag, xem khảo sát)
const newRenderForumView = `  // ==================== PHÂN HỆ DIỄN ĐÀN THẢO LUẬN (COMMUNITY BOARD) ====================
  async renderForumView(root) {
    if (!root) return;
    const user = this.state.currentUser;

    root.innerHTML = \`
      <div class="py-16 flex flex-col items-center justify-center text-stone-400 space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-stone-200 border-t-orange-600"></div>
        <p class="text-xs text-stone-500 font-medium">Đang nạp dữ liệu diễn đàn...</p>
      </div>
    \`;

    try {
      const res = await this.api('/forum/posts');
      this.state.forumPosts = (res && res.posts) || [];
    } catch (err) {
      console.warn('Lỗi nạp bài viết diễn đàn:', err.message);
      this.state.forumPosts = [];
    }

    // Nạp khảo sát thực tế nếu chưa có
    if (!this.state.surveys || this.state.surveys.length === 0) {
      try {
        await this.loadSurveys();
      } catch (e) {
        console.warn('Lỗi nạp khảo sát:', e.message);
      }
    }

    const posts = this.state.forumPosts || [];
    const surveys = this.state.surveys || [];
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

    // Lọc ra các khảo sát đang active để gợi ý ở sidebar
    const activeSurveys = surveys.filter(s => s.status === 'ACTIVE' || s.status === 'PUBLISHED' || !s.status).slice(0, 3);

    root.innerHTML = \`
      <div class="space-y-6 max-w-6xl mx-auto pb-16 px-2 sm:px-4">
        
        <!-- HEADER DIỄN ĐÀN: TỐI GIẢN CHUẨN DESIGN.MD (KHÔNG EMOJI, KHÔNG GẮN THÊM SURVHUB) -->
        <div class="bg-white dark:bg-[#18181B] rounded-3xl p-6 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs relative overflow-hidden space-y-4">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            <div class="flex items-start sm:items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <i data-lucide="messages-square" class="w-6 h-6 stroke-[2.2]"></i>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-black tracking-tight text-stone-900 dark:text-white">Diễn Đàn</h1>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60 uppercase">Góc Thảo Luận & Đề Tài</span>
                </div>
                <p class="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl">
                  Không gian trao đổi học thuật, đóng góp ý kiến phương pháp nghiên cứu và chia sẻ đề tài khảo sát thực tế.
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

          <!-- THỐNG KÊ THỰC TẾ DỰA TRÊN DỮ LIỆU APP -->
          <div class="pt-3 flex flex-wrap items-center gap-6 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-orange-500"></span>
              <span><strong class="text-stone-800 dark:text-stone-200 font-bold">\${posts.length}</strong> bài thảo luận</span>
            </div>
            <div class="flex items-center gap-1.5">
              <i data-lucide="compass" class="w-4 h-4 text-orange-600"></i>
              <span><strong class="text-stone-800 dark:text-stone-200 font-bold">\${surveys.length}</strong> đề tài khảo sát</span>
            </div>
            <div class="flex items-center gap-1.5">
              <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
              <span>Kiểm duyệt liêm chính học thuật</span>
            </div>
          </div>
        </div>

        <!-- THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC CHUẨN DESIGN.MD (KHÔNG EMOJI) -->
        <div class="space-y-3">
          <div class="bg-white dark:bg-[#18181B] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-2 sm:p-2.5 flex items-center justify-between gap-3 shadow-xs">
            <div class="relative flex-1">
              <i data-lucide="search" class="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              <input type="text" 
                     value="\${this.escapeHtml(this.state.forumSearchQuery || '')}"
                     oninput="VibeApp.handleForumSearch(this.value)"
                     placeholder="Tìm kiếm bài viết theo tiêu đề, tác giả, nội dung hoặc tên khảo sát..." 
                     class="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 text-xs font-medium text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition-all">
            </div>
            <button onclick="VibeApp.renderForumView(document.getElementById('app-root'))" class="h-9 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer" title="Làm mới danh sách">
              <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          <!-- BỘ LỌC CHỦ ĐỀ CHUẨN MỰC KHÔNG EMOJI -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button onclick="VibeApp.handleForumFilterTag('')" class="px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer \${!this.state.forumSearchQuery ? 'bg-orange-600 text-white shadow-xs' : 'bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'}">
              Tất cả thảo luận
            </button>
            <button onclick="VibeApp.handleForumFilterTag('Bach Khoa')" class="px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 hover:text-stone-900 dark:hover:text-white">
              Khoa học máy tính & Công nghệ
            </button>
            <button onclick="VibeApp.handleForumFilterTag('Trao doi')" class="px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 hover:text-stone-900 dark:hover:text-white">
              Trao đổi đáp viên
            </button>
            <button onclick="VibeApp.handleForumFilterTag('Khao sat')" class="px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 hover:text-stone-900 dark:hover:text-white">
              Đề tài đính kèm khảo sát
            </button>
            \${user ? \`
              <button onclick="VibeApp.handleForumFilterTag('\${user.name}')" class="px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer bg-white dark:bg-[#18181B] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 hover:text-stone-900 dark:hover:text-white">
                Bài viết của tôi
              </button>
            \` : ''}
          </div>
        </div>

        <!-- MAIN LAYOUT: FEED THẬT (8 COLS) + SIDEBAR TINH GỌN (4 COLS) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- CỘT CHÍNH: DANH SÁCH BÀI VIẾT THỰC TẾ (8 COLS) -->
          <div class="lg:col-span-8 space-y-4">
            
            \${filteredPosts.length > 0 ? (
              filteredPosts.map(post => this.renderForumPostCardHtml(post, openCommentIds.includes(post.id))).join('')
            ) : \`
              <!-- TRẠNG THÁI TRỐNG TINH TẾ (EMPTY STATE) -->
              <div class="bg-white dark:bg-[#18181B] rounded-3xl p-10 sm:p-12 border border-dashed border-stone-200 dark:border-stone-800 text-center space-y-4">
                <div class="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 flex items-center justify-center mx-auto">
                  <i data-lucide="message-square-dashed" class="w-6 h-6 stroke-[1.8]"></i>
                </div>
                <div class="space-y-1.5 max-w-md mx-auto">
                  <h3 class="text-sm font-bold text-stone-900 dark:text-white">Chưa có bài thảo luận phù hợp</h3>
                  <p class="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                    \${searchQuery ? 'Không tìm thấy bài viết nào khớp với từ khóa tìm kiếm. Bạn có thể xóa bộ lọc để xem tất cả.' : 'Hãy là người đầu tiên đăng bài chia sẻ bối cảnh đề tài và kêu gọi đáp viên tham gia khảo sát!'}
                  </p>
                </div>
                <div class="pt-2">
                  <button onclick="VibeApp.openCreateForumPostModal()" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 inline-flex items-center gap-2 cursor-pointer">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    <span>Tạo Bài Viết Mới</span>
                  </button>
                </div>
              </div>
            \`}

          </div>

          <!-- CỘT BÊN PHẢI: WIDGET THỰC TẾ & QUY CHUẨN CỘNG ĐỒNG (4 COLS) -->
          <aside class="lg:col-span-4 space-y-5">

            <!-- WIDGET 1: QUY CHUẨN THẢO LUẬN & ĐẠO ĐỨC HỌC THUẬT -->
            <div class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
              <div class="flex items-center gap-2 text-stone-900 dark:text-white">
                <div class="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <i data-lucide="shield-check" class="w-4 h-4 stroke-[2.2]"></i>
                </div>
                <h3 class="text-xs font-bold uppercase tracking-wider">Quy Chuẩn Thảo Luận</h3>
              </div>
              
              <ul class="space-y-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed border-t border-stone-100 dark:border-stone-800/80 pt-3">
                <li class="flex items-start gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0"></span>
                  <span><strong>Liêm chính học thuật:</strong> Cung cấp thông tin đề tài trung thực, rõ ràng mục đích nghiên cứu.</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0"></span>
                  <span><strong>Bảo mật thông tin:</strong> Tôn trọng quyền ẩn danh của đáp viên, tuân thủ tiêu chuẩn đạo đức nghiên cứu.</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0"></span>
                  <span><strong>Chặn liên kết rác:</strong> Hệ thống tự động ngăn chặn liên kết ngoài để bảo vệ an toàn cho thành viên.</span>
                </li>
              </ul>
            </div>

            <!-- WIDGET 2: KHẢO SÁT THỰC TẾ ĐANG CẦN MẪU (DỮ LIỆU THẬT TỪ HỆ THỐNG) -->
            \${activeSurveys.length > 0 ? \`
              <div class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-stone-900 dark:text-white">
                    <div class="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <i data-lucide="compass" class="w-4 h-4 stroke-[2.2]"></i>
                    </div>
                    <h3 class="text-xs font-bold uppercase tracking-wider">Khảo Sát Đang Cần Mẫu</h3>
                  </div>
                  <button onclick="VibeApp.navigate('surveys')" class="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer">
                    Xem tất cả
                  </button>
                </div>

                <div class="space-y-3 border-t border-stone-100 dark:border-stone-800/80 pt-3">
                  \${activeSurveys.map(s => \`
                    <div class="p-3 rounded-2xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800 space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <h4 class="text-xs font-bold text-stone-900 dark:text-white line-clamp-2 leading-snug">
                          \${this.escapeHtml(s.title)}
                        </h4>
                        <span class="font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                          +\${(s.reward_points_per_response || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      
                      <div class="flex items-center justify-between pt-1">
                        <span class="text-[10.5px] font-mono text-stone-500">
                          \${s.collected_responses || 0}/\${s.target_responses || 100} mẫu
                        </span>
                        <button onclick="VibeApp.startSurveySession('\${s.id}')" class="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer">
                          Làm bài
                        </button>
                      </div>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \` : ''}

            <!-- WIDGET 3: HƯỚNG DẪN ĐĂNG BÀI HIỆU QUẢ -->
            <div class="bg-white dark:bg-[#18181B] rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
              <div class="flex items-center gap-2 text-stone-900 dark:text-white">
                <div class="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0">
                  <i data-lucide="help-circle" class="w-4 h-4 stroke-[2.2]"></i>
                </div>
                <h3 class="text-xs font-bold uppercase tracking-wider">Cách Gom Mẫu Nhanh</h3>
              </div>
              <p class="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Đính kèm bài khảo sát đang hoạt động vào bài thảo luận của bạn để các thành viên khác có thể nhấp vào và điền câu trả lời ngay lập tức.
              </p>
              <div class="pt-1">
                <button onclick="VibeApp.navigate('create-survey')" class="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Tạo Khảo Sát Mới</span>
                </button>
              </div>
            </div>

          </aside>

        </div>

      </div>
    \`;

    if (window.lucide) window.lucide.createIcons();
  },`;

// Tìm vùng hàm renderForumView cũ và thay thế
const startMarker = "  // ==================== PHÂN HỆ DIỄN ĐÀN THẢO LUẬN KHẢO SÁT (COMMUNITY BOARD) ====================";
const endMarker = "    handleForumFilterTag(tag) {";

const startIndex = appJs.indexOf(startMarker);
const endIndex = appJs.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Không tìm thấy vị trí renderForumView trong app.js!");
  process.exit(1);
}

appJs = appJs.substring(0, startIndex) + newRenderForumView + "\n\n  " + appJs.substring(endIndex);

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log("Đã cập nhật thành công renderForumView chuẩn DESIGN.md!");
