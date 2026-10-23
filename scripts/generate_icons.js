/**
 * Script tự động sinh bộ Icon & Logo chuẩn đa nền tảng cho VibeSurvey
 * Hỗ trợ:
 *   - Android Native: mdpi (48), hdpi (72), xhdpi (96), xxhdpi (144), xxxhdpi (192), store (512)
 *   - Các biến thể: standard (squircle bo góc), round (tròn), foreground (nền trong suốt cho Adaptive Icon)
 *   - Web & PWA: favicon.png (64x64), icon-192.png, icon-512.png, logo.png
 * Sử dụng 100% Node.js core (zlib & Buffer) không phụ thuộc bất kỳ thư viện ngoài nào.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// === Bảng tra cứu CRC32 chuẩn IEEE 802.3 ===
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, dataBuffer) {
  const len = dataBuffer.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  dataBuffer.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), dataBuffer]);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

/**
 * Mã hóa buffer RGBA thô thành định dạng tệp PNG hợp lệ
 */
function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // 8-bit depth
  ihdrData[9] = 6;  // Color type 6 (RGBA)
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Standard filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines với byte bộ lọc 0x00 (None)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (1 + width * 4);
    scanlines[scanlineOffset] = 0;
    const srcOffset = y * width * 4;
    rgbaBuffer.copy(scanlines, scanlineOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Tính khoảng cách từ điểm (px, py) tới đoạn thẳng (x1, y1) -> (x2, y2)
 */
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/**
 * Vẽ Icon VibeSurvey với các kiểu:
 *   - 'standard': Bo góc squircle mượt mà
 *   - 'round': Cắt tròn hoàn hảo (Android round icon)
 *   - 'foreground': Nền trong suốt hoàn toàn (Adaptive Icon Foreground)
 */
function renderIcon(size, style = 'standard') {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / size;
      const ny = y / size;

      let bgR = 15, bgG = 23, bgB = 42, bgA = 255; // #0F172A

      if (style === 'foreground') {
        // Nền trong suốt
        bgA = 0;
        bgR = 0;
        bgG = 0;
        bgB = 0;
      } else {
        // Gradient nền chéo từ góc trên-trái xuống dưới-phải: #0F172A -> #1E1B4B -> #0B0F19
        const diag = (nx + ny) * 0.5;
        if (diag < 0.5) {
          const t = diag / 0.5;
          bgR = Math.round(15 * (1 - t) + 30 * t);
          bgG = Math.round(23 * (1 - t) + 27 * t);
          bgB = Math.round(42 * (1 - t) + 75 * t);
        } else {
          const t = (diag - 0.5) / 0.5;
          bgR = Math.round(30 * (1 - t) + 11 * t);
          bgG = Math.round(27 * (1 - t) + 15 * t);
          bgB = Math.round(75 * (1 - t) + 25 * t);
        }

        // Cắt hình dạng
        if (style === 'round') {
          const d = Math.hypot(x - cx, y - cy);
          if (d > maxR) {
            bgA = 0;
          } else if (d > maxR - 1.0) {
            bgA = Math.round(255 * (maxR - d));
          }
        } else if (style === 'standard') {
          const cornerR = size * 0.22;
          const qx = Math.max(Math.abs(x - cx) - (cx - cornerR), 0);
          const qy = Math.max(Math.abs(y - cy) - (cy - cornerR), 0);
          const distCorner = Math.hypot(qx, qy);
          if (distCorner > cornerR) {
            bgA = 0;
          } else if (distCorner > cornerR - 1.0) {
            bgA = Math.round(255 * (cornerR - distCorner));
          }
        }
      }

      rgba[idx] = bgR;
      rgba[idx + 1] = bgG;
      rgba[idx + 2] = bgB;
      rgba[idx + 3] = bgA;

      if (bgA === 0 && style !== 'foreground') continue;

      // === 1. Vẽ 3 thanh nhịp điệu Pulse Bars (Vibe Data Waves) ===
      const pulseBars = [
        { x1: 0.22, x2: 0.25, y1: 0.53, y2: 0.63 },
        { x1: 0.27, x2: 0.30, y1: 0.46, y2: 0.65 },
        { x1: 0.32, x2: 0.35, y1: 0.41, y2: 0.67 }
      ];

      for (const bar of pulseBars) {
        const barW = (bar.x2 - bar.x1) / 2;
        const barH = (bar.y2 - bar.y1) / 2;
        const bcx = (bar.x1 + bar.x2) / 2;
        const bcy = (bar.y1 + bar.y2) / 2;
        const corner = barW;

        const qx = Math.max(Math.abs(nx - bcx) - (barW - corner), 0);
        const qy = Math.max(Math.abs(ny - bcy) - (barH - corner), 0);
        const dist = Math.hypot(qx, qy);

        if (dist <= corner) {
          const factor = Math.min(1.0, (corner - dist) * size * 1.5) * 0.85;
          const pR = Math.round(99 + (56 - 99) * ((ny - bar.y1) / (bar.y2 - bar.y1)));
          const pG = Math.round(102 + (189 - 102) * ((ny - bar.y1) / (bar.y2 - bar.y1)));
          const pB = Math.round(241 + (248 - 241) * ((ny - bar.y1) / (bar.y2 - bar.y1)));
          const pA = Math.round(255 * factor);

          blendPixel(rgba, idx, pR, pG, pB, pA, style);
        }
      }

      // === 2. Vẽ nét Chữ V / Checkmark Khảo Sát Chính (Core Survey Validation) ===
      // Đoạn 1: (0.33, 0.52) -> (0.48, 0.72)
      // Đoạn 2: (0.48, 0.72) -> (0.75, 0.34)
      const d1 = distToSegment(nx, ny, 0.33, 0.52, 0.48, 0.72);
      const d2 = distToSegment(nx, ny, 0.48, 0.72, 0.75, 0.34);
      const strokeW = 0.048;

      const minDist = Math.min(d1, d2);
      if (minDist <= strokeW) {
        const factor = Math.min(1.0, (strokeW - minDist) * size * 1.2);
        
        // Gradient dọc theo chữ V: từ Indigo (#818CF8) -> Royal Blue (#3B82F6) -> Cyan (#06B6D4)
        const tProgress = (nx - 0.33) / (0.75 - 0.33);
        let fgR = 129, fgG = 140, fgB = 248;
        if (tProgress < 0.5) {
          const t = Math.max(0, tProgress / 0.5);
          fgR = Math.round(129 * (1 - t) + 59 * t);
          fgG = Math.round(140 * (1 - t) + 130 * t);
          fgB = Math.round(248 * (1 - t) + 246 * t);
        } else {
          const t = Math.min(1, (tProgress - 0.5) / 0.5);
          fgR = Math.round(59 * (1 - t) + 6 * t);
          fgG = Math.round(130 * (1 - t) + 182 * t);
          fgB = Math.round(246 * (1 - t) + 212 * t);
        }

        const fgA = Math.round(255 * factor);
        blendPixel(rgba, idx, fgR, fgG, fgB, fgA, style);

        // Nét phản quang mỏng (Inner Highlight) tạo hiệu ứng 3D sáng lấp lánh
        const hlStrokeW = 0.016;
        if (minDist <= hlStrokeW) {
          const hlFactor = Math.min(1.0, (hlStrokeW - minDist) * size * 1.5) * 0.9;
          blendPixel(rgba, idx, 255, 255, 255, Math.round(255 * hlFactor), style);
        }
      }

      // === 3. Ngôi Sao Kim Cương Vàng Thưởng (Reward Sparkle Star) tại (0.76, 0.27) ===
      const starCx = 0.76;
      const starCy = 0.27;
      const dx = Math.abs(nx - starCx);
      const dy = Math.abs(ny - starCy);
      const starSize = 0.085;

      // Hình học 4 cánh kim cương vuốt nhọn (Astroid curve: x^0.5 + y^0.5 <= R^0.5)
      const diamondDist = Math.sqrt(dx) + Math.sqrt(dy);
      const diamondLimit = Math.sqrt(starSize);

      if (diamondDist <= diamondLimit) {
        const factor = Math.min(1.0, (diamondLimit - diamondDist) * Math.sqrt(size) * 2.5);
        // Gradient vàng Amber rực rỡ: #FEF08A -> #F59E0B -> #D97706
        const cFactor = Math.hypot(dx, dy) / starSize;
        const sR = Math.round(254 * (1 - cFactor) + 245 * cFactor);
        const sG = Math.round(240 * (1 - cFactor) + 158 * cFactor);
        const sB = Math.round(138 * (1 - cFactor) + 11 * cFactor);
        const sA = Math.round(255 * factor);

        blendPixel(rgba, idx, sR, sG, sB, sA, style);

        // Điểm sáng tâm lõi trắng tinh khôi
        const coreDist = Math.hypot(dx, dy);
        if (coreDist <= 0.018) {
          const coreFactor = Math.min(1.0, (0.018 - coreDist) * size * 2.0);
          blendPixel(rgba, idx, 255, 255, 255, Math.round(255 * coreFactor), style);
        }
      }
    }
  }

  return encodePNG(size, size, rgba);
}

