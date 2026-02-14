'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNewsfeed } from '@/lib/hooks/useNewsfeed';
import { trackModuleInteraction, trackStoryView } from '@/lib/api/newsfeed';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import TabbedRecommendationModule from '@/components/TabbedRecommendationModule';
import InstagramBrandModule from '@/components/InstagramBrandModule';
import BrandLogo from '@/components/BrandLogo';
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
      <div className="flex items-center mb-3">
        <div className="flex items-center gap-2">
          {module.brand.logo_url && (
            <BrandLogo
              brandName={module.brand.name}
              fallbackUrl={module.brand.logo_url}
              alt={module.brand.name}
              className="w-8 h-8 object-contain"
              showFallbackGradient={false}
            />
          )}
          <span className="text-lg font-semibold text-gray-900">
            {module.brand.name}
          </span>
        </div>
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
                      <span className="ml-0.5 text-xs text-gray-700">▶</span>
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
            <p className="text-sm font-medium text-gray-900 truncate mb-0.5">
              {product.name}
            </p>
            <p className="text-xs text-gray-600">
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
  const {
    data: newsfeedData,
    allModules,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useNewsfeed({
    userId: user?.id,
    enabled: true,
    initialLimit: 5,
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
      gradient: 'from-[var(--color-peach-light)]/20 to-[var(--color-blue)]/20',
      is_active: true,
      priority: 1,
    },
    {
      id: '2',
      title: 'Spring Refresh',
      subtitle: 'Fresh styles for the new season',
      cta_text: 'Explore',
      cta_url: '/search?q=spring',
      gradient: 'from-[var(--color-blue)]/20 to-[var(--color-peach-light)]/20',
      is_active: true,
      priority: 2,
    },
    {
      id: '3',
      title: 'Sustainable Style',
      subtitle: 'Shop eco-friendly fashion',
      cta_text: 'Shop Sustainable',
      cta_url: '/search?q=sustainable',
      gradient: 'from-[var(--color-coral)]/20 to-[var(--color-peach-light)]/20',
      is_active: true,
      priority: 3,
    },
  ];

  const defaultStories = [
    { title: 'Trending', type: 'category', logo: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop' },
    { title: 'Target', type: 'brand', logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png' },
    { title: 'Vintage', type: 'category', logo: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200&h=200&fit=crop' },
    { title: 'Nordstrom', type: 'brand', logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp' },
    { title: 'Under $100', type: 'category', logo: 'https://images.unsplash.com/photo-1558769132-cb1aea3c8565?w=200&h=200&fit=crop' },
    { title: 'Aeropostale', type: 'brand', logo: 'https://seeklogo.com/images/A/aeropostale-logo-C1F4F5E5F7-seeklogo.com.png' },
    { title: 'Stylist Picks', type: 'category', logo: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200&h=200&fit=crop' },
    { title: 'New Drops', type: 'category', logo: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop' },
    { title: 'Casual', type: 'category', logo: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop' },
    { title: 'Elevated', type: 'category', logo: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=200&h=200&fit=crop' },
    { title: 'Minimalist', type: 'category', logo: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=200&h=200&fit=crop' },
  ];

  const heroCampaigns = (newsfeedData?.hero_campaigns && newsfeedData.hero_campaigns.length > 0)
    ? newsfeedData.hero_campaigns.filter((c) => c.is_active)
    : defaultHeroCampaigns;

  const stories = (newsfeedData?.stories && newsfeedData.stories.length > 0)
    ? newsfeedData.stories
    : defaultStories.map((story, i) => ({
        id: `story-${i}`,
        title: story.title,
        type: story.type as 'category' | 'brand',
        thumbnail_url: story.logo,
      }));

  // Generate demo products for a brand (at least 20 items)
  const generateDemoProducts = (brandId: string, brandName: string, count: number = 20) => {
    const products = [];
    const imageUrls = [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400',
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400',
      'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
      'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400',
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400',
      'https://images.unsplash.com/photo-1590393876866-0102587b0657?w=400',
      'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?w=400',
    ];

    const productNames = [
      'Oversized Cardigan', 'Graphic Tee', 'Wide Leg Pants', 'Ribbed Knit Dress',
      'Leather Loafers', 'Wool Blazer', 'Classic White Tee', 'High-Rise Jeans',
      'Leather Crossbody Bag', 'Cashmere Sweater', 'Ankle Boots', 'Silk Midi Skirt',
      'Linen Shirt Dress', 'Canvas Tote Bag', 'Bamboo Tank Top', 'Hemp Blend Sweater',
      'Tencel Midi Skirt', 'Organic Cotton Tee', 'Recycled Denim Jeans', 'Floral Print Midi Dress',
      'Linen Blend Blazer', 'Wide Leg Trousers', 'Cropped Cardigan', 'Ribbed Tank Top',
    ];

    for (let i = 0; i < count; i++) {
      const price = Math.floor(Math.random() * 150) + 20;
      const hasDiscount = Math.random() > 0.7;
      const originalPrice = hasDiscount ? price + Math.floor(Math.random() * 50) + 10 : undefined;

      products.push({
        id: `${brandId}-${i + 1}`,
        name: productNames[i % productNames.length],
        price,
        original_price: originalPrice,
        image_url: imageUrls[i % imageUrls.length],
        brand_id: brandId,
        brand_name: brandName,
        currency: 'USD',
        in_stock: true,
        retailer_name: brandName,
        retailer_product_url: '#',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return products;
  };

  // Generate many more demo brand modules for endless scrolling
  const demoBrands = [
    { id: 'thecommense', slug: 'the-commense', name: 'The Commense', logo_url: 'https://thecommense.com/cdn/shop/files/logo.png' },
    { id: 'sunfere', slug: 'sunfere', name: 'Sunfere', logo_url: 'https://sunfere.com/cdn/shop/files/logo.png' },
    { id: 'shopcider', slug: 'shop-cider', name: 'Shop Cider', logo_url: 'https://shopcider.com/cdn/shop/files/logo.png' },
    { id: 'target', slug: 'target', name: 'Target', logo_url: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png' },
    { id: 'nordstrom', slug: 'nordstrom', name: 'Nordstrom', logo_url: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp' },
    { id: 'zara', slug: 'zara', name: 'ZARA', logo_url: 'https://logos-world.net/wp-content/uploads/2020/04/Zara-Logo.png' },
    { id: 'hm', slug: 'hm', name: 'H&M', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/2560px-H%26M-Logo.svg.png' },
    { id: 'reformation', slug: 'reformation', name: 'Reformation', logo_url: 'https://www.thereformation.com/on/demandware.static/-/Library-Sites-REFSharedLibrary/default/dw9a4b8c7e/images/logos/ref-logo.svg' },
    { id: 'madewell', slug: 'madewell', name: 'Madewell', logo_url: 'https://www.madewell.com/images/madewell-logo.svg' },
    { id: 'everlane', slug: 'everlane', name: 'Everlane', logo_url: 'https://www.everlane.com/assets/logo.svg' },
    { id: 'asos', slug: 'asos', name: 'ASOS', logo_url: 'https://www.asos.com/images/asos-logo.svg' },
    { id: 'gap', slug: 'gap', name: 'Gap', logo_url: 'https://logos-world.net/wp-content/uploads/2020/09/Gap-Logo.png' },
    { id: 'oldnavy', slug: 'oldnavy', name: 'Old Navy', logo_url: 'https://logos-world.net/wp-content/uploads/2020/12/Old-Navy-Logo.png' },
    { id: 'uniqlo', slug: 'uniqlo', name: 'Uniqlo', logo_url: 'https://logos-world.net/wp-content/uploads/2020/12/Uniqlo-Logo.png' },
    { id: 'anthropologie', slug: 'anthropologie', name: 'Anthropologie', logo_url: 'https://images.urbndata.com/is/image/Anthropologie/anthro-logo' },
    { id: 'urbanoutfitters', slug: 'urbanoutfitters', name: 'Urban Outfitters', logo_url: 'https://logos-world.net/wp-content/uploads/2020/12/Urban-Outfitters-Logo.png' },
    { id: 'freepeople', slug: 'freepeople', name: 'Free People', logo_url: 'https://www.freepeople.com/images/fp-logo.svg' },
    { id: 'jcrew', slug: 'jcrew', name: 'J.Crew', logo_url: 'https://www.jcrew.com/images/jcrew-logo.svg' },
    { id: 'bananarepublic', slug: 'bananarepublic', name: 'Banana Republic', logo_url: 'https://www.bananarepublic.com/images/br-logo.svg' },
    { id: 'macys', slug: 'macys', name: "Macy's", logo_url: 'https://logos-world.net/wp-content/uploads/2020/11/Macys-Logo.png' },
    { id: 'bloomingdales', slug: 'bloomingdales', name: "Bloomingdale's", logo_url: 'https://www.bloomingdales.com/images/bloomingdales-logo.svg' },
    { id: 'saks', slug: 'saks', name: 'Saks Fifth Avenue', logo_url: 'https://www.saksfifthavenue.com/images/saks-logo.svg' },
    { id: 'abercrombie', slug: 'abercrombie', name: 'Abercrombie & Fitch', logo_url: 'https://logos-world.net/wp-content/uploads/2020/12/Abercrombie-Fitch-Logo.png' },
  ];

  const defaultBrandModules = demoBrands.map((brand, index) => ({
    id: `demo-${index + 1}`,
    brand: { ...brand, is_active: true },
    products: generateDemoProducts(brand.id, brand.name, 24),
    is_favorite: index < 2, // First 2 are favorites
  }));

  // Use allModules from the hook, or fall back to default modules
  // For demo: slice defaultBrandModules to simulate pagination
  const [visibleDefaultModules, setVisibleDefaultModules] = useState(5);

  const brandModules = (allModules && allModules.length > 0)
    ? allModules.map(module => ({
        ...module,
        products: module.products && module.products.length >= 20
          ? module.products
          : generateDemoProducts(module.brand.id, module.brand.name, 20)
      }))
    : defaultBrandModules.slice(0, visibleDefaultModules).map(module => ({
        ...module,
        products: module.products && module.products.length >= 20
          ? module.products
          : generateDemoProducts(module.brand.id, module.brand.name, 20)
      }));


  // Auto-rotate hero banner
  useEffect(() => {
    if (heroCampaigns.length === 0) return;

    const interval = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroCampaigns.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroCampaigns.length]);

  // Scroll button visibility and infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.scrollY > 300);

      // Infinite scroll - load more when user is near bottom
      const scrollPosition = window.innerHeight + window.scrollY;
      const bottomThreshold = document.documentElement.scrollHeight - 800;

      if (scrollPosition >= bottomThreshold && !loadingMore && !loading) {
        // If we have API data, use the real loadMore function
        if (allModules.length > 0) {
          if (hasMore) {
            loadMore();
          }
        } else {
          // For demo mode, load more default modules
          if (visibleDefaultModules < defaultBrandModules.length) {
            setVisibleDefaultModules(prev => Math.min(prev + 5, defaultBrandModules.length));
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loading, loadMore, allModules.length, visibleDefaultModules]);

  const handleStoryClick = (storyId: string) => {
    trackStoryView(storyId).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      <PageHeader />

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
                <div className="w-[72px] h-[72px] rounded-full p-[2px] bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-coral)]">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {story.type === 'brand' ? (
                      <BrandLogo
                        brandName={story.title}
                        fallbackUrl={story.thumbnail_url}
                        alt={story.title}
                        className="w-full h-full object-contain p-3"
                        showFallbackGradient={true}
                      />
                    ) : story.thumbnail_url ? (
                      <img
                        src={story.thumbnail_url}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-900 max-w-[76px] text-center truncate">
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
                'from-[var(--color-peach-light)]/20 to-[var(--color-blue)]/20'
              } rounded-[12px] overflow-hidden transition-all duration-700`}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
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

      {/* Chat Bar - Larger, closer to hero */}
      <div className="px-4 pt-3 pb-6">
        <div className="max-w-3xl mx-auto">
          {/* Enhanced Chat Box */}
          <Link
            href="/chat"
            className="block relative h-auto min-h-[72px] max-h-[180px] bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] border-2 border-transparent hover:border-[var(--color-peach-light)] focus-within:border-[var(--color-coral)] transition-all duration-200 px-6 py-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 text-lg text-gray-400">
                Talk with Muse
              </div>
              <div className="w-12 h-12 bg-[var(--gradient-coral)] text-white rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200 flex-shrink-0 flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
            </div>
          </Link>
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

      {/* Brand Modules - Always show (with fallback data if API fails) */}
      {!loading && (
        <div className="px-4 pt-6 pb-24">
          <div className="max-w-7xl mx-auto">
            {/* Tabbed Recommendation Module - Brand Agnostic */}
            <TabbedRecommendationModule userId={user?.id ? parseInt(user.id) : undefined} />

            {/* Context Header for Favorite Brands */}
            {isAuthenticated && brandModules.some((m) => m.is_favorite) && (
              <div className="mb-4 mt-8">
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Your Favorite Brands
                </h3>
                <p className="text-sm text-gray-500">
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
                  onView={isAuthenticated ? () => trackModuleInteraction(module.id, 'view').catch(console.error) : undefined}
                  onProductClick={isAuthenticated ? () => trackModuleInteraction(module.id, 'click').catch(console.error) : undefined}
                />
              ))}

            {/* Context Header for Recommended Brands */}
            {brandModules.some((m) => !m.is_favorite) && (
              <div className="mb-4 mt-8">
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Recommended For You
                </h3>
                <p className="text-sm text-gray-500">
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
                  onView={isAuthenticated ? () => trackModuleInteraction(module.id, 'view').catch(console.error) : undefined}
                  onProductClick={isAuthenticated ? () => trackModuleInteraction(module.id, 'click').catch(console.error) : undefined}
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

            {/* Loading More Indicator */}
            {(loadingMore || (allModules.length === 0 && visibleDefaultModules < defaultBrandModules.length)) && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
                  <p className="text-sm text-gray-500">Loading more brands...</p>
                </div>
              </div>
            )}

            {/* End of Feed Message */}
            {((allModules.length > 0 && !hasMore) || (allModules.length === 0 && visibleDefaultModules >= defaultBrandModules.length)) &&
             brandModules.length > 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 mb-2">
                  You've reached the end of your feed
                </p>
                <p className="text-xs text-gray-400">
                  Check back later for more personalized recommendations
                </p>
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
