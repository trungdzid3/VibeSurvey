import cv2
import numpy as np

img = cv2.imread('C:/Users/Lenovo/.gemini/antigravity/brain/0f786e82-36c6-4460-902f-a6f62a1ccbe7/.user_uploaded/media_1793463456648_b08f98a9.png')
# Icon bounding box in full 1024x1024 image:
xmin, ymin = 383, 271
xmax, ymax = 641, 585
icon_w = xmax - xmin
icon_h = ymax - ymin

crop = img[ymin:ymax+1, xmin:xmax+1]
gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
thresh = (gray < 250).astype(np.uint8) * 255

num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh)
components = []
for i in range(1, num_labels):
    if stats[i, cv2.CC_STAT_AREA] > 5000:
        components.append(i)

scale = 400.0 / icon_h
offset_x = (512 - icon_w * scale) / 2.0
offset_y = (512 - icon_h * scale) / 2.0

def points_to_bezier_path(pts):
    n = len(pts)
    if n < 3:
        return ''
    d = f'M {pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in range(n):
        p0 = pts[(i - 1) % n]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n]
        
        c1x = p1[0] + (p2[0] - p0[0]) / 6.0
        c1y = p1[1] + (p2[1] - p0[1]) / 6.0
        c2x = p2[0] - (p3[0] - p1[0]) / 6.0
        c2y = p2[1] - (p3[1] - p1[1]) / 6.0
        
        d += f' C {c1x:.1f} {c1y:.1f}, {c2x:.1f} {c2y:.1f}, {p2[0]:.1f} {p2[1]:.1f}'
    d += ' Z'
    return d

svg_parts = []
for c in components:
    mask = (labels == c).astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cnt = max(contours, key=cv2.contourArea)
    epsilon = 0.0018 * cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, epsilon, True)
    pts = approx.reshape(-1, 2)
    spts = [(p[0] * scale + offset_x, p[1] * scale + offset_y) for p in pts]
    top_y = min(p[1] for p in spts)
    path_d = points_to_bezier_path(spts)
    svg_parts.append((c, top_y, path_d, spts))

# Let's correctly identify the 4 components:
# 1. Top bar: highest right
# 2. Upper-left curve: highest left
# 3. Lower-right curve: middle-bottom right
# 4. Bottom bar: lowest left

# Let's inspect centroids to map exactly to the 4 parts
part_info = []
for c, top, d, spts in svg_parts:
    cx = np.mean([p[0] for p in spts])
    cy = np.mean([p[1] for p in spts])
    part_info.append((c, cx, cy, d))

print('Part centroids (cx, cy):')
for idx, (c, cx, cy, d) in enumerate(part_info):
    print(f'  c={c}: cx={cx:.1f}, cy={cy:.1f}')

# Sort into:
# Top Bar: cy < 200, cx > 256
# Upper-left curve: cy < 256, cx < 256
# Lower-right curve: cy > 200, cx > 256
# Bottom bar: cy > 300, cx < 256
# Map directly based on centroids:
# c=1: cy=115.7 (Top bar)
# c=2: cy=212.6 (Upper curve)
# c=23: cy=297.7 (Lower curve)
# c=47: cy=401.0 (Bottom bar)
top_bar = [p for p in part_info if p[0] == 1][0]
upper_curve = [p for p in part_info if p[0] == 2][0]
lower_curve = [p for p in part_info if p[0] == 23][0]
bottom_bar = [p for p in part_info if p[0] == 47][0]

print('Mapped parts successfully:')
print('  Top bar:', top_bar[0])
print('  Upper curve:', upper_curve[0])
print('  Lower curve:', lower_curve[0])
print('  Bottom bar:', bottom_bar[0])

# Gradients for Light Mode:
# Top Bar: from bright orange to golden amber
# Upper Curve: from coral-orange to vibrant orange
# Lower Curve: from vibrant orange to bright orange-amber
# Bottom Bar: from deep coral-red to bright orange
light_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" fill="none">
  <defs>
    <linearGradient id="sh-top-light" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF752D"/>
      <stop offset="60%" stop-color="#FF8A27"/>
      <stop offset="100%" stop-color="#FFA220"/>
    </linearGradient>
    <linearGradient id="sh-upper-light" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#FFA128"/>
      <stop offset="45%" stop-color="#FF6B36"/>
      <stop offset="100%" stop-color="#F94635"/>
    </linearGradient>
    <linearGradient id="sh-lower-light" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#FF6630"/>
      <stop offset="55%" stop-color="#FF8322"/>
      <stop offset="100%" stop-color="#FFA41C"/>
    </linearGradient>
    <linearGradient id="sh-bottom-light" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F43F5E"/>
      <stop offset="35%" stop-color="#FF5738"/>
      <stop offset="100%" stop-color="#FF8822"/>
    </linearGradient>
  </defs>
  <g id="survhub-mark-light">
    <!-- Top Horizontal Ribbon -->
    <path d="{top_bar[3]}" fill="url(#sh-top-light)"/>
    <!-- Upper Left Arc Ribbon -->
    <path d="{upper_curve[3]}" fill="url(#sh-upper-light)"/>
    <!-- Lower Right Arc Ribbon -->
    <path d="{lower_curve[3]}" fill="url(#sh-lower-light)"/>
    <!-- Bottom Horizontal Ribbon -->
    <path d="{bottom_bar[3]}" fill="url(#sh-bottom-light)"/>
  </g>
</svg>'''

# Gradients for Dark Mode:
# Slightly higher luminosity / glow contrast against obsidian charcoal dark backgrounds
dark_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" fill="none">
  <defs>
    <linearGradient id="sh-top-dark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF7E36"/>
      <stop offset="55%" stop-color="#FF9432"/>
      <stop offset="100%" stop-color="#FFAC2E"/>
    </linearGradient>
    <linearGradient id="sh-upper-dark" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#FFAA38"/>
      <stop offset="45%" stop-color="#FF733E"/>
      <stop offset="100%" stop-color="#FA5040"/>
    </linearGradient>
    <linearGradient id="sh-lower-dark" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#FF703A"/>
      <stop offset="55%" stop-color="#FF8C2B"/>
      <stop offset="100%" stop-color="#FFAD26"/>
    </linearGradient>
    <linearGradient id="sh-bottom-dark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FB4967"/>
      <stop offset="35%" stop-color="#FF6042"/>
      <stop offset="100%" stop-color="#FF922E"/>
    </linearGradient>
    <filter id="dark-glow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#EA580C" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g id="survhub-mark-dark" filter="url(#dark-glow)">
    <!-- Top Horizontal Ribbon -->
    <path d="{top_bar[3]}" fill="url(#sh-top-dark)"/>
    <!-- Upper Left Arc Ribbon -->
    <path d="{upper_curve[3]}" fill="url(#sh-upper-dark)"/>
    <!-- Lower Right Arc Ribbon -->
    <path d="{lower_curve[3]}" fill="url(#sh-lower-dark)"/>
    <!-- Bottom Horizontal Ribbon -->
    <path d="{bottom_bar[3]}" fill="url(#sh-bottom-dark)"/>
  </g>
</svg>'''

with open('public/logo-light.svg', 'w', encoding='utf8') as f:
    f.write(light_svg)

with open('public/logo-dark.svg', 'w', encoding='utf8') as f:
    f.write(dark_svg)

with open('public/logo.svg', 'w', encoding='utf8') as f:
    f.write(light_svg)

with open('public/favicon.svg', 'w', encoding='utf8') as f:
    f.write(light_svg)

print('Generated public/logo-light.svg, public/logo-dark.svg, public/logo.svg, public/favicon.svg')
