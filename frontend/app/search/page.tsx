'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';

// Mock data
const recentSearches = [
  'black mini dress for wedding',
  'oversized blazer under $150',
  'vintage denim',
];

import {
  searchPartnerStores,
  partnerProductHref,
  formatMoney,
  type BridgeProduct,
} from '@/lib/api/bridges';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // Results come live from partner stores: price and stock are what the store says now.
  const [products, setProducts] = useState<BridgeProduct[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError(null);
        const result = await searchPartnerStores(q);
        if (!cancelled) setProducts(result.products || []);
      } catch (err: any) {
        if (!cancelled) setSearchError(err.message || 'Search failed');
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      <PageHeader />
      {/* Search Bar */}
      <div className="bg-[var(--color-ecru)] pb-4 px-4">
        <div className="relative">
          <div className="h-[56px] bg-white rounded-[28px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center px-4">
            <SearchIcon className="w-5 h-5 text-gray-400 mr-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or ask Muse..."
              className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder:text-gray-400"
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
                className="w-full text-left px-4 py-3 bg-white rounded-[12px] text-base text-gray-900 hover:bg-gray-50 transition-colors duration-150 shadow-sm"
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
              {isSearching
                ? `Checking stores for "${searchQuery}"…`
                : `${products.length} ${products.length === 1 ? 'result' : 'results'} for "${searchQuery}" · live prices and stock`}
            </p>
            {searchError && <p className="text-sm text-[var(--color-coral)] mt-1">{searchError}</p>}
          </div>
          {isSearching && products.length === 0 ? null : products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => {
                const onSale = product.compareAtPrice && product.price && product.compareAtPrice.cents > product.price.cents;
                const sizesLeft = product.variants.filter(v => v.available).length;
                return (
                  <Link key={`${product.partnerKey}:${product.id}`} href={partnerProductHref(product)} className="block">
                    <div className="relative aspect-[3/4] bg-gray-100 rounded-[16px] overflow-hidden mb-2">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                      )}
                      {product.available === false && (
                        <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-white/90 text-[11px] font-medium text-gray-900">Sold out</span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-600">{product.brand}</p>
                    <p className="text-sm text-gray-900 line-clamp-1">{product.title}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatMoney(product.price)}
                      {onSale && <span className="ml-1 text-xs font-normal text-gray-500 line-through">{formatMoney(product.compareAtPrice)}</span>}
                    </p>
                    {product.available !== false && product.variants.length > 1 && sizesLeft > 0 && sizesLeft <= 3 && (
                      <p className="text-[11px] text-[var(--color-coral)]">Only {sizesLeft} {sizesLeft === 1 ? 'option' : 'options'} left</p>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                No results found
              </h3>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
                We couldn't find any items matching "{searchQuery}". Try different keywords or browse our collections.
              </p>
              <a
                href="/discover"
                className="px-6 py-3 bg-[var(--gradient-coral)] text-white font-semibold rounded-[12px] hover:shadow-lg transition-shadow duration-150"
              >
                Explore Collections
              </a>
            </div>
          )}
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
