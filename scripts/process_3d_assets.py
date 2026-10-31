"""
Asset Processing Pipeline for 3D Graphic Elements
Extracts, denoises, inpaints, and converts to transparent alpha channels
the 4 core 3D assets from original design mockups.
"""

import os
import cv2
import numpy as np
from PIL import Image

SRC_IMG_1 = r"C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793427478588_86adb98b.png"
SRC_IMG_2 = r"C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793427472447_ac119c52.png"

TARGET_DIRS = [
    r"public/assets/3d",
    r"android/app/src/main/assets/public/assets/3d"
]

def ensure_dirs():
    for d in TARGET_DIRS:
        os.makedirs(d, exist_ok=True)

def save_to_all(filename, img_bgra):
    for d in TARGET_DIRS:
        out_path = os.path.join(d, filename)
        cv2.imwrite(out_path, img_bgra)
        print(f"Saved: {out_path} ({img_bgra.shape[1]}x{img_bgra.shape[0]})")

def process_wallet():
    """
    1. wallet_3d_clean.png:
       - 3D orange wallet with curved handle, embossed gold star coin button,
         subtle gold coin watermark behind, sparkling gold stars.
       - 100% removal of '0,5%' and progress bar via precise masking & inpainting.
       - Soft feathering/alpha channel on edges to blend seamlessly into card backgrounds.
    """
    print("--- Processing Asset 1: wallet_3d_clean.png ---")
    im1 = cv2.imread(SRC_IMG_1)
    
    # Crop wallet area with margin
    # x: 260 to 510, y: 75 to 240
    crop = im1[75:240, 260:510].copy()
    h, w, _ = crop.shape
    
    # Inpaint mask for progress bar and '0,5%'
    mask = np.zeros((h, w), dtype=np.uint8)
    mask[140:, 175:245] = 255  # '0,5%' text area
    mask[145:, :180] = 255     # progress bar area
    
    inpainted = cv2.inpaint(crop, mask, 7, cv2.INPAINT_TELEA)
    
    # Take clean region up to y=152 (fully 27px below the star coin bottom)
    clean = inpainted[:152, :].copy()
    ch, cw, _ = clean.shape
    
    # Compute alpha channel with smooth feathering around edges
    alpha = np.ones((ch, cw), dtype=np.float32)
    
    # Left edge feather (fades smoothly from col 0 to 20)
    feather_left = 22
    for c in range(feather_left):
        t = c / float(feather_left)
        smooth_t = t * t * (3.0 - 2.0 * t)
        alpha[:, c] = np.minimum(alpha[:, c], smooth_t)
        
    # Top edge feather (fades smoothly from row 0 to 12)
    feather_top = 12
    for r in range(feather_top):
        t = r / float(feather_top)
        smooth_t = t * t * (3.0 - 2.0 * t)
        alpha[r, :] = np.minimum(alpha[r, :], smooth_t)
        
    # Right edge feather (fades smoothly from cw-12 to cw)
    feather_right = 12
    for i, c in enumerate(range(cw - feather_right, cw)):
        t = 1.0 - (i / float(feather_right))
        smooth_t = t * t * (3.0 - 2.0 * t)
        alpha[:, c] = np.minimum(alpha[:, c], smooth_t)
        
    # Bottom edge feather (fades smoothly over the bottom 18 pixels)
    feather_bottom = 18
    for i, r in enumerate(range(ch - feather_bottom, ch)):
        t = 1.0 - (i / float(feather_bottom))
        smooth_t = t * t * (3.0 - 2.0 * t)
        alpha[r, :] = np.minimum(alpha[r, :], smooth_t)
        
    bgra = np.dstack([clean, (alpha * 255.0).astype(np.uint8)])
    
    save_to_all("wallet_3d_clean.png", bgra)
    save_to_all("wallet_3d_master.png", bgra)

