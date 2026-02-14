# Muse App Store & Instagram Story Mockup Creation Guide

## Overview
This guide will help you create professional app store preview tiles and Instagram story graphics following the Phia aesthetic.

## What You Have
✅ Screenshots captured from Muse app:
- Cart page (multi-store cart)
- Product Detail Page (PDP)
- Home/Newsfeed page
- Discover page
- Inspire page

✅ Logo files in `/frontend/public/`:
- `muse-wordmark-white.svg`
- `muse-lettermark-white.svg`
- `muse-wordmark-gradient.svg`

✅ Brand gradient (peach-to-blue) - now fixed in welcome page

## Design Specifications

### App Store Preview Tiles
**Size:** 1242 × 2208 px (iPhone 6.5" display)

**Style (following Phia):**
- Dark editorial background (deep blue/black gradient)
- Bold white headline at top (sans-serif, 96-120px)
- Italic subtext below headline (lighter weight, 64-80px)
- iPhone mockup at angle showing app screenshot
- Minimal, clean aesthetic

**Hero Messages:**
1. "All your favorites. One cart." → Use Cart screenshot
2. "We show you where to buy." → Use PDP screenshot
3. "Shop with ease." → Use Home/Inspire screenshot

### Instagram Story Graphics
**Size:** 1080 × 1920 px (9:16 aspect ratio)

**Style:** Similar to app store tiles but optimized for vertical stories

## Quick Creation Methods

### Option 1: Use Figma/Photoshop
1. Create artboard at 1242 × 2208 px
2. Add dark gradient background: `linear-gradient(135deg, #1a1a2e, #16213e, #0f1419)`
3. Add headline text (white, bold, top-aligned with 80-120px padding)
4. Add subtext in italics below
5. Import iPhone mockup frame (search "iPhone mockup PNG" or use Figma plugin)
6. Place your Muse screenshot inside the phone frame
7. Rotate phone slightly (-5 to -8 degrees) for dynamic look
8. Export as PNG

### Option 2: Use the HTML Template
I've created `/app-store-mockups.html` with the structure. You can:
1. Open the file in a browser
2. Use browser dev tools to inject your screenshots
3. Screenshot each tile at the correct resolution

### Option 3: Use Canva (Easiest)
1. Go to Canva.com
2. Create custom size: 1242 × 2208 px
3. Add dark gradient rectangle as background
4. Add text elements (headline + subtext)
5. Upload iPhone mockup template
6. Insert your Muse screenshots
7. Download as PNG

## Recommended iPhone Mockup Resources
- **Figma:** Search for "iPhone 14 Pro mockup" in community files
- **Free PNGs:** mockuphone.com, smartmockups.com
- **Canva:** Built-in phone frame elements

## Copy for Each Tile

### Tile 1: Unified Cart
**Headline:** All your favorites.
**Subtext (italic):** One cart.
**Screenshot:** Cart page showing multi-store items
**Key visual:** Show Nordstrom + Target items in one unified cart

### Tile 2: Price Comparison
**Headline:** We show you
**Subtext (italic):** where to buy.
**Screenshot:** Product detail page with retailer options
**Key visual:** Multiple retailer prices/options visible

### Tile 3: Discovery
**Headline:** Shop with
**Subtext (italic):** ease.
**Screenshot:** Home/Inspire feed with beautiful product imagery
**Key visual:** Editorial-style product grid or inspiration feed

## Typography Recommendations
- **Headline:** SF Pro Display Bold or Helvetica Neue Bold
- **Subtext:** SF Pro Display Light Italic or similar
- **Colors:** Pure white (#FFFFFF) for text on dark background

## Background Gradient Colors
Use these for the dark editorial aesthetic:
```css
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%);
```

Or vary slightly for each tile:
- Tile 1: `linear-gradient(135deg, #1a1a2e, #16213e, #0f1419)`
- Tile 2: `linear-gradient(135deg, #0f1419, #1a1a2e, #16213e)`
- Tile 3: `linear-gradient(135deg, #16213e, #0f1419, #1a1a2e)`

## Next Steps
1. Choose your preferred creation method above
2. Create the 3 hero tiles for app store
3. Adapt the same design for Instagram stories (1080 × 1920 px)
4. Export as high-quality PNGs
5. Upload to App Store Connect and use for Instagram marketing

## Pro Tips
- Keep phone mockup at ~60-70% of tile height for good proportions
- Ensure screenshot content is clearly visible in phone frame
- Use subtle shadow on phone mockup for depth: `0 50px 100px rgba(0,0,0,0.5)`
- Test readability of white text on dark background
- Match the minimal, editorial aesthetic of Phia examples

---

Need help? The mockup HTML template is in the repo root at `app-store-mockups.html`
