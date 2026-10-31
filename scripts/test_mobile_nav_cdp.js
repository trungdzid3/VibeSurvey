const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9223;

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

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('Khoi dong Chrome headless de do dac toa do mobile nav...');
  const proc = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:\\Users\\Lenovo\\AppData\\Local\\Temp\\chrome_cdp_test',
    'http://localhost:3000'
  ]);

  try {
    let version = null;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        version = await getJson(`http://127.0.0.1:${port}/json/version`);
        if (version) break;
      } catch (e) {}
    }

    if (!version) {
      throw new Error('Khong the ket noi CDP Chrome tai cong ' + port);
    }

    const pages = await getJson(`http://127.0.0.1:${port}/json/list`);
    const targetPage = pages.find(p => p.type === 'page');
    if (!targetPage) throw new Error('Khong tim thay target page');

    const client = new CDPClient(targetPage.webSocketDebuggerUrl);
    await client.connect();

    console.log('Da ket noi WebSocket CDP thanh cong.');
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // Doi VibeApp duoc load day du
    console.log('Doi ung dung VibeApp khoi tao...');
    for (let i = 0; i < 30; i++) {
      try {
        const check = await client.send('Runtime.evaluate', {
          expression: 'typeof window.VibeApp !== "undefined" && typeof window.lucide !== "undefined"'
        });
        if (check?.result?.value === true) {
          console.log('VibeApp da san sang.');
          break;
        }
      } catch (e) {}
      await sleep(300);
    }

    const viewports = [
      { name: 'iPhone SE / Small Mobile', width: 375, height: 667 },
      { name: 'Pixel 7 / Modern Android', width: 412, height: 915 }
    ];

    const rolesToTest = [
      {
        roleName: 'ADMIN',
        setup: `
          VibeApp.state.currentUser = { id: 'admin-1', username: 'admin', fullName: 'Quan Tri Vien', role: 'ADMIN' };
          VibeApp.state.adminViewMode = 'ADMIN';
        `,
        expectedTabs: 5,
        hasCenterFab: true
      },
      {
        roleName: 'RESPONDENT (Nguoi Dien)',
        setup: `
          VibeApp.state.currentUser = { id: 'resp-1', username: 'respondent', fullName: 'Dap Vien', role: 'RESPONDENT' };
          VibeApp.state.adminViewMode = null;
        `,
        expectedTabs: 5,
        hasCenterFab: true
      },
      {
        roleName: 'CREATOR (Doanh Nghiep)',
        setup: `
          VibeApp.state.currentUser = { id: 'creat-1', username: 'creator', fullName: 'Doanh Nghiep', role: 'CREATOR' };
          VibeApp.state.adminViewMode = null;
        `,
        expectedTabs: 4,
        hasCenterFab: false
      },
      {
        roleName: 'GUEST (Khach Vang Lai)',
        setup: `
          VibeApp.state.currentUser = null;
          VibeApp.state.adminViewMode = null;
        `,
        expectedTabs: 4,
        hasCenterFab: false
      }
    ];

    for (const vp of viewports) {
      console.log(`\n======================================================================`);
      console.log(`KICH THUOC VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`======================================================================`);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true
      });

      await sleep(300);

      for (const r of rolesToTest) {
        console.log(`\n--- KIEM TRA VAI TRO: ${r.roleName} ---`);
        const evalResult = await client.send('Runtime.evaluate', {
          expression: `
            (() => {
              ${r.setup}
              VibeApp.renderNavigation();

              const nav = document.getElementById('mobile-bottom-nav');
              if (!nav) return { error: 'Khong tim thay #mobile-bottom-nav' };

              const navRect = nav.getBoundingClientRect();
              const children = Array.from(nav.children);
              const totalTabs = children.length;

              const tabsData = children.map((child, index) => {
                const cRect = child.getBoundingClientRect();
                const btn = child.querySelector('button');
                const bRect = btn ? btn.getBoundingClientRect() : null;
                return {
                  index: index + 1,
                  childWidth: cRect.width,
                  btnWidth: bRect ? bRect.width : 0,
                  btnHeight: bRect ? bRect.height : 0,
                  btnCenterX: bRect ? bRect.left + bRect.width / 2 : 0,
                  btnTitle: btn ? (btn.getAttribute('title') || btn.getAttribute('aria-label') || '') : ''
                };
              });

              const navCenterX = navRect.left + navRect.width / 2;
              let centerOffset = null;
              let centerButtonTitle = '';

              if (${r.hasCenterFab}) {
                const centerButton = tabsData[2]; // index 2 la nut giua
                centerOffset = Math.abs(centerButton.btnCenterX - navCenterX);
                centerButtonTitle = centerButton.btnTitle;
              }

              const distances = [];
              for (let i = 0; i < tabsData.length - 1; i++) {
                distances.push(tabsData[i + 1].btnCenterX - tabsData[i].btnCenterX);
              }

              return {
                navWidth: navRect.width,
                navCenterX: navCenterX,
                totalTabs: totalTabs,
                tabs: tabsData,
                centerOffset: centerOffset,
                centerButtonTitle: centerButtonTitle,
                distances: distances
              };
            })()
          `,
          returnByValue: true
        });

        const res = evalResult?.result?.value;
        if (!res) {
          console.error('Loi khong nhan duoc ket qua:', evalResult);
          continue;
        }

        console.log(`- So luong tabs: ${res.totalTabs} (Ky vong: ${r.expectedTabs})`);
        console.log(`- Chieu rong Nav: ${res.navWidth.toFixed(2)}px | Tam Nav: ${res.navCenterX.toFixed(2)}px`);
        console.log(`- Danh sach tabs: ${res.tabs.map(t => `[${t.index}: ${t.btnTitle} (${t.childWidth.toFixed(1)}px)]`).join(' ')}`);
        console.log(`- Khoang cach giua tam cac button lien ke: ${res.distances.map(d => d.toFixed(2) + 'px').join(' | ')}`);

        if (r.hasCenterFab) {
          console.log(`- Nut giua FAB: "${res.centerButtonTitle}"`);
          console.log(`- Do lech truc doi xung: ${res.centerOffset.toFixed(4)}px (Nguong cho phep: <= 2px)`);
          if (res.centerOffset <= 2) {
            console.log(`=> KET QUA: DAT CHUAN DOI XUNG 100%`);
          } else {
            console.log(`=> KET QUA: KHONG DAT`);
          }
        } else {
          // Kiem tra do dong deu cua khoang cach
          const maxDiff = Math.max(...res.distances) - Math.min(...res.distances);
          console.log(`- Do lech khoang cach toi da giua cac tab: ${maxDiff.toFixed(4)}px`);
          if (maxDiff <= 1) {
            console.log(`=> KET QUA: DAT CHUAN CAN XUNG DEU NHAU 100%`);
          } else {
            console.log(`=> KET QUA: KHONG DAT`);
          }
        }
      }
    }

    client.close();
  } catch (err) {
    console.error('Loi thuc thi:', err);
  } finally {
    proc.kill();
  }
}

run();
