'use client';

/**
 * "Watching" on the Saves page: partner-store items the shopper saved (price
 * alerts) or asked to be told about (Notify me on a sold-out size). Each row
 * opens the item; Stop removes the watch. Renders nothing when there are none
 * or the shopper is signed out.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Heart, ShoppingBag, X } from 'lucide-react';
import { listWatches, removeWatch, type ItemWatch } from '@/lib/api/watches';
import { partnerProductHref } from '@/lib/api/bridges';

function describe(w: ItemWatch): string {
  if (w.kind === 'price') return 'Price drop alerts';
  const what = [w.size && `size ${w.size}`, w.color].filter(Boolean).join(' in ');
  return what ? `Back in stock: ${what}` : 'Back in stock';
}

function money(cents: number | null, currency: string | null): string {
  if (cents == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
}

export default function WatchingList() {
  const [watches, setWatches] = useState<ItemWatch[]>([]);

  useEffect(() => {
    listWatches().then(setWatches).catch(() => setWatches([]));
  }, []);

  const stop = async (id: number) => {
    const before = watches;
    setWatches(ws => ws.filter(w => w.id !== id));
    try {
      await removeWatch(id);
    } catch {
      setWatches(before);
    }
  };

  if (!watches.length) return null;

  return (
    <section className="px-4 pt-6" aria-label="Watching">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Watching</h2>
      <ul className="space-y-2">
        {watches.map(w => (
          <li key={w.id} className="flex items-center gap-3 bg-white rounded-[12px] p-2 shadow-sm">
            <Link href={partnerProductHref({ partnerKey: w.storeKey, id: w.itemId })} className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-16 shrink-0 bg-gray-100 rounded-[8px] overflow-hidden">
                {w.imageUrl ? (
                  <img src={w.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-gray-400" /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{w.title || 'Saved item'}</p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  {w.kind === 'price' ? <Heart className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                  {describe(w)}
                  {w.kind === 'price' && w.priceCents != null && ` · ${money(w.priceCents, w.currency)} when saved`}
                </p>
              </div>
            </Link>
            <button
              onClick={() => stop(w.id)}
              className="shrink-0 w-10 h-10 flex items-center justify-center text-gray-500"
              aria-label={`Stop watching ${w.title || 'this item'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
