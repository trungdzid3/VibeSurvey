from PIL import Image

def inspect_image_content(path):
    im = Image.open(path)
    print(f"File: {path}, size={im.size}, mode={im.mode}")

inspect_image_content('public/assets/3d/gift_box_survey.png')
inspect_image_content('public/assets/3d/gift_box_streak.png')
inspect_image_content('public/assets/3d/empty_state_3d.png')
inspect_image_content('public/assets/3d/wallet_orange_3d.png')
inspect_image_content('public/assets/3d/coins_coupon_3d.png')
