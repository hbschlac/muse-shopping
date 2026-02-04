'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNewsfeed } from '@/lib/hooks/useNewsfeed';
import { trackModuleInteraction, trackStoryView } from '@/lib/api/newsfeed';
import BottomNav from '@/components/BottomNav';
import type { Product, BrandModule as BrandModuleType } from '@/lib/types/api';

/**
 * Brand Module Component - Horizontal scrolling product carousel
 */
function BrandModule({ module }: { module: BrandModuleType }) {
  const handleModuleView = () => {
    trackModuleInteraction(module.id, 'view').catch(console.error);
  };

  const handleProductClick = () => {
    trackModuleInteraction(module.id, 'click').catch(console.error);
  };

  useEffect(() => {
    handleModuleView();
  }, [module.id]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/brands/${module.brand.slug}`}
          className="text-[17px] font-semibold text-gray-900 hover:text-gray-700"
        >
          {module.brand.name}
        </Link>
        <Link
          href={`/brands/${module.brand.slug}`}
          className="text-[13px] text-gray-500 hover:text-gray-700"
        >
          See all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        {module.products.map((product: Product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            onClick={handleProductClick}
            className="flex-shrink-0 w-[140px] group"
          >
            <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle group-hover:shadow-base transition-shadow duration-150">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
              )}
            </div>
            <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">
              {product.name}
            </p>
            <p className="text-[11px] text-gray-600">
              ${product.price.toFixed(2)}
              {product.original_price && product.original_price > product.price && (
                <span className="ml-1 line-through text-gray-400">
                  ${product.original_price.toFixed(2)}
                </span>
              )}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Newsfeed Component
 */
export default function Newsfeed() {
  const { user, isAuthenticated } = useAuth();
  const { data: newsfeedData, loading, error } = useNewsfeed({
    userId: user?.id,
    enabled: true,
  });

  const [currentHero, setCurrentHero] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Default fallback data for hero campaigns
  const defaultHeroCampaigns = [
    {
      id: '1',
      title: 'Winter Collection 2024',
      subtitle: "Discover the season's must-haves",
      cta_text: 'Shop Now',
      cta_url: '/search?q=winter',
      gradient: 'from-[#F4A785]/20 to-[#8EC5FF]/20',
      is_active: true,
      priority: 1,
    },
    {
      id: '2',
      title: 'Spring Refresh',
      subtitle: 'Fresh styles for the new season',
      cta_text: 'Explore',
      cta_url: '/search?q=spring',
      gradient: 'from-[#8EC5FF]/20 to-[#F4A785]/20',
      is_active: true,
      priority: 2,
    },
    {
      id: '3',
      title: 'Sustainable Style',
      subtitle: 'Shop eco-friendly fashion',
      cta_text: 'Shop Sustainable',
      cta_url: '/search?q=sustainable',
      gradient: 'from-[#F1785A]/20 to-[#F4A785]/20',
      is_active: true,
      priority: 3,
    },
  ];

  const defaultStories = [
    'Trending',
    'Vintage',
    'Under $100',
    'Stylist Picks',
    'New Drops',
    'Casual',
    'Elevated',
    'Minimalist',
    'Boho',
    'Classic',
    'Edgy',
    'Romantic',
    'Athleisure',
    'Workwear',
    'Weekend',
  ];

  const heroCampaigns =
    newsfeedData?.hero_campaigns?.filter((c) => c.is_active) ||
    defaultHeroCampaigns;

  const stories = newsfeedData?.stories || defaultStories.map((title, i) => ({
    id: `story-${i}`,
    title,
    type: 'category' as const,
  }));

  const brandModules = newsfeedData?.brand_modules || [];

  // Auto-rotate hero banner
  useEffect(() => {
    if (heroCampaigns.length === 0) return;

    const interval = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroCampaigns.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroCampaigns.length]);

  // Scroll button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStoryClick = (storyId: string) => {
    trackStoryView(storyId).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      {/* Header with Logo + Menu */}
      <header className="sticky top-0 z-20 bg-[var(--color-ecru)] pt-3 pb-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img src="/logo-m.svg" alt="Muse" className="h-8" />
          <button className="p-2">
            <svg
              className="w-6 h-6 text-gray-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Stories Row */}
      <div className="px-4 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/stories/${story.id}`}
                onClick={() => handleStoryClick(story.id)}
                className="flex flex-col items-center gap-2 flex-shrink-0"
              >
                <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-br from-[#F4A785] to-[#F1785A]">
                  {story.thumbnail_url ? (
                    <img
                      src={story.thumbnail_url}
                      alt={story.title}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200" />
                  )}
                </div>
                <span className="text-[11px] font-medium text-gray-700">
                  {story.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Banner (Auto-Rotating) */}
      {heroCampaigns.length > 0 && (
        <div className="px-4 pt-4">
          <div className="max-w-7xl mx-auto">
            <Link
              href={heroCampaigns[currentHero].cta_url || '#'}
              className={`block relative aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br ${
                heroCampaigns[currentHero].gradient ||
                'from-[#F4A785]/20 to-[#8EC5FF]/20'
              } rounded-[12px] overflow-hidden transition-all duration-700`}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                  Sponsored
                </p>
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
                  {heroCampaigns[currentHero].title}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  {heroCampaigns[currentHero].subtitle}
                </p>
                <span className="px-6 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors duration-150">
                  {heroCampaigns[currentHero].cta_text}
                </span>
              </div>
            </Link>

            {/* Hero Indicators */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {heroCampaigns.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentHero(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-150 ${
                    index === currentHero
                      ? 'bg-gray-900 w-6'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to campaign ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search/Chat Bar */}
      <div className="px-4 pt-6 pb-2">
        <div className="max-w-md mx-auto">
          <div className="relative h-auto min-h-[56px] max-h-[150px] bg-white rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center px-4 py-3">
            <svg
              className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <textarea
              placeholder="Search or ask Muse..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-900 placeholder-gray-400 resize-none overflow-y-auto max-h-[102px] leading-relaxed"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height =
                  Math.min(target.scrollHeight, 102) + 'px';
              }}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="px-4 pt-8 pb-24">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-gray-500">Loading your personalized feed...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="px-4 pt-8 pb-24">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-red-500">Failed to load newsfeed. Please try again.</p>
          </div>
        </div>
      )}

      {/* Brand Modules */}
      {!loading && !error && (
        <div className="px-4 pt-6 pb-24">
          <div className="max-w-7xl mx-auto">
            {/* Context Header for Favorite Brands */}
            {isAuthenticated && brandModules.some((m) => m.is_favorite) && (
              <div className="mb-4">
                <h3 className="text-[15px] font-medium text-gray-900 mb-1">
                  Your Favorite Brands
                </h3>
                <p className="text-[13px] text-gray-500">
                  Based on brands you told us you love
                </p>
              </div>
            )}

            {/* Favorite Brand Modules */}
            {brandModules
              .filter((module) => module.is_favorite)
              .map((module) => (
                <BrandModule key={module.id} module={module} />
              ))}

            {/* Context Header for Recommended Brands */}
            {brandModules.some((m) => !m.is_favorite) && (
              <div className="mb-4 mt-8">
                <h3 className="text-[15px] font-medium text-gray-900 mb-1">
                  Recommended For You
                </h3>
                <p className="text-[13px] text-gray-500">
                  {isAuthenticated
                    ? "Brands we think you'll love based on your style"
                    : 'Popular brands for you'}
                </p>
              </div>
            )}

            {/* Recommended Brand Modules */}
            {brandModules
              .filter((module) => !module.is_favorite)
              .map((module) => (
                <BrandModule key={module.id} module={module} />
              ))}

            {/* Empty State */}
            {brandModules.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  No brands to show yet. Start exploring!
                </p>
                <Link
                  href="/search"
                  className="inline-block px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800"
                >
                  Browse All Brands
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollButton && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-10 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors duration-150"
          aria-label="Scroll to top"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
