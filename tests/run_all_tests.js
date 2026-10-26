/**
 * Autonomous QA & Chaos Bot Runner
 * Điều phối và thực thi toàn bộ 4 tầng kiểm thử tự hành của hệ thống VibeSurvey
 */

const { fork } = require('node:child_process');
const path = require('node:path');

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║     ARGON VIBE STUDIO - AUTONOMOUS QA & CHAOS MONKEY TEST SUITE      ║
║            HỆ THỐNG KIỂM THỬ TỰ HÀNH TOÀN DIỆN 4 TẦNG                ║
╚══════════════════════════════════════════════════════════════════════╝
`);

const testSuites = [
  {
    id: 1,
    name: 'Tầng 1: Anti-Fraud Engine Unit Test',
    description: 'Kiểm tra Speed Trap, Attention Check, Straight-lining, Entropy',
    file: 'test_anti_fraud.js'
  },
  {
    id: 2,
    name: 'Tầng 2: Double-Entry Ledger & ACID Transactions',
    description: 'Kiểm tra Atomicity nạp tiền, Escrow Lock, Anti-Double Spend, Sổ cái',
    file: 'test_ledger_acid.js'
  },
  {
    id: 3,
    name: 'Tầng 3: REST API Endpoints & Security Audit',
    description: 'Kiểm tra Auth, Bóc tách câu bẫy khỏi Respondent, Luồng nộp bài & ví',
    file: 'test_api_endpoints.js'
  },
  {
    id: 4,
    name: 'Tầng 4: Chaos Simulation & Monetization Audit',
    description: 'Giả lập 100 bài làm hỗn hợp, Xác nhận chặn bot 100%, Take Rate ~40%',
    file: 'test_simulation.js'
  },
  {
    id: 5,
    name: 'Tầng 5: VibeSurvey v2.5 Advanced Features Suite',
    description: 'Kiểm tra Ingestion, SSRF 400, Chợ Voucher, Sponsor Concurrency, Swap +10%, Matching Engine',
    file: 'test_v25_features.js'
  },
  {
    id: 6,
    name: 'Tầng 6: Security & SSRF / Atomic Audit Suite',
    description: 'Kiểm toán Cấp phát Voucher Atomic, Chống lộ API, swapPointsToCredit ACID & SSRF IP Whitelist',
    file: 'test_v25_security_audit.js'
  },
  {
    id: 7,
    name: 'Tầng 7: Deposit Bonus & Payout Economics Suite',
    description: 'Kiểm tra Tiered Bonus Credit (+3%..+15%), Khóa van một chiều, Ngưỡng rút 1k/5k & Biểu phí',
    file: 'test_deposit_bonus.js'
  },
  {
    id: 8,
    name: 'Tầng 8: Google Sheets Webhook Sync Engine Suite',
    description: 'Kiểm tra Webhook Async POST, Khả năng chịu lỗi kết nối, Cập nhật URL & Tự động Sync khi VALIDATED',
    file: 'test_webhook_sync.js'
  },
  {
    id: 9,
    name: 'Tầng 9: Pricing & Unit Economics Engine Suite',
    description: 'Kiểm tra CPI Matrix, LOI tự động, Dynamic Take Rate (35-50%), IR 1.0-2.5x & Toàn vẹn dòng tiền',
    file: 'test_pricing.js'
  },
  {
    id: 10,
    name: 'Tầng 10: Hybrid All-In-One Account Suite',
    description: 'Kiểm tra Mở quyền Tài khoản Toàn năng cho Respondent (Tạo khảo sát, Ký quỹ Escrow, Bóc tách form, Nạp tiền, Xuất CSV)',
    file: 'test_hybrid_all_in_one_account.js'
  },
  {
    id: 11,
    name: 'Tầng 11: Free Trial Surveys & Welcome Suite',
    description: 'Kiểm tra Gói dùng thử 25 lượt phản hồi miễn phí cho người mới, Sàn tài trợ 100% Escrow, Chống lạm dụng & Thu hồi an toàn',
    file: 'test_free_trial.js'
  },
  {
    id: 12,
    name: 'Tầng 12: Anti-Abuse, Form Deduplication & Auto-Ban IP Suite',
    description: 'Kiểm tra Lọc trùng link form, Điều kiện liên kết Google/Email, Cảnh báo khả nghi multi-account & Tự động Ban IP',
    file: 'test_anti_abuse_guardrails.js'
  },
  {
    id: 13,
    name: 'Tầng 13: Fast-Track Push Notification, Email & Full VAT Suite',
    description: 'Kiểm tra Tỷ lệ bonus tinh gọn ("hơn 1 tẹo"), Xuất Hóa Đơn VAT FULL 100%, Bắn Push APK & Gửi Email hệ thống',
    file: 'test_fast_track_and_vat.js'
  },
  {
    id: 14,
    name: 'Tầng 14: Review & Edit Response Suite (Google / Microsoft Forms Standard)',
    description: 'Kiểm tra Xem lại bài làm sau khi gửi, Chỉnh sửa câu trả lời, Bảo toàn quỹ Escrow và chặn sửa khi tắt tùy chọn',
    file: 'test_response_review_and_edit.js'
  }
];

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const child = fork(scriptPath, [], { stdio: 'inherit' });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('exit', (code) => {
      const durationMs = Date.now() - startTime;
      if (code === 0) {
        resolve({ passed: true, code, durationMs });
      } else {
        resolve({ passed: false, code, durationMs });
      }
    });
  });
}

function cleanupTestArtifacts() {
  try {
    const db = require('../server/db/database');
    const preservedIds = ['0265c6cc-6407-4ea8-ab56-1d5e6e7a3ede'];
    const testSurveys = db.prepare(`
      SELECT id FROM surveys WHERE id NOT IN (${preservedIds.map(() => '?').join(',')})
    `).all(...preservedIds);

    if (testSurveys.length > 0) {
      console.log(`\n[AUTONOMOUS CLEANUP] Phat hien ${testSurveys.length} form test. Dang tu dong don dep...`);
      const testIds = testSurveys.map(s => s.id);
      const placeholders = testIds.map(() => '?').join(',');

      db.exec('PRAGMA foreign_keys = OFF;');
      db.prepare(`DELETE FROM voucher_codes WHERE survey_id IN (${placeholders}) OR response_id IN (SELECT id FROM responses WHERE survey_id IN (${placeholders}))`).run(...testIds, ...testIds);
      db.prepare(`DELETE FROM warranty_claims WHERE survey_id IN (${placeholders})`).run(...testIds);
      db.prepare(`DELETE FROM responses WHERE survey_id IN (${placeholders})`).run(...testIds);
      db.prepare(`DELETE FROM questions WHERE survey_id IN (${placeholders})`).run(...testIds);
      db.prepare(`DELETE FROM surveys WHERE id IN (${placeholders})`).run(...testIds);
      db.exec('PRAGMA foreign_keys = ON;');
      console.log(`[AUTONOMOUS CLEANUP] Da don dep sach se ${testSurveys.length} form test khoi co so du lieu.`);
    } else {
      console.log('\n[AUTONOMOUS CLEANUP] Co so du lieu sach se, khong co form test ton dong.');
    }
  } catch (err) {
    console.error('[AUTONOMOUS CLEANUP] Loi khi don dep test artifacts:', err.message);
  }
}

async function runAll() {
  const overallStart = Date.now();
  const summary = [];

  for (const suite of testSuites) {
    const filePath = path.join(__dirname, suite.file);
    console.log(`\n▶️ Đang khởi chạy Suite [${suite.id}/${testSuites.length}]: ${suite.name}...`);
    try {
      const result = await runScript(filePath);
      summary.push({
        id: suite.id,
        name: suite.name,
        passed: result.passed,
        durationMs: result.durationMs
      });
      if (!result.passed) {
        console.error(`\n❌ CẢNH BÁO: Bộ kiểm thử ${suite.name} THẤT BẠI (Mã thoát: ${result.code})!`);
      }
    } catch (err) {
      summary.push({
        id: suite.id,
        name: suite.name,
        passed: false,
        durationMs: 0,
        error: err.message
      });
      console.error(`\n❌ LỖI KHỞI CHẠY ${suite.name}:`, err);
    }
  }

  const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(2);
  const totalPassed = summary.filter(s => s.passed).length;
  const totalSuites = summary.length;
  const isAllPassed = totalPassed === totalSuites;

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║               BÁO CÁO TỔNG KẾT KIỂM THỬ TOÀN DIỆN                    ║');
  console.log('╠══════╦═════════════════════════════════════════════╦═════════╦════════╣');
  console.log('║ TẦNG ║ TÊN BỘ KIỂM THỬ                             ║ KẾT QUẢ ║ THỜI L.║');
  console.log('╠══════╬═════════════════════════════════════════════╬═════════╬════════╣');

  for (const item of summary) {
    const idStr = `  ${item.id}   `.slice(0, 6);
    const nameStr = (item.name + '                                         ').slice(0, 43);
    const statusStr = item.passed ? '  PASS   ' : '  FAIL   ';
    const durStr = ` ${(item.durationMs / 1000).toFixed(2)}s   `.slice(0, 8);
    console.log(`║${idStr}║ ${nameStr} ║${statusStr}║${durStr}║`);
  }

  console.log('╚══════╩═════════════════════════════════════════════╩═════════╩════════╝');
  console.log(`\n⏱️ Tổng thời gian thực thi: ${overallDuration} giây`);
  console.log(`🎯 Tỷ lệ thành công: ${totalPassed}/${totalSuites} Suites (${((totalPassed / totalSuites) * 100).toFixed(1)}%)`);

  cleanupTestArtifacts();

  if (isAllPassed) {
    console.log('\n🏆 [KẾT QUẢ]: TẤT CẢ CÁC TẦNG KIỂM THỬ ĐÃ VƯỢT QUA 100% (100% PASS)');
    console.log('🛡️ Hệ thống Anti-Fraud & Double-Entry Ledger đạt tiêu chuẩn Production Ready!\n');
    process.exit(0);
  } else {
    console.error('\n💥 [KẾT QUẢ]: CÓ BÀI TEST THẤT BẠI! Vui lòng kiểm tra lại log bên trên.');
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Lỗi nghiêm trọng trong Test Runner:', err);
  process.exit(1);
});
