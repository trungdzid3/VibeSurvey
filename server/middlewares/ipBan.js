const antiFraudService = require('../services/antiFraudService');

function checkIpBannedMiddleware(req, res, next) {
  try {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const isBanned = antiFraudService.checkIpBanned(rawIp);
    if (isBanned) {
      return res.status(403).json({
        success: false,
        isBanned: true,
        message: `Địa chỉ IP của bạn (${isBanned.ip_address}) đã bị khóa truy cập do vi phạm chính sách nền tảng: ${isBanned.reason}`
      });
    }
    next();
  } catch (err) {
    next();
  }
}

module.exports = {
  checkIpBannedMiddleware
};
