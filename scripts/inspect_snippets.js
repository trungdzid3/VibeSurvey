const fs = require('fs');
const content = fs.readFileSync('public/app.js', 'utf8');

console.log('--- 1. Point Card 3D image snippet ---');
const pointIdx = content.indexOf('wallet_3d_master.png');
if (pointIdx !== -1) {
  console.log(content.substring(pointIdx - 100, pointIdx + 150));
}

console.log('--- 2. Credit Card 3D image snippet ---');
const creditIdx = content.indexOf('coins_coupon_3d_master.png');
if (creditIdx !== -1) {
  console.log(content.substring(creditIdx - 100, creditIdx + 150));
}

console.log('--- 3. Studio Toggle Switch snippet ---');
const reqIdx = content.indexOf('req-toggle-wrap-');
if (reqIdx !== -1) {
  console.log(content.substring(reqIdx - 50, reqIdx + 500));
}
