from PIL import Image

im_or = Image.open('public/assets/3d/full_card_orange.png')
# Trong the cam:
# Text "50 Point" nam o x=30..220, y=80..150
# Dong "Muc tieu rut tien" nam o x=30..300, y=210..240
# Chiec vi va ngoi sao nam o x=245..455, y=30..205
# Chung ta crop rieng phan chiec vi + ngoi sao + dom sang:
wallet_clean = im_or.crop((245, 25, 460, 215))
wallet_clean.save('public/assets/3d/wallet_clean_box.png')
print("Wallet clean box:", wallet_clean.size)

im_wh = Image.open('public/assets/3d/full_card_white.png')
# Trong the trang:
# Text "100.000.000 Credit" nam o x=30..320, y=80..150
# Chiec coin va voucher nam o x=260..455, y=35..215
coins_clean = im_wh.crop((260, 30, 460, 220))
coins_clean.save('public/assets/3d/coins_clean_box.png')
print("Coins clean box:", coins_clean.size)
