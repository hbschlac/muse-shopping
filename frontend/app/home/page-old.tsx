'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  // Auto-rotating hero banner
  const [currentHero, setCurrentHero] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const heroCampaigns = [
    {
      title: 'Winter Collection 2024',
      subtitle: "Discover the season's must-haves",
      cta: 'Shop Now',
      gradient: 'from-[#F4A785]/20 to-[#8EC5FF]/20'
    },
    {
      title: 'New Arrivals',
      subtitle: 'Fresh styles just dropped',
      cta: 'Explore',
      gradient: 'from-[#8EC5FF]/20 to-[#F4A785]/20'
    },
    {
      title: 'Spring Preview',
      subtitle: 'Get ahead of the trends',
      cta: 'See More',
      gradient: 'from-[#F1785A]/20 to-[#F4A785]/20'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroCampaigns.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      {/* ZONE 1: Header with Logo + Menu (No Search) */}
      <header className="sticky top-0 z-20 bg-[var(--color-ecru)] pt-3 pb-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img src="/logo-m.svg" alt="Muse" className="h-8" />
          <button className="p-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ZONE 2: Stories Row */}
      <div className="px-4 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            {[
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
              'Weekend'
            ].map((story) => (
              <div key={story} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-br from-[#F4A785] to-[#F1785A]">
                  <div className="w-full h-full rounded-full bg-gray-200" />
                </div>
                <span className="text-[11px] font-medium text-gray-700">{story}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HERO BANNER (Auto-Rotating Sponsored Content) */}
      <div className="px-4 pt-4">
        <div className="max-w-7xl mx-auto">
          <div className={`relative aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br ${heroCampaigns[currentHero].gradient} rounded-[12px] overflow-hidden transition-all duration-700`}>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Sponsored</p>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">{heroCampaigns[currentHero].title}</h2>
              <p className="text-sm text-gray-600 mb-4">{heroCampaigns[currentHero].subtitle}</p>
              <button className="h-10 px-6 bg-gray-900 text-white rounded-[12px] text-sm font-medium transition-transform duration-150 hover:scale-[1.02]">
                {heroCampaigns[currentHero].cta}
              </button>
            </div>
            {/* Indicator dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {heroCampaigns.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentHero(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentHero ? 'bg-gray-900 w-6' : 'bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH BAR (Centered below hero) */}
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="min-h-[52px] max-h-[150px] bg-white rounded-[16px] shadow-subtle px-4 py-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <textarea
              placeholder="Search or ask Muse..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-900 placeholder-gray-400 resize-none overflow-y-auto max-h-[102px] leading-relaxed"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 102) + 'px';
              }}
            />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F4A785] to-[#8EC5FF] flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* ZONE 3: Brand Module Carousels ONLY */}
      <main className="px-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Section: Your Favorite Brands */}
          <div>
            <div className="mb-4">
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">Your Favorite Brands</h3>
              <p className="text-[13px] text-gray-500">Based on brands you told us you love</p>
            </div>

            {/* BRAND MODULE: Reformation */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold text-gray-900">Reformation</h2>
                <button className="text-[13px] text-gray-500">See all</button>
              </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">Linen Dress</p>
                  <p className="text-[11px] text-gray-600">${128 + i * 10}</p>
                </div>
              ))}
            </div>
          </div>

            {/* BRAND MODULE: Everlane */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold text-gray-900">Everlane</h2>
                <button className="text-[13px] text-gray-500">See all</button>
              </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">Day Tee</p>
                  <p className="text-[11px] text-gray-600">${35 + i * 5}</p>
                </div>
              ))}
            </div>
          </div>

            {/* BRAND MODULE: Aritzia */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold text-gray-900">Aritzia</h2>
                <button className="text-[13px] text-gray-500">See all</button>
              </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">Blazer</p>
                  <p className="text-[11px] text-gray-600">${148 + i * 15}</p>
                </div>
              ))}
            </div>
          </div>

          </div>

          {/* Section: Recommended For You */}
          <div>
            <div className="mb-4">
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">Recommended For You</h3>
              <p className="text-[13px] text-gray-500">Brands we think you'll love based on your style</p>
            </div>

            {/* BRAND MODULE: Madewell */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold text-gray-900">Madewell</h2>
                <button className="text-[13px] text-gray-500">See all</button>
              </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">Jeans</p>
                  <p className="text-[11px] text-gray-600">${88 + i * 12}</p>
                </div>
              ))}
            </div>
          </div>

            {/* BRAND MODULE: & Other Stories */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold text-gray-900">& Other Stories</h2>
                <button className="text-[13px] text-gray-500">See all</button>
              </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">Knit Sweater</p>
                  <p className="text-[11px] text-gray-600">${78 + i * 8}</p>
                </div>
              ))}
            </div>
          </div>

            {/* BRAND MODULE: Free People */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-semibold text-gray-900">Free People</h2>
                <button className="text-[13px] text-gray-500">See all</button>
              </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-900 truncate mb-0.5">Boho Top</p>
                  <p className="text-[11px] text-gray-600">${98 + i * 18}</p>
                </div>
              ))}
            </div>
          </div>

          </div>

        </div>
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollButton && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-30 w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* ZONE 4: Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-sm border-t border-[var(--color-divider)]">
        <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-around">
          <Link href="/home" className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <span className="text-[11px] font-medium text-gray-900">Home</span>
          </Link>

          <Link href="/search" className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[11px] font-medium text-gray-500">Search</span>
          </Link>

          <Link href="/muse" className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
            <span className="text-[11px] font-medium text-gray-500">Muse</span>
          </Link>

          <Link href="/saves" className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-[11px] font-medium text-gray-500">Saves</span>
          </Link>

          <Link href="/profile" className="flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-gray-300" />
            <span className="text-[11px] font-medium text-gray-500">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
