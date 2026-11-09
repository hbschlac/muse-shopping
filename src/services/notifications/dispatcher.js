/**
 * Alert dispatcher (R9). Reads listing_changes that haven't been dispatched,
 * finds who cares (size/price watches, followed stores), applies each
 * shopper's settings, sends web push or saves for the digest, and logs every
 * alert in alert_log, sent or not.
 *
 * Runs from POST /api/v1/notifications/dispatch (GitHub Actions every 15 min)
 * and right after listing refresh ingest. Never throws to its caller.
 */

const pool = require('../../db/pool');
const logger = require('../../utils/logger');
const { ensureSchema } = require('./schema');
const policy = require('./policy');
const { compose, composeBundle, composeDigest, signAlertIds } = require('./compose');
const push = require('./push');

const BATCH = 500;

function loadFollowers() {
  try {
    // Owned by the listing refresh work: Map<storeKey, [{userId, notificationEnabled}]>
    // eslint-disable-next-line global-require
    const mod = require('../listingWatch/followedStores');
    return mod.followersByStoreKey();
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') logger.warn(`Notifications: followers lookup failed: ${err.message}`);
    return new Map();
  }
}

function watchesModule() {
  try {
    // Owned by the watches work: findWatchesForChange(change) -> [{ id, kind, userId, ... }]
    // eslint-disable-next-line global-require
    return require('../watches');
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') logger.warn(`Notifications: watches unavailable: ${err.message}`);
    return null;
  }
}

/** Active watches that match this change (size watches for back in stock, price watches for drops). */
async function matchingWatches(change) {
  const mod = watchesModule();
  if (!mod) return [];
  try {
    return await mod.findWatchesForChange(change);
  } catch (err) {
    logger.warn(`Notifications: watch lookup failed: ${err.message}`);
    return [];
  }
}

/** [{ userId, watchId? }] who should hear about this change. */
async function recipients(change, type, followersPromise) {
  if (type === 'new_item') {
    const followers = (await followersPromise).get(change.store_key) || [];
    return followers.filter(f => f.notificationEnabled !== false).map(f => ({ userId: f.userId }));
  }
  const watches = await matchingWatches(change);
  return watches.map(w => ({ userId: w.userId, watchId: w.kind === 'size' ? w.id : null }));
}

/** A size watch is one-shot: turn it off once its alert is logged. */
async function deactivate(watchIds) {
  const mod = watchesModule();
  if (!mod || !watchIds.length) return;
  for (const id of watchIds) {
    try {
      await mod.deactivateWatch(id);
    } catch (err) {
      logger.warn(`Notifications: could not turn off watch ${id}: ${err.message}`);
    }
  }
}

async function loadPrefs(userId) {
  const { rows } = await pool.query('SELECT * FROM notification_prefs WHERE user_id = $1', [userId]);
  return policy.normalizePrefs(rows[0]);
}

async function sentTodayCount(userId, prefs, now) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM alert_log WHERE user_id = $1 AND status = 'sent' AND sent_at >= $2`,
    [userId, policy.startOfLocalDay(now, prefs.timezone)],
  );
  return rows[0] ? rows[0].n : 0;
}

/** Atomically claim undispatched changes so two runs never double-send. */
async function claimChanges() {
  let rows;
  try {
    ({ rows } = await pool.query(
    `UPDATE listing_changes SET dispatched_at = now()
     WHERE id IN (
       SELECT id FROM listing_changes WHERE dispatched_at IS NULL
       ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    ));
  } catch (err) {
    // listing_changes is created by the listing refresh work; until then, nothing to send.
    if (/does not exist/.test(err.message)) return [];
    throw err;
  }
  return rows.sort((a, b) => a.id - b.id);
}

