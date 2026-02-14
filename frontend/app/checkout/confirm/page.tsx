'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Apple, CreditCard, ShieldCheck, Check } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import {
  getCheckoutReadiness,
  getCheckoutSession,
  linkStoreAccount,
  placeCheckoutOrders,
  setCheckoutBilling,
  setCheckoutPaymentMethod,
  setCheckoutRecipient,
  setCheckoutShippingAddress,
} from '@/lib/api';
import type { CheckoutReadiness, CheckoutSession } from '@/lib/types/api';

type StoreMode = 'linked' | 'guest';

export const dynamic = 'force-dynamic';

function CheckoutConfirmContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [readiness, setReadiness] = useState<CheckoutReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('US');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<'apple_pay' | 'card'>('apple_pay');
  const [saving, setSaving] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [linkingStoreId, setLinkingStoreId] = useState<number | null>(null);

  const getStoreMode = useCallback(
    (storeId: number): StoreMode => {
      const mode = session?.shippingPreferences?.selections?.[String(storeId)]?.checkoutMode;
      return mode === 'guest' ? 'guest' : 'linked';
    },
    [session]
  );

  const loadData = useCallback(async () => {
    if (!sessionId) {
      setError('Missing checkout session. Return to cart and start checkout again.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [sessionData, readinessData] = await Promise.all([
        getCheckoutSession(sessionId),
        getCheckoutReadiness(),
      ]);

      setSession(sessionData);
      setReadiness(readinessData);

      if (sessionData.shippingAddress) {
        setName(sessionData.shippingAddress.name || '');
        setAddress1(sessionData.shippingAddress.address1 || '');
        setAddress2(sessionData.shippingAddress.address2 || '');
        setCity(sessionData.shippingAddress.city || '');
        setStateRegion(sessionData.shippingAddress.state || '');
        setZip(sessionData.shippingAddress.zip || '');
        setCountry(sessionData.shippingAddress.country || 'US');
        setPhone(sessionData.shippingAddress.phone || '');
      }

      if (sessionData.recipient) {
        setEmail(sessionData.recipient.email || '');
        setPhone((prev) => prev || sessionData.recipient?.phone || '');
        setName((prev) => prev || sessionData.recipient?.name || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checkout session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const readinessByStoreId = useMemo(() => {
    const map = new Map<number, any>();
    for (const store of readiness?.stores || []) {
      map.set(store.storeId, store);
    }
    return map;
  }, [readiness]);

  const stores = session?.cartSnapshot?.stores || [];
  const missingStorePayments = useMemo(
    () =>
      (readiness?.stores || []).filter((store) => {
        const linkedMode = getStoreMode(store.storeId) === 'linked';
        return linkedMode && store.issues.includes('missing_retailer_payment_method');
      }),
    [getStoreMode, readiness]
  );

  const requiredFieldsValid =
    !!name.trim() &&
    !!email.trim() &&
    !!phone.trim() &&
    !!address1.trim() &&
    !!city.trim() &&
    !!stateRegion.trim() &&
    !!zip.trim() &&
    !!country.trim();

  const canPlace = requiredFieldsValid && missingStorePayments.length === 0 && !placingOrder && !saving;

  const persistConfirmationData = useCallback(async () => {
    if (!sessionId || !session) return;

    const shippingAddress = {
      name,
      address1,
      address2: address2 || undefined,
      city,
      state: stateRegion,
      zip,
      country,
      phone,
    };

    await setCheckoutShippingAddress(sessionId, shippingAddress);
    await setCheckoutRecipient(sessionId, {
      name,
      email,
      phone,
    });

    if (sameAsShipping) {
      await setCheckoutBilling(sessionId, { sameAsShipping: true });
    } else {
      await setCheckoutBilling(sessionId, {
        sameAsShipping: false,
        billingAddress: shippingAddress,
      });
    }

    if (selectedPayment === 'apple_pay') {
      await setCheckoutPaymentMethod(sessionId, { paymentMethodId: 'apple_pay_wallet' });
    } else if (session.paymentMethodId) {
      await setCheckoutPaymentMethod(sessionId, { paymentMethodId: session.paymentMethodId });
    }

    const storePaymentUpdates = stores
      .filter((store) => getStoreMode(store.storeId) === 'linked')
      .map((store) => ({ storeId: store.storeId, token: session.paymentMethods?.[String(store.storeId)] }))
      .filter((entry) => !!entry.token)
      .map((entry) =>
        setCheckoutPaymentMethod(sessionId, {
          paymentMethodId: String(entry.token),
          storeId: entry.storeId,
        })
      );

    await Promise.all(storePaymentUpdates);
  }, [
    address1,
    address2,
    city,
    country,
    email,
    getStoreMode,
    name,
    phone,
    sameAsShipping,
    selectedPayment,
    session,
    sessionId,
    stateRegion,
    stores,
    zip,
  ]);

  const saveDetails = async () => {
    if (!sessionId) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await persistConfirmationData();
      const [updatedSession, updatedReadiness] = await Promise.all([
        getCheckoutSession(sessionId),
        getCheckoutReadiness(),
      ]);
      setSession(updatedSession);
      setReadiness(updatedReadiness);
      setMessage('Details saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save details');
    } finally {
      setSaving(false);
    }
  };

  const placeOrder = async () => {
    if (!sessionId || !canPlace) return;

    try {
      setPlacingOrder(true);
      setError(null);
      setMessage(null);
      await persistConfirmationData();
      const result = await placeCheckoutOrders(sessionId);
      setMessage(`Order submitted: ${result.summary.successfulOrders} successful, ${result.summary.failedOrders} failed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const connectStore = async (storeId: number) => {
    try {
      setLinkingStoreId(storeId);
      setError(null);
      await linkStoreAccount(storeId);
      const updatedReadiness = await getCheckoutReadiness();
      setReadiness(updatedReadiness);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect store account');
    } finally {
      setLinkingStoreId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-28">
      <header className="sticky top-0 z-20 bg-[var(--color-ecru)] pt-10 pb-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href={sessionId ? `/checkout?sessionId=${encodeURIComponent(sessionId)}` : '/checkout'}
            className="p-2 rounded-full hover:bg-white/70 transition-colors duration-150"
            aria-label="Back to checkout"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Review</p>
            <h1 className="text-lg font-semibold text-gray-900">Confirm & Pay</h1>
          </div>
        </div>
      </header>

      <div className="px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {loading && <p className="text-sm text-gray-500">Loading checkout details...</p>}

          {error && (
            <div className="bg-white rounded-[16px] p-4 shadow-sm">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-white rounded-[16px] p-4 shadow-sm">
              <p className="text-sm text-emerald-700">{message}</p>
            </div>
          )}

          {!loading && session && (
            <>
              <div className="bg-white rounded-[16px] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Shipping address</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm" />
                  <input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Address line 1" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm md:col-span-2" />
                  <input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Address line 2 (optional)" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm md:col-span-2" />
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm" />
                  <input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} placeholder="State" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm" />
                  <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP code" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm" />
                  <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm" />
                </div>
              </div>

              <div className="bg-white rounded-[16px] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Recipient</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-11 px-3 rounded-[12px] border border-gray-200 focus:border-gray-400 focus:outline-none text-sm" />
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={sameAsShipping}
                    onChange={(e) => setSameAsShipping(e.target.checked)}
                  />
                  Billing address same as shipping
                </label>
              </div>

              <div className="bg-white rounded-[16px] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Payment method</p>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-[12px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[10px] bg-gray-100 flex items-center justify-center">
                        <Apple className="w-5 h-5 text-gray-900" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Apple Pay</p>
                        <p className="text-xs text-gray-500">Wallet confirmation for supported stores.</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPayment === 'apple_pay'}
                      onChange={() => setSelectedPayment('apple_pay')}
                      className="h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-[12px]">
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-[10px] bg-gray-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Saved card on file</p>
                        <p className="text-xs text-gray-500">
                          {session.paymentMethodId ? 'Using your saved payment method.' : 'No global card token stored; guest flow can still proceed for guest-mode stores.'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPayment === 'card'}
                      onChange={() => setSelectedPayment('card')}
                      className="h-4 w-4"
                    />
                  </label>
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-gray-600" />
                  <p>Linked stores require retailer payment methods. Guest stores do not.</p>
                </div>
              </div>

              <div className="space-y-3">
                {stores.map((store) => {
                  const storeReadiness = readinessByStoreId.get(store.storeId);
                  const mode = getStoreMode(store.storeId);
                  const missingPayment = mode === 'linked' && storeReadiness?.issues?.includes('missing_retailer_payment_method');
                  const linked = storeReadiness?.connection?.isLinked;
                  return (
                    <div key={store.storeId} className="bg-white rounded-[16px] p-4 shadow-sm flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{store.storeName}</p>
                        <p className={`text-xs ${missingPayment ? 'text-amber-700' : 'text-gray-500'}`}>
                          Mode: {mode === 'linked' ? 'Linked' : 'Guest'}
                          {missingPayment ? ' • Missing retailer payment method' : ''}
                        </p>
                      </div>
                      {mode === 'linked' && !linked ? (
                        <button
                          onClick={() => connectStore(store.storeId)}
                          disabled={linkingStoreId === store.storeId}
                          className="text-xs font-semibold text-[var(--color-coral)] hover:text-[var(--color-peach)] disabled:opacity-50"
                        >
                          {linkingStoreId === store.storeId ? 'Connecting...' : 'Connect account'}
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">Ready</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-[16px] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-500">Order confirmation</p>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Shipping, billing, and recipient details validated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Only linked-mode stores require retailer payment methods</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={saveDetails}
                  disabled={saving || placingOrder}
                  className="w-full bg-white border border-gray-200 text-gray-900 py-3.5 rounded-[18px] font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save details'}
                </button>
                <button
                  onClick={placeOrder}
                  disabled={!canPlace}
                  className="w-full gradient-primary text-white py-3.5 rounded-[18px] font-semibold shadow-sm hover:shadow-base transition-shadow duration-150 disabled:opacity-50"
                >
                  {placingOrder ? 'Placing order...' : 'Confirm and place order'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function CheckoutConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ecru)] flex items-center justify-center"><p className="text-gray-500">Loading checkout...</p></div>}>
      <CheckoutConfirmContent />
    </Suspense>
  );
}
