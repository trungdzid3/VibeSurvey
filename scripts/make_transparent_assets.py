import numpy as np
from PIL import Image

def make_white_transparent(src_path, dst_path, threshold=248, soft_range=20):
    """Chuyen nen trang (RGB gan 255) thanh trong suot mot cach muot ma khong bi rang cua."""
    im = Image.open(src_path).convert('RGBA')
    data = np.array(im, dtype=np.float32)
    
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Do trang: trung binh RGB
    whiteness = (r + g + b) / 3.0
    
    # Tinh toan do duc (alpha):
    # Neu whiteness >= threshold + soft_range => alpha = 0 (trong suot hoan toan)
    # Neu whiteness <= threshold => alpha giu nguyen (255)
    # O giua: noi suy tuyen tinh
    alpha = np.clip((threshold + soft_range - whiteness) / soft_range * 255.0, 0, 255)
    
    data[:,:,3] = np.minimum(a, alpha)
    
    result = Image.fromarray(data.astype(np.uint8), mode='RGBA')
    result.save(dst_path, 'PNG')
    print(f"Created transparent asset: {dst_path}")

# Xu ly cho Empty State
make_white_transparent('public/assets/3d/empty_state_3d.png', 'public/assets/3d/empty_state_3d_clean.png', threshold=242, soft_range=12)

# Xu ly cho Hop Qua (Survey & Streak)
make_white_transparent('public/assets/3d/gift_box_survey.png', 'public/assets/3d/gift_box_survey_clean.png', threshold=240, soft_range=14)
make_white_transparent('public/assets/3d/gift_box_streak.png', 'public/assets/3d/gift_box_streak_clean.png', threshold=240, soft_range=14)

# Xu ly cho Coins & Coupon (Thẻ Credit)
make_white_transparent('public/assets/3d/coins_coupon_3d.png', 'public/assets/3d/coins_coupon_3d_clean.png', threshold=242, soft_range=12)

print("Tat ca cac asset nen trang da duoc tach nen trong suot hoan hao!")
