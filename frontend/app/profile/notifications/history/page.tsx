'use client';

/**
 * Alert history: every alert Muse made for you, whether it was pushed, saved
 * for the digest, held for quiet hours, or skipped by your settings, so
 * nothing is lost if a push is missed.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getAlerts, fewerLikeThis, type AlertRow } from '@/lib/api/notifications';
import { APIError } from '@/lib/api/client';
import { storeLabel } from '../storeLabel';

const STATUS_LABEL: Record<AlertRow['status'], string> = {
  sent: 'Pushed',
  pending: 'Sending',
  held: 'Waiting for quiet hours to end',
  digest: 'In your digest',
  off: 'Not sent',
  no_device: 'Not pushed: no phone set up',
  not_configured: 'Not pushed: push not set up yet',
  failed: 'Push failed',
};

const REASON_LABEL: Record<string, string> = {
  type_off: 'this alert type is off',
  muted: 'muted',
  below_threshold: 'drop below your threshold',
  over_cap: 'over your daily limit',
};

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function statusLine(a: AlertRow): string {
  let s = STATUS_LABEL[a.status] || a.status;
  if (a.status === 'digest' && a.digested_at) s = 'Sent in digest';
  if ((a.status === 'off' || a.status === 'digest') && a.reason && REASON_LABEL[a.reason]) s += ` (${REASON_LABEL[a.reason]})`;
  if (a.opened_at) s += ' · opened';
  return s;
}

export default function AlertHistoryPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (before?: number) => {
    try {
      const r = await getAlerts(before);
      setAlerts(prev => (before ? [...prev, ...r.alerts] : r.alerts));
      setNext(r.next);
    } catch (e) {
      if (e instanceof APIError && e.status === 401) setSignedOut(true);
      else setMessage('Couldn’t load your alerts.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- first page load
  useEffect(() => { load(); }, []);

  const fewer = async (a: AlertRow) => {
    try {
      const r = await fewerLikeThis(a.id);
      setMessage(r.message);
      setAlerts(prev => prev.map(x => (x.id === a.id ? { ...x, fewer_at: new Date().toISOString() } : x)));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Couldn’t save that.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-ecru)] pb-24">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 pt-3 pb-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/profile/notifications" className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Back">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Alert history</h1>
        </div>
      </header>

      <div className="px-4 pt-4 max-w-xl mx-auto">
        {message && <p className="mb-3 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-800">{message}</p>}
        {signedOut && (
          <p className="text-base text-gray-900">
            <Link href="/welcome" className="underline">Sign in</Link> to see your alerts.
          </p>
        )}
        {!signedOut && !loading && alerts.length === 0 && (
          <div className="bg-white rounded-[16px] shadow-sm p-4">
            <p className="text-base text-gray-900 mb-1">No alerts yet</p>
            <p className="text-sm text-gray-600">Tap Notify me on a sold-out size, save items, or follow stores, and alerts will show here.</p>
          </div>
        )}

        <ul className="space-y-3">
          {alerts.map(a => {
            const internal = a.url && a.url.startsWith('/');
            const inner = (
              <div className="flex gap-3">
                {a.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt="" className="w-16 h-20 object-cover rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{storeLabel(a.store_key)} · {when(a.created_at)}</p>
                  <p className="text-base font-medium text-gray-900 truncate">{a.title}</p>
                  {a.body && <p className="text-sm text-gray-700 line-clamp-2">{a.body}</p>}
                  <p className="text-xs text-gray-500 mt-1">{statusLine(a)}</p>
                </div>
              </div>
            );
            return (
              <li key={a.id} className="bg-white rounded-[16px] shadow-sm p-3">
                {a.url ? (
                  internal ? <Link href={a.url}>{inner}</Link> : <a href={a.url} target="_blank" rel="noopener noreferrer">{inner}</a>
                ) : inner}
                {a.alert_type !== 'test' && (
                  <div className="mt-2 flex justify-end">
                    {a.fewer_at ? (
                      <span className="text-xs text-gray-500">You asked for fewer like this</span>
                    ) : (
                      <button onClick={() => fewer(a)} className="text-xs font-medium text-gray-600 underline">Fewer like this</button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {next && (
          <button onClick={() => { setLoading(true); load(next); }} disabled={loading} className="mt-4 w-full rounded-full border border-gray-300 py-2 text-sm font-medium text-gray-800">
            Show older
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
