const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const browser = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9227/json', (res) => {
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
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER ERROR]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await send('Page.enable');

  const db = require('../server/db/database');
  const jwt = require('jsonwebtoken');
  const config = require('../server/config');
  const adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
  const token = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: adminUser.role },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Đăng nhập Admin và gọi navigate('admin-audit-logs')
  const testRes = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        try {
          window.VibeApp.state.token = '${token}';
          window.VibeApp.state.currentUser = ${JSON.stringify(adminUser)};
          localStorage.setItem('vibesurvey_token', '${token}');

          console.log('Gọi VibeApp.navigate("admin-audit-logs")...');
          await window.VibeApp.navigate('admin-audit-logs');
          console.log('navigate XONG! currentTab:', window.VibeApp.state.currentTab);

          const root = document.getElementById('app-root');
          return {
            currentTab: window.VibeApp.state.currentTab,
            rootHtmlLen: root ? root.innerHTML.length : 0,
            rootPreview: root ? root.innerHTML.substring(0, 300) : ''
          };
        } catch(err) {
          console.error('LỖI navigate:', err);
          return { error: err.message, stack: err.stack };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('KẾT QUẢ GỌI TRỰC TIẾP:', testRes.result.value);

  ws.close();
  browser.kill();
}

run().catch(console.error);
