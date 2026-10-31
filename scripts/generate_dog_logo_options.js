const fs = require('fs');
const path = require('path');

// ==========================================
// PHUONG AN 1: THE DETECTIVE HOUND
// Khuon mat chu cho ro rang 100% kem Kinh lup mat phong dai
// ==========================================
function getOption1(isDark) {
  const bg = isDark ? '#18181B' : '#FFFFFF';
  const border = isDark ? '#2E2E36' : '#E4E4E7';
  const stroke = isDark ? '#FFFFFF' : '#09090B';
  const fill = isDark ? '#FFFFFF' : '#09090B';
  const accent = isDark ? '#F97316' : '#EA580C';
  const headFill = isDark ? '#1C1C20' : '#F8FAFC';
  const earFill = isDark ? '#27272A' : '#E4E4E7';
  const muzzleFill = isDark ? '#2E2E36' : '#F1F5F9';
  const lensGrad = isDark ? '#121214' : '#FFFFFF';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Nen Squircle chuan DESIGN.md -->
  <rect x="4" y="4" width="92" height="92" rx="22" fill="${bg}" stroke="${border}" stroke-width="2" />

  <!-- 1. DOI TAI CHU CHO (2 Tai ro rang hai ben) -->
  <!-- Tai Trai: Tai cup phong cach Beagle mem mai -->
  <path d="M 22 28 C 12 36, 12 56, 20 62 C 24 64, 27 58, 26 48 Z" fill="${earFill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" />
  
  <!-- Tai Phai: Vanh tai phia sau kinh lup -->
  <path d="M 78 28 C 88 36, 88 54, 82 60 C 78 62, 75 58, 76 48 Z" fill="${earFill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" />

  <!-- 2. DAU CHU CHO (Hinh khoi dau tron trinh dang yeu) -->
  <circle cx="50" cy="48" r="28" fill="${headFill}" stroke="${stroke}" stroke-width="4" />

  <!-- 3. VUNG MOM VA MUI CHO (Muzzle & Cute Nose) -->
  <ellipse cx="50" cy="57" rx="14" ry="10" fill="${muzzleFill}" stroke="${stroke}" stroke-width="2" />
  <!-- Mui cho mau cam thuong hieu bo tron -->
  <path d="M 46 52 C 48 50.5, 52 50.5, 54 52 C 55 54, 53 57, 50 57 C 47 57, 45 54, 46 52 Z" fill="${accent}" />
  <!-- Nhan trung & Mieng cuoi -->
  <path d="M 50 57 L 50 61" stroke="${stroke}" stroke-width="2" stroke-linecap="round" />
  <path d="M 45 61 Q 50 64 55 61" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" />

  <!-- 4. MAT TRAI CUA CHO (To tron long lanh) -->
  <ellipse cx="37" cy="45" rx="4" ry="4.5" fill="${fill}" />
  <circle cx="35.5" cy="43.5" r="1.5" fill="${isDark ? '#121214' : '#FFFFFF'}" />
  <circle cx="38.5" cy="46.5" r="0.8" fill="${isDark ? '#121214' : '#FFFFFF'}" />

  <!-- 5. KINH LUP MAT PHAI (GOC NHIN A: KINH LUP / GOC NHIN B: MAT PHONG DAI CUN) -->
  <!-- Can kinh lup vat cheo xuong duoi ma phai -->
  <path d="M 69 57 L 85 73 A 4.5 4.5 0 0 1 79 79 L 63 63 Z" fill="${accent}" stroke="${stroke}" stroke-width="2" />
  <!-- Vanh tron kinh lup phong dai quanh mat phai -->
  <circle cx="61" cy="45" r="13" fill="${lensGrad}" stroke="${accent}" stroke-width="4.5" />
  <!-- Vong quang hoc phan chieu tren mat kinh -->
  <path d="M 53 40 A 10 10 0 0 1 65 35" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" opacity="0.6" />
  <!-- Con nguoi mat phai ben trong kinh (phong to thau kinh) -->
  <ellipse cx="61" cy="45" rx="5" ry="5.5" fill="${fill}" />
  <circle cx="59.5" cy="43" r="1.8" fill="${isDark ? '#121214' : '#FFFFFF'}" />
  <circle cx="63" cy="47" r="1" fill="${isDark ? '#121214' : '#FFFFFF'}" />
</svg>`;
}

// ==========================================
// PHUONG AN 2: THE PROFILE GESTALT DETECTIVE
// Dau chu cho nhin nghieng ket hop KINH LUP thuc su
// ==========================================
function getOption2(isDark) {
  const bg = isDark ? '#18181B' : '#FFFFFF';
  const border = isDark ? '#2E2E36' : '#E4E4E7';
  const stroke = isDark ? '#FFFFFF' : '#09090B';
  const fill = isDark ? '#FFFFFF' : '#09090B';
  const accent = isDark ? '#F97316' : '#EA580C';
  const lensFill = isDark ? '#1C1C20' : '#F8FAFC';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Nen Squircle -->
  <rect x="4" y="4" width="92" height="92" rx="22" fill="${bg}" stroke="${border}" stroke-width="2" />

  <!-- GOC NHIN A: CAN KINH LUP / GOC NHIN B: TAI CUP CHU CHO (Rong & Dai) -->
  <path d="M 58 52 
           C 66 48, 76 60, 84 72 
           C 87 76, 85 82, 80 85 
           C 75 87, 70 85, 66 80 
           C 56 68, 50 60, 50 56 Z" 
        fill="${accent}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" />

  <!-- GOC NHIN A: VANH KINH LUP TO TRON / GOC NHIN B: HOP SO DAU CHU CHO -->
  <circle cx="44" cy="40" r="26" fill="${lensFill}" stroke="${stroke}" stroke-width="6" />

  <!-- GOC NHIN B: CHIEC MOM CHO NHU RA RO RANG 100% -->
  <path d="M 20 34 
           C 14 36, 10 40, 10 44 
           C 10 48, 14 52, 22 54 
           L 24 48 Z" 
        fill="${fill}" stroke="${stroke}" stroke-width="2" />

  <!-- Mui cho mau cam noi bat o chot mom -->
  <ellipse cx="11.5" cy="43.5" rx="3.5" ry="3" fill="${accent}" />

  <!-- Mat cho tinh anh to tron -->
  <ellipse cx="36" cy="38" rx="4.5" ry="5" fill="${fill}" />
  <circle cx="34.5" cy="36.5" r="1.6" fill="${isDark ? '#121214' : '#FFFFFF'}" />
  <circle cx="38" cy="40" r="0.8" fill="${isDark ? '#121214' : '#FFFFFF'}" />

  <!-- Long may & Vep sang mat kinh -->
  <path d="M 30 30 Q 36 26 43 28" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" />

  <!-- Mieng cuoi cun duoi mom -->
  <path d="M 18 48 Q 23 52 28 48" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" />
</svg>`;
}

