'use client';

import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductTile from '@/components/ProductTile';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';

// Mock data
const categories = [
  'New Arrivals',
  'Dresses',
  'Tops',
  'Bottoms',
  'Outerwear',
  'Shoes',
  'Accessories',
  'Sale',
];

const shoppingMissions = [
  'Spring Vacation',
  'Date Night',
  'Work Edit',
  'Weekend',
  'Cozy Season',
];

const stores = [
  'Nordstrom',
  'Nordstrom Rack',
  'Target',
  'Zara',
  'Madewell',
  'Everlane',
  'Reformation',
  'H&M',
  'Gap',
  'Banana Republic',
  'J.Crew',
  'Macy\'s',
  'Bloomingdale\'s',
  'Saks Fifth Avenue',
  'Neiman Marcus',
  'Anthropologie',
  'Free People',
  'Urban Outfitters',
  'ASOS',
  'Revolve',
  'Shopbop',
  'Net-a-Porter',
  'Farfetch',
  'Ssense',
  'Lululemon',
  'Athleta',
  'Aritzia',
  'COS',
  'Uniqlo',
  'Abercrombie & Fitch',
  '& Other Stories',
].sort(); // Alphabetically sorted for easier searching

export default function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = useState('New Arrivals');
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products from API
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        // Build search query
        let query = '';
        if (searchQuery) {
          query = searchQuery;
        } else if (selectedStores.length > 0) {
          query = selectedStores.join(' ');
        } else if (selectedCategory && selectedCategory !== 'New Arrivals') {
          query = selectedCategory;
        }

        const url = query
          ? `http://localhost:3000/api/v1/items/search?q=${encodeURIComponent(query)}&limit=50`
          : `http://localhost:3000/api/v1/items?limit=50`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.data.items) {
          setProducts(data.data.items);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [searchQuery, selectedStores, selectedCategory]);

  const toggleStore = (store: string) => {
    setSelectedStores(prev =>
      prev.includes(store)
        ? prev.filter(s => s !== store)
        : [...prev, store]
    );
  };

  // Natural language parsing function
  const parseSearchQuery = (query: string) => {
    const lowerQuery = query.toLowerCase();

    // Parse stores
    const detectedStores: string[] = [];
    stores.forEach(store => {
      if (lowerQuery.includes(store.toLowerCase())) {
        detectedStores.push(store);
      }
    });

    // Parse categories
    let detectedCategory = selectedCategory;
    categories.forEach(category => {
      if (lowerQuery.includes(category.toLowerCase())) {
        detectedCategory = category;
      }
    });

    // Parse price ranges
    let detectedPrice = null;
    if (lowerQuery.match(/under \$?50|<\$?50|less than \$?50/)) {
      detectedPrice = 'Under $50';
    } else if (lowerQuery.match(/\$?50[-\s]?\$?100|50 to 100/)) {
      detectedPrice = '$50-$100';
    } else if (lowerQuery.match(/\$?100[-\s]?\$?200|100 to 200/)) {
      detectedPrice = '$100-$200';
    } else if (lowerQuery.match(/over \$?200|>\$?200|more than \$?200|\$?200\+/)) {
      detectedPrice = '$200+';
    }

    // Parse colors
    const detectedColors: string[] = [];
    const colorList = ['Black', 'White', 'Gray', 'Beige', 'Blue', 'Red', 'Pink', 'Green'];
    colorList.forEach(color => {
      if (lowerQuery.includes(color.toLowerCase())) {
        detectedColors.push(color);
      }
    });

    // Parse sizes
    const detectedSizes: string[] = [];
    const sizeList = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    sizeList.forEach(size => {
      const pattern = new RegExp(`\\b${size.toLowerCase()}\\b|\\bsize ${size.toLowerCase()}\\b`);
      if (pattern.test(lowerQuery)) {
        detectedSizes.push(size);
      }
    });

    // Parse shopping missions
    let detectedMission = selectedMission;
    shoppingMissions.forEach(mission => {
      if (lowerQuery.includes(mission.toLowerCase())) {
        detectedMission = mission;
      }
    });

    // Apply detected filters
    if (detectedStores.length > 0) {
      setSelectedStores(detectedStores);
    }
    if (detectedCategory !== selectedCategory) {
      setSelectedCategory(detectedCategory);
    }
    if (detectedPrice) {
      setPriceRange(detectedPrice);
    }
    if (detectedColors.length > 0) {
      setSelectedColors(detectedColors);
    }
    if (detectedSizes.length > 0) {
      setSelectedSizes(detectedSizes);
    }
    if (detectedMission !== selectedMission) {
      setSelectedMission(detectedMission);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      parseSearchQuery(searchQuery);
    }
  };

  // Filter stores based on search input
  const filteredStores = stores.filter(store =>
    store.toLowerCase().includes(storeSearch.toLowerCase())
  );

  // Generate active filters description
  const getActiveFiltersText = () => {
    const parts: string[] = [];

    if (selectedCategory && selectedCategory !== 'New Arrivals') {
      parts.push(selectedCategory);
    }
    if (selectedStores.length > 0) {
      parts.push(`from ${selectedStores.join(' & ')}`);
    }
    if (priceRange) {
      parts.push(priceRange);
    }
    if (selectedColors.length > 0) {
      parts.push(`in ${selectedColors.join(', ')}`);
    }
    if (selectedSizes.length > 0) {
      parts.push(`size ${selectedSizes.join(', ')}`);
    }
    if (selectedMission) {
      parts.push(`for ${selectedMission}`);
    }

    return parts.length > 0
      ? `Showing ${parts.join(' ')}`
      : 'Showing all new arrivals';
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      {/* Header */}
      <PageHeader />

      {/* Filters and Categories */}
      <div className="bg-white border-b border-gray-200 sticky top-[88px] z-20">
        {/* Chat Search Box */}
        <div className="px-4 pt-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try 'show me dresses from Nordstrom under $100'..."
              className="w-full py-3 px-4 pr-24 bg-[var(--color-ecru)] border border-gray-200 rounded-[12px] text-sm text-[var(--color-charcoal)] placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-peach)] transition-colors duration-150"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[var(--color-coral)] text-white text-xs font-medium rounded-full hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </form>
        </div>

        {/* Active Filters Text */}
        <div className="px-4 py-2">
          <p className="text-xs text-gray-600 italic">{getActiveFiltersText()}</p>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-600">Browse</h2>
            <button
              onClick={() => setShowFilters(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
            >
              <SlidersHorizontal className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  selectedCategory === category
                    ? 'bg-[var(--color-coral)] text-white'
                    : 'bg-white text-[var(--color-charcoal)] border border-gray-200 hover:border-[var(--color-peach)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Shopping Missions */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {shoppingMissions.map((mission) => (
              <button
                key={mission}
                onClick={() => setSelectedMission(selectedMission === mission ? null : mission)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  selectedMission === mission
                    ? 'bg-[#A8C5E0] text-white'
                    : 'bg-white text-[#6B6B6B] border border-gray-200 hover:border-[#A8C5E0]'
                }`}
              >
                {mission}
              </button>
            ))}
          </div>
        </div>

        {/* Store Filter */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowStoreSelector(true)}
            className="w-full py-2 px-4 bg-white rounded-[12px] border border-gray-200 text-left text-sm text-[var(--color-charcoal)] hover:border-[var(--color-peach)] transition-colors duration-150"
          >
            {selectedStores.length > 0
              ? `Shopping at: ${selectedStores.join(', ')}`
              : 'Shop specific stores'}
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-2 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductTile
                key={product.id}
                product={{
                  id: product.id,
                  name: product.canonical_name || product.name,
                  price: parseFloat(product.min_price || product.price_cents / 100),
                  original_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
                  image_url: product.primary_image_url || product.image_url,
                  brand_id: product.brand_id,
                  brand_name: product.brand_name,
                  currency: 'USD',
                  in_stock: true,
                  retailer_name: product.brand_name,
                  retailer_product_url: product.product_url || '#',
                  created_at: product.created_at,
                  updated_at: product.updated_at,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500">No products found. Try a different search.</p>
          </div>
        )}
      </div>

      {/* Store Selector Modal */}
      {showStoreSelector && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => {
            setShowStoreSelector(false);
            setStoreSearch(''); // Clear search when closing
          }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] p-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--color-charcoal)]">Select Stores</h2>
              <button
                onClick={() => {
                  setShowStoreSelector(false);
                  setStoreSearch(''); // Clear search when closing
                }}
                className="text-sm font-medium text-[var(--color-coral)]"
              >
                Done
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                placeholder="Search stores..."
                className="w-full py-3 px-4 bg-white border border-gray-200 rounded-[12px] text-sm text-[var(--color-charcoal)] placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-peach)] transition-colors duration-150"
              />
            </div>

            {/* Store List */}
            <div className="space-y-2">
              {filteredStores.length > 0 ? (
                filteredStores.map((store) => (
                  <button
                    key={store}
                    onClick={() => toggleStore(store)}
                    className={`w-full py-3 px-4 rounded-[12px] text-left text-sm font-medium transition-all duration-150 ${
                      selectedStores.includes(store)
                        ? 'bg-[var(--color-coral)] text-white'
                        : 'bg-white text-[var(--color-charcoal)] border border-gray-200 hover:border-[var(--color-peach)]'
                    }`}
                  >
                    {store}
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  No stores found matching "{storeSearch}"
                </div>
              )}
            </div>

            {/* Clear All / Select All */}
            {selectedStores.length > 0 && (
              <button
                onClick={() => setSelectedStores([])}
                className="w-full mt-4 py-2 text-sm text-[var(--color-coral)] font-medium hover:opacity-80 transition-opacity"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Modal */}
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
              <h2 className="text-lg font-semibold text-[var(--color-charcoal)]">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-sm font-medium text-[var(--color-coral)]"
              >
                Done
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-[#6B6B6B] mb-3">Price Range</h3>
                <div className="flex gap-2">
                  {['Under $50', '$50-$100', '$100-$200', '$200+'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setPriceRange(priceRange === range ? null : range)}
                      className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all duration-150 border border-gray-200 ${
                        priceRange === range
                          ? 'bg-[var(--color-coral)] text-white'
                          : 'bg-white text-[var(--color-charcoal)] hover:bg-[var(--color-peach)] hover:text-white'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#6B6B6B] mb-3">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setSelectedSizes(prev =>
                          prev.includes(size)
                            ? prev.filter(s => s !== size)
                            : [...prev, size]
                        );
                      }}
                      className={`py-2 px-4 rounded-full text-sm font-medium transition-all duration-150 border border-gray-200 ${
                        selectedSizes.includes(size)
                          ? 'bg-[var(--color-coral)] text-white'
                          : 'bg-white text-[var(--color-charcoal)] hover:bg-[var(--color-peach)] hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#6B6B6B] mb-3">Color</h3>
                <div className="flex flex-wrap gap-2">
                  {['Black', 'White', 'Gray', 'Beige', 'Blue', 'Red', 'Pink', 'Green'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColors(prev =>
                          prev.includes(color)
                            ? prev.filter(c => c !== color)
                            : [...prev, color]
                        );
                      }}
                      className={`py-2 px-4 rounded-full text-sm font-medium transition-all duration-150 border border-gray-200 ${
                        selectedColors.includes(color)
                          ? 'bg-[var(--color-coral)] text-white'
                          : 'bg-white text-[var(--color-charcoal)] hover:bg-[var(--color-peach)] hover:text-white'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear All Filters */}
              {(priceRange || selectedSizes.length > 0 || selectedColors.length > 0 || selectedStores.length > 0) && (
                <button
                  onClick={() => {
                    setPriceRange(null);
                    setSelectedSizes([]);
                    setSelectedColors([]);
                    setSelectedStores([]);
                    setSelectedMission(null);
                    setSearchQuery('');
                  }}
                  className="w-full py-2 text-sm text-[var(--color-coral)] font-medium hover:opacity-80 transition-opacity"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
