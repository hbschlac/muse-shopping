'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';

interface BloomingdalesProduct {
  id: number;
  brand_id: number;
  brand_name: string;
  canonical_name: string;
  category: string;
  subcategory: string;
  primary_image_url: string;
  min_price: string;
  sale_price: string | null;
}

export default function BloomingdalesPage() {
  const [products, setProducts] = useState<BloomingdalesProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBloomingdalesProducts() {
      try {
        // Fetch directly from items API with storeId=11 (Bloomingdales)
        const response = await fetch('/api/v1/items?storeId=11&limit=100');
        const data = await response.json();

        if (data.success && data.data.items) {
          setProducts(data.data.items);
        } else {
          setError('Failed to fetch Bloomingdales products');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchBloomingdalesProducts();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      <PageHeader />

      <div className="px-4 pt-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Bloomingdale's Women's Clothing
            </h1>
            <p className="text-sm text-gray-600">
              100 products from our Bloomingdale's collection
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
              <p className="text-gray-500">Loading Bloomingdale's products...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800"
              >
                Retry
              </button>
            </div>
          )}

          {/* Product Grid */}
          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group"
                >
                  <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-2 shadow-subtle group-hover:shadow-base transition-shadow duration-150">
                    {product.primary_image_url ? (
                      <img
                        src={product.primary_image_url}
                        alt={product.canonical_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                    )}
                  </div>

                  <div className="px-1">
                    <p className="text-xs text-gray-500 mb-1 truncate">
                      {product.brand_name}
                    </p>
                    <p className="text-sm font-medium text-gray-900 truncate mb-1 line-clamp-2">
                      {product.canonical_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        ${parseFloat(product.min_price).toFixed(2)}
                      </p>
                      {product.sale_price && (
                        <p className="text-xs text-gray-400 line-through">
                          ${parseFloat(product.sale_price).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No Bloomingdale's products found
              </p>
            </div>
          )}

          {/* Stats Footer */}
          {!loading && !error && products.length > 0 && (
            <div className="mt-8 p-6 bg-white rounded-[12px] shadow-subtle">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Collection Stats
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.length}
                  </p>
                  <p className="text-xs text-gray-500">Total Products</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {products.filter(p => p.primary_image_url).length}
                  </p>
                  <p className="text-xs text-gray-500">With Images</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${Math.min(...products.map(p => parseFloat(p.min_price))).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Lowest Price</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${Math.max(...products.map(p => parseFloat(p.min_price))).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Highest Price</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
