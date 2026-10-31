import os
import base64
import numpy as np
from PIL import Image

src_path = r'C:/Users/Lenovo/.gemini/antigravity/brain/e6c21bc4-0eac-406d-bff2-8afa0846b157/.user_uploaded/media_1793464519904_3392a03c.jpg'
orig_img = Image.open(src_path).convert('RGB')
orig_arr = np.array(orig_img)

# 1. 1024x1024 original with 'SurvHub' text completely erased (fill with white 254)
img_clean = orig_arr.copy()
img_clean[590:, :] = 254
Image.fromarray(img_clean).save('public/logo-original-clean.png', quality=100)

# 2. Extract S glyph with smooth anti-aliased alpha
ymin, ymax = 272, 584
xmin, xmax = 383, 640
pad = 3
crop = orig_arr[ymin-pad:ymax+pad+1, xmin-pad:xmax+pad+1]

diff_b = 255.0 - crop[:, :, 2].astype(float)
diff_g = 255.0 - crop[:, :, 1].astype(float)
max_diff = np.maximum(diff_b, diff_g)

t_low = 8.0
t_high = 25.0
alpha = np.clip((max_diff - t_low) / (t_high - t_low), 0.0, 1.0)
alpha = alpha * alpha * (3.0 - 2.0 * alpha)

bg_val = 254.5
fg = np.zeros_like(crop, dtype=float)
for i in range(3):
    fg[:, :, i] = np.where(
        alpha > 0.005,
        np.clip((crop[:, :, i].astype(float) - (1.0 - alpha) * bg_val) / np.maximum(alpha, 0.005), 0, 255),
        crop[:, :, i].astype(float)
    )

rgba_crop = np.dstack([fg.astype(np.uint8), (alpha * 255).astype(np.uint8)])
s_crop = Image.fromarray(rgba_crop, mode='RGBA')
s_crop.save('public/logo-s-tight.png')

# 3. Create 512x512 Master Logo (Centered, 82% height scale for ideal web proportion)
target_h = 420
scale = target_h / s_crop.size[1]
target_w = int(round(s_crop.size[0] * scale))

s_512 = s_crop.resize((target_w, target_h), Image.Resampling.LANCZOS)

# 512 Transparent
canvas_512 = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
pos_x = (512 - target_w) // 2
pos_y = (512 - target_h) // 2
canvas_512.paste(s_512, (pos_x, pos_y), s_512)

canvas_512.save('public/logo.png', format='PNG')
canvas_512.save('public/icon-512.png', format='PNG')
canvas_512.save('public/logo-512.png', format='PNG')

# 512 White Background
canvas_512_white = Image.new('RGB', (512, 512), (255, 255, 255))
canvas_512_white.paste(s_512, (pos_x, pos_y), s_512)
canvas_512_white.save('public/logo-white.png', format='PNG')

# 1024 Transparent
target_h_1024 = 840
scale_1024 = target_h_1024 / s_crop.size[1]
target_w_1024 = int(round(s_crop.size[0] * scale_1024))
s_1024 = s_crop.resize((target_w_1024, target_h_1024), Image.Resampling.LANCZOS)
canvas_1024 = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
pos_x_1024 = (1024 - target_w_1024) // 2
pos_y_1024 = (1024 - target_h_1024) // 2
canvas_1024.paste(s_1024, (pos_x_1024, pos_y_1024), s_1024)
canvas_1024.save('public/logo-1024.png', format='PNG')

# 192 PWA / Android
canvas_192 = canvas_512.resize((192, 192), Image.Resampling.LANCZOS)
canvas_192.save('public/icon-192.png', format='PNG')

# 48 Favicon PNG
canvas_48 = canvas_512.resize((48, 48), Image.Resampling.LANCZOS)
canvas_48.save('public/favicon.png', format='PNG')

# Multi-resolution ICO
canvas_512.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])

# 4. Generate SVG files embedding the exact lossless PNG
with open('public/logo.png', 'rb') as f:
    png_b64 = base64.b64encode(f.read()).decode('utf-8')

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="100%" height="100%">
  <image width="512" height="512" href="data:image/png;base64,{png_b64}" xlink:href="data:image/png;base64,{png_b64}"/>
</svg>'''

svg_dark_content = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#EA580C" flood-opacity="0.25"/>
    </filter>
  </defs>
  <image width="512" height="512" href="data:image/png;base64,{png_b64}" xlink:href="data:image/png;base64,{png_b64}" filter="url(#glow)"/>
</svg>'''

with open('public/logo-light.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

with open('public/logo-dark.svg', 'w', encoding='utf-8') as f:
    f.write(svg_dark_content)

with open('public/logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

with open('public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

# Copy to android assets as well
android_dir = 'android/app/src/main/assets/public'
if os.path.exists(android_dir):
    for fn in ['logo.png', 'icon-512.png', 'icon-192.png', 'favicon.png', 'favicon.svg', 'logo-light.svg', 'logo-dark.svg', 'logo.svg']:
        src = os.path.join('public', fn)
        dst = os.path.join(android_dir, fn)
        if os.path.exists(src):
            with open(src, 'rb') as sf, open(dst, 'wb') as df:
                df.write(sf.read())

# Update Android Mipmap Icons
android_res = 'android/app/src/main/res'
if os.path.exists(android_res):
    canvas_512.save(os.path.join(android_res, 'ic_launcher-512.png'))
    densities = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }
    for folder, sz in densities.items():
        fpath = os.path.join(android_res, folder)
        if os.path.exists(fpath):
            resized = canvas_512.resize((sz, sz), Image.Resampling.LANCZOS)
            resized.save(os.path.join(fpath, 'ic_launcher.png'))
            resized.save(os.path.join(fpath, 'ic_launcher_round.png'))
            resized.save(os.path.join(fpath, 'ic_launcher_foreground.png'))

print('SUCCESS: All web logo assets & Android launcher icons generated and synced!')
