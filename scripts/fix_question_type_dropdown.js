const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'public', 'app.js');
let content = fs.readFileSync(appPath, 'utf8');

// Tìm đoạn dropdown loại câu hỏi studio
const oldDropdownHeader = `<div id="studio-q-type-\${qIdx}" class="custom-dropdown-menu hidden absolute right-0 z-50 mt-1.5 min-w-[280px] p-2 rounded-2xl bg-white dark:bg-[#18181B] border border-stone-200 dark:border-stone-700 shadow-2xl space-y-1">`;

const newDropdownHeader = `<div id="studio-q-type-\${qIdx}" class="custom-dropdown-menu hidden absolute right-0 z-50 mt-1.5 min-w-[280px] max-h-[360px] sm:max-h-[390px] overflow-y-auto overscroll-contain p-2 rounded-2xl bg-white dark:bg-[#1C1C20] border border-stone-200 dark:border-[#2E2E36] shadow-2xl space-y-0.5 scrollbar-thin">`;

if (content.includes(oldDropdownHeader)) {
  content = content.replace(oldDropdownHeader, newDropdownHeader);
  
  // Tinh gọn padding của các items trong menu để gọn gàng hơn
  // Thay thế p-2 thành py-1.5 px-2.5 text-xs
  const dropdownSectionRegex = /(<div id="studio-q-type-\$\{qIdx\}"[\s\S]*?)(<!-- Question Image Preview)/;
  content = content.replace(dropdownSectionRegex, (match, dropdownPart, afterPart) => {
    let updatedPart = dropdownPart.replace(/class="flex items-center justify-between p-2 rounded-xl/g, 'class="flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs');
    updatedPart = updatedPart.replace(/text-\[10px\] font-black uppercase text-stone-400 tracking-wider/g, 'text-[9.5px] font-black uppercase text-stone-400 dark:text-stone-500 tracking-wider');
    return updatedPart + afterPart;
  });

  fs.writeFileSync(appPath, content, 'utf8');
  console.log('Successfully updated question type dropdown in public/app.js!');
} else {
  console.error('Could not find oldDropdownHeader in public/app.js');
  process.exit(1);
}
