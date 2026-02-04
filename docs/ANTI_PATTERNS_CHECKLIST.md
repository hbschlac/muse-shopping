# 🚫 Anti-Patterns Checklist

**Use this checklist during code reviews and design QA to catch violations BEFORE shipping.**

## Visual Anti-Patterns

### Colors & Backgrounds

- [ ] ❌ Grey backgrounds (only ecru, white, or approved colors)
- [ ] ❌ Beige/earthy palettes beyond our ecru #F6F3EE
- [ ] ❌ Unapproved gradients (only use defined gradients)
- [ ] ❌ Gradients as backgrounds (only on buttons/tags/story rings)

### Product Tiles & Cards

- [ ] ❌ Dense metadata under tiles (keep minimal: brand + price only)
- [ ] ❌ Ratings/stars everywhere (remove all rating displays)
- [ ] ❌ "20% off" badges or promo stickers
- [ ] ❌ Small, cramped product images (image should dominate)
- [ ] ❌ Text-heavy product descriptions visible by default

### Layout & Spacing

- [ ] ❌ Promo banners (no marketing banners anywhere)
- [ ] ❌ Carousels inside carousels (one carousel per section max)
- [ ] ❌ Cluttered screens (remove something before adding)
- [ ] ❌ Too many modules on home (keep it focused)
- [ ] ❌ Insufficient whitespace (whitespace is part of brand)

### Typography

- [ ] ❌ Fonts other than Be Vietnam Pro or brand script
- [ ] ❌ Bubbly or wide fonts
- [ ] ❌ Incorrect font weights (only 400, 500, 600)
- [ ] ❌ Too many type sizes (stick to scale)

---

## UX Anti-Patterns

### Navigation

- [ ] ❌ Hidden hamburger menus (bottom tabs only)
- [ ] ❌ Floating action buttons
- [ ] ❌ More than 5 bottom nav items
- [ ] ❌ Inconsistent nav structure across screens

### Search

- [ ] ❌ Tiny search bars (search must be prominent)
- [ ] ❌ 20 filter pills in a row (keep filters minimal)
- [ ] ❌ Filter-first experience (conversational search first)
- [ ] ❌ Search hidden or hard to access

### Chat/Muse

- [ ] ❌ Chatbot as modal (must be persistent tab)
- [ ] ❌ Chat state getting lost (maintain context)
- [ ] ❌ Chat not easily accessible
- [ ] ❌ Formal, robotic chat tone (keep friendly)

### Auth & Entry

- [ ] ❌ Login wall before browsing (allow guest browsing)
- [ ] ❌ Forced account creation (optional until needed)
- [ ] ❌ Multi-step signup flow (keep simple)
- [ ] ❌ Hiding content behind auth unnecessarily

### Product Pages

- [ ] ❌ CTA below fold (primary CTA must be above fold)
- [ ] ❌ Details expanded by default (collapse by default)
- [ ] ❌ Multiple CTAs competing (one clear action)
- [ ] ❌ Product image not prominent

### Motion & Animations

- [ ] ❌ Confetti or loud animations
- [ ] ❌ Slow transitions (fast and subtle only)
- [ ] ❌ Bouncy marketing animations
- [ ] ❌ Onboarding animations
- [ ] ❌ Flashy transitions

---

## Component-Specific Anti-Patterns

### Buttons

- [ ] ❌ More than 2 button variants on one screen
- [ ] ❌ Unclear button hierarchy
- [ ] ❌ Buttons smaller than 44x44px touch target
- [ ] ❌ Too many CTAs on one screen

### Forms

- [ ] ❌ Long, intimidating forms
- [ ] ❌ Asking for unnecessary information
- [ ] ❌ No validation feedback
- [ ] ❌ Unclear error messages

### Images

- [ ] ❌ Low-quality images
- [ ] ❌ Inconsistent aspect ratios in grid
- [ ] ❌ Slow-loading images without placeholders
- [ ] ❌ Images smaller than content

### Cards

