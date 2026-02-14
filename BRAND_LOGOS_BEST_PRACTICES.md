# Brand Logos - Best Practices Guide

## Overview
This document outlines best practices for managing brand logos in the Muse shopping app.

## ✅ Current Implementation

### 1. **Fallback Strategy**
- ✅ Local logos prioritized (`/logos/brands/{brand-name}.png`)
- ✅ Fallback to provided URLs
- ✅ Greyed-out Muse logo as final fallback (20% opacity)
- ✅ Graceful degradation throughout

### 2. **Error Handling**
- ✅ Retry logic with exponential backoff (3 attempts)
- ✅ Network error recovery
- ✅ 404 handling (no unnecessary retries)
- ✅ Component-level error state management

### 3. **Performance Optimizations**
- ✅ Lazy loading by default (`loading="lazy"`)
- ✅ Rate limiting (0.5s between requests)
- ✅ Size optimization (128px from Clearbit)
- ✅ File size validation (500KB max)
- ✅ Incremental updates (ONLY_MISSING mode)

### 4. **Accessibility**
- ✅ Proper alt text for all images
- ✅ ARIA labels for fallback states
- ✅ Semantic HTML structure

## 🔄 Recommended Improvements

### Priority 1: Critical

#### 1. Use Next.js Image Component
**Current:** Using regular `<img>` tags
**Recommended:** Switch to `next/image` for automatic optimization

```tsx
import Image from 'next/image';

<Image
  src={logoPath}
  alt={brandName}
  width={32}
  height={32}
  loading="lazy"
/>
```

**Benefits:**
- Automatic WebP conversion
- Responsive image sizing
- Built-in lazy loading
- Better performance

**Trade-off:** External URLs require next.config.js configuration

#### 2. Implement HTTP Caching Headers
**Current:** No cache configuration
**Recommended:** Add cache headers via next.config.js

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/logos/brands/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

**Benefits:**
- Reduced bandwidth
- Faster page loads
- Lower server load

#### 3. Add Logo Validation Script
**Current:** No validation after download
**Recommended:** Create validation script

```bash
# Check for corrupted/invalid images
node scripts/validate-logos.js
```

### Priority 2: Recommended

#### 4. Convert to WebP Format
**Current:** PNG only
**Recommended:** WebP with PNG fallback

```bash
# Convert all PNGs to WebP
for file in frontend/public/logos/brands/*.png; do
  cwebp -q 80 "$file" -o "${file%.png}.webp"
done
```

**Benefits:**
- 25-35% smaller file sizes
- Faster loading
- Same visual quality

#### 5. Implement CDN
**Current:** Serving from origin server
**Recommended:** Use Vercel's built-in CDN or external CDN

**Benefits:**
- Global distribution
- Reduced latency
- Better availability

#### 6. Add Logo Preloading for Above-Fold Content
**Current:** All logos lazy loaded
**Recommended:** Preload critical logos

```tsx
<BrandLogo
  brandName="Nordstrom"
  priority={true} // For above-the-fold content
/>
```

### Priority 3: Nice to Have

#### 7. Implement Logo Versioning
**Recommended:** Add version numbers or timestamps

```
/logos/brands/nordstrom.png?v=1234567890
```

**Benefits:**
- Cache busting on updates
- Version tracking
- Rollback capability

#### 8. Create Logo Health Dashboard
**Recommended:** Build admin dashboard showing:
- Missing logos
- Failed loads
- Logo freshness
- File sizes

#### 9. Automated Logo Updates
**Recommended:** Scheduled cron job

```bash
# Run weekly via cron
0 2 * * 0 cd /app && ONLY_MISSING=1 python3 scripts/fetch_brand_logos.py
```

## 📋 Usage Guidelines

### When to Use BrandLogo Component
✅ **Use for:**
- Story circles in newsfeed
- Brand module headers
- Brand directory listings
- Product brand badges

❌ **Don't use for:**
- Large hero images (use regular Image)
- One-off custom graphics
- Non-brand imagery

### Component Props Best Practices

```tsx
// ✅ Good: Provides fallback and proper context
<BrandLogo
  brandName="Nordstrom"
  fallbackUrl="https://example.com/nordstrom-logo.png"
  alt="Nordstrom brand logo"
  className="w-8 h-8 object-contain"
/>

// ❌ Bad: No fallback, unclear sizing
<BrandLogo
  brandName="Nordstrom"
  className="w-full"
/>
```

## 🚨 Common Pitfalls

### 1. Logo Not Showing
**Causes:**
- File doesn't exist at path
- Incorrect filename sanitization
- Network error during fetch
- File corruption

**Debug:**
```bash
# Check if logo exists
ls -la frontend/public/logos/brands/nordstrom.png

# Check fetch report
grep "Nordstrom" brand_logo_report.csv
```

### 2. Slow Loading
**Causes:**
- Large file sizes
- Not using lazy loading
- No caching
- External URLs

**Solutions:**
- Optimize images (WebP, compression)
- Enable lazy loading
- Implement caching
- Use local copies

### 3. Inconsistent Sizes
**Causes:**
- Logos have different aspect ratios
- Missing size constraints

**Solutions:**
- Use `object-contain` class
- Set fixed dimensions
- Request specific size from API

## 🔧 Maintenance

### Regular Tasks

**Weekly:**
- [ ] Run logo fetcher for new brands
- [ ] Review error logs
- [ ] Check for 404s

**Monthly:**
- [ ] Validate all logos
- [ ] Remove unused logos
- [ ] Update fallback URLs

**Quarterly:**
- [ ] Review file sizes
- [ ] Optimize storage
- [ ] Update documentation

## 📊 Monitoring

### Key Metrics to Track
- Logo hit rate (local vs fallback)
- Average file size
- Load time impact
- 404 rate
- Cache hit rate

### Suggested Tools
- Vercel Analytics for performance
- Sentry for error tracking
- Custom logging for logo loads

## 🔐 Security Considerations

### Current Protections
- ✅ File size limits (500KB)
- ✅ File type validation
- ✅ Sanitized filenames
- ✅ No user-uploaded content

### Additional Recommendations
- Implement Content Security Policy (CSP)
- Scan downloaded images for malware
- Rate limit downloads per IP
- Use signed URLs for external sources

## 📚 Resources

### Scripts
- `scripts/fetch_brand_logos.py` - Download logos
- `frontend/lib/brand/brandLogos.ts` - Logo utilities

### Components
- `frontend/components/BrandLogo.tsx` - Main component

### Data Files
- `TARGET_BRANDS_1000.csv` - Brand list
- `brand_logo_report.csv` - Fetch results
- `TARGET_BRANDS_1000_with_logos.csv` - Updated brand data

## 🤝 Contributing

When adding new brands:
1. Add to `TARGET_BRANDS_1000.csv`
2. Run: `ONLY_MISSING=1 python3 scripts/fetch_brand_logos.py`
3. Verify logo appears in app
4. Update report if needed

When updating existing logos:
1. Run: `OVERWRITE=1 python3 scripts/fetch_brand_logos.py`
2. Test in development
3. Deploy with cache busting

---

**Last Updated:** 2026-02-04
**Version:** 1.0
