#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create SVG mockups that can be opened in Figma
const tiles = [
  {
    name: '01-all-your-favorites-one-cart',
    gradient: { start: '#1a1a2e', mid: '#16213e', end: '#0f1419' },
    headline: 'All your\nfavorites.',
    subtext: 'One cart.'
  },
  {
    name: '02-we-show-you-where-to-buy',
    gradient: { start: '#0f1419', mid: '#1a1a2e', end: '#16213e' },
    headline: 'We show you',
    subtext: 'where to buy.'
  },
  {
    name: '03-shop-with-ease',
    gradient: { start: '#16213e', mid: '#0f1419', end: '#1a1a2e' },
    headline: 'Shop with',
    subtext: 'ease.'
  }
];

const outputDir = path.join(__dirname, 'mockups-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

tiles.forEach(tile => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1242" height="2208" viewBox="0 0 1242 2208" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${tile.name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tile.gradient.start};stop-opacity:1" />
      <stop offset="45%" style="stop-color:${tile.gradient.mid};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${tile.gradient.end};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1242" height="2208" fill="url(#bg-${tile.name})"/>

  <!-- Headline -->
  <text x="80" y="180" font-family="Helvetica, Arial, sans-serif" font-size="104" font-weight="700" fill="#ffffff" letter-spacing="-3">
    ${tile.headline.split('\n').map((line, i) =>
      `<tspan x="80" dy="${i > 0 ? '110' : '0'}">${line}</tspan>`
    ).join('\n    ')}
  </text>

  <!-- Subtext -->
  <text x="80" y="${tile.headline.split('\n').length > 1 ? '430' : '320'}" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="300" font-style="italic" fill="#ffffff" fill-opacity="0.95">
    ${tile.subtext}
  </text>

  <!-- Phone Frame -->
  <g transform="translate(411, 600) rotate(-6)">
    <!-- Phone body -->
    <rect x="0" y="0" width="420" height="860" rx="55" fill="#1c1c1e"
          filter="drop-shadow(0 60px 120px rgba(0,0,0,0.6))"/>

    <!-- Screen -->
    <rect x="12" y="12" width="396" height="836" rx="46" fill="#f5f5f5"/>

    <!-- Dynamic Island -->
    <rect x="148" y="24" width="125" height="37" rx="19" fill="#000000"/>

    <!-- Placeholder for screenshot -->
    <rect x="12" y="70" width="396" height="780" fill="#FAFAF8"/>
    <text x="210" y="480" font-family="system-ui" font-size="24" fill="#999999" text-anchor="middle">
      [Insert Screenshot]
    </text>
  </g>

  <!-- Instructions (will be deleted in Figma) -->
  <rect x="50" y="2050" width="1142" height="120" rx="12" fill="rgba(255,255,255,0.05)"/>
  <text x="621" y="2100" font-family="system-ui" font-size="18" fill="#ffffff" text-anchor="middle" opacity="0.7">
    Import to Figma → Delete this instruction box → Insert your Muse screenshot in the phone frame
  </text>
  <text x="621" y="2130" font-family="system-ui" font-size="16" fill="#ffffff" text-anchor="middle" opacity="0.5">
    Screenshot needed: ${tile.name.includes('favorites') ? 'Cart page' : tile.name.includes('where') ? 'Product Detail Page' : 'Home/Inspire feed'}
  </text>
</svg>`;

  const filePath = path.join(outputDir, `${tile.name}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`✓ Created: ${tile.name}.svg`);
});

console.log('\n🎉 All mockup SVG files created!');
console.log(`📁 Location: ${outputDir}`);
console.log('\n📝 Next steps:');
console.log('1. Open each SVG file in Figma (File → Import)');
console.log('2. Delete the instruction box at the bottom');
console.log('3. Insert your Muse app screenshot into the phone frame');
console.log('4. Use Figma\'s "Place image" to add screenshot');
console.log('5. Export as PNG (1242x2208px)');
console.log('\n✨ Ready for App Store!');
