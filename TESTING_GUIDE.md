# Testing Guide - Pagination & Brand Compliance

## Quick Start Testing

### Option 1: Automated Checklist (Recommended)
Run the interactive testing script:
```bash
./test-checklist.sh
```

This will guide you through 55 tests covering:
- Search pagination
- Product details
- Closet/saves
- Welcome page
- Newsfeed
- Profile page
- Brand compliance

### Option 2: Manual Testing

Start your dev server:
```bash
cd frontend
npm run dev
```

Visit: `http://localhost:3000`

---

## Core Features to Test

### 1. Search Page (`/search`)
**What to verify:**
- Search query triggers API call
- Results display correctly
- Pagination shows when results > 20
- URL updates: `?page=2&q=dress`
- Filters reset page to 1
- Border radius is 12px everywhere

**Test steps:**
1. Go to `/search`
2. Type "dress" in search bar
3. Click page 2
4. Check URL has `?page=2&q=dress`
5. Apply a filter
6. Verify page resets to 1

**Expected behavior:**
- Loading spinner during search
- Pagination appears if totalResults > 20
- Page number highlights active page
- Filters work and reset pagination

---

### 2. Product Detail Page (`/product/[id]`)
**What to verify:**
- Product details load from API
- Images display (carousel if multiple)
- Related products section shows
- Border radius is 12px on buttons
- Size/color selectors work

**Test steps:**
1. Click any product card
2. Wait for details to load
3. Click different sizes
4. Save product (heart icon)
5. Scroll to related products
6. Click a related product

**Expected behavior:**
- Loading spinner while fetching
- Product name, price, description display
- Image carousel works (if multiple images)
- Size buttons toggle selection
- Related products are clickable

---

### 3. Closet/Saves Page (`/closet`)
**What to verify:**
- Saved items load from API
- "Load More" appears when items > 20
- Collections display correctly
- Border radius is 12px on buttons

**Test steps:**
1. Go to `/closet`
2. Wait for saved items to load
3. If items exist, scroll down
4. Click "Load More" button
5. Verify 20 more items appear

**Expected behavior:**
- Loading spinner initially
- Empty state if no saves
- Load more increments by 20
- Collections show correct count

---

### 4. Welcome Page (`/welcome`)
**What to verify:**
- Logo displays properly
- Buttons use brand colors
- Border radius is 12px
- Button heights are 56px
- Be Vietnam font is used

**Test steps:**
1. Go to `/welcome`
2. Inspect button styling
3. Check Apple button color: `#A8C5E0`
4. Check Email button color: `#F4C4B0`
5. Verify font family

**Expected behavior:**
- All buttons have 12px radius
- Correct brand colors
- Smooth hover animations
- Proper font rendering

---

### 5. Newsfeed Page (`/home`)
**What to verify:**
- Muse logo is larger (48px height)
- Logo is readable
- Brand modules display
- Stories work

**Test steps:**
1. Go to `/home`
2. Check logo size at top
3. Scroll through feed
4. Click a story
5. Navigate story slides

**Expected behavior:**
- Logo clearly visible
- Feed content loads
- Stories open in viewer
- Smooth scrolling

---

## Brand Compliance Checks

### Border Radius
**Verify ALL elements use `rounded-[12px]`**

Check these specific elements:
- ✅ Search bar
- ✅ Product cards
- ✅ Buttons (everywhere)
- ✅ Collection pills
- ✅ Filter buttons
- ✅ Profile cards
- ✅ Auth callback modals

**How to check:**
1. Right-click element
2. "Inspect"
3. Look for `border-radius: 12px` in styles

---

### Colors
**Verify brand token usage:**

| Element | Color | Hex |
|---------|-------|-----|
| Primary text | Text | `#333333` |
| Secondary text | Text | `#6B6B6B` |
| Tertiary text | Text | `#9A9A9A` |
| Background | BG | `#F0EAD8` |
| Card BG | BG | `#FEFDFB` |
| Coral accent | Accent | `#F1785A` |
| Peach accent | Accent | `#F4C4B0` |
| Blue accent | Accent | `#A8C5E0` |

