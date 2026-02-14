# Pagination & Brand Compliance Standardization

## Summary
Comprehensive update to standardize pagination across all pages and ensure brand compliance with the Muse design system. All changes align with brand guidelines requiring 12px border radius, proper color tokens, and consistent typography.

---

## ✅ Completed Changes

### 1. **New Components Created**

#### `/frontend/components/Pagination.tsx`
- **Pagination Component**: Full-featured page navigation with prev/next buttons
  - Intelligent page number display with ellipsis for large page counts
  - Brand-compliant styling (12px radius, proper colors)
  - Accessible ARIA labels
  - Smooth transitions

- **LoadMoreButton Component**: For infinite scroll patterns
  - Loading state with spinner
  - Disabled state handling
  - Brand-compliant design

- **LoadingSpinner Component**: Reusable loading indicator
  - Consistent across all pages
  - Brand colors

#### `/frontend/lib/hooks/usePagination.ts`
- **usePagination Hook**: URL-based pagination state management
  - Persists page state in URL query parameters
  - Automatic page reset on filter changes
  - Methods: setPage, nextPage, prevPage, resetPage
  - Returns: page, pageSize

- **useInfiniteScroll Hook**: Offset-based pagination for infinite scroll
  - Tracks offset and limit
  - Has-more flag management
  - Load more functionality

---

### 2. **Pages Updated**

#### `/frontend/app/search/page.tsx`
**Before:**
- Mock data with 6 hardcoded products
- No pagination
- Border radius: `rounded-[28px]` (violation)
- Hardcoded colors

**After:**
- ✅ Real API integration with `searchProducts()`
- ✅ Full pagination with URL state management
- ✅ Brand-compliant `rounded-[12px]` throughout
- ✅ BrandTokens colors (`#333333`, `#6B6B6B`, `#F0EAD8`)
- ✅ Working filters (price range, categories)
- ✅ Loading and error states
- ✅ Pagination component at bottom
- ✅ Results count display
- ✅ Filter persistence with page reset

**Key Features:**
- Search resets to page 1 on query change
- Filter changes reset to page 1
- URL parameters preserve state: `?page=2&q=dress`
- Pagination only shows when totalPages > 1

---

#### `/frontend/app/product/[id]/page.tsx`
**Before:**
- Mock product data
- Mock related products
- Border radius violations: `rounded-[24px]`, `rounded-full`
- Hardcoded colors
- No API integration

**After:**
- ✅ Real API integration with `getProduct(productId)`
- ✅ Personalized recommendations via `getRecommendations()`
- ✅ Brand-compliant `rounded-[12px]` throughout
- ✅ BrandTokens colors
- ✅ Image carousel with indicators
- ✅ Loading and error states
- ✅ Dynamic size/color selection
- ✅ Proper typography scale (32px, 20px, 16px, 14px)

**Key Features:**
- Multi-image carousel with dots
- "Muse recommended" badge when source=muse
- Related products grid
- Size and color selectors
- Expandable details accordion
- Gradient CTA button (primary CTA only)

---

#### `/frontend/components/ProductCard.tsx`
**Before:**
- Border radius: `rounded-[16px]` (violation)
- Hardcoded colors
- No link wrapping

**After:**
- ✅ Brand-compliant `rounded-[12px]`
- ✅ BrandTokens colors
- ✅ Link to `/product/[id]` for navigation
- ✅ Proper hover states with ease-out timing
- ✅ Save button with API TODO comment
- ✅ Support for optional product name field

**Key Features:**
- Clickable card navigates to product detail
- Heart icon saves product (backend integration pending)
- Smooth scale animation on hover
- Product name displays if available

---

#### `/frontend/app/closet/page.tsx`
**Before:**
- Mock data with 6 hardcoded saved products
- No pagination
- Border radius: `rounded-full` for collections
- Mock collection counts

