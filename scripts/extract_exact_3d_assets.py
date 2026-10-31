import os
from PIL import Image

img1 = Image.open('C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793420038160_3cf361de.png')
img2 = Image.open('C:/Users/Lenovo/.gemini/antigravity/brain/0e728106-673c-444a-bc61-e652cc0dadae/.user_uploaded/media_1793420284942_7dede78e.png')

os.makedirs('public/assets/3d', exist_ok=True)

# 1. Hộp quà 3D cho Thẻ Số Dư (Survey page)
# Khảo sát thẻ trái: x=25..495, y=25..180
# Hộp quà nằm từ x=340 đến 490, y=30 đến 175
gift_left = img1.crop((350, 30, 492, 175))
gift_left.save('public/assets/3d/gift_box_survey.png')

# 2. Hộp quà 3D cho Thẻ Điểm Danh (Survey page)
# Thẻ phải: x=505..975, y=25..180
# Hộp quà nằm từ x=830 đến 970, y=30 đến 175
gift_right = img1.crop((835, 30, 972, 175))
gift_right.save('public/assets/3d/gift_box_streak.png')

# 3. Empty State 3D Clipboard + Magnifier + Clouds
# Empty card: x=25..975, y=320..660
# Clipboard + Magnifier + Cloud + Sparks nằm ở trung tâm:
empty_art = img1.crop((375, 345, 625, 485))
empty_art.save('public/assets/3d/empty_state_3d.png')

# 4. Ví da cam 3D (Thẻ Point - Wallet page)
# Thẻ cam: x=35..510, y=105..300
# Chiếc ví nằm từ x=340 đến 500, y=110 đến 250
wallet_3d = img2.crop((335, 110, 502, 255))
wallet_3d.save('public/assets/3d/wallet_orange_3d.png')

# 5. Chồng coin vàng 3D và Voucher % (Thẻ Credit - Wallet page)
# Thẻ Credit: x=525..990, y=105..300
# Coins + Coupon nằm từ x=810 đến 980, y=115 đến 255
coins_3d = img2.crop((810, 115, 982, 255))
coins_3d.save('public/assets/3d/coins_coupon_3d.png')

print("Assets extracted successfully!")
