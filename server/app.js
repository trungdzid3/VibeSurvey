const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');

const app = express();

// Bao mat voi Helmet (cau hinh cho phep SPA, CDN va nhung assets/iframe an toan)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://accounts.google.com',
          'https://cdn.tailwindcss.com',
          'https://unpkg.com'
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com'
        ],
        fontSrc: [
          "'self'",
          'data:',
          'https://fonts.gstatic.com'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:'
        ],
        mediaSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:'
        ],
        frameSrc: [
          "'self'",
          'https://accounts.google.com',
          'https://docs.google.com',
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com'
        ],
        connectSrc: [
          "'self'",
          'https://accounts.google.com',
          'https:'
        ]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
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
    service: 'SurvHub Platform Backend'
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
    console.log(`[MAY CHU] SurvHub Server dang chay tai: http://localhost:${PORT}`);
    console.log(`[THIET BI] Hybrid Mobile App san sang qua Capacitor Android`);
    console.log(`[BAO MAT] Anti-Fraud Engine va Double-Entry Ledger: KICH HOAT`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
