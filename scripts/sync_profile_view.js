const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'app.js');
let content = fs.readFileSync(appPath, 'utf8');

// Tìm điểm bắt đầu của renderProfileView và kết thúc trước renderAdminOverviewView
const startMarker = '  // ==================== VIEW: TAB HỒ SƠ & XÁC THỰC (DEMOGRAPHICS, STUDENT .EDU.VN, ENTERPRISE) ====================';
const endMarker = '  // ==================== VIEW 8: ADMIN DASHBOARD & GOVERNANCE ====================';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Không tìm thấy marker trong app.js');
  process.exit(1);
}

const profileBlock = `${startMarker}
  async renderProfileView(root) {
    if (!this.state.currentUser) {
      this.renderGuestLockedView(root, 'Hồ Sơ Tài Khoản', 'Vui lòng đăng nhập để xem và quản lý khảo sát cũng như cập nhật thông tin hồ sơ của bạn.');
      return;
    }

    // Lấy thông tin user mới nhất
    try {
      const meRes = await this.api('/auth/me');
      if (meRes.user) {
        this.state.currentUser = meRes.user;
      }
    } catch (e) { }

    const user = this.state.currentUser;
    const isEnterprise = user.account_tier === 'ENTERPRISE' ||
      user.role === 'CREATOR' ||
      this.state.adminMode === 'CREATOR' ||
      this.state.adminViewMode === 'CREATOR';
    const enterpriseLevel = Number(user.enterprise_verify_level || user.enterprise_level || 0);
    const isEnterpriseLevel2 = enterpriseLevel >= 2;
    const isEnterpriseLevel1 = enterpriseLevel >= 1;

    // Chuẩn hóa profileTab sang 5 tab chính nếu chưa có
    if (!this.state.profileTab || !['demographics', 'reputation', 'created-forms', 'filled-forms', 'forum-posts', 'STUDENT', 'ENTERPRISE'].includes(this.state.profileTab)) {
      this.state.profileTab = 'demographics';
    }

    let demographics = {};
    if (user.demographics_json) {
      try { demographics = JSON.parse(user.demographics_json); } catch (e) { }
    }

    let enterpriseProfile = {};
    if (user.enterprise_profile_json) {
      try { enterpriseProfile = JSON.parse(user.enterprise_profile_json); } catch (e) { }
    }
    enterpriseProfile = {
      brand_name: enterpriseProfile.brand_name || user.brand_name || '',
      industry: enterpriseProfile.industry || user.industry || '',
      website_url: enterpriseProfile.website_url || user.website_url || '',
      contact_phone: enterpriseProfile.contact_phone || user.contact_phone || '',
      company_legal_name: enterpriseProfile.company_legal_name || user.company_legal_name || '',
      tax_id: enterpriseProfile.tax_id || user.tax_id || '',
      headquarters_address: enterpriseProfile.headquarters_address || user.headquarters_address || '',
      invoice_email: enterpriseProfile.invoice_email || user.invoice_email || ''
    };

    const isStudentVerified = user.is_student_verified === 1 || user.account_tier === 'STUDENT';
    const isLocked = user.demographic_locked_until && (new Date(user.demographic_locked_until).getTime() > Date.now());
    const lockDateStr = isLocked ? new Date(user.demographic_locked_until).toLocaleDateString('vi-VN') : '';

    // Lọc danh sách khảo sát đã tạo của user
    const allSurveys = this.state.surveys || [];
    const mySurveys = allSurveys.filter(s => s.creator_id === user.id || s.author_id === user.id || (this.state.mySurveys || []).includes(s.id));
    
    // Lọc bài viết diễn đàn của user
    const allPosts = this.state.forumPosts || [];
    const myPosts = allPosts.filter(p => p.author && p.author.id === user.id);

    const activeTab = this.state.profileTab;

    root.innerHTML = \`
      <div class="max-w-6xl mx-auto space-y-6 pb-20 px-2 sm:px-4">
        
        <!-- HEADER HỒ SƠ TÀI KHOẢN: TIÊU ĐỀ & THÔNG TIN CHÍNH CHUẨN STITCH -->
        <div class="bg-white dark:bg-[#18181B] rounded-3xl p-6 sm:p-7 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-5 relative overflow-hidden">
          <!-- Hiệu ứng gradient mờ phong cách Stitch -->
          <div class="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-gradient-to-br from-orange-500/10 to-amber-500/10 blur-3xl pointer-events-none"></div>
          <div class="absolute right-1/3 -bottom-28 w-80 h-80 rounded-full bg-orange-400/5 blur-3xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <!-- Avatar & Nhận diện học thuật -->
            <div class="flex items-start sm:items-center gap-4">
              <div class="relative shrink-0">
                <div class="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-600 to-orange-500 p-0.5 shadow-md shadow-orange-600/20">
                  <div class="w-full h-full rounded-2xl bg-white dark:bg-stone-900 flex items-center justify-center font-black text-2xl text-orange-600 dark:text-orange-400">
                    \${(user.name || 'Linh').charAt(0).toUpperCase()}
                  </div>
                </div>
                <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-stone-900 shadow-xs" title="Tài khoản đã xác thực">
                  <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
                </div>
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center gap-2 flex-wrap">
                  <h1 class="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">SurvHub - Thông Tin Tài Khoản & Quản Lý Khảo Sát</h1>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase \${
                    user.account_tier === 'STUDENT' ? 'bg-[#FFF7ED] text-orange-700 border border-orange-200' :
                    (isEnterprise ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-orange-50 text-orange-700 border border-orange-200')
                  }">
                    \${user.account_tier === 'STUDENT' ? 'Gói Sinh Viên (.EDU.VN)' : (isEnterprise ? 'Gói Doanh Nghiệp' : 'Gói Cá Nhân (ĐH Bách Khoa Hà Nội)')}
                  </span>
                </div>
                <div class="flex items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                  <span class="flex items-center gap-1 font-mono"><i data-lucide="mail" class="w-3.5 h-3.5 text-stone-400"></i> \${user.email || 'linharkmyxbxnvn@gmail.com'}</span>
                  <span>•</span>
                  <span class="flex items-center gap-1 font-semibold text-stone-700 dark:text-stone-300"><i data-lucide="school" class="w-3.5 h-3.5 text-orange-600"></i> \${demographics.university || 'Khoa CNTT & Trí tuệ Nhân tạo - ĐH Bách Khoa Hà Nội'}</span>
                  <span>•</span>
                  <span class="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400"><i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i> Đáp viên Vàng Tin Cậy</span>
                </div>
              </div>
            </div>

            <!-- Nút liên kết phân hệ -->
            <div class="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button onclick="VibeApp.switchProfileTab('STUDENT')" class="px-3.5 py-2 rounded-xl text-xs font-bold \${isStudentVerified ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 border border-orange-200 dark:border-orange-800 hover:bg-orange-100'} transition-all flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="graduation-cap" class="w-4 h-4"></i>
                <span>\${isStudentVerified ? 'Gói SV Đã Xác Thực' : 'Xác Thực SV (.edu.vn)'}</span>
              </button>
              <button onclick="VibeApp.switchProfileTab('ENTERPRISE')" class="px-3.5 py-2 rounded-xl text-xs font-bold \${isEnterpriseLevel1 || isEnterpriseLevel2 ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'} transition-all flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="briefcase" class="w-4 h-4"></i>
                <span>\${isEnterpriseLevel2 ? 'Doanh Nghiệp Cấp 2' : (isEnterpriseLevel1 ? 'Doanh Nghiệp Cấp 1' : 'Hồ Sơ Doanh Nghiệp')}</span>
              </button>
            </div>
          </div>

          <!-- 3 THẺ METRIC THỐNG KÊ TÀI KHOẢN CHUẨN STITCH -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-stone-100 dark:border-stone-800">
            <!-- Điểm uy tín -->
            <div class="p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
              <div class="flex items-center justify-between text-stone-500 font-bold text-[11px] uppercase tracking-wider">
                <span>Điểm Uy Tín</span>
                <i data-lucide="shield-check" class="w-4 h-4 text-orange-600"></i>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black font-mono text-orange-600 dark:text-orange-400">\${Number(user.trust_score || 100.0).toFixed(1)}</span>
                <span class="text-xs font-bold text-stone-400">/ 100</span>
              </div>
              <div class="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                <div class="bg-gradient-to-r from-orange-600 to-amber-500 h-full w-full rounded-full"></div>
              </div>
            </div>

            <!-- Mẫu miễn phí -->
            <div class="p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
              <div class="flex items-center justify-between text-stone-500 font-bold text-[11px] uppercase tracking-wider">
                <span>Mẫu Miễn Phí</span>
                <i data-lucide="layers" class="w-4 h-4 text-amber-600"></i>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-black font-mono text-stone-900 dark:text-white">\${user.free_quota_remaining !== undefined ? user.free_quota_remaining : (user.free_trial_surveys_available || 25)}</span>
                <span class="text-xs font-bold text-stone-400">lượt</span>
              </div>
              <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400">Khóa lưu trong 90 ngày</span>
            </div>

            <!-- Ví xu tích lũy -->
            <div class="p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex flex-col justify-between gap-2 shadow-xs">
              <div class="flex items-center justify-between text-stone-500 font-bold text-[11px] uppercase tracking-wider">
                <span>Ví Xu Tích Lũy</span>
                <i data-lucide="coins" class="w-4 h-4 text-amber-500"></i>
              </div>
              <div class="flex items-baseline gap-1.5">
                <span class="text-2xl font-black font-mono text-stone-900 dark:text-white">\${Number(user.points || user.reward_points || 3450).toLocaleString('vi-VN')}</span>
                <span class="text-xs font-extrabold text-orange-600">Xu</span>
              </div>
              <span class="text-[10px] font-medium text-stone-500">≈ 720.000đ đổi thưởng</span>
            </div>
          </div>
        </div>

        <!-- 5 TAB CHỨC NĂNG CHUẨN STITCH -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-stone-200/80 dark:border-stone-800 text-xs font-bold">
          <button type="button" onclick="VibeApp.switchProfileTab('demographics')" 
                  class="pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap \${activeTab === 'demographics' ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-extrabold' : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'}">
            <i data-lucide="user" class="w-4 h-4"></i>
            <span>1. Thông tin nhân khẩu học</span>
          </button>
          <button type="button" onclick="VibeApp.switchProfileTab('reputation')" 
                  class="pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap \${activeTab === 'reputation' ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-extrabold' : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'}">
            <i data-lucide="award" class="w-4 h-4"></i>
            <span>2. Đánh giá & Mức độ uy tín</span>
          </button>
          <button type="button" onclick="VibeApp.switchProfileTab('created-forms')" 
                  class="pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap \${activeTab === 'created-forms' ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-extrabold' : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'}">
            <i data-lucide="file-plus" class="w-4 h-4"></i>
            <span>3. Khảo sát đã tạo (Form đã up)</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 font-mono font-bold">\${mySurveys.length > 0 ? mySurveys.length : '2'}</span>
          </button>
          <button type="button" onclick="VibeApp.switchProfileTab('filled-forms')" 
                  class="pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap \${activeTab === 'filled-forms' ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-extrabold' : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'}">
            <i data-lucide="check-circle-2" class="w-4 h-4"></i>
            <span>4. Khảo sát đã tham gia</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 font-mono font-bold">52</span>
          </button>
          <button type="button" onclick="VibeApp.switchProfileTab('forum-posts')" 
                  class="pb-3 px-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap \${activeTab === 'forum-posts' ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-extrabold' : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'}">
            <i data-lucide="messages-square" class="w-4 h-4"></i>
            <span>5. Bài viết trên diễn đàn</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 dark:bg-stone-800 font-mono font-bold">\${myPosts.length > 0 ? myPosts.length : '3'}</span>
          </button>
        </div>

        <!-- TAB 1: THÔNG TIN NHÂN KHẨU HỌC -->
        <div id="profile-tab-demographics" class="\${activeTab === 'demographics' ? '' : 'hidden'} space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span class="text-[11px] font-black uppercase tracking-wider text-orange-600 block">Hồ Sơ Nghiên Cứu Sinh Viên</span>
              <h2 class="text-lg font-black text-stone-900 dark:text-white">Thông Tin Cá Nhân & Nhân Khẩu Học</h2>
            </div>
            <div class="bg-stone-50 dark:bg-stone-900/60 px-4 py-2 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
              <i data-lucide="info" class="w-4 h-4 text-orange-600 shrink-0"></i>
              <span>Hoàn thiện 100% mở khóa thêm <strong>25 lượt mẫu miễn phí</strong>. Thông tin cốt lõi khóa 90 ngày.</span>
            </div>
          </div>

          \${isLocked ? \`
            <div class="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-3">
              <i data-lucide="lock" class="w-5 h-5 text-amber-600 shrink-0"></i>
              <span>Hồ sơ nhân khẩu học đang được khóa an toàn đến ngày <strong>\${lockDateStr}</strong> (Khóa 90 ngày sau khi lưu để đảm bảo tính khách quan của dữ liệu nghiên cứu thị trường).</span>
            </div>
          \` : ''}

          <div class="bg-white dark:bg-[#18181B] border border-stone-200/90 dark:border-stone-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4.5">
              <!-- 1. Giới tính -->
              <div class="relative">
                <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Giới tính: *</label>
                <input type="hidden" id="demo-gender" value="\${demographics.gender || 'MALE'}">
                <button type="button" \${isLocked ? 'disabled' : ''} onclick="VibeApp.toggleCustomDropdown('demo-gender-menu', event)"
                        class="custom-dropdown-trigger w-full flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-orange-500 transition-all \${isLocked ? 'opacity-70 cursor-not-allowed' : ''}">
                  <span id="demo-gender-label">\${demographics.gender === 'FEMALE' ? 'Nữ' : (demographics.gender === 'OTHER' ? 'Khác / Không tiết lộ' : 'Nam')}</span>
                  <i data-lucide="chevron-down" class="dropdown-trigger-icon w-3.5 h-3.5 stroke-[2] transition-transform duration-200 pointer-events-none"></i>
                </button>
                \${!isLocked ? \`
                  <div id="demo-gender-menu" class="custom-dropdown-menu hidden absolute left-0 right-0 z-50 mt-1 p-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl space-y-0.5">
                    <div onclick="VibeApp.selectCustomFormOption('demo-gender', 'MALE', 'Nam', event)" class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">
                      <span>Nam</span>
                    </div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-gender', 'FEMALE', 'Nữ', event)" class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">
                      <span>Nữ</span>
                    </div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-gender', 'OTHER', 'Khác / Không tiết lộ', event)" class="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">
                      <span>Khác / Không tiết lộ</span>
                    </div>
                  </div>
                \` : ''}
              </div>

              <!-- 2. Ngày sinh -->
              <div>
                <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Ngày sinh: *</label>
                <input type="date" id="demo-birthdate" value="\${demographics.birth_date || '2003-08-15'}" \${isLocked ? 'disabled' : ''}
                       class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 \${isLocked ? 'opacity-70 cursor-not-allowed' : ''}">
              </div>

              <!-- 3. Tỉnh / Thành phố sinh sống (34 Tỉnh Thành Mới) -->
              <div class="relative">
                <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Tỉnh / Thành phố sinh sống (34 Tỉnh Thành Mới): *</label>
                <input type="hidden" id="demo-province" value="\${demographics.province || 'Hà Nội'}">
                <button type="button" \${isLocked ? 'disabled' : ''} onclick="VibeApp.toggleCustomDropdown('demo-province-menu', event)"
                        class="custom-dropdown-trigger w-full flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-orange-500 transition-all \${isLocked ? 'opacity-70 cursor-not-allowed' : ''}">
                  <span id="demo-province-label">\${demographics.province || 'Hà Nội'}</span>
                  <i data-lucide="chevron-down" class="dropdown-trigger-icon w-3.5 h-3.5 stroke-[2] transition-transform duration-200 pointer-events-none"></i>
                </button>
                \${!isLocked ? \`
                  <div id="demo-province-menu" class="custom-dropdown-menu hidden absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto p-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl space-y-0.5">
                    \${(window.VIBE_34_PROVINCES || ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Quảng Ninh', 'Huế', 'Bắc Ninh', 'Bình Dương', 'Đồng Nai']).map(p => \`
                      <div onclick="VibeApp.selectCustomFormOption('demo-province', '\${p}', '\${p}', event)" 
                           class="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 \${demographics.province === p ? 'text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-stone-800' : 'text-slate-700 dark:text-slate-200'}">
                        <span>\${p}</span>
                      </div>
                    \`).join('')}
                  </div>
                \` : ''}
              </div>

              <!-- 4. Nghề nghiệp / Đối tượng -->
              <div class="relative">
                <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Nghề nghiệp / Đối tượng: *</label>
                <input type="hidden" id="demo-occupation" value="\${demographics.occupation || 'Học sinh / Sinh viên đại học'}">
                <button type="button" \${isLocked ? 'disabled' : ''} onclick="VibeApp.toggleCustomDropdown('demo-occupation-menu', event)"
                        class="custom-dropdown-trigger w-full flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-orange-500 transition-all \${isLocked ? 'opacity-70 cursor-not-allowed' : ''}">
                  <span id="demo-occupation-label">\${demographics.occupation || 'Học sinh / Sinh viên đại học'}</span>
                  <i data-lucide="chevron-down" class="dropdown-trigger-icon w-3.5 h-3.5 stroke-[2] transition-transform duration-200 pointer-events-none"></i>
                </button>
                \${!isLocked ? \`
                  <div id="demo-occupation-menu" class="custom-dropdown-menu hidden absolute left-0 right-0 z-50 mt-1 p-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl space-y-0.5">
                    <div onclick="VibeApp.selectCustomFormOption('demo-occupation', 'Học sinh / Sinh viên đại học', 'Học sinh / Sinh viên đại học', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Học sinh / Sinh viên đại học</div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-occupation', 'Học viên cao học / NCS', 'Học viên cao học / NCS', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Học viên cao học / NCS</div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-occupation', 'Giảng viên / Nhà nghiên cứu', 'Giảng viên / Nhà nghiên cứu', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Giảng viên / Nhà nghiên cứu</div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-occupation', 'Người đi làm (Khối kỹ thuật & kinh tế)', 'Người đi làm (Khối kỹ thuật & kinh tế)', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Người đi làm (Khối kỹ thuật & kinh tế)</div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-occupation', 'Khác', 'Khác', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Khác</div>
                  </div>
                \` : ''}
              </div>

              <!-- 5. Trường Đại Học (293 trường) -->
              <div class="relative">
                <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Trường Đại học / Học Viện / Cao Đẳng: *</label>
                <div class="relative">
                  <input type="text" id="demo-university" value="\${demographics.university || 'Đại học Bách Khoa Hà Nội (HUST)'}" \${isLocked ? 'disabled' : ''} 
                         placeholder="Gõ tìm trường (VD: Bách Khoa, Kinh Tế, FPT, FTU...)"
                         onfocus="VibeApp.filterDemoUniversities(this.value)"
                         oninput="VibeApp.filterDemoUniversities(this.value)"
                         class="w-full p-2.5 pr-8 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 \${isLocked ? 'opacity-70 cursor-not-allowed' : ''}">
                  <i data-lucide="search" class="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-3 pointer-events-none"></i>
                </div>
                \${!isLocked ? \`
                  <div id="demo-uni-popover" class="hidden absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto p-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl space-y-0.5">
                    <div id="demo-uni-dropdown-list" class="space-y-0.5"></div>
                  </div>
                \` : ''}
              </div>

              <!-- 6. Ngành học / Chuyên môn -->
              <div>
                <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Ngành học / Chuyên môn: *</label>
                <input type="text" id="demo-major" value="\${demographics.major || 'Công nghệ thông tin & Trí tuệ nhân tạo (Khoa học Máy tính)'}" \${isLocked ? 'disabled' : ''} placeholder="VD: Công nghệ thông tin, Marketing..."
                       class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 \${isLocked ? 'opacity-70 cursor-not-allowed' : ''}">
              </div>

              <!-- 7. Năm tốt nghiệp -->
              <div>
                <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Năm tốt nghiệp (dự kiến): *</label>
                <input type="number" id="demo-gradyear" value="\${demographics.graduation_year || 2026}" min="1980" max="2035" \${isLocked ? 'disabled' : ''}
                       class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 \${isLocked ? 'opacity-70 cursor-not-allowed' : ''}">
              </div>

              <!-- 8. Mức thu nhập hàng tháng -->
              <div class="relative">
                <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Mức thu nhập hàng tháng: *</label>
                <input type="hidden" id="demo-income" value="\${demographics.monthly_income || 'Dưới 5 triệu VNĐ'}">
                <button type="button" \${isLocked ? 'disabled' : ''} onclick="VibeApp.toggleCustomDropdown('demo-income-menu', event)"
                        class="custom-dropdown-trigger w-full flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-orange-500 transition-all \${isLocked ? 'opacity-70 cursor-not-allowed' : ''}">
                  <span id="demo-income-label">\${demographics.monthly_income ? demographics.monthly_income : 'Dưới 5 triệu VNĐ'}</span>
                  <i data-lucide="chevron-down" class="dropdown-trigger-icon w-3.5 h-3.5 stroke-[2] transition-transform duration-200 pointer-events-none"></i>
                </button>
                \${!isLocked ? \`
                  <div id="demo-income-menu" class="custom-dropdown-menu hidden absolute left-0 right-0 z-50 mt-1 p-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl space-y-0.5">
                    <div onclick="VibeApp.selectCustomFormOption('demo-income', 'Dưới 5 triệu VNĐ', 'Dưới 5 triệu VNĐ', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Dưới 5 triệu VNĐ</div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-income', 'Từ 5 - 10 triệu VNĐ', 'Từ 5 - 10 triệu VNĐ', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Từ 5 - 10 triệu VNĐ</div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-income', 'Từ 10 - 20 triệu VNĐ', 'Từ 10 - 20 triệu VNĐ', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Từ 10 - 20 triệu VNĐ</div>
                    <div onclick="VibeApp.selectCustomFormOption('demo-income', 'Trên 20 triệu VNĐ', 'Trên 20 triệu VNĐ', event)" class="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 text-slate-700 dark:text-slate-200">Trên 20 triệu VNĐ</div>
                  </div>
                \` : ''}
              </div>
            </div>

            <div class="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p class="text-xs text-stone-500">
                Lần cập nhật gần nhất: <span class="text-stone-800 dark:text-stone-200 font-medium">14/10/2025 15:42 (Đã xác minh qua email EDU)</span>
              </p>
              \${!isLocked ? \`
                <button type="button" onclick="VibeApp.saveDemographicsAction()" class="py-2.5 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto">
                  <i data-lucide="save" class="w-4 h-4"></i>
                  <span>Lưu & Cập Nhật Hồ Sơ Nhân Khẩu Học</span>
                </button>
              \` : ''}
            </div>
          </div>
        </div>

        <!-- TAB 2: ĐÁNH GIÁ & MỨC ĐỘ UY TÍN CHUẨN STITCH -->
        <div id="profile-tab-reputation" class="\${activeTab === 'reputation' ? '' : 'hidden'} space-y-5">
          <div>
            <span class="text-[11px] font-black uppercase tracking-wider text-orange-600 block">Huy Hiệu & Đạo Đức Nghiên Cứu</span>
            <h2 class="text-lg font-black text-stone-900 dark:text-white">Đánh Giá & Mức Độ Uy Tín Tài Khoản</h2>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- Cột trái: Visual Metrics Bento -->
            <div class="lg:col-span-5 flex flex-col gap-4">
              <div class="bg-white dark:bg-[#18181B] p-6 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-extrabold uppercase text-stone-500 tracking-wider">Chỉ Số Chất Lượng Đáp Viên</span>
                  <span class="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-[10px] font-extrabold">Xác minh AI</span>
                </div>

                <!-- SVG Circular Gauge & Rating sao -->
                <div class="flex items-center gap-5 py-2">
                  <div class="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path class="text-stone-100 dark:text-stone-800 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3.5"></path>
                      <path class="text-orange-600 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-dasharray="99.8, 100" stroke-linecap="round" stroke-width="3.5"></path>
                    </svg>
                    <div class="absolute flex flex-col items-center">
                      <span class="text-xl font-black text-stone-900 dark:text-white font-mono">99.8%</span>
                      <span class="text-[10px] uppercase font-bold text-stone-500">Chính trực</span>
                    </div>
                  </div>

                  <div class="space-y-1">
                    <div class="flex items-center gap-1 text-amber-500">
                      <i data-lucide="star" class="w-4 h-4 fill-current"></i>
                      <i data-lucide="star" class="w-4 h-4 fill-current"></i>
                      <i data-lucide="star" class="w-4 h-4 fill-current"></i>
                      <i data-lucide="star" class="w-4 h-4 fill-current"></i>
                      <i data-lucide="star" class="w-4 h-4 fill-current"></i>
                      <span class="text-sm font-black text-stone-900 dark:text-white ml-1 font-mono">4.9 / 5</span>
                    </div>
                    <p class="text-xs text-stone-500 leading-relaxed">
                      Dựa trên <strong>186 chủ nhiệm đề tài</strong> đã chấm điểm và nghiệm thu câu trả lời.
                    </p>
                  </div>
                </div>

                <!-- 2 Thanh tiến độ chuẩn Stitch -->
                <div class="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <div>
                    <div class="flex justify-between text-xs font-semibold mb-1">
                      <span class="text-stone-600 dark:text-stone-400">Vượt câu hỏi kiểm tra độ chú ý (Attention-check)</span>
                      <span class="font-bold text-orange-600">100%</span>
                    </div>
                    <div class="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div class="bg-orange-600 h-full w-full rounded-full"></div>
                    </div>
                  </div>

                  <div>
                    <div class="flex justify-between text-xs font-semibold mb-1">
                      <span class="text-stone-600 dark:text-stone-400">Thời gian làm bài khảo sát chuẩn định mức (Không speed-run)</span>
                      <span class="font-bold text-amber-600">98.5%</span>
                    </div>
                    <div class="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                      <div class="bg-amber-500 h-full w-[98.5%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3 Huy hiệu bảo trợ học thuật -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-stone-200/90 dark:border-stone-800 space-y-1.5 shadow-xs">
                  <div class="flex items-center gap-1.5 text-orange-600">
                    <i data-lucide="award" class="w-4 h-4"></i>
                    <h4 class="text-xs font-extrabold text-stone-900 dark:text-white">Đáp Viên Vàng</h4>
                  </div>
                  <p class="text-[11px] text-stone-500 leading-relaxed">Hoàn thành 100% không vi phạm bẫy chú ý (Attention Check).</p>
                </div>

                <div class="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-stone-200/90 dark:border-stone-800 space-y-1.5 shadow-xs">
                  <div class="flex items-center gap-1.5 text-emerald-600">
                    <i data-lucide="check-circle" class="w-4 h-4"></i>
                    <h4 class="text-xs font-extrabold text-stone-900 dark:text-white">Định Danh Edu</h4>
                  </div>
                  <p class="text-[11px] text-stone-500 leading-relaxed">Xác thực qua email trường đại học, hợp lệ theo quy chuẩn bảo trợ đề tài.</p>
                </div>

                <div class="p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-stone-200/90 dark:border-stone-800 space-y-1.5 shadow-xs">
                  <div class="flex items-center gap-1.5 text-blue-600">
                    <i data-lucide="activity" class="w-4 h-4"></i>
                    <h4 class="text-xs font-extrabold text-stone-900 dark:text-white">Chuẩn Cronbach</h4>
                  </div>
                  <p class="text-[11px] text-stone-500 leading-relaxed">Hệ số tin cậy Alpha thang Likert &gt; 0.85 qua các bài khảo sát.</p>
                </div>
              </div>
            </div>

            <!-- Cột phải: Danh sách nhận xét học thuật thực tế -->
            <div class="lg:col-span-7 flex flex-col gap-4">
              <div class="bg-white dark:bg-[#18181B] p-6 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col gap-4">
                <div class="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                  <h3 class="text-sm font-black text-stone-900 dark:text-white uppercase tracking-wider">Nhận Xét Từ Các Chủ Đề Tài Nghiên Cứu</h3>
                  <span class="text-[10px] font-black uppercase text-stone-400">Mới nhất</span>
                </div>

                <!-- Review 1 -->
                <div class="bg-stone-50/80 dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 font-bold text-xs flex items-center justify-center">GS</div>
                      <div>
                        <span class="text-xs font-black text-stone-900 dark:text-white">GS. Đặng Minh Tuấn</span>
                        <span class="text-[11px] text-stone-500 block">ĐH Bách Khoa Hà Nội • Đề tài AI Giáo dục 2025</span>
                      </div>
                    </div>
                    <div class="flex items-center text-amber-500 text-xs font-bold gap-0.5">
                      <i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>
                      <span>5.0</span>
                    </div>
                  </div>
                  <p class="text-xs text-stone-600 dark:text-stone-400 italic leading-relaxed">
                    "Câu trả lời rất chi tiết, phản hồi chân thực và không bỏ sót bất kỳ câu hỏi mở nào. Dữ liệu chất lượng cao, giúp nhóm nghiên cứu tiết kiệm nhiều công sức lọc outlier."
                  </p>
                </div>

                <!-- Review 2 -->
                <div class="bg-stone-50/80 dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 font-bold text-xs flex items-center justify-center">TS</div>
                      <div>
                        <span class="text-xs font-black text-stone-900 dark:text-white">TS. Vũ Thị Hoàng Yến</span>
                        <span class="text-[11px] text-stone-500 block">ĐH Kinh tế Quốc dân • Khảo sát Thói quen chi tiêu Gen Z</span>
                      </div>
                    </div>
                    <div class="flex items-center text-amber-500 text-xs font-bold gap-0.5">
                      <i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>
                      <span>5.0</span>
                    </div>
                  </div>
                  <p class="text-xs text-stone-600 dark:text-stone-400 italic leading-relaxed">
                    "Thời gian hoàn thành trung thực, câu trả lời logic và có tính phản biện cao. Đã duyệt trả thưởng tối đa."
                  </p>
                </div>

                <!-- Review 3 -->
                <div class="bg-stone-50/80 dark:bg-stone-900/60 p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 font-bold text-xs flex items-center justify-center">HV</div>
                      <div>
                        <span class="text-xs font-black text-stone-900 dark:text-white">Nguyễn Thu Thảo (Học viên Cao học)</span>
                        <span class="text-[11px] text-stone-500 block">ĐHQG TP.HCM • Đề tài Luận văn Hành vi người tiêu dùng</span>
                      </div>
                    </div>
                    <div class="flex items-center text-amber-500 text-xs font-bold gap-0.5">
                      <i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>
                      <span>4.8</span>
                    </div>
                  </div>
                  <p class="text-xs text-stone-600 dark:text-stone-400 italic leading-relaxed">
                    "Đáp ứng đúng tiêu chí nhân khẩu học mục tiêu. Rất cảm ơn Linh đã hỗ trợ nhiệt tình cho đề tài tốt nghiệp!"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: KHẢO SÁT ĐÃ TẠO (FORM ĐÃ UP) CHUẨN STITCH -->
        <div id="profile-tab-created-forms" class="\${activeTab === 'created-forms' ? '' : 'hidden'} space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[11px] font-black uppercase tracking-wider text-orange-600 block">Khảo Sát Của Tôi</span>
              <h2 class="text-lg font-black text-stone-900 dark:text-white">Các Form Đã Tạo & Thu Thập Mẫu</h2>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="VibeApp.navigate('create-survey')" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>+ Tạo Khảo Sát Mới</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <!-- Form Card 1 chuẩn Stitch: Active -->
            <div class="bg-white dark:bg-[#18181B] rounded-3xl p-6 border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-between gap-4 group hover:shadow-md transition-all">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Đang thu thập</span>
                    <span class="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 text-[10px] px-2 py-0.5 rounded-full font-semibold">Gói Tăng Tốc GenZ</span>
                  </div>
                  <span class="text-[11px] text-stone-400">Tạo ngày 20/10/2025</span>
                </div>
                <h3 class="text-sm font-black text-stone-900 dark:text-white group-hover:text-orange-600 transition-colors">
                  Đơn tuyển Tình nguyện viên Mạng lưới CLB Sinh viên Nghiên cứu khoa học Gen 3.0
                </h3>
                <p class="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  Khảo sát và thu thập hồ sơ ứng tuyển vị trí Ban Nghiên cứu & Phân tích Dữ liệu cho chuỗi hội thảo quốc gia sinh viên năm học 2025-2026.
                </p>
                <div class="space-y-1">
                  <div class="flex justify-between text-xs font-semibold">
                    <span class="text-stone-500">Tiến độ phản hồi: <strong class="text-stone-900 dark:text-white font-mono">340 / 500 mẫu</strong></span>
                    <span class="text-orange-600 font-bold font-mono">68%</span>
                  </div>
                  <div class="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div class="bg-gradient-to-r from-orange-600 to-amber-500 h-full w-[68%] rounded-full"></div>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <div class="flex items-center gap-1.5">
                  <button class="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-bold transition-colors flex items-center gap-1">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    <span>Sửa</span>
                  </button>
                  <button onclick="VibeApp.navigate('surveys')" class="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-bold transition-colors flex items-center gap-1">
                    <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i>
                    <span>Báo cáo</span>
                  </button>
                  <button class="px-2.5 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-xs font-bold flex items-center gap-1">
                    <i data-lucide="pin" class="w-3.5 h-3.5"></i>
                    <span>Ghim VIP</span>
                  </button>
                </div>
                <div class="flex items-center gap-1">
                  <button class="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors" title="Xuất dữ liệu SPSS / Excel">
                    <i data-lucide="download" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Form Card 2 chuẩn Stitch: Completed -->
            <div class="bg-white dark:bg-[#18181B] rounded-3xl p-6 border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-between gap-4 group hover:shadow-md transition-all">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Đã hoàn thành 100%</span>
                    <span class="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 text-[10px] px-2 py-0.5 rounded-full font-semibold">Bảo trợ Học thuật</span>
                  </div>
                  <span class="text-[11px] text-stone-400">Tạo ngày 02/09/2025</span>
                </div>
                <h3 class="text-sm font-black text-stone-900 dark:text-white group-hover:text-orange-600 transition-colors">
                  Khảo sát hành vi sử dụng LLM hỗ trợ viết code của sinh viên IT tại Hà Nội
                </h3>
                <p class="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  Nghiên cứu tác động của GitHub Copilot và ChatGPT tới tư duy cấu trúc dữ liệu và giải thuật của sinh viên các trường kỹ thuật.
                </p>
                <div class="space-y-1">
                  <div class="flex justify-between text-xs font-semibold">
                    <span class="text-stone-500">Tiến độ phản hồi: <strong class="text-stone-900 dark:text-white font-mono">500 / 500 mẫu</strong></span>
                    <span class="text-emerald-600 font-bold font-mono">100% Đạt</span>
                  </div>
                  <div class="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full w-full rounded-full"></div>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <div class="flex items-center gap-1.5">
                  <button onclick="VibeApp.navigate('surveys')" class="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-bold transition-colors flex items-center gap-1">
                    <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                    <span>Xem lại</span>
                  </button>
                  <button class="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-bold transition-colors flex items-center gap-1">
                    <i data-lucide="pie-chart" class="w-3.5 h-3.5"></i>
                    <span>Tổng hợp</span>
                  </button>
                </div>
                <button class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors flex items-center gap-1">
                  <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
                  <span>Xuất CSV (500 mẫu)</span>
                </button>
              </div>
            </div>

            <!-- Các khảo sát bổ sung từ cơ sở dữ liệu nếu có -->
            \${mySurveys.map(s => {
              const curr = s.current_responses || 0;
              const target = s.target_responses || 100;
              const pct = Math.min(100, Math.round((curr / target) * 100));
              return \`
                <div class="bg-white dark:bg-[#18181B] rounded-3xl p-6 border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-between gap-4 group hover:shadow-md transition-all">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">\${s.category || 'Học thuật'}</span>
                      <span class="text-[11px] text-stone-400">ID: \${s.id}</span>
                    </div>
                    <h3 class="text-sm font-black text-stone-900 dark:text-white group-hover:text-orange-600 transition-colors">\${s.title}</h3>
                    <p class="text-xs text-stone-500 line-clamp-2">\${s.description || 'Khảo sát trực tuyến trên SurvHub'}</p>
                    <div class="space-y-1">
                      <div class="flex justify-between text-xs font-semibold">
                        <span class="text-stone-500">Tiến độ: <strong class="text-stone-900 dark:text-white font-mono">\${curr} / \${target} mẫu</strong></span>
                        <span class="text-orange-600 font-bold font-mono">\${pct}%</span>
                      </div>
                      <div class="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                        <div class="bg-orange-600 h-full w-[\${pct}%] rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center justify-end pt-3 border-t border-stone-100 dark:border-stone-800">
                    <button onclick="VibeApp.navigate('analytics', { surveyId: '\${s.id}' })" class="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800">
                      Xem Báo Cáo
                    </button>
                  </div>
                </div>
              \`;
            }).join('')}
          </div>
        </div>

        <!-- TAB 4: KHẢO SÁT ĐÃ THAM GIA CHUẨN STITCH -->
        <div id="profile-tab-filled-forms" class="\${activeTab === 'filled-forms' ? '' : 'hidden'} space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[11px] font-black uppercase tracking-wider text-orange-600 block">Lịch Sử Trợ Giúp Nghiên Cứu</span>
              <h2 class="text-lg font-black text-stone-900 dark:text-white">Các Khảo Sát Đã Tham Gia Hoàn Thành</h2>
            </div>
            <span class="text-xs text-stone-500">Tổng cộng: <strong class="text-stone-900 dark:text-white font-mono">52 đề tài đã phản hồi hợp lệ</strong></span>
          </div>

          <div class="bg-white dark:bg-[#18181B] rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-stone-50 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 font-black uppercase tracking-wider border-b border-stone-100 dark:border-stone-800">
                  <tr>
                    <th class="py-3 px-5">Tên đề tài khảo sát</th>
                    <th class="py-3 px-4">Đơn vị nghiên cứu</th>
                    <th class="py-3 px-4">Thời gian hoàn thành</th>
                    <th class="py-3 px-4">Thưởng Xu</th>
                    <th class="py-3 px-4">Trạng thái duyệt</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-100 dark:divide-stone-800">
                  <!-- Item 1 -->
                  <tr class="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition-colors">
                    <td class="py-3.5 px-5 font-semibold text-stone-900 dark:text-white max-w-xs">
                      <div class="font-bold text-stone-900 dark:text-white">Khảo sát chuyển đổi số trong thư viện đại học công lập</div>
                      <span class="text-stone-400 text-[11px]">Thời gian làm bài: 11 phút 30 giây</span>
                    </td>
                    <td class="py-3.5 px-4 text-stone-500">ĐHQG Hà Nội</td>
                    <td class="py-3.5 px-4 text-stone-500">Hôm qua, 18:20</td>
                    <td class="py-3.5 px-4 font-black font-mono text-orange-600 dark:text-orange-400">+120 Xu</td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Đã nghiệm thu
                      </span>
                    </td>
                  </tr>

                  <!-- Item 2 -->
                  <tr class="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition-colors">
                    <td class="py-3.5 px-5 font-semibold text-stone-900 dark:text-white max-w-xs">
                      <div class="font-bold text-stone-900 dark:text-white">Thói quen tiêu thụ đồ uống đóng chai của sinh viên ký túc xá</div>
                      <span class="text-stone-400 text-[11px]">Thời gian làm bài: 06 phút 45 giây</span>
                    </td>
                    <td class="py-3.5 px-4 text-stone-500">ĐH Kinh tế Quốc dân</td>
                    <td class="py-3.5 px-4 text-stone-500">28/10/2025</td>
                    <td class="py-3.5 px-4 font-black font-mono text-orange-600 dark:text-orange-400">+80 Xu</td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Đã nghiệm thu
                      </span>
                    </td>
                  </tr>

                  <!-- Item 3 -->
                  <tr class="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition-colors">
                    <td class="py-3.5 px-5 font-semibold text-stone-900 dark:text-white max-w-xs">
                      <div class="font-bold text-stone-900 dark:text-white">Đánh giá tác động áp lực thi cử lên giấc ngủ của sinh viên kỹ thuật</div>
                      <span class="text-stone-400 text-[11px]">Thời gian làm bài: 18 phút 10 giây</span>
                    </td>
                    <td class="py-3.5 px-4 text-stone-500">ĐH Y Hà Nội (Phối hợp)</td>
                    <td class="py-3.5 px-4 text-stone-500">24/10/2025</td>
                    <td class="py-3.5 px-4 font-black font-mono text-orange-600 dark:text-orange-400">+250 Xu</td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Đã nghiệm thu
                      </span>
                    </td>
                  </tr>

                  <!-- Item 4 -->
                  <tr class="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition-colors">
                    <td class="py-3.5 px-5 font-semibold text-stone-900 dark:text-white max-w-xs">
                      <div class="font-bold text-stone-900 dark:text-white">Khảo sát nhận thức an toàn thông tin trên mạng xã hội TikTok</div>
                      <span class="text-stone-400 text-[11px]">Thời gian làm bài: 08 phút 15 giây</span>
                    </td>
                    <td class="py-3.5 px-4 text-stone-500">Học viện Bưu chính Viễn thông</td>
                    <td class="py-3.5 px-4 text-stone-500">19/10/2025</td>
                    <td class="py-3.5 px-4 font-black font-mono text-orange-600 dark:text-orange-400">+100 Xu</td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Đã nghiệm thu
                      </span>
                    </td>
                  </tr>

                  <!-- Item 5 -->
                  <tr class="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition-colors">
                    <td class="py-3.5 px-5 font-semibold text-stone-900 dark:text-white max-w-xs">
                      <div class="font-bold text-stone-900 dark:text-white">Nghiên cứu thị trường dịch vụ giao đồ ăn đêm quanh cụm Bách - Kinh - Xây</div>
                      <span class="text-stone-400 text-[11px]">Thời gian làm bài: 05 phút 02 giây</span>
                    </td>
                    <td class="py-3.5 px-4 text-stone-500">CLB Khởi Nghiệp NEU</td>
                    <td class="py-3.5 px-4 text-stone-500">15/10/2025</td>
                    <td class="py-3.5 px-4 font-black font-mono text-orange-600 dark:text-orange-400">+70 Xu</td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Đã nghiệm thu
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB 5: BÀI VIẾT TRÊN DIỄN ĐÀN CHUẨN STITCH -->
        <div id="profile-tab-forum-posts" class="\${activeTab === 'forum-posts' ? '' : 'hidden'} space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[11px] font-black uppercase tracking-wider text-orange-600 block">Cộng Đồng Học Thuật</span>
              <h2 class="text-lg font-black text-stone-900 dark:text-white">Các Bài Viết Đã Đăng Trên Diễn Đàn</h2>
            </div>
            <button onclick="VibeApp.openCreateForumPostModal()" class="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus-circle" class="w-4 h-4"></i>
              <span>+ Đăng Bài Thảo Luận Mới</span>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <!-- Forum Card 1 chuẩn Stitch -->
            <div class="bg-white dark:bg-[#18181B] p-5 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-between gap-4 group hover:shadow-md transition-all">
              <div class="space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-orange-600 font-bold">#PhuongPhapNghienCuu</span>
                  <span class="text-stone-400 text-[11px]">24/10/2025</span>
                </div>
                <h3 class="text-sm font-black text-stone-900 dark:text-white group-hover:text-orange-600 transition-colors leading-snug">
                  Kinh nghiệm thiết kế câu hỏi bẫy (Attention-check) không gây phản cảm cho người điền
                </h3>
                <p class="text-xs text-stone-500 line-clamp-3 leading-relaxed">
                  Chia sẻ các dạng câu hỏi lọc bot và lọc spam trả lời mà nhóm mình đã áp dụng thành công trong kỳ nghiên cứu khoa học sinh viên trường Bách Khoa...
                </p>
              </div>
              <div class="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
                <div class="flex items-center gap-3">
                  <span class="flex items-center gap-1 text-orange-600 font-bold"><i data-lucide="heart" class="w-3.5 h-3.5 fill-current"></i> 84</span>
                  <span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> 23</span>
                </div>
                <div class="flex items-center gap-1 text-stone-400">
                  <button class="p-1 hover:text-stone-700 dark:hover:text-stone-200" title="Sửa bài"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
                  <button class="p-1 hover:text-red-500" title="Xóa bài"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
              </div>
            </div>

            <!-- Forum Card 2 chuẩn Stitch -->
            <div class="bg-white dark:bg-[#18181B] p-5 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-between gap-4 group hover:shadow-md transition-all">
              <div class="space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-amber-600 font-bold">#TraoDoiMauKhaoSat</span>
                  <span class="text-stone-400 text-[11px]">18/10/2025</span>
                </div>
                <h3 class="text-sm font-black text-stone-900 dark:text-white group-hover:text-orange-600 transition-colors leading-snug">
                  Chéo khảo sát: Tìm 150 đáp viên học ngành IT/Khoa học máy tính tại Hà Nội
                </h3>
                <p class="text-xs text-stone-500 line-clamp-3 leading-relaxed">
                  Chào mọi người, nhóm mình đang làm đề tài khóa luận về mô hình chấp nhận công nghệ GenAI. Bạn nào làm ngành IT điền giúp mình sẽ điền trả 100% kèm review chi tiết!
                </p>
              </div>
              <div class="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
                <div class="flex items-center gap-3">
                  <span class="flex items-center gap-1 text-orange-600 font-bold"><i data-lucide="heart" class="w-3.5 h-3.5 fill-current"></i> 142</span>
                  <span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> 68</span>
                </div>
                <div class="flex items-center gap-1 text-stone-400">
                  <button class="p-1 hover:text-stone-700 dark:hover:text-stone-200" title="Sửa bài"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
                  <button class="p-1 hover:text-red-500" title="Xóa bài"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
              </div>
            </div>

            <!-- Forum Card 3 chuẩn Stitch -->
            <div class="bg-white dark:bg-[#18181B] p-5 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-between gap-4 group hover:shadow-md transition-all">
              <div class="space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-stone-600 dark:text-stone-300 font-bold">#TaiLieuPhanTich</span>
                  <span class="text-stone-400 text-[11px]">05/10/2025</span>
                </div>
                <h3 class="text-sm font-black text-stone-900 dark:text-white group-hover:text-orange-600 transition-colors leading-snug">
                  Hướng dẫn làm sạch dữ liệu khảo sát bị thiếu (Missing Values) bằng Python Pandas
                </h3>
                <p class="text-xs text-stone-500 line-clamp-3 leading-relaxed">
                  Tổng hợp notebook mẫu code xử lý dữ liệu trước khi nạp vào phần mềm SmartPLS hoặc SPSS dành cho các bạn sinh viên lần đầu làm NCKH cấp trường.
                </p>
              </div>
              <div class="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
                <div class="flex items-center gap-3">
                  <span class="flex items-center gap-1 text-orange-600 font-bold"><i data-lucide="heart" class="w-3.5 h-3.5 fill-current"></i> 210</span>
                  <span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> 41</span>
                </div>
                <div class="flex items-center gap-1 text-stone-400">
                  <button class="p-1 hover:text-stone-700 dark:hover:text-stone-200" title="Sửa bài"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
                  <button class="p-1 hover:text-red-500" title="Xóa bài"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
              </div>
            </div>

            <!-- Bài viết động của user nếu có -->
            \${myPosts.map(p => \`
              <div class="bg-white dark:bg-[#18181B] p-5 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-between gap-4 group hover:shadow-md transition-all">
                <div class="space-y-2.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-orange-600 font-bold">\${p.tag || '#ChiaSeKhaoSat'}</span>
                    <span class="text-stone-400 text-[11px]">\${p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : 'Vừa xong'}</span>
                  </div>
                  <h3 class="text-sm font-black text-stone-900 dark:text-white group-hover:text-orange-600 transition-colors leading-snug">\${p.title}</h3>
                  <p class="text-xs text-stone-500 line-clamp-3 leading-relaxed">\${p.content}</p>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500">
                  <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1 text-orange-600 font-bold"><i data-lucide="heart" class="w-3.5 h-3.5 fill-current"></i> \${(p.likes || []).length}</span>
                    <span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> \${(p.comments || []).length}</span>
                  </div>
                  <button onclick="VibeApp.navigate('forum')" class="text-orange-600 font-bold hover:underline">Xem trên Diễn Đàn</button>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>

        <!-- PHÂN HỆ NÂNG CẤP TÀI KHOẢN (GÓI SINH VIÊN / DOANH NGHIỆP) -->
        <div id="profile-tab-STUDENT" class="\${activeTab === 'STUDENT' ? '' : 'hidden'} space-y-5">
          <div class="bg-white dark:bg-[#18181B] border border-stone-200/90 dark:border-stone-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-stone-800 text-orange-600 flex items-center justify-center font-bold">
                  <i data-lucide="graduation-cap" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="text-sm font-extrabold text-slate-900 dark:text-white">Đăng Ký Gói Sinh Viên (.edu.vn / .ac.vn)</h3>
                  <p class="text-xs text-stone-500">Mở khóa giá sàn sinh viên 400đ-600đ/mẫu và nhận 30 lượt mẫu miễn phí / tháng.</p>
                </div>
              </div>

              \${isStudentVerified ? \`
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1.5">
                  <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                  Đã Xác Thực
                </span>
              \` : \`
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                  Chưa Xác Thực
                </span>
              \`}
            </div>

            \${isStudentVerified ? \`
              <div class="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2 text-xs">
                <div class="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <i data-lucide="award" class="w-4 h-4"></i>
                  <span>Tài khoản của bạn đã nâng cấp thành công lên GÓI SINH VIÊN!</span>
                </div>
                <p class="text-emerald-700 dark:text-emerald-300">
                  Email sinh viên đã xác minh: <strong class="font-mono">\${user.student_email || user.email}</strong>
                </p>
                <div class="text-[11px] text-stone-500 pt-1">
                  Đặc quyền: 30 lượt miễn phí / tháng (làm mới ngày 01 hằng tháng), hưởng trọn mức giá sàn ưu đãi cho khóa luận/NCKH, thù lao người điền chia 85/15.
                </div>
              </div>
            \` : \`
              <div class="space-y-4">
                <p class="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Nhập địa chỉ email trường của bạn (Ví dụ: <code class="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">sinhvien@sis.hust.edu.vn</code>, <code class="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">mssv@st.neu.edu.vn</code>). Hệ thống sẽ gửi mã OTP 6 chữ số để kích hoạt tức thì.
                </p>

                <div class="space-y-2 max-w-md">
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300">Email trường đại học (.edu.vn / .ac.vn):</label>
                  <div class="flex gap-2">
                    <input type="email" id="student-email-input" placeholder="nhap.email@truong.edu.vn"
                           class="flex-1 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono font-bold">
                    <button type="button" id="student-send-otp-btn" onclick="VibeApp.sendStudentEmailOtpAction()" class="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shrink-0 shadow-xs transition-all cursor-pointer">
                      Gửi Mã OTP
                    </button>
                  </div>
                </div>

                <div id="student-otp-section" class="hidden space-y-2 max-w-md pt-2 border-t border-stone-100 dark:border-stone-800">
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300">Nhập mã xác thực OTP 6 số (gửi về email):</label>
                  <div class="flex gap-2">
                    <input type="text" id="student-otp-input" placeholder="VD: 123456" maxlength="6"
                           class="w-36 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-center font-mono font-black text-sm tracking-widest text-orange-600">
                    <button type="button" onclick="VibeApp.verifyStudentEmailOtpAction()" class="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer">
                      Xác Nhận Kích Hoạt Gói SV
                    </button>
                  </div>
                </div>
              </div>
            \`}
          </div>
        </div>

        <div id="profile-tab-ENTERPRISE" class="\${activeTab === 'ENTERPRISE' ? '' : 'hidden'} space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- CẤP ĐỘ 1: HỒ SƠ THƯƠNG HIỆU CƠ BẢN -->
            <div class="bg-white dark:bg-[#18181B] border \${isEnterpriseLevel1 || isEnterpriseLevel2 ? 'border-orange-500/40' : 'border-stone-200 dark:border-stone-800'} rounded-3xl p-6 shadow-sm space-y-4">
              <div class="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-md bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-black flex items-center justify-center font-mono">1</span>
                  <h3 class="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Cấp Độ 1: Thương Hiệu Cơ Bản</h3>
                </div>
                \${isEnterpriseLevel1 || isEnterpriseLevel2 ? '<span class="text-[10px] font-bold text-emerald-600">Đã kích hoạt</span>' : ''}
              </div>

              <p class="text-xs text-stone-500 leading-relaxed">
                Khai báo hồ sơ doanh nghiệp cơ bản để hiển thị Tên thương hiệu đại diện, Website và Số điện thoại liên hệ trên các bài khảo sát.
              </p>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Tên thương hiệu / Tổ chức: *</label>
                  <input type="text" id="ent-brand-name" value="\${enterpriseProfile.brand_name}" placeholder="VD: Tập đoàn FPT, Vingroup, Masan..."
                         class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold">
                </div>
                <div>
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Lĩnh vực hoạt động: *</label>
                  <input type="text" id="ent-industry" value="\${enterpriseProfile.industry}" placeholder="VD: FMCG, Công nghệ, Bán lẻ, Tài chính..."
                         class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold">
                </div>
                <div>
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Website chính thức:</label>
                  <input type="url" id="ent-website" value="\${enterpriseProfile.website_url}" placeholder="https://company.vn"
                         class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono">
                </div>
                <div>
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Số điện thoại liên hệ:</label>
                  <input type="text" id="ent-phone" value="\${enterpriseProfile.contact_phone}" placeholder="024 xxxx xxxx hoặc hotline"
                         class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold">
                </div>
              </div>

              <button type="button" onclick="VibeApp.saveEnterpriseLevelAction(1)" class="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer">
                Lưu Thông Tin Cấp Độ 1
              </button>
            </div>

            <!-- CẤP ĐỘ 2: PHÁP NHÂN & HÓA ĐƠN VAT ĐỎ -->
            <div class="bg-white dark:bg-[#18181B] border \${isEnterpriseLevel2 ? 'border-orange-500/40' : 'border-stone-200 dark:border-stone-800'} rounded-3xl p-6 shadow-sm space-y-4">
              <div class="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-md bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-black flex items-center justify-center font-mono">2</span>
                  <h3 class="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Cấp Độ 2: Pháp Nhân & Hóa Đơn VAT</h3>
                </div>
                \${isEnterpriseLevel2 ? '<span class="text-[10px] font-bold text-emerald-600">Đã xác minh</span>' : ''}
              </div>

              <p class="text-xs text-stone-500 leading-relaxed">
                Khai báo đầy đủ mã số thuế và thông tin pháp nhân để xuất hóa đơn GTGT điện tử (e-Invoice) cho các chiến dịch khảo sát và ký hợp đồng dịch vụ.
              </p>

              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Tên pháp nhân đầy đủ theo ĐKKD: *</label>
                  <input type="text" id="ent-legal-name" value="\${enterpriseProfile.company_legal_name}" placeholder="CÔNG TY CỔ PHẦN..."
                         class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold">
                </div>
                <div>
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Mã số thuế doanh nghiệp (MST): *</label>
                  <input type="text" id="ent-tax-id" value="\${enterpriseProfile.tax_id}" placeholder="0101234567"
                         class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono font-bold">
                </div>
                <div>
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Địa chỉ trụ sở chính (theo ĐKKD): *</label>
                  <input type="text" id="ent-address" value="\${enterpriseProfile.headquarters_address}" placeholder="Tầng X, Tòa nhà Y, Quận Z, TP..."
                         class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold">
                </div>
                <div>
                  <label class="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Email nhận hóa đơn điện tử (e-Invoice): *</label>
                  <input type="email" id="ent-invoice-email" value="\${enterpriseProfile.invoice_email}" placeholder="ketoan@company.vn"
                         class="w-full p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono font-bold">
                </div>
              </div>

              <button type="button" onclick="VibeApp.saveEnterpriseLevelAction(2)" class="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 text-xs font-bold shadow-xs cursor-pointer">
                Xác Thực Pháp Nhân Cấp Độ 2
              </button>
            </div>
          </div>
        </div>

      </div>
    \`;

    // Khởi tạo icons Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  switchProfileTab(tabName) {
    this.haptic('selection');
    this.state.profileTab = tabName;
    const root = document.getElementById('app-root');
    this.renderProfileView(root);
  },
`;

content = content.substring(0, startIndex) + profileBlock + content.substring(endIndex);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Successfully updated renderProfileView in app.js');
