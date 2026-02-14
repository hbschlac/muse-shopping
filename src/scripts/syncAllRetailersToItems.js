/**
 * Sync All Retailers to Items Table
 * For Academic Research Purposes Only
 *
 * This script syncs products from retailer-specific tables to the main items table
 */

const pool = require('../db/pool');

const RETAILER_CONFIG = {
  macys: {
    tableName: 'macys_products',
    storeName: 'macys',
    storeSlug: 'macys',
    brandMapping: {
      'Calvin Klein': 'Calvin Klein',
      'Charter Club': 'Charter Club',
      "Levi's": "Levi's",
      'Bar III': 'Bar III',
      'INC International Concepts': 'INC International Concepts'
    }
  },
  target: {
    tableName: 'target_products',
    storeName: 'target',
    storeSlug: 'target',
    brandMapping: {
      'A New Day': 'A New Day',
      'Universal Thread': 'Universal Thread'
    }
  },
  zara: {
    tableName: 'zara_products',
    storeName: 'zara',
    storeSlug: 'zara',
    brandMapping: {
      'Zara': 'Zara'
    }
  },
  hm: {
    tableName: 'hm_products',
    storeName: 'H&M',
    storeSlug: 'hm',
    brandMapping: {
      'H&M': 'H&M'
    }
  },
  urbanoutfitters: {
    tableName: 'urbanoutfitters_products',
    storeName: 'Urban Outfitters',
    storeSlug: 'urbanoutfitters',
    brandMapping: {
      'Urban Outfitters': 'Urban Outfitters',
      'BDG': 'BDG',
      'Out From Under': 'Out From Under'
    }
  },
  freepeople: {
    tableName: 'freepeople_products',
    storeName: 'Free People',
    storeSlug: 'freepeople',
    brandMapping: {
      'Free People': 'Free People'
    }
  },
  dynamite: {
    tableName: 'dynamite_products',
    storeName: 'Dynamite',
    storeSlug: 'dynamite',
    brandMapping: {
      'Dynamite': 'Dynamite'
    }
  }
};

async function getOrCreateStore(storeName, storeSlug) {
  const storeResult = await pool.query(
    'SELECT id FROM stores WHERE slug = $1',
    [storeSlug]
  );

  if (storeResult.rows.length > 0) {
    console.log(`  Store "${storeName}" found (ID: ${storeResult.rows[0].id})`);
    return storeResult.rows[0].id;
  }

  console.log(`  Store "${storeName}" not found, should exist already!`);
  return null;
}

async function getOrCreateBrand(brandName) {
  // Try to find brand
  const brandResult = await pool.query(
    'SELECT id FROM brands WHERE name = $1',
    [brandName]
  );

  if (brandResult.rows.length > 0) {
    return brandResult.rows[0].id;
  }

  // Create brand if it doesn't exist
  const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const insertResult = await pool.query(
    `INSERT INTO brands (name, slug, is_active, region)
     VALUES ($1, $2, true, 'Global')
     ON CONFLICT (name) DO UPDATE SET is_active = true
     RETURNING id`,
    [brandName, slug]
  );

  console.log(`    Created brand "${brandName}" (ID: ${insertResult.rows[0].id})`);
  return insertResult.rows[0].id;
}

async function syncRetailer(retailerKey) {
  const config = RETAILER_CONFIG[retailerKey];
  console.log(`\n=== Syncing ${config.storeName.toUpperCase()} ===`);

  // Get store ID
  const storeId = await getOrCreateStore(config.storeName, config.storeSlug);
  if (!storeId) {
    console.log(`  ✗ Store not found, skipping ${config.storeName}`);
    return 0;
  }

  // Get products
  const products = await pool.query(`
    SELECT * FROM ${config.tableName}
    WHERE product_name IS NOT NULL
    ORDER BY created_at DESC
  `);

  console.log(`  Found ${products.rows.length} products to sync`);

  let syncedCount = 0;
  let skippedCount = 0;

  for (const product of products.rows) {
    try {
      // Get or create brand
      const brandId = await getOrCreateBrand(product.brand_name);

      // Check if item already exists
      const existingItem = await pool.query(
        'SELECT id FROM items WHERE store_id = $1 AND name = $2',
        [storeId, product.product_name]
      );

      const priceInCents = product.current_price ? Math.round(product.current_price * 100) : null;

      if (existingItem.rows.length > 0) {
        // Update existing item
        await pool.query(
          `UPDATE items SET
            price_cents = $1,
            image_url = $2,
            product_url = $3,
            brand_id = $4,
            updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [
            priceInCents,
            product.image_url,
            product.product_url,
            brandId,
            existingItem.rows[0].id
          ]
        );
        skippedCount++;
      } else {
        // Insert new item
        const canonicalName = product.product_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await pool.query(
          `INSERT INTO items (
            name,
            canonical_name,
            description,
            price_cents,
            image_url,
            product_url,
            store_id,
            brand_id,
            category,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
          [
            product.product_name,
            canonicalName,
            product.category || 'Women\'s Clothing',
            priceInCents,
            product.image_url,
            product.product_url,
            storeId,
            brandId,
            product.category || 'Clothing'
          ]
        );
        syncedCount++;
      }
    } catch (error) {
      console.log(`  ✗ Error syncing ${product.product_name}: ${error.message}`);
    }
  }

  console.log(`  ✓ ${config.storeName}: Synced ${syncedCount} new, updated ${skippedCount} existing`);
  return syncedCount;
}

async function main() {
  try {
    console.log('Starting retailer sync to items table...\n');

    let totalSynced = 0;

    for (const retailerKey of Object.keys(RETAILER_CONFIG)) {
      const synced = await syncRetailer(retailerKey);
      totalSynced += synced;
    }

    // Get final counts
    console.log('\n=== Final Product Counts in Items Table ===');
    const result = await pool.query(`
      SELECT
        s.name as store,
        COUNT(i.id) as products
      FROM stores s
      LEFT JOIN items i ON i.store_id = s.id AND i.is_active = true
      WHERE s.slug IN ('nordstrom', 'abercrombie-and-fitch', 'aritzia', 'macys', 'target', 'zara', 'hm', 'urbanoutfitters', 'freepeople', 'dynamite')
      GROUP BY s.name
      ORDER BY products DESC
    `);

    for (const row of result.rows) {
      const status = row.products > 0 ? '✅' : '⚠️';
      console.log(`  ${status} ${row.store}: ${row.products} products`);
    }

    const grandTotal = result.rows.reduce((sum, row) => sum + parseInt(row.products), 0);
    console.log(`\n📊 TOTAL: ${grandTotal} products across ${result.rows.length} retailers`);
    console.log(`\n✅ Sync complete! ${totalSynced} new products added to items table.`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
