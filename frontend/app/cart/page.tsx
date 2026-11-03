'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import {
  getCart,
  updateCartItem,
  removeFromCart,
  startBridgeCheckout,
  getShippingAddress,
  saveShippingAddress,
  type ShipTo,
} from '@/lib/api/cart';

// Partner stores reached through agent bridges (UCP). Their items are paid for
// on the store's own checkout page, not in Muse's checkout.
const BRIDGE_PREFIX = 'bridge-';
const isBridgeStore = (store: { storeSlug?: string; integrationType?: string }) =>
  (store.storeSlug || '').startsWith(BRIDGE_PREFIX) || ['ucp', 'acp', 'bridge'].includes(store.integrationType || '');

interface CartItem {
  id: number;
  itemId: number;
  name: string;
  brandName?: string;
  priceCents: number;
  totalPriceCents: number;
  quantity: number;
  size?: string;
  color?: string;
  imageUrl?: string;
}

interface CartStore {
  storeId: number;
  storeName: string;
  storeSlug: string;
  storeLogo?: string;
  integrationType: string;
  supportsCheckout: boolean;
  items: CartItem[];
  subtotalCents: number;
  itemCount: number;
}

export default function CartPage() {
  const router = useRouter();
  const [cartStores, setCartStores] = useState<CartStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bridgeBusy, setBridgeBusy] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  // The address Muse fills in on each partner store's checkout.
  const [shipTo, setShipTo] = useState<ShipTo | null>(null);
  const [editingShipTo, setEditingShipTo] = useState(false);
  const [shipForm, setShipForm] = useState<ShipTo>({ name: '', address1: '', address2: '', city: '', state: '', zip: '', phone: '' });
  const [savingShipTo, setSavingShipTo] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ storeId: number; itemId: number; itemName: string } | null>(null);

  useEffect(() => {
    loadCart();
    getShippingAddress().then(setShipTo).catch(() => setShipTo(null));
  }, []);

  const startEditShipTo = () => {
    setShipForm({
      name: shipTo?.name || '', address1: shipTo?.address1 || '', address2: shipTo?.address2 || '',
      city: shipTo?.city || '', state: shipTo?.state || '', zip: shipTo?.zip || '', phone: '',
    });
    setEditingShipTo(true);
  };

  const submitShipTo = async () => {
    try {
      setSavingShipTo(true);
      setBridgeError(null);
      const saved = await saveShippingAddress(shipForm);
      setShipTo({ ...saved, hasPhone: !!shipForm.phone });
      setEditingShipTo(false);
    } catch (err: any) {
      setBridgeError(err.message || 'Could not save the address');
    } finally {
      setSavingShipTo(false);
    }
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const cartData: any = await getCart();
      setCartStores(cartData.stores || []);
    } catch (err: any) {
      console.error('Failed to load cart:', err);
      setError(err.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const checkoutAtStore = async (store: CartStore) => {
    const partnerKey = store.storeSlug.slice(BRIDGE_PREFIX.length);
    // Open the tab synchronously so pop-up blockers allow it, then point it at the store.
    const tab = window.open('', '_blank');
    try {
      setBridgeBusy(partnerKey);
      setBridgeError(null);
      const result = await startBridgeCheckout([partnerKey]);
      const ready = result.stores.find(s => s.partnerKey === partnerKey);
      const url = ready?.checkout.continueUrl;
      if (!url) {
        tab?.close();
        setBridgeError(result.errors[0]?.message || `${store.storeName} could not start checkout. Try again.`);
        return;
      }
      if (tab) tab.location.href = url;
      else window.location.href = url;
      loadCart();
    } catch (err: any) {
      tab?.close();
      setBridgeError(err.message || `${store.storeName} could not start checkout. Try again.`);
    } finally {
      setBridgeBusy(null);
    }
  };

  const updateQuantity = async (storeId: number, itemId: number, change: number) => {
    const store = cartStores.find(s => s.storeId === storeId);
    const item = store?.items.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = Math.max(1, item.quantity + change);

    try {
      await updateCartItem(itemId.toString(), newQuantity);

      // Optimistic update
      setCartStores(prev => prev.map(s => {
        if (s.storeId !== storeId) return s;

        const updatedItems = s.items.map(i => {
          if (i.id !== itemId) return i;
          return { ...i, quantity: newQuantity, totalPriceCents: i.priceCents * newQuantity };
        });

        return {
          ...s,
          items: updatedItems,
          subtotalCents: updatedItems.reduce((sum, i) => sum + i.totalPriceCents, 0),
          itemCount: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
        };
      }));
    } catch (err: any) {
      console.error('Failed to update quantity:', err);
      // Revert on error - reload cart
      loadCart();
    }
  };

  const handleRemoveClick = (storeId: number, itemId: number, itemName: string) => {
    setDeleteConfirm({ storeId, itemId, itemName });
  };

  const confirmRemove = async () => {
    if (!deleteConfirm) return;

    try {
      await removeFromCart(deleteConfirm.itemId.toString());

      // Optimistic update
      setCartStores(prev => {
        return prev
          .map(store => {
            if (store.storeId !== deleteConfirm.storeId) return store;

            const updatedItems = store.items.filter(i => i.id !== deleteConfirm.itemId);

            if (updatedItems.length === 0) return null;

            return {
              ...store,
              items: updatedItems,
              subtotalCents: updatedItems.reduce((sum, i) => sum + i.totalPriceCents, 0),
              itemCount: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
            };
          })
          .filter((store): store is CartStore => store !== null);
      });

      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Failed to remove item:', err);
      setDeleteConfirm(null);
      // Revert on error - reload cart
      loadCart();
    }
  };

  const cancelRemove = () => {
    setDeleteConfirm(null);
  };

  const calculateStoreTotal = (store: CartStore) => {
    return store.subtotalCents / 100;
  };

  // Muse's own checkout covers only the stores it checks out itself; partner
  // stores are paid on their own pages.
  const museStores = cartStores.filter(s => !isBridgeStore(s));

  const calculateGrandTotal = () => {
    return museStores.reduce((sum, store) => sum + store.subtotalCents, 0) / 100;
  };

  const totalItems = cartStores.reduce((sum, store) => sum + store.itemCount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
        <PageHeader title="Cart" />
        <div className="px-4 pt-4 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-[16px] p-4 shadow-sm">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-24 mb-4" />
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-[12px] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || cartStores.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
        <PageHeader title="Cart" />
        <div className="flex flex-col items-center justify-center px-4 pt-16">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-white rounded-full flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-12 h-12 text-gray-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Start adding items you love!</p>
          <a
            href="/discover"
            className="inline-block px-6 py-3 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white font-semibold rounded-[12px] hover:shadow-lg transition-shadow duration-150"
          >
            Discover Items
          </a>
        </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-32">
      <PageHeader title="Cart" />

      {/* Cart Items by Store */}
      <div className="px-4 pt-4 space-y-6">
        {cartStores.map((store) => (
          <div key={store.storeId} className="bg-white rounded-[16px] overflow-hidden shadow-sm">
            {/* Store Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
              {store.storeLogo && (
                <img src={store.storeLogo} alt={store.storeName} className="h-6 object-contain" />
              )}
              <span className="font-semibold text-gray-900">{store.storeName}</span>
            </div>

            {/* Store Items */}
            <div className="divide-y divide-gray-200">
              {store.items.map((item) => (
                <div key={item.id} className="p-4 flex gap-4">
                  {/* Product Image */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-[12px] overflow-hidden bg-gray-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <div>
                        {item.brandName && (
                          <p className="text-xs text-gray-600 font-medium">{item.brandName}</p>
                        )}
                        <h3 className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-2">
                          {item.name}
                        </h3>
                        {(item.color || item.size) && (
                          <p className="text-xs text-gray-600 mt-1">
                            {[item.color, item.size && `Size ${item.size}`].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveClick(store.storeId, item.id, item.name)}
                        className="text-gray-600 hover:text-[var(--color-coral)] transition-colors duration-150 h-fit"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price and Quantity */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-[8px] p-1">
                        <button
                          onClick={() => updateQuantity(store.storeId, item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-[6px] transition-colors duration-150"
                        >
                          <Minus className="w-3 h-3 text-gray-900" />
                        </button>
                        <span className="text-sm font-medium text-gray-900 w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(store.storeId, item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-[6px] transition-colors duration-150"
                        >
                          <Plus className="w-3 h-3 text-gray-900" />
                        </button>
                      </div>
                      <p className="text-base font-semibold text-gray-900">
                        ${(item.totalPriceCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Store Subtotal */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Store Subtotal</span>
              <span className="text-base font-semibold text-gray-900">
                ${calculateStoreTotal(store).toFixed(2)}
              </span>
            </div>

            {isBridgeStore(store) && (
              <div className="px-4 pb-4 bg-gray-50">
                <button
                  onClick={() => checkoutAtStore(store)}
                  disabled={bridgeBusy !== null}
                  className="w-full h-11 bg-gray-900 text-white text-sm font-semibold rounded-[12px] transition-opacity disabled:opacity-60"
                >
                  {bridgeBusy === store.storeSlug.slice(BRIDGE_PREFIX.length)
                    ? 'Opening checkout…'
                    : `Check out at ${store.storeName}`}
                </button>
                <p className="text-xs text-gray-600 text-center mt-2">
                  {shipTo
                    ? `Opens ${store.storeName}'s checkout with your address filled in. You pay ${store.storeName} directly.`
                    : `You pay ${store.storeName} directly. Shipping and tax are added at the store.`}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {cartStores.some(isBridgeStore) && (
        <div className="px-4 pt-6">
          <div className="bg-white rounded-[16px] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Ship to</p>
              {shipTo && !editingShipTo && (
                <button onClick={startEditShipTo} className="text-sm font-medium text-[var(--color-coral)]">Edit</button>
              )}
            </div>
            {!editingShipTo && shipTo && (
              <>
                <p className="text-sm text-gray-700 mt-1">
                  {shipTo.name}, {shipTo.address1}{shipTo.address2 ? `, ${shipTo.address2}` : ''}, {shipTo.city}, {shipTo.state} {shipTo.zip}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Muse fills this in at each store&apos;s checkout, so you only have to pay.
                </p>
              </>
            )}
            {!editingShipTo && !shipTo && (
              <>
                <p className="text-sm text-gray-700 mt-1">Add your address and Muse will fill in each store&apos;s checkout for you.</p>
                <button onClick={startEditShipTo} className="mt-3 h-10 px-4 bg-gray-900 text-white text-sm font-semibold rounded-[10px]">Add address</button>
              </>
            )}
            {editingShipTo && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {([
                  ['name', 'Full name', 2, 'name'],
                  ['address1', 'Street address', 2, 'address-line1'],
                  ['address2', 'Apt, suite (optional)', 2, 'address-line2'],
                  ['city', 'City', 2, 'address-level2'],
                  ['state', 'State', 1, 'address-level1'],
                  ['zip', 'ZIP', 1, 'postal-code'],
                  ['phone', 'Phone (stores ask for it)', 2, 'tel'],
                ] as const).map(([key, label, span, auto]) => (
                  <input
                    key={key}
                    aria-label={label}
                    placeholder={label}
                    autoComplete={auto}
                    value={(shipForm as any)[key] || ''}
                    onChange={e => setShipForm(f => ({ ...f, [key]: e.target.value }))}
                    className={`h-11 px-3 rounded-[10px] border border-gray-300 text-sm ${span === 2 ? 'col-span-2' : ''}`}
                  />
                ))}
                <div className="col-span-2 flex gap-2 mt-1">
                  <button onClick={() => setEditingShipTo(false)} className="flex-1 h-11 bg-gray-200 text-gray-900 text-sm font-semibold rounded-[10px]">Cancel</button>
                  <button onClick={submitShipTo} disabled={savingShipTo} className="flex-1 h-11 bg-gray-900 text-white text-sm font-semibold rounded-[10px] disabled:opacity-60">
                    {savingShipTo ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {bridgeError && (
        <div className="px-4 pt-4">
          <p className="text-sm text-[var(--color-coral)] text-center">{bridgeError}</p>
        </div>
      )}

      {/* Checkout Bar: only for stores Muse checks out itself */}
      {museStores.length > 0 && (
      <div className="fixed bottom-[72px] left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="max-w-screen-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${calculateGrandTotal().toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              className="px-8 py-4 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white font-semibold rounded-[12px] hover:shadow-lg hover:scale-105 transition-all duration-150 active:scale-95"
            >
              Checkout
            </button>
          </div>
          <p className="text-xs text-gray-600 text-center">
            You'll complete {museStores.length} separate {museStores.length === 1 ? 'order' : 'orders'} from {museStores.length} {museStores.length === 1 ? 'store' : 'stores'}
          </p>
        </div>
      </div>
      )}

      <BottomNav />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-[16px] p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Remove item?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove <span className="font-medium text-gray-900">{deleteConfirm.itemName}</span> from your cart?
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelRemove}
                className="flex-1 h-12 bg-gray-200 text-gray-900 rounded-[12px] font-semibold transition-colors hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="flex-1 h-12 bg-[var(--color-coral)] text-white rounded-[12px] font-semibold transition-all hover:shadow-lg hover:scale-105 active:scale-95"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
