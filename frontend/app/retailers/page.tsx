'use client';

import { useState } from 'react';
import { useRetailerProducts } from '@/lib/hooks/useRetailerProducts';
import RetailerProductCard from '@/components/RetailerProductCard';
import BottomNav from '@/components/BottomNav';
import { saveProduct, unsaveProduct, isProductSaved } from '@/lib/api/saves';

export default function RetailersPage() {
  const [selectedRetailer, setSelectedRetailer] = useState('target');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());

  const retailers = [
    { id: 'target', name: 'Target', logo: '🎯' },
    { id: 'walmart', name: 'Walmart', logo: '⭐' },
    { id: 'nordstrom', name: 'Nordstrom', logo: '👜' },
  ];

  const { data, loading, error } = useRetailerProducts({
    retailerId: selectedRetailer,
    query: activeQuery,
    price_min: priceRange.min,
    price_max: priceRange.max,
    limit: 20,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery);
  };

  const handleSaveToggle = async (productId: string) => {
    try {
      if (savedProducts.has(productId)) {
        // Find the saved item ID (would need to track this in real implementation)
        await unsaveProduct(productId);
        setSavedProducts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        await saveProduct(productId);
        setSavedProducts((prev) => new Set(prev).add(productId));
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--color-ecru)] pt-3 pb-4 px-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Shop Retailers</h1>
            <img src="/logo-m.svg" alt="Muse" className="h-8" />
          </div>

          {/* Retailer Tabs */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
            {retailers.map((retailer) => (
              <button
                key={retailer.id}
                onClick={() => setSelectedRetailer(retailer.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedRetailer === retailer.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{retailer.logo}</span>
                {retailer.name}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full h-12 pl-12 pr-4 bg-white rounded-[12px] border border-gray-300 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            </div>
          </form>

          {/* Price Filter */}
          <div className="flex gap-2">
            {[
              { label: 'All', min: undefined, max: undefined },
              { label: 'Under $50', min: undefined, max: 50 },
              { label: '$50-$100', min: 50, max: 100 },
              { label: '$100-$200', min: 100, max: 200 },
              { label: '$200+', min: 200, max: undefined },
            ].map((range) => (
              <button
                key={range.label}
                onClick={() => setPriceRange({ min: range.min, max: range.max })}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  priceRange.min === range.min && priceRange.max === range.max
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <main className="px-4 pt-4">
        <div className="max-w-7xl mx-auto">
          {/* Results Count */}
          {data && !loading && (
            <p className="text-sm text-gray-600 mb-4">
              {data.total} {data.total === 1 ? 'product' : 'products'} found
              {activeQuery && ` for "${activeQuery}"`}
            </p>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading products...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">Error: {error.message}</p>
              <p className="text-gray-500">
                Make sure you're connected to {
                  retailers.find((r) => r.id === selectedRetailer)?.name
                }
              </p>
            </div>
          )}

          {/* Products Grid */}
          {data && !loading && !error && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.products.map((product) => (
                  <RetailerProductCard
                    key={product.product_id}
                    product={product}
                    onSave={handleSaveToggle}
                    isSaved={savedProducts.has(product.product_id)}
                  />
                ))}
              </div>

              {/* Empty State */}
              {data.products.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">
                    No products found{activeQuery && ` for "${activeQuery}"`}
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveQuery('');
                      setPriceRange({});
                    }}
                    className="px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Load More */}
              {data.has_more && (
                <div className="text-center mt-8">
                  <button className="px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
