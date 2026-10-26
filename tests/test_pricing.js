/**
 * TEST SUITE: PRICING & UNIT ECONOMICS ENGINE (KIEM TOAN CONG THUC CPI & BANG GIA 3 PHAN KHUC)
 * Quy chuan theo KE_HOACH_TONG_THE.md va TUONG_LAI_HE_THONG.md:
 * - Ty gia 1:1 VND (1 Point = 1 VND, 1 Credit = 1 VND)
 * - Bang gia san 3 phan khuc: Sinh vien (400/500/600), Ca nhan (800/1000/1200), Doanh nghiep (1500/2000/2500)
 * - 3 nac SLA de xuat: Tiet kiem (1.0x), De xuat (+25%), Hoa toc (+60%)
 * - Creator Boost chia se: Sinh vien 85/15, Ca nhan & Doanh nghiep 80/20
 * - Phu phi loc: Sinh vien +100d, Ca nhan +200d, Doanh nghiep 0d
 * - Chiet khau Doanh nghiep: 10% (300 mau), 15% (500 mau)
 * - Cong thuc hoan tien an toan: Math.min(escrow_locked_balance, Math.max(0, TotalEscrow - (collected * effective_cost)))
 * - Truyt thu chiet khau va phi goi 40.000d khi Doanh nghiep huy som
 */

const assert = require('assert');
const config = require('../server/config');
const pricingService = require('../server/services/pricingService');

