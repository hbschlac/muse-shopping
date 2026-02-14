#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create SVG mockups with PROPER gradients
const tiles = [
  {
    name: '01-all-your-favorites-one-cart',
    gradient: {
      id: 'grad1',
      x1: '0%', y1: '0%',
      x2: '100%', y2: '100%',
      stops: [
        { offset: '0%', color: '#1a1a2e' },
        { offset: '45%', color: '#16213e' },
        { offset: '100%', color: '#0f1419' }
      ]
    },
    headline: 'All your\nfavorites.',
    subtext: 'One cart.'
  },
  {
    name: '02-we-show-you-where-to-buy',
    gradient: {
      id: 'grad2',
      x1: '0%', y1: '0%',
      x2: '100%', y2: '100%',
      stops: [
        { offset: '0%', color: '#0f1419' },
        { offset: '55%', color: '#1a1a2e' },
        { offset: '100%', color: '#16213e' }
      ]
    },
    headline: 'We show you',
    subtext: 'where to buy.'
  },
  {
    name: '03-shop-with-ease',
    gradient: {
      id: 'grad3',
      x1: '0%', y1: '0%',
      x2: '100%', y2: '100%',
      stops: [
        { offset: '0%', color: '#16213e' },
        { offset: '45%', color: '#0f1419' },
        { offset: '100%', color: '#1a1a2e' }
      ]
    },
    headline: 'Shop with',
    subtext: 'ease.'
  }
];

const outputDir = path.join(__dirname, 'mockups-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

tiles.forEach(tile => {
  const gradientStops = tile.gradient.stops.map(stop =>
    `    <stop offset="${stop.offset}" stop-color="${stop.color}" stop-opacity="1" />`
  ).join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1242" height="2208" viewBox="0 0 1242 2208" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${tile.gradient.id}" x1="${tile.gradient.x1}" y1="${tile.gradient.y1}" x2="${tile.gradient.x2}" y2="${tile.gradient.y2}">
${gradientStops}
    </linearGradient>
  </defs>

  <!-- Background with gradient -->
  <rect width="1242" height="2208" fill="url(#${tile.gradient.id})"/>

  <!-- Headline -->
  <text x="80" y="180" font-family="Helvetica, Arial, sans-serif" font-size="104" font-weight="700" fill="#ffffff" style="letter-spacing: -3px;">
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
    <!-- Phone body with shadow -->
    <defs>
      <filter id="shadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="60"/>
        <feOffset dx="0" dy="60" result="offsetblur"/>
        <feFlood flood-color="#000000" flood-opacity="0.6"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <rect x="0" y="0" width="420" height="860" rx="55" fill="#1c1c1e" filter="url(#shadow)"/>

    <!-- Screen -->
    <rect x="12" y="12" width="396" height="836" rx="46" fill="#f5f5f5"/>

    <!-- Dynamic Island -->
    <rect x="148" y="24" width="125" height="37" rx="19" fill="#000000"/>

    <!-- Placeholder for screenshot -->
    <rect x="12" y="70" width="396" height="780" fill="#FAFAF8"/>
    <text x="210" y="480" font-family="system-ui, sans-serif" font-size="24" fill="#999999" text-anchor="middle">
      [Insert Screenshot]
    </text>
  </g>

</svg>`;

  const filePath = path.join(outputDir, `${tile.name}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`✓ Created: ${tile.name}.svg (with proper gradient)`);
});

console.log('\n🎉 All mockup SVG files created with proper gradients!');
console.log(`📁 Location: ${outputDir}`);
console.log('\n✨ Each tile now has a unique dark gradient background');
