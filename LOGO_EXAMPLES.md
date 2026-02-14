# Muse Logo Usage Examples

## Quick Reference

```tsx
import MuseLogo from '@/components/MuseLogo';
import { getMuseLogo, MUSE_LOGOS } from '@/lib/brand';
```

## Common Use Cases

### 1. Hero Section (Light Background)
```tsx
<div className="bg-white">
  <MuseLogo className="h-40 md:h-48" />
</div>
```
**Result**: Uses gradient wordmark (default)

### 2. Dark Background / Dark Mode
```tsx
<div className="bg-gray-900">
  <MuseLogo background="dark" className="h-16" />
</div>
```
**Result**: Uses white wordmark automatically

### 3. Navigation Header
```tsx
<nav className="bg-white border-b">
  <MuseLogo className="h-10" />
</nav>
```
**Result**: Uses gradient wordmark

### 4. Footer on Dark Background
```tsx
<footer className="bg-black text-white">
  <MuseLogo background="dark" className="h-12" />
</footer>
```
**Result**: Uses white wordmark

### 5. Loading Screen Icon (Dark)
```tsx
<div className="bg-gradient-to-br from-purple-900 to-blue-900">
  <MuseLogo variant="lettermark" background="dark" className="h-16 animate-pulse" />
</div>
```
**Result**: Uses white lettermark icon

### 6. Auth Pages (Minimal)
```tsx
<div className="bg-white">
  <MuseLogo style="solid" className="h-24" />
</div>
```
**Result**: Uses solid black wordmark

### 7. Subtle Branding
```tsx
<div className="bg-gray-50">
  <MuseLogo style="grey" className="h-8" />
</div>
```
**Result**: Uses grey wordmark

## Using with Utility Functions

### Direct Path Access
```tsx
// Get the path and use in a custom component
const logoSrc = getMuseLogo({ background: 'dark' });

<img src={logoSrc} alt="Muse" className="h-16" />
```

### Constants
```tsx
// Access logo paths directly
<img src={MUSE_LOGOS.wordmark.white} alt="Muse" />
<img src={MUSE_LOGOS.lettermark.white} alt="Muse" />
```

## Real World Examples

### Welcome Screen
```tsx
export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <MuseLogo className="h-40 md:h-48" />
      <h1 className="text-2xl font-medium mt-8">Welcome to Muse</h1>
    </div>
  );
}
```

### Newsfeed Header
```tsx
export default function NewsfeedHeader() {
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <MuseLogo className="h-16 md:h-20" />
        <button>Menu</button>
      </div>
    </header>
  );
}
```

### Dark Mode Hero
```tsx
export default function DarkHero() {
  return (
    <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-20">
        <MuseLogo background="dark" className="h-32 mb-8" />
        <h1 className="text-4xl font-bold">Discover Your Style</h1>
      </div>
    </div>
  );
}
```

### Email Header
```tsx
export default function EmailHeader() {
  return (
    <div className="bg-white border-b">
      <MuseLogo className="h-24 mx-auto" />
    </div>
  );
}
```

### Loading Spinner with Logo
```tsx
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
      <div className="text-center">
        <MuseLogo
          variant="lettermark"
          background="dark"
          className="h-20 mx-auto animate-pulse"
        />
        <p className="text-white mt-4">Loading...</p>
      </div>
    </div>
  );
}
```

### App Header with Logo
```tsx
export default function AppHeader() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link href="/">
            <MuseLogo className="h-10" />
          </Link>
          <nav>...</nav>
        </div>
      </div>
    </header>
  );
}
```

## Migration Examples

### Before (Hardcoded Path)
```tsx
<img src="/muse-wordmark-gradient.svg" alt="Muse" className="h-16" />
```

### After (Using Component)
```tsx
<MuseLogo className="h-16" />
```

---

### Before (Manual Dark Mode Handling)
```tsx
const isDark = useTheme();
<img
  src={isDark ? "/muse-wordmark-white.svg" : "/muse-wordmark-gradient.svg"}
  alt="Muse"
  className="h-16"
/>
```

### After (Automatic)
```tsx
const isDark = useTheme();
<MuseLogo background={isDark ? 'dark' : 'light'} className="h-16" />
```

## Tips

1. **Always specify className** - The logo needs dimensions to display properly
2. **Use background prop for automatic selection** - The component will choose the right variant
3. **Prefer wordmark over lettermark** - Use lettermark only when space is very limited
4. **Test on actual backgrounds** - Make sure the logo has sufficient contrast
5. **Use priority loading for above-fold logos** - Add `priority` prop for important logos

```tsx
<MuseLogo className="h-16" priority />
```
