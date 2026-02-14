/**
 * Populate Bloomingdales with sample data matching Nordstrom's assortment
 * Creates 100 products with similar categories and price ranges
 */

const pool = require('../src/db/pool');
const logger = require('../src/config/logger');

const sampleProducts = [
  // Dresses (30 products) - $69-$425
  { brand: "Theory", name: "Linen Blend Shirt Dress", price: 345.00, category: "dresses", subcategory: "shirt-dresses" },
  { brand: "Vince Camuto", name: "Sequin Maxi Gown", price: 269.00, category: "dresses", subcategory: "gowns" },
  { brand: "Adrianna Papell", name: "Beaded Cocktail Dress", price: 199.00, category: "dresses", subcategory: "cocktail-dresses" },
  { brand: "Calvin Klein", name: "V-Neck Sheath Dress", price: 134.00, category: "dresses", subcategory: "sheath-dresses" },
  { brand: "Eliza J", name: "Floral Print Wrap Dress", price: 118.00, category: "dresses", subcategory: "wrap-dresses" },
  { brand: "Maggy London", name: "Fit & Flare Dress", price: 98.00, category: "dresses", subcategory: "fit-and-flare" },
  { brand: "Aqua", name: "Puff Sleeve Midi Dress", price: 88.00, category: "dresses", subcategory: "midi-dresses" },
  { brand: "Donna Karan", name: "Asymmetric Hem Dress", price: 425.00, category: "dresses", subcategory: "designer-dresses" },
  { brand: "Tahari ASL", name: "Bow Detail Sheath Dress", price: 138.00, category: "dresses", subcategory: "work-dresses" },
  { brand: "Betsey Johnson", name: "Lace Overlay Dress", price: 148.00, category: "dresses", subcategory: "lace-dresses" },
  { brand: "BCBGMAXAZRIA", name: "Cutout Detail Gown", price: 398.00, category: "dresses", subcategory: "evening-gowns" },
  { brand: "Bardot", name: "Off-Shoulder Dress", price: 109.00, category: "dresses", subcategory: "party-dresses" },
  { brand: "French Connection", name: "Stripe Knit Dress", price: 128.00, category: "dresses", subcategory: "knit-dresses" },
  { brand: "Ted Baker", name: "Floral Jacquard Dress", price: 295.00, category: "dresses", subcategory: "occasion-dresses" },
  { brand: "Bebe", name: "Sequin Mini Dress", price: 179.00, category: "dresses", subcategory: "mini-dresses" },
  { brand: "Laundry by Shelli Segal", name: "Pleated Maxi Dress", price: 225.00, category: "dresses", subcategory: "maxi-dresses" },
  { brand: "Aidan Mattox", name: "Embellished Gown", price: 395.00, category: "dresses", subcategory: "formal-gowns" },
  { brand: "Dress the Population", name: "Slit Detail Midi", price: 198.00, category: "dresses", subcategory: "midi-dresses" },
  { brand: "Vince", name: "Slip Dress", price: 325.00, category: "dresses", subcategory: "slip-dresses" },
  { brand: "Lauren Ralph Lauren", name: "Belted Shirt Dress", price: 155.00, category: "dresses", subcategory: "shirt-dresses" },
  { brand: "Guess", name: "Ruched Bodycon Dress", price: 89.00, category: "dresses", subcategory: "bodycon-dresses" },
  { brand: "Nanette Lepore", name: "Flounce Hem Dress", price: 268.00, category: "dresses", subcategory: "cocktail-dresses" },
  { brand: "Rebecca Taylor", name: "Eyelet Detail Dress", price: 378.00, category: "dresses", subcategory: "designer-dresses" },
  { brand: "Trina Turk", name: "Abstract Print Dress", price: 298.00, category: "dresses", subcategory: "printed-dresses" },
  { brand: "Shoshanna", name: "Lace Midi Dress", price: 395.00, category: "dresses", subcategory: "midi-dresses" },
  { brand: "Badgley Mischka", name: "Sequin Column Gown", price: 425.00, category: "dresses", subcategory: "gowns" },
  { brand: "Xscape", name: "Ruffle Trim Gown", price: 229.00, category: "dresses", subcategory: "evening-gowns" },
  { brand: "Adrianna Papell", name: "Floral Jacquard Dress", price: 259.00, category: "dresses", subcategory: "jacquard-dresses" },
  { brand: "MAC Duggal", name: "Beaded A-Line Gown", price: 398.00, category: "dresses", subcategory: "formal-gowns" },
  { brand: "Betsy & Adam", name: "Embellished Ballgown", price: 249.00, category: "dresses", subcategory: "ballgowns" },

  // Tops (25 products) - $45-$325
  { brand: "Equipment", name: "Silk Blouse", price: 268.00, category: "tops", subcategory: "blouses" },
  { brand: "Vince", name: "Cashmere Sweater", price: 325.00, category: "tops", subcategory: "sweaters" },
  { brand: "Madewell", name: "Striped Tee", price: 45.00, category: "tops", subcategory: "tees" },
  { brand: "J.Crew", name: "Button Down Shirt", price: 78.00, category: "tops", subcategory: "shirts" },
  { brand: "Free People", name: "Oversized Tunic", price: 98.00, category: "tops", subcategory: "tunics" },
  { brand: "Rag & Bone", name: "Slub Knit Tee", price: 125.00, category: "tops", subcategory: "designer-tees" },
  { brand: "Theory", name: "Silk Shell Top", price: 245.00, category: "tops", subcategory: "shells" },
  { brand: "Eileen Fisher", name: "Organic Cotton Top", price: 98.00, category: "tops", subcategory: "organic-tops" },
  { brand: "Joie", name: "Printed Blouse", price: 178.00, category: "tops", subcategory: "printed-blouses" },
  { brand: "Splendid", name: "Thermal Henley", price: 68.00, category: "tops", subcategory: "henleys" },
  { brand: "Rails", name: "Plaid Button Down", price: 158.00, category: "tops", subcategory: "plaid-shirts" },
  { brand: "Nation LTD", name: "Ribbed Tank", price: 55.00, category: "tops", subcategory: "tanks" },
  { brand: "ATM Anthony Thomas Melillo", name: "Modal Tee", price: 85.00, category: "tops", subcategory: "modal-tees" },
  { brand: "L'Agence", name: "Silk Cami", price: 225.00, category: "tops", subcategory: "camisoles" },
  { brand: "Alice + Olivia", name: "Sequin Top", price: 295.00, category: "tops", subcategory: "sequin-tops" },
  { brand: "Rebecca Minkoff", name: "Embroidered Blouse", price: 198.00, category: "tops", subcategory: "embroidered-tops" },
  { brand: "Velvet by Graham & Spencer", name: "Slub Tee", price: 88.00, category: "tops", subcategory: "slub-tees" },
  { brand: "Current/Elliott", name: "Sweatshirt", price: 148.00, category: "tops", subcategory: "sweatshirts" },
  { brand: "Sanctuary", name: "Lace Trim Top", price: 79.00, category: "tops", subcategory: "lace-tops" },
  { brand: "BB Dakota", name: "Faux Leather Top", price: 98.00, category: "tops", subcategory: "faux-leather" },
  { brand: "Halogen", name: "V-Neck Sweater", price: 89.00, category: "tops", subcategory: "v-neck-sweaters" },
  { brand: "Caslon", name: "Cotton Tee", price: 29.00, category: "tops", subcategory: "cotton-tees" },
  { brand: "1.STATE", name: "Ruffle Sleeve Blouse", price: 89.00, category: "tops", subcategory: "ruffle-tops" },
  { brand: "CeCe", name: "Bow Neck Blouse", price: 99.00, category: "tops", subcategory: "bow-tops" },
  { brand: "Vince Camuto", name: "Drape Front Top", price: 79.00, category: "tops", subcategory: "drape-tops" },

  // Jeans & Pants (20 products) - $68-$298
  { brand: "AG", name: "The Legging Ankle Jeans", price: 198.00, category: "bottoms", subcategory: "jeans" },
  { brand: "Paige", name: "Hoxton Straight Leg", price: 189.00, category: "bottoms", subcategory: "straight-leg-jeans" },
  { brand: "Citizens of Humanity", name: "Rocket High Rise Skinny", price: 218.00, category: "bottoms", subcategory: "skinny-jeans" },
  { brand: "DL1961", name: "Florence Ankle Mid Rise Skinny", price: 178.00, category: "bottoms", subcategory: "ankle-jeans" },
  { brand: "Joe's Jeans", name: "The Icon Mid Rise Skinny", price: 168.00, category: "bottoms", subcategory: "mid-rise-jeans" },
  { brand: "7 For All Mankind", name: "Dojo Wide Leg", price: 189.00, category: "bottoms", subcategory: "wide-leg-jeans" },
  { brand: "Good American", name: "Good Legs Jeans", price: 149.00, category: "bottoms", subcategory: "skinny-jeans" },
  { brand: "Hudson", name: "Barbara High Waist", price: 195.00, category: "bottoms", subcategory: "high-waist-jeans" },
  { brand: "Frame", name: "Le Palazzo Wide Leg", price: 268.00, category: "bottoms", subcategory: "palazzo-jeans" },
  { brand: "Mother", name: "The Insider Crop", price: 228.00, category: "bottoms", subcategory: "cropped-jeans" },
  { brand: "Theory", name: "Crepe Pants", price: 275.00, category: "bottoms", subcategory: "dress-pants" },
  { brand: "Vince", name: "Tapered Pants", price: 245.00, category: "bottoms", subcategory: "tapered-pants" },
  { brand: "Eileen Fisher", name: "Wide Leg Pants", price: 168.00, category: "bottoms", subcategory: "wide-leg-pants" },
  { brand: "Rag & Bone", name: "Simone Pants", price: 298.00, category: "bottoms", subcategory: "designer-pants" },
  { brand: "J Brand", name: "Maria High Rise Skinny", price: 198.00, category: "bottoms", subcategory: "skinny-jeans" },
  { brand: "L'Agence", name: "Margot High Rise Skinny", price: 225.00, category: "bottoms", subcategory: "high-rise-skinny" },
  { brand: "Levi's", name: "Wedgie Fit Straight", price: 98.00, category: "bottoms", subcategory: "straight-jeans" },
  { brand: "Madewell", name: "Perfect Vintage Jean", price: 128.00, category: "bottoms", subcategory: "vintage-jeans" },
  { brand: "Jen7", name: "Slim Straight Jeans", price: 109.00, category: "bottoms", subcategory: "slim-straight" },
  { brand: "KUT from the Kloth", name: "Catherine Boyfriend", price: 68.00, category: "bottoms", subcategory: "boyfriend-jeans" },

  // Sweaters & Cardigans (15 products) - $78-$395
  { brand: "Vince", name: "Cashmere Crew Neck", price: 325.00, category: "sweaters", subcategory: "cashmere-sweaters" },
  { brand: "Theory", name: "Wool Blend Sweater", price: 295.00, category: "sweaters", subcategory: "wool-sweaters" },
  { brand: "Autumn Cashmere", name: "High Low Cashmere Sweater", price: 385.00, category: "sweaters", subcategory: "cashmere" },
  { brand: "Eileen Fisher", name: "Organic Cotton Cardigan", price: 178.00, category: "sweaters", subcategory: "cardigans" },
  { brand: "Barefoot Dreams", name: "CozyChic Cardigan", price: 147.00, category: "sweaters", subcategory: "cozy-cardigans" },
  { brand: "Free People", name: "Ottoman Slouchy Tunic", price: 128.00, category: "sweaters", subcategory: "tunics" },
  { brand: "Sanctuary", name: "Turtleneck Sweater", price: 89.00, category: "sweaters", subcategory: "turtlenecks" },
  { brand: "RD Style", name: "Cable Knit Sweater", price: 68.00, category: "sweaters", subcategory: "cable-knit" },
  { brand: "Halogen", name: "V-Neck Cashmere Sweater", price: 149.00, category: "sweaters", subcategory: "v-neck-sweaters" },
  { brand: "Treasure & Bond", name: "Chunky Knit Cardigan", price: 79.00, category: "sweaters", subcategory: "chunky-knit" },
  { brand: "Something Navy", name: "Oversized Sweater", price: 65.00, category: "sweaters", subcategory: "oversized" },
  { brand: "Open Edit", name: "Ribbed Sweater", price: 59.00, category: "sweaters", subcategory: "ribbed" },
  { brand: "Brochu Walker", name: "Layered Pullover", price: 368.00, category: "sweaters", subcategory: "layered-sweaters" },
  { brand: "Joie", name: "Cashmere Turtleneck", price: 298.00, category: "sweaters", subcategory: "cashmere-turtlenecks" },
  { brand: "White + Warren", name: "Essential Cashmere Crew", price: 248.00, category: "sweaters", subcategory: "crew-neck" },

  // Outerwear (10 products) - $148-$598
  { brand: "Moncler", name: "Quilted Puffer Coat", price: 1295.00, category: "outerwear", subcategory: "puffer-coats" },
  { brand: "Canada Goose", name: "Shelburne Parka", price: 995.00, category: "outerwear", subcategory: "parkas" },
  { brand: "Burberry", name: "Heritage Trench Coat", price: 1890.00, category: "outerwear", subcategory: "trench-coats" },
  { brand: "The North Face", name: "Arctic Parka", price: 299.00, category: "outerwear", subcategory: "winter-coats" },
  { brand: "Mackage", name: "Leather Moto Jacket", price: 798.00, category: "outerwear", subcategory: "leather-jackets" },
  { brand: "Vince", name: "Wool Blend Coat", price: 695.00, category: "outerwear", subcategory: "wool-coats" },
  { brand: "Barbour", name: "Beadnell Waxed Jacket", price: 399.00, category: "outerwear", subcategory: "waxed-jackets" },
  { brand: "Cole Haan", name: "Down Puffer Jacket", price: 350.00, category: "outerwear", subcategory: "down-jackets" },
  { brand: "Calvin Klein", name: "Walker Coat", price: 248.00, category: "outerwear", subcategory: "walker-coats" },
  { brand: "Via Spiga", name: "Quilted Jacket", price: 198.00, category: "outerwear", subcategory: "quilted-jackets" }
];

