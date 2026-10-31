const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const browser = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9224/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  await new Promise(r => setTimeout(r, 2000));

  console.log('=== SOI CHI TIẾT TẠI SAO NÚT KHÔNG PHẢN HỒI ===');

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const results = {};

        // 1. Kiểm tra window.VibeApp
        results.hasVibeApp = typeof window.VibeApp !== 'undefined';
        results.vibeAppKeys = Object.keys(window.VibeApp || {}).slice(0, 30);

        // 2. Kiểm tra desktop-nav
        const desktopNav = document.getElementById('desktop-nav');
        results.desktopNavHtml = desktopNav ? desktopNav.innerHTML : 'NULL';

        // 3. Thử gọi trực tiếp VibeApp.navigate('voucher-market')
        try {
          await window.VibeApp.navigate('voucher-market');
          results.directNavigateOk = true;
          results.tabAfterDirectNavigate = window.VibeApp.state.currentTab;
          results.rootHtmlSnippet = document.getElementById('app-root')?.innerHTML.substring(0, 150);
        } catch(err) {
          results.directNavigateError = err.message + ' ' + err.stack;
        }

        // 4. Thử gọi trực tiếp VibeApp.openAuthModal('login')
        try {
          window.VibeApp.openAuthModal('login');
          const m = document.getElementById('modal-container');
          results.openAuthModalOk = true;
          results.modalHidden = m ? m.classList.contains('hidden') : null;
          results.modalDisplay = m ? window.getComputedStyle(m).display : null;
        } catch(err) {
          results.openAuthModalError = err.message + ' ' + err.stack;
        }

        // 5. Kiểm tra elementFromPoint tại vị trí nút Đăng Nhập
        const loginBtn = document.querySelector('button[onclick*="openAuthModal"]');
        if (loginBtn) {
          const rect = loginBtn.getBoundingClientRect();
          const elAtPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          results.loginBtnRect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
          results.elementCoveringLoginBtn = elAtPoint ? {
            tag: elAtPoint.tagName,
            id: elAtPoint.id,
            className: elAtPoint.className,
            isSame: elAtPoint === loginBtn || loginBtn.contains(elAtPoint)
          } : 'NULL';
        } else {
          results.loginBtnNotFound = true;
        }

        // 6. Kiểm tra elementFromPoint tại vị trí Nav Tab
        const firstNavBtn = document.querySelector('#desktop-nav button') || document.querySelector('.nav-link');
        if (firstNavBtn) {
          const rect = firstNavBtn.getBoundingClientRect();
          const elAtPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          results.navBtnRect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
          results.elementCoveringNavBtn = elAtPoint ? {
            tag: elAtPoint.tagName,
            id: elAtPoint.id,
            className: elAtPoint.className,
            isSame: elAtPoint === firstNavBtn || firstNavBtn.contains(elAtPoint)
          } : 'NULL';
        }

        // 7. Kiểm tra elementFromPoint tại thẻ khảo sát
        const card = document.querySelector('.bento-card');
        if (card) {
          const rect = card.getBoundingClientRect();
          const elAtPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          results.cardRect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
          results.elementCoveringCard = elAtPoint ? {
            tag: elAtPoint.tagName,
            id: elAtPoint.id,
            className: elAtPoint.className,
            isSame: elAtPoint === card || card.contains(elAtPoint)
          } : 'NULL';
        }

        return results;
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log(JSON.stringify(evalRes.result.value, null, 2));

  ws.close();
  browser.kill();
}

run().catch(console.error);
