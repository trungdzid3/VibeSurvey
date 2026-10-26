const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../server/controllers/surveyController.js');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Cập nhật dòng 842: rewardSurveyCompletion với effectivePoints
const oldRewardBlock = `        // 2. Trường hợp Khảo sát trả Điểm hoặc Hybrid (Điểm + Voucher)
        const rewardResult = ledgerService.rewardSurveyCompletion(
          survey.id,
          user.id,
          response.id,
          survey.reward_points_per_response,
          survey.cost_per_response
        );`;

const newRewardBlock = `        // 2. Trường hợp Khảo sát trả Điểm hoặc Hybrid (Điểm + Voucher)
        const userRow = db.prepare('SELECT trust_score FROM users WHERE id = ?').get(user.id);
        const currentTrust = userRow ? userRow.trust_score : 85.0;
        const payoutDetails = antiFraudService.calculatePayoutByTrustScore(survey.reward_points_per_response, currentTrust);
        const effectivePoints = payoutDetails.effectiveReward;

        const rewardResult = ledgerService.rewardSurveyCompletion(
          survey.id,
          user.id,
          response.id,
          effectivePoints,
          survey.cost_per_response
        );

        antiFraudService.updateUserTrustScore(user.id, 'VALIDATED');`;

content = content.replace(oldRewardBlock, newRewardBlock);

// 2. Cập nhật pointsEarned trả về
content = content.replace(
  `          pointsEarned: survey.reward_points_per_response,\n          qualityScore: evalResult.qualityScore,`,
  `          pointsEarned: effectivePoints,\n          qualityScore: evalResult.qualityScore,\n          payoutDetails,`
);

// 3. Cập nhật trừ điểm uy tín khi REJECTED_FRAUD (trừ -12 điểm uy tín)
const oldRejectedTrust = `        const newTrust = Math.max(0, user.trust_score - 15.0);
        db.prepare('UPDATE users SET trust_score = ? WHERE id = ?').run(newTrust, user.id);`;

const newRejectedTrust = `        const trustResult = antiFraudService.updateUserTrustScore(user.id, 'REJECTED');
        const newTrust = trustResult ? trustResult.newScore : Math.max(0, user.trust_score - 12.0);`;

content = content.replace(oldRejectedTrust, newRejectedTrust);

// 4. Cập nhật trừ điểm uy tín khi FLAGGED_MANUAL (trừ -5 điểm uy tín)
const oldFlagged = `      // FLAGGED_MANUAL (Chờ duyệt thủ công)
      return res.json({`;

const newFlagged = `      // FLAGGED_MANUAL (Chờ duyệt thủ công - Nghi vấn trừ -5 điểm uy tín)
      antiFraudService.updateUserTrustScore(user.id, 'SUSPICIOUS');
      return res.json({`;

content = content.replace(oldFlagged, newFlagged);

// 5. Cập nhật screen-out: 0 point và +0.2 trust_score
const oldScreenOut = `      // Tặng điểm an ủi 20 điểm
      const consolationPoints = 20;
      try {
        ledgerService.awardConsolationReward(response.id, user.id, id, consolationPoints);
      } catch (ledgerErr) {
        console.error('Lỗi tặng điểm an ủi:', ledgerErr);
        // Không throw lỗi vì screened out vẫn nên được ghi nhận
      }`;

const newScreenOut = `      // Screen-out: 0 Point tiền mặt và cộng +0.2 điểm uy tín theo KE_HOACH_TONG_THE.md
      const consolationPoints = 0;
      try {
        antiFraudService.updateUserTrustScore(user.id, 'SCREENED_OUT');
      } catch (trustErr) {
        console.error('Lỗi cộng điểm uy tín screen-out:', trustErr);
      }`;

content = content.replace(oldScreenOut, newScreenOut);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Da cap nhat surveyController.js thanh cong!');
