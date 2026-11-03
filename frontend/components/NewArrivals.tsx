'use client';

import { useEffect, useState } from 'react';
import { getNewArrivals } from '@/lib/api/newsfeed';
import type { NewArrivalsCarousel } from '@/lib/types/api';

const NEW_BADGE_DAYS = 3;

function isFresh(firstSeenAt: string) {
  const t = new Date(firstSeenAt).getTime();
  return Number.isFinite(t) && Date.now() - t < NEW_BADGE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * "New at <store>" carousels: newest items first, one row per store.
 * Items open on the store's own site. Renders nothing until a store has items.
 */
export default function NewArrivals({ category = 'womens-clothing' }: { category?: string }) {
  const [carousels, setCarousels] = useState<NewArrivalsCarousel[]>([]);

  useEffect(() => {
    let cancelled = false;
    getNewArrivals(category)
      .then((data) => { if (!cancelled) setCarousels(data); })
      .catch((err) => console.error('Failed to load new arrivals:', err));
    return () => { cancelled = true; };
  }, [category]);

  if (carousels.length === 0) return null;

  return (
    <section className="px-4 pt-4" aria-label="New arrivals">
      <div className="max-w-7xl mx-auto">
        {carousels.map((carousel) => (
          <div key={carousel.store.slug} className="mb-6">
            <div className="flex items-baseline justify-between mb-3 gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900">{carousel.title}</h2>
                <p className="text-xs text-gray-500">{carousel.subtitle}</p>
              </div>
              <a
                href={carousel.store.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-gray-600 hover:text-gray-900 flex-shrink-0"
              >
                Shop {carousel.store.name}
              </a>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {carousel.items.map((item) => (
                <a
                  key={item.id}
                  href={item.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-[140px] group"
                >
                  <div className="aspect-[3/4] bg-white rounded-[12px] overflow-hidden mb-1.5 shadow-subtle group-hover:shadow-base transition-shadow duration-150 relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                    )}
                    {isFresh(item.first_seen_at) && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-semibold uppercase tracking-wide text-gray-900">
                        New
                      </span>
                    )}
                  </div>
                  {item.brand_name && (
                    <p className="text-xs text-gray-500 truncate">{item.brand_name}</p>
                  )}
                  <p className="text-sm font-medium text-gray-900 truncate mb-0.5">{item.name}</p>
                  {item.price != null && (
                    <p className="text-xs text-gray-600">
                      ${item.price.toFixed(2)}
                      {item.original_price != null && item.original_price > item.price && (
                        <span className="ml-1 line-through text-gray-400">${item.original_price.toFixed(2)}</span>
                      )}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
