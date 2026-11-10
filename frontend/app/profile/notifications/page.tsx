'use client';

/**
 * Profile > Notifications: turn on push for this phone, and choose what Muse
 * alerts you about, how (push now, daily digest, off), when, and how often.
 * Every change saves right away.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Bell, Share, PlusSquare } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import {
  getPrefs,
  updatePrefs,
  getPushStatus,
  sendTestPush,
  type AlertMode,
  type AlertType,
  type NotificationPrefs,
  type PushStatus,
} from '@/lib/api/notifications';
import { APIError } from '@/lib/api/client';
import { pushSupport, currentSubscription, enablePush, disablePush, type PushSupport } from '@/lib/push';
import { storeLabel } from './storeLabel';

const TYPE_ROWS: { type: AlertType; title: string; description: string }[] = [
  { type: 'back_in_stock', title: 'Size back in stock', description: 'When a size you asked about is available again' },
  { type: 'price_drop', title: 'Price drops on saved items', description: 'When something you saved gets cheaper' },
  { type: 'new_item', title: 'New drops', description: 'New items from stores you follow' },
];

const MODES: { mode: AlertMode; label: string }[] = [
  { mode: 'push', label: 'Push' },
  { mode: 'digest', label: 'Digest' },
  { mode: 'off', label: 'Off' },
];

const CAPS = [1, 2, 3, 5, 8, 10, 15, 20];

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[16px] shadow-sm overflow-hidden">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-2 px-1">{children}</h2>;
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [support, setSupport] = useState<PushSupport>('unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshDevice = useCallback(async () => {
    setSupport(pushSupport());
    const sub = await currentSubscription().catch(() => null);
    setSubscribed(!!sub);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([getPrefs(), getPushStatus()]);
        setPrefs(p);
        setStatus(s);
      } catch (e) {
        if (e instanceof APIError && e.status === 401) setSignedOut(true);
        else setError('Couldn’t load your notification settings.');
      }
      await refreshDevice();
    })();
  }, [refreshDevice]);

  const save = async (patch: Partial<NotificationPrefs>) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, ...patch, types: { ...prefs.types, ...(patch.types || {}) } });
    setError(null);
    try {
      setPrefs(await updatePrefs(patch));
    } catch (e) {
      setPrefs(before);
      setError(e instanceof Error ? e.message : 'Couldn’t save that change.');
    }
  };

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await enablePush();
      setStatus(await getPushStatus());
      await refreshDevice();
      setNote('Push alerts are on for this phone. Send a test to check.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t turn on push.');
      await refreshDevice();
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setNote(null);
    await disablePush();
    setStatus(await getPushStatus().catch(() => status));
    await refreshDevice();
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const r = await sendTestPush();
      if (!r.configured) setError('Push isn’t set up on the server yet.');
      else if (r.delivered > 0) setNote(`Test sent to ${r.delivered} device${r.delivered === 1 ? '' : 's'}. It should arrive in a few seconds.`);
      else setError('No device took the test. Turn push off and on again on this phone.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send a test.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Back">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        </div>
      </header>

      <div className="px-4 pt-4 max-w-xl mx-auto">
        {signedOut && (
          <Card>
            <div className="p-4">
              <p className="text-base text-gray-900 mb-3">Sign in to choose your alerts.</p>
              <Link href="/welcome" className="inline-block rounded-full bg-gray-900 text-white px-5 py-2 text-sm font-medium">Sign in</Link>
            </div>
          </Card>
        )}

        {error && <p className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</p>}
        {note && <p className="mb-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">{note}</p>}

        {!signedOut && (
          <>
            <SectionTitle>Push on this phone</SectionTitle>
            <Card>
              <div className="p-4">
                {status && !status.configured ? (
                  <p className="text-sm text-gray-700">Push alerts aren’t switched on for Muse yet. Your alerts still show in Alert history below.</p>
                ) : support === 'needs-home-screen' ? (
                  <div>
                    <p className="text-base font-medium text-gray-900 mb-2">Add Muse to your home screen first</p>
                    <p className="text-sm text-gray-600 mb-3">iPhone only sends alerts to sites saved to the home screen.</p>
                    <ol className="text-sm text-gray-800 space-y-2">
                      <li className="flex items-start gap-2"><Share className="w-4 h-4 mt-0.5 shrink-0" />Tap Share (in Chrome it’s at the top right, in Safari at the bottom).</li>
                      <li className="flex items-start gap-2"><PlusSquare className="w-4 h-4 mt-0.5 shrink-0" />Tap Add to Home Screen, then Add.</li>
                      <li className="flex items-start gap-2"><Bell className="w-4 h-4 mt-0.5 shrink-0" />Open Muse from the new icon and come back to this page.</li>
                    </ol>
                  </div>
                ) : support === 'denied' ? (
                  <p className="text-sm text-gray-700">Notifications are blocked for Muse. Turn them on in your phone’s Settings, under Notifications, then come back here.</p>
                ) : support === 'unsupported' ? (
                  <p className="text-sm text-gray-700">This browser can’t receive push alerts. Your alerts still show in Alert history below.</p>
                ) : subscribed ? (
                  <div>
                    <p className="text-base font-medium text-gray-900 mb-3">Push alerts are on for this phone</p>
                    <div className="flex gap-2">
                      <button onClick={test} disabled={busy} className="rounded-full bg-gray-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">Send a test</button>
                      <button onClick={turnOff} disabled={busy} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-50">Turn off here</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Get size, price and new-drop alerts on this phone.</p>
                    <button onClick={turnOn} disabled={busy} className="rounded-full bg-gradient-to-r from-[var(--color-peach)] to-[var(--color-blue)] text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50">
                      Turn on push alerts
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {prefs && (
              <>
                <SectionTitle>What to tell me about</SectionTitle>
                <Card>
                  {TYPE_ROWS.map((row, i) => (
                    <div key={row.type} className={`px-4 py-4 ${i < TYPE_ROWS.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <p className="text-base font-medium text-gray-900">{row.title}</p>
                      <p className="text-sm text-gray-600 mb-3">{row.description}</p>
                      <div className="grid grid-cols-3 rounded-full bg-gray-100 p-1" role="radiogroup" aria-label={row.title}>
                        {MODES.map(m => {
                          const on = prefs.types[row.type] === m.mode;
                          return (
                            <button
                              key={m.mode}
                              role="radio"
                              aria-checked={on}
                              onClick={() => save({ types: { ...prefs.types, [row.type]: m.mode } })}
                              className={`rounded-full py-1.5 text-sm font-medium transition-colors ${on ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Card>
                <p className="text-xs text-gray-500 mt-2 px-1">Digest sends one alert a day with everything saved up.</p>

                <SectionTitle>When and how often</SectionTitle>
                <Card>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-base text-gray-900">Quiet hours</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs.quiet_enabled}
                      aria-label="Quiet hours"
                      onClick={() => save({ quiet_enabled: !prefs.quiet_enabled })}
                      className={`relative h-7 w-12 rounded-full transition-colors ${prefs.quiet_enabled ? 'bg-gray-900' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${prefs.quiet_enabled ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {prefs.quiet_enabled && (<>
                  <label className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-base text-gray-900">Quiet from</span>
                    <input type="time" value={prefs.quiet_start} onChange={e => e.target.value && save({ quiet_start: e.target.value })} className="text-base text-gray-900 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-base text-gray-900">Quiet until</span>
                    <input type="time" value={prefs.quiet_end} onChange={e => e.target.value && save({ quiet_end: e.target.value })} className="text-base text-gray-900 bg-transparent" />
                  </label>
                  </>)}
                  <label className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-base text-gray-900">Daily digest at</span>
                    <input type="time" value={prefs.digest_time} onChange={e => e.target.value && save({ digest_time: e.target.value })} className="text-base text-gray-900 bg-transparent" />
                  </label>
                  <label className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-base text-gray-900">Most pushes a day</span>
                    <select value={prefs.daily_cap} onChange={e => save({ daily_cap: Number(e.target.value) })} className="text-base text-gray-900 bg-transparent">
                      {[...new Set([...CAPS, prefs.daily_cap])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center justify-between px-4 py-3">
                    <span className="text-base text-gray-900">Price drops of at least</span>
                    <span className="flex items-center gap-1">
                      <input
                        key={prefs.price_drop_pct}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={90}
                        defaultValue={prefs.price_drop_pct}
                        aria-label="Price drop percent"
                        onBlur={e => {
                          const n = Math.round(Number(e.target.value));
                          if (!Number.isFinite(n) || n < 1 || n > 90) { e.target.value = String(prefs.price_drop_pct); return; }
                          if (n !== prefs.price_drop_pct) save({ price_drop_pct: n });
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-14 text-right text-base text-gray-900 bg-transparent"
                      />
                      <span className="text-base text-gray-900">%</span>
                    </span>
                  </label>
                </Card>
                <p className="text-xs text-gray-500 mt-2 px-1">{prefs.quiet_enabled ? 'Alerts during quiet hours wait until they end. ' : ''}Pushes past the daily limit go to the digest. Price drops can be any amount from 1% to 90%. Times are {prefs.timezone === 'America/Los_Angeles' ? 'Pacific' : prefs.timezone}.</p>

                {prefs.muted.length > 0 && (
                  <>
                    <SectionTitle>Muted</SectionTitle>
                    <Card>
                      {prefs.muted.map((m, i) => (
                        <div key={`${m.store_key}-${m.item_id || ''}-${m.type || ''}`} className={`flex items-center justify-between px-4 py-3 ${i < prefs.muted.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <span className="text-sm text-gray-900">
                            {m.label || storeLabel(m.store_key)}{m.type === 'new_item' ? ': new drops' : ''}{m.item_id ? ': one item' : ''}
                          </span>
                          <button onClick={() => save({ muted: prefs.muted.filter((_, j) => j !== i) })} className="text-sm font-medium text-[var(--color-coral)]">Unmute</button>
                        </div>
                      ))}
                    </Card>
                  </>
                )}
              </>
            )}

            <SectionTitle>History</SectionTitle>
            <Card>
              <Link href="/profile/notifications/history" className="flex items-center justify-between px-4 py-4">
                <div>
                  <p className="text-base font-medium text-gray-900">Alert history</p>
                  <p className="text-sm text-gray-600">Every alert, including ones saved for the digest</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </Card>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
