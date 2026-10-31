import numpy as np
from PIL import Image

im_or = Image.open('public/assets/3d/full_card_orange.png')
# The cam: w=475, h=335
# Chiec vi nam trong khoang x: 240..460, y: 20..220
# Chung ta lay rong hon de chac chan khong bi cat: x=235..465, y=10..225
wallet_crop = im_or.crop((235, 10, 465, 225))
w, h = wallet_crop.size

# Feather nhe 4 mep de khong co vien sac
data = np.array(wallet_crop.convert('RGBA'), dtype=np.float32)
mask = np.ones((h, w), dtype=np.float32) * 255.0

# Mep trai hoa quyen
for x in range(min(30, w)):
    mask[:, x] = (x / 30.0) * 255.0
# Mep tren hoa quyen
for y in range(min(15, h)):
    mask[y, :] = np.minimum(mask[y, :], (y / 15.0) * 255.0)
# Mep duoi hoa quyen
for y in range(max(0, h - 20), h):
    mask[y, :] = np.minimum(mask[y, :], ((h - 1 - y) / 20.0) * 255.0)
# Mep phai hoa quyen
for x in range(max(0, w - 15), w):
    mask[:, x] = np.minimum(mask[:, x], ((w - 1 - x) / 15.0) * 255.0)

data[:, :, 3] = np.minimum(data[:, :, 3], mask)
Image.fromarray(data.astype(np.uint8), mode='RGBA').save('public/assets/3d/wallet_3d_full.png', 'PNG')
print(f"Created wallet_3d_full.png: {w}x{h}")

# The trang:
im_wh = Image.open('public/assets/3d/full_card_white.png')
# Chiec coin va voucher nam o x: 250..465, y: 20..225
coins_crop = im_wh.crop((250, 15, 465, 225)).convert('RGBA')
cw, ch = coins_crop.size

# Tach nen trang (RGB > 240) sang trong suot
cdata = np.array(coins_crop, dtype=np.float32)
cr, cg, cb, ca = cdata[:,:,0], cdata[:,:,1], cdata[:,:,2], cdata[:,:,3]
whiteness = (cr + cg + cb) / 3.0
calpha = np.clip((248 - whiteness) / 12.0 * 255.0, 0, 255)
cdata[:,:,3] = np.minimum(ca, calpha)

Image.fromarray(cdata.astype(np.uint8), mode='RGBA').save('public/assets/3d/coins_3d_full.png', 'PNG')
print(f"Created coins_3d_full.png: {cw}x{ch}")
