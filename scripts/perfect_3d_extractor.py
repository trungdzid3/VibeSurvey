from PIL import Image
import numpy as np
import os

os.makedirs('public/assets/3d', exist_ok=True)

# 1. TRICH XUAT TU ANH VI GOC
im_wallet_ref = Image.open('C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793425219129_c3de0f08.png').convert('RGBA')

# --- CHIEC VI 3D MAU CAM ---
# Toa do x: 355..495, y: 135..295 (Chi co chiec vi, cuc sao vang, quai xach, hoan toan 0% chu)
wallet_crop = im_wallet_ref.crop((355, 135, 495, 295))
w_arr = np.array(wallet_crop, dtype=np.float32)
wh, ww = w_arr.shape[:2]

# Tao mask feathering nhe 8px o 4 mep de hoa quyen em ai vao nen gradient cam
w_mask = np.ones((wh, ww), dtype=np.float32) * 255.0
for x in range(8):
    w_mask[:, x] = np.minimum(w_mask[:, x], (x / 8.0) * 255.0)
    w_mask[:, ww - 1 - x] = np.minimum(w_mask[:, ww - 1 - x], (x / 8.0) * 255.0)
for y in range(8):
    w_mask[y, :] = np.minimum(w_mask[y, :], (y / 8.0) * 255.0)
    w_mask[wh - 1 - y, :] = np.minimum(w_mask[wh - 1 - y, :], (y / 8.0) * 255.0)

w_arr[:, :, 3] = w_mask
Image.fromarray(w_arr.astype(np.uint8), mode='RGBA').save('public/assets/3d/wallet_3d_clean.png', 'PNG')
print(f'wallet_3d_clean.png saved: {ww}x{wh}')

# --- CHONG TIEN XU VA VE COUPON % ---
# Toa do x: 800..975, y: 135..330 (Chi co chong xu va coupon %, 0% chu)
coins_crop = im_wallet_ref.crop((800, 135, 975, 330))
c_arr = np.array(coins_crop, dtype=np.float32)
ch, cw = c_arr.shape[:2]

# Tach nen trang sang trong suot
# Nen trang co R, G, B > 248
min_rgb = np.minimum(c_arr[:,:,0], np.minimum(c_arr[:,:,1], c_arr[:,:,2]))
c_alpha = np.clip((250 - min_rgb) / 10.0 * 255.0, 0, 255)

# Mask feathering 6px o vien ngoai
c_mask = np.ones((ch, cw), dtype=np.float32) * 255.0
for x in range(6):
    c_mask[:, x] = np.minimum(c_mask[:, x], (x / 6.0) * 255.0)
    c_mask[:, cw - 1 - x] = np.minimum(c_mask[:, cw - 1 - x], (x / 6.0) * 255.0)
for y in range(6):
    c_mask[y, :] = np.minimum(c_mask[y, :], (y / 6.0) * 255.0)
    c_mask[ch - 1 - y, :] = np.minimum(c_mask[ch - 1 - y, :], (y / 6.0) * 255.0)

c_arr[:, :, 3] = np.minimum(c_alpha, c_mask)
Image.fromarray(c_arr.astype(np.uint8), mode='RGBA').save('public/assets/3d/coins_coupon_3d_clean.png', 'PNG')
print(f'coins_coupon_3d_clean.png saved: {cw}x{ch}')


# 2. TRICH XUAT TU ANH KHAO SAT GOC
im_survey_ref = Image.open('C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793425225682_ecb24a83.png').convert('RGBA')

# --- EMPTY STATE: BANG KEP TAI LIEU & KINH LUP 3D ---
# Toa do x: 380..640, y: 510..680
empty_crop = im_survey_ref.crop((380, 510, 640, 680))
e_arr = np.array(empty_crop, dtype=np.float32)
eh, ew = e_arr.shape[:2]

# Tach nen trang sang trong suot
emin_rgb = np.minimum(e_arr[:,:,0], np.minimum(e_arr[:,:,1], e_arr[:,:,2]))
e_alpha = np.clip((250 - emin_rgb) / 10.0 * 255.0, 0, 255)

e_mask = np.ones((eh, ew), dtype=np.float32) * 255.0
for x in range(6):
    e_mask[:, x] = np.minimum(e_mask[:, x], (x / 6.0) * 255.0)
    e_mask[:, ew - 1 - x] = np.minimum(e_mask[:, ew - 1 - x], (x / 6.0) * 255.0)
for y in range(6):
    e_mask[y, :] = np.minimum(e_mask[y, :], (y / 6.0) * 255.0)
    e_mask[eh - 1 - y, :] = np.minimum(e_mask[eh - 1 - y, :], (y / 6.0) * 255.0)

e_arr[:, :, 3] = np.minimum(e_alpha, e_mask)
Image.fromarray(e_arr.astype(np.uint8), mode='RGBA').save('public/assets/3d/empty_state_3d_clean.png', 'PNG')
print(f'empty_state_3d_clean.png saved: {ew}x{eh}')

# --- HOP QUA CAM PASTEL NEN CHIM ---
# Toa do x: 350..485, y: 95..245
gift_crop = im_survey_ref.crop((350, 95, 485, 245))
g_arr = np.array(gift_crop, dtype=np.float32)
gh, gw = g_arr.shape[:2]

# Tach nen trang sang trong suot
gmin_rgb = np.minimum(g_arr[:,:,0], np.minimum(g_arr[:,:,1], g_arr[:,:,2]))
g_alpha = np.clip((252 - gmin_rgb) / 12.0 * 255.0, 0, 255)

g_mask = np.ones((gh, gw), dtype=np.float32) * 255.0
for x in range(8):
    g_mask[:, x] = np.minimum(g_mask[:, x], (x / 8.0) * 255.0)
    g_mask[:, gw - 1 - x] = np.minimum(g_mask[:, gw - 1 - x], (x / 8.0) * 255.0)
for y in range(8):
    g_mask[y, :] = np.minimum(g_mask[y, :], (y / 8.0) * 255.0)
    g_mask[gh - 1 - y, :] = np.minimum(g_mask[gh - 1 - y, :], (y / 8.0) * 255.0)

g_arr[:, :, 3] = np.minimum(g_alpha, g_mask)
Image.fromarray(g_arr.astype(np.uint8), mode='RGBA').save('public/assets/3d/gift_box_pastel_clean.png', 'PNG')
print(f'gift_box_pastel_clean.png saved: {gw}x{gh}')
