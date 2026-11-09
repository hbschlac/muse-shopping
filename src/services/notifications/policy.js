/**
 * Notification rules, as pure functions (no database) so every setting is
 * covered by tests. The dispatcher feeds these the shopper's prefs and how
 * many pushes they already got today.
 */

// Alert types a shopper controls. Starting defaults from the front-end flow
// doc (2026-11-09): size back in stock pushes; price drops on saved items go
// to the digest; the rest are off until the shopper turns them on.
const TYPES = ['back_in_stock', 'price_drop', 'new_item', 'sale', 'cashback'];
const MODES = ['push', 'digest', 'off'];

const DEFAULT_PREFS = Object.freeze({
  types: Object.freeze({
    back_in_stock: 'push',
    price_drop: 'digest',
    new_item: 'off',
    sale: 'off',
    cashback: 'off',
  }),
  muted: Object.freeze([]),
  quiet_start: '22:00',
  quiet_end: '08:00',
  digest_time: '19:00',
  timezone: 'America/Los_Angeles',
  daily_cap: 5,
  price_drop_pct: 15,
});

// listing_changes.change_type -> alert type
function alertTypeFor(change) {
  if (change.change_type === 'back_in_stock') return 'back_in_stock';
  if (change.change_type === 'new_item') return 'new_item';
  if (change.change_type === 'price_change') {
    const pct = priceDropPct(change.old_price_cents, change.new_price_cents);
    return pct > 0 ? 'price_drop' : null; // price rises never alert
  }
  return null;
}

