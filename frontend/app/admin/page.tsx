'use client';

// Owner dashboard at www.muse.shopping/admin.
//
// Live view of members, how they use Muse, shopping and agent activity, and
// site health. Only the owner's account can load the data: the API checks the
// sign-in and the owner list on every request (src/routes/adminDashboardRoutes.js).
// This page holds no data of its own; signed out, it shows a sign-in link.

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { APIError } from '@/lib/api/client';
import { getOwnerDashboard, type Member, type OwnerDashboard } from '@/lib/api/adminDashboard';

const REFRESH_MS = 60_000;
const TZ = 'America/Los_Angeles';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

// ---------- formatting ----------

const nf = new Intl.NumberFormat('en-US');
const num = (n: number | null | undefined) => (n === null || n === undefined ? '–' : nf.format(n));
const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');

function when(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' PT';
}

function ago(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '–';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const label = (s: string) => s.replace(/[_.]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// ---------- small building blocks ----------

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-[16px] p-4 sm:p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
        {note && <span className="text-xs text-gray-500">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label: l, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-ecru)] px-3 py-3">
      <div className="text-xs text-gray-500">{l}</div>
      <div className="text-2xl font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      aria-label={ok ? 'OK' : 'Problem'}
      className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${ok ? 'bg-emerald-500' : 'bg-[var(--color-coral)]'}`}
    />
  );
}

function Rows({ items }: { items: { k: ReactNode; v: ReactNode; key: string }[] }) {
  return (
    <ul className="divide-y divide-[var(--color-divider)]">
      {items.map((it) => (
        <li key={it.key} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="text-gray-700 min-w-0 truncate">{it.k}</span>
          <span className="text-gray-900 tabular-nums shrink-0 text-right">{it.v}</span>
        </li>
      ))}
    </ul>
  );
}

/** 30 days of sign-ups as bars, Pacific dates, zero-filled. */
function SignupBars({ days }: { days: { day: string; count: number }[] }) {
  const series = useMemo(() => {
    const byDay = new Map(days.map((d) => [d.day, d.count]));
    const out: { day: string; count: number }[] = [];
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ day: key, count: byDay.get(key) || 0 });
    }
    return out;
  }, [days]);
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div>
      <div className="flex items-end gap-[3px] h-24" role="img" aria-label="New members per day, last 30 days">
        {series.map((s) => (
          <div
            key={s.day}
            title={`${s.day}: ${s.count}`}
            className="flex-1 rounded-t-[3px] bg-[var(--color-blue)]"
            style={{ height: s.count ? `${Math.max(6, (s.count / max) * 100)}%` : '2px', opacity: s.count ? 1 : 0.35 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-gray-500 mt-1">
        <span>30 days ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

// ---------- page speed, measured from this browser ----------

type Probe = { name: string; path: string; ms: number | null; status: number | null };
const PROBES: Omit<Probe, 'ms' | 'status'>[] = [
  { name: 'Landing page', path: '/' },
  { name: 'Shop home', path: '/home' },
  { name: 'API', path: '/api/v1/health' },
];

async function runProbes(): Promise<Probe[]> {
  const out: Probe[] = [];
  for (const p of PROBES) {
    const t = performance.now();
    try {
      const r = await fetch(p.path, { cache: 'no-store' });
      await r.text();
      out.push({ ...p, ms: Math.round(performance.now() - t), status: r.status });
    } catch {
      out.push({ ...p, ms: null, status: null });
    }
  }
  return out;
}

// ---------- members list ----------

function MemberList({ members, limit, total }: { members: Member[]; limit: number; total: number }) {
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return members;
    return members.filter((m) => m.email.toLowerCase().includes(s) || (m.name || '').toLowerCase().includes(s));
  }, [members, q]);
  const shown = showAll || q ? filtered : filtered.slice(0, 25);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email"
        className="w-full mb-3 rounded-[10px] border border-[var(--color-divider)] px-3 py-2 text-[16px] focus:outline-none focus:border-[var(--color-blue)]"
      />
      {shown.length === 0 ? (
        <Empty>No members match.</Empty>
      ) : (
        <ul className="divide-y divide-[var(--color-divider)]">
          {shown.map((m) => (
            <li key={m.id} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-gray-900 truncate min-w-0">
                  {m.name || m.email}
                  {m.isAdmin && <span className="ml-2 text-[11px] font-medium text-[var(--color-coral)]">admin</span>}
                  {!m.isActive && <span className="ml-2 text-[11px] text-gray-500">inactive</span>}
                </span>
                <span className="text-xs text-gray-500 shrink-0">seen {ago(m.lastSeenAt)}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">
                {m.name ? `${m.email} · ` : ''}
                {m.signIn} · joined {when(m.joinedAt)}
              </div>
              {(m.watches > 0 || m.pushDevices > 0 || m.cartItems > 0) && (
                <div className="text-xs text-gray-600 mt-0.5">
                  {[
                    m.watches ? `${m.watches} watching` : null,
                    m.cartItems ? `${m.cartItems} in cart` : null,
                    m.pushDevices ? `alerts on ${m.pushDevices} device${m.pushDevices > 1 ? 's' : ''}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!q && !showAll && filtered.length > 25 && (
        <button onClick={() => setShowAll(true)} className="mt-2 text-sm text-[var(--color-coral)] font-medium">
          Show all {num(filtered.length)}
        </button>
      )}
      {total > limit && (
        <p className="mt-2 text-xs text-gray-500">Showing the newest {num(limit)} of {num(total)} members.</p>
      )}
    </div>
  );
}

