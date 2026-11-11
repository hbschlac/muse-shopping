/**
 * Owner dashboard: one read-only snapshot of Muse for the site owner.
 *
 * Members, how they use Muse, shopping and agent activity, and site health,
 * all read from Muse's own database. No third-party analytics (see
 * scripts/check-trackers.js) and no paid service: every number here is a
 * SELECT against tables Muse already writes.
 *
 * Every section runs on its own. A table that does not exist yet (features
 * that create their table on first use) gives `null` for that section
 * instead of failing the whole page. Nothing here writes, except the one
 * "dashboard viewed" line in security_events made by the route.
 *
 * Queries run one after another on purpose: the serverless pool has only two
 * connections (src/db/pool.js), and shoppers' requests share them.
 */

const pool = require('../../db/pool');
const logger = require('../../utils/logger');

const MEMBER_LIMIT = 500;

// Reads a column that may not exist on every database (older users tables
// lack first_name, apple_id, …) without failing the query.
const col = (alias, name) => `(to_jsonb(${alias}) ->> '${name}')`;

async function rows(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function one(sql, params = []) {
  return (await rows(sql, params))[0] || null;
}

// For aggregate queries, which always return one row; {} keeps a mocked or
// odd empty result from throwing.
async function totals(sql) {
  return (await one(sql)) || {};
}

/**
 * Runs one section. On error, logs it and returns null so the rest of the
 * dashboard still loads. Postgres "undefined table" (42P01) means the feature
 * has not been used yet, which is normal and logged quietly.
 */
async function section(name, fn) {
  try {
    return await fn();
  } catch (error) {
    if (error && error.code === '42P01') {
      logger.debug(`Owner dashboard: ${name} table not created yet`);
    } else {
      logger.warn(`Owner dashboard: ${name} failed`, { error: error && error.message });
    }
    return null;
  }
}

const int = (v) => (v === null || v === undefined ? 0 : Number(v));

async function members() {
  const t0 = await totals(`
    SELECT
      COUNT(*)                                                            AS total,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')     AS new_7d,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')    AS new_30d,
      COUNT(*) FILTER (WHERE last_login_at >= now() - interval '1 day')   AS active_1d,
      COUNT(*) FILTER (WHERE last_login_at >= now() - interval '7 days')  AS active_7d,
      COUNT(*) FILTER (WHERE last_login_at >= now() - interval '30 days') AS active_30d,
      COUNT(*) FILTER (WHERE ${col('u', 'google_id')} IS NOT NULL)        AS google,
      COUNT(*) FILTER (WHERE ${col('u', 'apple_id')} IS NOT NULL)         AS apple
    FROM users u`);

  const signupsByDay = await rows(`
    SELECT to_char((created_at AT TIME ZONE 'America/Los_Angeles')::date, 'YYYY-MM-DD') AS day,
           COUNT(*) AS count
    FROM users
    WHERE created_at >= now() - interval '30 days'
    GROUP BY 1 ORDER BY 1`);

  const list = await rows(`
    SELECT u.id,
           u.email,
           COALESCE(NULLIF(${col('u', 'full_name')}, ''),
                    NULLIF(concat_ws(' ', ${col('u', 'first_name')}, ${col('u', 'last_name')}), '')) AS name,
           u.created_at   AS joined_at,
           u.last_login_at AS last_seen_at,
           CASE WHEN ${col('u', 'google_id')} IS NOT NULL THEN 'Google'
                WHEN ${col('u', 'apple_id')}  IS NOT NULL THEN 'Apple'
                ELSE 'Email' END AS sign_in,
           (${col('u', 'is_admin')} = 'true' OR ${col('u', 'role')} IN ('admin', 'super_admin')) AS is_admin,
           COALESCE(${col('u', 'is_active')}, 'true') = 'true' AS is_active
    FROM users u
    ORDER BY u.created_at DESC NULLS LAST
    LIMIT ${MEMBER_LIMIT}`);

  // Per-member counts from feature tables. Each one is optional.
  const perUser = async (name, sql) => {
    const r = await section(name, () => rows(sql));
    return new Map((r || []).map((x) => [Number(x.user_id), int(x.n)]));
  };
  const watches = await perUser('watches', 'SELECT user_id, COUNT(*) AS n FROM item_watches WHERE active GROUP BY user_id');
  const push = await perUser('push', 'SELECT user_id, COUNT(*) AS n FROM push_subscriptions GROUP BY user_id');
  const cart = await perUser('cart', 'SELECT user_id, COUNT(*) AS n FROM cart_items GROUP BY user_id');

  return {
    total: int(t0.total),
    new7d: int(t0.new_7d),
    new30d: int(t0.new_30d),
    active1d: int(t0.active_1d),
    active7d: int(t0.active_7d),
    active30d: int(t0.active_30d),
    signInMethods: {
      google: int(t0.google),
      apple: int(t0.apple),
      email: Math.max(0, int(t0.total) - int(t0.google) - int(t0.apple)),
    },
    signupsByDay: signupsByDay.map((r) => ({ day: r.day, count: int(r.count) })),
    list: list.map((m) => ({
      id: m.id,
      email: m.email,
      name: m.name || null,
      joinedAt: m.joined_at,
      lastSeenAt: m.last_seen_at,
      signIn: m.sign_in,
      isAdmin: Boolean(m.is_admin),
      isActive: Boolean(m.is_active),
      watches: watches.get(Number(m.id)) || 0,
      pushDevices: push.get(Number(m.id)) || 0,
      cartItems: cart.get(Number(m.id)) || 0,
    })),
    listLimit: MEMBER_LIMIT,
  };
}

async function waitlist() {
  const t = await totals(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS new_7d,
           COUNT(*) FILTER (WHERE status = 'invited')   AS invited,
           COUNT(*) FILTER (WHERE status = 'converted') AS converted
    FROM waitlist_signups`);
  return { total: int(t.total), new7d: int(t.new_7d), invited: int(t.invited), converted: int(t.converted) };
}

async function activity() {
  const t = await totals(`
    SELECT COUNT(*) FILTER (WHERE activity_type = 'page_view')    AS page_views,
           COUNT(*) FILTER (WHERE activity_type = 'product_view') AS product_views,
           COUNT(*) FILTER (WHERE activity_type = 'search')       AS searches,
           COUNT(*) FILTER (WHERE activity_type = 'add_to_cart')  AS add_to_cart,
           COUNT(DISTINCT user_id) AS shoppers
    FROM shopper_activity
    WHERE created_at >= now() - interval '7 days'`);
  const topPages = await rows(`
    SELECT COALESCE(page_type, 'other') AS page, COUNT(*) AS views
    FROM shopper_activity
    WHERE created_at >= now() - interval '7 days' AND activity_type IN ('page_view', 'product_view')
    GROUP BY 1 ORDER BY 2 DESC LIMIT 6`);
  return {
    pageViews7d: int(t.page_views),
    productViews7d: int(t.product_views),
    searches7d: int(t.searches),
    addToCart7d: int(t.add_to_cart),
    shoppers7d: int(t.shoppers),
    topPages: topPages.map((r) => ({ page: r.page, views: int(r.views) })),
  };
}

async function watchesAndAlerts() {
  const w = await section('item_watches', () => one(`
    SELECT COUNT(*) FILTER (WHERE active) AS active,
           COUNT(*) FILTER (WHERE active AND kind = 'size')  AS size,
           COUNT(*) FILTER (WHERE active AND kind = 'price') AS price,
           COUNT(DISTINCT user_id) FILTER (WHERE active) AS shoppers
    FROM item_watches`));
  const a = await section('alert_log', () => one(`
    SELECT COUNT(*) FILTER (WHERE sent_at IS NOT NULL)      AS sent,
           COUNT(*) FILTER (WHERE opened_at IS NOT NULL)    AS opened,
           COUNT(*) FILTER (WHERE dismissed_at IS NOT NULL) AS dismissed,
           COUNT(*) FILTER (WHERE status IN ('no_device', 'not_configured')) AS failed
    FROM alert_log
    WHERE created_at >= now() - interval '7 days'`));
  const p = await section('push_subscriptions', () => one(`
    SELECT COUNT(*) AS devices,
           COUNT(DISTINCT user_id) AS shoppers,
           COUNT(*) FILTER (WHERE failure_count > 0) AS failing
    FROM push_subscriptions`));
  return {
    watches: w && { active: int(w.active), size: int(w.size), price: int(w.price), shoppers: int(w.shoppers) },
    alerts7d: a && { sent: int(a.sent), opened: int(a.opened), dismissed: int(a.dismissed), failed: int(a.failed) },
    push: p && { devices: int(p.devices), shoppers: int(p.shoppers), failing: int(p.failing) },
  };
}

async function shopping() {
  const cart = await section('cart_items', () => one(`
    SELECT COUNT(*) AS items, COUNT(DISTINCT user_id) AS shoppers,
           COALESCE(SUM(price_cents * COALESCE(quantity, 1)), 0) AS value_cents
    FROM cart_items`));
  const checkouts = await section('checkout_intents', () => rows(`
    SELECT status, COUNT(*) AS n, COALESCE(SUM(total_cents), 0) AS cents
    FROM checkout_intents
    WHERE created_at >= now() - interval '30 days'
    GROUP BY status`));
  const agent = await section('agent_events', () => rows(`
    SELECT decision, COUNT(*) AS n
    FROM agent_events
    WHERE occurred_at >= now() - interval '7 days'
    GROUP BY decision`));
  const blocked = await section('agent_events', () => rows(`
    SELECT action, LEFT(COALESCE(reason, ''), 140) AS reason, COUNT(*) AS n, MAX(occurred_at) AS last_at
    FROM agent_events
    WHERE occurred_at >= now() - interval '7 days' AND decision IN ('blocked', 'error', 'declined')
    GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 8`));
  return {
    cart: cart && { items: int(cart.items), shoppers: int(cart.shoppers), valueCents: int(cart.value_cents) },
    checkouts30d: checkouts && checkouts.map((r) => ({ status: r.status, count: int(r.n), cents: int(r.cents) })),
    agentDecisions7d: agent && Object.fromEntries(agent.map((r) => [r.decision, int(r.n)])),
    agentProblems7d: blocked && blocked.map((r) => ({ action: r.action, reason: r.reason, count: int(r.n), lastAt: r.last_at })),
  };
}

async function health() {
  const started = Date.now();
  await pool.query('SELECT 1');
  const dbMs = Date.now() - started;

  const listingRuns = await section('listing_runs', () => rows(`
    SELECT store_key,
           COUNT(*) FILTER (WHERE status IN ('ok', 'baseline'))     AS ok,
           COUNT(*) FILTER (WHERE status NOT IN ('ok', 'baseline')) AS not_ok,
           MAX(ran_at) AS last_run_at,
           (ARRAY_AGG(status ORDER BY ran_at DESC))[1] AS last_status
    FROM listing_runs
    WHERE ran_at >= now() - interval '24 hours'
    GROUP BY store_key ORDER BY store_key`));
  const newArrivals = await section('store_catalog_items', () => rows(`
    SELECT store_slug AS store,
           COUNT(*) FILTER (WHERE first_seen_at >= now() - interval '24 hours') AS new_24h,
           MAX(last_seen_at) AS last_seen_at
    FROM store_catalog_items
    GROUP BY store_slug ORDER BY store_slug`));
  const feedback = await section('feedback_submissions', () => one(`
    SELECT COUNT(*) FILTER (WHERE status IN ('new', 'in_review', 'in_progress')) AS open,
           COUNT(*) FILTER (WHERE status = 'new') AS new
    FROM feedback_submissions`));
  const security = await section('security_events', () => rows(`
    SELECT event_type, COUNT(*) AS n, MAX(created_at) AS last_at
    FROM security_events
    WHERE created_at >= now() - interval '7 days' AND event_type <> 'owner_dashboard_viewed'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 8`));

  return {
    dbMs,
    deploy: {
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
      message: (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').split('\n')[0].slice(0, 120) || null,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
      region: process.env.VERCEL_REGION || null,
    },
    listingRuns24h: listingRuns && listingRuns.map((r) => ({
      store: r.store_key, ok: int(r.ok), notOk: int(r.not_ok), lastRunAt: r.last_run_at, lastStatus: r.last_status,
    })),
    newArrivals: newArrivals && newArrivals.map((r) => ({ store: r.store, new24h: int(r.new_24h), lastSeenAt: r.last_seen_at })),
    feedback: feedback && { open: int(feedback.open), new: int(feedback.new) },
    securityEvents7d: security && security.map((r) => ({ type: r.event_type, count: int(r.n), lastAt: r.last_at })),
  };
}

async function getDashboard() {
  const started = Date.now();
  // Members is the core of the page; if the users table can't be read the
  // database is down, so let that error reach the caller.
  const memberData = await members();
  const result = {
    generatedAt: new Date().toISOString(),
    members: memberData,
    waitlist: await section('waitlist_signups', waitlist),
    activity: await section('shopper_activity', activity),
    engagement: await watchesAndAlerts(),
    shopping: await shopping(),
    health: await health(),
  };
  result.health.buildMs = Date.now() - started;
  return result;
}

module.exports = { getDashboard, _internal: { section, MEMBER_LIMIT } };
