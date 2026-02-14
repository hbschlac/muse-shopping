'use client';

import { useState, useEffect } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import { getFavorites, removeFromFavorites } from '@/lib/api/products';

interface FavoriteItem {
  id: number;
  itemId: number;
  name: string;
  brandName?: string;
  priceCents: number;
  salePriceCents?: number;
  imageUrl?: string;
  category?: string;
  createdAt: string;
}

export default function SavesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: any = await getFavorites(100, 0);
      setFavorites(data.items || []);
    } catch (err: any) {
      console.error('Failed to load favorites:', err);
      setError(err.message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (itemId: number) => {
    try {
      await removeFromFavorites(itemId.toString());
      setFavorites(prev => prev.filter(item => item.itemId !== itemId));
    } catch (err: any) {
      console.error('Failed to remove favorite:', err);
      loadFavorites(); // Reload on error
    }
  };

  // Get unique categories
  const categories: string[] = ['all', ...Array.from(new Set(favorites.map(item => item.category).filter((cat): cat is string => Boolean(cat))))];

  const filteredFavorites = selectedCategory === 'all'
    ? favorites
    : favorites.filter(item => item.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
        <PageHeader title="Saves" />
        <div className="px-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-white rounded-[16px] animate-pulse" />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || favorites.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
        <PageHeader title="Saves" />
        <div className="flex flex-col items-center justify-center px-4 py-24">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
            <Heart className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No saved items yet</h2>
          <p className="text-gray-600 text-center mb-8">
            Start exploring and save items you love!
          </p>
          <Link
            href="/discover"
            className="px-6 py-3 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white font-semibold rounded-[12px] hover:shadow-lg transition-shadow"
          >
            Discover Items
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      <PageHeader title="Saves" />

      {/* Filter Bar */}
      {categories.length > 1 && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <main className="px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {filteredFavorites.map((item) => (
            <Link
              key={item.id}
              href={`/product/${item.itemId}`}
              className="group aspect-[3/4] bg-white rounded-[16px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-150 relative"
            >
              {/* Image */}
              <div className="relative h-[75%] bg-gradient-to-br from-gray-100 to-gray-200">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {/* Unfavorite button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveFavorite(item.itemId);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors"
                >
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                </button>
              </div>
              {/* Metadata */}
              <div className="px-3 py-2.5 h-[25%] flex flex-col justify-center">
                {item.brandName && (
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.brandName}</p>
                )}
                <p className="text-xs text-gray-600 truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.salePriceCents && item.salePriceCents < item.priceCents ? (
                    <>
                      <p className="text-sm font-medium text-[var(--color-coral)]">
                        ${(item.salePriceCents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 line-through">
                        ${(item.priceCents / 100).toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-900">
                      ${(item.priceCents / 100).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
