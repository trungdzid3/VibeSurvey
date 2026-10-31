import numpy as np
from PIL import Image

im = Image.open('public/assets/3d/wallet_orange_3d.png').convert('RGBA')
data = np.array(im, dtype=np.float32)
w, h = im.size

# Mau nen gradient cam cua the o 4 goc:
# Goc tren trai: (253, 126, 25), Goc duoi phai: (243, 93, 7)
# Chiec vi da cam va ngoi sao vang co mau sac khac biet:
# Chiec vi co nắp gập mau vang cam nhat (254, 185, 120), ngoi sao vang ruc (254, 218, 60), cúc ví (255, 230, 150)
# Phan than vi co vien bong do mau cam dam (215, 80, 5)

# Thu tinh khoang cach mau so voi mau nen xung quanh:
# O goc tren phai va goc tren trai la nen the
# Ta co the su dung thuat toan flood-fill hoac chroma keying dua vao mau nen:
# Nền thẻ có độ bão hòa cao và tông màu đặc trưng: R ~ 240-255, G ~ 90-130, B ~ 10-35
# Chiếc ví có ánh sáng 3D và highlight rõ rệt.

# De an toan va dep nhat, ta co the tao mask dua vao su chenh lech mau:
# Hoac chiec vi co the dung blend mode:
# Khi the co nen tuong tu, anh wallet_orange_3d.png co the duoc xep tron ven vao goc phai cua the!
# Kiem tra xem neu dung border-radius va mask gradient mo dan sang ben trai thi the nao:
alpha_mask = np.ones((h, w), dtype=np.float32) * 255.0

# Mo dan o mep trai (x: 0 -> 40) de hoa quyen muot ma voi nen the
for x in range(min(50, w)):
    alpha_mask[:, x] = (x / 50.0) * 255.0

# Mo dan o mep tren va mep duoi
for y in range(min(20, h)):
    alpha_mask[y, :] = np.minimum(alpha_mask[y, :], (y / 20.0) * 255.0)
for y in range(max(0, h - 20), h):
    alpha_mask[y, :] = np.minimum(alpha_mask[y, :], ((h - 1 - y) / 20.0) * 255.0)

data[:, :, 3] = np.minimum(data[:, :, 3], alpha_mask)

result = Image.fromarray(data.astype(np.uint8), mode='RGBA')
result.save('public/assets/3d/wallet_orange_3d_feathered.png', 'PNG')
print("Da tao wallet_orange_3d_feathered.png hoa quyen hoan hao voi the cam!")
