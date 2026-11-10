'use client';

// One-step agent checkout: the shopper reviews every partner store in the cart once,
// taps Confirm once, and Muse pays each store it can. Stores Muse can't pay yet
// keep their "Check out at {store}" link. Hidden until AGENT_CHECKOUT_ENABLED.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import PageHeader from '@/components/PageHeader';
import { AGENT_CHECKOUT_ENABLED } from '@/lib/features';
import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import {
  prepareAgentCheckout,
  confirmAgentCheckout,
  cancelAgentCheckout,
  getAgentCheckoutApprovalOptions,
  getPasskeyRegistrationOptions,
  requestPasskeySetupCode,
  verifyPasskeyRegistration,
  type AgentCheckoutReview,
  type AgentCheckoutResult,
  type AgentCheckoutStore,
} from '@/lib/api/cart';

const RAIL_LABEL: Record<string, string> = {
  shop_pay: 'Muse pays with your Shop Pay',
  visa_ic: 'Muse pays with your Visa card',
  stripe_spt: 'Muse pays with Link',
  google_pay: 'Muse pays with Google Pay',
};

const money = (cents: number | null | undefined, currency = 'USD') =>
  cents == null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const museCanPay = (s: AgentCheckoutStore) => s.rail !== 'handoff';

function useCountdown(expiresAt?: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return left;
}

