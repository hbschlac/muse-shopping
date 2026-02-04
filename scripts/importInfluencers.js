/**
 * Import Influencer Data
 * Imports influencer data from ChatGPT's public_influencer_pilot.csv
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const pool = require('../src/db/pool');
const logger = require('../src/utils/logger');

const CSV_PATH = '/Users/hannahschlacter/Documents/Muse Shopping/public_influencer_pilot.csv';

async function importInfluencers() {
  try {
    logger.info('Starting influencer import...');

    // Check if fashion_influencers table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'fashion_influencers'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      logger.error('fashion_influencers table does not exist. Please run migrations first.');
      process.exit(1);
    }

    const influencers = [];

    // Read CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_PATH)
        .pipe(csv())
        .on('data', (row) => {
          influencers.push({
            name: row.creator_name || row.name,
            username: row.instagram_handle || row.username,
            style_archetype: row.style_archetype,
            price_tier: row.price_tier,
            category_focus: row.category_focus,
            commerce_readiness_score: parseInt(row.commerce_readiness_score || '0'),
            audience_life_stage: row.audience_life_stage,
            follower_count: parseInt(row.followers || row.follower_count || '0'),
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    logger.info(`Found ${influencers.length} influencers in CSV`);

    // Insert influencers
    let inserted = 0;
    let skipped = 0;

    for (const influencer of influencers) {
      try {
        // Generate a placeholder instagram_user_id from username
        const instagramUserId = `pilot_${influencer.username || Math.random().toString(36).substring(7)}`;

        const result = await pool.query(
          `INSERT INTO fashion_influencers
            (instagram_user_id, display_name, username, style_archetype, price_tier, category_focus,
             commerce_readiness_score, audience_life_stage, follower_count, is_fashion_influencer)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
           ON CONFLICT (instagram_user_id) DO UPDATE
           SET
             display_name = EXCLUDED.display_name,
             username = EXCLUDED.username,
             style_archetype = EXCLUDED.style_archetype,
             price_tier = EXCLUDED.price_tier,
             category_focus = EXCLUDED.category_focus,
             commerce_readiness_score = EXCLUDED.commerce_readiness_score,
             audience_life_stage = EXCLUDED.audience_life_stage,
             follower_count = EXCLUDED.follower_count,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [
            instagramUserId,
            influencer.name,
            influencer.username,
            influencer.style_archetype,
            influencer.price_tier,
            influencer.category_focus,
            influencer.commerce_readiness_score,
            influencer.audience_life_stage,
            influencer.follower_count,
          ]
        );
        if (result.rows.length > 0) {
          inserted++;
        }
      } catch (error) {
        logger.warn(`Skipped influencer ${influencer.name}:`, error.message);
        skipped++;
      }
    }

    logger.info(`Import complete! Inserted: ${inserted}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (error) {
    logger.error('Error importing influencers:', error);
    process.exit(1);
  }
}

importInfluencers();
