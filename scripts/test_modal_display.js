const { spawn } = require('child_process');
const http = require('http');

async function testModalDisplay() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9229/json', (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();
  function send(m, p = {}) {
    return new Promise(res => {
      const cur = id++;
      pending.set(cur, res);
      ws.send(JSON.stringify({ id: cur, method: m, params: p }));
    });
  }
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d.result);
      pending.delete(d.id);
    }
  };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 2000));

  const expr = `
    (() => {
      const ids = ['modal-container', 'image-picker-modal', 'terms-modal', 'google-oauth-modal', 'bug-report-modal', 'admin-bug-detail-modal', 'image-lightbox-modal', 'push-permission-banner'];
      return ids.map(function(id) {
        const el = document.getElementById(id);
        if (!el) return { id: id, exists: false };
        const style = window.getComputedStyle(el);
        return {
          id: id,
          exists: true,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          zIndex: style.zIndex,
          rect: { x: el.getBoundingClientRect().left, y: el.getBoundingClientRect().top, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }
        };
      });
    })()
  `;

  const res = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true
  });
  console.log('Modals computed styles:\n' + JSON.stringify(res.result.value, null, 2));

  ws.close();
  browser.kill();
  process.exit(0);
}
testModalDisplay().catch(e => { console.error(e); process.exit(1); });
