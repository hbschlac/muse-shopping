# Muse Interaction Patterns Guide

**Version 1.0 | Last Updated: February 3, 2026**

This document defines the interactive behaviors and patterns for Muse Shopping. All interactions should feel **fast, subtle, and spring

y** - never flashy or overwhelming.

---

## 🎯 Interaction Principles

### Core Values

1. **Fast** - Never slow or laggy
2. **Subtle** - Not flashy or attention-grabbing
3. **Springy** - Natural easing with personality
4. **Delightful** - Small moments of joy
5. **Predictable** - Users should know what to expect

### Motion Philosophy

> "Motion should enhance understanding, not distract from it."

- Use motion to guide attention
- Provide feedback for user actions
- Create smooth transitions between states
- Never block interaction with animation

---

## 📱 Core Interactions

### Tap/Click Interactions

**Standard Tap Feedback:**
```css
/* Subtle scale on active */
.interactive-element:active {
  transform: scale(0.98);
  transition: transform 150ms cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

**Examples:**
- Product cards
- Buttons
- Tags/pills
- Nav items

**When to Use:**
- Interactive elements that trigger navigation
- Actions that need clear feedback

**When NOT to Use:**
- Save/heart buttons (use pop animation instead)
- Already has other hover/active states

---

### Hover States (Desktop)

**Subtle Elevation:**
```css
.card {
  transition: box-shadow 250ms, transform 250ms;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
```

**Examples:**
- Product cards
- Feed cards
- Clickable tiles

**Rules:**
- Only on desktop (not mobile)
- Subtle elevation, not dramatic
- Combined with slight translateY

---

### Save/Heart Animation

**Pop Effect:**
```javascript
// Add is-saved class
element.classList.add('is-saved');

// Scale up then back
element.style.transform = 'scale(1.2)';
setTimeout(() => {
  element.style.transform = '';
}, 200);
```

**Visual Behavior:**
- Scale from 1 → 1.2 → 1
- Fill color changes to gradient
- Duration: 200ms total
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (springy)

**When to Use:**
- Save button clicks
- Heart/favorite interactions
- Positive confirmation actions

---

### Scroll Behaviors

**Horizontal Scroll Containers:**
```css
.scroll-container {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Hide scrollbar */
}

.scroll-item {
  scroll-snap-align: start;
}
```

**Use For:**
- Story rings
- Trending items
- Product carousels
- Image galleries

**Rules:**
- Scroll snap on mobile
- Hide scrollbar for cleaner look
- Momentum scrolling enabled
- Show scroll indicators if multi-page

**Sticky Header:**
```css
.header {
  position: sticky;
  top: 0;
  z-index: 200;
}
```

**Use For:**
- Page headers with search
- Product detail page header
- Category navigation

---

## 🎨 State Transitions

### Loading States

**Skeleton Loaders (Preferred):**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-divider) 0%,
    rgba(246, 243, 238, 0.5) 50%,
    var(--color-divider) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**When to Use:**
- Initial page load
- Lazy-loaded content
- Infinite scroll loading
- Image placeholders

**Spinner (Secondary Option):**
```css
.spinner {
  animation: spin 0.8s linear infinite;
}
```

**When to Use:**
- Button loading states
- Small inline loading
- Modal content loading

**Never Use:**
- Blocking full-page spinners
- Progress bars (feels slow)
- Percentage indicators

---

### Error States

**Toast Notification (Preferred):**
```javascript
showToast({
  type: 'error',
  message: 'Something went wrong. Please try again.',
  duration: 4000
});
```

**Visual Treatment:**
- Slides up from bottom
- Red background (#EF4444)
- White text
- Dismissible
- Auto-dismiss after 4s

**Inline Error (Forms):**
```html
<input class="form-input has-error">
<span class="form-error">Please enter a valid email</span>
```

**Never:**
- Alert dialogs
- Blocking error modals
- Loud, scary error messages

---

### Success States

**Toast Notification:**
```javascript
showToast({
  type: 'success',
  message: 'Added to your saves!',
  duration: 3000
});
```

**Visual Treatment:**
- Gradient background (peach → coral)
- White text
- Checkmark icon
- Auto-dismiss after 3s

**Micro-Animation:**
- Save heart fills and pops
- Check mark appears
- Success color flash

**Never:**
- Confetti
- Loud celebrations
- Blocking "Success!" modals

---

## 📋 Complex Patterns

### Accordion/Collapsible Content

**Behavior:**
```javascript
// Toggle accordion
accordion.classList.toggle('is-open');

// Update max-height for smooth animation
if (accordion.classList.contains('is-open')) {
  content.style.maxHeight = content.scrollHeight + 'px';
} else {
  content.style.maxHeight = '0';
}
```

**Visual Treatment:**
- Icon rotates 180° when open
- Content fades in while expanding
- Duration: 250ms
- Easing: cubic-bezier(0.4, 0.0, 0.2, 1)

**Use For:**
- Product detail sections
- FAQ items
- Filter groups
- Profile settings

**Rules:**
- Only one open at a time (accordion pattern)
- OR multiple open (collapsible pattern) - be consistent
- Clear visual indicator of open/closed state
- Smooth animation, not janky

---

### Modal/Bottom Sheet

**Modal (Desktop):**
```javascript
// Show modal
backdrop.classList.add('is-open');

// Behavior:
// - Backdrop fades in (0 → 1)
// - Modal scales up and slides in (0.9, +20px → 1, 0)
// - Duration: 250ms
// - Springy easing
```

**Bottom Sheet (Mobile):**
```javascript
// Show bottom sheet
sheet.classList.add('is-open');

// Behavior:
// - Backdrop fades in
// - Sheet slides up from bottom (100% → 0)
// - Duration: 250ms
// - Springy easing
```

**Interaction:**
- Click backdrop to dismiss
- Swipe down to dismiss (mobile)
- ESC key to dismiss (desktop)
- Focus trap inside modal

**Never:**
- Auto-open modals
- Modals that can't be dismissed
- Multiple modals at once
- Modals for simple confirmations

---

### Pull to Refresh

**Mobile Only:**
```javascript
// Pull down gesture detected
if (scrollTop === 0 && pullDistance > threshold) {
  showRefreshIndicator();
  await refreshContent();
  hideRefreshIndicator();
}
```

**Visual Feedback:**
- Subtle spinner appears
- Content shifts down slightly
- Haptic feedback on trigger (if available)

**Use For:**
- Feed/newsfeed refresh
- Product list refresh

**Rules:**
- Only at top of scroll
- Clear visual feedback
- Don't trigger accidentally
- Complete quickly

---

### Infinite Scroll

**Behavior:**
```javascript
// Detect near bottom
if (scrollPosition > contentHeight - threshold) {
  loadMoreItems();
  showLoadingIndicator();
}
```

**Visual Feedback:**
- Skeleton loaders appear
- Smooth append, no jump
- "Loading more..." text (subtle)

**Use For:**
- Feed scrolling
- Product grid scrolling
- Search results

**Rules:**
- Trigger before reaching bottom
- Graceful loading states
- Error handling if load fails
- "No more items" state

---

## 🎭 Micro-Interactions

### Allowed Micro-Interactions

**1. Tile Lift on Tap**
```css
.product-card:active {
  transform: translateY(-2px) scale(0.98);
}
```

**2. Save Heart Pop**
```javascript
// Scale animation on save
heartIcon.style.transform = 'scale(1.2)';
setTimeout(() => heartIcon.style.transform = '', 200);
```

**3. Gradient Shimmer on CTA**
```css
.btn-primary:active::before {
  content: '';
  background: rgba(255, 255, 255, 0.2);
  animation: shimmer-flash 0.6s;
}
```

**4. Skeleton Loaders**
```css
.skeleton {
  animation: shimmer 1.5s infinite;
}
```

---

### Forbidden Micro-Interactions

❌ **Never Use:**
- Confetti animations
- Loud transitions
- Onboarding animations
- Bouncy marketing effects
- Particle effects
- Celebration animations
- Auto-playing videos
- Animated illustrations

---

## 📐 Timing & Easing

### Standard Timing Values

```css
--duration-fast: 150ms;    /* Quick feedback */
--duration-base: 250ms;    /* Standard transitions */
--duration-slow: 400ms;    /* Complex animations */
```

### When to Use Each:

**Fast (150ms):**
- Hover states
- Active states
- Color changes
- Opacity changes

**Base (250ms):**
- Transform animations
- Modal open/close
- Accordion expand/collapse
- Navigation transitions

**Slow (400ms):**
- Page transitions
- Complex state changes
- Multi-property animations

---

### Easing Functions

```css
--ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);  /* Standard */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy */
--ease-in: cubic-bezier(0.4, 0.0, 1, 1);        /* Accelerate */
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);     /* Decelerate */
```

**When to Use:**

**Smooth (Default):**
- Most transitions
- Hover states
- Modal animations

**Spring (Delight):**
- Save heart pop
- Success states
- Playful interactions

**Ease-in:**
- Elements leaving screen
- Dismissing content

**Ease-out:**
- Elements entering screen
- Revealing content

---

## 🔄 Navigation Transitions

### Page Transitions

**Standard Navigation:**
```javascript
// No transition - instant
// Keep it fast, don't block navigation
router.push('/product/123');
```

**Rule:**
- **No** page transition animations
- Instant navigation
- Let browser handle it
- Don't delay user

**Exception:**
- Modal overlays (slide up)
- Bottom sheets (slide up)
- These aren't "navigation"

---

### Tab Switching

**Bottom Nav:**
```css
.nav-item {
  transition: color 150ms ease-smooth;
}

