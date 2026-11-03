#!/usr/bin/env node
/**
 * TJ Maxx women's new arrivals -> store_catalog_items (feeds the Home carousel).
 *
 * Runs on the Mac, not in the cloud: TJ Maxx's CDN refuses cloud servers.
 * It opens a visible Chrome window, reads a few public listing pages slowly,
 * and never signs in, adds to cart or checks out. TJ Maxx has no affiliate
 * program or API, so this is the only source for its carousel.
 *
 * Usage (from the repo root, with DATABASE_URL in .env):
 *   node scripts/scrape-tjmaxx-new-arrivals.js              # scrape and save
 *   node scripts/scrape-tjmaxx-new-arrivals.js --dry-run    # print, don't save
 *   node scripts/scrape-tjmaxx-new-arrivals.js --dump /tmp/tj  # also save page HTML
 *   node scripts/scrape-tjmaxx-new-arrivals.js --url <listing url> --pages 3
 *
 * Without --url it opens the home page and follows the women's "New Arrivals"
 * link. If the site's layout changes and it finds 0 items, rerun with --dump
 * and fix extractTiles() against the saved HTML.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const HOME_URL = 'https://tjmaxx.tjx.com/store/index.jsp';
const PRODUCT_HREF = /\/store\/jump\/product\//i;
const MAX_PAGES = 5;

function parseArgs(argv) {
  const args = { dryRun: false, dump: null, url: process.env.TJMAXX_START_URL || null, pages: 3, headless: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--headless') args.headless = true;
    else if (a === '--dump') args.dump = argv[++i];
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--pages') args.pages = Math.min(parseInt(argv[++i], 10) || 1, MAX_PAGES);
  }
  return args;
}

function priceToCents(text) {
  const m = String(text || '').replace(/,/g, '').match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Math.round(parseFloat(m[1]) * 100) : null;
}

/**
 * Turn raw tiles scraped from the page into store_catalog_items rows.
 * A raw tile is { href, lines: string[], imageUrl, imageAlt }.
 */
function parseTiles(rawTiles, baseUrl = 'https://tjmaxx.tjx.com') {
  const items = new Map();
  for (const tile of rawTiles) {
    let url;
    try { url = new URL(tile.href, baseUrl); } catch { continue; }
    if (!PRODUCT_HREF.test(url.pathname)) continue;
    const idMatch = url.pathname.match(/\/(\d{6,})(?:[/?]|$)/);
    if (!idMatch) continue;

    const lines = (tile.lines || []).map(l => l.trim()).filter(Boolean);
    const priceLines = lines.filter(l => /\$\s*\d/.test(l));
    const textLines = lines.filter(l => !/\$\s*\d/.test(l) && !/^(new|sale|online only|compare at)$/i.test(l));
    const compareLine = priceLines.find(l => /compare/i.test(l));
    const priceLine = priceLines.find(l => !/compare/i.test(l));

    // Tiles show the brand on one line and the item name on the next.
    const [first, second] = textLines;
    const name = second || first || tile.imageAlt;
    const brand = second ? first : null;
    if (!name) continue;

    const priceCents = priceToCents(priceLine);
    const compareCents = priceToCents(compareLine);
    url.hash = '';
    items.set(idMatch[1], {
      externalId: idMatch[1],
      name,
      brandName: brand,
      priceCents,
      originalPriceCents: compareCents && priceCents && compareCents > priceCents ? compareCents : null,
      imageUrl: tile.imageUrl || null,
      productUrl: url.toString(),
      department: 'women',
      category: null,
    });
  }
  return [...items.values()];
}

// Runs inside the page.
function extractTiles() {
  const out = [];
  const anchors = [...document.querySelectorAll('a[href*="/store/jump/product/"]')];
  for (const a of anchors) {
    let tile = a;
    for (let i = 0; i < 6 && tile.parentElement; i++) {
      if (tile.querySelector('img') && /\$\s*\d/.test(tile.innerText || '')) break;
      tile = tile.parentElement;
    }
    const img = tile.querySelector('img');
    out.push({
      href: a.href,
      lines: (tile.innerText || '').split('\n'),
      imageUrl: img ? (img.currentSrc || img.src || img.getAttribute('data-src')) : null,
      imageAlt: img ? img.alt : null,
    });
  }
  return out;
}

function findNewArrivalsLink() {
  const links = [...document.querySelectorAll('a[href]')];
  const score = a => {
    const t = `${a.innerText} ${a.getAttribute('aria-label') || ''} ${a.href}`.toLowerCase();
    return (/new[- ]?arrivals?/.test(t) ? 2 : 0) + (/women/.test(t) ? 1 : 0);
  };
  const best = links.map(a => [score(a), a.href]).filter(([s]) => s >= 3).sort((x, y) => y[0] - x[0]);
  return best.length ? best[0][1] : null;
}

function findNextPageLink() {
  const next = document.querySelector('a[rel="next"], a[aria-label*="Next" i], a.next, li.next a');
  return next ? next.href : null;
}

const pause = (min, max) => new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: args.headless, defaultViewport: { width: 1280, height: 900 } });
  const page = await browser.newPage();
  const all = [];

  try {
    let url = args.url;
    if (!url) {
      await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await pause(2000, 4000);
      url = await page.evaluate(findNewArrivalsLink);
      if (!url) throw new Error("Couldn't find the women's New Arrivals link. Pass --url with a listing page.");
    }

    for (let n = 1; n <= args.pages && url; n++) {
      console.log(`Page ${n}: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await pause(3000, 6000);
      await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      await pause(1500, 3000);

      if (args.dump) {
        fs.mkdirSync(args.dump, { recursive: true });
        fs.writeFileSync(path.join(args.dump, `tjmaxx-page-${n}.html`), await page.content());
      }
      const items = parseTiles(await page.evaluate(extractTiles));
      console.log(`  ${items.length} items`);
      all.push(...items);
      url = await page.evaluate(findNextPageLink);
    }
  } finally {
    await browser.close();
  }

  const unique = [...new Map(all.map(i => [i.externalId, i])).values()];
  if (unique.length === 0) {
    console.error('Found 0 items. The page layout may have changed: rerun with --dump <dir> and check extractTiles().');
    process.exitCode = 1;
    return;
  }
  if (args.dryRun) {
    console.log(JSON.stringify(unique.slice(0, 10), null, 2));
    console.log(`Dry run: ${unique.length} items, nothing saved.`);
    return;
  }

  const { recordSeenItems } = require('../src/services/newArrivalsService');
  const result = await recordSeenItems('tjmaxx', unique, 'scraper');
  console.log(`Saved ${result.seen} items, ${result.added} new since the last run.`);
  await require('../src/db/pool').end?.();
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { parseTiles, priceToCents };