**How to check:**
1. Inspect text element
2. Verify `color` property matches table

---

### Typography
**Verify font sizes:**

| Element | Size |
|---------|------|
| Headlines | 32px |
| Subheadings | 20px |
| Body text | 16px |
| Captions | 14px |
| Small | 13px |
| Tiny | 12px |

**Font family:**
All pages should use: `"Be Vietnam", "DM Sans", system-ui, -apple-system, sans-serif`

---

### Animations
**Verify transitions:**
- Duration: `150ms`
- Easing: `ease-out`
- No spring or bounce effects

**How to check:**
1. Inspect button
2. Look for `transition: all 150ms ease-out`

---

## API Integration Checks

### Endpoints to Verify

**Search API:**
```
GET /products/search?q=dress&page=1&page_size=20
```
Response should include:
- `products[]`
- `total_results`
- `page`
- `page_size`

**Product Details API:**
```
GET /products/:id
```
Response should include:
- `id`, `name`, `brand`, `price`
- `images[]`, `sizes[]`, `colors[]`
- `description`, `details`

**Saved Items API:**
```
GET /items/saved
```
Response should include:
- Array of `SavedItem` with nested `product`

**Test with demo mode:**
If APIs fail, components should show:
- Empty states (not errors)
- Placeholder UI
- Retry buttons

---

## Common Issues & Fixes

### Issue: Pagination not showing
**Cause:** Not enough results
**Fix:** Search for broader term (e.g., "dress" vs "specific brand dress")

### Issue: Border radius looks wrong
**Cause:** Tailwind not recompiling
**Fix:**
```bash
cd frontend
rm -rf .next
npm run dev
```

### Issue: Colors not brand-compliant
**Cause:** Hardcoded hex values
**Fix:** Use `BrandTokens` from `/lib/brand/tokens.ts`

### Issue: API errors in console
**Cause:** Backend not running or endpoints changed
**Fix:** Check backend server is running on correct port

---

## Mobile Testing

### Test on actual mobile device:

1. Find your local IP:
```bash
ifconfig | grep inet
```

2. Visit on phone: `http://[YOUR-IP]:3000`

3. Test:
- Touch interactions
- Bottom navigation
- Responsive layout
- Scroll behavior

---

## Performance Testing

### Check page load times:

1. Open DevTools
2. Go to Network tab
3. Reload page
4. Verify:
   - Initial load < 2s
   - API calls < 500ms
   - No unnecessary re-renders

---

## Automated Tests

### Run unit tests:
```bash
cd frontend
npm test pagination.test.ts
```

### Tests include:
- Pagination logic
- URL state management
- Brand compliance
- Filter functionality

---

## Reporting Issues

When you find a bug:

1. **Document it:**
   - Page URL
   - What you did
   - What happened
   - What should happen

2. **Check console:**
   - Open DevTools (F12)
   - Look for errors
   - Screenshot if needed

3. **Test workaround:**
   - Does refresh fix it?
   - Does it happen in incognito?
   - Does it happen on mobile?

---

## Success Criteria

✅ All pagination works correctly
✅ All border radius is 12px
✅ All colors use brand tokens
✅ Typography follows scale
✅ Transitions are 150ms ease-out
✅ APIs integrate successfully
✅ Mobile responsive design works
✅ Loading states display properly
✅ Error states are actionable

---

## Next Steps After Testing

1. **If all tests pass:**
   - Ready for staging deployment
   - Update version number
   - Create release notes

2. **If tests fail:**
   - Review PAGINATION_AND_BRAND_STANDARDIZATION.md
   - Check console for errors
   - Verify API responses
   - Test backend endpoints separately

3. **For production:**
   - Run full test suite
   - Performance audit
   - Accessibility check
   - Cross-browser testing

---

## Questions?

- Review: `PAGINATION_AND_BRAND_STANDARDIZATION.md`
- Check: `/frontend/lib/brand/README.md`
- Test: `./test-checklist.sh`
