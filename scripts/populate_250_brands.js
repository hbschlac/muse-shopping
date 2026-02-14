/**
 * Populate 250 brands with 10-50 products each
 * Target: ~12,500 total products across 250 brands
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'muse_shopping_dev',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Product templates for variety
const CATEGORIES = {
  'Dresses': ['Mini Dress', 'Midi Dress', 'Maxi Dress', 'Wrap Dress', 'Shirt Dress', 'Bodycon Dress', 'A-Line Dress', 'Slip Dress'],
  'Tops': ['T-Shirt', 'Blouse', 'Tank Top', 'Crop Top', 'Sweater', 'Cardigan', 'Button-Up', 'Turtleneck'],
  'Bottoms': ['Jeans', 'Trousers', 'Leggings', 'Shorts', 'Skirt', 'Wide Leg Pants', 'Joggers', 'Culottes'],
  'Outerwear': ['Jacket', 'Coat', 'Blazer', 'Puffer Jacket', 'Trench Coat', 'Denim Jacket', 'Bomber Jacket', 'Peacoat'],
  'Shoes': ['Sneakers', 'Boots', 'Heels', 'Sandals', 'Flats', 'Loafers', 'Mules', 'Wedges'],
  'Accessories': ['Handbag', 'Backpack', 'Sunglasses', 'Belt', 'Scarf', 'Hat', 'Jewelry', 'Watch']
};

const STYLES = ['Classic', 'Casual', 'Elegant', 'Sporty', 'Vintage', 'Modern', 'Bohemian', 'Minimalist', 'Edgy', 'Romantic'];
const MATERIALS = ['Cotton', 'Linen', 'Silk', 'Denim', 'Leather', 'Wool', 'Cashmere', 'Polyester', 'Satin', 'Knit'];
const COLORS = ['Black', 'White', 'Navy', 'Gray', 'Beige', 'Red', 'Blue', 'Green', 'Pink', 'Brown'];

function generateProductName(category, subcategory) {
  const style = STYLES[Math.floor(Math.random() * STYLES.length)];
  const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];

  const templates = [
    `${style} ${subcategory}`,
    `${color} ${subcategory}`,
    `${material} ${subcategory}`,
    `${color} ${material} ${subcategory}`,
    `${style} ${color} ${subcategory}`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

function generatePrice(category) {
  const priceRanges = {
    'Dresses': [29.99, 199.99],
    'Tops': [19.99, 149.99],
    'Bottoms': [24.99, 179.99],
    'Outerwear': [49.99, 399.99],
    'Shoes': [39.99, 299.99],
    'Accessories': [14.99, 249.99]
  };

  const [min, max] = priceRanges[category] || [19.99, 99.99];
  return (Math.random() * (max - min) + min).toFixed(2);
}

function generatePlaceholderImage(category, index) {
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F', 'BB8FCE', '85C1E2'];
  const color = colors[index % colors.length];
  const text = category.substring(0, 10);
  return `https://via.placeholder.com/400x500/${color}/FFFFFF?text=${encodeURIComponent(text)}`;
}

async function populateBrands() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting product population for 250 brands...\n');

    // Get top 250 brands, prioritizing those with fewer products
    const brandsQuery = `
      SELECT
        b.id,
        b.name,
        b.slug,
        s.id as store_id,
        COALESCE(item_counts.item_count, 0) as current_items,
        CASE
          WHEN COALESCE(item_counts.item_count, 0) < 10 THEN 50 - COALESCE(item_counts.item_count, 0)
          WHEN COALESCE(item_counts.item_count, 0) < 30 THEN 30
          ELSE 10
        END as items_to_add
      FROM brands b
      LEFT JOIN stores s ON b.name = s.name
      LEFT JOIN (
        SELECT brand_id, COUNT(*) as item_count
        FROM items
        WHERE is_active = TRUE
        GROUP BY brand_id
      ) item_counts ON b.id = item_counts.brand_id
      WHERE b.is_active = TRUE
      ORDER BY
        COALESCE(item_counts.item_count, 0) ASC,
        b.name ASC
      LIMIT 250
    `;

    const brandsResult = await client.query(brandsQuery);
    const brands = brandsResult.rows;

    console.log(`📊 Found ${brands.length} brands to populate`);
    console.log(`📦 Average items to add per brand: ${(brands.reduce((sum, b) => sum + b.items_to_add, 0) / brands.length).toFixed(1)}\n`);

    let totalItemsAdded = 0;
    let totalListingsAdded = 0;

    // Process brands in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < brands.length; i += BATCH_SIZE) {
      const batch = brands.slice(i, i + BATCH_SIZE);

      await client.query('BEGIN');

      for (const brand of batch) {
        const itemsToAdd = brand.items_to_add;
        const items = [];
        const listings = [];

        // Generate products
        for (let j = 0; j < itemsToAdd; j++) {
          const categoryName = Object.keys(CATEGORIES)[Math.floor(Math.random() * Object.keys(CATEGORIES).length)];
          const subcategories = CATEGORIES[categoryName];
          const subcategory = subcategories[Math.floor(Math.random() * subcategories.length)];

          const productName = generateProductName(categoryName, subcategory);
          const price = parseFloat(generatePrice(categoryName));
          const hasDiscount = Math.random() > 0.7;
          const originalPrice = hasDiscount ? (price * 1.3).toFixed(2) : null;
          const imageUrl = generatePlaceholderImage(categoryName, j);

          items.push({
            brand_id: brand.id,
            store_id: brand.store_id,
            canonical_name: productName,
            description: `${productName} from ${brand.name}`,
            category: categoryName,
            subcategory: subcategory.toLowerCase().replace(/ /g, '_'),
            gender: 'women',
            primary_image_url: imageUrl,
            price_cents: Math.round(price * 100),
            original_price_cents: originalPrice ? Math.round(parseFloat(originalPrice) * 100) : null,
            is_available: true,
            is_active: true
          });
        }

        // Bulk insert items
        if (items.length > 0) {
          const itemValues = items.map(item =>
            `(${item.brand_id}, ${item.store_id || 'NULL'}, '${item.canonical_name.replace(/'/g, "''")}', '${item.description.replace(/'/g, "''")}', '${item.category}', '${item.subcategory}', '${item.gender}', '${item.primary_image_url}', '{}', ${item.price_cents}, ${item.original_price_cents || 'NULL'}, ${item.is_available}, ${item.is_active})`
          ).join(',\n');

          const insertItemsQuery = `
            INSERT INTO items (
              brand_id, store_id, canonical_name, description, category, subcategory,
              gender, primary_image_url, additional_images, price_cents, original_price_cents,
              is_available, is_active
            ) VALUES ${itemValues}
            RETURNING id, brand_id, price_cents, original_price_cents, primary_image_url
          `;

          const itemsResult = await client.query(insertItemsQuery);
          const insertedItems = itemsResult.rows;
          totalItemsAdded += insertedItems.length;

          // Create item_listings for each item
          const listingValues = insertedItems.map(item => {
            const price = item.price_cents / 100;
            const salePrice = item.original_price_cents ? price : null;
            return `(${item.id}, ${item.brand_id}, 'https://example.com/product/${item.id}', ${price}, ${salePrice || 'NULL'}, true)`;
          }).join(',\n');

          const insertListingsQuery = `
            INSERT INTO item_listings (
              item_id, retailer_id, product_url, price, sale_price, in_stock
            ) VALUES ${listingValues}
          `;

          await client.query(insertListingsQuery);
          totalListingsAdded += insertedItems.length;
        }

        console.log(`✅ ${brand.name}: Added ${itemsToAdd} products (had ${brand.current_items})`);
      }

      await client.query('COMMIT');
      console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(brands.length / BATCH_SIZE)} complete\n`);
    }

    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('🎉 POPULATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Brands processed: ${brands.length}`);
    console.log(`📦 Items added: ${totalItemsAdded}`);
    console.log(`🔗 Listings created: ${totalListingsAdded}`);

    // Verify final counts
    const finalStats = await client.query(`
      SELECT
        COUNT(DISTINCT i.brand_id) as brands_with_products,
        COUNT(*) as total_items,
        ROUND(AVG(brand_item_count), 2) as avg_items_per_brand,
        MIN(brand_item_count) as min_items,
        MAX(brand_item_count) as max_items
      FROM items i
      JOIN (
        SELECT brand_id, COUNT(*) as brand_item_count
        FROM items
        WHERE is_active = TRUE
        GROUP BY brand_id
      ) counts ON i.brand_id = counts.brand_id
      WHERE i.is_active = TRUE
    `);

    console.log('\n📈 Final Database Statistics:');
    console.log(`   Brands with products: ${finalStats.rows[0].brands_with_products}`);
    console.log(`   Total items: ${finalStats.rows[0].total_items}`);
    console.log(`   Average per brand: ${finalStats.rows[0].avg_items_per_brand}`);
    console.log(`   Range: ${finalStats.rows[0].min_items} - ${finalStats.rows[0].max_items} items per brand`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
populateBrands().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