def process_coins_coupon():
    """
    2. coins_coupon_3d_clean.png:
       - 3D stack of coins + orange % coupon ticket with punch holes and white inner % card
       - Sparkling gold stars
       - Transparent alpha background (flood fill + unmixing)
       - 100% removal of '+ Nap Credit' and 'Credit' text.
    """
    print("--- Processing Asset 2: coins_coupon_3d_clean.png ---")
    im1 = cv2.imread(SRC_IMG_1)
    
    # Precise crop of coins & coupon
    # x: 810 to 985, y: 85 to 238
    crop = im1[85:238, 810:985].copy()
    h, w, _ = crop.shape
    
    # Distance from white (255, 255, 255)
    dist_from_white = np.sqrt(
        (255.0 - crop[:, :, 0])**2 + 
        (255.0 - crop[:, :, 1])**2 + 
        (255.0 - crop[:, :, 2])**2
    )
    
    # Identify background candidate connected to image outer boundary
    bg_candidate = (dist_from_white < 35).astype(np.uint8)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(bg_candidate, connectivity=8)
    
    border_labels = set()
    for x in range(w):
        border_labels.add(labels[0, x])
        border_labels.add(labels[h - 1, x])
    for y in range(h):
        border_labels.add(labels[y, 0])
        border_labels.add(labels[y, w - 1])
    border_labels.discard(0)
    
    outer_bg_mask = np.isin(labels, list(border_labels))
    
    # Calculate smooth alpha
    alpha = np.ones((h, w), dtype=np.float32) * 255.0
    t = np.clip((dist_from_white - 4.0) / 30.0, 0.0, 1.0)
    smooth_t = t * t * (3.0 - 2.0 * t)
    alpha[outer_bg_mask] = smooth_t[outer_bg_mask] * 255.0
    
    # Unmix foreground against white background to eliminate white halos
    a_norm = np.clip(alpha / 255.0, 0.001, 1.0)[:, :, None]
    unmixed = np.clip((crop.astype(np.float32) - (1.0 - a_norm) * 255.0) / a_norm, 0, 255).astype(np.uint8)
    
    bgra = np.zeros((h, w, 4), dtype=np.uint8)
    bgra[:, :, :3] = unmixed
    bgra[:, :, 3] = alpha.astype(np.uint8)
    
    save_to_all("coins_coupon_3d_clean.png", bgra)
    save_to_all("coins_coupon_3d_master.png", bgra)

def process_empty_state():
    """
    3. empty_state_3d_clean.png:
       - 3D orange clipboard with white border + metal clip + checklist
       - 3D shiny magnifying glass with reflections
       - Fluffy cream clouds + 3 orange sun rays
       - Transparent alpha background
       - 100% removal of 'Khong tim thay khao sat...' text and filter reset button.
    """
    print("--- Processing Asset 3: empty_state_3d_clean.png ---")
    im2 = cv2.imread(SRC_IMG_2)
    
    # Precise crop of empty state graphic
    # x: 370 to 630, y: 340 to 488
    crop = im2[340:488, 370:630].copy()
    h, w, _ = crop.shape
    
    # Distance from white
    dist_from_white = np.sqrt(
        (255.0 - crop[:, :, 0])**2 + 
        (255.0 - crop[:, :, 1])**2 + 
        (255.0 - crop[:, :, 2])**2
    )
    
    bg_candidate = (dist_from_white < 30).astype(np.uint8)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(bg_candidate, connectivity=8)
    
    border_labels = set()
    for x in range(w):
        border_labels.add(labels[0, x])
        border_labels.add(labels[h - 1, x])
    for y in range(h):
        border_labels.add(labels[y, 0])
        border_labels.add(labels[y, w - 1])
    border_labels.discard(0)
    
    outer_bg_mask = np.isin(labels, list(border_labels))
    
    alpha = np.ones((h, w), dtype=np.float32) * 255.0
    t = np.clip((dist_from_white - 3.0) / 25.0, 0.0, 1.0)
    smooth_t = t * t * (3.0 - 2.0 * t)
    alpha[outer_bg_mask] = smooth_t[outer_bg_mask] * 255.0
    
    a_norm = np.clip(alpha / 255.0, 0.001, 1.0)[:, :, None]
    unmixed = np.clip((crop.astype(np.float32) - (1.0 - a_norm) * 255.0) / a_norm, 0, 255).astype(np.uint8)
    
    bgra = np.zeros((h, w, 4), dtype=np.uint8)
    bgra[:, :, :3] = unmixed
    bgra[:, :, 3] = alpha.astype(np.uint8)
    
    save_to_all("empty_state_3d_clean.png", bgra)
    save_to_all("empty_state_3d_master.png", bgra)

