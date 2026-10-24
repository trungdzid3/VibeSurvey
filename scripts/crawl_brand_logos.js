/**
 * Script cào và tải Logo thương hiệu Voucher về lưu trữ cục bộ (Local Assets)
 * Hỗ trợ đa nguồn: Website HTML Scraper (apple-touch-icon, og:image) -> Google Favicon 128px -> DuckDuckGo -> Fallback SVG
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const TARGET_DIR = path.join(__dirname, '../public/assets/logos');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const BRANDS = [
  { name: 'Phúc Long', domain: 'phuclong.com.vn', slug: 'phuc-long', primaryColor: '#01522C' },
  { name: 'Grab', domain: 'grab.com', slug: 'grab', primaryColor: '#00B14F' },
  { name: 'Shopee', domain: 'shopee.vn', slug: 'shopee', primaryColor: '#EE4D2D' },
  { name: 'Highlands Coffee', domain: 'highlands.com.vn', slug: 'highlands-coffee', primaryColor: '#B31010' },
  { name: 'CGV Cinemas', domain: 'cgv.vn', slug: 'cgv-cinemas', primaryColor: '#E71A0F' },
  { name: 'Starbucks', domain: 'starbucks.vn', slug: 'starbucks', primaryColor: '#006241' },
  { name: 'Lazada', domain: 'lazada.vn', slug: 'lazada', primaryColor: '#0F146D' },
  { name: 'Tiki', domain: 'tiki.vn', slug: 'tiki', primaryColor: '#1A94FF' },
  { name: 'The Coffee House', domain: 'thecoffeehouse.com', slug: 'the-coffee-house', primaryColor: '#EA8025' }
];

function fetchBuffer(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        },
        timeout: timeoutMs
      }, (res) => {
        // Xử lý chuyển hướng (301, 302)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          if (redirectUrl.startsWith('/')) {
            redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
          }
          return fetchBuffer(redirectUrl, timeoutMs).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || '';
          resolve({ buffer: buf, contentType });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Cào HTML trang chủ để tìm link icon chất lượng cao
 */
async function scrapeAppleTouchIcon(domain) {
  try {
    const htmlUrl = `https://${domain}`;
    const { buffer } = await fetchBuffer(htmlUrl, 5000);
    const html = buffer.toString('utf-8');

    // 1. Tìm apple-touch-icon
    const touchMatch = html.match(/<link[^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]+href=["']([^"']+)["']/i) ||
                       html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["']/i);
    if (touchMatch && touchMatch[1]) {
      let iconUrl = touchMatch[1].trim();
      if (iconUrl.startsWith('//')) iconUrl = 'https:' + iconUrl;
      else if (iconUrl.startsWith('/')) iconUrl = `https://${domain}` + iconUrl;
      return iconUrl;
    }

    // 2. Tìm og:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1]) {
      let ogUrl = ogMatch[1].trim();
      if (ogUrl.startsWith('//')) ogUrl = 'https:' + ogUrl;
      else if (ogUrl.startsWith('/')) ogUrl = `https://${domain}` + ogUrl;
      return ogUrl;
    }

    // 3. Tìm icon png
    const iconMatch = html.match(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+\.png)["']/i);
    if (iconMatch && iconMatch[1]) {
      let iconUrl = iconMatch[1].trim();
      if (iconUrl.startsWith('//')) iconUrl = 'https:' + iconUrl;
      else if (iconUrl.startsWith('/')) iconUrl = `https://${domain}` + iconUrl;
      return iconUrl;
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Tải logo thương hiệu theo thứ tự ưu tiên
 */
async function downloadBrandLogo(brand) {
  const localFilePath = path.join(TARGET_DIR, `${brand.slug}.png`);
  console.log(`\n⏳ Đang cào logo cho [${brand.name}] (${brand.domain})...`);

  // Cách 2: Thử cào apple-touch-icon từ HTML của website
  const scrapedIconUrl = await scrapeAppleTouchIcon(brand.domain);
  if (scrapedIconUrl) {
    try {
      console.log(`   [Cách 2] Tìm thấy Icon trong HTML: ${scrapedIconUrl}`);
      const res = await fetchBuffer(scrapedIconUrl);
      if (res.buffer.length > 500) {
        fs.writeFileSync(localFilePath, res.buffer);
        console.log(`   ✅ Đã tải và lưu thành công từ HTML icon (${res.buffer.length} bytes) -> ${brand.slug}.png`);
        return true;
      }
    } catch (e) {
      console.log(`   ⚠️ Lỗi tải từ HTML icon: ${e.message}`);
    }
  }

  // Cách 1: Thử Google Favicon 128px API
  try {
    const googleUrl = `https://www.google.com/s2/favicons?domain=${brand.domain}&sz=128`;
    console.log(`   [Cách 1] Thử Google Favicon 128px: ${googleUrl}`);
    const res = await fetchBuffer(googleUrl);
    if (res.buffer.length > 300) {
      fs.writeFileSync(localFilePath, res.buffer);
      console.log(`   ✅ Đã tải và lưu thành công từ Google Favicon (${res.buffer.length} bytes) -> ${brand.slug}.png`);
      return true;
    }
  } catch (e) {
    console.log(`   ⚠️ Lỗi tải từ Google Favicon: ${e.message}`);
  }

  // Cách 1 phụ: DuckDuckGo ICO
  try {
    const ddgUrl = `https://icons.duckduckgo.com/ip3/${brand.domain}.ico`;
    console.log(`   [Cách 1 phụ] Thử DuckDuckGo: ${ddgUrl}`);
    const res = await fetchBuffer(ddgUrl);
    if (res.buffer.length > 300) {
      fs.writeFileSync(localFilePath, res.buffer);
      console.log(`   ✅ Đã tải và lưu thành công từ DuckDuckGo (${res.buffer.length} bytes) -> ${brand.slug}.png`);
      return true;
    }
  } catch (e) {
    console.log(`   ⚠️ Lỗi tải từ DuckDuckGo: ${e.message}`);
  }

  console.log(`   ❌ Không thể cào tự động cho ${brand.name}, sử dụng ảnh fallback.`);
  return false;
}

/**
 * Tạo ảnh logo mặc định default-voucher.png (Fallback an toàn)
 */
function createDefaultLogo() {
  const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#0F172A"/>
    <circle cx="64" cy="64" r="44" fill="#1E293B" stroke="#334155" stroke-width="2"/>
    <path d="M40 50h48v32H40z" fill="none" stroke="#F59E0B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M54 50v32M74 50v32" stroke="#F59E0B" stroke-width="2" stroke-dasharray="3 3"/>
    <circle cx="64" cy="66" r="6" fill="#F59E0B"/>
  </svg>`;
  fs.writeFileSync(path.join(TARGET_DIR, 'default-voucher.svg'), defaultSvg, 'utf-8');
}

async function main() {
  console.log('========================================================');
  console.log('🚀 BẮT ĐẦU CÀO VÀ ĐỒNG BỘ LOGO VOUCHER THƯƠNG HIỆU');
  console.log('========================================================');

  createDefaultLogo();

  let successCount = 0;
  for (const brand of BRANDS) {
    const ok = await downloadBrandLogo(brand);
    if (ok) successCount++;
  }

  console.log('\n========================================================');
  console.log(`🎉 HOÀN TẤT: Đã cào và lưu trữ thành công ${successCount}/${BRANDS.length} logo thương hiệu vào /public/assets/logos/`);
  console.log('========================================================\n');
}

main().catch(console.error);
