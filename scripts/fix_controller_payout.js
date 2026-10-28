const fs = require('fs');
let code = fs.readFileSync('server/controllers/walletController.js', 'utf8');
const oldReturnRegex = /return res\.status\(201\)\.json\(\{\s*success:\s*true,\s*message:\s*'[^']*',\s*payoutId:\s*result\.payoutId,\s*netAmountVnd:\s*result\.netAmountVnd,\s*feeVnd:\s*result\.feeVnd,\s*newPointBalance:\s*result\.newPointBalance\s*\}\);/;

const newReturn = `const message = result.isAutoPayout
        ? (payout_method === 'PHONE_CARD' 
            ? 'Đã tự động duyệt và cấp mã thẻ cào thành công!' 
            : 'Hệ thống đã tự động phê duyệt và hoàn tất chi trả cho tài khoản uy tín cao!')
        : 'Đã tạo yêu cầu rút thưởng thành công. Tiền/Thẻ sẽ được chuyển sau khi hệ thống phê duyệt.';

      return res.status(201).json({
        success: true,
        message,
        payoutId: result.payoutId,
        status: result.status,
        isAutoPayout: result.isAutoPayout,
        cardDetails: result.cardDetails,
        netAmountVnd: result.netAmountVnd,
        feeVnd: result.feeVnd,
        newPointBalance: result.newPointBalance
      });`;

if (oldReturnRegex.test(code)) {
  code = code.replace(oldReturnRegex, newReturn);
  fs.writeFileSync('server/controllers/walletController.js', code, 'utf8');
  console.log('Successfully updated requestPayout in walletController.js');
} else {
  console.log('Regex did not match in walletController.js');
}
