'use client';

/**
 * Product page for a partner store (Shopify and other UCP stores).
 * Price, sizes and stock come live from the store on every load.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import { addBridgeItemToCart } from '@/lib/api/cart';
import {
  getPartnerProduct,
  formatMoney,
  type BridgeProduct,
  type BridgeVariant,
} from '@/lib/api/bridges';

function optionNames(variants: BridgeVariant[]): string[] {
  const names: string[] = [];
  variants.forEach(v => Object.keys(v.options || {}).forEach(n => {
    if (!names.includes(n) && n.toLowerCase() !== 'title') names.push(n);
  }));
  return names;
}

function StoreProduct() {
  const params = useSearchParams();
  const router = useRouter();
  const store = params.get('store') || '';
  const id = params.get('id') || '';

  const [product, setProduct] = useState<BridgeProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!store || !id) {
      setError('Missing product');
      setLoading(false);
      return;
    }
    setLoading(true);
    getPartnerProduct(store, id)
      .then(p => {
        setProduct(p);
        setCheckedAt(new Date());
        if (!p) setError('This product is no longer available at the store.');
        // Preselect when there is only one choice per option.
        if (p) {
          const pre: Record<string, string> = {};
          optionNames(p.variants).forEach(n => {
            const values = Array.from(new Set(p.variants.map(v => v.options[n]).filter(Boolean)));
            if (values.length === 1) pre[n] = values[0];
          });
          setSelected(pre);
        }
      })
      .catch(err => setError(err.message || 'Could not reach the store'))
      .finally(() => setLoading(false));
  }, [store, id]);

  const names = useMemo(() => (product ? optionNames(product.variants) : []), [product]);

  const variant = useMemo(() => {
    if (!product) return null;
    if (product.variants.length === 1) return product.variants[0];
    if (names.some(n => !selected[n])) return null;
    return product.variants.find(v => names.every(n => v.options[n] === selected[n])) || null;
  }, [product, names, selected]);

  // A value is sold out when every variant that has it (and matches the other picks) is unavailable.
  const valueAvailable = (name: string, value: string) =>
    !!product?.variants.some(v =>
      v.options[name] === value &&
      v.available !== false &&
      names.every(n => n === name || !selected[n] || v.options[n] === selected[n])
    );

  const addToCart = async () => {
    if (!product || !variant) return;
    try {
      setAdding(true);
      setError(null);
      await addBridgeItemToCart({ partnerKey: product.partnerKey, productId: product.id, variantId: variant.id });
      setAdded(true);
    } catch (err: any) {
      setError(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-600">Checking price and stock at the store…</div>;
  }

  if (!product) {
    return <div className="p-8 text-center text-sm text-gray-600">{error}</div>;
  }

  const price = variant?.price || product.price;
  const soldOut = product.available === false || variant?.available === false;
  const image = variant?.imageUrl || product.imageUrl;

  return (
    <div className="pb-40">
      <div className="aspect-[3/4] bg-gray-100">
        {image ? (
          // Shopify asks that product images be shown live, not stored or proxied.
          <img src={image} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-gray-400" /></div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-600">{product.brand}</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">{product.title}</h1>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-semibold text-gray-900">
              {!variant && product.maxPrice && product.price && product.maxPrice.cents !== product.price.cents
                ? `${formatMoney(product.price)} – ${formatMoney(product.maxPrice)}`
                : formatMoney(price)}
            </span>
            {product.compareAtPrice && price && product.compareAtPrice.cents > price.cents && (
              <span className="text-sm text-gray-500 line-through">{formatMoney(product.compareAtPrice)}</span>
            )}
          </div>
          <p className={`text-xs mt-1 ${soldOut ? 'text-[var(--color-coral)]' : 'text-green-700'}`}>
            {soldOut ? 'Sold out at the store' : variant ? 'In stock at the store' : 'Choose your size to check stock'}
            {checkedAt && ` · checked ${checkedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
          </p>
        </div>

        {names.map(name => {
          const values = Array.from(new Set(product.variants.map(v => v.options[name]).filter(Boolean)));
          return (
            <div key={name}>
              <p className="text-sm font-medium text-gray-900 mb-2">{name}{selected[name] ? `: ${selected[name]}` : ''}</p>
              <div className="flex flex-wrap gap-2">
                {values.map(value => {
                  const ok = valueAvailable(name, value);
                  const isOn = selected[name] === value;
                  return (
                    <button
                      key={value}
                      onClick={() => { setAdded(false); setSelected(s => ({ ...s, [name]: value })); }}
                      className={`min-w-[44px] h-10 px-3 rounded-[10px] text-sm border transition-colors ${
                        isOn ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'
                      } ${ok ? '' : 'opacity-40 line-through'}`}
                      aria-label={`${name} ${value}${ok ? '' : ', sold out'}`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {product.description && <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>}
        {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
      </div>

      <div className="fixed bottom-[72px] left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        {added ? (
          <button
            onClick={() => router.push('/cart')}
            className="w-full h-12 bg-gray-900 text-white font-semibold rounded-[12px]"
          >
            Added. View cart
          </button>
        ) : (
          <button
            onClick={addToCart}
            disabled={!variant || soldOut || adding}
            className="w-full h-12 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white font-semibold rounded-[12px] disabled:opacity-50"
          >
            {soldOut ? 'Sold out' : !variant ? 'Choose a size' : adding ? 'Adding…' : `Add to cart · ${formatMoney(price)}`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function StoreProductPage() {
  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      <PageHeader title="" />
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-600">Loading…</div>}>
        <StoreProduct />
      </Suspense>
      <BottomNav />
    </div>
  );
}