// ---------- page ----------

export default function OwnerDashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [data, setData] = useState<OwnerDashboard | null>(null);
  const [probes, setProbes] = useState<Probe[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
      setState({ kind: 'signed_out' });
      return;
    }
    busy.current = true;
    setRefreshing(true);
    try {
      const d = await getOwnerDashboard();
      setData(d);
      setState({ kind: 'ready' });
      runProbes().then(setProbes).catch(() => setProbes(null));
    } catch (err) {
      if (err instanceof APIError && err.status === 401) setState({ kind: 'signed_out' });
      else if (err instanceof APIError && err.status === 403) setState({ kind: 'forbidden' });
      else setState({ kind: 'error', message: err instanceof Error ? err.message : 'Could not load the dashboard' });
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  if (state.kind !== 'ready' || !data) {
    return (
      <div className="min-h-screen bg-[var(--color-ecru)] flex items-center justify-center px-4">
        <div className="bg-white rounded-[16px] p-6 shadow-sm max-w-sm w-full text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Muse Admin</h1>
          {state.kind === 'loading' && <p className="text-sm text-gray-500">Loading…</p>}
          {state.kind === 'signed_out' && (
            <>
              <p className="text-sm text-gray-600 mb-4">Sign in with the owner account, then come back to this page.</p>
              <Link
                href="/auth/login"
                className="inline-block rounded-full bg-gray-900 text-white text-sm font-medium px-5 py-2.5"
              >
                Sign in
              </Link>
            </>
          )}
          {state.kind === 'forbidden' && (
            <p className="text-sm text-gray-600">This page is only for the site owner.</p>
          )}
          {state.kind === 'error' && (
            <>
              <p className="text-sm text-gray-600 mb-4">{state.message}</p>
              <button onClick={load} className="rounded-full bg-gray-900 text-white text-sm font-medium px-5 py-2.5">
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { members, waitlist, activity, engagement, shopping, health } = data;
  const decisions = shopping.agentDecisions7d || {};
  const decisionTotal = Object.values(decisions).reduce((a, b) => a + b, 0);
  const runsBad = (health.listingRuns24h || []).filter((r) => r.lastStatus !== 'ok' && r.lastStatus !== 'baseline');

  return (
    <div className="min-h-screen bg-[var(--color-ecru)]">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900">Muse Admin</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Updated {when(data.generatedAt)} · refreshes every minute
            </p>
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="shrink-0 rounded-full border border-[var(--color-divider)] bg-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <Stat label="Members" value={num(members.total)} sub={`+${num(members.new7d)} this week`} />
          <Stat label="Active today" value={num(members.active1d)} sub={`${num(members.active7d)} this week`} />
          <Stat label="Waitlist" value={num(waitlist?.total)} sub={waitlist ? `+${num(waitlist.new7d)} this week` : 'not set up'} />
          <Stat
            label="Site health"
            value={runsBad.length === 0 ? 'Good' : `${runsBad.length} issue${runsBad.length > 1 ? 's' : ''}`}
            sub={`database ${health.dbMs} ms`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="New members" note="last 30 days, Pacific">
            <SignupBars days={members.signupsByDay} />
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Stat label="This month" value={num(members.new30d)} />
              <Stat label="Active 30d" value={num(members.active30d)} sub={pct(members.active30d, members.total)} />
              <Stat
                label="Sign-in"
                value={<span className="text-base">{pct(members.signInMethods.google, members.total)} Google</span>}
                sub={`${num(members.signInMethods.email)} email · ${num(members.signInMethods.apple)} Apple`}
              />
            </div>
          </Card>

          <Card title="How members use Muse" note="last 7 days">
            {activity ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Stat label="Shoppers browsing" value={num(activity.shoppers7d)} />
                  <Stat label="Page views" value={num(activity.pageViews7d + activity.productViews7d)} />
                  <Stat label="Searches" value={num(activity.searches7d)} />
                  <Stat label="Added to cart" value={num(activity.addToCart7d)} />
                </div>
                {activity.topPages.length > 0 && (
                  <Rows items={activity.topPages.map((p) => ({ key: p.page, k: label(p.page), v: num(p.views) }))} />
                )}
              </>
            ) : (
              <Empty>No browsing activity recorded yet.</Empty>
            )}
          </Card>

          <Card title="Watches and alerts">
            <Rows
              items={[
                {
                  key: 'w',
                  k: 'Items being watched',
                  v: engagement.watches
                    ? `${num(engagement.watches.active)} (${num(engagement.watches.size)} size, ${num(engagement.watches.price)} price)`
                    : 'none yet',
                },
                { key: 'ws', k: 'Members watching', v: num(engagement.watches?.shoppers) },
                {
                  key: 'p',
                  k: 'Phones with alerts on',
                  v: engagement.push
                    ? `${num(engagement.push.devices)}${engagement.push.failing ? ` (${num(engagement.push.failing)} failing)` : ''}`
                    : 'none yet',
                },
                {
                  key: 'a',
                  k: 'Alerts sent this week',
                  v: engagement.alerts7d
                    ? `${num(engagement.alerts7d.sent)} · ${pct(engagement.alerts7d.opened, engagement.alerts7d.sent)} opened`
                    : 'none yet',
                },
                ...(engagement.alerts7d?.failed
                  ? [{ key: 'af', k: 'Alerts not delivered', v: num(engagement.alerts7d.failed) }]
                  : []),
              ]}
            />
          </Card>

          <Card title="Shopping and the Muse agent">
            <Rows
              items={[
                {
                  key: 'c',
                  k: 'In carts right now',
                  v: shopping.cart
                    ? `${num(shopping.cart.items)} items · ${money(shopping.cart.valueCents)}`
                    : 'none yet',
                },
                ...(shopping.checkouts30d && shopping.checkouts30d.length > 0
                  ? shopping.checkouts30d.map((c) => ({
                      key: `ci-${c.status}`,
                      k: `Checkouts ${label(c.status).toLowerCase()} (30d)`,
                      v: `${num(c.count)} · ${money(c.cents)}`,
                    }))
                  : [{ key: 'ci', k: 'Checkouts (30d)', v: 'none yet' }]),
                {
                  key: 'ad',
                  k: 'Agent decisions this week',
                  v: decisionTotal
                    ? `${num(decisionTotal)} · ${num((decisions.blocked || 0) + (decisions.declined || 0))} stopped`
                    : 'none yet',
                },
              ]}
            />
            {shopping.agentProblems7d && shopping.agentProblems7d.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Stopped or failed this week</p>
                <Rows
                  items={shopping.agentProblems7d.map((p, i) => ({
                    key: `pr-${i}`,
                    k: <span title={p.reason}>{label(p.action)}: {p.reason || 'no reason given'}</span>,
                    v: `${num(p.count)}×`,
                  }))}
                />
              </div>
            )}
          </Card>

          <Card title="Store updates" note="last 24 hours">
            {health.listingRuns24h && health.listingRuns24h.length > 0 ? (
              <Rows
                items={health.listingRuns24h.map((r) => ({
                  key: `lr-${r.store}`,
                  k: (
                    <>
                      <Dot ok={r.lastStatus === 'ok' || r.lastStatus === 'baseline'} />
                      {r.store}
                    </>
                  ),
                  v: `${ago(r.lastRunAt)}${r.notOk ? ` · ${num(r.notOk)} failed` : ''}`,
                }))}
              />
            ) : (
              <Empty>No store refresh runs in the last 24 hours.</Empty>
            )}
            {health.newArrivals && health.newArrivals.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-1">New arrivals feeds</p>
                <Rows
                  items={health.newArrivals.map((n) => ({
                    key: `na-${n.store}`,
                    k: n.store,
                    v: `${num(n.new24h)} new · checked ${ago(n.lastSeenAt)}`,
                  }))}
                />
              </div>
            )}
          </Card>

          <Card title="Site performance">
            <Rows
              items={[
                ...(probes || PROBES.map((p) => ({ ...p, ms: null, status: null }))).map((p) => ({
                  key: `pb-${p.path}`,
                  k: (
                    <>
                      <Dot ok={p.status !== null && p.status < 400} />
                      {p.name}
                    </>
                  ),
                  v: probes ? (p.ms === null ? 'unreachable' : `${num(p.ms)} ms`) : 'checking…',
                })),
                { key: 'db', k: 'Database response', v: `${num(health.dbMs)} ms` },
                { key: 'bm', k: 'This dashboard took', v: `${num(health.buildMs)} ms` },
                {
                  key: 'dep',
                  k: 'Live version',
                  v: health.deploy.commit ? (
                    <span title={health.deploy.message || ''}>{health.deploy.commit}</span>
                  ) : (
                    '–'
                  ),
                },
              ]}
            />
            <p className="text-xs text-gray-500 mt-2">Page times are measured from this phone or computer.</p>
          </Card>

          <Card title="Support and security" note="last 7 days">
            <Rows
              items={[
                {
                  key: 'fb',
                  k: 'Open feedback tickets',
                  v: health.feedback ? (
                    <Link href="/admin/feedback" className="text-[var(--color-coral)] font-medium">
                      {num(health.feedback.open)}
                      {health.feedback.new ? ` (${num(health.feedback.new)} new)` : ''}
                    </Link>
                  ) : (
                    'none yet'
                  ),
                },
                ...(health.securityEvents7d && health.securityEvents7d.length > 0
                  ? health.securityEvents7d.map((s) => ({
                      key: `se-${s.type}`,
                      k: label(s.type),
                      v: `${num(s.count)} · last ${ago(s.lastAt)}`,
                    }))
                  : [{ key: 'se', k: 'Security events', v: 'none' }]),
              ]}
            />
          </Card>

          <div className="lg:col-span-2">
            <Card title="All members" note={`${num(members.total)} total`}>
              <MemberList members={members.list} limit={members.listLimit} total={members.total} />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
