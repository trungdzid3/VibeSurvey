import os
import subprocess
import cv2
import numpy as np
from PIL import Image

src_path = r'C:/Users/Lenovo/.gemini/antigravity/brain/e6c21bc4-0eac-406d-bff2-8afa0846b157/.user_uploaded/media_1793464519904_3392a03c.jpg'
bgr = cv2.imread(src_path)
rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
gray = cv2.cvtColor(rgb[:600, :], cv2.COLOR_RGB2GRAY)
mask = (gray < 248).astype(np.uint8) * 255

num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask)
major_comps = [i for i in range(1, num_labels) if stats[i, cv2.CC_STAT_AREA] > 5000]
major_comps.sort(key=lambda c: centroids[c][1])

# Scale and Center on 512x512 canvas
# Target height: 410 (80% of canvas)
scale = 410.0 / 312.0
cx = 512.0
cy = 428.0

def T(x, y):
    return (256.0 + (x - cx) * scale, 256.0 + (y - cy) * scale)

def smooth_open_segment(pts, sigma=2.5):
    n = len(pts)
    if n <= 4:
        return pts
    radius = min(int(3 * sigma), n // 4)
    if radius < 1:
        return pts
    x = np.arange(-radius, radius + 1)
    kernel = np.exp(-0.5 * (x / sigma) ** 2)
    kernel /= kernel.sum()
    
    padded = np.pad(pts, ((radius, radius), (0, 0)), mode='reflect')
    smoothed = np.zeros_like(pts, dtype=float)
    for dim in range(2):
        smoothed[:, dim] = np.convolve(padded[:, dim], kernel, mode='valid')
    smoothed[0] = pts[0]
    smoothed[-1] = pts[-1]
    return smoothed

def fit_open_segment(pts, eps=0.003):
    pts_smooth = smooth_open_segment(pts, sigma=2.5)
    arc = cv2.arcLength(pts_smooth[:, None, :].astype(np.float32), False)
    approx = cv2.approxPolyDP(pts_smooth[:, None, :].astype(np.float32), eps * arc, False).reshape(-1, 2)
    n = len(approx)
    if n <= 1:
        return ''
    if n == 2:
        p1 = T(approx[1][0], approx[1][1])
        return f' L {p1[0]:.2f} {p1[1]:.2f}'
    
    tpts = [T(p[0], p[1]) for p in approx]
    d = ''
    for i in range(n - 1):
        p0 = tpts[0] if i == 0 else tpts[i - 1]
        p1 = tpts[i]
        p2 = tpts[i + 1]
        p3 = tpts[-1] if i + 2 >= n else tpts[i + 2]
        c1x = p1[0] + (p2[0] - p0[0]) / 6.0
        c1y = p1[1] + (p2[1] - p0[1]) / 6.0
        c2x = p2[0] - (p3[0] - p1[0]) / 6.0
        c2y = p2[1] - (p3[1] - p1[1]) / 6.0
        d += f' C {c1x:.2f} {c1y:.2f}, {c2x:.2f} {c2y:.2f}, {p2[0]:.2f} {p2[1]:.2f}'
    return d

def get_segment(cnt, i1, i2):
    n = len(cnt)
    if i2 >= i1:
        return cnt[i1:i2+1]
    else:
        return np.vstack([cnt[i1:], cnt[:i2+1]])

# Part 1: Top Ribbon
cnt1 = max(cv2.findContours((labels == major_comps[0]).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea).reshape(-1, 2)
i_tip1 = np.argmin(np.linalg.norm(cnt1 - [454, 366], axis=1))
i_br1 = np.argmin(np.linalg.norm(cnt1 - [614, 335], axis=1))
i_tr1 = np.argmin(np.linalg.norm(cnt1 - [638, 273], axis=1))

seg1_top = get_segment(cnt1, i_tr1, i_tip1)
seg1_bot = get_segment(cnt1, i_tip1, i_br1)
pt_tr1 = T(cnt1[i_tr1][0], cnt1[i_tr1][1])
pt_br1 = T(cnt1[i_br1][0], cnt1[i_br1][1])
path1 = f'M {pt_tr1[0]:.2f} {pt_tr1[1]:.2f}' + fit_open_segment(seg1_top) + fit_open_segment(seg1_bot) + f' L {pt_tr1[0]:.2f} {pt_tr1[1]:.2f} Z'

# Part 2: Upper-Left Loop
cnt2 = max(cv2.findContours((labels == major_comps[1]).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea).reshape(-1, 2)
i_top2 = np.argmin(np.linalg.norm(cnt2 - [460, 276], axis=1))
i_bot2 = np.argmin(np.linalg.norm(cnt2 - [540, 491], axis=1))
seg2_outer = get_segment(cnt2, i_top2, i_bot2)
seg2_inner = get_segment(cnt2, i_bot2, i_top2)
pt_top2 = T(cnt2[i_top2][0], cnt2[i_top2][1])
path2 = f'M {pt_top2[0]:.2f} {pt_top2[1]:.2f}' + fit_open_segment(seg2_outer) + fit_open_segment(seg2_inner) + ' Z'

# Part 3: Lower-Right Loop
cnt3 = max(cv2.findContours((labels == major_comps[2]).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea).reshape(-1, 2)
i_top3 = np.argmin(np.linalg.norm(cnt3 - [483, 364], axis=1))
i_bot3 = np.argmin(np.linalg.norm(cnt3 - [566, 580], axis=1))
seg3_inner = get_segment(cnt3, i_top3, i_bot3)
seg3_outer = get_segment(cnt3, i_bot3, i_top3)
pt_top3 = T(cnt3[i_top3][0], cnt3[i_top3][1])
path3 = f'M {pt_top3[0]:.2f} {pt_top3[1]:.2f}' + fit_open_segment(seg3_inner) + fit_open_segment(seg3_outer) + ' Z'

# Part 4: Bottom Ribbon
cnt4 = max(cv2.findContours((labels == major_comps[3]).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea).reshape(-1, 2)
i_tip4 = np.argmin(np.linalg.norm(cnt4 - [569, 497], axis=1))
i_tl4 = np.argmin(np.linalg.norm(cnt4 - [409, 521], axis=1))
i_bl4 = np.argmin(np.linalg.norm(cnt4 - [385, 583], axis=1))
seg4_top = get_segment(cnt4, i_tip4, i_tl4)
seg4_bot = get_segment(cnt4, i_bl4, i_tip4)
pt_bl4 = T(cnt4[i_bl4][0], cnt4[i_bl4][1])
pt_tl4 = T(cnt4[i_tl4][0], cnt4[i_tl4][1])
path4 = f'M {pt_bl4[0]:.2f} {pt_bl4[1]:.2f}' + fit_open_segment(seg4_bot) + fit_open_segment(seg4_top) + f' L {pt_bl4[0]:.2f} {pt_bl4[1]:.2f} Z'

# Pure Vector SVG - Light Theme
svg_light = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" fill="none">
  <defs>
    <!-- Top Horizontal Ribbon Gradient -->
    <linearGradient id="sh-top-light" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FD7839"/>
      <stop offset="50%" stop-color="#FE8B2B"/>
      <stop offset="100%" stop-color="#FB9B29"/>
    </linearGradient>

    <!-- Upper-Left Arc Ribbon Gradient -->
    <linearGradient id="sh-upper-light" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#FD7839"/>
      <stop offset="45%" stop-color="#FF6C43"/>
      <stop offset="100%" stop-color="#F54A38"/>
    </linearGradient>

    <!-- Lower-Right Arc Ribbon Gradient -->
    <linearGradient id="sh-lower-light" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7530"/>
      <stop offset="55%" stop-color="#FF842F"/>
      <stop offset="100%" stop-color="#FFA024"/>
    </linearGradient>

    <!-- Bottom Horizontal Ribbon Gradient -->
    <linearGradient id="sh-bottom-light" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF5252"/>
      <stop offset="40%" stop-color="#FF624E"/>
      <stop offset="100%" stop-color="#FE763A"/>
    </linearGradient>
  </defs>

  <g id="survhub-s-light">
    <!-- Top Horizontal Ribbon -->
    <path id="ribbon-top" d="{path1}" fill="url(#sh-top-light)" />
    <!-- Upper-Left Loop -->
    <path id="ribbon-upper" d="{path2}" fill="url(#sh-upper-light)" />
    <!-- Lower-Right Loop -->
    <path id="ribbon-lower" d="{path3}" fill="url(#sh-lower-light)" />
    <!-- Bottom Horizontal Ribbon -->
    <path id="ribbon-bottom" d="{path4}" fill="url(#sh-bottom-light)" />
  </g>
</svg>'''

# Pure Vector SVG - Dark Theme
svg_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" fill="none">
  <defs>
    <!-- Top Horizontal Ribbon Gradient (Dark Mode) -->
    <linearGradient id="sh-top-dark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF8040"/>
      <stop offset="50%" stop-color="#FF9534"/>
      <stop offset="100%" stop-color="#FFA732"/>
    </linearGradient>

    <!-- Upper-Left Arc Ribbon Gradient (Dark Mode) -->
    <linearGradient id="sh-upper-dark" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#FF8040"/>
      <stop offset="45%" stop-color="#FF754C"/>
      <stop offset="100%" stop-color="#FA5442"/>
    </linearGradient>

    <!-- Lower-Right Arc Ribbon Gradient (Dark Mode) -->
    <linearGradient id="sh-lower-dark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7D38"/>
      <stop offset="55%" stop-color="#FF8D36"/>
      <stop offset="100%" stop-color="#FFA82E"/>
    </linearGradient>

    <!-- Bottom Horizontal Ribbon Gradient (Dark Mode) -->
    <linearGradient id="sh-bottom-dark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF5C5C"/>
      <stop offset="40%" stop-color="#FF6B58"/>
      <stop offset="100%" stop-color="#FF8044"/>
    </linearGradient>

    <filter id="ambient-glow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#EA580C" flood-opacity="0.3"/>
    </filter>
  </defs>

  <g id="survhub-s-dark" filter="url(#ambient-glow)">
    <!-- Top Horizontal Ribbon -->
    <path id="ribbon-top-dark" d="{path1}" fill="url(#sh-top-dark)" />
    <!-- Upper-Left Loop -->
    <path id="ribbon-upper-dark" d="{path2}" fill="url(#sh-upper-dark)" />
    <!-- Lower-Right Loop -->
    <path id="ribbon-lower-dark" d="{path3}" fill="url(#sh-lower-dark)" />
    <!-- Bottom Horizontal Ribbon -->
    <path id="ribbon-bottom-dark" d="{path4}" fill="url(#sh-bottom-dark)" />
  </g>
</svg>'''

# Save Pure Vector SVGs
with open('public/logo-light.svg', 'w', encoding='utf-8') as f:
    f.write(svg_light)

with open('public/logo-dark.svg', 'w', encoding='utf-8') as f:
    f.write(svg_dark)

with open('public/logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_light)

with open('public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_light)

# Sync Pure Vector SVGs to Android assets
android_dir = 'android/app/src/main/assets/public'
if os.path.exists(android_dir):
    for fn in ['logo-light.svg', 'logo-dark.svg', 'logo.svg', 'favicon.svg']:
        with open(os.path.join('public', fn), 'rb') as sf:
            with open(os.path.join(android_dir, fn), 'wb') as df:
                df.write(sf.read())

# Render high-resolution PNGs directly from Pure Vector SVG using Chrome
chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_png = r'c:\Users\Lenovo\Downloads\Linh\public\vector_master_render.png'

subprocess.run([
    chrome_path,
    '--headless=new',
    '--default-background-color=00000000',
    f'--screenshot={temp_png}',
    '--window-size=512,512',
    r'file:///c:/Users/Lenovo/Downloads/Linh/public/logo-light.svg'
], check=True)

if os.path.exists(temp_png):
    master_png = Image.open(temp_png).convert('RGBA')
    master_png.save('public/logo.png', format='PNG')
    master_png.save('public/icon-512.png', format='PNG')
    master_png.save('public/logo-512.png', format='PNG')

    # White background variant
    white_bg = Image.new('RGB', (512, 512), (255, 255, 255))
    white_bg.paste(master_png, (0, 0), master_png)
    white_bg.save('public/logo-white.png', format='PNG')

    # 192x192
    p192 = master_png.resize((192, 192), Image.Resampling.LANCZOS)
    p192.save('public/icon-192.png', format='PNG')

    # 48x48 Favicon PNG
    p48 = master_png.resize((48, 48), Image.Resampling.LANCZOS)
    p48.save('public/favicon.png', format='PNG')

    # Multi-resolution ICO
    master_png.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])

    # Sync PNGs to Android Assets & Mipmaps
    if os.path.exists(android_dir):
        for fn in ['logo.png', 'icon-512.png', 'icon-192.png', 'favicon.png']:
            with open(os.path.join('public', fn), 'rb') as sf:
                with open(os.path.join(android_dir, fn), 'wb') as df:
                    df.write(sf.read())

    android_res = 'android/app/src/main/res'
    if os.path.exists(android_res):
        master_png.save(os.path.join(android_res, 'ic_launcher-512.png'))
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
                resized = master_png.resize((sz, sz), Image.Resampling.LANCZOS)
                resized.save(os.path.join(fpath, 'ic_launcher.png'))
                resized.save(os.path.join(fpath, 'ic_launcher_round.png'))
                resized.save(os.path.join(fpath, 'ic_launcher_foreground.png'))

    # Clean up temp
    os.remove(temp_png)

# Clean up test files
for t in ['public/test_chrome.png', 'public/test_chrome_transparent.png', 'public/test_vector.svg', 'public/logo-s-tight.png']:
    if os.path.exists(t):
        os.remove(t)

print('SUCCESS: All Pure Vector SVG and perfectly synchronized assets built!')
