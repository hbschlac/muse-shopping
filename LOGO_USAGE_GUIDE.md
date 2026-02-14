# Muse Logo Usage Guide

This guide explains when and how to use different Muse logo variants.

## Available Logo Variants

### Wordmark Logos (Full Logo with Text)

1. **Gradient Wordmark** (`/muse-wordmark-gradient.svg`)
   - **Primary brand logo** - use this by default
   - Best for: Hero sections, welcome screens, primary branding
   - Background: Light backgrounds, white backgrounds
   - Examples: Homepage hero, onboarding screens, email headers

2. **White Wordmark** (`/muse-wordmark-white.svg`)
   - **For dark backgrounds**
   - Best for: Dark mode, colored backgrounds, overlays
   - Background: Dark backgrounds, image overlays, colored sections
   - Examples: Dark mode UI, footer on dark background, hero overlays

3. **Grey Wordmark** (`/muse-wordmark-grey.svg`)
   - **Subtle/neutral variant**
   - Best for: Secondary placements, subtle branding
   - Background: Light backgrounds where gradient is too bold
   - Examples: Footers, subtle watermarks

4. **Solid Wordmark** (`/muse-wordmark.svg`)
   - **Simple black variant**
   - Best for: Print, minimal contexts, authentication pages
   - Background: Light backgrounds
   - Examples: Login, signup, password reset pages

### Lettermark Logos (Icon Only)

1. **White Lettermark** (`/muse-lettermark-white.svg`)
   - **Compact icon for dark backgrounds**
   - Best for: App icons, favicons, small spaces on dark backgrounds
   - Background: Dark backgrounds
   - Examples: Loading screens with dark backgrounds, compact headers

## Usage in Code

### Using the React Component (Recommended)

```tsx
import MuseLogo from '@/components/MuseLogo';

// Default gradient wordmark
<MuseLogo className="h-16" />

// Automatically use white logo on dark background
<MuseLogo background="dark" className="h-16" />

// White lettermark icon
<MuseLogo variant="lettermark" style="white" className="h-8" />
```

### Using the Utility Functions

```tsx
import { getMuseLogo, getMuseLogoForDark, MUSE_LOGOS } from '@/lib/brand';

// Get logo path based on context
const logoPath = getMuseLogo({ background: 'dark' });

// Direct access
const whiteLogo = MUSE_LOGOS.wordmark.white;
```

## Decision Tree

### When to use which logo:

```
Is the background dark or colored?
├─ YES → Use white variant
│   ├─ Need full logo? → White Wordmark
│   └─ Need compact icon? → White Lettermark
│
└─ NO (light background) →
    ├─ Primary branding? → Gradient Wordmark
    ├─ Subtle placement? → Grey Wordmark
    └─ Minimal/Auth pages? → Solid Wordmark
```

## Current Usage in App

- **Homepage/Newsfeed Header**: Gradient Wordmark
- **Welcome Screen**: Gradient Wordmark
- **Onboarding**: Gradient Wordmark
- **Auth Pages** (Login/Signup): Solid Wordmark
- **Email Setup**: Gradient Wordmark

## Best Practices

1. **Default to gradient wordmark** - it's our primary brand identity
2. **Use white variants on dark backgrounds** - ensures visibility and brand consistency
3. **Use lettermark only when space is limited** - maintain wordmark when possible
4. **Maintain consistent sizing** - logos should be prominent but not overwhelming
5. **Test contrast** - ensure logo is visible on all backgrounds

## Examples by Context

### Hero Sections
```tsx
<MuseLogo className="h-40 md:h-48" />
```

### Navigation/Headers
```tsx
<MuseLogo className="h-10" />
```

### Dark Backgrounds
```tsx
<div className="bg-gray-900">
  <MuseLogo background="dark" className="h-16" />
</div>
```

### Small Icons/Favicons
```tsx
<MuseLogo variant="lettermark" style="white" className="h-8" />
```

## File Locations

All logo files are in: `/frontend/public/`
- `muse-wordmark-gradient.svg` - Primary gradient logo
- `muse-wordmark-white.svg` - White version for dark backgrounds
- `muse-wordmark-grey.svg` - Grey subtle variant
- `muse-wordmark.svg` - Solid black variant
- `muse-lettermark-white.svg` - White icon variant

## Migration Guide

If you're currently using hardcoded logo paths, migrate to the component:

**Before:**
```tsx
<img src="/muse-wordmark-gradient.svg" alt="Muse" className="h-16" />
```

**After:**
```tsx
<MuseLogo className="h-16" />
```

This ensures consistent logo usage and makes it easy to adapt to different contexts (like dark mode).