async function runPricingTests() {
  console.log('===============================================================');
  console.log('BAT DAU KIEM THU: PRICING & UNIT ECONOMICS ENGINE (TASK 1)');
  console.log('===============================================================');

  let passedTests = 0;
  let totalTests = 0;

  async function runTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error('     Chi tiet loi:', err.message);
      throw err;
    }
  }

  // 1. Kiem tra cau hinh ty le tien te 1:1 VND va moc nap moi
  await runTest('1. Cau hinh tien te 1:1 VND, moc nap tu 20k va doi Point sang Credit +5%', async () => {
    assert.strictEqual(config.ECONOMICS.POINT_TO_VND_RATE, 1, '1 Point phai bang 1 VND');
    assert.strictEqual(config.ECONOMICS.SWAP_BONUS_RATE, 1.05, 'Doi Point sang Credit thuong +5%');
    assert.strictEqual(config.ECONOMICS.MIN_SWAP_POINTS, 5000, 'Doi toi thieu 5.000 Point');

    // Kiem tra bang moc nap
    const depositTiers = config.ECONOMICS.DEPOSIT_TIERS;
    assert(Array.isArray(depositTiers), 'Bang moc nap phai la mang');
    assert.strictEqual(depositTiers[0].amount, 20000, 'Moc nap toi thieu la 20.000d');
    assert.strictEqual(depositTiers[0].bonusRate, 0.0, 'Moc 20k thuong 0%');
    assert.strictEqual(depositTiers[1].amount, 50000, 'Moc 50k thuong 2%');
    assert.strictEqual(depositTiers[1].bonusCredit, 1000);
    assert.strictEqual(depositTiers[3].amount, 200000, 'Moc 200k tang 1 ve VIP');
    assert.strictEqual(depositTiers[3].vipTickets, 1);
  });

  // 2. Kiem tra thuat toan phan loai do dai cau hoi (getQuestionLengthCategory)
  await runTest('2. Phan loai do dai cau hoi: SHORT (<=10), MEDIUM (11-25), LONG (>25)', async () => {
    assert.strictEqual(pricingService.getQuestionLengthCategory(5), 'SHORT');
    assert.strictEqual(pricingService.getQuestionLengthCategory(10), 'SHORT');
    assert.strictEqual(pricingService.getQuestionLengthCategory(11), 'MEDIUM');
    assert.strictEqual(pricingService.getQuestionLengthCategory(20), 'MEDIUM');
    assert.strictEqual(pricingService.getQuestionLengthCategory(25), 'MEDIUM');
    assert.strictEqual(pricingService.getQuestionLengthCategory(26), 'LONG');
    assert.strictEqual(pricingService.getQuestionLengthCategory(50), 'LONG');

    // Ho tro truyen mang cau hoi
    const arrShort = Array(8).fill({ type: 'SINGLE_CHOICE' });
    assert.strictEqual(pricingService.getQuestionLengthCategory(arrShort), 'SHORT');
  });

  // 3. Kiem tra Bang gia san 3 phan khuc (getFloorPrice)
  await runTest('3. Bang gia san toi thieu P_san cho 3 phan khuc (Sinh vien, Ca nhan, Doanh nghiep)', async () => {
    // Sinh vien: 400d / 500d / 600d
    const svShort = pricingService.getFloorPrice('STUDENT', 'SHORT');
    assert.strictEqual(svShort.floorPrice, 400);
    assert.strictEqual(svShort.respondentRewardFloor, 350);
    assert.strictEqual(svShort.platformProfitFloor, 50);

    const svMed = pricingService.getFloorPrice('STUDENT', 'MEDIUM');
    assert.strictEqual(svMed.floorPrice, 500);
    assert.strictEqual(svMed.respondentRewardFloor, 450);

    const svLong = pricingService.getFloorPrice('STUDENT', 'LONG');
    assert.strictEqual(svLong.floorPrice, 600);
    assert.strictEqual(svLong.respondentRewardFloor, 540);

    // Ca nhan: 800d / 1000d / 1200d
    const cnShort = pricingService.getFloorPrice('PERSONAL', 'SHORT');
    assert.strictEqual(cnShort.floorPrice, 800);
    assert.strictEqual(cnShort.respondentRewardFloor, 600);
    assert.strictEqual(cnShort.platformProfitFloor, 200);

    const cnMed = pricingService.getFloorPrice('PERSONAL', 'MEDIUM');
    assert.strictEqual(cnMed.floorPrice, 1000);
    assert.strictEqual(cnMed.respondentRewardFloor, 750);
    assert.strictEqual(cnMed.platformProfitFloor, 250);

    // Doanh nghiep: 1500d / 2000d / 2500d
    const dnMed = pricingService.getFloorPrice('ENTERPRISE', 'MEDIUM');
    assert.strictEqual(dnMed.floorPrice, 2000);
    assert.strictEqual(dnMed.respondentRewardFloor, 1300);
    assert.strictEqual(dnMed.platformProfitFloor, 700);
  });

  // 4. Kiem tra 3 Nac SLA va Thuat toan Creator Boost chia 85/15 va 80/20 (getSlaPricingTiers)
  await runTest('4. 3 Nac SLA (Floor, Recommended, Rush) va Creator Boost chia 85/15 (SV) va 80/20 (CN/DN)', async () => {
    // Form Vua Ca nhan (P_san = 1.000d)
    const cnSla = pricingService.getSlaPricingTiers('PERSONAL', 'MEDIUM');
    assert.strictEqual(cnSla.floorPrice, 1000);

    // Nac 1: Floor (1.0x) -> 1.000d
    const floorTier = cnSla.tiers.FLOOR;
    assert.strictEqual(floorTier.pricePerResponse, 1000);
    assert.strictEqual(floorTier.respondentReward, 750);
    assert.strictEqual(floorTier.platformProfit, 250);

    // Nac 2: Recommended (1.25x) -> 1.250d (Delta P = 250d, chia 80/20: +200d cho nguoi dien, +50d cho san)
    const recTier = cnSla.tiers.RECOMMENDED;
    assert.strictEqual(recTier.pricePerResponse, 1250);
    assert.strictEqual(recTier.deltaP, 250);
    assert.strictEqual(recTier.respondentReward, 750 + 200); // 950d
    assert.strictEqual(recTier.platformProfit, 250 + 50);   // 300d

    // Nac 3: Rush (1.60x) -> 1.600d (Delta P = 600d, chia 80/20: +480d cho nguoi dien, +120d cho san)
    const rushTier = cnSla.tiers.RUSH;
    assert.strictEqual(rushTier.pricePerResponse, 1600);
    assert.strictEqual(rushTier.deltaP, 600);
    assert.strictEqual(rushTier.respondentReward, 750 + 480); // 1230d
    assert.strictEqual(rushTier.platformProfit, 250 + 120);  // 370d

    // Form Vua Sinh vien (P_san = 500d, chia 85/15)
    const svSla = pricingService.getSlaPricingTiers('STUDENT', 'MEDIUM');
    const svRec = svSla.tiers.RECOMMENDED; // 500 * 1.25 = 625d (Delta P = 125d)
    assert.strictEqual(svRec.pricePerResponse, 625);
    const expectedSvBoost = Math.floor(125 * 0.85); // 106d
    assert.strictEqual(svRec.respondentReward, 450 + expectedSvBoost); // 556d
  });

  // 5. Kiem tra Goi Sinh Vien voi luot mien phi thang (chong lo san 10%)
  await runTest('5. Goi Sinh Vien: 50 mau tru 10 luot free -> Thu 20k, dap vien nhan 360d, san lai 10%', async () => {
    const questions = Array(15).fill({ type: 'SINGLE_CHOICE' }); // Form Vua (15 cau)
    const eco = pricingService.calculateSurveyEconomics(questions, 50, {
      tier: 'STUDENT',
      useFreeQuota: true,
      freeQuotaRemaining: 30
    });

    assert.strictEqual(eco.tier, 'STUDENT');
    assert.strictEqual(eco.lengthCategory, 'MEDIUM');
    assert.strictEqual(eco.floorPrice, 500);
    assert.strictEqual(eco.freeResponsesApplied, 10); // Cứ 50 mẫu được trừ 10 lượt
    assert.strictEqual(eco.paidResponses, 40);

    // Thu 40 mau x 500d = 20.000d
    assert.strictEqual(eco.surveyEscrowVnd, 20000);
    // San giu 10% phi duy tri = 2.000d, con 18.000d / 50 mau = 360 Point / mau
    assert.strictEqual(eco.rewardPointsPerResponse, 360);
    assert.strictEqual(eco.totalRewardPayoutVnd, 18000);
    assert.strictEqual(eco.platformProfitVnd, 2000);
    assert(eco.actualTakeRate >= 10.0, 'San bao toan bien loi nhuan >= 10%');
  });

  // 6. Kiem tra Goi Ca Nhan voi 25 luot mien phi dau tay
  await runTest('6. Goi Ca Nhan: 50 mau tru 25 luot free bai dau -> Thu 25k, san lai 25%', async () => {
    const questions = Array(15).fill({ type: 'SINGLE_CHOICE' }); // Form Vua
    const eco = pricingService.calculateSurveyEconomics(questions, 50, {
      tier: 'PERSONAL',
      isFirstSurvey: true,
      useFreeQuota: true,
      freeQuotaRemaining: 25
    });

    assert.strictEqual(eco.tier, 'PERSONAL');
    assert.strictEqual(eco.freeResponsesApplied, 25);
    assert.strictEqual(eco.paidResponses, 25);

    // Thu 25 mau x 1.000d = 25.000d
    assert.strictEqual(eco.surveyEscrowVnd, 25000);
    // San thu 25% take rate co so, 75% chia 50 mau = Math.floor(18.750 / 50) = 375 Point
    assert.strictEqual(eco.rewardPointsPerResponse, 375);
    assert(eco.platformProfitVnd > 0, 'San luon co lai duong');
  });

  // 7. Kiem tra Phu phi bo loc doi tuong (SV +100d, Ca nhan +200d, Doanh nghiep 0d)
  await runTest('7. Phu phi Bo loc doi tuong: SV +100d, Ca nhan +200d, Doanh nghiep 0d', async () => {
    const questions = Array(10).fill({ type: 'SINGLE_CHOICE' }); // Form Ngan

    // Sinh vien co loc: 400d + 100d = 500d
    const svEco = pricingService.calculateSurveyEconomics(questions, 100, {
      tier: 'STUDENT',
      hasTargeting: true
    });
    assert.strictEqual(svEco.standardCostPerResponse, 500);
    assert.strictEqual(svEco.targetingFee, 100);

    // Ca nhan co loc: 800d + 200d = 1.000d
    const cnEco = pricingService.calculateSurveyEconomics(questions, 100, {
      tier: 'PERSONAL',
      hasTargeting: true
    });
    assert.strictEqual(cnEco.standardCostPerResponse, 1000);
    assert.strictEqual(cnEco.targetingFee, 200);

    // Doanh nghiep co loc: Mien phi 100% (phi loc = 0d)
    const dnEco = pricingService.calculateSurveyEconomics(questions, 100, {
      tier: 'ENTERPRISE',
      hasTargeting: true
    });
    assert.strictEqual(dnEco.standardCostPerResponse, 1500); // 1.500d goc
    assert.strictEqual(dnEco.targetingFee, 0);
  });

  // 8. Kiem tra Chiet khau quy mo Doanh nghiep (300 mau -10%, 500 mau -15%)
  await runTest('8. Chiet khau quy mo Doanh nghiep: 300 mau (-10%), 500 mau (-15%)', async () => {
    const questions = Array(15).fill({ type: 'SINGLE_CHOICE' }); // Form Vua (2.000d)

    // 300 mau: giam 10% -> 1.800d/mau -> Tong Escrow = 540.000d
    const eco300 = pricingService.calculateSurveyEconomics(questions, 300, {
      tier: 'ENTERPRISE'
    });
    assert.strictEqual(eco300.volumeDiscountRate, 0.10);
    assert.strictEqual(eco300.costPerResponseVnd, 1800);
    assert.strictEqual(eco300.surveyEscrowVnd, 540000);

    // 500 mau: giam 15% -> 1.700d/mau -> Tong Escrow = 850.000d
    const eco500 = pricingService.calculateSurveyEconomics(questions, 500, {
      tier: 'ENTERPRISE'
    });
    assert.strictEqual(eco500.volumeDiscountRate, 0.15);
    assert.strictEqual(eco500.costPerResponseVnd, 1700);
    assert.strictEqual(eco500.surveyEscrowVnd, 850000);
  });

  // 9. Kiem tra Doanh nghiep tang kem Voucher (Hybrid Model V <= N)
  await runTest('9. Doanh nghiep tang kem Voucher: 50 Voucher / 100 mau giam 20% CPI tren 50 suat co voucher', async () => {
    const questions = Array(15).fill({ type: 'SINGLE_CHOICE' }); // Form Vua (2.000d)
    const ecoVoucher = pricingService.calculateSurveyEconomics(questions, 100, {
      tier: 'ENTERPRISE',
      voucherCount: 50
    });

    // 50 suat co voucher: giam 20% CPI -> 1.600d x 50 = 80.000d
    // 50 suat khong voucher: gia chuan 2.000d x 50 = 100.000d
    // Tong Escrow = 180.000d
    assert.strictEqual(ecoVoucher.voucherCount, 50);
    assert.strictEqual(ecoVoucher.surveyEscrowVnd, 180000);
  });

  // 10. Kiem tra Cong thuc hoan tien an toan (calculateEscrowRefund)
  await runTest('10. Hoan tien an toan: Math.min(escrow_locked_balance, Math.max(0, Total - collected*effective))', async () => {
    // 100 mau, da nap 100.000d, thu duoc 40 mau, con 60.000d trong escrow_locked_balance
    const refundInfo = pricingService.calculateEscrowRefund({
      totalEscrowPaid: 100000,
      targetResponses: 100,
      collectedResponses: 40,
      escrowLockedBalance: 60000,
      tier: 'PERSONAL'
    });

    assert.strictEqual(refundInfo.effectiveCostPerResponse, 1000);
    assert.strictEqual(refundInfo.refundAmount, 60000);
    assert.strictEqual(refundInfo.remainingResponses, 60);

    // Chặn lỗi: nếu escrowLockedBalance chỉ còn 50.000d, tuyệt đối không hoàn vượt 50.000d
    const cappedRefund = pricingService.calculateEscrowRefund({
      totalEscrowPaid: 100000,
      targetResponses: 100,
      collectedResponses: 40,
      escrowLockedBalance: 50000,
      tier: 'PERSONAL'
    });
    assert.strictEqual(cappedRefund.refundAmount, 50000);
  });

  // 11. Kiem tra Quy tac xu ly hoan luot free khi huy som
  await runTest('11. Xu ly luot free khi dong som: collected == 0 hoan 100% free, collected > 0 khong hoan', async () => {
    // Truong hop 1: Chua ai lam (collected == 0) -> Hoan tra lai nguyen ven luot free
    const refundZero = pricingService.calculateEscrowRefund({
      totalEscrowPaid: 20000,
      targetResponses: 50,
      collectedResponses: 0,
      escrowLockedBalance: 20000,
      tier: 'STUDENT',
      freeResponsesApplied: 10
    });
    assert.strictEqual(refundZero.refundAmount, 20000);
    assert.strictEqual(refundZero.refundFreeQuota, 10);

    // Truong hop 2: Da co nguoi lam (collected == 5) -> Khong hoan luot free
    const refundActive = pricingService.calculateEscrowRefund({
      totalEscrowPaid: 20000,
      targetResponses: 50,
      collectedResponses: 5,
      escrowLockedBalance: 20000,
      tier: 'STUDENT',
      freeResponsesApplied: 10
    });
    assert.strictEqual(refundActive.refundFreeQuota, 0);
  });

  // 12. Kiem tra Chot chan chong Doanh nghiep lach chiet khau khi huy som (truy thu va tru 40k phi goi)
  await runTest('12. Chot chan chong DN lach chiet khau: tinh lai don gia chuan va tru 40.000d phi goi khi huy som', async () => {
    // DN dang ky 500 mau (giam 15% -> 850.000d, duoc tang goi dich vu 40k)
    // Thu duoc 100 mau roi bam huy
    const dnClawback = pricingService.calculateEscrowRefund({
      totalEscrowPaid: 850000,
      targetResponses: 500,
      collectedResponses: 100,
      escrowLockedBalance: 850000,
      tier: 'ENTERPRISE',
      standardCostPerResponse: 2000,
      volumeDiscountRate: 0.15,
      hasPromotionPackage: true
    });

    // 100 mau tinh theo gia goc 2.000d = 200.000d
    // Tru phi goi dich vu da dung: 40.000d
    // So tien hoan thuc te = 850.000 - 200.000 - 40.000 = 610.000d
    assert.strictEqual(dnClawback.penaltyApplied, true);
    assert.strictEqual(dnClawback.refundAmount, 610000);
    assert(dnClawback.clawbackAmount > 0, 'Da thuc hien truy thu');
  });

  // 13. Kiem tra Tuong thich nguoc cac ham LOI va CPI matrix cu
  await runTest('13. Bao toan 100% tuong thich nguoc voi ham LOI va CPI matrix cu', async () => {
    const questions = [
      { type: 'SINGLE_CHOICE' },
      { type: 'LIKERT_SCALE' }
    ];
    const loi = pricingService.estimateLoi(questions);
    assert.strictEqual(loi.loiSeconds, 37);

    // Goi theo kieu cu khong co tier -> chay CPI Matrix
    const ecoOld = pricingService.calculateSurveyEconomics(questions, 50, 0.30);
    assert.strictEqual(ecoOld.targetTakeRate, 30.0);
    assert.strictEqual(ecoOld.tierName, 'CUSTOM');
  });

  console.log('---------------------------------------------------------------');
  console.log(`KIEM THU HOAN TAT: ${passedTests}/${totalTests} BAI THANH CONG (100% PASS)`);
  console.log('===============================================================\n');

  return { passedTests, totalTests };
}

if (require.main === module) {
  runPricingTests().catch(err => {
    console.error('Loi kiem thu Pricing:', err);
    process.exit(1);
  });
}

module.exports = runPricingTests;