.nav-item.is-active {
  color: var(--color-coral);
}
```

**Behavior:**
- Color change only
- No icon animation
- No badge bounce
- Instant content swap

---

## 💬 Form Interactions

### Input Focus

```css
.form-input:focus {
  border-color: var(--color-coral);
  transition: border-color 150ms;
}
```

**Behavior:**
- Border color change
- No shadow growth
- No dramatic effects

### Validation

**Real-time (As You Type):**
- ❌ Don't validate on every keystroke
- ✅ Validate on blur (field exit)
- ✅ Show success after valid

**On Submit:**
- Highlight first error
- Scroll to first error
- Show all errors at once
- Focus first error field

### Auto-Save

**Visual Feedback:**
```javascript
// Show saving indicator
savingIndicator.textContent = 'Saving...';

// On complete
savingIndicator.textContent = 'Saved';
setTimeout(() => {
  savingIndicator.textContent = '';
}, 2000);
```

**Rules:**
- Debounce input (wait for pause)
- Show "Saving..." state
- Show "Saved" confirmation
- Hide after 2 seconds

---

## 🎯 Interaction Testing Checklist

Before shipping any interactive feature:

### Performance
- [ ] Animations run at 60fps
- [ ] No jank or stuttering
- [ ] Smooth on low-end devices
- [ ] No unnecessary repaints

### Feel
- [ ] Interactions feel fast
- [ ] Feedback is immediate
- [ ] Easing feels natural
- [ ] No accidental triggers

### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Screen reader announces states
- [ ] No motion for users who prefer reduced motion

### Edge Cases
- [ ] Works on slow connections
- [ ] Handles errors gracefully
- [ ] Works offline (if applicable)
- [ ] No race conditions

---

## 🔧 Implementation Tips

### Reduced Motion

**Always respect user preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Performance

**Use `transform` and `opacity` only:**
```css
/* ✅ Good - GPU accelerated */
transform: translateY(-2px);
opacity: 0.8;