async function populateBloomingdalesData() {
  console.log('🏬 Populating Bloomingdales with sample data...');
  console.log(`📦 Total products to create: ${sampleProducts.length}`);

  let created = 0;
  let errors = 0;

  for (const product of sampleProducts) {
    try {
      // Generate product ID and URL
      const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const productId = `BLOOM-${product.brand.replace(/[^A-Z0-9]/g, '')}-${productSlug}`;
      const imageUrl = `https://images.bloomingdales.com/is/image/BLM/${productId}`;
      const productUrl = `https://www.bloomingdales.com/shop/product/${productSlug}`;

      await pool.query(`
        INSERT INTO bloomingdales_products (
          product_id, product_name, brand_name, current_price,
          original_price, image_url, product_url, category, subcategory,
          is_in_stock, last_scraped_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (product_id) DO UPDATE SET
          product_name = EXCLUDED.product_name,
          current_price = EXCLUDED.current_price
      `, [
        productId,
        product.name,
        product.brand,
        product.price,
        product.price * 1.2, // original price (20% markup)
        imageUrl,
        productUrl,
        product.category,
        product.subcategory,
        true
      ]);

      created++;
      if (created % 10 === 0) {
        console.log(`✅ Created ${created}/${sampleProducts.length} products`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error creating product: ${product.name}`, error.message);
    }
  }

  // Create snapshot
  const avgPrice = sampleProducts.reduce((sum, p) => sum + p.price, 0) / sampleProducts.length;
  await pool.query(`
    INSERT INTO bloomingdales_inventory_snapshots (
      snapshot_date, total_products, in_stock_products, out_of_stock_products, average_price
    ) VALUES (CURRENT_DATE, $1, $2, 0, $3)
    ON CONFLICT (snapshot_date) DO UPDATE SET
      total_products = EXCLUDED.total_products,
      in_stock_products = EXCLUDED.in_stock_products,
      average_price = EXCLUDED.average_price
  `, [created, created, avgPrice]);

  console.log('\n✨ Bloomingdales data population complete!');
  console.log(`📊 Summary:`);
  console.log(`   - Products created: ${created}`);
  console.log(`   - Errors: ${errors}`);
  console.log(`   - Average price: $${avgPrice.toFixed(2)}`);
  console.log(`   - Categories: Dresses, Tops, Jeans/Pants, Sweaters, Outerwear`);
}

populateBloomingdalesData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
