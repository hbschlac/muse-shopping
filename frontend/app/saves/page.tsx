'use client';

import Link from 'next/link';

export default function SavesPage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--color-ecru)] py-3 px-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img src="/logo-m.svg" alt="Muse" className="h-8" />
          <h1 className="text-xl font-semibold text-gray-900">Saves</h1>
          <button className="p-2">
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Filter/Sort Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto hide-scrollbar">
          <button className="px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-medium whitespace-nowrap">
            All
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-full text-sm font-medium whitespace-nowrap">
            Clothes
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-full text-sm font-medium whitespace-nowrap">
            Shoes
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-full text-sm font-medium whitespace-nowrap">
            Accessories
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-full text-sm font-medium whitespace-nowrap">
            Under $100
          </button>
        </div>
      </div>

      {/* Pinterest-style Masonry Grid */}
      <main className="px-4 py-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Varied height tiles */}
            {[
              { height: 'aspect-[3/4]', brand: 'Reformation', name: 'Linen Dress', price: '$178', saved: true },
              { height: 'aspect-square', brand: 'Everlane', name: 'Day Tee', price: '$35', saved: true },
              { height: 'aspect-[4/5]', brand: 'Madewell', name: 'Jeans', price: '$128', saved: true },
              { height: 'aspect-[3/4]', brand: 'Aritzia', name: 'Blazer', price: '$198', saved: true },
              { height: 'aspect-[2/3]', brand: 'COS', name: 'Knit Top', price: '$89', saved: true },
              { height: 'aspect-[3/4]', brand: '& Other Stories', name: 'Midi Skirt', price: '$99', saved: true },
              { height: 'aspect-square', brand: 'Zara', name: 'Coat', price: '$149', saved: true },
              { height: 'aspect-[4/5]', brand: 'Free People', name: 'Boho Dress', price: '$168', saved: true },
              { height: 'aspect-[3/4]', brand: 'Anthropologie', name: 'Sweater', price: '$128', saved: true },
              { height: 'aspect-[2/3]', brand: 'Lululemon', name: 'Leggings', price: '$98', saved: true },
              { height: 'aspect-[3/4]', brand: 'Mango', name: 'Blazer', price: '$119', saved: true },
              { height: 'aspect-square', brand: 'H&M', name: 'Turtleneck', price: '$29', saved: true },
            ].map((item, i) => (
              <div
                key={i}
                className={`group ${item.height} bg-white rounded-[12px] overflow-hidden shadow-subtle hover:shadow-base transition-all duration-150 cursor-pointer relative`}
              >
                {/* Image */}
                <div className="relative h-[85%] bg-gradient-to-br from-gray-100 to-gray-200">
                  {/* Save button overlay */}
                  <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                </div>
                {/* Metadata */}
                <div className="px-2 py-2">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{item.brand}</p>
                  <p className="text-[12px] text-gray-600 truncate">{item.name}</p>
                  <p className="text-[13px] font-medium text-gray-900 mt-0.5">{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-sm border-t border-[var(--color-divider)]">
        <div className="max-w-7xl mx-auto px-6 h-[60px] flex items-center justify-around">
          <Link href="/home" className="flex flex-col items-center gap-1">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[11px] font-medium text-gray-500">Home</span>
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
            <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-[11px] font-medium text-gray-900">Saves</span>
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
