'use client';

import { useState, useEffect, useRef } from 'react';
import ProductTile from './ProductTile';
import { getDemoSimilarItems } from '@/lib/demoData';
import { useActivityTracking } from '@/lib/hooks/useActivityTracking';

interface SimilarItem {
  id: number;
  name: string;
  brand_name: string;
  image_url: string;
  price_cents: number;
  original_price_cents?: number;
  media_type?: string;
  video_url?: string;
  video_poster_url?: string;
}

interface SimilarItemsProps {
  productId: string;
  limit?: number;
  moduleId?: number; // Optional module ID for A/B testing
}

export default function SimilarItems({ productId, limit = 16, moduleId }: SimilarItemsProps) {
  const [items, setItems] = useState<SimilarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { trackClick } = useActivityTracking();

  useEffect(() => {
    loadSimilarItems();
  }, [productId]);

  const loadSimilarItems = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/v1/items/${productId}/similar?limit=${limit}`, {
        headers,
      });

      const data = await response.json();

      if (data.success && data.data?.items && data.data.items.length > 0) {
        setItems(data.data.items);
      } else {
        // Fallback to demo data
        const demoItems = getDemoSimilarItems(productId, limit);
        setItems(demoItems as any);
      }
    } catch (error) {
      console.error('Error loading similar items:', error);
      setError(`Error: ${error}`);
      // On error, also fallback to demo data
      try {
        const demoItems = getDemoSimilarItems(productId, limit);
        setItems(demoItems as any);
      } catch (demoError) {
        console.error('Error loading demo items:', demoError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (itemId: number, position: number) => {
    // Track click with position and optional module ID for A/B testing
    trackClick(itemId, moduleId, position);
  };

  if (loading) {
    return (
      <div className="px-6 py-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Similar Items</h2>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[160px]">
              <div className="aspect-[3/4] bg-gray-200 rounded-[12px] animate-pulse mb-2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show message if no items found - for debugging
  if (!items || items.length === 0) {
    console.warn('No similar items found', {
      noAttributeMatches: 'Item has no matching attributes',
      noCategoryMatches: 'No items in same category/brand',
      itemDoesNotExist: 'Item ID may not exist in database',
      productId,
      error,
    });
    // Show a visible message for debugging
    return (
      <div className="px-6 py-8 bg-yellow-50 border border-yellow-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Similar Items (Debug)</h2>
        <p className="text-sm text-gray-600">No items loaded. Check console for details.</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="px-6 py-8 bg-gray-50">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Similar Items</h2>
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {items.map((item, index) => (
          <ProductTile
            key={item.id}
            product={{
              id: item.id.toString(),
              name: item.name,
              brand_id: '',
              brand_name: item.brand_name,
              price: item.price_cents / 100,
              original_price: item.original_price_cents ? item.original_price_cents / 100 : undefined,
              currency: 'USD',
              image_url: item.image_url,
              in_stock: true,
              retailer_name: '',
              retailer_product_url: '',
              created_at: '',
              updated_at: '',
              media_type: item.media_type,
              video_url: item.video_url,
              video_poster_url: item.video_poster_url,
              price_cents: item.price_cents,
              original_price_cents: item.original_price_cents,
            }}
            aspectRatio="portrait"
            showDetails={true}
            showBrand={true}
            size="md"
            onClick={() => handleItemClick(item.id, index + 1)}
          />
        ))}
      </div>
    </div>
  );
}
