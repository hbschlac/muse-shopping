# Muse App Store Mockups - Complete Specifications

## 🎯 Quick Start (Recommended: Use Canva)

### Step 1: Open Canva
Go to https://www.canva.com and create a custom design

### Step 2: Set Size
- Click "Custom size"
- Width: 1242 pixels
- Height: 2208 pixels
- Click "Create new design"

### Step 3: Create Tile 1 - "All your favorites. One cart."

#### Background
1. Add a rectangle (fill entire canvas)
2. Click "Color" → "Gradient"
3. Select "Linear gradient"
4. Set colors:
   - Stop 1 (0%): #1a1a2e
   - Stop 2 (45%): #16213e
   - Stop 3 (100%): #0f1419
5. Angle: 135 degrees

#### Text - Headline
1. Add text box at top (80px from top)
2. Text: "All your favorites."
3. Font: Helvetica Neue Bold (or SF Pro Display Bold)
4. Size: 104px
5. Color: #FFFFFF
6. Line height: 1.05
7. Letter spacing: -3

#### Text - Subtext
1. Add text box below headline (20px gap)
2. Text: "One cart."
3. Font: Helvetica Neue Light Italic
4. Size: 72px
5. Color: #FFFFFF
6. Opacity: 95%

#### iPhone Mockup
1. Search Canva elements for "iPhone mockup"
2. Choose a transparent/minimal mockup
3. Size: approximately 420px wide
4. Position: Center, below text
5. Rotate: -6 degrees
6. Add shadow: 60px blur, 60% opacity

#### Add Screenshot
1. Upload your Muse cart screenshot
2. Place it inside the phone screen
3. Crop to fit the phone display

### Step 4: Repeat for Tiles 2 & 3

**Tile 2: "We show you where to buy."**
- Background gradient: #0f1419 → #1a1a2e → #16213e
- Headline: "We show you"
- Subtext: "where to buy."
- Screenshot: Product Detail Page

**Tile 3: "Shop with ease."**
- Background gradient: #16213e → #0f1419 → #1a1a2e
- Headline: "Shop with"
- Subtext: "ease."
- Screenshot: Home/Inspire feed

### Step 5: Export
1. Click "Share" → "Download"
2. File type: PNG
3. Quality: High
4. Download all 3 tiles

---

## 🎨 Alternative: Figma Instructions

### Setup
1. Create new file in Figma
2. Create frame: 1242 × 2208px
3. Name it "Tile 1"

### Background Gradient
1. Select frame
2. Fill → Gradient → Linear
3. Add gradient stops:
   - 0%: #1a1a2e
   - 45%: #16213e
   - 100%: #0f1419
4. Rotate 135°

### Typography
- **Headline:** SF Pro Display Bold, 104px, #FFFFFF, -3% letter spacing
- **Subtext:** SF Pro Display Light Italic, 72px, #FFFFFF, 95% opacity

### iPhone Mockup
1. Find iPhone mockup PNG (search Figma community or use mockuphone.com)
2. Import to Figma
3. Place and rotate (-6°)
4. Add drop shadow: 0, 60, 120, 0.6

### Screenshots
1. Import your Muse app screenshots
2. Place inside phone frame using mask
3. Adjust sizing to fit naturally

---

## 📐 Exact Measurements

### Canvas
- Width: 1242px
- Height: 2208px
- Resolution: 72 DPI (Canva) or 144 DPI (Figma for 2x)

### Layout Spacing
- Top padding: 100px
- Side padding: 80px
- Headline to subtext: 20px
- Text to phone: 80px

### Typography Scale
- Headline: 104px / 700 weight / -3 tracking
- Subtext: 72px / 300 weight / italic

### Phone Mockup
- Width: 420px
- Height: ~860px (proportional)
- Rotation: -6 degrees
- Shadow: 0 60px 120px rgba(0,0,0,0.6)

### Colors
**Gradients:**
- Tile 1: linear-gradient(135deg, #1a1a2e, #16213e, #0f1419)
- Tile 2: linear-gradient(135deg, #0f1419, #1a1a2e, #16213e)
- Tile 3: linear-gradient(135deg, #16213e, #0f1419, #1a1a2e)

**Text:**
- White: #FFFFFF
- Subtext opacity: 95%

---

## 📱 Screenshots to Use

### Tile 1: Cart Page
Shows multi-store unified cart
- Nordstrom items + Target items
- Total price visible
- "2 separate orders from 2 stores" message
Location: http://localhost:3001/cart

### Tile 2: Product Detail Page
Shows product with retailer options
- Product image
- Price comparison visible
- Multiple retailer options
Location: http://localhost:3001/product/[any-product-id]

### Tile 3: Home/Inspire Feed
Shows beautiful product grid
- Editorial product imagery
- Grid layout visible
- Brand diversity
Location: http://localhost:3001/home or /inspire

---

## 🎬 For Instagram Stories

Same design, different size:
- Canvas: 1080 × 1920px
- Keep same ratios and styling
- Phone mockup slightly smaller (~380px wide)

---

## ✅ Quality Checklist

Before exporting, verify:
- [ ] Size is exactly 1242 × 2208px
- [ ] Text is crisp and readable on dark background
- [ ] Phone mockup has realistic shadow
- [ ] Screenshot fits naturally in phone frame
- [ ] Gradient is smooth (no banding)
- [ ] No pixelation or blur
- [ ] File format is PNG
- [ ] File size under 5MB for App Store

---

## 🚀 Ready-to-Use Resources

**Logo Files:**
- `/frontend/public/muse-wordmark-white.svg`
- `/frontend/public/muse-lettermark-white.svg`

**Mockup Templates Created:**
- `generate-mockups.html` - Interactive browser version
- `mockup-tiles-simple.html` - Simple single-tile version
- `create-mockups.js` - Automated Puppeteer script (requires setup)

**This Guide:**
- `MOCKUP_CREATION_GUIDE.md` - Detailed guide
- `FINAL-MOCKUP-SPECS.md` - This file (exact specs)

---

## 💡 Pro Tips

1. **Use Canva's phone mockup elements** - They're already optimized
2. **Export at 2x for retina** - Ensures crisp display
3. **Test on mobile** - View on your phone to check legibility
4. **Match Phia's aesthetic** - Dark, minimal, editorial
5. **Keep text concise** - Headlines should be punchy
6. **Show real UI** - Use actual Muse screenshots, not placeholders

---

**Need Help?**
All template files are in: `/Users/hannahschlacter/Desktop/muse-shopping/`
Screenshots captured earlier are available in browser screenshot history.

**Fastest Method:** Canva (15 minutes total for all 3 tiles)
**Most Control:** Figma (30 minutes for precise design)
**Automated:** Puppeteer script (requires Node.js setup)
