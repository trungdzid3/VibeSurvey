const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/logo.svg');
const content = fs.readFileSync(svgPath, 'utf8');

const lightCss = `      :root {
        --logo-primary: #EA580C;
        --logo-accent: #F97316;
        --logo-base-dark: #121214;
        --logo-stroke: #09090B;
        --logo-fill: #FFFFFF;
        --logo-surface: #F8F9FA;
        --logo-border: #E4E4E7;
        --logo-muted: #71717A;
      }`;

const darkCss = `      :root {
        --logo-primary: #EA580C;
        --logo-accent: #F97316;
        --logo-base-dark: #121214;
        --logo-stroke: #F8FAFC;
        --logo-fill: #1C1C20;
        --logo-surface: #121214;
        --logo-border: #2E2E36;
        --logo-muted: #A1A1AA;
      }`;

const styleRegex = /:root\s*\{[\s\S]*?@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\}\s*\}/;

if (!styleRegex.test(content)) {
  console.error('Khong tim thay cum style can thay the trong public/logo.svg');
  process.exit(1);
}

const lightContent = content.replace(styleRegex, lightCss);
const darkContent = content.replace(styleRegex, darkCss);

fs.writeFileSync(path.join(__dirname, '../public/logo-light.svg'), lightContent, 'utf8');
fs.writeFileSync(path.join(__dirname, '../public/logo-dark.svg'), darkContent, 'utf8');
console.log('Tao logo-light.svg va logo-dark.svg thanh cong!');
