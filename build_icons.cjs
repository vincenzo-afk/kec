const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'favicon.svg');
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [48, 72, 96, 144, 192, 512];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons().catch(console.error);
