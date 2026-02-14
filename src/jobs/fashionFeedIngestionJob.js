const FashionFeedService = require('../services/fashionFeedService');
const pool = require('../db/pool');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class FashionFeedIngestionJob {
  async run() {
    await this.seedSourcesIfEmpty();
    await FashionFeedService.ingestAllSources();
  }

  async seedSourcesIfEmpty() {
    const result = await pool.query('SELECT COUNT(*)::int as count FROM fashion_sources');
    if (result.rows[0].count > 0) return;

    const seedPath = path.join(__dirname, '../data/fashionSources.json');
    if (!fs.existsSync(seedPath)) {
      logger.warn('Fashion sources seed file not found');
      return;
    }

    const sources = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    for (const source of sources) {
      await pool.query(
        `INSERT INTO fashion_sources (
          name, region, country, language, category,
          rss_url, site_url, source_type, sitemap_url,
          include_patterns, exclude_patterns, fetch_titles
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (rss_url) DO NOTHING`,
        [
          source.name,
          source.region,
          source.country,
          source.language,
          source.category,
          source.rss_url,
          source.site_url,
          source.source_type || 'rss',
          source.sitemap_url || null,
          JSON.stringify(source.include_patterns || []),
          JSON.stringify(source.exclude_patterns || []),
          Boolean(source.fetch_titles),
        ]
      );
    }
  }
}

module.exports = FashionFeedIngestionJob;
