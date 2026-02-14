const { Pool } = require('pg');

const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'muse_shopping_dev',
  user: 'muse_admin',
  password: 'SecurePassword123!'
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_J57iDsBcWVkX@ep-cool-bread-aigme40c.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function migrateItems() {
  try {
    console.log('📦 Fetching items from local database...');
    const { rows: items } = await localPool.query('SELECT * FROM items ORDER BY id');
    console.log(`Found ${items.length} items`);

    console.log('📥 Inserting items into Neon (in batches)...');
    let inserted = 0;
    
    for (let i = 0; i < items.length; i += 50) {
      const batch = items.slice(i, i + 50);
      
      for (const item of batch) {
        try {
          await neonPool.query(
            `INSERT INTO items (
              id, brand_id, canonical_name, description, category, subcategory, gender,
              primary_image_url, additional_images, is_active, created_at, updated_at,
              store_id, external_product_id, name, price_cents, original_price_cents,
              product_url, colors, sizes, is_available, image_url, style_tags,
              occasion_tag, price_tier, color_palette, primary_material, silhouette_type,
              detail_tags, pattern_type, coverage_level, sustainability_tags, season_suitability
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
              $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
            ) ON CONFLICT (id) DO NOTHING`,
            [
              item.id, item.brand_id, item.canonical_name, item.description, item.category,
              item.subcategory, item.gender, item.primary_image_url, item.additional_images,
              item.is_active, item.created_at, item.updated_at, item.store_id,
              item.external_product_id, item.name, item.price_cents, item.original_price_cents,
              item.product_url, item.colors, item.sizes, item.is_available, item.image_url,
              item.style_tags, item.occasion_tag, item.price_tier, item.color_palette,
              item.primary_material, item.silhouette_type, item.detail_tags, item.pattern_type,
              item.coverage_level, item.sustainability_tags, item.season_suitability
            ]
          );
          inserted++;
        } catch (err) {
          console.error(`Error inserting item ${item.id}:`, err.message);
        }
      }
      
      process.stdout.write(`\r${inserted}/${items.length} items inserted...`);
    }
    
    console.log(`\n✅ Successfully inserted ${inserted} items`);

    // Update sequence
    await neonPool.query("SELECT setval('items_id_seq', (SELECT MAX(id) FROM items))");
    console.log('🔢 Updated items sequence');

    const { rows } = await neonPool.query('SELECT COUNT(*) FROM items');
    console.log(`\n✅ Final count: ${rows[0].count} items in Neon database`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

migrateItems();
