'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import ProductTile from './ProductTile';
import BrandLogo from './BrandLogo';
import type { BrandModule } from '@/lib/types/api';

interface HeroCarouselLayoutProps {
  module: BrandModule;
  onView?: () => void;
  onProductClick?: () => void;
}

/**
 * Instagram-Style Hero + Carousel Layout
 * Large hero image/video at top with horizontal scrolling product tiles below
 */
export default function HeroCarouselLayout({
  module,
  onView,
  onProductClick,
}: HeroCarouselLayoutProps) {
  useEffect(() => {
    if (onView) {
      onView();
    }
  }, [module.id]);

  const {
    brand,
    products,
    layout,
    hero,
    styling,
    content,
  } = module;

  // Default layout values if not provided
  const itemsPerView = layout?.items_per_view ?? 3;
  const aspectRatio = (layout?.aspect_ratio as 'portrait' | 'square' | 'landscape') ?? 'portrait';

  // Show items_per_view + 1 to create partial tile hint
  const visibleProducts = products.slice(0, itemsPerView + 1);

  return (
    <div className="mb-8">
      {/* Hero Section */}
      {hero?.image_url && (
        <Link
          href={`/brands/${brand.slug}`}
          className="block relative aspect-[16/9] md:aspect-[21/9] rounded-[12px] overflow-hidden mb-4 group"
        >
          {/* Hero Image or Video */}
          {hero.video_url ? (
            <video
              src={hero.video_url}
              poster={hero.poster_url || hero.image_url}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              autoPlay
            />
          ) : (
            <img
              src={hero.image_url}
              alt={content?.title || brand.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}

          {/* Gradient Overlay */}
          {styling?.gradient_overlay && (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${styling.gradient_overlay}`}
              style={{ opacity: styling.overlay_opacity ?? 0.3 }}
            />
          )}

          {/* Content Overlay */}
          <div
            className="absolute inset-0 flex flex-col justify-end p-6"
            style={{ backgroundColor: `${styling?.background_color ?? '#FFFFFF'}00` }}
          >
            {/* Brand Logo */}
            {content?.show_brand_logo !== false && (
              <BrandLogo
                brandName={brand.name}
                fallbackUrl={brand.logo_url}
                alt={brand.name}
                className="h-8 w-auto mb-3 object-contain"
                containerClassName="flex"
                showFallbackGradient={false}
              />
            )}

            {/* Title */}
            {content?.title && (
              <h2
                className="text-2xl md:text-3xl font-semibold mb-2"
                style={{ color: styling?.text_color ?? '#000000' }}
              >
                {content.title}
              </h2>
            )}

            {/* Subtitle */}
            {content?.subtitle && (
              <p
                className="text-sm md:text-base mb-4"
                style={{ color: styling?.text_color ?? '#000000', opacity: 0.9 }}
              >
                {content.subtitle}
              </p>
            )}

            {/* CTA Button */}
            {content?.cta_text && (
              <div className="mt-4">
                <span
                  className="inline-block px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-150 hover:scale-105"
                  style={{
                    backgroundColor: styling?.text_color ?? '#000000',
                    color: styling?.background_color ?? '#FFFFFF',
                  }}
                >
                  {content.cta_text}
                </span>
              </div>
            )}
          </div>

          {/* Source badge (for debugging - remove in production) */}
          {hero.source === 'auto_generated' && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
              Auto
            </div>
          )}
        </Link>
      )}

      {/* Module Header (if no hero) */}
      {!hero?.image_url && (
        <div className="flex items-center justify-between mb-3">
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
          <Link
            href={`/brands/${brand.slug}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            See all
          </Link>
        </div>
      )}

      {/* Product Carousel */}
      <div className="relative">
        <div
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-2"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPadding: '0 16px',
          }}
        >
          {visibleProducts.map((product, index) => (
            <div
              key={product.id}
              style={{
                scrollSnapAlign: 'start',
                // Show partial tile on last item to hint more content
                opacity: index === itemsPerView ? 0.6 : 1,
              }}
            >
              <ProductTile
                product={product}
                aspectRatio={aspectRatio}
                showDetails={content?.show_item_details ?? true}
                showBrand={false}
                size="md"
                onClick={onProductClick}
              />
            </div>
          ))}

          {/* More products indicator */}
          {products.length > itemsPerView + 1 && (
            <div className="flex-shrink-0 w-[160px] flex items-center justify-center">
              <Link
                href={`/brands/${brand.slug}`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 underline"
              >
                +{products.length - itemsPerView - 1} more
              </Link>
            </div>
          )}
        </div>

        {/* Scroll hint gradient (optional) */}
        {products.length > itemsPerView && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-ecru)] to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
