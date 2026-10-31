import os
import cv2
import numpy as np
from PIL import Image, ImageFilter

def make_coins_coupon():
    # Đọc từ full_card_credit gốc
    im = Image.open('scripts/full_card_credit.png').convert('RGBA')
    # Vùng chồng coin và voucher: x từ 235 đến 455, y từ 20 đến 235
    crop = im.crop((235, 20, 455, 235))
    arr = np.array(crop).astype(np.float32)
    h, w = arr.shape[:2]

    # Nhận diện nền ngoài bằng floodfill từ 4 cạnh
    gray = cv2.cvtColor(arr[:,:,:3].astype(np.uint8), cv2.COLOR_RGB2GRAY)
    mask = np.zeros((h+2, w+2), np.uint8)

    # Floodfill với ngưỡng dung sai màu trắng
    for start in [(0,0), (w-1, 0), (0, h-1), (w-1, h-1), (w//2, 0), (0, h//2), (w-1, h//2)]:
        if gray[start[1], start[0]] > 220:
            cv2.floodFill(gray, mask, start, 0, 18, 18, flags=4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)

    bg_mask = mask[1:-1, 1:-1] == 255

    # Tính khoảng cách từ mỗi pixel tới nền trắng ngoài
    # Dilate mask để tìm vùng chuyển tiếp
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    bg_dilated = cv2.dilate(bg_mask.astype(np.uint8), kernel)
    edge_zone = (bg_dilated == 1) & (~bg_mask)

    # Alpha ban đầu: 255 ở trong, 0 ở ngoài
    alpha = np.ones((h, w), dtype=np.float32) * 255.0
    alpha[bg_mask] = 0.0

    # Tại vùng biên: tính alpha theo độ bão hòa màu và độ lệch khỏi màu trắng 255
    # Pixel càng trắng thì alpha càng thấp
    for y in range(h):
        for x in range(w):
            if bg_mask[y, x]:
                arr[y, x, 3] = 0
            elif edge_zone[y, x]:
                r, g, b = arr[y, x, 0], arr[y, x, 1], arr[y, x, 2]
                brightness = (r + g + b) / 3.0
                if brightness > 230:
                    a = max(0.0, min(255.0, (255.0 - brightness) * 10.0))
                    arr[y, x, 3] = a
                else:
                    arr[y, x, 3] = 255.0

    # Khử quầng trắng (Defringing): với pixel bán trong suốt, màu trắng nền bị trừ ra
    for c in range(3):
        a_norm = arr[:,:,3] / 255.0
        # Nếu a_norm < 1 và a_norm > 0:
        mask_trans = (a_norm > 0.05) & (a_norm < 0.95)
        # Unmix: Color = (Observed - (1-a)*255) / a
        arr[mask_trans, c] = np.clip((arr[mask_trans, c] - (1.0 - a_norm[mask_trans]) * 255.0) / a_norm[mask_trans], 0, 255)

    # Cắt gọn bounding box
    alpha_ch = arr[:,:,3].astype(np.uint8)
    ys, xs = np.where(alpha_ch > 10)
    if len(xs) > 0:
        min_x, max_x = max(0, xs.min() - 4), min(w, xs.max() + 5)
        min_y, max_y = max(0, ys.min() - 4), min(h, ys.max() + 5)
        arr = arr[min_y:max_y, min_x:max_x]

    res = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    return res

def make_wallet():
    # Đọc từ full_card_point gốc
    im = Image.open('scripts/full_card_point.png').convert('RGBA')
    # Vùng chiếc ví: x từ 260 đến 475, y từ 20 đến 180
    crop = im.crop((260, 20, 475, 180))
    arr = np.array(crop).astype(np.float32)
    h, w = arr.shape[:2]

    # Chiếc ví có màu da cam sáng / vàng cam: R > 230, G trong khoảng 130..215, B trong khoảng 50..120
    # Nền xung quanh chiếc ví là màu cam gradient của thẻ: R ~ 240..255, G ~ 80..100, B ~ 0..20
    # Ta tách riêng chiếc ví + cúc sao + quai + các ngôi sao vàng!
    # Điểm khác biệt lớn giữa chiếc ví và nền cam: G và B của chiếc ví cao hơn hẳn nền cam!
    # Nền cam: G < 110, B < 30.
    # Chiếc ví: G >= 120, B >= 40.
    # Cúc sao: R > 240, G > 200, B > 100.
    # Đồng xu vàng mờ phía sau: G > 115, B > 35.

    # Tạo mask của chiếc ví và các phần tử nổi
    wallet_element = (arr[:,:,1] >= 115) | (arr[:,:,2] >= 35)

    # Loại bỏ các đốm lẻ tẻ hoặc số 0.5% ở đáy nếu có
    # Số 0,5% và thanh bar đã bị cắt ngoài vùng y < 180
    # Dilate nhẹ để giữ trọn vẹn viền ví
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    wallet_mask = cv2.dilate(wallet_element.astype(np.uint8), kernel)
    # Smooth viền
    wallet_mask = cv2.GaussianBlur(wallet_mask.astype(np.float32) * 255.0, (5, 5), 1.5)

    # Đặt alpha = wallet_mask
    arr[:,:,3] = np.clip(wallet_mask, 0, 255)

    # Cắt gọn bounding box
    ys, xs = np.where(arr[:,:,3] > 10)
    if len(xs) > 0:
        min_x, max_x = max(0, xs.min() - 4), min(w, xs.max() + 5)
        min_y, max_y = max(0, ys.min() - 4), min(h, ys.max() + 5)
        arr = arr[min_y:max_y, min_x:max_x]

    res = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    # Tăng kích thước ví lên khoảng 1.25x theo yêu cầu người dùng
    new_w = int(res.width * 1.25)
    new_h = int(res.height * 1.25)
    res = res.resize((new_w, new_h), Image.Resampling.LANCZOS)
    return res

def make_gift_box():
    # Đọc từ full_card_bal gốc
    im = Image.open('scripts/full_card_bal.png').convert('RGBA')
    # Hộp quà nằm ở góc phải: x từ 350 đến 475, y từ 60 đến 180
    crop = im.crop((350, 60, 475, 180))
    arr = np.array(crop).astype(np.float32)
    h, w = arr.shape[:2]

    # Hộp quà có màu cam pastel (R ~ 245..255, G ~ 180..225, B ~ 150..205)
    # Nền là màu trắng thuần (R ~ 255, G ~ 255, B ~ 255)
    # Ta tách riêng hộp quà: những pixel có màu cam pastel (G < 245 hoặc B < 240)
    # và loại bỏ hoàn toàn pixel nền trắng
    diff_from_white = 255.0 - (arr[:,:,0] + arr[:,:,1] + arr[:,:,2]) / 3.0
    # Ngưỡng: diff > 4 là thuộc hộp quà
    gift_alpha = np.clip((diff_from_white - 3.0) * 12.0, 0, 255).astype(np.uint8)

    # Smooth viền
    gift_alpha = cv2.GaussianBlur(gift_alpha.astype(np.float32), (3, 3), 0.8)
    arr[:,:,3] = gift_alpha

    # Unmix màu trắng
    a_norm = arr[:,:,3] / 255.0
    mask_trans = (a_norm > 0.05) & (a_norm < 0.95)
    for c in range(3):
        arr[mask_trans, c] = np.clip((arr[mask_trans, c] - (1.0 - a_norm[mask_trans]) * 255.0) / a_norm[mask_trans], 0, 255)

    ys, xs = np.where(arr[:,:,3] > 10)
    if len(xs) > 0:
        min_x, max_x = max(0, xs.min() - 2), min(w, xs.max() + 3)
        min_y, max_y = max(0, ys.min() - 2), min(h, ys.max() + 3)
        arr = arr[min_y:max_y, min_x:max_x]

    res = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    return res

def make_empty_state():
    im = Image.open('scripts/full_empty.png').convert('RGBA')
    # Bảng kẹp, kính lúp và mây: x từ 350 đến 635, y từ 40 đến 185
    crop = im.crop((350, 40, 635, 185))
    arr = np.array(crop).astype(np.float32)
    h, w = arr.shape[:2]

    # Nền ngoài là màu trắng xám nhạt (R, G, B > 248)
    gray = cv2.cvtColor(arr[:,:,:3].astype(np.uint8), cv2.COLOR_RGB2GRAY)
    mask = np.zeros((h+2, w+2), np.uint8)

    for start in [(0,0), (w-1, 0), (0, h-1), (w-1, h-1), (w//2, 0), (0, h//2), (w-1, h//2)]:
        if gray[start[1], start[0]] > 235:
            cv2.floodFill(gray, mask, start, 0, 15, 15, flags=4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)

    bg_mask = mask[1:-1, 1:-1] == 255
    arr[bg_mask, 3] = 0

    # Với vùng chuyển tiếp:
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    bg_dilated = cv2.dilate(bg_mask.astype(np.uint8), kernel)
    edge_zone = (bg_dilated == 1) & (~bg_mask)

    for y in range(h):
        for x in range(w):
            if edge_zone[y, x]:
                b = (arr[y,x,0] + arr[y,x,1] + arr[y,x,2]) / 3.0
                if b > 235:
                    arr[y, x, 3] = max(0.0, (255.0 - b) * 12.0)

    ys, xs = np.where(arr[:,:,3] > 10)
    if len(xs) > 0:
        min_x, max_x = max(0, xs.min() - 4), min(w, xs.max() + 5)
        min_y, max_y = max(0, ys.min() - 4), min(h, ys.max() + 5)
        arr = arr[min_y:max_y, min_x:max_x]

    res = Image.fromarray(arr.astype(np.uint8), 'RGBA')
    return res

os.makedirs('public/assets/3d', exist_ok=True)
os.makedirs('android/app/src/main/assets/public/assets/3d', exist_ok=True)

# Tạo và lưu các file
coins = make_coins_coupon()
coins.save('public/assets/3d/coins_coupon_3d_master.png')
coins.save('public/assets/3d/coins_coupon_3d_clean.png')
coins.save('android/app/src/main/assets/public/assets/3d/coins_coupon_3d_master.png')
coins.save('android/app/src/main/assets/public/assets/3d/coins_coupon_3d_clean.png')
print('Coins coupon saved:', coins.size)

wallet = make_wallet()
wallet.save('public/assets/3d/wallet_3d_master.png')
wallet.save('public/assets/3d/wallet_3d_clean.png')
wallet.save('android/app/src/main/assets/public/assets/3d/wallet_3d_master.png')
wallet.save('android/app/src/main/assets/public/assets/3d/wallet_3d_clean.png')
print('Wallet saved:', wallet.size)

gift = make_gift_box()
gift.save('public/assets/3d/gift_box_3d_master.png')
gift.save('public/assets/3d/gift_box_pastel_clean.png')
gift.save('android/app/src/main/assets/public/assets/3d/gift_box_3d_master.png')
gift.save('android/app/src/main/assets/public/assets/3d/gift_box_pastel_clean.png')
print('Gift box saved:', gift.size)

empty = make_empty_state()
empty.save('public/assets/3d/empty_state_3d_master.png')
empty.save('public/assets/3d/empty_state_3d_clean.png')
empty.save('android/app/src/main/assets/public/assets/3d/empty_state_3d_master.png')
empty.save('android/app/src/main/assets/public/assets/3d/empty_state_3d_clean.png')
print('Empty state saved:', empty.size)

print('All 4 transparent 3D assets generated successfully.')
