'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types/api';

interface ProductTileProps {
  product: Product;
  aspectRatio?: 'portrait' | 'square' | 'landscape';
  showDetails?: boolean;
  showBrand?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

/**
 * Reusable Product Tile Component
 * Supports multiple aspect ratios, video playback, and flexible sizing
 */
export default function ProductTile({
  product,
  aspectRatio = 'portrait',
  showDetails = true,
  showBrand = false,
  size = 'md',
  onClick,
}: ProductTileProps) {
  // Size configurations
  const sizeClasses = {
    sm: 'w-[120px]',
    md: 'w-[160px]',
    lg: 'w-[220px]',
  };

  // Aspect ratio configurations
  const aspectClasses = {
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    landscape: 'aspect-[16/9]',
  };

  return (
    <Link
      href={`/product/${product.id}`}
      onClick={onClick}
      className={`flex-shrink-0 ${sizeClasses[size]} group`}
    >
      {/* Product Image/Video Container */}
      <div
        className={`${aspectClasses[aspectRatio]} bg-white rounded-[12px] overflow-hidden mb-2 shadow-subtle group-hover:shadow-base transition-shadow duration-150 relative`}
      >
        {product.media_type === 'video' && product.video_url ? (
          <>
            <video
              src={product.video_url}
              poster={product.video_poster_url || product.image_url}
              className="w-full h-full object-cover pointer-events-none"
              muted
              loop
              playsInline
              onMouseEnter={(e) => e.currentTarget.play()}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-subtle">
                <span className="ml-0.5 text-sm text-gray-700">▶</span>
              </div>
            </div>
          </>
        ) : product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}

        {/* Sale Badge */}
        {product.original_price_cents &&
          product.price_cents &&
          product.original_price_cents > product.price_cents && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
              SALE
            </div>
          )}
      </div>

      {/* Product Details */}
      {showDetails && (
        <div className="space-y-0.5">
          {/* Brand Name */}
          {showBrand && product.brand_name && (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {product.brand_name}
            </p>
          )}

          {/* Product Name */}
          <p className="text-sm font-medium text-gray-900 truncate">
            {product.name}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-semibold text-gray-900">
              ${((product.price_cents || 0) / 100).toFixed(2)}
            </p>
            {product.original_price_cents &&
              product.price_cents &&
              product.original_price_cents > product.price_cents && (
                <p className="text-xs line-through text-gray-400">
                  ${(product.original_price_cents / 100).toFixed(2)}
                </p>
              )}
          </div>
        </div>
      )}
    </Link>
  );
}