export default function CartReviewPage() {
  const router = useRouter();
  const [review, setReview] = useState<AgentCheckoutReview | null>(null);
  const [result, setResult] = useState<AgentCheckoutResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // First-time Face ID setup: a code emailed to the shopper comes first.
  const [setupSentTo, setSetupSentTo] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const confirmed = useRef(false);
  const left = useCountdown(result ? undefined : review?.expiresAt);
  const expired = left === 0;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      confirmed.current = false;
      setReview(await prepareAgentCheckout());
    } catch (err) {
      setError(errorText(err, 'Could not build your checkout. Try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!AGENT_CHECKOUT_ENABLED) {
      router.replace('/cart');
      return;
    }
    load();
  }, [load, router]);

  const cancelledText = (err: unknown, fallback: string) =>
    err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'AbortError')
      ? 'Face ID was cancelled. Nothing was charged.'
      : errorText(err, fallback);

  // Approve this exact cart with one Face ID tap, then Muse pays.
  const approveAndPay = async (intentId: string, summaryHash: string) => {
    const approval = await getAgentCheckoutApprovalOptions(intentId);
    if (approval.needsPasskey) throw new Error('Face ID isn\'t set up yet. Tap Confirm again.');
    setStep('Confirm with Face ID…');
    const passkey = await startAuthentication({ optionsJSON: approval.options as PublicKeyCredentialRequestOptionsJSON });
    setStep('Paying each store…');
    setResult(await confirmAgentCheckout(intentId, { summaryHash, passkey }));
  };

  // Confirm = one passkey tap (Face ID / Touch ID) bound to this exact review, then Muse pays.
  // The first time, Muse emails a setup code before Face ID can be added.
  const confirm = async () => {
    if (!review || confirmed.current) return;
    confirmed.current = true; // one tap only, even before React re-renders
    try {
      setConfirming(true);
      setError(null);
      if (!browserSupportsWebAuthn()) {
        throw new Error('This browser can\'t use Face ID or Touch ID. Check out at each store instead.');
      }
      const approval = await getAgentCheckoutApprovalOptions(review.intentId);
      if (approval.needsPasskey) {
        setStep('Emailing you a setup code…');
        const sent = await requestPasskeySetupCode();
        setSetupSentTo(sent.sentTo);
        confirmed.current = false;
        return;
      }
      await approveAndPay(review.intentId, review.summaryHash);
    } catch (err) {
      confirmed.current = false;
      setError(cancelledText(err, 'Checkout did not go through. Nothing was charged.'));
    } finally {
      setConfirming(false);
      setStep(null);
    }
  };

  // After the emailed code: add Face ID, then approve and pay in the same flow.
  const finishSetup = async () => {
    if (!review || confirmed.current) return;
    confirmed.current = true;
    try {
      setConfirming(true);
      setError(null);
      setStep('Setting up Face ID for Muse…');
      const regOptions = (await getPasskeyRegistrationOptions(setupCode.trim())) as PublicKeyCredentialCreationOptionsJSON;
      await verifyPasskeyRegistration(await startRegistration({ optionsJSON: regOptions }), 'Muse checkout');
      setSetupSentTo(null);
      setSetupCode('');
      await approveAndPay(review.intentId, review.summaryHash);
    } catch (err) {
      confirmed.current = false;
      setError(cancelledText(err, 'Face ID setup didn\'t work. Nothing was charged.'));
    } finally {
      setConfirming(false);
      setStep(null);
    }
  };

  const back = async () => {
    if (review && !result) cancelAgentCheckout(review.intentId).catch(() => {});
    router.push('/cart');
  };

  if (!AGENT_CHECKOUT_ENABLED) return null;

  const stores = result?.stores ?? review?.stores ?? [];
  const payable = (review?.stores ?? []).filter(museCanPay);
  const payableTotal = payable.reduce((n, s) => n + (s.ceilingCents || 0), 0);
  const currency = review?.currency || 'USD';

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-80">
      <PageHeader title={result ? 'Orders' : 'Checkout'} showBack onBack={back} />

      {loading && (
        <div className="px-4 pt-10 text-center text-sm text-gray-600">Getting live totals from each store…</div>
      )}

      {!loading && review && (
        <div className="px-4 pt-4 space-y-3 max-w-screen-sm mx-auto">
          {review.shipTo && !result && (
            <div className="bg-white rounded-[16px] p-4 shadow-sm">
              <p className="text-xs text-gray-600">Shipping to</p>
              <p className="text-sm text-gray-900 mt-1">
                {review.shipTo.name}, {review.shipTo.address1}, {review.shipTo.city}, {review.shipTo.state} {review.shipTo.zip}
              </p>
            </div>
          )}

          {stores.map((s) => (
            <StoreRow key={s.partnerKey} store={s} done={!!result} />
          ))}

          {review.errors.map((e) => (
            <div key={e.partnerKey} className="bg-white rounded-[16px] p-4 shadow-sm flex gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--color-coral)] mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700">
                {e.storeName} couldn&apos;t build a checkout, so it isn&apos;t included. It stays in your cart.
              </p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="px-4 pt-4 max-w-screen-sm mx-auto">
          <p className="text-sm text-[var(--color-coral)] text-center">{error}</p>
          {!review && (
            <button onClick={load} className="mt-3 w-full h-11 bg-gray-900 text-white text-sm font-semibold rounded-[12px]">
              Try again
            </button>
          )}
        </div>
      )}

      {!loading && review && !result && (
        <div className="fixed bottom-[72px] left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="max-w-screen-sm mx-auto">
            {payable.length > 0 ? (
              <>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-600">
                      Muse pays {payable.length} {payable.length === 1 ? 'store' : 'stores'}, up to
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">{money(payableTotal, currency)}</p>
                  </div>
                  {left != null && (
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {expired ? 'Expired' : `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`}
                    </p>
                  )}
                </div>
                {expired ? (
                  <button onClick={load} className="w-full h-12 bg-gray-900 text-white font-semibold rounded-[12px]">
                    Prices may have changed. Review again
                  </button>
                ) : setupSentTo ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      finishSetup();
                    }}
                    className="space-y-2"
                  >
                    <label htmlFor="setup-code" className="block text-sm text-gray-900">
                      To set up Face ID, enter the 6-digit code we emailed to {setupSentTo}.
                    </label>
                    <input
                      id="setup-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={setupCode}
                      onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-12 rounded-[12px] border border-gray-300 px-4 text-center text-lg tracking-[0.4em]"
                      aria-describedby="setup-code-help"
                    />
                    <button
                      type="submit"
                      disabled={confirming || setupCode.length !== 6}
                      className="w-full h-12 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white font-semibold rounded-[12px] disabled:opacity-60"
                    >
                      {confirming ? step || 'Working…' : 'Set up Face ID and confirm'}
                    </button>
                    <p id="setup-code-help" className="text-xs text-gray-600 text-center">
                      This happens once. After that, each cart takes one Face ID tap.
                    </p>
                  </form>
                ) : (
                  <button
                    onClick={confirm}
                    disabled={confirming}
                    className="w-full h-12 bg-gradient-to-br from-[var(--color-peach)] to-[var(--color-blue)] text-white font-semibold rounded-[12px] disabled:opacity-60"
                  >
                    {confirming ? step || 'Working…' : `Confirm with Face ID · ${money(payableTotal, currency)}`}
                  </button>
                )}
                <p className="text-xs text-gray-600 text-center mt-2">
                  One Face ID or Touch ID tap approves every store above, for this cart only. No store is charged more than the amount shown.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-700 text-center">
                These stores don&apos;t take payment through Muse yet. Check out at each one above.
              </p>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function StoreRow({ store, done }: { store: AgentCheckoutStore; done: boolean }) {
  const paid = store.status === 'paid';
  const needsShopper = !museCanPay(store) || store.status === 'failed' || store.status === 'handoff';
  const blocked = store.status === 'blocked';

  return (
    <div className="bg-white rounded-[16px] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900">{store.storeName}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {store.itemCount != null && `${store.itemCount} ${store.itemCount === 1 ? 'item' : 'items'} · `}
            {museCanPay(store) && !(done && needsShopper)
              ? RAIL_LABEL[store.rail] || 'Muse pays this store'
              : `You check out at ${store.storeName}`}
          </p>
        </div>
        <p className="text-base font-semibold text-gray-900 shrink-0">{money(store.ceilingCents, store.currency)}</p>
      </div>

      {(store.items?.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {store.items!.map((item, i) => {
            const each = item.storePriceCents ?? item.cartPriceCents;
            const options = [item.size && `Size ${item.size}`, item.color].filter(Boolean).join(' · ') || item.variantTitle;
            const seller = item.marketplace && item.sellerName ? `Sold by ${item.sellerName}${item.fulfilledBy ? `, ships from ${item.fulfilledBy}` : ''}` : null;
            return (
              <li key={item.variantId || item.cartItemId || i} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-600">
                    {options ? `${options} · ` : ''}Qty {item.quantity}
                  </p>
                  {seller && <p className="text-xs text-gray-600">{seller}</p>}
                </div>
                <p className="text-gray-900 shrink-0">{money(each == null ? null : each * item.quantity, store.currency)}</p>
              </li>
            );
          })}
        </ul>
      )}

      {done && paid && (
        <p className="text-sm text-gray-900 mt-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Ordered{store.orderId ? ` · #${store.orderId}` : ''}
        </p>
      )}
      {done && blocked && (
        <p className="text-sm text-[var(--color-coral)] mt-3">
          {store.storeName}&apos;s final total was higher than you approved, so Muse stopped. Check your email from {store.storeName}.
        </p>
      )}
      {done && store.status === 'failed' && (
        <p className="text-sm text-gray-700 mt-3">Payment didn&apos;t go through here. Nothing was charged at {store.storeName}.</p>
      )}

      {needsShopper && store.continueUrl && (
        <a
          href={store.continueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full h-11 bg-gray-900 text-white text-sm font-semibold rounded-[12px] flex items-center justify-center gap-1.5"
        >
          Check out at {store.storeName}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