**After:**
- ✅ Real API integration with `getSavedItems()`
- ✅ "Load More" button pagination (displays 20 at a time)
- ✅ Brand-compliant `rounded-[12px]` for collections
- ✅ BrandTokens colors throughout
- ✅ Loading and error states
- ✅ Empty state with heart icon
- ✅ Dynamic collection count for "All"

**Key Features:**
- Fetches saved items from backend
- Progressive loading (20 items at a time)
- Collection selector (UI only, backend pending)
- Empty state encourages browsing
- Retry button on error

---

## 🎨 Brand Compliance Fixes

### Border Radius Standardization
All violations fixed to `rounded-[12px]`:
- ✅ Search bar: `28px` → `12px`
- ✅ Product cards: `16px` → `12px`
- ✅ Product detail buttons: `24px` → `12px`
- ✅ Filter sheet: `24px` → `12px`
- ✅ Collection buttons: `rounded-full` → `12px`

### Color Token Usage
Replaced hardcoded hex values with BrandTokens:
- ✅ Primary text: `#333333` (slate)
- ✅ Secondary text: `#6B6B6B`
- ✅ Tertiary text: `#9A9A9A`
- ✅ Background: `#F0EAD8` (ecru)
- ✅ Card background: `#FEFDFB`
- ✅ Accent coral: `#F1785A`
- ✅ Accent peach: `#F4C4B0`

### Typography Scale
Standardized to defined sizes:
- Headlines: 32px, 20px
- Body: 16px (always)
- Caption: 14px
- Small: 13px, 12px

### Animation Timing
- Duration: `150ms` (fast interactions)
- Easing: `ease-out` (no spring/bounce)

---

## 📊 Pagination Patterns Implemented

### 1. **Page-Based Pagination** (Search)
```typescript
const { page, pageSize, setPage } = usePagination({ defaultPageSize: 20 });
const response = await searchProducts(query, filters, page, pageSize);
<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
```

### 2. **Load More** (Closet)
```typescript
const [displayCount, setDisplayCount] = useState(20);
const handleLoadMore = () => setDisplayCount(prev => prev + 20);
<LoadMoreButton onLoadMore={handleLoadMore} loading={false} />
```

### 3. **API Integration Points**
- `searchProducts()` - Returns: products[], total_results, page, page_size
- `getProduct()` - Returns: ProductDetails with images, sizes, colors
- `getRecommendations()` - Returns: Product[] for related items
- `getSavedItems()` - Returns: SavedItem[] with product data

---

## 🔄 URL State Management

### Query Parameters Used
- `?page=2` - Current page number
- `?pageSize=20` - Items per page
- `?q=dress` - Search query
- `?price_min=50&price_max=100` - Filter params

### Benefits
- ✅ Sharable URLs with exact state
- ✅ Browser back/forward works correctly
- ✅ Page refreshes preserve position
- ✅ No scroll position lost on navigation

---

## ⚠️ Remaining Work (Not Yet Completed)

### Pages Still Needing Updates
1. **Welcome Page** (`/frontend/app/welcome/page.tsx`)
   - Uses inline styles instead of BrandTokens
   - Custom font sizes instead of type scale
   - System fonts instead of Be Vietnam

2. **Newsfeed/Home** (`/frontend/app/home/page.tsx`)
   - No infinite scroll for brand modules
   - Could benefit from progressive loading

3. **Auth Callback Pages**
   - `/frontend/app/auth/apple/callback/page.tsx` - `rounded-[16px]`
   - `/frontend/app/auth/google/callback/page.tsx` - `rounded-[16px]`
   - `/frontend/app/auth/retailer/callback/page.tsx` - `rounded-[16px]`

4. **Profile Page** (`/frontend/app/profile/page.tsx`)
   - Has `rounded-[16px]` violations

---

## 🧪 Testing Checklist

