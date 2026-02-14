#!/usr/bin/env node

/**
 * Muse App Store Mockup Generator
 * Creates 1242x2208px mockup images using Puppeteer
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const MOCKUP_WIDTH = 1242;
const MOCKUP_HEIGHT = 2208;

async function createMockups() {
  console.log('🎨 Starting Muse mockup generation...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: {
      width: MOCKUP_WIDTH,
      height: MOCKUP_HEIGHT,
      deviceScaleFactor: 2 // Retina quality
    }
  });

  const page = await browser.newPage();

  // Load the mockup HTML file
  const htmlPath = 'file://' + path.join(__dirname, 'generate-mockups.html');
  console.log(`📄 Loading mockup template from: ${htmlPath}`);
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });

  // Create output directory
  const outputDir = path.join(__dirname, 'mockups-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Capture each tile
  const tiles = [
    { id: 'tile1', name: '01-all-your-favorites-one-cart', description: 'Tile 1: All your favorites. One cart.' },
    { id: 'tile2', name: '02-we-show-you-where-to-buy', description: 'Tile 2: We show you where to buy.' },
    { id: 'tile3', name: '03-shop-with-ease', description: 'Tile 3: Shop with ease.' }
  ];

  for (const tile of tiles) {
    console.log(`📸 Capturing ${tile.description}...`);

    // Scroll to the tile
    await page.evaluate((tileId) => {
      const element = document.getElementById(tileId);
      element.scrollIntoView({ block: 'start' });
    }, tile.id);

    // Wait a moment for any animations
    await page.waitForTimeout(500);

    // Take screenshot of the specific tile
    const element = await page.$(`#${tile.id}`);
    const outputPath = path.join(outputDir, `${tile.name}.png`);

    await element.screenshot({
      path: outputPath,
      type: 'png'
    });

    console.log(`   ✅ Saved: ${outputPath}`);
  }

  await browser.close();

  console.log('\n🎉 All mockups generated successfully!');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('\nGenerated files:');
  console.log('  - 01-all-your-favorites-one-cart.png (1242x2208px)');
  console.log('  - 02-we-show-you-where-to-buy.png (1242x2208px)');
  console.log('  - 03-shop-with-ease.png (1242x2208px)');
  console.log('\n✨ Ready for App Store and Instagram!');
}

createMockups().catch(error => {
  console.error('❌ Error generating mockups:', error);
  process.exit(1);
});
