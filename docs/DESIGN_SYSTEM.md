# Muse Shopping - Design System

**Version 1.0 | Last Updated: February 3, 2026**

## 🎯 Design North Star

> **"Instagram Explore that happens to sell things, NOT Amazon that happens to show pictures"**

### Core Principles

**Muse IS:**
- Calm
- Editorial
- Image-first
- Fashion-forward
- Joyful in small moments

**Muse is NOT:**
- Retail catalog
- Filter-heavy
- Cluttered
- Metadata-dense
- "Utility shopping"

### The Golden Rule

**"If a screen feels busy, remove something before adding anything."**

---

## 🎨 Color System

### Core Colors

```css
/* Neutrals - Foundation of the brand */
--color-ecru: #F6F3EE;
--color-white: #FFFFFF;
--color-charcoal: #1F1F1F;
--color-text-secondary: #6F6F6F;
--color-divider: #E9E5DF;
```

### Accent Colors (Use Sparingly)

```css
/* Warm accents */
--color-peach: #F4A785;
--color-coral: #F1785A;
--color-blush: #F6C6C1;

/* Cool accents */
--color-sky: #8EC5FF;
--color-lilac: #C8B6FF;
```

### Gradients

**Only use these exact gradients:**

```css
/* Primary CTA Gradient */
background: linear-gradient(135deg, #F4A785 0%, #F1785A 100%);

/* Playful Gradient (stories, special moments) */
background: linear-gradient(135deg, #F4A785 0%, #C8B6FF 50%, #8EC5FF 100%);
```

**Gradient Rules:**
- ❌ Never use as backgrounds
- ✅ Only on: buttons, tags, story rings
- Keep subtle and tasteful

---

## ✍️ Typography

### Font Family

**Primary Font (UI & Body):** Be Vietnam Pro
- 400 (Regular) - Body text
- 500 (Medium) - Labels, captions
- 600 (Semi-Bold) - Headings

**Brand Wordmark:** Handwritten/Script style
- Used for: Logo, special brand moments, hero sections
- Character: Warm, personal, editorial
- Style: Flowing, elegant, approachable

**Brand Icon:** "M" mark with underline
- Used for: App icon, favicon, loading states
- Character: Clean, modern, minimalist

### Type Scale

```css
/* Headings */
--text-h1: 600 32px/40px Be Vietnam Pro;
--text-h2: 600 24px/32px Be Vietnam Pro;
--text-h3: 600 20px/28px Be Vietnam Pro;
--text-h4: 600 18px/24px Be Vietnam Pro;

/* Body */
--text-body-large: 400 16px/24px Be Vietnam Pro;
--text-body: 400 14px/20px Be Vietnam Pro;
--text-body-small: 400 12px/16px Be Vietnam Pro;

/* UI Elements */
--text-label: 500 14px/20px Be Vietnam Pro;
--text-caption: 500 12px/16px Be Vietnam Pro;
--text-button: 600 16px/24px Be Vietnam Pro;
```

### Typography Rules

- Tight letter-spacing (tracking)
- Modern, not bubbly
- Not wide
- Clean and legible

---

## 📐 Spacing System

### Base Unit: 4px

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Layout Spacing

```css
/* Page-level spacing */
--page-margin: 16px;
--grid-gap: 12px;
--section-spacing: 20px;
```

**Whitespace is part of the brand.** Use it generously.

---

## 🔘 Border Radius

```css
--radius-search: 26px;
--radius-button: 24px;
--radius-card: 20px;
--radius-card-small: 16px;
--radius-story: 50%; /* Perfect circle */
```

**Consistency here matters more than color.**

---

## 🎭 Motion & Microinteractions

### Motion Principles

- **Fast** - Never slow
- **Subtle** - Not flashy
- **Springy** - Natural easing

### Allowed Microinteractions

✅ **DO:**
- Tile lift on tap (subtle elevation)
- Save heart pop (scale + color change)
- Gradient shimmer on CTA (on press)
- Skeleton loaders (during load states)

❌ **NEVER:**
- Confetti
- Loud transitions
- Onboarding animations
- Bouncy marketing stuff

### Animation Tokens

```css
--ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-fast: 150ms;
--duration-base: 250ms;
--duration-slow: 400ms;
```

---

## 🧩 Component Patterns

### Buttons

**Primary CTA**
```css
background: linear-gradient(135deg, #F4A785 0%, #F1785A 100%);
color: #FFFFFF;
border-radius: 24px;
padding: 14px 24px;
font: 600 16px/24px Be Vietnam Pro;
```

**Secondary Button**
```css
background: transparent;
border: 1px solid #E9E5DF;
color: #1F1F1F;
border-radius: 24px;
padding: 14px 24px;
```

**Ghost Button**
```css
background: transparent;
color: #1F1F1F;
padding: 14px 24px;
```

### Search Bar

```css
background: #FFFFFF;
border: 1px solid #E9E5DF;
border-radius: 26px;
padding: 12px 20px;
font: 400 16px/24px Be Vietnam Pro;
```

**Rules:**
- Must feel conversational, not filter-first
- Prominent on screen
- Never tiny

### Cards

**Product Tile**
```css
background: #FFFFFF;
border-radius: 20px;
overflow: hidden;
box-shadow: 0 2px 8px rgba(0,0,0,0.04);
```

**Tile Content Structure:**
1. Image (dominant, 16:9 or 3:4 aspect ratio)
2. Minimal metadata below (brand, price only)
3. Save heart (top right corner)

**Rules:**
- Image always dominates
- No ratings/stars
- No promo badges
- No dense metadata

### Story Rings

```css
border-radius: 50%;
padding: 2px;
background: linear-gradient(135deg, #F4A785 0%, #C8B6FF 50%, #8EC5FF 100%);
```

