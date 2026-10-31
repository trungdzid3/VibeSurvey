const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const OUTPUT_DIR = path.resolve(__dirname, 'reports/screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      })
      .on('error', reject);
  });
}

async function run() {
  console.log('=== BẮT ĐẦU KIỂM TRA RENDER GIAO DIỆN VÍ VÀ KHẢO SÁT ===');

  // 1. Tạo tài khoản Respondent test để kiểm tra trọn vẹn cả 3 thẻ
  const testEmail = `qa_ui_test_${Date.now()}@vibesurvey.com`;
  const regRes = await postJson('http://localhost:3000/api/v1/auth/register', {
    email: testEmail,
    password: 'Password123!',
    name: 'Kiểm Thử Viên Giao Diện',
    role: 'RESPONDENT'
  });

  const token = regRes.token || (regRes.data && regRes.data.token);
  const user = regRes.user || (regRes.data && regRes.data.user);
  if (!token || !user) {
    throw new Error('Đăng ký tài khoản kiểm thử thất bại: ' + JSON.stringify(regRes));
  }
  console.log('[1/4] Đăng ký & nạp phiên Respondent thành công:', user.email);

  // 2. Khởi chạy Chrome Headless
  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1280,960',
      'http://localhost:3000/#wallet'
    ],
    { stdio: 'ignore' }
  );

  let ws = null;
  try {
    let targetPage = null;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const list = await getJson(`http://127.0.0.1:${PORT}/json`);
        if (Array.isArray(list)) {
          targetPage = list.find((p) => p.type === 'page' && p.url.includes('localhost:3000'));
          if (!targetPage) {
            targetPage = list.find((p) => p.type === 'page');
          }
          if (targetPage && targetPage.webSocketDebuggerUrl) {
            break;
          }
        }
      } catch (err) {}
    }

    if (!targetPage || !targetPage.webSocketDebuggerUrl) {
      throw new Error('Không tìm thấy tab trang web hợp lệ trên Chrome CDP!');
    }
    console.log('[2/4] Đã gắn kết nối CDP vào tab:', targetPage.id, targetPage.url);

    ws = new WebSocket(targetPage.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.id && callbacks.has(data.id)) {
          callbacks.get(data.id)(data);
          callbacks.delete(data.id);
        }
      } catch (e) {}
    };

    function sendCmd(method, params = {}, timeoutMs = 8000) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const timer = setTimeout(() => {
          if (callbacks.has(id)) {
            callbacks.delete(id);
            reject(new Error(`Timeout CDP command ${method}`));
          }
        }, timeoutMs);

        callbacks.set(id, (res) => {
          clearTimeout(timer);
          resolve(res);
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((res) => (ws.onopen = res));

    await sendCmd('Page.enable');
    await sendCmd('Runtime.enable');

    // Nạp token vào localStorage và gán vào VibeApp.state
    const scriptInject = `
      localStorage.setItem('vibesurvey_token', ${JSON.stringify(token)});
      localStorage.setItem('vibesurvey_cached_user', ${JSON.stringify(JSON.stringify(user))});
      if (window.VibeApp) {
        window.VibeApp.state.token = ${JSON.stringify(token)};
        window.VibeApp.state.currentUser = ${JSON.stringify(user)};
        window.VibeApp.applyUserInterface(true);
      }
    `;
    await sendCmd('Runtime.evaluate', { expression: scriptInject });
    await sleep(1500);

    // ==========================================
    // 3. KIỂM TRA TRANG VÍ (#wallet)
    // ==========================================
    console.log('[3/4] Đang kiểm tra trang Ví (#wallet)...');
    await sendCmd('Runtime.evaluate', { expression: `
      (async () => {
        if (window.VibeApp) {
          await window.VibeApp.navigate('wallet');
        } else {
          window.location.hash = '#wallet';
        }
      })()
    `, awaitPromise: true });
    await sleep(2500);

    const walletCheckExpr = `
      (() => {
        const walletImg = document.querySelector('img[src*="wallet_3d_master.svg"]');
        const coinsImg = document.querySelector('img[src*="coins_coupon_3d_master.svg"]');

        let walletCheck = null;
        if (walletImg) {
          const rect = walletImg.getBoundingClientRect();
          const parent = walletImg.closest('.rounded-3xl') || walletImg.parentElement;
          const parentRect = parent ? parent.getBoundingClientRect() : null;
          walletCheck = {
            src: walletImg.getAttribute('src'),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            isPositionAbsolute: window.getComputedStyle(walletImg).position === 'absolute',
            classes: walletImg.className,
            parentOverflow: parent ? window.getComputedStyle(parent).overflow : null,
            rightOffsetPx: parentRect ? Math.round(parentRect.right - rect.right) : null,
            topOffsetPx: parentRect ? Math.round(rect.top - parentRect.top) : null
          };
        }

        let coinsCheck = null;
        if (coinsImg) {
          const rect = coinsImg.getBoundingClientRect();
          const parent = coinsImg.closest('.rounded-3xl') || coinsImg.parentElement;
          const parentRect = parent ? parent.getBoundingClientRect() : null;
          coinsCheck = {
            src: coinsImg.getAttribute('src'),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            isPositionAbsolute: window.getComputedStyle(coinsImg).position === 'absolute',
            classes: coinsImg.className,
            parentOverflow: parent ? window.getComputedStyle(parent).overflow : null,
            rightOffsetPx: parentRect ? Math.round(parentRect.right - rect.right) : null,
            topOffsetPx: parentRect ? Math.round(rect.top - parentRect.top) : null
          };
        }

        return {
          walletFound: !!walletImg,
          coinsFound: !!coinsImg,
          walletCheck,
          coinsCheck
        };
      })()
    `;

    const walletRes = await sendCmd('Runtime.evaluate', {
      expression: walletCheckExpr,
      returnByValue: true,
    });
    const walletReport = walletRes.result && walletRes.result.result ? walletRes.result.result.value : null;
    console.log('Chi tiết DOM Thẻ Point & Credit tại #wallet:\n', JSON.stringify(walletReport, null, 2));

    const walletScreenshot = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const walletShotPath = path.join(OUTPUT_DIR, 'wallet_render.png');
    fs.writeFileSync(walletShotPath, Buffer.from(walletScreenshot.result.data, 'base64'));
    console.log('Đã lưu ảnh chụp trang Ví tại:', walletShotPath);

    // ==========================================
    // 4. KIỂM TRA TRANG KHẢO SÁT (#surveys)
    // ==========================================
    console.log('[4/4] Đang kiểm tra trang Khảo sát (#surveys)...');
    await sendCmd('Runtime.evaluate', { expression: `
      (async () => {
        if (window.VibeApp) {
          await window.VibeApp.navigate('surveys');
        } else {
          window.location.hash = '#surveys';
        }
      })()
    `, awaitPromise: true });
    await sleep(2500);

    const surveysCheckExpr = `
      (() => {
        const giftImgs = Array.from(document.querySelectorAll('img[src*="gift_box_3d_master.svg"]'));
        const checks = giftImgs.map((img, i) => {
          const rect = img.getBoundingClientRect();
          const parent = img.closest('.rounded-2xl') || img.parentElement;
          const parentRect = parent ? parent.getBoundingClientRect() : null;
          return {
            index: i + 1,
            src: img.getAttribute('src'),
            classes: img.className,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            isPositionAbsolute: window.getComputedStyle(img).position === 'absolute',
            parentOverflow: parent ? window.getComputedStyle(parent).overflow : null,
            bottomOffsetPx: parentRect ? Math.round(parentRect.bottom - rect.bottom) : null,
            rightOffsetPx: parentRect ? Math.round(parentRect.right - rect.right) : null
          };
        });

        return {
          giftCount: giftImgs.length,
          checks
        };
      })()
    `;

    const surveysRes = await sendCmd('Runtime.evaluate', {
      expression: surveysCheckExpr,
      returnByValue: true,
    });
    const surveysReport = surveysRes.result && surveysRes.result.result ? surveysRes.result.result.value : null;
    console.log('Chi tiết DOM Thẻ Số dư & Chuỗi điểm danh tại #surveys:\n', JSON.stringify(surveysReport, null, 2));

    const surveysScreenshot = await sendCmd('Page.captureScreenshot', { format: 'png' });
    const surveysShotPath = path.join(OUTPUT_DIR, 'surveys_render.png');
    fs.writeFileSync(surveysShotPath, Buffer.from(surveysScreenshot.result.data, 'base64'));
    console.log('Đã lưu ảnh chụp trang Khảo sát tại:', surveysShotPath);

    console.log('\n=== TẤT CẢ KIỂM TRA RENDER VÀ CHỤP ẢNH ĐÃ HOÀN TẤT THÀNH CÔNG ===');
  } finally {
    if (ws) {
      try { ws.close(); } catch (e) {}
    }
    chromeProc.kill();
  }
}

run().catch((err) => {
  console.error('Lỗi quy trình kiểm thử giao diện:', err);
  process.exit(1);
});
