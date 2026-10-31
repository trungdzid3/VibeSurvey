/**
 * SurvHub - Custom Dropdown Popover Module
 * Tuan thu DESIGN.md Muc 5.3: Quy Chuan Dropdown & Custom Selection System (Bento Modern)
 * Cam 100% the select nguyen thuy cua trinh duyet trong modal/quan tri.
 * TUYET DOI KHONG DUNG EMOJI.
 */

(function () {
  'use strict';

  window.VibeApp = window.VibeApp || {};

  const CustomDropdownModule = {
    _activeDropdownId: null,
    _activeDropdownIconId: null,
    _dropdownListenersInitialized: false,

    /**
     * Khoi tao su kien lang nghe click toan cuc de tu dong dong dropdown khi bam ra ngoai
     */
    initDropdownListeners() {
      if (this._dropdownListenersInitialized) return;
      this._dropdownListenersInitialized = true;

      document.addEventListener('click', (event) => {
        if (!this._activeDropdownId) return;

        const ddEl = document.getElementById(this._activeDropdownId);
        const triggerEl = this._activeDropdownTriggerId 
          ? document.getElementById(this._activeDropdownTriggerId) 
          : null;

        if (ddEl && !ddEl.contains(event.target) && (!triggerEl || !triggerEl.contains(event.target))) {
          this.closeAllCustomDropdowns();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this._activeDropdownId) {
          this.closeAllCustomDropdowns();
        }
      });
    },

    /**
     * Dong/mo mot Custom Dropdown Popover cu the (Chu ky ham linh hoat va an toan tuyet doi)
     */
    toggleCustomDropdown(dropdownId, arg2, arg3, arg4) {
      let iconId = null;
      let event = null;
      let triggerId = null;

      if (arg2 && typeof arg2.stopPropagation === 'function') {
        event = arg2;
      } else if (typeof arg2 === 'string') {
        iconId = arg2;
        if (arg3 && typeof arg3.stopPropagation === 'function') {
          event = arg3;
        }
        if (typeof arg4 === 'string') {
          triggerId = arg4;
        }
      } else if (arg3 && typeof arg3.stopPropagation === 'function') {
        event = arg3;
      }

      if (event) {
        if (typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
      }

      this.initDropdownListeners();

      const dd = document.getElementById(dropdownId);
      if (!dd) return;

      const isOpening = dd.classList.contains('hidden');

      // Dong cac dropdown khac truoc khi mo dropdown nay
      this.closeAllCustomDropdowns();

      if (isOpening) {
        dd.classList.remove('hidden');
        let icon = iconId ? document.getElementById(iconId) : null;
        if (!icon && dd.parentElement) {
          icon = dd.parentElement.querySelector('.dropdown-trigger-icon, .custom-dropdown-icon');
        }
        if (icon) icon.classList.add('rotate-180');

        this._activeDropdownId = dropdownId;
        this._activeDropdownIconId = iconId || (icon ? icon.id : null);
        this._activeDropdownTriggerId = triggerId;
      }
    },

    /**
     * Dong tat ca custom dropdowns dang mo tren man hinh
     */
    closeAllCustomDropdowns() {
      if (this._activeDropdownId) {
        const dd = document.getElementById(this._activeDropdownId);
        if (dd) dd.classList.add('hidden');
      }
      if (this._activeDropdownIconId) {
        const icon = document.getElementById(this._activeDropdownIconId);
        if (icon) icon.classList.remove('rotate-180');
      }
      this._activeDropdownId = null;
      this._activeDropdownIconId = null;
      this._activeDropdownTriggerId = null;

      // Dong tat ca cac menu co class custom dropdown/popover
      document.querySelectorAll('.custom-dropdown-menu, .vibe-popover, .custom-dropdown-popover').forEach(d => d.classList.add('hidden'));
      document.querySelectorAll('.dropdown-trigger-icon, .custom-dropdown-icon').forEach(i => i.classList.remove('rotate-180'));

      // Danh sach cac ID menu/popover cu the trong toan bo ung dung
      const specificIds = [
        'studio-category-menu',
        'studio-gender-menu',
        'studio-age-menu',
        'studio-region-popover',
        'studio-region-menu',
        'studio-occ-menu',
        'studio-uni-popover',
        'studio-duration-menu',
        'demo-uni-popover',
        'demo-gender-menu',
        'demo-province-menu',
        'demo-occupation-menu',
        'demo-income-menu',
        'user-profile-dropdown',
        'header-notif-dropdown',
        'sort-dropdown-menu',
        'length-dropdown-menu',
        'payout-points-menu',
        'payout-method-menu',
        'payout-telco-menu',
        'redeem-custom-bank-menu',
        'redeem-custom-telco-menu',
        'fast-cat-dropdown-menu',
        'admin-payout-type-menu',
        'admin-payout-status-menu',
        'admin-payout-limit-menu',
        'admin-fraud-limit-menu',
        'admin-fraud-page-menu',
        'audit-action-dropdown'
      ];
      specificIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
    },

    /**
     * Helper dong/mo bo loc trang thai Admin Bug Reports
     */
    toggleAdminBugFilterDropdown(filterKey, event) {
      const dropdownId = `admin-bug-filter-${filterKey}-dropdown`;
      const iconId = `admin-bug-filter-${filterKey}-icon`;
      const triggerId = `admin-bug-filter-${filterKey}-btn`;
      this.toggleCustomDropdown(dropdownId, iconId, event, triggerId);
    },

    /**
     * Chon muc trong bo loc Admin Bug Reports va kich hoat loc du lieu
     */
    selectAdminBugFilter(filterKey, val, label) {
      this.closeAllCustomDropdowns();
      if (typeof this.setAdminBugFilter === 'function') {
        this.setAdminBugFilter(filterKey, val);
      }
    },

    /**
     * Chuyển đổi mã trạng thái sang tên tiếng Việt chuẩn mực để hiển thị trên Dropdown
     */
    getAdminBugFilterStatusLabel(val) {
      switch (val) {
        case 'PENDING': return 'Chờ tiếp nhận';
        case 'INVESTIGATING': return 'Đang kiểm tra';
        case 'RESOLVED': return 'Đã khắc phục';
        case 'REJECTED': return 'Đã đóng / Từ chối';
        default: return 'Tất cả trạng thái';
      }
    },

    /**
     * Chuyển đổi mã danh mục sang tên tiếng Việt chuẩn mực để hiển thị trên Dropdown
     */
    getAdminBugFilterCategoryLabel(val) {
      switch (val) {
        case 'UI_UX': return 'Giao diện (UI/UX)';
        case 'SURVEY': return 'Làm Khảo Sát';
        case 'CREATOR_STUDIO': return 'Thiết Kế Khảo Sát';
        case 'PAYMENT': return 'Ví & Nạp Rút Tiền';
        case 'AUTH': return 'Đăng Nhập / Hồ Sơ';
        case 'OTHER': return 'Sự Cố Khác';
        default: return 'Tất cả danh mục';
      }
    }
  };

  // Tu dong dang ky listener khi tai trang
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => CustomDropdownModule.initDropdownListeners());
    } else {
      CustomDropdownModule.initDropdownListeners();
    }
  }

  // Mo rong vao Namespace SSOT window.VibeApp
  Object.assign(window.VibeApp, CustomDropdownModule);
  window.CustomDropdownModule = CustomDropdownModule;
})();
