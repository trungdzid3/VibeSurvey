const fs = require('fs');

console.log('--- Vá lỗi nút Làm bài bị bẻ dòng (whitespace-nowrap) ---');
let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Thẻ Compact Survey Card
app = app.replace(
  `class="h-8 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">\n              <span>Làm bài</span>`,
  `class="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95">\n              <span class="whitespace-nowrap">Làm bài</span>`
);

app = app.replace(
  `class="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">\n                <span>Làm bài</span>`,
  `class="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95">\n                <span class="whitespace-nowrap">Làm bài</span>`
);

// 2. Thẻ List Survey Row
app = app.replace(
  `class="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">\n              <span>Làm bài</span>`,
  `class="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-blue-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95">\n              <span class="whitespace-nowrap">Làm bài</span>`
);

app = app.replace(
  `class="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95">\n              <span>Làm bài</span>`,
  `class="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95">\n              <span class="whitespace-nowrap">Làm bài</span>`
);

// 3. Nếu còn nút Làm bài nào khác trong app.js
app = app.replace(/<span>Làm bài<\/span>/g, '<span class="whitespace-nowrap">Làm bài</span>');

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('✅ Đã cập nhật toàn bộ nút Làm bài với whitespace-nowrap shrink-0!');
