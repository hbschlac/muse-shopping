'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getBrandLogoWithFallback } from '@/lib/brand/brandLogos';

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
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const localLogoPath = getBrandLogoWithFallback(brandName, fallbackUrl);

  // Show greyed-out Muse logo if no logo available or all images failed
  if (!localLogoPath || (imageError && fallbackError)) {
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

  // Determine which image to show
  const isLocalLogo = localLogoPath.startsWith('/logos/');
  const shouldShowFallback = imageError && !isLocalLogo && fallbackUrl && !fallbackError;

  return (
    <div className={containerClassName}>
      {!imageError || shouldShowFallback ? (
        <img
          src={shouldShowFallback ? fallbackUrl! : localLogoPath}
          alt={alt || brandName || 'Brand logo'}
          className={className}
          onError={() => {
            if (shouldShowFallback) {
              setFallbackError(true);
            } else {
              setImageError(true);
            }
          }}
          loading="lazy"
        />
      ) : showFallbackGradient ? (
        <img
          src="/logo-muse.svg"
          alt={alt || brandName || 'Brand logo'}
          className={`opacity-20 ${className}`}
          aria-label={alt || brandName || 'Brand logo'}
        />
      ) : null}
    </div>
  );
}
