/**
 * Script kiem tra hai endpoint Admin:
 * 1. GET /api/v1/admin/analytics/trends
 * 2. GET /api/v1/admin/audit-logs
 *
 * Chay truc tiep tren Node.js de verify qua mang HTTP thuc te toi server http://localhost:3000
 */

const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const db = require('../server/db/database');
const config = require('../server/config');

async function main() {
  console.log('=======================================================');
  console.log('[KIEM TRA] Bat dau kiem tra HTTP GET 2 Endpoint Admin');
  console.log('=======================================================');

  // 1. Lay thong tin tai khoan Admin
  const adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
  assert(adminUser, 'Phai co it nhat mot tai khoan ADMIN trong co so du lieu');

  const adminToken = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: adminUser.role },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const baseUrl = 'http://localhost:3000/api/v1';

  // 2. Kiem tra Endpoint 1: GET /api/v1/admin/analytics/trends
  console.log('\n--- 1. KIEM TRA GET /api/v1/admin/analytics/trends ---');
  
  // 2.1 Kiem tra khong co token -> 401
  const resNoAuth1 = await fetch(`${baseUrl}/admin/analytics/trends`);
  console.log(`[AUTH CHECK] Khong token: HTTP Status = ${resNoAuth1.status} (Ky vong: 401)`);
  assert.strictEqual(resNoAuth1.status, 401);

  // 2.2 Kiem tra voi Admin Token hop le
  const resTrends = await fetch(`${baseUrl}/admin/analytics/trends?days=14`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });

  console.log(`[ADMIN AUTH] Token Admin hop le: HTTP Status = ${resTrends.status} (Ky vong: 200)`);
  assert.strictEqual(resTrends.status, 200);

  const dataTrends = await resTrends.json();
  assert.strictEqual(dataTrends.success, true);
  assert.strictEqual(typeof dataTrends.days, 'number');
  assert.strictEqual(dataTrends.days, 14);
  assert(Array.isArray(dataTrends.trends), 'dataTrends.trends phai la mang chuoi thoi gian');
  assert(dataTrends.summary, 'dataTrends.summary phai ton tai');

  console.log(`[KET QUA TRENDS] So ngay phan tich: ${dataTrends.days}`);
  console.log(`[KET QUA TRENDS] Do dai chuoi thoi gian: ${dataTrends.trends.length} diem du lieu`);
  console.log(`[KET QUA TRENDS] Tong doanh thu nap: ${dataTrends.summary.totalDeposits || 0} VND`);
  console.log(`[KET QUA TRENDS] Tong chi tra thuong: ${dataTrends.summary.totalPayouts || 0} VND`);
  console.log(`[KET QUA TRENDS] Tong luot tra loi: ${dataTrends.summary.totalResponses || 0}`);
  console.log(`[KET QUA TRENDS] Tong nguoi dung moi: ${dataTrends.summary.totalNewUsers || 0}`);
  console.log('[PASS] Endpoint /api/v1/admin/analytics/trends hoat dong on dinh 100%!');

  // 3. Kiem tra Endpoint 2: GET /api/v1/admin/audit-logs
  console.log('\n--- 2. KIEM TRA GET /api/v1/admin/audit-logs ---');

  // 3.1 Kiem tra khong co token -> 401
  const resNoAuth2 = await fetch(`${baseUrl}/admin/audit-logs`);
  console.log(`[AUTH CHECK] Khong token: HTTP Status = ${resNoAuth2.status} (Ky vong: 401)`);
  assert.strictEqual(resNoAuth2.status, 401);

  // 3.2 Kiem tra voi Admin Token hop le
  const resAudit = await fetch(`${baseUrl}/admin/audit-logs?page=1&limit=10`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });

  console.log(`[ADMIN AUTH] Token Admin hop le: HTTP Status = ${resAudit.status} (Ky vong: 200)`);
  assert.strictEqual(resAudit.status, 200);

  const dataAudit = await resAudit.json();
  assert.strictEqual(dataAudit.success, true);
  assert(Array.isArray(dataAudit.logs), 'dataAudit.logs phai la mang nhat ky kiem toan');
  assert(dataAudit.pagination, 'dataAudit.pagination phai ton tai');
  assert.strictEqual(typeof dataAudit.pagination.total, 'number');
  assert.strictEqual(typeof dataAudit.pagination.page, 'number');
  assert.strictEqual(typeof dataAudit.pagination.totalPages, 'number');

  console.log(`[KET QUA AUDIT] Tong so ban ghi nhat ky: ${dataAudit.pagination.total}`);
  console.log(`[KET QUA AUDIT] Trang hien tai: ${dataAudit.pagination.page}/${dataAudit.pagination.totalPages}`);
  console.log(`[KET QUA AUDIT] So ban ghi tra ve: ${dataAudit.logs.length}`);
  if (dataAudit.logs.length > 0) {
    console.log(`[KET QUA AUDIT] Mau ban ghi moi nhat: [${dataAudit.logs[0].action}] ${dataAudit.logs[0].description || 'N/A'}`);
  }
  console.log('[PASS] Endpoint /api/v1/admin/audit-logs hoat dong on dinh 100%!');

  console.log('\n=======================================================');
  console.log('[XAC MINH HOAN TAT] Ca 2 Endpoint Admin da dat tieu chuan 100%!');
  console.log('=======================================================');
}

main().catch(err => {
  console.error('\n[THAT BAI] Loi kiem tra Endpoint Admin:', err);
  process.exit(1);
});