/* ❌ Bad - Triggers repaint */
top: -2px;
visibility: hidden;
```

**Use `will-change` sparingly:**
```css
/* Only when needed */
.product-card:hover {
  will-change: transform;
}
```

---

## 📚 Code Examples

### Reusable Interaction Functions

```javascript
// Toast notification
function showToast(options) {
  const toast = createToastElement(options);
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, options.duration || 3000);
}

// Heart animation
function animateHeart(element) {
  element.style.transform = 'scale(1.2)';
  setTimeout(() => {
    element.style.transform = '';
  }, 200);
}

// Smooth scroll
function smoothScrollTo(target, duration = 400) {
  const start = window.pageYOffset;
  const end = target.offsetTop;
  const distance = end - start;
  let startTime = null;

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);

    window.scrollTo(0, start + distance * easeOutCubic(progress));

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
```

---

## ✅ Quick Reference

**Do:**
- Fast, subtle, springy
- Provide immediate feedback
- Use skeleton loaders
- Respect reduced motion
- Test on real devices
- Keep animations < 400ms

**Don't:**
- Confetti or loud animations
- Block interaction with animation
- Auto-play anything
- Animate layout properties
- Use complex animations
- Ignore accessibility

---

**"Motion should enhance understanding, not distract from it."**

---

**Built with care by Hannah & Claude 🤍**
