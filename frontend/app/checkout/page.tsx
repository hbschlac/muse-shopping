'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Truck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import {
  applyCheckoutPromoCode,
  getCheckoutReadiness,
  getCheckoutSession,
  initiateCheckoutSession,
  linkStoreAccount,
  setCheckoutShippingSelections,
} from '@/lib/api';
import type { CheckoutReadiness, CheckoutSession } from '@/lib/types/api';

type StoreMode = 'linked' | 'guest';

export const dynamic = 'force-dynamic';

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');

  const [readiness, setReadiness] = useState<CheckoutReadiness | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [linkingStoreId, setLinkingStoreId] = useState<number | null>(null);
  const [updatingModeStoreId, setUpdatingModeStoreId] = useState<number | null>(null);

  const loadCheckout = useCallback(async () => {
    try {
      setError(null);

      const readinessPromise = getCheckoutReadiness();
      const sessionPromise = sessionIdParam
        ? getCheckoutSession(sessionIdParam)
        : initiateCheckoutSession();

      const [nextReadiness, nextSession] = await Promise.all([readinessPromise, sessionPromise]);
      setReadiness(nextReadiness);
      setSession(nextSession);

      if (!sessionIdParam && nextSession.sessionId) {
        router.replace(`/checkout?sessionId=${encodeURIComponent(nextSession.sessionId)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initialize checkout');
    } finally {
      setLoading(false);
    }
  }, [router, sessionIdParam]);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  const storeReadinessMap = useMemo(() => {
    const map = new Map<number, any>();
    for (const store of readiness?.stores || []) {
      map.set(store.storeId, store);
    }
    return map;
  }, [readiness]);

  const applyPromo = async () => {
    if (!session || !session.sessionId || !promoCode.trim()) return;
    try {
      setApplyingPromo(true);
      const updated = await applyCheckoutPromoCode(session.sessionId, { code: promoCode.trim() });
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  const connectStore = async (storeId: number) => {
    try {
      setLinkingStoreId(storeId);
      await linkStoreAccount(storeId);
      const nextReadiness = await getCheckoutReadiness();
      setReadiness(nextReadiness);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect store account');
    } finally {
      setLinkingStoreId(null);
    }
  };

  const getStoreMode = (storeId: number): StoreMode => {
    const mode = session?.shippingPreferences?.selections?.[String(storeId)]?.checkoutMode;
    return mode === 'guest' ? 'guest' : 'linked';
  };

  const updateStoreMode = async (storeId: number, mode: StoreMode) => {
    if (!session) return;

    try {
      setUpdatingModeStoreId(storeId);
      const currentSelections = session.shippingPreferences?.selections || {};
      const nextSelections: Record<string, { optionId: string; checkoutMode?: StoreMode }> = {
        ...currentSelections,
      };

      for (const store of session.cartSnapshot?.stores || []) {
        const key = String(store.storeId);
        nextSelections[key] = {
          optionId: nextSelections[key]?.optionId || 'standard',
          checkoutMode:
            store.storeId === storeId
              ? mode
              : (nextSelections[key]?.checkoutMode as StoreMode | undefined) || getStoreMode(store.storeId),
        };
      }

      if (!session.sessionId) return;
      const updated = await setCheckoutShippingSelections(session.sessionId, {
        selections: nextSelections,
      });
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update checkout mode');
    } finally {
      setUpdatingModeStoreId(null);
    }
  };

  const goToConfirm = () => {
    if (!session || !session.sessionId) return;
    router.push(`/checkout/confirm?sessionId=${encodeURIComponent(session.sessionId)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-28">
      <PageHeader
        title="Checkout"
        showBack
        backHref="/cart"
      />

      <div className="px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {loading && <p className="text-sm text-gray-500">Initializing checkout...</p>}

          {error && (
            <div className="bg-white rounded-[16px] p-4 shadow-sm">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={loadCheckout}
                className="mt-2 text-sm font-medium text-gray-900 hover:text-gray-700"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && session && (
            <>
              <div className="bg-white rounded-[16px] p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Payment</p>
                    <p className="text-[15px] font-semibold text-gray-900">One checkout, per-store mode</p>
                    <p className="text-sm text-gray-600">Choose linked account or guest checkout for each store.</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-gray-700" />
                </div>
              </div>

              <div className="bg-white rounded-[16px] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Promo</p>
                    <p className="text-[15px] font-semibold text-gray-900">Apply a promo code</p>
                  </div>
                  <button
                    onClick={applyPromo}
                    disabled={applyingPromo || !promoCode.trim()}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                  >
                    {applyingPromo ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                <div className="mt-3">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code"
                    className="w-full h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm"
                  />
                </div>
                {session.promo?.code && (
                  <p className="mt-2 text-xs text-emerald-700">Promo saved: {String(session.promo.code)}</p>
                )}
              </div>

              <div className="space-y-6">
                {(session.cartSnapshot?.stores || []).map((store) => {
                  const state = storeReadinessMap.get(store.storeId);
                  const isLinked = !!state?.connection?.isLinked;
                  const mode = getStoreMode(store.storeId);
                  const requiresPayment = mode === 'linked';
                  const missingPayment = state?.issues?.includes('missing_retailer_payment_method');

                  return (
                    <div key={store.storeId} className="bg-white rounded-[16px] p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[15px] font-semibold text-gray-900">{store.storeName}</p>
                          <p className="text-xs text-gray-500">
                            {mode === 'guest'
                              ? 'Guest checkout selected'
                              : isLinked
                                ? 'Linked account checkout selected'
                                : 'Link account to use linked checkout'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Truck className="w-4 h-4" />
                          <span>Shipping options at confirm step</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => updateStoreMode(store.storeId, 'linked')}
                          disabled={updatingModeStoreId === store.storeId}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            mode === 'linked'
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-300'
                          } disabled:opacity-50`}
                        >
                          Linked
                        </button>
                        <button
                          onClick={() => updateStoreMode(store.storeId, 'guest')}
                          disabled={updatingModeStoreId === store.storeId}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            mode === 'guest'
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-300'
                          } disabled:opacity-50`}
                        >
                          Guest
                        </button>
                      </div>

                      {mode === 'linked' && !isLinked && (
                        <button
                          onClick={() => connectStore(store.storeId)}
                          disabled={linkingStoreId === store.storeId}
                          className="text-xs font-semibold text-[var(--color-coral)] hover:text-[var(--color-peach)] disabled:opacity-50"
                        >
                          {linkingStoreId === store.storeId ? 'Connecting...' : 'Connect account'}
                        </button>
                      )}

                      {requiresPayment && missingPayment && (
                        <p className="text-xs text-amber-700 mt-2">Linked mode requires retailer payment method on file.</p>
                      )}

                      <div className="space-y-4 mt-4">
                        {store.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4">
                            <div className="w-[72px] h-[92px] rounded-[12px] overflow-hidden bg-gray-100 flex-shrink-0">
                              {item.productImageUrl ? (
                                <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-100" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-[15px] font-semibold text-gray-900">{item.productName}</p>
                              <p className="text-sm text-gray-600">Qty {item.quantity}</p>
                              {(item.size || item.color) && (
                                <p className="text-xs text-gray-500 mt-1">{[item.size, item.color].filter(Boolean).join(' • ')}</p>
                              )}
                            </div>
                            <p className="text-[15px] font-medium text-gray-900">{item.priceDisplay}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-[16px] p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatMoney(session.subtotalCents || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Delivery</span>
                  <span className="font-medium text-gray-900">{formatMoney(session.shippingCents || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatMoney(session.totalCents || session.total_cents || 0)}</span>
                </div>
              </div>

              <div>
                <button
                  onClick={goToConfirm}
                  className="w-full gradient-primary text-white py-3.5 rounded-[18px] font-semibold shadow-sm hover:shadow-base transition-shadow duration-150"
                >
                  Review & pay
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">One checkout across all your stores.</p>
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ecru)] flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
