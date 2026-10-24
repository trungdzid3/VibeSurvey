/**
 * Logo Crawler & Brand Asset Manager Service
 * Tự động tìm kiếm, cào và lưu trữ Logo thương hiệu từ Website Domain (apple-touch-icon, og:image, Google Favicon 128px)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class LogoCrawlerService {
  constructor() {
    this.targetDir = path.join(__dirname, '../../public/assets/logos');
    if (!fs.existsSync(this.targetDir)) {
      fs.mkdirSync(this.targetDir, { recursive: true });
    }

    // Danh bạ mapping tên miền chính thức của các thương hiệu phổ biến
    this.brandDirectory = {
      'phúc long': { domain: 'phuclong.com.vn', slug: 'phuc-long', name: 'Phúc Long', color: '#01522C' },
      'phuc long': { domain: 'phuclong.com.vn', slug: 'phuc-long', name: 'Phúc Long', color: '#01522C' },
      'grab': { domain: 'grab.com', slug: 'grab', name: 'Grab', color: '#00B14F' },
      'shopee': { domain: 'shopee.vn', slug: 'shopee', name: 'Shopee', color: '#EE4D2D' },
      'highlands': { domain: 'highlandscoffee.com.vn', slug: 'highlands-coffee', name: 'Highlands Coffee', color: '#B31010' },
      'highlands coffee': { domain: 'highlandscoffee.com.vn', slug: 'highlands-coffee', name: 'Highlands Coffee', color: '#B31010' },
      'cgv': { domain: 'cgv.vn', slug: 'cgv-cinemas', name: 'CGV Cinemas', color: '#E71A0F' },
      'cgv cinemas': { domain: 'cgv.vn', slug: 'cgv-cinemas', name: 'CGV Cinemas', color: '#E71A0F' },
      'starbucks': { domain: 'starbucks.vn', slug: 'starbucks', name: 'Starbucks', color: '#006241' },
      'lazada': { domain: 'lazada.vn', slug: 'lazada', name: 'Lazada', color: '#0F146D' },
      'tiki': { domain: 'tiki.vn', slug: 'tiki', name: 'Tiki', color: '#1A94FF' },
      'the coffee house': { domain: 'thecoffeehouse.com', slug: 'the-coffee-house', name: 'The Coffee House', color: '#EA8025' },
      'momo': { domain: 'momo.vn', slug: 'momo', name: 'MoMo', color: '#A50064' },
      'circle k': { domain: 'circlek.com.vn', slug: 'circle-k', name: 'Circle K', color: '#EE2E24' },
      'kfc': { domain: 'kfcvietnam.com.vn', slug: 'kfc', name: 'KFC', color: '#E4002B' },
      'lotteria': { domain: 'lotteria.vn', slug: 'lotteria', name: 'Lotteria', color: '#ED1C24' }
    };
  }

  /**
   * Tạo slug an toàn cho tên thương hiệu
   */
  generateSlug(brandName) {
    if (!brandName) return 'brand';
    return String(brandName)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'brand';
  }

  /**
   * Tra cứu thông tin tên miền từ tên thương hiệu
   */
  resolveBrandInfo(brandName, customDomain = null) {
    const cleanKey = String(brandName || '').toLowerCase().trim();
    if (this.brandDirectory[cleanKey]) {
      const info = { ...this.brandDirectory[cleanKey] };
      if (customDomain) info.domain = customDomain;
      return info;
    }

    // Tìm kiếm tương đối
    for (const [key, val] of Object.entries(this.brandDirectory)) {
      if (cleanKey.includes(key) || key.includes(cleanKey)) {
        const info = { ...val };
        if (customDomain) info.domain = customDomain;
        return info;
      }
    }

    const slug = this.generateSlug(brandName);
    return {
      name: brandName,
      slug,
      domain: customDomain || `${slug}.vn`,
      color: '#334155'
    };
  }

  /**
   * Lấy đường dẫn logo an toàn (ưu tiên local -> Google Favicon API)
   */
  getBrandLogoUrl(brandName, customDomain = null) {
    const info = this.resolveBrandInfo(brandName, customDomain);
    
    // Kiểm tra xem file local có tồn tại không (.svg hoặc .png)
    const svgPath = path.join(this.targetDir, `${info.slug}.svg`);
    const pngPath = path.join(this.targetDir, `${info.slug}.png`);
    
    if (fs.existsSync(svgPath)) {
      const url = `/assets/logos/${info.slug}.svg`;
      const googleUrl = `https://www.google.com/s2/favicons?domain=${info.domain}&sz=128`;
      return {
        url,
        logoUrl: url,
        domain: info.domain,
        slug: info.slug,
        isLocal: true,
        fallbackGoogleUrl: googleUrl,
        googleFaviconUrl: googleUrl
      };
    }

    if (fs.existsSync(pngPath)) {
      const url = `/assets/logos/${info.slug}.png`;
      const googleUrl = `https://www.google.com/s2/favicons?domain=${info.domain}&sz=128`;
      return {
        url,
        logoUrl: url,
        domain: info.domain,
        slug: info.slug,
        isLocal: true,
        fallbackGoogleUrl: googleUrl,
        googleFaviconUrl: googleUrl
      };
    }

    // Nếu chưa có file local, dùng Google Favicon 128px API trực tiếp
    const googleUrl = `https://www.google.com/s2/favicons?domain=${info.domain}&sz=128`;
    return {
      url: googleUrl,
      logoUrl: googleUrl,
      domain: info.domain,
      slug: info.slug,
      isLocal: false,
      fallbackGoogleUrl: googleUrl,
      googleFaviconUrl: googleUrl
    };
  }

  /**
   * Helper fetch buffer từ URL (có hỗ trợ redirect 301/302)
   */
  _fetchBuffer(url, timeoutMs = 8000) {
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
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let redirectUrl = res.headers.location;
            if (redirectUrl.startsWith('/')) {
              redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
            }
            return this._fetchBuffer(redirectUrl, timeoutMs).then(resolve).catch(reject);
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }

          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Cào tự động và lưu file ảnh logo về Local cho một domain bất kỳ
   */
  async crawlAndSaveLogo(domain, slug) {
    if (!domain || !slug) return null;
    const localFilePath = path.join(this.targetDir, `${slug}.png`);

    // 1. Thử cào apple-touch-icon từ HTML website
    try {
      const htmlBuf = await this._fetchBuffer(`https://${domain}`, 4000);
      const html = htmlBuf.toString('utf-8');
      const touchMatch = html.match(/<link[^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]+href=["']([^"']+)["']/i) ||
                         html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["']/i);
      if (touchMatch && touchMatch[1]) {
        let iconUrl = touchMatch[1].trim();
        if (iconUrl.startsWith('//')) iconUrl = 'https:' + iconUrl;
        else if (iconUrl.startsWith('/')) iconUrl = `https://${domain}` + iconUrl;
        
        const imgBuf = await this._fetchBuffer(iconUrl, 5000);
        if (imgBuf && imgBuf.length > 500) {
          fs.writeFileSync(localFilePath, imgBuf);
          return `/assets/logos/${slug}.png`;
        }
      }
    } catch (e) {
      // Bỏ qua lỗi cào HTML
    }

    // 2. Fallback sang Google Favicon 128px API
    try {
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      const imgBuf = await this._fetchBuffer(googleFaviconUrl, 4000);
      if (imgBuf && imgBuf.length > 300) {
        fs.writeFileSync(localFilePath, imgBuf);
        return `/assets/logos/${slug}.png`;
      }
    } catch (e) {
      // Bỏ qua lỗi
    }

    return null;
  }
}

module.exports = new LogoCrawlerService();
