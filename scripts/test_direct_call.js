const http = require('http');

async function test() {
  const targets = await new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
    });
  });
  const t = targets.find(x => x.type === 'page');
  if (!t) {
    console.error('Không tìm thấy tab browser');
    return;
  }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  function send(method, params) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === id) { ws.removeEventListener('message', handler); resolve(msg.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          window.VibeApp.openAuthModal('login');
          const m = document.getElementById('modal-container');
          return { success: true, hidden: m.classList.contains('hidden'), display: window.getComputedStyle(m).display };
        } catch(e) {
          return { error: e.message, stack: e.stack };
        }
      })()
    `,
    returnByValue: true
  });
  console.log('TEST CALL openAuthModal:', res.result.value);
  ws.close();
}
test().catch(console.error);
