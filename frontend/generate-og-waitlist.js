const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateOGImage() {
  try {
    const logoPath = path.join(__dirname, 'frontend/public/icon-512.png');
    const outputPath = path.join(__dirname, 'frontend/public/images/og-waitlist.png');
    
    // Read the Muse icon
    const logoBuffer = fs.readFileSync(logoPath);
    
    // Create gradient background SVG
    const svgGradient = `
      <svg width="1200" height="630">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#F4A785;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8EC5FF;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#grad)" />
      </svg>
    `;
    
    // Create text overlay SVG
    const textSvg = `
      <svg width="1200" height="630">
        <style>
          .title { 
            fill: #2D2D2D; 
            font-size: 72px; 
            font-weight: 700; 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .subtitle { 
            fill: #2D2D2D; 
            font-size: 40px; 
            font-weight: 600; 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }
        </style>
        <text x="600" y="460" text-anchor="middle" class="title">Muse</text>
        <text x="600" y="530" text-anchor="middle" class="subtitle">Shop all your favorites, one cart</text>
      </svg>
    `;
    
    // Resize logo
    const resizedLogo = await sharp(logoBuffer)
      .resize(280, 280)
      .toBuffer();
    
    // Composite everything
    await sharp(Buffer.from(svgGradient))
      .resize(1200, 630)
      .composite([
        {
          input: resizedLogo,
          top: 100,
          left: 460
        },
        {
          input: Buffer.from(textSvg),
          top: 0,
          left: 0
        }
      ])
      .png()
      .toFile(outputPath);
    
    console.log('✅ OG image generated successfully!');
    console.log(`   Location: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating OG image:', error.message);
    process.exit(1);
  }
}

generateOGImage();