async function logAlert(userId, change, type, msg, decision) {
  const { rows } = await pool.query(
    `INSERT INTO alert_log (user_id, change_id, alert_type, store_key, item_id, title, body, url, image_url, status, reason, send_after)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (user_id, change_id) WHERE change_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [userId, change.id, type, change.store_key, change.item_id, msg.title, msg.body, msg.url, msg.image_url,
      decision.status === 'push' ? 'pending' : decision.status, decision.reason, decision.send_after || null],
  );
  return rows[0] || null;
}

async function markSent(ids, delivered) {
  if (!ids.length) return;
  const status = delivered ? 'sent' : (push.isConfigured() ? 'no_device' : 'not_configured');
  await pool.query(
    `UPDATE alert_log SET status = $2, sent_at = CASE WHEN $2 = 'sent' THEN now() ELSE sent_at END
     WHERE id = ANY($1::int[])`,
    [ids, status],
  );
}

/** Send a group of alert_log rows as one push. */
async function sendPush(userId, alerts, msg) {
  const ids = alerts.map(a => a.id);
  const payload = {
    title: msg.title,
    body: msg.body,
    url: msg.url,
    image: msg.image_url || undefined,
    tag: ids.length === 1 ? `alert-${ids[0]}` : `bundle-${ids[0]}`,
    ids,
    t: signAlertIds(ids),
  };
  const res = await push.sendToUser(userId, payload);
  await markSent(ids, res.delivered > 0);
  return res.delivered > 0 ? 1 : 0;
}

/**
 * Send the alerts that are due for one user, bundling several new drops from
 * the same store into one push. Each push counts once toward the cap; ones
 * past the cap go to the digest.
 */
async function flushUser(userId, due, prefs, sentToday) {
  const groups = [];
  const newByStore = new Map();
  for (const a of due) {
    if (a.alert_type === 'new_item') {
      if (!newByStore.has(a.store_key)) newByStore.set(a.store_key, []);
      newByStore.get(a.store_key).push(a);
    } else {
      groups.push([a]);
    }
  }
  for (const list of newByStore.values()) groups.push(list);

  let sent = 0;
  for (const g of groups) {
    if (sentToday + sent >= prefs.daily_cap) {
      await pool.query(
        `UPDATE alert_log SET status = 'digest', reason = 'over_cap' WHERE id = ANY($1::int[])`,
        [g.map(a => a.id)],
      );
      continue;
    }
    const msg = g.length === 1 ? g[0] : composeBundle(g[0].store_key, g.length);
    sent += await sendPush(userId, g, msg);
  }
  return sent;
}

async function dispatchPending({ now = new Date() } = {}) {
  const summary = { changes: 0, alerts: 0, pushed: 0, held: 0, digest: 0, off: 0 };
  try {
    await ensureSchema();
    const changes = await claimChanges();
    summary.changes = changes.length;
    if (!changes.length) return summary;

    let followersPromise = null;
    const prefsCache = new Map();
    const dueByUser = new Map();

    for (const change of changes) {
      const type = policy.alertTypeFor(change);
      if (!type) continue;
      if (type === 'new_item' && !followersPromise) followersPromise = Promise.resolve(loadFollowers()).catch(() => new Map());
      const byUser = new Map();
      for (const r of await recipients(change, type, followersPromise)) {
        if (!byUser.has(r.userId)) byUser.set(r.userId, []);
        if (r.watchId) byUser.get(r.userId).push(r.watchId);
      }
      for (const [userId, watchIds] of byUser) {
        if (!prefsCache.has(userId)) {
          const prefs = await loadPrefs(userId);
          prefsCache.set(userId, { prefs, sentToday: await sentTodayCount(userId, prefs, now) });
        }
        const { prefs, sentToday } = prefsCache.get(userId);
        // Cap is enforced again in flushUser once bundles are known.
        const decision = policy.decide(type, change, prefs, { sentToday }, now);
        const row = await logAlert(userId, change, type, compose(type, change), decision);
        await deactivate(watchIds);
        if (!row) continue; // already alerted for this change
        summary.alerts += 1;
        if (decision.status === 'push') {
          if (!dueByUser.has(userId)) dueByUser.set(userId, []);
          dueByUser.get(userId).push(row);
        } else {
          summary[decision.status] += 1;
        }
      }
    }

    for (const [userId, due] of dueByUser) {
      const { prefs, sentToday } = prefsCache.get(userId);
      summary.pushed += await flushUser(userId, due, prefs, sentToday);
    }
  } catch (err) {
    logger.error(`Notifications: dispatch failed: ${err.message}`);
    summary.error = err.message;
  }
  return summary;
}

/** Quiet hours ended: send held alerts (still subject to the cap). */
async function sendHeld({ now = new Date() } = {}) {
  let pushed = 0;
  try {
    await ensureSchema();
    const { rows } = await pool.query(
      `SELECT * FROM alert_log WHERE status = 'held' AND send_after <= $1 ORDER BY id LIMIT 1000`, [now],
    );
    const byUser = new Map();
    for (const r of rows) {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
      byUser.get(r.user_id).push(r);
    }
    for (const [userId, due] of byUser) {
      const prefs = await loadPrefs(userId);
      if (policy.inQuietHours(now, prefs)) continue; // quiet hours were changed; wait
      pushed += await flushUser(userId, due, prefs, await sentTodayCount(userId, prefs, now));
    }
  } catch (err) {
    logger.error(`Notifications: held send failed: ${err.message}`);
  }
  return pushed;
}

/** Once a day at each shopper's digest time: one push summing up the digest alerts. */
async function runDigests({ now = new Date() } = {}) {
  let digests = 0;
  try {
    await ensureSchema();
    const { rows: users } = await pool.query(
      `SELECT DISTINCT user_id FROM alert_log WHERE status = 'digest' AND digested_at IS NULL`,
    );
    for (const { user_id: userId } of users) {
      const prefs = await loadPrefs(userId);
      if (!policy.digestDue(now, prefs)) continue;
      const { rows: alerts } = await pool.query(
        `SELECT * FROM alert_log WHERE user_id = $1 AND status = 'digest' AND digested_at IS NULL
         ORDER BY created_at DESC LIMIT 200`, [userId],
      );
      if (!alerts.length) continue;
      const ids = alerts.map(a => a.id);
      const msg = composeDigest(alerts);
      await push.sendToUser(userId, { ...msg, tag: `digest-${ids[0]}`, ids, t: signAlertIds(ids) });
      await pool.query('UPDATE alert_log SET digested_at = now() WHERE id = ANY($1::int[])', [ids]);
      await pool.query(
        `INSERT INTO notification_prefs (user_id, last_digest_at) VALUES ($1, now())
         ON CONFLICT (user_id) DO UPDATE SET last_digest_at = now()`, [userId],
      );
      digests += 1;
    }
  } catch (err) {
    logger.error(`Notifications: digest failed: ${err.message}`);
  }
  return digests;
}

/** Everything the 15-minute schedule does. */
async function runAll({ now = new Date() } = {}) {
  const dispatched = await dispatchPending({ now });
  const held = await sendHeld({ now });
  const digests = await runDigests({ now });
  return { ...dispatched, held_sent: held, digests };
}

module.exports = { dispatchPending, sendHeld, runDigests, runAll, loadPrefs };
