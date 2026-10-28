const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/services/ledgerService.js');
let code = fs.readFileSync(filePath, 'utf8');

// Tìm vị trí return sau db.exec('COMMIT') trong requestPayout
const commitRegex = /db\.exec\('COMMIT'\);\s*return\s*\{[^}]*payoutId[^}]*\};/m;

const replacement = `db.exec('COMMIT');

      // Co che Tu Dong Duyet Rut Tien Nho (Auto-Payout Engine)
      let isAutoPayout = false;
      let payoutStatus = 'PENDING';
      let autoCardDetails = null;

      try {
        const canAutoPayout = (payoutMethod === 'PHONE_CARD') || (points <= 20000 && user.trust_score >= 90.0);
        if (canAutoPayout) {
          const fraudCheck = db.prepare(\`
            SELECT COUNT(*) as count FROM fraud_logs 
            WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-30 days')
          \`).get(userId);
          const fraudCount = fraudCheck ? fraudCheck.count : 0;

          if (fraudCount === 0) {
            let parsedRecipient = {};
            try {
              parsedRecipient = typeof recipientInfo === 'string' ? JSON.parse(recipientInfo) : (recipientInfo || {});
            } catch (e) {
              parsedRecipient = {};
            }

            if (payoutMethod === 'PHONE_CARD') {
              const telco = (parsedRecipient.telco || 'VIETTEL').toUpperCase();
              const cardCode = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
              const cardSerial = Math.floor(100000000000 + Math.random() * 900000000000).toString();
              const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

              autoCardDetails = {
                ...parsedRecipient,
                telco,
                card_code: cardCode,
                card_serial: cardSerial,
                card_value_vnd: fiatAmountVnd,
                expiry_date: expiryDate,
                issued_at: new Date().toISOString()
              };

              db.prepare(\`
                UPDATE payout_requests 
                SET status = 'COMPLETED',
                    recipient_info_json = ?,
                    admin_note = '[AUTO_PAYOUT_ENGINE] Tu dong cap ma the cao thanh cong',
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PENDING'
              \`).run(JSON.stringify(autoCardDetails), payoutId);

              isAutoPayout = true;
              payoutStatus = 'COMPLETED';

              try {
                const notifId = 'notif_payout_' + crypto.randomUUID();
                db.prepare(\`
                  INSERT INTO notifications (id, user_id, type, title, message, channel)
                  VALUES (?, ?, 'PAYOUT_COMPLETED', 'Doi the cao thanh cong', ?, 'ALL')
                \`).run(
                  notifId,
                  userId,
                  \`The cao \${telco} \${fiatAmountVnd.toLocaleString('vi-VN')}d da duoc cap ma thanh cong. Ma the: \${cardCode}, Seri: \${cardSerial}.\`
                );
              } catch (notifErr) {}
            } else {
              db.prepare(\`
                UPDATE payout_requests 
                SET status = 'COMPLETED',
                    admin_note = '[AUTO_PAYOUT_ENGINE] Tu dong phe duyet cho tai khoan uy tin cao (Trust Score >= 90.0)',
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PENDING'
              \`).run(payoutId);

              isAutoPayout = true;
              payoutStatus = 'COMPLETED';

              try {
                const notifId = 'notif_payout_' + crypto.randomUUID();
                db.prepare(\`
                  INSERT INTO notifications (id, user_id, type, title, message, channel)
                  VALUES (?, ?, 'PAYOUT_COMPLETED', 'Rut tien tu dong thanh cong', ?, 'ALL')
                \`).run(
                  notifId,
                  userId,
                  \`Yeu cau rut \${netAmountVnd.toLocaleString('vi-VN')}d da duoc he thong phe duyet va chuyen tien.\`
                );
              } catch (notifErr) {}
            }
          }
        }
      } catch (autoErr) {
        console.warn('[Auto-Payout Engine] Chu y khi xu ly tu dong:', autoErr.message);
      }

      return { 
        success: true, 
        payoutId, 
        status: payoutStatus,
        isAutoPayout,
        cardDetails: autoCardDetails,
        netAmountVnd, 
        feeVnd: fee, 
        newPointBalance 
      };`;

if (commitRegex.test(code)) {
  code = code.replace(commitRegex, replacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully replaced requestPayout return with Auto-Payout Engine');
} else {
  console.log('Regex commit did not match');
}
