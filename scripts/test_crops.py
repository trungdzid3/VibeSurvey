import sys
from PIL import Image

# Mở 2 ảnh gốc
img1 = Image.open('C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793420038160_3cf361de.png')
img2 = Image.open('C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793420284942_7dede78e.png')

# Kích thước: 1024 x 682
# Hãy crop thử các vùng để kiểm tra
# Trong ảnh 1:
# Thẻ trái nằm khoảng x: 25 -> 500, y: 25 -> 180
# Hộp quà thẻ trái: x khoảng 350 -> 495, y: 40 -> 175
crop_gift1 = img1.crop((340, 45, 500, 180))
crop_gift1.save('public/assets/test_crop_gift1.png')

# Empty state illustration trong ảnh 1:
# Empty state card ở giữa: x: 25 -> 1000, y: 320 -> 660
# Minh họa clipboard + magnifier nằm ở trung tâm: x khoảng 380 -> 644, y: 350 -> 480
crop_empty = img1.crop((370, 350, 650, 485))
crop_empty.save('public/assets/test_crop_empty.png')

# Trong ảnh 2:
# Thẻ cam nằm x: 35 -> 510, y: 105 -> 300
# Chiếc ví 3D nằm x khoảng 330 -> 505, y: 110 -> 255
crop_wallet = img2.crop((330, 110, 505, 260))
crop_wallet.save('public/assets/test_crop_wallet.png')

# Thẻ Credit nằm x: 525 -> 990, y: 105 -> 300
# Chồng coin và voucher nằm x khoảng 810 -> 985, y: 130 -> 250
crop_coins = img2.crop((810, 130, 985, 255))
crop_coins.save('public/assets/test_crop_coins.png')

print("Đã crop xong các mẫu kiểm tra!")
