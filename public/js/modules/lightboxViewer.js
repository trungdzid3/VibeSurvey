/**
 * VibeSurvey - In-App Image Lightbox Viewer Module
 * Tuan thu DESIGN.md Muc 5.4: Quy Chuan Xem Anh Minh Chung & Hinh Anh Bao Loi
 * Khong dung the <a> tai file roi rac, phong to truc tiep tren nen toi mo cao cap.
 * TUYET DOI KHONG DUNG EMOJI.
 */

(function () {
  'use strict';

  window.VibeApp = window.VibeApp || {};

  const LightboxViewerModule = {
    _lightboxListenersBound: false,

    /**
     * Dang ky su kien phim Escape va click backdrop de dong Lightbox
     */
    initLightboxListeners() {
      if (this._lightboxListenersBound) return;
      this._lightboxListenersBound = true;

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const modal = document.getElementById('image-lightbox-modal');
          if (modal && !modal.classList.contains('hidden')) {
            this.closeImageLightbox();
          }
        }
      });
    },

    /**
     * Phong to anh truc tiep tren giao dien (In-App Image Lightbox Viewer SSOT)
     */
    previewFullImage(url, title = 'Anh minh chung su co') {
      if (!url) return;

      this.initLightboxListeners();

      const modal = document.getElementById('image-lightbox-modal');
      const img = document.getElementById('image-lightbox-img');
      const titleEl = document.getElementById('image-lightbox-title');
      const linkEl = document.getElementById('image-lightbox-link');

      if (!modal || !img) {
        // Neu chua co modal tren DOM (truong hop fallback), mo tab moi
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      img.src = url;
      if (titleEl) {
        titleEl.textContent = title || 'Anh minh chung su co';
      }
      if (linkEl) {
        linkEl.href = url;
      }

      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');

      if (window.lucide) {
        window.lucide.createIcons();
      }
    },

    /**
     * Dong Lightbox va khoi phuc trang thai cuon trang
     */
    closeImageLightbox() {
      const modal = document.getElementById('image-lightbox-modal');
      if (modal) {
        modal.classList.add('hidden');
      }

      // Kiem tra neu khong con modal nao khac dang mo thi mo lai cuon trang
      const anyOtherModalOpen = document.querySelector('.fixed.inset-0:not(.hidden)');
      if (!anyOtherModalOpen) {
        document.body.classList.remove('overflow-hidden');
      }

      // Xoa src anh de giai phong bo nho trinh duyet
      const img = document.getElementById('image-lightbox-img');
      if (img) {
        img.src = '';
      }
    }
  };

  // Dang ky listener san sang
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => LightboxViewerModule.initLightboxListeners());
    } else {
      LightboxViewerModule.initLightboxListeners();
    }
  }

  // Mo rong vao Namespace SSOT window.VibeApp
  Object.assign(window.VibeApp, LightboxViewerModule);
  window.LightboxViewerModule = LightboxViewerModule;
})();
