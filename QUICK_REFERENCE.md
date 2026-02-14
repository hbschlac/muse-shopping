# Quick Reference Card 🎯

## Test Your App Right Now

```bash
# 1. Start server
cd frontend && npm run dev

# 2. Run tests
../test-checklist.sh

# 3. Visit in browser
open http://localhost:3000
```

---

## What Changed

| Page | What's New |
|------|-----------|
| `/search` | ✅ Real pagination, 12px radius |
| `/product/[id]` | ✅ API integration, 12px radius |
| `/closet` | ✅ Load more, 12px radius |
| `/welcome` | ✅ Brand colors, 56px buttons, 12px radius |
| `/home` | ✅ **Logo 50% larger (48px)** |
| `/profile` | ✅ 12px radius |
| Auth pages | ✅ 12px radius |

---

## Brand Rules (ALWAYS)

- **Border Radius:** `12px` (never 16px, 24px, 28px)
- **Button Height:** `56px`
- **Transitions:** `150ms ease-out`
- **Font:** Be Vietnam
- **Colors:** `#333`, `#6B6B6B`, `#F0EAD8`, `#F1785A`

---

## Key Components

```typescript
// Pagination (page numbers)
import { Pagination } from '@/components/Pagination';
<Pagination currentPage={1} totalPages={5} onPageChange={setPage} />

// Load More (incremental)
import { LoadMoreButton } from '@/components/Pagination';
<LoadMoreButton onLoadMore={handleLoadMore} loading={false} />

// URL-based page state
import { usePagination } from '@/lib/hooks/usePagination';
const { page, setPage, resetPage } = usePagination();
```

---

## Testing Checklist

- [ ] Search works and paginates
- [ ] Product details load
- [ ] Closet load more works
- [ ] Logo is readable (48px)
- [ ] All radius is 12px
- [ ] Brand colors correct
- [ ] Mobile responsive

---

## About Test Links

**When you visit `localhost:3000`:**
- It's a **website** (not native app)
- Works in desktop AND mobile browsers
- Same codebase, responsive design
- On phone: visit `http://[YOUR-IP]:3000`

---

## Files to Know

📝 **Documentation:**
- `FINAL_SUMMARY.md` - Overview
- `TESTING_GUIDE.md` - How to test
- `PAGINATION_AND_BRAND_STANDARDIZATION.md` - Technical details

🧪 **Testing:**
- `test-checklist.sh` - Interactive tests (55 checks)
- `frontend/tests/pagination.test.ts` - Unit tests

🎨 **Components:**
- `frontend/components/Pagination.tsx`
- `frontend/lib/hooks/usePagination.ts`
- `frontend/lib/brand/tokens.ts`

---

## Common Commands

```bash
# Start dev server
npm run dev

# Run tests
./test-checklist.sh

# Build for production
npm run build

# Check for errors
npm run lint
```

---

## Quick Fixes

**Logo too small?**
- Edit `frontend/components/Newsfeed.tsx`
- Change `h-12` to `h-16` for even larger

**Border radius wrong?**
- Search codebase for `rounded-[16px]`, `rounded-[24px]`
- Replace with `rounded-[12px]`

**Colors off?**
- Import `BrandTokens` from `@/lib/brand/tokens`
- Use: `text-[#333333]` instead of hardcoded values

---

## Need Help?

1. Read `TESTING_GUIDE.md`
2. Run `./test-checklist.sh`
3. Check browser console (F12)
4. Review `PAGINATION_AND_BRAND_STANDARDIZATION.md`

---

**Status: ✅ Ready to Test!**
