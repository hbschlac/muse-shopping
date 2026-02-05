'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNewsfeed } from '@/lib/hooks/useNewsfeed';
import { trackModuleInteraction, trackStoryView } from '@/lib/api/newsfeed';
import BottomNav from '@/components/BottomNav';
import TabbedRecommendationModule from '@/components/TabbedRecommendationModule';
import InstagramBrandModule from '@/components/InstagramBrandModule';
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
            <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle group-hover:shadow-base transition-shadow duration-150 relative">
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
                    <div className="w-9 h-9 rounded-full bg-white/85 flex items-center justify-center shadow-subtle">
                      <span className="ml-0.5 text-[12px] text-gray-700">▶</span>
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
  const [showMenu, setShowMenu] = useState(false);

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
    { title: 'Trending', type: 'category', logo: null },
    { title: 'Target', type: 'brand', logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png' },
    { title: 'Vintage', type: 'category', logo: null },
    { title: 'Nordstrom', type: 'brand', logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp' },
    { title: 'Under $100', type: 'category', logo: null },
    { title: 'Aeropostale', type: 'brand', logo: 'https://seeklogo.com/images/A/aeropostale-logo-C1F4F5E5F7-seeklogo.com.png' },
    { title: 'Stylist Picks', type: 'category', logo: null },
    { title: 'New Drops', type: 'category', logo: null },
    { title: 'Casual', type: 'category', logo: null },
    { title: 'Elevated', type: 'category', logo: null },
    { title: 'Minimalist', type: 'category', logo: null },
  ];

  const heroCampaigns =
    newsfeedData?.hero_campaigns?.filter((c) => c.is_active) ||
    defaultHeroCampaigns;

  const stories = newsfeedData?.stories || defaultStories.map((story, i) => ({
    id: `story-${i}`,
    title: story.title,
    type: story.type as 'category' | 'brand',
    thumbnail_url: story.logo,
  }));

  const defaultBrandModules = [
    {
      id: 'demo-1',
      brand: { slug: 'target', name: 'Target', logo_url: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png' },
      products: [
        { id: 101, name: 'Oversized Cardigan', price: 34.99, image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', brand: { name: 'Target' } },
        { id: 102, name: 'Graphic Tee', price: 12.99, image_url: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400', brand: { name: 'Target' } },
        { id: 103, name: 'Wide Leg Pants', price: 29.99, original_price: 39.99, image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400', brand: { name: 'Target' } },
      ],
      is_favorite: false,
    },
    {
      id: 'demo-2',
      brand: { slug: 'nordstrom', name: 'Nordstrom', logo_url: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp' },
      products: [
        { id: 201, name: 'Ribbed Knit Dress', price: 78.00, image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', brand: { name: 'Nordstrom' } },
        { id: 202, name: 'Leather Loafers', price: 129.00, image_url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400', brand: { name: 'Nordstrom' } },
        { id: 203, name: 'Wool Blazer', price: 198.00, image_url: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400', brand: { name: 'Nordstrom' } },
      ],
      is_favorite: false,
    },
  ];

  const brandModules = newsfeedData?.brand_modules || defaultBrandModules;

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
    <div className="min-h-screen bg-[var(--color-ecru)] md:flex">
      {/* Sidebar Navigation - Desktop Only */}
      <aside className="hidden md:block md:w-64 md:fixed md:left-0 md:top-0 md:h-screen bg-white border-r border-gray-200 z-30">
        <div className="p-6">
          <img src="/muse-wordmark-gradient.svg" alt="Muse" className="h-16 mb-8" />
          <nav className="space-y-2">
            <Link
              href="/home"
              className="flex items-center gap-3 px-4 py-3 text-gray-900 bg-[var(--color-ecru)] rounded-lg font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </Link>
            <Link
              href="/saves"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Saves
            </Link>
            <Link
              href="/closet"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Closet
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
            <Link
              href="/settings/retailers"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Connected Stores
            </Link>
            <div className="border-t border-gray-200 my-4" />
            {isAuthenticated ? (
              <button
                className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg w-full"
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('refresh_token');
                  window.location.href = '/welcome';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            ) : (
              <Link
                href="/welcome"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content - shifted right on desktop */}
      <div className="flex-1 md:ml-64">
        {/* Header with Logo + Menu - Mobile Only */}
        <header className="md:hidden sticky top-0 z-20 bg-[var(--color-ecru)] pt-3 pb-4 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between relative">
            <img src="/muse-wordmark-gradient.svg" alt="Muse" className="h-20" />
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Menu"
            >
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

            {/* Dropdown Menu - Mobile Only */}
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-[12px] shadow-lg py-2 z-30">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  Settings
                </Link>
                <Link
                  href="/settings/retailers"
                  className="block px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  Connected Stores
                </Link>
                <div className="border-t border-gray-200 my-2" />
                {isAuthenticated ? (
                  <button
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      localStorage.removeItem('auth_token');
                      localStorage.removeItem('refresh_token');
                      window.location.href = '/welcome';
                    }}
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link
                    href="/welcome"
                    className="block px-4 py-2 text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
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
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-2">
                      <img
                        src={story.thumbnail_url}
                        alt={story.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-50 to-gray-100" />
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
              href={`/campaign/${heroCampaigns[currentHero].id}`}
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

      {/* Search/Chat Bar - Enhanced Prominence */}
      <div className="px-4 pt-6 pb-6">
        <div className="max-w-2xl mx-auto">
          {/* Prompt Text */}
          <div className="text-center mb-3">
            <h3 className="text-[17px] font-semibold text-gray-900 mb-1">
              What are you looking for?
            </h3>
            <p className="text-[13px] text-gray-600">
              Search for items or ask Muse for personalized recommendations
            </p>
          </div>

          {/* Enhanced Search Box */}
          <div className="relative h-auto min-h-[64px] max-h-[150px] bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] border-2 border-transparent hover:border-[#F4A785] focus-within:border-[#F1785A] transition-all duration-200 flex items-center px-5 py-4">
            <svg
              className="w-6 h-6 text-[#F1785A] mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <textarea
              placeholder="Search or ask Muse..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-[16px] text-gray-900 placeholder-gray-500 resize-none overflow-y-auto max-h-[102px] leading-relaxed font-medium"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height =
                  Math.min(target.scrollHeight, 102) + 'px';
              }}
            />
            <button
              className="ml-3 px-6 py-3 bg-gradient-to-r from-[#F4A785] to-[#F1785A] text-white text-[14px] font-semibold rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200 flex-shrink-0"
              onClick={() => {
                // Handle chat submission
                console.log('Chat submitted');
              }}
            >
              Ask
            </button>
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
            {/* Tabbed Recommendation Module - Brand Agnostic */}
            <TabbedRecommendationModule userId={user?.id} />

            {/* Context Header for Favorite Brands */}
            {isAuthenticated && brandModules.some((m) => m.is_favorite) && (
              <div className="mb-4 mt-8">
                <h3 className="text-[15px] font-medium text-gray-900 mb-1">
                  Your Favorite Brands
                </h3>
                <p className="text-[13px] text-gray-500">
                  Based on brands you told us you love
                </p>
              </div>
            )}

            {/* Favorite Brand Modules - Instagram Style */}
            {brandModules
              .filter((module) => module.is_favorite)
              .map((module) => (
                <InstagramBrandModule
                  key={module.id}
                  module={module}
                  onView={() => trackModuleInteraction(module.id, 'view').catch(console.error)}
                  onProductClick={() => trackModuleInteraction(module.id, 'click').catch(console.error)}
                />
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

            {/* Recommended Brand Modules - Instagram Style */}
            {brandModules
              .filter((module) => !module.is_favorite)
              .map((module) => (
                <InstagramBrandModule
                  key={module.id}
                  module={module}
                  onView={() => trackModuleInteraction(module.id, 'view').catch(console.error)}
                  onProductClick={() => trackModuleInteraction(module.id, 'click').catch(console.error)}
                />
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

        {/* Bottom Navigation - Mobile Only */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
