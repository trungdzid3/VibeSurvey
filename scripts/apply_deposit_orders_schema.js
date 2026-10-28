const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../server/db/database.js');
let content = fs.readFileSync(dbPath, 'utf8');

const tableDef = `
    -- Bảng Đơn Nạp Tiền & Đối Soát VietQR (Deposit Orders)
    CREATE TABLE IF NOT EXISTS deposit_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      order_code TEXT UNIQUE NOT NULL,
      amount_vnd REAL NOT NULL,
      credit_amount REAL NOT NULL,
      bonus_credit_vnd REAL DEFAULT 0.0,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
      payment_method TEXT DEFAULT 'VIETQR' CHECK(payment_method IN ('VIETQR', 'MANUAL_BANK')),
      bank_account_info_json TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );
`;

const indexDef = `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_orders_code ON deposit_orders(order_code);
    CREATE INDEX IF NOT EXISTS idx_deposit_orders_user ON deposit_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_deposit_orders_status ON deposit_orders(status);
`;

if (!content.includes('CREATE TABLE IF NOT EXISTS deposit_orders')) {
  content = content.replace('CREATE TABLE IF NOT EXISTS fraud_logs (', tableDef + '\n    CREATE TABLE IF NOT EXISTS fraud_logs (');
  content = content.replace('CREATE INDEX IF NOT EXISTS idx_payouts_status ON payout_requests(status);', 'CREATE INDEX IF NOT EXISTS idx_payouts_status ON payout_requests(status);' + indexDef);

  const migrationItem = `    \`CREATE TABLE IF NOT EXISTS deposit_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      order_code TEXT UNIQUE NOT NULL,
      amount_vnd REAL NOT NULL,
      credit_amount REAL NOT NULL,
      bonus_credit_vnd REAL DEFAULT 0.0,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
      payment_method TEXT DEFAULT 'VIETQR' CHECK(payment_method IN ('VIETQR', 'MANUAL_BANK')),
      bank_account_info_json TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );\`,
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_deposit_orders_code ON deposit_orders(order_code);',
    'CREATE INDEX IF NOT EXISTS idx_deposit_orders_user ON deposit_orders(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_deposit_orders_status ON deposit_orders(status);',
`;

  content = content.replace('const migrations = [', 'const migrations = [\n' + migrationItem);
  fs.writeFileSync(dbPath, content, 'utf8');
  console.log('Successfully added deposit_orders table to server/db/database.js');
} else {
  console.log('deposit_orders already in server/db/database.js');
}
