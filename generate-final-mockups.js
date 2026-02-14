#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create SVG mockups with the CORRECT peach-to-blue gradient (same as welcome page)
const tiles = [
  {
    name: '01-all-your-favorites-one-cart',
    headline: 'All your\nfavorites.',
    subtext: 'One cart.',
    screenshotNote: 'Cart page'
  },
  {
    name: '02-we-show-you-where-to-buy',
    headline: 'We show you',
    subtext: 'where to buy.',
    screenshotNote: 'Product Detail Page'
  },
  {
    name: '03-shop-with-ease',
    headline: 'Shop with',
    subtext: 'ease.',
    screenshotNote: 'Home/Inspire feed'
  }
];

// The correct peach-to-blue gradient (from welcome page CSS)
// --gradient-welcome: linear-gradient(to right, #F4C4B0 0%, #E8C5D4 25%, #D8D0E8 50%, #C8D8F0 75%, #B8D8F8 100%);
const gradientStops = [
  { offset: '0%', color: '#F4C4B0' },
  { offset: '25%', color: '#E8C5D4' },
  { offset: '50%', color: '#D8D0E8' },
  { offset: '75%', color: '#C8D8F0' },
  { offset: '100%', color: '#B8D8F8' }
];

const outputDir = path.join(__dirname, 'mockups-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

tiles.forEach(tile => {
  const stops = gradientStops.map(stop =>
    `    <stop offset="${stop.offset}" stop-color="${stop.color}" stop-opacity="1" />`
  ).join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1242" height="2208" viewBox="0 0 1242 2208" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="museGradient" x1="0%" y1="0%" x2="100%" y2="0%">
${stops}
    </linearGradient>
    <filter id="phoneShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="40"/>
      <feOffset dx="0" dy="30" result="offsetblur"/>
      <feFlood flood-color="#000000" flood-opacity="0.3"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background with Muse peach-to-blue gradient -->
  <rect width="1242" height="2208" fill="url(#museGradient)"/>

  <!-- Headline -->
  <text x="80" y="180" font-family="'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="104" font-weight="600" fill="#1F1F1F" style="letter-spacing: -3px;">
    ${tile.headline.split('\n').map((line, i) =>
      `<tspan x="80" dy="${i > 0 ? '110' : '0'}">${line}</tspan>`
    ).join('\n    ')}
  </text>

  <!-- Subtext -->
  <text x="80" y="${tile.headline.split('\n').length > 1 ? '430' : '320'}" font-family="'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="72" font-weight="400" font-style="italic" fill="#1F1F1F" fill-opacity="0.8">
    ${tile.subtext}
  </text>

  <!-- Phone Frame -->
  <g transform="translate(411, 600) rotate(-6)">
    <!-- Phone body with shadow -->
    <rect x="0" y="0" width="420" height="860" rx="55" fill="#1c1c1e" filter="url(#phoneShadow)"/>

    <!-- Screen -->
    <rect x="12" y="12" width="396" height="836" rx="46" fill="#FAFAF8"/>

    <!-- Dynamic Island -->
    <rect x="148" y="24" width="125" height="37" rx="19" fill="#000000"/>

    <!-- Screenshot placeholder area -->
    <rect x="12" y="70" width="396" height="780" fill="#FFFFFF" fill-opacity="0.3"/>
    <text x="210" y="440" font-family="-apple-system, system-ui, sans-serif" font-size="20" fill="#666666" text-anchor="middle" opacity="0.7">
      Insert ${tile.screenshotNote}
    </text>
    <text x="210" y="480" font-family="-apple-system, system-ui, sans-serif" font-size="18" fill="#999999" text-anchor="middle" opacity="0.6">
      screenshot here
    </text>
  </g>

</svg>`;

  const filePath = path.join(outputDir, `${tile.name}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`✓ Created: ${tile.name}.svg`);
});

console.log('\n🎉 All mockup SVG files created with correct peach-to-blue gradient!');
console.log(`📁 Location: ${outputDir}`);
console.log('\n🎨 Gradient: Peach → Pink → Lavender → Light Blue → Soft Blue');
console.log('📝 Text color: Dark gray (#333) for better readability on light background');
