const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');
const seedDatabase = require('./db/seed');

const app = express();

// Khởi tạo dữ liệu mẫu nếu cần
seedDatabase();

// Bảo mật với Helmet (cấu hình cho phép SPA và nhúng assets an toàn)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Bật CORS cho cả Web Browser và Capacitor Native Mobile App (capacitor://localhost hoặc http://localhost)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint', 'Idempotency-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Phục vụ tài nguyên tĩnh của Frontend
app.use(express.static(path.join(__dirname, '../public')));
app.use('/src', express.static(path.join(__dirname, '../src')));

// Mount API v1
app.use('/api/v1', apiRoutes);

// Tuyến đường kiểm tra sức khỏe hệ thống (Health Check)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    service: 'VibeSurvey Platform Backend'
  });
});

// SPA Fallback: Trả về index.html cho các route phía Client
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Middleware xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Đã xảy ra lỗi máy chủ nội bộ',
    error: config.NODE_ENV === 'development' ? err.message : undefined
  });
});

if (require.main === module) {
  const PORT = config.PORT;
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 VibeSurvey Server is running on: http://localhost:${PORT}`);
    console.log(`📱 Hybrid Mobile App ready via Capacitor Android`);
    console.log(`🛡️ Anti-Fraud Engine & Double-Entry Ledger: ACTIVE`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
