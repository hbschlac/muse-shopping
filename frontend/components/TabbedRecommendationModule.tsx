'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Product } from '@/lib/types/api';

interface Tab {
  id: number;
  tab_key: string;
  display_name: string;
  icon?: string;
}

interface TabbedRecommendationModuleProps {
  userId?: number;
  currentItemId?: number; // Optional - for PDP page to exclude current item
}

// Demo items for guests/fallback
const getDemoItems = (tabKey: string): Product[] => {
  const baseItems: Product[] = [
    { id: '1', name: 'Classic White Tee', price: 29.99, original_price: 39.99, image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', brand_id: '1', brand_name: 'Everlane', currency: 'USD', in_stock: true, retailer_name: 'Everlane', retailer_product_url: '#', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '2', name: 'High-Rise Jeans', price: 89.00, image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', brand_id: '2', brand_name: 'Madewell', currency: 'USD', in_stock: true, retailer_name: 'Madewell', retailer_product_url: '#', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '3', name: 'Leather Crossbody Bag', price: 128.00, image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', brand_id: '3', brand_name: 'Cuyana', currency: 'USD', in_stock: true, retailer_name: 'Cuyana', retailer_product_url: '#', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '4', name: 'Cashmere Sweater', price: 148.00, original_price: 198.00, image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400', brand_id: '4', brand_name: 'Naadam', currency: 'USD', in_stock: true, retailer_name: 'Naadam', retailer_product_url: '#', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '5', name: 'Ankle Boots', price: 195.00, image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', brand_id: '5', brand_name: 'Sam Edelman', currency: 'USD', in_stock: true, retailer_name: 'Sam Edelman', retailer_product_url: '#', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '6', name: 'Silk Midi Skirt', price: 118.00, image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400', brand_id: '6', brand_name: 'Reformation', currency: 'USD', in_stock: true, retailer_name: 'Reformation', retailer_product_url: '#', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  return baseItems;
};

/**
 * Tabbed Recommendation Module (Nordstrom-style)
 * Brand-agnostic recommendations with tabs: For You, New Arrivals, Trending, etc.
 */
export default function TabbedRecommendationModule({
  userId,
  currentItemId,
}: TabbedRecommendationModuleProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('recommended');
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tabs on mount
  useEffect(() => {
    fetchTabs();
  }, []);

  // Fetch items when active tab changes
  useEffect(() => {
    if (activeTab) {
      fetchTabItems(activeTab);
    }
  }, [activeTab, currentItemId]);

  const fetchTabs = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Show default tabs if not authenticated
        setTabs([
          { id: 1, tab_key: 'recommended', display_name: 'For You' },
          { id: 2, tab_key: 'new_arrivals', display_name: 'New Arrivals' },
          { id: 3, tab_key: 'trending', display_name: 'Trending' },
          { id: 4, tab_key: 'sale', display_name: 'Sale' },
          { id: 5, tab_key: 'under_100', display_name: 'Under $100' },
        ]);
        return;
      }

      const response = await fetch('/api/v1/recommendations/tabs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTabs(data.data.tabs);
      }
    } catch (err) {
      console.error('Failed to fetch tabs:', err);
      // Fallback to default tabs
      setTabs([
        { id: 1, tab_key: 'recommended', display_name: 'For You' },
        { id: 2, tab_key: 'new_arrivals', display_name: 'New Arrivals' },
        { id: 3, tab_key: 'trending', display_name: 'Trending' },
        { id: 4, tab_key: 'sale', display_name: 'Sale' },
      ]);
    }
  };

  const fetchTabItems = async (tabKey: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // Show demo items for guests
        setItems(getDemoItems(tabKey));
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams({
        limit: '20',
        offset: '0',
      });

      if (currentItemId) {
        queryParams.append('currentItemId', currentItemId.toString());
      }

      const response = await fetch(
        `/api/v1/recommendations/tabs/${tabKey}/items?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setItems(data.data.items);
      } else {
        setError('Failed to load items');
      }
    } catch (err) {
      console.error('Failed to fetch tab items:', err);
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  const handleItemClick = async (itemId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // Track click
      await fetch(`/api/v1/recommendations/tabs/${activeTab}/click`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Failed to track click:', err);
    }
  };

  return (
    <div className="mb-8">
      {/* Module Title */}
      <div className="mb-4">
        <h2 className="text-[19px] font-semibold text-gray-900">
          Discover
        </h2>
        <p className="text-[13px] text-gray-500 mt-1">
          Personalized picks from across all brands
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.tab_key}
            onClick={() => handleTabClick(tab.tab_key)}
            className={`px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-all duration-150 border-b-2 ${
              activeTab === tab.tab_key
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.display_name}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 text-[14px]">{error}</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {items.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              onClick={() => handleItemClick(product.id)}
              className="flex-shrink-0 w-[160px] group"
            >
              <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-2 shadow-subtle group-hover:shadow-base transition-shadow duration-150 relative">
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
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-subtle">
                        <span className="ml-0.5 text-[14px] text-gray-700">▶</span>
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

                {/* Sale Badge */}
                {product.original_price && product.original_price > product.price && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-[10px] font-semibold rounded">
                    SALE
                  </div>
                )}
              </div>

              {/* Brand */}
              {product.brand_name && (
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                  {product.brand_name}
                </p>
              )}

              {/* Product Name */}
              <p className="text-[13px] font-medium text-gray-900 truncate mb-1">
                {product.name}
              </p>

              {/* Price */}
              <div className="flex items-baseline gap-1.5">
                <p className="text-[13px] font-semibold text-gray-900">
                  ${(product.price_cents / 100).toFixed(2)}
                </p>
                {product.original_price_cents &&
                  product.original_price_cents > product.price_cents && (
                    <p className="text-[11px] line-through text-gray-400">
                      ${(product.original_price_cents / 100).toFixed(2)}
                    </p>
                  )}
              </div>
            </Link>
          ))}

          {/* Empty State */}
          {items.length === 0 && !loading && !error && (
            <div className="w-full text-center py-12">
              <p className="text-gray-500 text-[14px]">
                No items found for this category
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
