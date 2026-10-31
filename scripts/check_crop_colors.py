from PIL import Image

def analyze_crop(filename):
    im = Image.open(filename).convert('RGB')
    w, h = im.size
    # Kiem tra mau 4 goc
    corners = [im.getpixel((0,0)), im.getpixel((w-1, 0)), im.getpixel((0, h-1)), im.getpixel((w-1, h-1))]
    print(f"{filename}: size={w}x{h}, corners={corners}")

analyze_crop('public/assets/test_crop_gift1.png')
analyze_crop('public/assets/test_crop_empty.png')
analyze_crop('public/assets/test_crop_wallet.png')
analyze_crop('public/assets/test_crop_coins.png')
