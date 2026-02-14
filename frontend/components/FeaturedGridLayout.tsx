'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import ProductTile from './ProductTile';
import BrandLogo from './BrandLogo';
import type { BrandModule, Product } from '@/lib/types/api';

interface FeaturedGridLayoutProps {
  module: BrandModule;
  onView?: () => void;
  onProductClick?: () => void;
}

/**
 * Featured Item + Grid Layout
 * Large featured product on left, grid of smaller products on right
 * Responsive: stacks vertically on mobile
 */
export default function FeaturedGridLayout({
  module,
  onView,
  onProductClick,
}: FeaturedGridLayoutProps) {
  useEffect(() => {
    if (onView) {
      onView();
    }
  }, [module.id]);

  const { brand, products, content, featured_item_id } = module;

  // Find featured product
  let featuredProduct: Product | undefined;
  let gridProducts: Product[];

  if (featured_item_id) {
    featuredProduct = products.find((p) => p.id === featured_item_id);
    gridProducts = products.filter((p) => p.id !== featured_item_id);
  } else {
    // Default to first product as featured
    featuredProduct = products[0];
    gridProducts = products.slice(1);
  }

  // Show max 6 grid items (2x3 grid)
  const visibleGridProducts = gridProducts.slice(0, 6);

  return (
    <div className="mb-8">
      {/* Module Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {brand.logo_url && (
            <BrandLogo
              brandName={brand.name}
              fallbackUrl={brand.logo_url}
              alt={brand.name}
              className="w-8 h-8 object-contain"
              showFallbackGradient={false}
            />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {content?.title || brand.name}
            </h3>
            {content?.subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">
                {content.subtitle}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/brands/${brand.slug}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          See all
        </Link>
      </div>

      {/* Layout Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Featured Product (Left - 60% width on desktop) */}
        {featuredProduct && (
          <div className="md:col-span-1">
            <Link
              href={`/product/${featuredProduct.id}`}
              onClick={onProductClick}
              className="block group"
            >
              <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden shadow-subtle group-hover:shadow-base transition-shadow duration-150 relative">
                {featuredProduct.media_type === 'video' &&
                featuredProduct.video_url ? (
                  <>
                    <video
                      src={featuredProduct.video_url}
                      poster={
                        featuredProduct.video_poster_url ||
                        featuredProduct.image_url
                      }
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
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-subtle">
                        <span className="ml-0.5 text-base text-gray-700">▶</span>
                      </div>
                    </div>
                  </>
                ) : featuredProduct.image_url ? (
                  <img
                    src={featuredProduct.image_url}
                    alt={featuredProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                )}

                {/* Featured Badge */}
                <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/80 text-white text-xs font-semibold rounded">
                  FEATURED
                </div>

                {/* Sale Badge */}
                {featuredProduct.original_price_cents &&
                  featuredProduct.price_cents &&
                  featuredProduct.original_price_cents > featuredProduct.price_cents && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded">
                      SALE
                    </div>
                  )}
              </div>

              {/* Featured Product Details */}
              {content?.show_item_details !== false && (
                <div className="mt-3 space-y-1">
                  <p className="text-base font-medium text-gray-900">
                    {featuredProduct.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-base font-semibold text-gray-900">
                      ${((featuredProduct.price_cents || 0) / 100).toFixed(2)}
                    </p>
                    {featuredProduct.original_price_cents &&
                      featuredProduct.price_cents &&
                      featuredProduct.original_price_cents > featuredProduct.price_cents && (
                        <p className="text-sm line-through text-gray-400">
                          ${(featuredProduct.original_price_cents / 100).toFixed(2)}
                        </p>
                      )}
                  </div>
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Grid of Products (Right - 40% width on desktop) */}
        <div className="md:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {visibleGridProducts.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                aspectRatio="portrait"
                showDetails={content?.show_item_details}
                showBrand={false}
                size="sm"
                onClick={onProductClick}
              />
            ))}

            {/* More items card */}
            {gridProducts.length > 6 && (
              <Link
                href={`/brands/${brand.slug}`}
                className="aspect-[3/4] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center hover:bg-gray-200 transition-colors duration-150"
              >
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    +{gridProducts.length - 6}
                  </p>
                  <p className="text-xs text-gray-600">More items</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
