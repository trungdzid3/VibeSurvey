const voucherService = require('../server/services/voucherService');
const db = require('../server/db/database');

const defaultCatalogs = [
  {
    id: 'cat_phuclong_30k',
    brand_name: 'Phúc Long',
    brand_logo: '🧋',
    title: 'Giảm 30K Trà Sữa Phúc Long Tea & Coffee',
    face_value_vnd: 30000,
    points_cost: 3000,
    total_quantity: 30,
    instructions: 'Áp dụng tại tất cả cửa hàng Phúc Long trên toàn quốc hoặc đặt hàng qua hotline/app.',
    expiry_date: '2026-12-31',
    prefix: 'PHUCLONG30'
  },
  {
    id: 'cat_cgv_100k',
    brand_name: 'CGV Cinemas',
    brand_logo: '🍿',
    title: 'Vé Xem Phim CGV 100K 2D',
    face_value_vnd: 100000,
    points_cost: 10000,
    total_quantity: 20,
    instructions: 'Đổi vé trên ứng dụng CGV Cinemas hoặc đưa mã cho nhân viên bán vé tại rạp.',
    expiry_date: '2026-12-31',
    prefix: 'CGVCINE100'
  },
  {
    id: 'cat_starbucks_100k',
    brand_name: 'Starbucks',
    brand_logo: '⭐',
    title: 'E-Voucher Starbucks 100K',
    face_value_vnd: 100000,
    points_cost: 10000,
    total_quantity: 20,
    instructions: 'Xuất trình mã e-voucher khi thanh toán tại mọi chi nhánh Starbucks Coffee tại Việt Nam.',
    expiry_date: '2026-12-31',
    prefix: 'SBUX100K'
  }
];

const crypto = require('crypto');
const check = db.prepare("SELECT id FROM voucher_campaigns WHERE brand_name = ?");
const ins = db.prepare(`
  INSERT INTO voucher_campaigns (
    id, issuer_id, voucher_type, brand_name, brand_logo, title, 
    face_value_vnd, points_cost, total_quantity, remaining_quantity, 
    expiry_date, instructions
  ) VALUES (?, NULL, 'PLATFORM_CATALOG', ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insCode = db.prepare(`INSERT INTO voucher_codes (id, campaign_id, code, status) VALUES (?, ?, ?, 'AVAILABLE')`);

defaultCatalogs.forEach(c => {
  if (!check.get(c.brand_name)) {
    ins.run(c.id, c.brand_name, c.brand_logo, c.title, c.face_value_vnd, c.points_cost, c.total_quantity, c.total_quantity, c.expiry_date, c.instructions);
    for (let i = 0; i < c.total_quantity; i++) {
      insCode.run('vc_' + crypto.randomUUID(), c.id, `${c.prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`);
    }
    console.log('Đã thêm voucher:', c.brand_name);
  }
});

const all = db.prepare("SELECT brand_name, title, points_cost, remaining_quantity FROM voucher_campaigns WHERE voucher_type = 'PLATFORM_CATALOG'").all();
console.log('Tổng danh sách catalog:', all);
