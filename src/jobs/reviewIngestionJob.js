require('dotenv').config();
const pool = require('../db/pool');
const logger = require('../utils/logger');
const ReviewIngestionService = require('../services/reviewIngestionService');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      options[key.replace('--', '')] = value || true;
    }
  });

  return options;
}

async function getItems(limit = 50) {
  const query = `
    SELECT DISTINCT i.id
    FROM items i
    JOIN item_listings il ON il.item_id = i.id
    WHERE i.is_active = TRUE
    ORDER BY i.id DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows.map(row => row.id);
}

async function runBatch({ itemId = null, limit = 50, retailers, dryRun = false } = {}) {
  const itemIds = itemId ? [itemId] : await getItems(limit);

  const results = [];
  for (const id of itemIds) {
    const result = await ReviewIngestionService.syncItemReviews(id, { retailers, dryRun });
    logger.info(`Review sync complete`, result);
    results.push(result);
  }

  return {
    total_items: itemIds.length,
    results
  };
}

async function run() {
  const args = parseArgs();
  const itemId = args.item_id ? parseInt(args.item_id, 10) : null;
  const limit = args.limit ? parseInt(args.limit, 10) : 50;
  const retailers = args.retailers ? args.retailers.split(',') : undefined;
  const dryRun = args.dry_run === 'true' || args.dry_run === true;

  await runBatch({ itemId, limit, retailers, dryRun });

  await pool.end();
}

if (require.main === module) {
  run().catch(error => {
    logger.error('Review ingestion failed:', error);
    pool.end();
  });
}

module.exports = {
  runBatch
};
