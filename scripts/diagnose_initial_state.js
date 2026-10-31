const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const browser = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9225/json', (res) => {
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('=== SOI TRẠNG THÁI NGUYÊN BẢN KHI VỪA MỞ TRANG ===');

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const results = {};

        // 1. Kiểm tra từng nút bấm trên giao diện và phần tử che nó
        const checkElement = (selector, name) => {
          const el = document.querySelector(selector);
          if (!el) return { name, found: false };
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const topEl = document.elementFromPoint(cx, cy);
          return {
            name,
            found: true,
            rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
            clickable: topEl === el || el.contains(topEl),
            topElement: topEl ? { tag: topEl.tagName, id: topEl.id, className: topEl.className } : null
          };
        };

        results.logo = checkElement('#desktop-nav', 'Desktop Nav');
        results.loginBtn = checkElement('#guest-auth-actions button', 'Login Button');
        results.firstSurveyCard = checkElement('.survey-clean-card, .bento-card', 'Survey Card');
        results.pushBanner = checkElement('#push-permission-banner', 'Push Banner');
        results.header = checkElement('header', 'Header');

        // Kiểm tra tất cả fixed/absolute elements có z-index >= 10
        const allElements = Array.from(document.querySelectorAll('*'));
        results.highZIndexElements = allElements.filter(el => {
          const style = window.getComputedStyle(el);
          const z = parseInt(style.zIndex, 10);
          const pos = style.position;
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          return isVisible && (pos === 'fixed' || pos === 'absolute') && z >= 10;
        }).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            id: el.id,
            className: el.className,
            zIndex: window.getComputedStyle(el).zIndex,
            rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
            pointerEvents: window.getComputedStyle(el).pointerEvents
          };
        });

        return results;
      })()
    `,
    returnByValue: true
  });

  console.log(JSON.stringify(evalRes.result.value, null, 2));

  ws.close();
  browser.kill();
}

run().catch(console.error);
