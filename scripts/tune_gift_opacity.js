const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

// Cập nhật độ mờ hộp quà mờ mờ trong suốt nhẹ nhàng
content = content.replaceAll(
  'class="absolute right-2 top-2 w-24 sm:w-28 h-auto object-contain pointer-events-none select-none z-0 opacity-80 dark:opacity-40"',
  'class="absolute right-2 top-2 w-20 sm:w-24 h-auto object-contain pointer-events-none select-none z-0 opacity-35 dark:opacity-20"'
);

fs.writeFileSync('public/app.js', content, 'utf8');
console.log('Updated gift box opacity in public/app.js');