def process_gift_box():
    """
    4. gift_box_pastel_clean.png:
       - 3D pastel orange gift box watermark from 'So du tich luy' card
       - Bow, knot, lid, vertical ribbon, and box body
       - 100% removal of '1%' text, progress bar, and card text
       - Transparent alpha background with anti-aliasing.
    """
    print("--- Processing Asset 4: gift_box_pastel_clean.png ---")
    im2 = cv2.imread(SRC_IMG_2)
    
    # Raw crop from card 1: x: 340 to 500, y: 55 to 175
    crop = im2[55:175, 340:500].copy()
    h, w, _ = crop.shape
    
    # Inpaint '1%' red text
    b, g, r = cv2.split(crop)
    red_mask = (r > 200) & (g < 140) & (b < 100)
    kernel = np.ones((3, 3), np.uint8)
    red_mask_dilated = cv2.dilate(red_mask.astype(np.uint8), kernel, iterations=2)
    inpainted = cv2.inpaint(crop, red_mask_dilated, 3, cv2.INPAINT_TELEA)
    
    # Inpaint progress bar and top text
    mask_bar = np.zeros((h, w), dtype=np.uint8)
    mask_bar[97:114, :] = 255
    mask_bar[:12, :] = 255
    inpainted_2 = cv2.inpaint(inpainted, mask_bar, 5, cv2.INPAINT_TELEA)
    
    # Restore vertical ribbon and body geometry
    for row in range(97, 114):
        inpainted_2[row, 76:155] = inpainted_2[90, 76:155]
        
    # Crop the exact gift box region: x: 70 to 160, y: 15 to 118
    box_crop = inpainted_2[15:118, 70:160].copy()
    bh, bw, _ = box_crop.shape
    
    # Generate sub-pixel anti-aliased mask at 4x resolution
    scale = 4
    H, W = bh * scale, bw * scale
    mask_hi = np.zeros((H, W), dtype=np.uint8)
    
    # Left bow loop
    cv2.ellipse(mask_hi, (int(34 * scale), int(15 * scale)), (int(16 * scale), int(12 * scale)), -25, 0, 360, 255, -1)
    # Right bow loop
    cv2.ellipse(mask_hi, (int(64 * scale), int(14 * scale)), (int(17 * scale), int(12 * scale)), 25, 0, 360, 255, -1)
    # Center knot
    cv2.circle(mask_hi, (int(49 * scale), int(23 * scale)), int(7 * scale), 255, -1)
    
    # Lid rounded rect
    x1, y1, x2, y2 = int(4 * scale), int(27 * scale), int(88 * scale), int(47 * scale)
    lr = int(5 * scale)
    cv2.rectangle(mask_hi, (x1 + lr, y1), (x2 - lr, y2), 255, -1)
    cv2.rectangle(mask_hi, (x1, y1 + lr), (x2, y2 - lr), 255, -1)
    cv2.circle(mask_hi, (x1 + lr, y1 + lr), lr, 255, -1)
    cv2.circle(mask_hi, (x2 - lr, y1 + lr), lr, 255, -1)
    cv2.circle(mask_hi, (x1 + lr, y2 - lr), lr, 255, -1)
    cv2.circle(mask_hi, (x2 - lr, y2 - lr), lr, 255, -1)
    
    # Body rounded rect
    bx1, by1, bx2, by2 = int(8 * scale), int(47 * scale), int(84 * scale), int(100 * scale)
    br = int(4 * scale)
    cv2.rectangle(mask_hi, (bx1 + br, by1), (bx2 - br, by2), 255, -1)
    cv2.rectangle(mask_hi, (bx1, by1 + br), (bx2, by2 - br), 255, -1)
    cv2.circle(mask_hi, (bx1 + br, by1 + br), br, 255, -1)
    cv2.circle(mask_hi, (bx2 - br, by1 + br), br, 255, -1)
    cv2.circle(mask_hi, (bx1 + br, by2 - br), br, 255, -1)
    cv2.circle(mask_hi, (bx2 - br, by2 - br), br, 255, -1)
    
    mask_aa = cv2.resize(mask_hi, (bw, bh), interpolation=cv2.INTER_AREA)
    
    # Add subtle ambient occlusion under the lid on the box body
    ao = np.ones((bh, bw), dtype=np.float32)
    for r_idx in range(47, 53):
        ao[r_idx, 10:82] = 0.92 + 0.08 * ((r_idx - 47) / 6.0)
    shaded_crop = np.clip(box_crop.astype(np.float32) * ao[:, :, None], 0, 255).astype(np.uint8)
    
    bgra = np.zeros((bh, bw, 4), dtype=np.uint8)
    bgra[:, :, :3] = shaded_crop
    bgra[:, :, 3] = mask_aa
    
    save_to_all("gift_box_pastel_clean.png", bgra)
    save_to_all("gift_box_3d_master.png", bgra)

def main():
    ensure_dirs()
    process_wallet()
    process_coins_coupon()
    process_empty_state()
    process_gift_box()
    print("ALL 4 3D ASSETS PROCESSED AND SAVED SUCCESSFULLY.")

if __name__ == "__main__":
    main()
