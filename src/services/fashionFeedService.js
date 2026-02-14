const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const pool = require('../db/pool');
const logger = require('../utils/logger');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
});

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function extractImage(item) {
  const enclosure = item.enclosure || item['media:content'];
  if (enclosure && enclosure['@_url']) return enclosure['@_url'];
  if (enclosure && enclosure.url) return enclosure.url;
  return null;
}

function parseHtmlLinks(html) {
  const links = [];
  const regex = /href="(https?:\/\/[^"]+)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function applyPatterns(urls, includePatterns = [], excludePatterns = []) {
  let result = urls;
  if (includePatterns.length) {
    result = result.filter((url) => includePatterns.some((p) => url.includes(p)));
  }
  if (excludePatterns.length) {
    result = result.filter((url) => !excludePatterns.some((p) => url.includes(p)));
  }
  return result;
}

function titleFromSlug(url) {
  const slug = url.split('/').filter(Boolean).slice(-1)[0] || '';
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchTitle(url) {
  try {
    const res = await axios.get(url, { timeout: 8000 });
    const match = res.data.match(/<title>(.*?)<\/title>/i);
    if (match && match[1]) return match[1].trim();
  } catch {
    return null;
  }
  return null;
}

function getRssItems(parsed) {
  if (parsed?.rss?.channel?.item) return normalizeArray(parsed.rss.channel.item);
  if (parsed?.feed?.entry) return normalizeArray(parsed.feed.entry);
  return [];
}

function getText(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value['#text']) return value['#text'];
  return null;
}

class FashionFeedService {
  static async listSources() {
    const result = await pool.query('SELECT * FROM fashion_sources WHERE is_active = TRUE ORDER BY name');
    return result.rows;
  }

  static async listFeed({ limit = 50, offset = 0, region, category }) {
    const params = [];
    const where = [];
    if (region) {
      params.push(region);
      where.push(`fs.region = $${params.length}`);
    }
    if (category) {
      params.push(category);
      where.push(`fs.category = $${params.length}`);
    }

    params.push(limit, offset);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT ffi.*, fs.name as source_name, fs.region, fs.country
      FROM fashion_feed_items ffi
      JOIN fashion_sources fs ON fs.id = ffi.source_id
      ${whereClause}
      ORDER BY ffi.published_at DESC NULLS LAST
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async ingestAllSources() {
    const sources = await this.listSources();
    for (const source of sources) {
      await this.ingestSource(source);
    }
  }

  static async ingestSource(source) {
    try {
      if (source.source_type && String(source.source_type).startsWith('sitemap')) {
        return await this.ingestSitemapSource(source);
      }
      const headers = {};
      if (source.etag) headers['If-None-Match'] = source.etag;
      if (source.last_modified) headers['If-Modified-Since'] = source.last_modified;

      const response = await axios.get(source.rss_url, { headers, timeout: 15000 });
      const parsed = parser.parse(response.data);
      const items = getRssItems(parsed);

      for (const item of items) {
        const guid = getText(item.guid) || item.id || item.link || item.title;
        if (!guid) continue;
        const title = getText(item.title) || 'Untitled';
        const link = getText(item.link) || item.link?.['@_href'] || null;
        const summary = getText(item.description) || getText(item.summary) || null;
        const author = getText(item.author?.name) || getText(item.author) || null;
        const published = getText(item.pubDate) || getText(item.published) || getText(item.updated);
        const imageUrl = extractImage(item);
        const categories = normalizeArray(item.category).map((c) => getText(c) || c).filter(Boolean);

        await pool.query(
          `INSERT INTO fashion_feed_items (source_id, guid, title, link, summary, author, image_url, published_at, categories)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (source_id, guid) DO NOTHING`,
          [
            source.id,
            guid,
            title,
            link,
            summary,
            author,
            imageUrl,
            published ? new Date(published) : null,
            JSON.stringify(categories),
          ]
        );
      }

      await pool.query(
        `UPDATE fashion_sources SET last_fetched_at = NOW(), etag = $1, last_modified = $2 WHERE id = $3`,
        [response.headers.etag || null, response.headers['last-modified'] || null, source.id]
      );
    } catch (error) {
      if (error.response?.status === 304) {
        return;
      }
      logger.error('Fashion feed ingestion failed', {
        source: source.name,
        error: error.message,
      });
    }
  }

  static async ingestSitemapSource(source) {
    const url = source.sitemap_url || source.rss_url;
    if (!url) return;

    const response = await axios.get(url, { timeout: 15000 });
    let urls = [];

    try {
      const parsed = parser.parse(response.data);
      if (parsed?.sitemapindex?.sitemap) {
        const sitemaps = normalizeArray(parsed.sitemapindex.sitemap)
          .map((s) => s.loc)
          .filter(Boolean);
        const subset = sitemaps.slice(0, 5);
        for (const sitemapUrl of subset) {
          const siteRes = await axios.get(sitemapUrl, { timeout: 15000 });
          const siteParsed = parser.parse(siteRes.data);
          if (siteParsed?.urlset?.url) {
            urls.push(
              ...normalizeArray(siteParsed.urlset.url).map((u) => u.loc).filter(Boolean)
            );
          }
        }
      } else if (parsed?.urlset?.url) {
        urls = normalizeArray(parsed.urlset.url).map((u) => u.loc).filter(Boolean);
      }
    } catch {
      // ignore xml parsing errors and try HTML
    }

    if (!urls.length) {
      urls = parseHtmlLinks(response.data);
    }

    urls = applyPatterns(
      urls,
      source.include_patterns || [],
      source.exclude_patterns || []
    ).slice(0, 40);

    for (const link of urls) {
      const title = source.fetch_titles ? (await fetchTitle(link)) : titleFromSlug(link);
      const guid = link;
      if (!title) continue;

      await pool.query(
        `INSERT INTO fashion_feed_items (source_id, guid, title, link, summary, author, image_url, published_at, categories)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (source_id, guid) DO NOTHING`,
        [
          source.id,
          guid,
          title,
          link,
          null,
          null,
          null,
          null,
          JSON.stringify([]),
        ]
      );
    }

    await pool.query(
      `UPDATE fashion_sources SET last_fetched_at = NOW() WHERE id = $1`,
      [source.id]
    );
  }

  static async buildContext({ limit = 50 } = {}) {
    const result = await pool.query(
      `SELECT ffi.title, ffi.link, ffi.summary, fs.name as source_name
       FROM fashion_feed_items ffi
       JOIN fashion_sources fs ON fs.id = ffi.source_id
       ORDER BY ffi.published_at DESC NULLS LAST
       LIMIT $1`,
      [limit]
    );

    const headlines = result.rows.map((row) => ({
      title: row.title,
      link: row.link,
      source: row.source_name,
    }));

    const stop = new Set([
      'the','a','an','and','or','but','for','to','of','in','on','with','at','by','from',
      'is','are','was','were','be','been','being','this','that','these','those','it','its',
      'as','about','into','over','after','before','than','then','so','if','up','out','new'
    ]);

    const counts = new Map();
    for (const row of result.rows) {
      const text = `${row.title || ''} ${row.summary || ''}`.toLowerCase();
      const tokens = text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        if (token.length < 4 || stop.has(token)) continue;
        counts.set(token, (counts.get(token) || 0) + 1);
      }
    }

    const trends = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([term, count]) => ({ term, count }));

    return { headlines, trends };
  }

}

module.exports = FashionFeedService;