function priceDropPct(oldCents, newCents) {
  const o = Number(oldCents);
  const n = Number(newCents);
  if (!Number.isFinite(o) || !Number.isFinite(n) || o <= 0 || n < 0) return 0;
  return Math.max(0, ((o - n) / o) * 100);
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMinutes = s => {
  const m = HHMM.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Merge a stored row (or nothing) over the defaults. */
function normalizePrefs(row) {
  const r = row || {};
  const types = { ...DEFAULT_PREFS.types };
  for (const [k, v] of Object.entries(r.types || {})) {
    if (TYPES.includes(k) && MODES.includes(v)) types[k] = v;
  }
  return {
    types,
    muted: Array.isArray(r.muted) ? r.muted.filter(m => m && m.store_key) : [],
    quiet_start: toMinutes(r.quiet_start) != null ? r.quiet_start : DEFAULT_PREFS.quiet_start,
    quiet_end: toMinutes(r.quiet_end) != null ? r.quiet_end : DEFAULT_PREFS.quiet_end,
    digest_time: toMinutes(r.digest_time) != null ? r.digest_time : DEFAULT_PREFS.digest_time,
    timezone: r.timezone && isValidTimezone(r.timezone) ? r.timezone : DEFAULT_PREFS.timezone,
    daily_cap: Number.isInteger(r.daily_cap) ? r.daily_cap : DEFAULT_PREFS.daily_cap,
    price_drop_pct: Number.isInteger(r.price_drop_pct) ? r.price_drop_pct : DEFAULT_PREFS.price_drop_pct,
    last_digest_at: r.last_digest_at || null,
  };
}

/**
 * Check a settings change from the app. Returns { patch } with only the
 * fields given, or { error } naming the first bad one.
 */
function validatePrefsPatch(body) {
  const b = body || {};
  const patch = {};
  if (b.types !== undefined) {
    if (typeof b.types !== 'object' || Array.isArray(b.types) || b.types === null) return { error: 'types must be an object' };
    for (const [k, v] of Object.entries(b.types)) {
      if (!TYPES.includes(k)) return { error: `unknown alert type: ${k}` };
      if (!MODES.includes(v)) return { error: `${k} must be push, digest or off` };
    }
    patch.types = b.types;
  }
  if (b.muted !== undefined) {
    if (!Array.isArray(b.muted) || b.muted.length > 200) return { error: 'muted must be a list' };
    const clean = [];
    for (const m of b.muted) {
      if (!m || typeof m.store_key !== 'string' || !m.store_key) return { error: 'each muted entry needs a store_key' };
      const e = { store_key: m.store_key.slice(0, 200) };
      if (typeof m.item_id === 'string' && m.item_id) e.item_id = m.item_id.slice(0, 500);
      if (typeof m.type === 'string') {
        if (!TYPES.includes(m.type)) return { error: `unknown alert type: ${m.type}` };
        e.type = m.type;
      }
      if (typeof m.label === 'string') e.label = m.label.slice(0, 200);
      clean.push(e);
    }
    patch.muted = clean;
  }
  for (const f of ['quiet_start', 'quiet_end', 'digest_time']) {
    if (b[f] !== undefined) {
      if (toMinutes(b[f]) == null) return { error: `${f} must be HH:MM` };
      patch[f] = b[f];
    }
  }
  if (b.timezone !== undefined) {
    if (typeof b.timezone !== 'string' || !isValidTimezone(b.timezone)) return { error: 'unknown timezone' };
    patch.timezone = b.timezone;
  }
  if (b.daily_cap !== undefined) {
    if (!Number.isInteger(b.daily_cap) || b.daily_cap < 0 || b.daily_cap > 50) return { error: 'daily_cap must be 0 to 50' };
    patch.daily_cap = b.daily_cap;
  }
  if (b.price_drop_pct !== undefined) {
    if (!Number.isInteger(b.price_drop_pct) || b.price_drop_pct < 1 || b.price_drop_pct > 90) {
      return { error: 'price_drop_pct must be 1 to 90' };
    }
    patch.price_drop_pct = b.price_drop_pct;
  }
  return { patch };
}

/** Minutes since local midnight in tz. */
function localMinutes(now, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const h = Number(parts.find(p => p.type === 'hour').value);
  const m = Number(parts.find(p => p.type === 'minute').value);
  return h * 60 + m;
}

/** The instant local midnight began today in tz (to the minute). */
function startOfLocalDay(now, tz) {
  const t = new Date(now.getTime() - localMinutes(now, tz) * 60000);
  t.setUTCSeconds(0, 0);
  return t;
}

function inQuietHours(now, prefs) {
  const start = toMinutes(prefs.quiet_start);
  const end = toMinutes(prefs.quiet_end);
  if (start == null || end == null || start === end) return false;
  const m = localMinutes(now, prefs.timezone);
  return start < end ? m >= start && m < end : m >= start || m < end;
}

/** When the current quiet hours end. */
function quietEndsAt(now, prefs) {
  const m = localMinutes(now, prefs.timezone);
  const end = toMinutes(prefs.quiet_end);
  const wait = (end - m + 1440) % 1440 || 1440;
  const t = new Date(now.getTime() + wait * 60000);
  t.setUTCSeconds(0, 0);
  return t;
}

/** Is today's digest due (past digest time, not sent yet today)? */
function digestDue(now, prefs) {
  if (localMinutes(now, prefs.timezone) < toMinutes(prefs.digest_time)) return false;
  if (!prefs.last_digest_at) return true;
  return new Date(prefs.last_digest_at) < startOfLocalDay(now, prefs.timezone);
}

function isMuted(prefs, type, change) {
  return prefs.muted.some(m => m.store_key === change.store_key
    && (!m.item_id || m.item_id === change.item_id)
    && (!m.type || m.type === type));
}

/**
 * What to do with one alert for one shopper.
 * ctx.sentToday: pushes already sent today (local day).
 * Returns { status, reason, send_after? } where status is
 *   'off'    logged only (type off, muted, price drop under threshold)
 *   'digest' saved for the daily digest
 *   'held'   quiet hours; send when they end (send_after)
 *   'push'   send now
 */
function decide(type, change, prefs, ctx, now = new Date()) {
  const mode = prefs.types[type] || 'off';
  if (mode === 'off') return { status: 'off', reason: 'type_off' };
  if (isMuted(prefs, type, change)) return { status: 'off', reason: 'muted' };
  if (type === 'price_drop') {
    const pct = priceDropPct(change.old_price_cents, change.new_price_cents);
    if (pct + 1e-9 < prefs.price_drop_pct) return { status: 'off', reason: 'below_threshold' };
  }
  if (mode === 'digest') return { status: 'digest', reason: 'digest_pref' };
  if ((ctx.sentToday || 0) >= prefs.daily_cap) return { status: 'digest', reason: 'over_cap' };
  if (inQuietHours(now, prefs)) return { status: 'held', reason: 'quiet_hours', send_after: quietEndsAt(now, prefs) };
  return { status: 'push', reason: null };
}

/**
 * "Fewer like this": new-drop alerts mute that store's new drops; other
 * types step down one level (push -> digest -> off).
 * Returns { prefsPatch, message }.
 */
function fewerLikeThis(prefs, alert) {
  if (alert.alert_type === 'new_item' && alert.store_key) {
    const exists = prefs.muted.some(m => m.store_key === alert.store_key && m.type === 'new_item' && !m.item_id);
    const muted = exists ? prefs.muted : [...prefs.muted, { store_key: alert.store_key, type: 'new_item' }];
    return { prefsPatch: { muted }, message: 'No more new-drop alerts from this store.' };
  }
  const type = alert.alert_type;
  if (!TYPES.includes(type)) return { prefsPatch: {}, message: 'Noted.' };
  const cur = prefs.types[type];
  const next = cur === 'push' ? 'digest' : 'off';
  return {
    prefsPatch: { types: { ...prefs.types, [type]: next } },
    message: next === 'digest' ? 'These will come in your daily digest instead.' : 'These alerts are off now.',
  };
}

module.exports = {
  TYPES,
  MODES,
  DEFAULT_PREFS,
  alertTypeFor,
  priceDropPct,
  normalizePrefs,
  validatePrefsPatch,
  localMinutes,
  startOfLocalDay,
  inQuietHours,
  quietEndsAt,
  digestDue,
  isMuted,
  decide,
  fewerLikeThis,
};
