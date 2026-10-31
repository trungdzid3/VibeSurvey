const fs = require('fs');

const appPath = 'public/app.js';
let code = fs.readFileSync(appPath, 'utf8');

// Replacement for openCreateForumPostModal and submitCreateForumPost
const startMarker = '  async openCreateForumPostModal() {';
const endMarker = '  shareForumPost(postId) {';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const newImplementation = `  async openCreateForumPostModal() {
    this.haptic('light');
    if (!this.state.currentUser) {
      this.showToast('Vui lòng đăng nhập để tạo bài viết trên Diễn Đàn!', 'info');
      this.openAuthModal('login');
      return;
    }

    const user = this.state.currentUser;
    const isEduUser = user.is_student_verified === 1 || user.role === 'ADMIN';

    let activeSurveys = [];
    try {
      const res = await this.api('/surveys?scope=created');
      const allMySurveys = (res && res.surveys) || [];
      activeSurveys = allMySurveys.filter(s => s.status === 'ACTIVE');
    } catch (e) {
      console.warn('Lỗi kiểm tra khảo sát của bạn:', e.message);
    }

    const defaultHub = this.state.forumFilter?.hub === 'STUDENT' && isEduUser ? 'STUDENT' : 'COMMUNITY';

    this.showModal({
      title: 'Đăng Bài Viết Lên Diễn Đàn SurvHub',
      maxWidth: 'max-w-xl',
      content: \`
        <form onsubmit="VibeApp.submitCreateForumPost(event)" class="space-y-4 text-xs">
          
          <!-- Chọn Phân Khu -->
          <div class="space-y-1.5">
            <label class="font-bold text-stone-800 dark:text-stone-200">Phân khu đăng bài (*):</label>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 cursor-pointer hover:border-orange-500 transition-all">
                <input type="radio" name="forum-hub-choice" value="COMMUNITY" \${defaultHub === 'COMMUNITY' ? 'checked' : ''} class="text-orange-600 focus:ring-orange-500">
                <div class="min-w-0">
                  <div class="font-bold text-stone-900 dark:text-white flex items-center gap-1">
                    <i data-lucide="globe" class="w-3.5 h-3.5 text-stone-600 dark:text-stone-300"></i>
                    <span>Cộng Đồng Chung</span>
                  </div>
                  <div class="text-[10px] text-stone-400">Thảo luận tự do & Mọi đối tượng</div>
                </div>
              </label>

              <label class="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900 \${isEduUser ? 'cursor-pointer hover:border-orange-500' : 'opacity-50 cursor-not-allowed'} transition-all">
                <input type="radio" name="forum-hub-choice" value="STUDENT" \${defaultHub === 'STUDENT' ? 'checked' : ''} \${!isEduUser ? 'disabled' : ''} class="text-orange-600 focus:ring-orange-500">
                <div class="min-w-0">
                  <div class="font-bold text-stone-900 dark:text-white flex items-center gap-1">
                    <i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-orange-600"></i>
                    <span>Góc Sinh Viên</span>
                  </div>
                  <div class="text-[10px] text-stone-400">\${isEduUser ? 'Edu Karma / Luận văn' : 'Cần email trường .edu'}</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Tiêu đề bài viết -->
          <div class="space-y-1.5">
            <label class="font-bold text-stone-800 dark:text-stone-200">Tiêu đề bài viết (*):</label>
            <input type="text" id="forum-post-title-input" required 
                   placeholder="Ví dụ: Trao đổi về phương pháp nghiên cứu thị trường hoặc tìm đáp viên..." 
                   class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500">
          </div>

          <!-- Chọn Khảo sát đính kèm (Hoàn toàn Tùy chọn) -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="font-bold text-stone-800 dark:text-stone-200">Khảo sát đính kèm:</label>
              <span class="text-[10.5px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">Tùy chọn (Không bắt buộc)</span>
            </div>
            
            <input type="hidden" id="forum-post-survey-select" value="">
            <div class="relative">
              <button type="button" 
                      id="forum-post-survey-btn"
                      onclick="VibeApp.toggleCustomDropdown('forum-post-survey-menu', 'forum-post-survey-icon', event)"
                      class="custom-dropdown-trigger w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-white hover:border-orange-500 flex items-center justify-between text-left transition-all shadow-2xs cursor-pointer">
                <span id="forum-post-survey-label" class="truncate text-stone-600 dark:text-stone-300">-- Thảo luận tự do (Không đính kèm khảo sát) --</span>
                <i data-lucide="chevron-down" id="forum-post-survey-icon" class="custom-dropdown-icon w-3.5 h-3.5 text-stone-400 shrink-0 ml-2 transition-transform duration-200 pointer-events-none"></i>
              </button>
              <div id="forum-post-survey-menu" class="custom-dropdown-menu hidden absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white dark:bg-[#1C1C20] border border-stone-200 dark:border-[#2E2E36] rounded-xl shadow-2xl p-1.5 space-y-1 max-h-[220px] overflow-y-auto scrollbar-thin">
                <button type="button" 
                        onclick="document.getElementById('forum-post-survey-select').value = ''; document.getElementById('forum-post-survey-label').textContent = '-- Thảo luận tự do (Không đính kèm khảo sát) --'; VibeApp.closeAllCustomDropdowns();"
                        class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors hover:bg-stone-100 dark:hover:bg-[#24242A] text-left text-stone-800 dark:text-stone-200 font-medium">
                  <span>-- Thảo luận tự do (Không đính kèm khảo sát) --</span>
                  <i data-lucide="check" class="w-3.5 h-3.5 text-orange-600 shrink-0 ml-1.5"></i>
                </button>
                \${activeSurveys.map(s => {
                  const isEdu = s.is_student_exchange === 1;
                  const tag = isEdu ? '[Trao Đổi Edu] ' : '';
                  const fullTitle = \`\${tag}\${s.title} (\${s.collected_responses || 0}/\${s.target_responses} mẫu)\`;
                  const safeFullTitle = (fullTitle).replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
                  return \`
                    <button type="button" 
                            onclick="document.getElementById('forum-post-survey-select').value = '\${s.id}'; document.getElementById('forum-post-survey-label').textContent = '\${safeFullTitle}'; VibeApp.closeAllCustomDropdowns();"
                            class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors hover:bg-stone-100 dark:hover:bg-[#24242A] text-left text-stone-800 dark:text-stone-200">
                      <span class="truncate">\${this.escapeHtml(fullTitle)}</span>
                    </button>
                  \`;
                }).join('')}
              </div>
            </div>
            <p class="text-[10.5px] text-stone-500 dark:text-stone-400">Bạn không cần sở hữu khảo sát vẫn đăng bài trao đổi bình thường. Nếu muốn đính kèm để kêu gọi đáp viên, hãy chọn bài đang ACTIVE của bạn.</p>
          </div>

          <!-- Nội dung chia sẻ -->
          <div class="space-y-1.5">
            <label class="font-bold text-stone-800 dark:text-stone-200">Nội dung chia sẻ & Thảo luận (*):</label>
            <textarea id="forum-post-content-input" rows="5" required
                      placeholder="Chia sẻ bối cảnh đề tài, câu hỏi thảo luận, kinh nghiệm thiết kế form hoặc nội dung bạn muốn trao đổi cùng cộng đồng..."
                      class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-orange-500"></textarea>
          </div>

          <div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
            <div class="font-bold flex items-center gap-1">
              <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i>
              <span>Quy tắc cộng đồng & Bảo mật</span>
            </div>
            <p>Hệ thống tự động ngăn chặn các liên kết ngoài trái phép. Mọi trao đổi tuân thủ chuẩn mực văn minh và bảo mật dữ liệu học thuật.</p>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2">
            <button type="button" onclick="VibeApp.closeModal()" class="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800">
              Hủy
            </button>
            <button type="submit" id="forum-post-submit-btn" class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>Đăng Bài Lên Diễn Đàn</span>
            </button>
          </div>

        </form>
      \`
    });

    if (window.lucide) window.lucide.createIcons();
  },

  async submitCreateForumPost(event) {
    if (event) event.preventDefault();
    this.haptic('medium');

    const title = (document.getElementById('forum-post-title-input')?.value || '').trim();
    const survey_id = (document.getElementById('forum-post-survey-select')?.value || '').trim() || null;
    const content = (document.getElementById('forum-post-content-input')?.value || '').trim();
    const hubRadio = document.querySelector('input[name="forum-hub-choice"]:checked');
    const post_type = hubRadio ? hubRadio.value : 'COMMUNITY';

    if (!title || !content) {
      this.showToast('Vui lòng điền đầy đủ tiêu đề và nội dung bài viết!', 'warning');
      return;
    }

    const btn = document.getElementById('forum-post-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Đang đăng bài...</span>';
    }

    try {
      const res = await this.api('/forum/posts', {
        method: 'POST',
        body: JSON.stringify({ title, survey_id, content, post_type })
      });

      if (res && res.success) {
        this.haptic('success');
        this.showToast('Đăng bài viết lên diễn đàn thành công!', 'success');
        this.closeModal();
        if (this.state.forumFilter) {
          this.state.forumFilter.hub = post_type;
        }
        await this.renderForumView(document.getElementById('app-root'));
      } else {
        this.showToast(res.message || 'Lỗi khi đăng bài', 'error');
      }
    } catch (err) {
      this.showToast(err.message || 'Lỗi đăng bài viết', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i><span>Đăng Bài Lên Diễn Đàn</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

`;

code = code.slice(0, startIdx) + newImplementation + code.slice(endIdx);
fs.writeFileSync(appPath, code, 'utf8');
console.log('Successfully patched openCreateForumPostModal & submitCreateForumPost in public/app.js!');
