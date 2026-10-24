const tls = require('tls');
const config = require('../server/config');

async function testImap() {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: 'imap.gmail.com', port: 993, rejectUnauthorized: false }, () => {
      console.log('Connected to IMAP Gmail');
    });

    let step = 0;
    socket.on('data', (d) => {
      const str = d.toString();
      // console.log('IMAP <<', str.trim());
      if (step === 0 && str.includes('* OK')) {
        step = 1;
        socket.write(`a1 LOGIN ${config.SMTP.USER} ${config.SMTP.PASS}\r\n`);
      } else if (step === 1 && str.includes('a1 OK')) {
        console.log('✅ IMAP Đăng nhập thành công!');
        step = 2;
        // Kiểm tra hộp thư Sent Mail của Gmail: '[Gmail]/Sent Mail'
        socket.write('a2 SELECT "[Gmail]/Sent Mail"\r\n');
      } else if (step === 2 && str.includes('a2 OK')) {
        console.log('✅ Đã truy cập hộp thư [Gmail]/Sent Mail!');
        step = 3;
        // Tìm kiếm các email có Subject VibeSurvey
        socket.write('a3 SEARCH SUBJECT "VibeSurvey"\r\n');
      } else if (step === 3 && str.includes('a3 OK')) {
        const match = str.match(/\* SEARCH ([\d\s]+)/);
        const uids = match && match[1] ? match[1].trim().split(/\s+/) : [];
        console.log('Tìm thấy các email VibeSurvey vừa gửi, số lượng ID:', uids.length, uids.slice(-5));
        step = 4;
        socket.write('a4 LOGOUT\r\n');
      } else if (step === 4) {
        socket.end();
        resolve(true);
      }
    });

    socket.on('error', (e) => {
      console.log('IMAP err:', e.message);
      resolve(false);
    });
  });
}

testImap();
