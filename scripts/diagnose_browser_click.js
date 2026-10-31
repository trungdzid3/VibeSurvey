const { spawn } = require('child_process');
const http = require('http');

async function run() {
  console.log('[1] Khởi chạy Headless Edge với Remote Debugging Port 9222...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const browser = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  // Đợi 2s để Edge mở port 9222
  await new Promise(r => setTimeout(r, 2000));

  // Lấy danh sách targets
  console.log('[2] Kết nối CDP endpoint...');
  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) {
    console.error('Không tìm thấy page target');
    browser.kill();
    return;
  }

  console.log('[3] Kết nối WebSocket tới page:', pageTarget.webSocketDebuggerUrl);
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
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
    }
  };

  await new Promise(r => ws.onopen = r);
  console.log('[4] WebSocket connected, bật Runtime và Log domains...');

  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  // Đợi trang load xong và chạy script
  await new Promise(r => setTimeout(r, 2500));

  // Đánh giá kiểm tra phần tử nào đang nhận click tại giữa màn hình (hit-test)
  console.log('[5] Kiểm tra Hit-test tại nhiều tọa độ trên màn hình...');
  const hitTestRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const points = [
          { x: 100, y: 30, desc: 'Header Logo' },
          { x: 300, y: 30, desc: 'Header Nav Tab' },
          { x: 400, y: 200, desc: 'Giữa màn hình (Content/Card)' },
          { x: 500, y: 400, desc: 'Thân trang' },
          { x: 50, y: 500, desc: 'Góc dưới trái' }
        ];

        return points.map(p => {
          const el = document.elementFromPoint(p.x, p.y);
          if (!el) return { ...p, tag: 'null', id: '', classes: '' };
          return {
            ...p,
            tag: el.tagName,
            id: el.id,
            classes: el.className,
            outerHTMLSnippet: el.outerHTML.substring(0, 150)
          };
        });
      })()
    `,
    returnByValue: true
  });

  console.log('[6] KẾT QUẢ HIT-TEST (Phần tử nào đang nhận click):');
  console.log(JSON.stringify(hitTestRes.result.value, null, 2));

  // Kiểm tra xem VibeApp đã init chưa
  const appStateRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          hasVibeApp: typeof window.VibeApp !== 'undefined',
          currentTab: window.VibeApp?.state?.currentTab,
          currentUser: window.VibeApp?.state?.currentUser?.email || null,
          bodyClasses: document.body.className,
          htmlClasses: document.documentElement.className,
          visibleModals: Array.from(document.querySelectorAll('[id*="modal"]')).filter(m => {
            const style = window.getComputedStyle(m);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          }).map(m => ({ id: m.id, display: window.getComputedStyle(m).display, zIndex: window.getComputedStyle(m).zIndex, pointerEvents: window.getComputedStyle(m).pointerEvents }))
        };
      })()
    `,
    returnByValue: true
  });

  console.log('[7] TRẠNG THÁI ỨNG DỤNG & CÁC MODAL ĐANG HIỂN THỊ:');
  console.log(JSON.stringify(appStateRes.result.value, null, 2));

  // Thử click vào một nút bất kỳ bằng JavaScript click
  console.log('[8] Thử dispatch click vào Header Logo / Nav...');
  const clickTestRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button') || document.querySelector('a');
        if (!btn) return 'Không tìm thấy nút bấm nào';
        try {
          btn.click();
          return 'Click thành công: ' + btn.textContent.trim().substring(0, 30);
        } catch(err) {
          return 'Lỗi khi click: ' + err.message;
        }
      })()
    `,
    returnByValue: true
  });
  console.log('[8] Kết quả click test:', clickTestRes.result.value);

  ws.close();
  browser.kill();
  console.log('[9] Hoàn tất chẩn đoán.');
}

run().catch(err => {
  console.error('Lỗi diagnose:', err);
  process.exit(1);
});
