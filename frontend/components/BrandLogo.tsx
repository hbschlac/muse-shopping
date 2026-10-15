'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getBrandLogo } from '@/lib/brand/brandLogos';

interface BrandLogoProps {
  brandName: string;
  fallbackUrl?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  showFallbackGradient?: boolean;
  priority?: boolean; // For above-the-fold images
}

/**
 * BrandLogo Component
 * Displays brand logos with automatic fallback handling
 * - Tries local logo first (/logos/brands/{brand-name}.png)
 * - Falls back to provided URL if local logo fails
 * - Shows greyed-out Muse logo if no logo available
 *
 * Best Practices:
 * - Uses Next.js Image for automatic optimization
 * - Implements lazy loading by default
 * - Graceful fallback chain with error handling
 * - Accessible with proper alt text
 */
export default function BrandLogo({
  brandName,
  fallbackUrl,
  alt,
  className = '',
  containerClassName = '',
  showFallbackGradient = true,
  priority = false,
}: BrandLogoProps) {
  const [failed, setFailed] = useState<string[]>([]);

  // Try each source in order, skipping any that has already failed to load.
  const candidates = [getBrandLogo(brandName), fallbackUrl].filter((s): s is string => !!s);
  const src = candidates.find((c) => !failed.includes(c));
  const markFailed = (s: string) => setFailed((f) => (f.includes(s) ? f : [...f, s]));

  // Show greyed-out Muse logo if no logo available or all images failed
  if (!src) {
    if (showFallbackGradient) {
      return (
        <div className={containerClassName}>
          <img
            src="/logo-muse.svg"
            alt={alt || brandName || 'Brand logo'}
            className={`opacity-20 ${className}`}
            aria-label={alt || brandName || 'Brand logo'}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div className={containerClassName}>
      <img
        key={src}
        // A server-rendered image can 404 before React attaches onError, which
        // leaves a broken image on screen; catch that once the element mounts.
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) markFailed(src);
        }}
        src={src}
        alt={alt || brandName || 'Brand logo'}
        className={className}
        onError={() => markFailed(src)}
        loading="lazy"
      />
    </div>
  );
}