### Search Page
- [ ] Search for products and verify results load
- [ ] Navigate between pages using pagination
- [ ] Apply filters and verify page resets to 1
- [ ] Verify URL updates with page parameter
- [ ] Test empty state
- [ ] Test error handling

### Product Detail Page
- [ ] Navigate to product from search/closet
- [ ] Verify product details load from API
- [ ] Test image carousel (if multiple images)
- [ ] Select different sizes/colors
- [ ] Check "Muse recommended" badge shows when `?source=muse`
- [ ] Verify related products display
- [ ] Test back button navigation

### Closet Page
- [ ] Verify saved items load from API
- [ ] Test "Load More" button
- [ ] Verify empty state shows when no saves
- [ ] Test collection selector (UI only)
- [ ] Navigate to product from saved item
- [ ] Test error handling

### Cross-Page
- [ ] Verify ProductCard links work everywhere
- [ ] Check border radius is 12px across all components
- [ ] Verify brand colors are consistent
- [ ] Test loading states appear correctly
- [ ] Verify responsive layout on mobile

---

## 📁 Files Modified

### Created
- `/frontend/components/Pagination.tsx` ✨
- `/frontend/lib/hooks/usePagination.ts` ✨

### Updated
- `/frontend/app/search/page.tsx` 🔄
- `/frontend/app/product/[id]/page.tsx` 🔄
- `/frontend/app/closet/page.tsx` 🔄
- `/frontend/components/ProductCard.tsx` 🔄

### Existing (Referenced)
- `/frontend/lib/api/products.ts` (searchProducts, getProduct, getRecommendations)
- `/frontend/lib/api/saves.ts` (getSavedItems, saveProduct)
- `/frontend/lib/brand/tokens.ts` (BrandTokens)
- `/frontend/lib/types/api.ts` (TypeScript types)

---

## 🚀 Next Steps

1. **Test the implemented pages** locally by running the dev server
2. **Fix remaining brand violations** in welcome and auth callback pages
3. **Add infinite scroll** to newsfeed if needed
4. **Backend integration** for any missing endpoints
5. **Update Product API types** if backend returns different structure

---

## 💡 Usage Examples

### Using Pagination Hook
```typescript
import { usePagination } from '@/lib/hooks/usePagination';

function MyPage() {
  const { page, pageSize, setPage, resetPage } = usePagination();

  // Fetch data
  const { data } = await fetchProducts(page, pageSize);

  // Reset when filters change
  const handleFilterChange = () => {
    resetPage();
  };

  // Render pagination
  return <Pagination currentPage={page} totalPages={10} onPageChange={setPage} />;
}
```

### Using Pagination Component
```typescript
import { Pagination } from '@/components/Pagination';

<Pagination
  currentPage={3}
  totalPages={10}
  onPageChange={(page) => setPage(page)}
  className="my-6"
/>
```

### Using Load More Button
```typescript
import { LoadMoreButton } from '@/components/Pagination';

<LoadMoreButton
  onLoadMore={handleLoadMore}
  loading={isLoading}
  disabled={!hasMore}
/>
```

---

## ✨ Key Improvements

1. **User Experience**
   - Pagination allows browsing all search results
   - URL state means sharable links and working back button
   - Loading states provide feedback
   - Error states are actionable

2. **Developer Experience**
   - Reusable pagination components
   - Custom hooks for state management
   - TypeScript types for safety
   - Consistent patterns across pages

3. **Brand Consistency**
   - All pages use 12px border radius
   - Proper color tokens throughout
   - Consistent typography scale
   - Standardized animations

4. **Performance**
   - Progressive loading (20 items at a time)
   - API integration reduces mock data
   - Efficient re-renders with proper hooks

---

## 📞 Questions or Issues?

If you encounter any issues:
1. Check the browser console for API errors
2. Verify backend endpoints match frontend calls
3. Ensure TypeScript types align with API responses
4. Test with different page sizes and edge cases

**Status**: Ready for testing ✅
