/**
 * KIỂM CHUẨN TỰ ĐỘNG CDP: XÁC MINH HIT-TEST VÀ TƯƠNG TÁC THỰC TRÊN TRÌNH DUYỆT EDGE HEADLESS
 * Dự án: VibeSurvey Platform
 * Tác vụ: Quality Gate Verification for Interactive Elements & Defensive CSS
 */

const { spawn } = require('child_process');
const http = require('http');

async function runVerification() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const debugPort = 9235;
  const targetUrl = 'http://localhost:3000';

  const browser = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1280,900',
    '--disable-gpu',
    '--no-sandbox',
    targetUrl
  ]);

  let ws = null;

  try {
    // Đợi trình duyệt khởi động và lắng nghe trên port
    await new Promise(r => setTimeout(r, 2000));

    // Lấy target page từ CDP json API
    const targets = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${debugPort}/json`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
      throw new Error('Không tìm thấy page target trong CDP session');
    }

    ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let idCounter = 1;
    const pending = new Map();

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      }
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    // Đợi 2 giây để DOM tải xong và scripts khởi tạo
    await new Promise(r => setTimeout(r, 2000));

    // Helper thực thi biểu thức JS trong trình duyệt
    async function evaluate(fnString) {
      const res = await send('Runtime.evaluate', {
        expression: `(${fnString})()`,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result.value;
    }

    // Helper mô phỏng nhấp chuột vật lý theo tọa độ qua CDP Input domain
    async function clickCoords(x, y) {
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: Math.round(x),
        y: Math.round(y),
        button: 'left',
        clickCount: 1
      });
      await new Promise(r => setTimeout(r, 60));
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: Math.round(x),
        y: Math.round(y),
        button: 'left',
        clickCount: 1
      });
    }

    const testReport = {
      timestamp: new Date().toISOString(),
      environment: {
        browser: 'Microsoft Edge (Headless New)',
        targetUrl: targetUrl,
        viewport: '1280x900'
      },
      hitTestResults: {},
      interactiveFlowResults: {},
      cssDefensiveResults: {},
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        allPassed: false
      }
    };

    function recordResult(category, name, passed, details) {
      testReport.summary.totalChecks++;
      if (passed) {
        testReport.summary.passedChecks++;
      } else {
        testReport.summary.failedChecks++;
      }
      testReport[category][name] = {
        passed,
        ...details
      };
    }

    // ==========================================
    // 1. KIỂM TRA HIT-TEST CÁC THÀNH PHẦN CHÍNH
    // ==========================================

    // 1.1 Nút Đăng Nhập trên Header
    const loginHitTest = await evaluate(`() => {
      const btn = document.querySelector('#guest-auth-actions button:first-child');
      if (!btn) return { exists: false };
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const elAtPoint = document.elementFromPoint(cx, cy);
      const isHit = elAtPoint === btn || btn.contains(elAtPoint);
      return {
        exists: true,
        text: btn.textContent.trim(),
        rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        hitElement: elAtPoint ? { tag: elAtPoint.tagName, id: elAtPoint.id, class: elAtPoint.className } : null,
        isHit
      };
    }`);
    recordResult('hitTestResults', 'guestLoginButton', loginHitTest.isHit === true, loginHitTest);

    // 1.2 Nút Đăng Ký trên Header
    const registerHitTest = await evaluate(`() => {
      const btn = document.querySelector('#guest-auth-actions button:last-child');
      if (!btn) return { exists: false };
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const elAtPoint = document.elementFromPoint(cx, cy);
      const isHit = elAtPoint === btn || btn.contains(elAtPoint);
      return {
        exists: true,
        text: btn.textContent.trim(),
        rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        hitElement: elAtPoint ? { tag: elAtPoint.tagName, id: elAtPoint.id, class: elAtPoint.className } : null,
        isHit
      };
    }`);
    recordResult('hitTestResults', 'guestRegisterButton', registerHitTest.isHit === true, registerHitTest);

    // 1.3 Các Tab Header: Khảo Sát, Tạo Khảo Sát, Chợ Voucher
    const headerTabsHitTest = await evaluate(`() => {
      const tabSelectors = [
        { name: 'KhaoSat', selector: '#desktop-nav button[onclick*="surveys"]' },
        { name: 'TaoKhaoSat', selector: '#desktop-nav button[onclick*="create-survey"]' },
        { name: 'ChoVoucher', selector: '#desktop-nav button[onclick*="voucher-market"]' }
      ];

      return tabSelectors.map(t => {
        const btn = document.querySelector(t.selector);
        if (!btn) return { name: t.name, exists: false };
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const elAtPoint = document.elementFromPoint(cx, cy);
        const isHit = elAtPoint === btn || btn.contains(elAtPoint);
        return {
          name: t.name,
          exists: true,
          text: btn.textContent.trim(),
          rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
          hitElement: elAtPoint ? { tag: elAtPoint.tagName, id: elAtPoint.id } : null,
          isHit
        };
      });
    }`);
    const allTabsHit = headerTabsHitTest.every(t => t.isHit === true);
    recordResult('hitTestResults', 'headerNavigationTabs', allTabsHit, { tabs: headerTabsHitTest });

    // 1.4 Thẻ Khảo sát trên trang chủ (.survey-clean-card, .bento-card)
    const surveyCardHitTest = await evaluate(`() => {
      const cards = Array.from(document.querySelectorAll('.survey-clean-card, .bento-card'));
      if (cards.length === 0) return { exists: false, count: 0 };
      
      const firstCard = cards[0];
      const rect = firstCard.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const elAtPoint = document.elementFromPoint(cx, cy);
      const isHit = elAtPoint === firstCard || firstCard.contains(elAtPoint);
      return {
        exists: true,
        count: cards.length,
        firstCardRect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        hitElement: elAtPoint ? { tag: elAtPoint.tagName, id: elAtPoint.id, class: elAtPoint.className } : null,
        isHit
      };
    }`);
    recordResult('hitTestResults', 'homepageSurveyCards', surveyCardHitTest.isHit === true, surveyCardHitTest);

    // 1.5 Nút Báo Lỗi nổi ở góc dưới
    const bugReportHitTest = await evaluate(`() => {
      const btn = document.querySelector('button[onclick*="openBugReportModal"]');
      if (!btn) return { exists: false };
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const elAtPoint = document.elementFromPoint(cx, cy);
      const isHit = elAtPoint === btn || btn.contains(elAtPoint);
      return {
        exists: true,
        text: btn.textContent.trim(),
        rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
        hitElement: elAtPoint ? { tag: elAtPoint.tagName, id: elAtPoint.id, class: elAtPoint.className } : null,
        isHit
      };
    }`);
    recordResult('hitTestResults', 'floatingBugReportButton', bugReportHitTest.isHit === true, bugReportHitTest);

    // ==========================================
    // 2. KIỂM TRA LUỒNG TƯƠNG TÁC THỰC
    // ==========================================

    // 2.1 Dispatch click vào nút Đăng Nhập -> Xác nhận #modal-container mở ra, kiểm tra hit-test nút submit bên trong
    await evaluate(`() => {
      const btn = document.querySelector('#guest-auth-actions button:first-child');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        btn.click();
      }
    }`);
    await new Promise(r => setTimeout(r, 500));

    const loginModalOpened = await evaluate(`() => {
      const modal = document.getElementById('modal-container');
      if (!modal) return { exists: false };
      const isHidden = modal.classList.contains('hidden');
      const computedDisplay = window.getComputedStyle(modal).display;
      const submitBtn = document.querySelector('#auth-submit-btn, #modal-card button[type="submit"]');
      
      let submitBtnHit = false;
      let submitBtnRect = null;
      let submitHitEl = null;

      if (submitBtn) {
        const rect = submitBtn.getBoundingClientRect();
        submitBtnRect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
        const elAtPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        submitBtnHit = elAtPoint === submitBtn || submitBtn.contains(elAtPoint);
        submitHitEl = elAtPoint ? { tag: elAtPoint.tagName, id: elAtPoint.id } : null;
      }

      return {
        exists: true,
        isHidden,
        computedDisplay,
        isOpen: !isHidden && computedDisplay !== 'none',
        hasSubmitBtn: !!submitBtn,
        submitBtnHit,
        submitBtnRect,
        submitHitEl
      };
    }`);
    recordResult(
      'interactiveFlowResults',
      'openLoginModalAndVerifySubmitHitTest',
      loginModalOpened.isOpen === true && loginModalOpened.submitBtnHit === true,
      loginModalOpened
    );

    // 2.2 Dispatch click nút đóng modal (#modal-card button[onclick*="closeModal"]) -> Xác nhận #modal-container đã ẩn, không bị che
    await evaluate(`() => {
      const closeBtn = document.querySelector('#modal-card button[onclick*="closeModal"]');
      if (closeBtn) {
        closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        closeBtn.click();
      }
    }`);
    await new Promise(r => setTimeout(r, 500));

    const modalClosedCheck = await evaluate(`() => {
      const modal = document.getElementById('modal-container');
      const isHidden = modal ? modal.classList.contains('hidden') : true;
      const computedDisplay = modal ? window.getComputedStyle(modal).display : 'none';
      
      // Kiểm tra tại tọa độ giữa màn hình (640, 450)
      const centerEl = document.elementFromPoint(640, 450);
      const isCoveredByModal = modal ? (centerEl === modal || modal.contains(centerEl)) : false;

      return {
        isHidden,
        computedDisplay,
        isFullyHidden: isHidden && computedDisplay === 'none',
        isCoveredByModal,
        centerElement: centerEl ? { tag: centerEl.tagName, id: centerEl.id, class: centerEl.className } : null
      };
    }`);
    recordResult(
      'interactiveFlowResults',
      'closeLoginModalAndVerifyNoBackdropOverlay',
      modalClosedCheck.isFullyHidden === true && modalClosedCheck.isCoveredByModal === false,
      modalClosedCheck
    );

    // 2.3 Dispatch click nút Báo Lỗi -> Xác nhận #bug-report-modal mở ra
    await evaluate(`() => {
      const btn = document.querySelector('button[onclick*="openBugReportModal"]');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        btn.click();
      }
    }`);
    await new Promise(r => setTimeout(r, 500));

    const bugModalOpened = await evaluate(`() => {
      const modal = document.getElementById('bug-report-modal');
      if (!modal) return { exists: false };
      const isHidden = modal.classList.contains('hidden');
      const computedDisplay = window.getComputedStyle(modal).display;
      return {
        exists: true,
        isHidden,
        computedDisplay,
        isOpen: !isHidden && computedDisplay !== 'none'
      };
    }`);
    recordResult(
      'interactiveFlowResults',
      'openBugReportModal',
      bugModalOpened.isOpen === true,
      bugModalOpened
    );

    // 2.4 Dispatch click đóng modal Báo Lỗi -> Xác nhận modal đã ẩn hoàn toàn
    await evaluate(`() => {
      const closeBtn = document.querySelector('#bug-report-modal button[onclick*="closeBugReportModal"]');
      if (closeBtn) {
        closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        closeBtn.click();
      }
    }`);
    await new Promise(r => setTimeout(r, 500));

    const bugModalClosed = await evaluate(`() => {
      const modal = document.getElementById('bug-report-modal');
      if (!modal) return { exists: false };
      const isHidden = modal.classList.contains('hidden');
      const computedDisplay = window.getComputedStyle(modal).display;
      return {
        exists: true,
        isHidden,
        computedDisplay,
        isFullyHidden: isHidden && computedDisplay === 'none'
      };
    }`);
    recordResult(
      'interactiveFlowResults',
      'closeBugReportModal',
      bugModalClosed.isFullyHidden === true,
      bugModalClosed
    );

    // ==========================================
    // 3. KIỂM TRA TÍNH PHÒNG VỆ CSS
    // ==========================================
    const cssDefensiveCheck = await evaluate(`() => {
      const modalIds = [
        'modal-container',
        'image-picker-modal',
        'terms-modal',
        'google-oauth-modal',
        'bug-report-modal',
        'admin-bug-detail-modal',
        'image-lightbox-modal',
        'push-permission-banner'
      ];

      return modalIds.map(id => {
        const el = document.getElementById(id);
        if (!el) return { id, exists: false };
        const hasHiddenClass = el.classList.contains('hidden');
        const computedStyle = window.getComputedStyle(el);
        const display = computedStyle.display;
        return {
          id,
          exists: true,
          hasHiddenClass,
          display,
          // Nếu có class hidden thì bắt buộc display phải bằng none
          isCompliant: hasHiddenClass ? (display === 'none') : true
        };
      });
    }`);

    const allDefensiveCompliant = cssDefensiveCheck.every(m => m.isCompliant === true);
    recordResult(
      'cssDefensiveResults',
      'hiddenModalsHaveDisplayNone',
      allDefensiveCompliant,
      { modals: cssDefensiveCheck }
    );

    testReport.summary.allPassed = (testReport.summary.failedChecks === 0);

    // Xuất báo cáo dạng JSON chuẩn
    console.log(JSON.stringify(testReport, null, 2));

    if (!testReport.summary.allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Lỗi thực thi kiểm chuẩn CDP:', err);
    process.exitCode = 1;
  } finally {
    if (ws) {
      try { ws.close(); } catch (_) {}
    }
    browser.kill();
  }
}

runVerification();
