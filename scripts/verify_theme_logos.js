/**
 * KIEM CHUAN TU DONG CDP: XAC MINH LOGO THEME SANG / TOI TREN TRINH DUYET EDGE HEADLESS
 * Du an: VibeSurvey Platform
 * Tuan thu: DESIGN.md, 100% tieng Viet, khong emoji/icon sticker
 */

const { spawn } = require('child_process');
const http = require('http');

async function verifyThemeLogos() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const debugPort = 9240;
  const targetUrl = 'http://localhost:3000';

  console.log('[KHOI TAO] Khoi dong trinh duyet Edge headless tren cong debug ' + debugPort + '...');

  const browser = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--window-size=1280,900',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  let ws = null;

  try {
    // Doi trinh duyet khoi dong va lang nghe
    await new Promise(r => setTimeout(r, 2000));

    // Lay target page tu CDP JSON endpoint
    const targets = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${debugPort}/json`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
      throw new Error('Khong tim thay target trang web trong phien CDP');
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
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    // Bat Page va Runtime domain
    await send('Page.enable');
    await send('Runtime.enable');

    console.log('[DIEU HUONG] Dang mo dia chi ' + targetUrl + '...');
    await send('Page.navigate', { url: targetUrl });

    // Ham danh gia JavaScript tren context trinh duyet
    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || 'Loi danh gia script CDP');
      }
      return res.result ? res.result.value : undefined;
    }

    // Cho trang load hoan tat va window.VibeApp san sang
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const isReady = await evaluate(`document.readyState === 'complete' && typeof window.VibeApp !== 'undefined'`);
        if (isReady) {
          ready = true;
          break;
        }
      } catch (e) {}
    }

    if (!ready) {
      throw new Error('Trang web khong the tai hoan tat trong thoi gian cho');
    }

    console.log('[TRANG THAI] Trang web da tai xong va VibeApp da san sang!');
    await new Promise(r => setTimeout(r, 500));

    console.log('------------------------------------------------------------');
    console.log('[KIEM THU 1] Kiem tra logo o Light Theme (Giao dien sang)');
    console.log('------------------------------------------------------------');

    // Dam bao dang o Light mode
    await evaluate(`
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vibesurvey_theme', 'light');
      if (window.VibeApp && typeof VibeApp.updateThemeIcon === 'function') {
        VibeApp.updateThemeIcon(false);
      }
      if (window.VibeApp && typeof VibeApp.updateThemeLogos === 'function') {
        VibeApp.updateThemeLogos(false);
      }
    `);

    await new Promise(r => setTimeout(r, 300));

    const lightThemeStatus = await evaluate(`
      (() => {
        const isDark = document.documentElement.classList.contains('dark');
        
        // Header logos
        const headerLight = document.querySelector('header img[src*="logo-light.svg"]');
        const headerDark = document.querySelector('header img[src*="logo-dark.svg"]');
        
        // Footer logos
        const footerLight = document.querySelector('footer img[src*="logo-light.svg"]');
        const footerDark = document.querySelector('footer img[src*="logo-dark.svg"]');

        const getVisible = (el) => {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        };

        return {
          isDark,
          headerLightExists: !!headerLight,
          headerDarkExists: !!headerDark,
          headerLightVisible: getVisible(headerLight),
          headerDarkVisible: getVisible(headerDark),
          footerLightExists: !!footerLight,
          footerDarkExists: !!footerDark,
          footerLightVisible: getVisible(footerLight),
          footerDarkVisible: getVisible(footerDark)
        };
      })()
    `);

    console.log('Ket qua kiem tra Light Theme:');
    console.log('- Che do dark mode cua trang:', lightThemeStatus.isDark ? 'Bat (Sai)' : 'Tat (Dung)');
    console.log('- Header logo-light.svg ton tai:', lightThemeStatus.headerLightExists ? 'Co' : 'Khong');
    console.log('- Header logo-light.svg hien thi:', lightThemeStatus.headerLightVisible ? 'Hien thi (Dung)' : 'An (Sai)');
    console.log('- Header logo-dark.svg an:', !lightThemeStatus.headerDarkVisible ? 'An (Dung)' : 'Hien thi (Sai)');
    console.log('- Footer logo-light.svg ton tai:', lightThemeStatus.footerLightExists ? 'Co' : 'Khong');
    console.log('- Footer logo-light.svg hien thi:', lightThemeStatus.footerLightVisible ? 'Hien thi (Dung)' : 'An (Sai)');
    console.log('- Footer logo-dark.svg an:', !lightThemeStatus.footerDarkVisible ? 'An (Dung)' : 'Hien thi (Sai)');

    const test1Passed = !lightThemeStatus.isDark &&
      lightThemeStatus.headerLightVisible &&
      !lightThemeStatus.headerDarkVisible &&
      lightThemeStatus.footerLightVisible &&
      !lightThemeStatus.footerDarkVisible;

    if (!test1Passed) {
      throw new Error('That bai tai Kiem thu 1 (Light Theme)');
    }
    console.log('[DAT] Kiem thu 1 thanh cong!');

    console.log('------------------------------------------------------------');
    console.log('[KIEM THU 2] Chuyen sang Dark Theme bang VibeApp.toggleTheme()');
    console.log('------------------------------------------------------------');

    await evaluate(`VibeApp.toggleTheme();`);
    await new Promise(r => setTimeout(r, 400));

    const darkThemeStatus = await evaluate(`
      (() => {
        const isDark = document.documentElement.classList.contains('dark');
        
        const headerLight = document.querySelector('header img[src*="logo-light.svg"]');
        const headerDark = document.querySelector('header img[src*="logo-dark.svg"]');
        
        const footerLight = document.querySelector('footer img[src*="logo-light.svg"]');
        const footerDark = document.querySelector('footer img[src*="logo-dark.svg"]');

        const getVisible = (el) => {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        };

        return {
          isDark,
          headerLightVisible: getVisible(headerLight),
          headerDarkVisible: getVisible(headerDark),
          footerLightVisible: getVisible(footerLight),
          footerDarkVisible: getVisible(footerDark)
        };
      })()
    `);

    console.log('Ket qua kiem tra Dark Theme:');
    console.log('- Che do dark mode cua trang:', darkThemeStatus.isDark ? 'Bat (Dung)' : 'Tat (Sai)');
    console.log('- Header logo-dark.svg hien thi:', darkThemeStatus.headerDarkVisible ? 'Hien thi (Dung)' : 'An (Sai)');
    console.log('- Header logo-light.svg an:', !darkThemeStatus.headerLightVisible ? 'An (Dung)' : 'Hien thi (Sai)');
    console.log('- Footer logo-dark.svg hien thi:', darkThemeStatus.footerDarkVisible ? 'Hien thi (Dung)' : 'An (Sai)');
    console.log('- Footer logo-light.svg an:', !darkThemeStatus.footerLightVisible ? 'An (Dung)' : 'Hien thi (Sai)');

    const test2Passed = darkThemeStatus.isDark &&
      darkThemeStatus.headerDarkVisible &&
      !darkThemeStatus.headerLightVisible &&
      darkThemeStatus.footerDarkVisible &&
      !darkThemeStatus.footerLightVisible;

    if (!test2Passed) {
      throw new Error('That bai tai Kiem thu 2 (Dark Theme)');
    }
    console.log('[DAT] Kiem thu 2 thanh cong!');

    console.log('------------------------------------------------------------');
    console.log('[KIEM THU 3] Kiem tra logo trong Modal Dang Nhap (openAuthModal)');
    console.log('------------------------------------------------------------');

    // Mo modal trong khi dang o Dark theme
    await evaluate(`VibeApp.openAuthModal('login');`);
    await new Promise(r => setTimeout(r, 400));

    const modalDarkStatus = await evaluate(`
      (() => {
        const logo = document.getElementById('auth-modal-logo');
        return {
          exists: !!logo,
          src: logo ? logo.getAttribute('src') : null
        };
      })()
    `);

    console.log('Modal Dang Nhap o Dark Theme:');
    console.log('- Logo modal ton tai:', modalDarkStatus.exists ? 'Co' : 'Khong');
    console.log('- Duong dan logo:', modalDarkStatus.src);

    const test3aPassed = modalDarkStatus.exists && modalDarkStatus.src.includes('logo-dark.svg');
    if (!test3aPassed) {
      throw new Error('Logo modal o Dark Theme khong dung logo-dark.svg');
    }

    // Chuyen ve Light theme trong khi modal dang mo
    await evaluate(`VibeApp.toggleTheme();`);
    await new Promise(r => setTimeout(r, 400));

    const modalLightStatus = await evaluate(`
      (() => {
        const logo = document.getElementById('auth-modal-logo');
        return {
          exists: !!logo,
          src: logo ? logo.getAttribute('src') : null,
          isDark: document.documentElement.classList.contains('dark')
        };
      })()
    `);

    console.log('Modal Dang Nhap sau khi toggle ve Light Theme:');
    console.log('- Che do dark mode cua trang:', modalLightStatus.isDark ? 'Bat (Sai)' : 'Tat (Dung)');
    console.log('- Duong dan logo modal cap nhat:', modalLightStatus.src);

    const test3bPassed = !modalLightStatus.isDark && modalLightStatus.src.includes('logo-light.svg');
    if (!test3bPassed) {
      throw new Error('Logo modal o Light Theme khong tu dong cap nhat sang logo-light.svg');
    }

    // Dong modal
    await evaluate(`VibeApp.closeModal();`);
    console.log('[DAT] Kiem thu 3 thanh cong!');

    console.log('------------------------------------------------------------');
    console.log('[KET QUA TONG THE] TAT CA 3 MUC KIEM THU DEU DAT CHUAN 100%!');
    console.log('------------------------------------------------------------');

  } finally {
    if (ws) {
      try { ws.close(); } catch (e) {}
    }
    browser.kill('SIGTERM');
  }
}

verifyThemeLogos().then(() => {
  console.log('[HOAN TAT] Script kiem tra hoan thanh thanh cong.');
  process.exit(0);
}).catch(err => {
  console.error('[THAT BAI] Chi tiet loi:', err.message);
  process.exit(1);
});
