/**
 * The words and link for each alert, and the signed token the service worker
 * sends back when an alert is opened, dismissed or marked "fewer like this".
 */

const crypto = require('crypto');
const partners = require('../agentBridges/partners.json').partners || [];

const PARTNER_NAMES = new Map(partners.map(p => [p.key, p.name]));
const OTHER_STORE_NAMES = {
  nordstrom: 'Nordstrom',
  'nordstrom-rack': 'Nordstrom Rack',
  tjmaxx: 'TJ Maxx',
};

function storeName(storeKey) {
  return PARTNER_NAMES.get(storeKey) || OTHER_STORE_NAMES[storeKey] || storeKey || 'a store';
}

const money = cents => {
  const n = Number(cents) / 100;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
};

/** Where tapping the alert goes: Muse's item page for partner stores, else the store's page. */
function itemUrl(change) {
  if (PARTNER_NAMES.has(change.store_key) && change.item_id) {
    return `/store-product?store=${encodeURIComponent(change.store_key)}&id=${encodeURIComponent(change.item_id)}`;
  }
  if (change.url && /^https:\/\//.test(change.url)) return change.url;
  return '/home';
}

function compose(type, change) {
  const store = storeName(change.store_key);
  const name = change.name || 'An item you saved';
  const price = change.new_price_cents != null ? money(change.new_price_cents) : null;
  let title;
  let body;
  if (type === 'back_in_stock') {
    title = change.size ? `Your size ${change.size} is back` : 'Back in stock';
    body = `${name}${price ? `, ${price}` : ''} at ${store}`;
  } else if (type === 'price_drop') {
    const pct = Math.round(((change.old_price_cents - change.new_price_cents) / change.old_price_cents) * 100);
    title = `${pct}% off: ${name}`;
    body = `Now ${price}, was ${money(change.old_price_cents)} at ${store}`;
  } else if (type === 'new_item') {
    title = `New at ${store}`;
    body = `${change.brand ? `${change.brand} ` : ''}${name}${price ? `, ${price}` : ''}`;
  } else {
    title = store;
    body = name;
  }
  return {
    title: title.slice(0, 120),
    body: body.slice(0, 240),
    url: itemUrl(change),
    image_url: change.image_url || null,
  };
}

/** Several new drops from one store in one run become one push. */
function composeBundle(storeKey, count) {
  return { title: `${count} new at ${storeName(storeKey)}`, body: 'Tap to see what just dropped', url: '/home' };
}

function composeDigest(alerts) {
  const n = alerts.length;
  const first = alerts[0];
  return {
    title: `Your Muse digest: ${n} update${n === 1 ? '' : 's'}`,
    body: n === 1 ? `${first.title}. ${first.body || ''}`.trim() : `${first.title}, and ${n - 1} more`,
    url: '/profile/notifications/history',
  };
}

function tokenSecret() {
  return process.env.ALERT_TOKEN_SECRET || process.env.JWT_SECRET || '';
}

/** HMAC over the alert ids, so the service worker can report taps without a login. */
function signAlertIds(ids) {
  const secret = tokenSecret();
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(`alerts:${ids.join(',')}`).digest('base64url').slice(0, 32);
}

function verifyAlertIds(ids, token) {
  const want = signAlertIds(ids);
  if (!want || typeof token !== 'string' || token.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(want));
}

module.exports = { compose, composeBundle, composeDigest, itemUrl, storeName, signAlertIds, verifyAlertIds };
