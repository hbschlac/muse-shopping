/**
 * Add realistic sizing and attribute information to products
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

// Size configurations by category
const SIZES = {
  'Dresses': ['XS', 'S', 'M', 'L', 'XL', '0', '2', '4', '6', '8', '10', '12', '14'],
  'Tops': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Bottoms': ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', 'XS', 'S', 'M', 'L', 'XL'],
  'Outerwear': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'Shoes': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11'],
  'Accessories': ['One Size']
};

// Color palettes
const COLORS = [
  'Black', 'White', 'Navy', 'Gray', 'Beige', 'Camel',
  'Red', 'Burgundy', 'Pink', 'Blush',
  'Blue', 'Light Blue', 'Royal Blue',
  'Green', 'Olive', 'Forest Green',
  'Brown', 'Tan', 'Chocolate',
  'Purple', 'Lavender'
];

// Materials by category
const MATERIALS = {
  'Dresses': ['Cotton', 'Silk', 'Polyester', 'Linen', 'Satin', 'Chiffon', 'Jersey'],
  'Tops': ['Cotton', 'Silk', 'Polyester', 'Linen', 'Cashmere', 'Wool', 'Modal'],
  'Bottoms': ['Denim', 'Cotton', 'Polyester', 'Wool', 'Linen', 'Corduroy'],
  'Outerwear': ['Wool', 'Cashmere', 'Polyester', 'Nylon', 'Leather', 'Suede'],
  'Shoes': ['Leather', 'Suede', 'Canvas', 'Rubber', 'Synthetic'],
  'Accessories': ['Leather', 'Canvas', 'Metal', 'Plastic', 'Fabric']
};

function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function addSizingAttributes() {
  const client = await pool.connect();

  try {
    console.log('🏷️  Adding sizing and attribute information...\n');

    // Get all items
    const itemsQuery = 'SELECT id, category, subcategory FROM items WHERE is_active = TRUE';
    const itemsResult = await client.query(itemsQuery);
    const items = itemsResult.rows;

    console.log(`📦 Processing ${items.length} items...\n`);

    let updated = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);

      await client.query('BEGIN');

      for (const item of batch) {
        const category = item.category;
        const sizes = SIZES[category] || SIZES['Tops'];
        const materials = MATERIALS[category] || ['Cotton', 'Polyester'];

        // Generate available sizes (3-6 random sizes)
        const sizeCount = Math.floor(Math.random() * 4) + 3;
        const availableSizes = getRandomItems(sizes, sizeCount);

        // Generate available colors (1-3 colors)
        const colorCount = Math.floor(Math.random() * 3) + 1;
        const availableColors = getRandomItems(COLORS, colorCount);

        // Pick a material
        const material = materials[Math.floor(Math.random() * materials.length)];

        // Update item_listings with sizes and colors
        const updateListingQuery = `
          UPDATE item_listings
          SET
            sizes_available = $1,
            colors_available = $2
          WHERE item_id = $3
        `;

        await client.query(updateListingQuery, [
          JSON.stringify(availableSizes),
          JSON.stringify(availableColors),
          item.id
        ]);

        // Add attributes if attribute_taxonomy exists
        // For now, we'll skip this as it requires checking if the table exists
        updated++;
      }

      await client.query('COMMIT');

      if ((i + BATCH_SIZE) % 1000 === 0) {
        console.log(`✅ Processed ${Math.min(i + BATCH_SIZE, items.length)} / ${items.length} items`);
      }
    }

    console.log(`\n✅ Updated ${updated} items with sizing information`);

    // Verification
    const verifyQuery = `
      SELECT
        COUNT(*) FILTER (WHERE jsonb_array_length(sizes_available) > 0) as items_with_sizes,
        COUNT(*) FILTER (WHERE jsonb_array_length(colors_available) > 0) as items_with_colors,
        COUNT(*) as total
      FROM item_listings
    `;

    const verifyResult = await client.query(verifyQuery);
    const stats = verifyResult.rows[0];

    console.log('\n📊 Verification:');
    console.log(`   Listings with sizes: ${stats.items_with_sizes} / ${stats.total}`);
    console.log(`   Listings with colors: ${stats.items_with_colors} / ${stats.total}`);
    console.log(`   Coverage: ${(stats.items_with_sizes / stats.total * 100).toFixed(1)}%\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSizingAttributes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