---

## 🏗️ Layout Structure

### Navigation

**Bottom Tabs Only** (5 tabs max)
- Home
- Search
- Muse (chat)
- Saves
- Profile

**Rules:**
- ❌ No floating action buttons
- ❌ No hidden hamburger menus
- ✅ Always visible, always accessible

### Grid System

**Product Grid:**
```css
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 12px;
padding: 16px;
```

**Feed/Newsfeed:**
- Full-width images
- Minimal metadata
- Image-first layout
- No banners

---

## 🚫 Anti-Patterns (NEVER SHIP)

### Visual Anti-Patterns

❌ Grey backgrounds
❌ Beige/earthy palettes beyond our ecru
❌ Dense metadata under tiles
❌ Ratings/stars everywhere
❌ "20% off" badges
❌ Promo banners
❌ Carousels inside carousels
❌ Tiny search bars
❌ 20 filter pills in a row

### UX Anti-Patterns

❌ Chatbot as modal
❌ Login wall before browsing
❌ Too many modules on home
❌ Filter-first search experience
❌ Hidden navigation
❌ Cluttered product pages
❌ Metadata-heavy layouts

---

## 📱 Screen-Specific Rules

### Home Screen

- Image-first feed
- No banners
- Minimal UI chrome
- Guest browsing allowed

### Search Screen

- Conversational search bar (prominent)
- Not filter-first
- Clean results
- Image-dominant tiles

### Muse Chat (My Muse)

- Persistent tab (never modal)
- State never lost
- Conversational UI
- Friendly, helpful tone

### Product Detail Page (PDP)

1. Image first (top, full-width)
2. CTA above fold
3. Details collapsed/expandable
4. Minimal metadata shown by default

### Saves/Favorites

- Feels like closet/moodboard
- NOT like a spreadsheet
- Visual, grid-based
- Easy to organize (collections)

### Profile

- Utility only
- No brand playfulness here
- Clean, functional
- Settings and account management

### Auth

- Guest browsing allowed
- No login wall
- Simple, fast signup
- OAuth options prominent

---

## 🎯 Brand Inspiration

### Muse Should Feel Like:

✅ Instagram
✅ Nuuly
✅ Apple Store
✅ Zara app
✅ Pinterest

### Muse Should NOT Feel Like:

❌ Walmart
❌ Amazon
❌ eBay
❌ Shein
❌ Shopify template stores

---

## 📏 Accessibility

### Minimum Touch Targets

- Buttons: 44x44px minimum
- Tappable cards: 48px minimum height

### Color Contrast

- Body text on ecru: minimum 4.5:1
- Labels on white: minimum 4.5:1
- Always test with tools

### Focus States

```css
outline: 2px solid #F1785A;
outline-offset: 2px;
```

---

## 🛠️ Implementation Notes

### CSS Custom Properties

All tokens should be defined as CSS custom properties for easy theming and consistency:

```css
:root {
  /* Colors */
  --color-ecru: #F6F3EE;
  --color-white: #FFFFFF;
  --color-charcoal: #1F1F1F;
  /* ... all other tokens */

  /* Spacing */
  --space-4: 16px;
  /* ... */

  /* Typography */
  --font-primary: 'Be Vietnam Pro', sans-serif;
  /* ... */
}
```

### Component Architecture

**Recommended Structure:**
```
components/
├── atoms/ (buttons, inputs, icons)
├── molecules/ (search bar, product tile, nav item)
├── organisms/ (header, product grid, feed)
└── templates/ (page layouts)
```

### State Management

- Keep it simple
- Local state preferred
- Avoid over-engineering
- Only add complexity when needed

---

## 📦 Assets Needed

### Fonts

- [ ] Be Vietnam Pro (400, 500, 600 weights)
- [ ] Editorial/Canela-style serif for wordmark

### Logo

**Primary Wordmark:**
- Handwritten script "Muse"
- Use on: Homepage hero, splash screens, about page
- Format: SVG (preferred), PNG fallback

**App Icon/Mark:**
- "M" with underline
- Use on: App icon, favicon, loading states, small spaces
- Format: SVG, PNG, ICO for favicon

**Logo Usage:**
- Full wordmark on desktop/large screens
- "M" mark on mobile nav, small contexts
- Always maintain ecru or white background
- Never place on busy images without overlay

### Icons

- Use a consistent icon set (e.g., Heroicons, Feather Icons)
- Line style, not filled
- 24x24px base size
- Stroke width: 1.5px

---

## ✅ Design Checklist

Before shipping any screen:

- [ ] Does it feel calm, not cluttered?
- [ ] Is imagery dominant?
- [ ] Is metadata minimal?
- [ ] Are we using approved colors only?
- [ ] Are we using correct spacing tokens?
- [ ] Does it match our brand inspiration (Instagram, Apple)?
- [ ] Does it avoid all anti-patterns?
- [ ] Are touch targets at least 44px?
- [ ] Did we remove something before adding anything?

---

## 🎨 Brand Personality

Describing Muse as a person:

- Gender-neutral (like "Ryan" or "Evan")
- Millennial, early to mid-30s
- Fun and playful with GenZ flare
- Organized and trustworthy
- Well-traveled (NY, SF, Sydney, Barcelona, Paris, Tokyo)
- West Elm/Crate & Barrel aesthetic with personal touches
- Hospitable, warm, friendly
- Inspired by Apple's simple, delightful approach

When making design decisions, ask: "What would this person choose?"

---

## 📞 Questions or Clarifications

For any questions about this design system, refer to:
- Muse Branding Mood Board
- Design Specs Front-end Doc
- Presentation - FINAL MASTER.pdf

---

**Built with care by Hannah & Claude 🤍**