function blendPixel(rgba, idx, r, g, b, a, style) {
  if (a <= 0) return;
  const alpha = a / 255;
  if (style === 'foreground') {
    const curA = rgba[idx + 3] / 255;
    const outA = alpha + curA * (1 - alpha);
    if (outA > 0) {
      rgba[idx] = Math.round((r * alpha + rgba[idx] * curA * (1 - alpha)) / outA);
      rgba[idx + 1] = Math.round((g * alpha + rgba[idx + 1] * curA * (1 - alpha)) / outA);
      rgba[idx + 2] = Math.round((b * alpha + rgba[idx + 2] * curA * (1 - alpha)) / outA);
      rgba[idx + 3] = Math.round(outA * 255);
    }
  } else {
    rgba[idx] = Math.round(r * alpha + rgba[idx] * (1 - alpha));
    rgba[idx + 1] = Math.round(g * alpha + rgba[idx + 1] * (1 - alpha));
    rgba[idx + 2] = Math.round(b * alpha + rgba[idx + 2] * (1 - alpha));
  }
}

// === Cấu hình thư mục xuất icon ===
const rootDir = path.resolve(__dirname, '..');
const androidResDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
const publicDir = path.join(rootDir, 'public');

const androidSpecs = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

function main() {
  console.log('===============================================================');
  console.log('🎨 BẮT ĐẦU TẠO ASSET LOGO & ICONS CHUẨN ĐA NỀN TẢNG CHO VIBESURVEY');
  console.log('===============================================================');

  // 1. Tạo Android Native Icons
  for (const spec of androidSpecs) {
    const targetDir = path.join(androidResDir, spec.folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Standard Icon (Squircle)
    const stdPng = renderIcon(spec.size, 'standard');
    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), stdPng);

    // Round Icon (Circle)
    const roundPng = renderIcon(spec.size, 'round');
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), roundPng);

    // Foreground Adaptive Icon
    const fgPng = renderIcon(spec.size, 'foreground');
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), fgPng);

    console.log(`✓ Đã tạo Android Icon ${spec.folder} (${spec.size}x${spec.size}px)`);
  }

  // 2. Tạo Store Icon 512x512 cho Google Play / Android Res
  const storePng = renderIcon(512, 'standard');
  fs.writeFileSync(path.join(androidResDir, 'ic_launcher-512.png'), storePng);
  console.log('✓ Đã tạo Android Store Icon (512x512px) tại android/res/ic_launcher-512.png');

  // 3. Tạo Web & PWA Icons trong public/
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Favicon 64x64
  const favPng = renderIcon(64, 'standard');
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), favPng);
  console.log('✓ Đã tạo Web Favicon PNG (64x64px) tại public/favicon.png');

  // App Icon 192x192
  const icon192 = renderIcon(192, 'standard');
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
  console.log('✓ Đã tạo PWA App Icon (192x192px) tại public/icon-192.png');

  // App Icon 512x512
  const icon512 = renderIcon(512, 'standard');
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
  fs.writeFileSync(path.join(publicDir, 'logo.png'), icon512);
  console.log('✓ Đã tạo High-Res App Logo & Icon (512x512px) tại public/icon-512.png & public/logo.png');

  console.log('===============================================================');
  console.log('🎉 TẤT CẢ ASSETS LOGO & ICON ĐÃ ĐƯỢC SINH THÀNH CÔNG RỰC RỠ!');
  console.log('===============================================================');
}

main();
