const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, '..', 'public', 'assets', '3d'),
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'assets', '3d')
];

let total = 0;
for (const dir of dirs) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('<svg') || !content.includes('</svg>')) {
      console.error('Invalid SVG structure: ' + filePath);
      process.exit(1);
    }
    if (content.includes('<image')) {
      console.error('Found image tag in: ' + filePath);
      process.exit(1);
    }
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    console.log(`OK: ${file} (dir: ${path.basename(path.dirname(dir))}) - viewBox: ${viewBoxMatch ? viewBoxMatch[1] : 'none'}`);
    total++;
  }
}

console.log(`Success! Checked ${total} SVG files across public and android directories.`);
