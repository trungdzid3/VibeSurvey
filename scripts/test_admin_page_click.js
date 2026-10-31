const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const browser = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--no-sandbox',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9226/json', (res) => {
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
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  // 1. Lấy thông tin tài khoản Admin và sinh JWT Token
  console.log('\n[1] Lấy token Admin từ JWT...');
  const db = require('../server/db/database');
  const jwt = require('jsonwebtoken');
  const config = require('../server/config');
  const adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
  const token = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: adminUser.role },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const user = {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
    credit_balance: adminUser.credit_balance,
    point_balance: adminUser.point_balance
  };
  console.log('[1] Token lấy được:', !!token, 'Role:', user?.role);

  // 2. Thiết lập localStorage trên trình duyệt và F5 reload
  console.log('\n[2] Thiết lập localStorage và navigate sang admin-overview...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('vibesurvey_token', '${token}');
      localStorage.setItem('vibesurvey_cached_user', JSON.stringify(${JSON.stringify(user)}));
      localStorage.setItem('vibesurvey_current_tab', 'admin-overview');
      location.reload();
    `
  });

  // Đợi trang reload xong (2.5s)
  await new Promise(r => setTimeout(r, 2500));

  console.log('\n[3] Kiểm tra giao diện Admin sau khi Reload:');
  const checkRes = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const results = {};
        results.currentTab = window.VibeApp?.state?.currentTab;
        results.currentUser = window.VibeApp?.state?.currentUser?.email;

        // Kiểm tra các phần tử trên trang Admin
        const checkEl = (sel, name) => {
          const el = document.querySelector(sel);
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

        results.subNavOverview = checkEl('button[onclick*="admin-overview"]', 'SubNav Tổng Quan');
        results.subNavPayouts = checkEl('button[onclick*="admin-payouts"]', 'SubNav Duyệt Tiền');
        results.subNavFraud = checkEl('button[onclick*="admin-fraud"]', 'SubNav Gian Lận');
        results.subNavBugs = checkEl('button[onclick*="admin-bug-reports"]', 'SubNav Báo Lỗi');
        results.subNavAudit = checkEl('button[onclick*="admin-audit-logs"]', 'SubNav Kiểm Toán');
        results.tvBtn = checkEl('button[onclick*="toggleAdminFullscreenTvMode"]', 'Nút Toàn Cảnh TV');
        results.refreshBtn = checkEl('button[onclick*="renderAdminOverviewView"]', 'Nút Làm Mới');
        results.trendsChart = checkEl('#admin-trends-chart-container', 'Khung Biểu Đồ SVG');

        // Kiểm tra bất kỳ overlay nào đang che màn hình
        const overlays = Array.from(document.querySelectorAll('*')).filter(el => {
          const s = window.getComputedStyle(el);
          const pos = s.position;
          const isVis = s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
          const r = el.getBoundingClientRect();
          return isVis && (pos === 'fixed' || pos === 'absolute') && r.width >= window.innerWidth * 0.8 && r.height >= window.innerHeight * 0.8;
        }).map(el => ({ tag: el.tagName, id: el.id, className: el.className, zIndex: window.getComputedStyle(el).zIndex }));

        results.fullScreenOverlays = overlays;

        return results;
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log(JSON.stringify(checkRes.result.value, null, 2));

  // Thử bấm vào từng nút SubNav xem có chuyển tab được không
  console.log('\n[4] Thử CLICK vào SubNav Duyệt Tiền:');
  const clickPayouts = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const btn = document.querySelector('button[onclick*="admin-payouts"]');
        if (!btn) return 'Không tìm thấy nút Duyệt Tiền';
        btn.click();
        await new Promise(r => setTimeout(r, 600));
        return {
          currentTab: window.VibeApp.state.currentTab,
          hasPayoutTable: !!document.getElementById('admin-payouts-table-body') || !!document.querySelector('table')
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Kết quả click Duyệt Tiền:', clickPayouts.result.value);

  console.log('\n[5] Thử CLICK vào SubNav Kiểm Toán:');
  const clickAudit = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const btn = document.querySelector('button[onclick*="admin-audit-logs"]');
        if (!btn) return 'Không tìm thấy nút Kiểm Toán';
        btn.click();
        await new Promise(r => setTimeout(r, 600));
        return {
          currentTab: window.VibeApp.state.currentTab,
          hasAuditTable: !!document.getElementById('admin-audit-logs-table-body') || !!document.querySelector('#admin-audit-table-body')
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Kết quả click Kiểm Toán:', clickAudit.result.value);

  ws.close();
  browser.kill();
}

run().catch(console.error);
