const fs = require('fs');
const img1 = fs.readFileSync('C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793386348200_0aedf10a.png').toString('base64');
const img2 = fs.readFileSync('C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793386350019_4d6443be.png').toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Compare Header Images</title>
  <style>
    body { background: #555; color: #fff; font-family: sans-serif; padding: 20px; }
    .box { margin-bottom: 24px; }
    img { display: block; max-width: 100%; border: 2px solid cyan; }
    .overlay-wrap { position: relative; width: 1024px; height: 50px; background: rgba(0,0,0,0.5); }
    .overlay-wrap img { position: absolute; top: 0; left: 0; }
    .diff { mix-blend-mode: difference; }
  </style>
</head>
<body>
  <h1>So Sánh 2 Ảnh Header Khi Đổi Theme</h1>
  <div class="box">
    <h3>Ảnh 1 (Light Theme - Cao 44px):</h3>
    <img src="data:image/png;base64,${img1}">
  </div>
  <div class="box">
    <h3>Ảnh 2 (Dark Theme - Cao 41px):</h3>
    <img src="data:image/png;base64,${img2}">
  </div>
  <div class="box">
    <h3>Chồng 2 ảnh (Difference Blend Mode để thấy rõ phần lệch/co giãn):</h3>
    <div class="overlay-wrap">
      <img src="data:image/png;base64,${img1}" style="opacity: 0.8;">
      <img src="data:image/png;base64,${img2}" style="opacity: 0.8; mix-blend-mode: difference;">
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('public/test_compare_images.html', html, 'utf-8');
console.log('Done writing public/test_compare_images.html');