- [ ] ❌ Inconsistent card styles
- [ ] ❌ Cards without proper padding
- [ ] ❌ Too many elements on one card
- [ ] ❌ Cards that don't respond to interaction

---

## Architecture Anti-Patterns

### State Management

- [ ] ❌ Over-engineered state solution
- [ ] ❌ Global state for local concerns
- [ ] ❌ State not persisting when it should
- [ ] ❌ Unnecessary re-renders

### Performance

- [ ] ❌ No loading states
- [ ] ❌ No error states
- [ ] ❌ Images not optimized
- [ ] ❌ Blocking the main thread

### Accessibility

- [ ] ❌ Missing focus states
- [ ] ❌ Poor color contrast
- [ ] ❌ Touch targets too small (< 44px)
- [ ] ❌ Missing alt text on images
- [ ] ❌ No keyboard navigation

### Mobile-First

- [ ] ❌ Desktop-first design approach
- [ ] ❌ Not testing on actual devices
- [ ] ❌ Ignoring touch interactions
- [ ] ❌ Horizontal scrolling issues

---

## Brand Voice Anti-Patterns

### Copy & Messaging

- [ ] ❌ Formal, corporate language
- [ ] ❌ Marketing jargon
- [ ] ❌ Discount-focused messaging
- [ ] ❌ Utility-first language ("Shop now", "Buy")
- [ ] ❌ Excessive exclamation points!!!

### Tone

- [ ] ❌ Too playful/bubbly (not TikTok)
- [ ] ❌ Too serious/boring (not Bloomberg)
- [ ] ❌ Inconsistent personality
- [ ] ❌ Generic startup speak

---

## Content Anti-Patterns

### Product Content

- [ ] ❌ Showing all specs by default
- [ ] ❌ Too much metadata visible
- [ ] ❌ Star ratings displayed
- [ ] ❌ Review counts emphasized

### Feed Content

- [ ] ❌ Dense, information-heavy feed
- [ ] ❌ Small images in feed
- [ ] ❌ Too many filters visible
- [ ] ❌ Promo content interrupting flow

---

## Quick Decision Framework

**When in doubt, ask:**

1. **Does this feel like Instagram Explore?** ✅
   - OR does it feel like Amazon? ❌

2. **Does this feel calm?** ✅
   - OR does it feel cluttered? ❌

3. **Is imagery dominant?** ✅
   - OR is text/metadata dominant? ❌

4. **Would our "person" (30s, well-traveled, West Elm aesthetic) choose this?** ✅
   - OR does it feel off-brand? ❌

5. **Is this simple and delightful like Apple?** ✅
   - OR complex and overwhelming? ❌

---

## Testing Your Changes

Before submitting a PR, check:

- [ ] Viewed on actual mobile device (not just DevTools)
- [ ] Tested touch interactions (not just clicks)
- [ ] Checked all loading states
- [ ] Checked all error states
- [ ] Verified accessibility (keyboard nav, focus, contrast)
- [ ] Compared to approved design mockups
- [ ] Ran through this anti-pattern checklist
- [ ] Got feedback from at least one other person

---

## Severity Levels

**🔴 Critical (Block Ship):**
- Login walls
- Missing accessibility features
- Brand color violations
- Performance issues

**🟡 High (Fix ASAP):**
- Cluttered layouts
- Wrong fonts
- Poor mobile experience
- Unclear CTAs

**🟢 Medium (Fix Soon):**
- Missing microinteractions
- Inconsistent spacing
- Minor copy issues

---

## When to Break the Rules

**Very rarely.** But if you must:

1. Document WHY in code comments
2. Get explicit approval from design lead
3. Add a TODO to revisit
4. Make it a temporary exception

**Example valid exception:**
- 3rd party widget that can't be restyled (e.g., Stripe checkout)
- Legal/compliance requirement

---

## Resources

- [Design System Documentation](./DESIGN_SYSTEM.md)
- [Component Demo](../public/component-demo.html)
- Brand Kit (Google Drive)
- Design Specs Doc (Google Docs)

---

**Remember: If a screen feels busy, remove something before adding anything.**
