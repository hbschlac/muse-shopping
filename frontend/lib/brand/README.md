
# Muse Brand Design System

Source of truth for all design decisions across the Muse platform.

## 📖 Overview

This design system enforces the Muse brand guidelines through:
- **Design Tokens**: Centralized values for colors, typography, spacing
- **Utilities**: Helper functions with built-in validation
- **Components**: Brand-compliant React components
- **Hard Rules**: Automated enforcement of design standards

## 🎨 Core Principles

1. **Air > Decoration** - Generous whitespace, minimal components
2. **Calm > Playful** - Subtle, confident design
3. **Fewer Components = More Trust** - Limit component variety

## 🚫 Hard Rules (Automated Enforcement)

### Colors
- ✅ 85-90% neutral surfaces
- ✅ 1 primary accent only
- ✅ 1 gradient max per screen
- ❌ NO gradients on backgrounds, cards, or text
- ❌ NO dark backgrounds

### Typography
- ✅ ONE font family: "Be Vietnam"
- ✅ Max 6 text styles
- ✅ Body text ALWAYS 16px
- ❌ NO italics
- ❌ NO decorative fonts

### Shape
- ✅ Border radius: 12px EVERYWHERE
- ❌ NO mixed radii
- ❌ NO sharp corners

### Components
- ✅ Allowed: Button, Input, Card, Navbar, Tabs, Modal, Toast, Feed tile
- ❌ Forbidden: Chips, Tags, Badges, Decorative Pills

## 📦 Usage

### Import

```typescript
import { BrandTokens, getColor, BrandButton } from '@/lib/brand';
```

### Design Tokens

```typescript
// Colors
BrandTokens.colors.background.primary  // '#F0EAD8'
BrandTokens.colors.text.primary        // '#333333'
BrandTokens.colors.accents.peach       // '#F4C4B0'

// Typography
BrandTokens.typography.fontSize.body   // '16px'
BrandTokens.typography.fontFamily.primary

// Spacing
BrandTokens.spacing.lg                 // '16px'
BrandTokens.spacing.logoToTagline      // '16px'

// Border Radius
BrandTokens.borderRadius.default       // '12px'

// Gradients (PRIMARY CTA ONLY)
BrandTokens.gradients.primaryCTA
```

### Utility Functions

```typescript
// Get color with validation
const bgColor = getColor('background.primary');

// Get spacing
const gap = getSpacing('lg');

// Generate button classes
const classes = getButtonClasses('primary', true); // isPrimaryCTA

// Generate text classes
const textClasses = getTextClasses('headline');

// Container
const containerClasses = getContainerClasses('content');
```

### Components

```typescript
import { BrandButton } from '@/lib/brand';

// Primary CTA (with gradient)
<BrandButton variant="primary" isPrimaryCTA fullWidth>
  Continue
</BrandButton>

// Secondary button
<BrandButton variant="secondary">
  Cancel
</BrandButton>

// Tertiary button
<BrandButton variant="tertiary">
  Learn more
</BrandButton>
```

### CSS Custom Properties

```typescript
import { getBrandCSSVariables } from '@/lib/brand';

// In your global CSS or layout
const cssVars = getBrandCSSVariables();
// Apply to :root or specific elements
```

## 🔍 Validation

The system automatically validates:

### Gradient Usage
```typescript
canUseGradient('Button', true);  // ✅ Primary CTA
canUseGradient('Card', false);   // ❌ Error logged
```

### Color Distribution
```typescript
validateColorDistribution(90, 10);  // ✅ Passes
validateColorDistribution(70, 30);  // ❌ Warning logged
```

### Border Radius
```typescript
validateBorderRadius('12px');  // ✅ Passes
validateBorderRadius('8px');   // ❌ Error logged
```

### Component Names
```typescript
validateComponent('Button');   // ✅ Allowed
validateComponent('Chip');     // ❌ Forbidden
```

## 📐 Layout Guidelines

### Login/Welcome Page
```typescript
// Spacing requirements (from brand guidelines)
{
  logo_to_tagline: '16-20px',    // Use BrandTokens.spacing.logoToTagline
  tagline_to_buttons: '32-40px', // Use BrandTokens.spacing.taglineToButtons
  button_gap: '12-16px',         // Use BrandTokens.spacing.buttonGap
}
```

### General Layout
- Single column layouts
- Max width containers
- Generous whitespace
- Subtle shadows only
- Thin borders only

## 🎭 Personality

**Do:**
- Calm, modern, minimal
- Premium, gender-neutral
- Editorial but not trendy

**Don't:**
- Overly feminine styling
- Lifestyle photography
- Homegoods vibes
- Decoration for decoration's sake
- Glossy or playful UI

## 🚀 Examples

### Correct Usage

```tsx
import { BrandTokens, BrandButton, getTextClasses } from '@/lib/brand';

export default function WelcomePage() {
  return (
    <div style={{ backgroundColor: BrandTokens.colors.background.primary }}>
      <div className="flex flex-col items-center">
        <img src="/logo.svg" className="-mb-4" />
        <p className={getTextClasses('body')}>
          Shop all your favorites in one place
        </p>

        <BrandButton variant="primary" isPrimaryCTA fullWidth>
          Get Started
        </BrandButton>

        <BrandButton variant="secondary" fullWidth>
          Sign In
        </BrandButton>
      </div>
    </div>
  );
}
```

### Incorrect Usage (Will Log Errors)

```tsx
// ❌ Multiple gradients
<div className="bg-gradient-to-r ...">
  <BrandButton variant="primary" isPrimaryCTA>...</BrandButton>
</div>

// ❌ Wrong border radius
<div className="rounded-lg">...</div>  // Should be rounded-[12px]

// ❌ Forbidden component
<Chip label="New" />

// ❌ Non-primary gradient
<Card className="bg-gradient-to-r ...">...</Card>
```

## 📝 Contributing

When adding new components or styles:

1. Check if component is in whitelist
2. Use design tokens, not hardcoded values
3. Validate against brand guidelines
4. Test with validation utilities
5. Update this README if adding new tokens

## 🔗 Related Files

- `/lib/brand/tokens.ts` - All design tokens
- `/lib/brand/utils.ts` - Validation and utilities
- `/lib/brand/components/` - Brand-compliant components
- `/BRAND_GUIDELINES.md` - Full brand documentation

## ⚠️ Migration Guide

To migrate existing components:

1. Replace hardcoded colors with `BrandTokens.colors.*`
2. Replace hardcoded spacing with `BrandTokens.spacing.*`
3. Change all `rounded-lg` to `rounded-[12px]`
4. Use `BrandButton` instead of custom buttons
5. Remove any chips, tags, badges, or pills
6. Limit gradients to one primary CTA per screen

---

**Version:** 1.0
**Last Updated:** 2026-02-04
**Maintained By:** Muse Design Team
