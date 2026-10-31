from PIL import Image
import numpy as np
import os

def isolate_white_background(img_path, output_path, tolerance=15, feather=3):
    img = Image.open(img_path).convert('RGB')
    arr = np.array(img, dtype=np.float32)
    h, w = arr.shape[:2]
    
    # Do lech khoi mau trang tinh (255, 255, 255)
    # Background trang: R > 245, G > 245, B > 245
    diff = 255.0 - np.minimum(arr[:,:,0], np.minimum(arr[:,:,1], arr[:,:,2]))
    
    # Alpha mask:
    # Neu diff < 6: hoan toan trong suot (alpha = 0)
    # Neu diff tu 6 den 30: alpha tang tuyen tinh tu 0 den 255
    alpha = np.clip((diff - 6.0) / 24.0 * 255.0, 0, 255)
    
    # Auto-crop bounding box cua vat the
    non_empty = alpha > 10
    y_indices, x_indices = np.where(non_empty)
    if len(y_indices) > 0 and len(x_indices) > 0:
        ymin, ymax = max(0, y_indices.min() - 10), min(h, y_indices.max() + 10)
        xmin, xmax = max(0, x_indices.min() - 10), min(w, x_indices.max() + 10)
        arr = arr[ymin:ymax, xmin:xmax]
        alpha = alpha[ymin:ymax, xmin:xmax]
    
    out_arr = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    out_arr[:, :, :3] = np.clip(arr, 0, 255).astype(np.uint8)
    out_arr[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    
    out_img = Image.fromarray(out_arr, mode='RGBA')
    out_img.save(output_path, 'PNG')
    print(f'Processed {os.path.basename(img_path)} -> {output_path} (Size: {out_img.size})')

base_dir = r'C:\Users\Lenovo\.gemini\antigravity\brain\0e728106-673c-444a-bc61-e652cc0dadae'

# 1. Chiec vi da 3D
isolate_white_background(
    os.path.join(base_dir, 'orange_wallet_icon_1793426644526.jpg'),
    'public/assets/3d/wallet_3d_master.png'
)

# 2. Chong coin va coupon %
isolate_white_background(
    os.path.join(base_dir, 'gold_coins_discount_coupon_3d_icon_1793426665238.jpg'),
    'public/assets/3d/coins_coupon_3d_master.png'
)

# 3. Empty state
isolate_white_background(
    os.path.join(base_dir, 'empty_state_clipboard_magnifier_1793426682526.jpg'),
    'public/assets/3d/empty_state_3d_master.png'
)

# 4. Hop qua cam pastel
isolate_white_background(
    os.path.join(base_dir, 'pastel_orange_gift_box_1793426700220.jpg'),
    'public/assets/3d/gift_box_3d_master.png'
)
