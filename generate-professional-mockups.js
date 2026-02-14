#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Professional App Store Mockups - Based on Phia aesthetic
 * Design Director Review: Proper hierarchy, spacing, and visual balance
 */

const tiles = [
  {
    name: '01-all-your-favorites-one-cart',
    headline: 'All your favorites.',
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

// Muse brand gradient
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

    <!-- Professional phone shadow with multiple layers -->
    <filter id="phoneShadow" x="-100%" y="-100%" width="300%" height="300%">
      <!-- Large soft shadow -->
      <feGaussianBlur in="SourceAlpha" stdDeviation="50" result="blur1"/>
      <feOffset in="blur1" dx="0" dy="40" result="offset1"/>
      <feFlood flood-color="#000000" flood-opacity="0.25"/>
      <feComposite in2="offset1" operator="in" result="shadow1"/>

      <!-- Medium shadow for depth -->
      <feGaussianBlur in="SourceAlpha" stdDeviation="25" result="blur2"/>
      <feOffset in="blur2" dx="0" dy="20" result="offset2"/>
      <feFlood flood-color="#000000" flood-opacity="0.15"/>
      <feComposite in2="offset2" operator="in" result="shadow2"/>

      <!-- Merge shadows -->
      <feMerge>
        <feMergeNode in="shadow1"/>
        <feMergeNode in="shadow2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background gradient -->
  <rect width="1242" height="2208" fill="url(#museGradient)"/>

  <!-- Text Section - Proper editorial spacing -->
  <g id="textContent">
    <!-- Headline - Bold, confident -->
    <text x="100" y="220" font-family="'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif"
          font-size="88" font-weight="600" fill="#1F1F1F" letter-spacing="-2">
      ${tile.headline}
    </text>

    <!-- Subtext - Elegant italic -->
    <text x="100" y="310" font-family="'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif"
          font-size="56" font-weight="400" font-style="italic" fill="#1F1F1F" fill-opacity="0.75">
      ${tile.subtext}
    </text>
  </g>

  <!-- iPhone Mockup - Hero element with proper scale and positioning -->
  <g transform="translate(250, 550)">
    <!-- Phone with 3D perspective and shadow -->
    <g transform="rotate(-8) skewY(2)">
      <!-- Phone body - Premium feel -->
      <rect x="0" y="0" width="520" height="1060" rx="68"
            fill="#0a0a0a" filter="url(#phoneShadow)"/>

      <!-- Subtle phone edge highlight -->
      <rect x="2" y="2" width="516" height="1056" rx="66"
            fill="none" stroke="url(#phoneEdge)" stroke-width="1" opacity="0.3"/>

      <!-- Screen bezel -->
      <rect x="14" y="14" width="492" height="1032" rx="58" fill="#000000"/>

      <!-- Actual screen -->
      <rect x="18" y="18" width="484" height="1024" rx="54" fill="#FAFAF8"/>

      <!-- Dynamic Island -->
      <ellipse cx="260" cy="50" rx="65" ry="22" fill="#000000"/>

      <!-- Screenshot area with subtle inner shadow -->
      <defs>
        <clipPath id="screenClip">
          <rect x="18" y="90" width="484" height="950" rx="54"/>
        </clipPath>
      </defs>

      <rect x="18" y="90" width="484" height="950" fill="#FFFFFF" fill-opacity="0.4"
            clip-path="url(#screenClip)"/>

      <!-- Screenshot placeholder text - minimal -->
      <text x="260" y="540" font-family="-apple-system, sans-serif" font-size="18"
            fill="#999999" text-anchor="middle" opacity="0.5">
        [${tile.screenshotNote}]
      </text>
    </g>
  </g>

  <!-- Edge gradient for phone highlight -->
  <defs>
    <linearGradient id="phoneEdge" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Subtle muse branding at bottom -->
  <text x="100" y="2140" font-family="'Be Vietnam Pro', sans-serif" font-size="14"
        fill="#1F1F1F" opacity="0.3" letter-spacing="1">
    MUSE
  </text>

</svg>`;

  const filePath = path.join(outputDir, `${tile.name}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`✓ ${tile.name}.svg - Professional grade`);
});

console.log('\n🎨 Professional mockups created!');
console.log('\nDesign improvements:');
console.log('  ✓ Reduced text size for better hierarchy (88px/56px)');
console.log('  ✓ Larger iPhone mockup as hero element (520×1060)');
console.log('  ✓ 3D perspective with rotation + skew');
console.log('  ✓ Multi-layer shadows for depth');
console.log('  ✓ Proper editorial spacing and margins');
console.log('  ✓ Subtle Muse branding');
console.log('  ✓ Phone edge highlights for premium feel');
