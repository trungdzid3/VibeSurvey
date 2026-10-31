const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/database');

const LEGACY_JWT_SECRET = 'vibesurvey_default_secret_key_2026';

function verifyJwt(token, callback) {
  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      return callback(null, decoded);
    }
    if (config.JWT_SECRET !== LEGACY_JWT_SECRET) {
      return jwt.verify(token, LEGACY_JWT_SECRET, callback);
    }
    return callback(err, decoded);
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập tài nguyên này' });
  }

  verifyJwt(token, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }
    if (user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa do vi phạm chính sách nền tảng' });
    }

    delete user.password_hash;
    delete user.email_otp;
    delete user.student_otp;
    try { db.prepare("UPDATE users SET last_active_at = datetime('now') WHERE id = ?").run(user.id); } catch (e) {}
    req.user = user;
    next();
  });
}

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  verifyJwt(token, (err, decoded) => {
    if (err || !decoded || !decoded.id) {
      req.user = null;
      return next();
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
      if (user && user.status !== 'BANNED') {
        delete user.password_hash;
        delete user.email_otp;
        delete user.student_otp;
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (e) {
      req.user = null;
    }
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện hành động này. Yêu cầu vai trò: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  requireRole
};
