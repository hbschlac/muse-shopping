'use client';

import { useState } from 'react';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import BottomNav from '@/components/BottomNav';

// Mock data
const recentSearches = [
  'black mini dress for wedding',
  'oversized blazer under $150',
  'vintage denim',
];

const products = [
  { id: '1', image: '/placeholder-1.jpg', brand: 'Reformation', price: 178 },
  { id: '2', image: '/placeholder-2.jpg', brand: 'Everlane', price: 98 },
  { id: '3', image: '/placeholder-3.jpg', brand: 'Madewell', price: 128 },
  { id: '4', image: '/placeholder-4.jpg', brand: 'Free People', price: 88 },
  { id: '5', image: '/placeholder-5.jpg', brand: 'Veja', price: 150 },
  { id: '6', image: '/placeholder-6.jpg', brand: 'Girlfriend Collective', price: 68 },
];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header with Search */}
      <div className="bg-[var(--color-ecru)] pt-12 pb-4 px-4">
        <div className="relative">
          <div className="h-[56px] bg-white rounded-[28px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center px-4">
            <SearchIcon className="w-5 h-5 text-gray-400 mr-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or ask Muse..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-900 placeholder:text-gray-400"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
            >
              <SlidersHorizontal className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Searches */}
      {!searchQuery && (
        <div className="px-4 py-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Recent Searches
          </h2>
          <div className="space-y-3">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => setSearchQuery(search)}
                className="w-full text-left px-4 py-3 bg-white rounded-[12px] text-[15px] text-gray-900 hover:bg-gray-50 transition-colors duration-150 shadow-sm"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {searchQuery && (
        <div className="px-4 pt-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {products.length} results for "{searchQuery}"
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>
      )}

      {/* Filter Bottom Sheet */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-sm font-medium text-[var(--color-coral)]"
              >
                Done
              </button>
            </div>

            {/* Filter options */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Price Range</h3>
                <div className="flex gap-2">
                  {['Under $50', '$50-$100', '$100-$200', '$200+'].map((range) => (
                    <button
                      key={range}
                      className="flex-1 py-2 px-3 bg-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors duration-150"
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Category</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Dresses', 'Tops', 'Bottoms', 'Shoes', 'Bags', 'Accessories'].map((category) => (
                    <button
                      key={category}
                      className="py-2 px-4 bg-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors duration-150 text-left"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