// ==========================================
// PHUONG AN 3: THE EMBEDDED HOUND SILHOUETTE
// Chu cho thuc su ben trong long Kinh Lup (Gestalt Am Ban)
// ==========================================
function getOption3(isDark) {
  const bg = isDark ? '#18181B' : '#FFFFFF';
  const border = isDark ? '#2E2E36' : '#E4E4E7';
  const stroke = isDark ? '#FFFFFF' : '#09090B';
  const fill = isDark ? '#FFFFFF' : '#09090B';
  const accent = isDark ? '#F97316' : '#EA580C';
  const lensBg = isDark ? '#121214' : '#FFFFFF';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Nen Squircle -->
  <rect x="4" y="4" width="92" height="92" rx="22" fill="${bg}" stroke="${border}" stroke-width="2" />

  <!-- CAN KINH LUP: Vat cheo 45 do chac chan, cao cap -->
  <path d="M 62 58 L 84 80 A 5 5 0 0 1 77 87 L 55 65 Z" fill="${accent}" stroke="${stroke}" stroke-width="2" />

  <!-- VANH KINH LUP: Tron vo day dan 6px -->
  <circle cx="44" cy="42" r="25" fill="${lensBg}" stroke="${stroke}" stroke-width="6" />

  <!-- CHU CHO BEN TRONG LONG KINH (RO RANG 100% MOI CHI TIET) -->
  <!-- Dau cho nhin 3/4 dang yeu -->
  <!-- Tai Trai -->
  <path d="M 28 32 C 22 28, 20 40, 26 46 Z" fill="${accent}" stroke="${stroke}" stroke-width="1.8" />
  <!-- Tai Phai -->
  <path d="M 52 28 C 58 24, 62 36, 56 44 Z" fill="${accent}" stroke="${stroke}" stroke-width="1.8" />
  <!-- Mat & Dau -->
  <ellipse cx="40" cy="42" rx="14" ry="13" fill="${fill}" />
  <!-- Vung mom sang -->
  <ellipse cx="40" cy="46" rx="8" ry="6" fill="${isDark ? '#18181B' : '#FFFFFF'}" />
  <!-- Mui cam -->
  <ellipse cx="40" cy="43.5" rx="2.5" ry="2" fill="${accent}" />
  <!-- Mieng cuoi -->
  <path d="M 37 47 Q 40 49 43 47" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" />
  <!-- Hai mat to tron -->
  <circle cx="34" cy="39" r="2.2" fill="${isDark ? '#18181B' : '#FFFFFF'}" />
  <circle cx="46" cy="39" r="2.2" fill="${isDark ? '#18181B' : '#FFFFFF'}" />
  <circle cx="33.5" cy="38.5" r="0.8" fill="${fill}" />
  <circle cx="45.5" cy="38.5" r="0.8" fill="${fill}" />
</svg>`;
}

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>So Sanh 3 Phuong An Logo Chu Cho & Kinh Lup - VibeSurvey</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #09090b;
    color: #f4f4f5;
    padding: 30px;
    margin: 0;
  }
  h1 { font-size: 22px; font-weight: 800; color: #ea580c; margin-bottom: 8px; }
  p.desc { font-size: 13px; color: #a1a1aa; margin-bottom: 30px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
  .card {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 16px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .card h2 { font-size: 16px; margin: 0; color: #ffffff; }
  .card p { font-size: 12px; color: #a1a1aa; margin: 0; line-height: 1.5; }
  .preview-row { display: flex; gap: 16px; align-items: flex-end; }
  .box-light {
    background: #f4f4f5;
    padding: 16px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #09090b;
    font-size: 11px;
    font-weight: 600;
  }
  .box-dark {
    background: #121214;
    padding: 16px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #ffffff;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid #27272a;
  }
  .size-label { font-size: 10px; color: #71717a; text-align: center; }
</style>
</head>
<body>
  <h1>SO SANH 3 PHUONG AN LOGO CHU CHO & KINH LUP (GESTALT)</h1>
  <p class="desc">Muc tieu: Chu cho phai RO RANG 100%, de thuong, than thien; dong thoi Kinh Lup cung phai ro rang 100% khi doi cach nhin.</p>

  <div class="grid">
    <!-- Card 1 -->
    <div class="card">
      <h2>Phuong An 1: The Detective Hound (Khuyen Nghi)</h2>
      <p>Khuon mat chu cho thong minh, de thuong voi 2 tai ro rang, mui cam bo tron, mat sang. Mat phai cua cun chinh la chiec Kinh Lup phong dai, can kinh vat cheo xuong ma cun tao net pha cach doc dao.</p>
      <div class="preview-row">
        <div class="box-light">
          <div style="width: 80px; height: 80px;">${getOption1(false)}</div>
          <div style="width: 32px; height: 32px;">${getOption1(false)}</div>
          <span>Theme Sang</span>
        </div>
        <div class="box-dark">
          <div style="width: 80px; height: 80px;">${getOption1(true)}</div>
          <div style="width: 32px; height: 32px;">${getOption1(true)}</div>
          <span>Theme Toi</span>
        </div>
      </div>
    </div>

    <!-- Card 2 -->
    <div class="card">
      <h2>Phuong An 2: Profile Gestalt (Dau Cho & Kinh Lup)</h2>
      <p>Dau chu cho nhin nghieng voi mom dai, mui cam ro rang o ben trai. Vanh dau cun la vung kinh lup tron xoe, tai cun ru dai vat cheo 45 do dong vai tro can kinh lup to khoe.</p>
      <div class="preview-row">
        <div class="box-light">
          <div style="width: 80px; height: 80px;">${getOption2(false)}</div>
          <div style="width: 32px; height: 32px;">${getOption2(false)}</div>
          <span>Theme Sang</span>
        </div>
        <div class="box-dark">
          <div style="width: 80px; height: 80px;">${getOption2(true)}</div>
          <div style="width: 32px; height: 32px;">${getOption2(true)}</div>
          <span>Theme Toi</span>
        </div>
      </div>
    </div>

    <!-- Card 3 -->
    <div class="card">
      <h2>Phuong An 3: Embedded Hound (Chu Cho Trong Long Kinh)</h2>
      <p>Chiec kinh lup quang hoc to tron ben ngoai voi can cam sac sao. Ben trong mat kinh la hinh anh chu cho cung 2 tai xinh xan dang nhin cham chu, the hien y nghia soi tim insight khao sat.</p>
      <div class="preview-row">
        <div class="box-light">
          <div style="width: 80px; height: 80px;">${getOption3(false)}</div>
          <div style="width: 32px; height: 32px;">${getOption3(false)}</div>
          <span>Theme Sang</span>
        </div>
        <div class="box-dark">
          <div style="width: 80px; height: 80px;">${getOption3(true)}</div>
          <div style="width: 32px; height: 32px;">${getOption3(true)}</div>
          <span>Theme Toi</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '../public/test_dog_logo.html'), html);
console.log('Tao thanh cong public/test_dog_logo.html');
