const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9225;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1280,900',
    `--user-data-dir=${process.env.TEMP}\\chrome_temp_capture`
  ]);

  await sleep(1500);

  try {
    const list = await getJson(`http://127.0.0.1:${port}/json`);
    const page = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    let id = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const msgId = id++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === msgId) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    await new Promise(r => ws.on('open', r));
    await send('Page.enable');
    await send('Runtime.enable');

    // Chụp trang khảo sát
    await send('Page.navigate', { url: 'http://localhost:3000/#surveys' });
    await sleep(2000);

    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scripts/review_surveys_latest.png', Buffer.from(shot1.data, 'base64'));
    console.log('Saved scripts/review_surveys_latest.png');

    // Chụp trang ví
    await send('Page.navigate', { url: 'http://localhost:3000/#wallet' });
    await sleep(1500);

    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scripts/review_wallet_latest.png', Buffer.from(shot2.data, 'base64'));
    console.log('Saved scripts/review_wallet_latest.png');

    ws.close();
  } catch (err) {
    console.error('Error during capture:', err.message);
  } finally {
    chromeProcess.kill();
  }
}

run();
