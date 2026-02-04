# Muse Branding & Design Guidelines

## Core Principles
- **"Instagram Explore that sells things, NOT Amazon with pictures"**
- **If a screen feels busy, remove something before adding anything**
- Calm > Playful
- Quality > Quantity

## Typography
- **Font**: Be Vietnam Pro (all weights: 400, 500, 600)
- **Body text**: Always 16px
- **Font loading**: Use Next.js Google Fonts with `display: 'swap'`

## Color Palette

### Primary Colors (85% usage - Neutrals)
- Background (Ecru): `#FAFAF8`
- White: `#FFFFFF`
- Charcoal: `#1F1F1F`
- Divider: `#E9E5DF`

### Fabric Background Palette
- `--muse-0`: `#EBE0D5`
- `--muse-1`: `#D6C8BA`
- `--muse-2`: `#CBB6A8`
- `--muse-3`: `#B4A597`
- `--muse-4`: `#6A5950`

### Accent Colors (5% usage - buttons only)
- Peach: `#F4A785`
- Coral: `#F1785A`
- Blue: `#8EC5FF`

### Gradient (Primary CTA only)
```css
--gradient-primary: linear-gradient(135deg, #F4A785 0%, #8EC5FF 100%);
```

## Spacing & Layout
- **Border Radius**: 12px everywhere (hard rule)
- **Spacing Scale**: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

## Shadows
```css
--shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.05);
--shadow-base: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lifted: 0 8px 24px rgba(0, 0, 0, 0.12);
```

## Animations
- **Duration**: 150ms (base), 200ms (slow)
- **Easing**: ease-out
- Keep animations subtle and calm

## Liquid Glass Buttons (Apple-style)
```tsx
className="bg-white/40 backdrop-blur-md rounded-[12px] border border-gray-900/10
  transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] shadow-subtle"
```

### Button Variants
1. **Dark Glass**: `bg-gray-900/20 backdrop-blur-md text-gray-900`
2. **White Glass**: `bg-white/40 backdrop-blur-md text-gray-900`
3. **Accent Glass**: `bg-[#F4A785]/30 backdrop-blur-md text-gray-900`

## Fabric Background Effect
```css
.app-hero {
  isolation: isolate;
  background:
    radial-gradient(120% 100% at 50% 15%, rgba(255,255,255,0.35), transparent 60%),
    radial-gradient(160% 120% at 50% 85%, rgba(0,0,0,0.10), transparent 70%),
    linear-gradient(160deg, #efe3d7 0%, #e6d6c6 55%, #dccab9 100%);
}

.app-hero::before {
  /* Light waves with screen blend mode */
  animation: muse-waves 14s ease-in-out infinite alternate;
  mix-blend-mode: screen;
}

.app-hero::after {
  /* Shadow bands with multiply blend mode */
  animation: muse-waves 18s ease-in-out infinite alternate-reverse;
  mix-blend-mode: multiply;
}
```

## Icons & Logos
- **Browser Icon**: Gradient M (`icon.svg`) - Bright colors for visibility
  - Orange: `#FF9966`
  - Blue: `#66B3FF`
- **App Icon**: Same gradient M (`logo-m.svg`)
- **Wordmark**: Handwritten gradient logo (`logo-muse-handwritten.svg`)

## Content Hierarchy
1. **Logo/Branding** at top
2. **Primary action** (gradient CTA)
3. **Secondary actions** (glass buttons)
4. **Tertiary actions** (text links)

## DO's
✅ Use gradient sparingly (logo + primary CTA only)
✅ Use 12px border radius everywhere
✅ Use glass effects for interactive elements
✅ Maintain calm, minimal aesthetic
✅ Use fabric background for hero sections
✅ Keep animations subtle (150ms ease-out)

## DON'Ts
❌ Don't use multiple gradients
❌ Don't make UI feel busy
❌ Don't use border radius other than 12px
❌ Don't use emojis unless requested
❌ Don't add unnecessary decorations
❌ Don't use harsh animations

## Page Structure Template
```tsx
<div className="app-hero">
  <div className="app-hero__grain" />
  <div className="app-hero__content">
    {/* Content here */}
  </div>
</div>
```

## Tagline
**"Shop all your favorites in one place"**
