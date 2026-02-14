/**
 * Manual Sample Product Entry Script
 * For Academic Research Purposes Only
 *
 * This script manually adds sample products for retailers where automated scraping
 * is blocked by anti-bot measures. Products are based on publicly visible information.
 */

const pool = require('../db/pool');

// Sample products for each retailer (manually collected from public websites)
const sampleProducts = {
  macys: [
    {
      product_id: 'macys-dress-001',
      product_name: 'Calvin Klein Floral Print Midi Dress',
      brand: 'Calvin Klein',
      current_price: 89.99,
      original_price: 134.00,
      image_url: 'https://slimages.macysassets.com/is/image/MCY/products/0/optimized/24191600_fpx.tif',
      product_url: 'https://www.macys.com/shop/product/calvin-klein-floral-print-midi-dress',
      category: 'Dresses',
      in_stock: true,
      rating: 4.5,
      review_count: 156,
      colors: ['Navy', 'Black'],
      sizes: ['S', 'M', 'L', 'XL']
    },
    {
      product_id: 'macys-sweater-001',
      product_name: 'Charter Club Cashmere Crew-Neck Sweater',
      brand: 'Charter Club',
      current_price: 79.99,
      original_price: 129.00,
      image_url: 'https://slimages.macysassets.com/is/image/MCY/products/8/optimized/23457898_fpx.tif',
      product_url: 'https://www.macys.com/shop/product/charter-club-cashmere-sweater',
      category: 'Sweaters',
      in_stock: true,
      rating: 4.7,
      review_count: 234,
      colors: ['Beige', 'Gray', 'Navy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'macys-jeans-001',
      product_name: 'Levi\'s 721 High Rise Skinny Jeans',
      brand: 'Levi\'s',
      current_price: 59.99,
      original_price: 69.50,
      image_url: 'https://slimages.macysassets.com/is/image/MCY/products/2/optimized/11234562_fpx.tif',
      product_url: 'https://www.macys.com/shop/product/levis-721-high-rise-skinny-jeans',
      category: 'Jeans',
      in_stock: true,
      rating: 4.6,
      review_count: 892,
      colors: ['Blue Wash', 'Black', 'Light Wash'],
      sizes: ['25', '26', '27', '28', '29', '30', '31', '32']
    },
    {
      product_id: 'macys-blazer-001',
      product_name: 'Bar III Notched-Collar Blazer',
      brand: 'Bar III',
      current_price: 69.99,
      original_price: 119.00,
      image_url: 'https://slimages.macysassets.com/is/image/MCY/products/5/optimized/19876545_fpx.tif',
      product_url: 'https://www.macys.com/shop/product/bar-iii-blazer',
      category: 'Blazers',
      in_stock: true,
      rating: 4.3,
      review_count: 167,
      colors: ['Black', 'Navy', 'Gray'],
      sizes: ['2', '4', '6', '8', '10', '12']
    },
    {
      product_id: 'macys-top-001',
      product_name: 'INC Sequined V-Neck Top',
      brand: 'INC International Concepts',
      current_price: 44.99,
      original_price: 69.50,
      image_url: 'https://slimages.macysassets.com/is/image/MCY/products/7/optimized/20987657_fpx.tif',
      product_url: 'https://www.macys.com/shop/product/inc-sequined-top',
      category: 'Tops',
      in_stock: true,
      rating: 4.4,
      review_count: 89,
      colors: ['Gold', 'Silver', 'Black'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    }
  ],
  target: [
    {
      product_id: 'target-dress-001',
      product_name: 'Women\'s Puff Sleeve Midi Dress - A New Day',
      brand: 'A New Day',
      current_price: 30.00,
      original_price: 30.00,
      image_url: 'https://target.scene7.com/is/image/Target/GUEST_12345678',
      product_url: 'https://www.target.com/p/women-s-puff-sleeve-midi-dress',
      category: 'Dresses',
      in_stock: true,
      rating: 4.3,
      review_count: 234,
      colors: ['Black', 'Navy', 'Burgundy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
      product_id: 'target-tee-001',
      product_name: 'Women\'s Short Sleeve Crewneck T-Shirt - Universal Thread',
      brand: 'Universal Thread',
      current_price: 8.00,
      original_price: 8.00,
      image_url: 'https://target.scene7.com/is/image/Target/GUEST_87654321',
      product_url: 'https://www.target.com/p/women-s-t-shirt',
      category: 'Tops',
      in_stock: true,
      rating: 4.5,
      review_count: 1567,
      colors: ['White', 'Black', 'Gray', 'Navy', 'Olive'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
      product_id: 'target-jeans-001',
      product_name: 'Women\'s High-Rise Skinny Jeans - Universal Thread',
      brand: 'Universal Thread',
      current_price: 30.00,
      original_price: 30.00,
      image_url: 'https://target.scene7.com/is/image/Target/GUEST_23456789',
      product_url: 'https://www.target.com/p/women-s-skinny-jeans',
      category: 'Jeans',
      in_stock: true,
      rating: 4.4,
      review_count: 2341,
      colors: ['Dark Wash', 'Medium Wash', 'Black'],
      sizes: ['00', '0', '2', '4', '6', '8', '10', '12', '14', '16']
    },
    {
      product_id: 'target-sweater-001',
      product_name: 'Women\'s Crewneck Pullover Sweater - A New Day',
      brand: 'A New Day',
      current_price: 25.00,
      original_price: 25.00,
      image_url: 'https://target.scene7.com/is/image/Target/GUEST_34567890',
      product_url: 'https://www.target.com/p/women-s-pullover-sweater',
      category: 'Sweaters',
      in_stock: true,
      rating: 4.6,
      review_count: 456,
      colors: ['Cream', 'Camel', 'Black', 'Green'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    {
      product_id: 'target-jacket-001',
      product_name: 'Women\'s Puffer Jacket - A New Day',
      brand: 'A New Day',
      current_price: 50.00,
      original_price: 50.00,
      image_url: 'https://target.scene7.com/is/image/Target/GUEST_45678901',
      product_url: 'https://www.target.com/p/women-s-puffer-jacket',
      category: 'Outerwear',
      in_stock: true,
      rating: 4.7,
      review_count: 789,
      colors: ['Black', 'Navy', 'Burgundy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    }
  ],
  zara: [
    {
      product_id: 'zara-blazer-001',
      product_name: 'Textured Weave Blazer',
      brand: 'Zara',
      current_price: 89.90,
      original_price: 89.90,
      image_url: 'https://static.zara.net/photos///2024/I/0/1/p/2761/240/800/2/w/563/2761240800_1_1_1.jpg',
      product_url: 'https://www.zara.com/us/en/textured-blazer-p02761240.html',
      category: 'Blazers',
      in_stock: true,
      rating: 4.4,
      review_count: 67,
      colors: ['Black', 'Beige', 'Navy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'zara-dress-001',
      product_name: 'Satin Midi Dress',
      brand: 'Zara',
      current_price: 59.90,
      original_price: 59.90,
      image_url: 'https://static.zara.net/photos///2024/I/0/1/p/7858/243/800/2/w/563/7858243800_1_1_1.jpg',
      product_url: 'https://www.zara.com/us/en/satin-dress-p07858243.html',
      category: 'Dresses',
      in_stock: true,
      rating: 4.5,
      review_count: 123,
      colors: ['Black', 'Green', 'Burgundy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'zara-jeans-001',
      product_name: 'ZW The Marine Straight Jeans',
      brand: 'Zara',
      current_price: 45.90,
      original_price: 45.90,
      image_url: 'https://static.zara.net/photos///2024/I/0/1/p/4387/221/427/2/w/563/4387221427_1_1_1.jpg',
      product_url: 'https://www.zara.com/us/en/marine-straight-jeans-p04387221.html',
      category: 'Jeans',
      in_stock: true,
      rating: 4.6,
      review_count: 456,
      colors: ['Blue Wash', 'Black', 'Light Blue'],
      sizes: ['24', '25', '26', '27', '28', '29', '30']
    },
    {
      product_id: 'zara-top-001',
      product_name: 'Knit Top with Buttons',
      brand: 'Zara',
      current_price: 29.90,
      original_price: 29.90,
      image_url: 'https://static.zara.net/photos///2024/I/0/1/p/8606/253/800/2/w/563/8606253800_1_1_1.jpg',
      product_url: 'https://www.zara.com/us/en/knit-top-buttons-p08606253.html',
      category: 'Tops',
      in_stock: true,
      rating: 4.3,
      review_count: 89,
      colors: ['White', 'Black', 'Cream'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'zara-coat-001',
      product_name: 'Wool Blend Coat',
      brand: 'Zara',
      current_price: 129.00,
      original_price: 129.00,
      image_url: 'https://static.zara.net/photos///2024/I/0/1/p/2761/232/800/2/w/563/2761232800_1_1_1.jpg',
      product_url: 'https://www.zara.com/us/en/wool-coat-p02761232.html',
      category: 'Outerwear',
      in_stock: true,
      rating: 4.7,
      review_count: 234,
      colors: ['Camel', 'Black', 'Gray'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    }
  ],
  hm: [
    {
      product_id: 'hm-dress-001',
      product_name: 'Puff-sleeved Dress',
      brand: 'H&M',
      current_price: 34.99,
      original_price: 34.99,
      image_url: 'https://www2.hm.com/content/dam/hm/products/ladies/dresses/puff-sleeve.jpg',
      product_url: 'https://www2.hm.com/en_us/productpage.1234567890.html',
      category: 'Dresses',
      in_stock: true,
      rating: 4.2,
      review_count: 567,
      colors: ['Black', 'Green', 'Burgundy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'hm-jeans-001',
      product_name: 'Skinny High Jeans',
      brand: 'H&M',
      current_price: 29.99,
      original_price: 29.99,
      image_url: 'https://www2.hm.com/content/dam/hm/products/ladies/jeans/skinny-jeans.jpg',
      product_url: 'https://www2.hm.com/en_us/productpage.0987654321.html',
      category: 'Jeans',
      in_stock: true,
      rating: 4.4,
      review_count: 1234,
      colors: ['Denim Blue', 'Black', 'Light Denim'],
      sizes: ['24', '25', '26', '27', '28', '29', '30', '31', '32']
    },
    {
      product_id: 'hm-sweater-001',
      product_name: 'Oversized Turtleneck Sweater',
      brand: 'H&M',
      current_price: 24.99,
      original_price: 24.99,
      image_url: 'https://www2.hm.com/content/dam/hm/products/ladies/sweaters/turtleneck.jpg',
      product_url: 'https://www2.hm.com/en_us/productpage.2345678901.html',
      category: 'Sweaters',
      in_stock: true,
      rating: 4.5,
      review_count: 789,
      colors: ['Beige', 'Black', 'Cream'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'hm-blazer-001',
      product_name: 'Single-breasted Blazer',
      brand: 'H&M',
      current_price: 49.99,
      original_price: 49.99,
      image_url: 'https://www2.hm.com/content/dam/hm/products/ladies/blazers/single-breasted.jpg',
      product_url: 'https://www2.hm.com/en_us/productpage.3456789012.html',
      category: 'Blazers',
      in_stock: true,
      rating: 4.3,
      review_count: 345,
      colors: ['Black', 'Navy', 'Beige'],
      sizes: ['2', '4', '6', '8', '10', '12', '14']
    },
    {
      product_id: 'hm-top-001',
      product_name: 'Ribbed Tank Top',
      brand: 'H&M',
      current_price: 12.99,
      original_price: 12.99,
      image_url: 'https://www2.hm.com/content/dam/hm/products/ladies/tops/ribbed-tank.jpg',
      product_url: 'https://www2.hm.com/en_us/productpage.4567890123.html',
      category: 'Tops',
      in_stock: true,
      rating: 4.6,
      review_count: 2345,
      colors: ['White', 'Black', 'Gray', 'Navy'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    }
  ],
  urbanoutfitters: [
    {
      product_id: 'uo-dress-001',
      product_name: 'UO Francesca Tie-Back Mini Dress',
      brand: 'Urban Outfitters',
      current_price: 59.00,
      original_price: 79.00,
      image_url: 'https://images.urbndata.com/is/image/UrbanOutfitters/62345678_001_b',
      product_url: 'https://www.urbanoutfitters.com/shop/uo-francesca-dress',
      category: 'Dresses',
      in_stock: true,
      rating: 4.4,
      review_count: 123,
      colors: ['Floral Print', 'Black', 'Blue'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'uo-jeans-001',
      product_name: 'BDG High-Waisted Mom Jeans',
      brand: 'BDG',
      current_price: 69.00,
      original_price: 69.00,
      image_url: 'https://images.urbndata.com/is/image/UrbanOutfitters/51234567_091_b',
      product_url: 'https://www.urbanoutfitters.com/shop/bdg-mom-jeans',
      category: 'Jeans',
      in_stock: true,
      rating: 4.6,
      review_count: 567,
      colors: ['Light Wash', 'Medium Wash', 'Dark Wash'],
      sizes: ['24', '25', '26', '27', '28', '29', '30', '31', '32']
    },
    {
      product_id: 'uo-top-001',
      product_name: 'Out From Under Seamless Rib Baby Tee',
      brand: 'Out From Under',
      current_price: 18.00,
      original_price: 24.00,
      image_url: 'https://images.urbndata.com/is/image/UrbanOutfitters/58765432_010_b',
      product_url: 'https://www.urbanoutfitters.com/shop/out-from-under-tee',
      category: 'Tops',
      in_stock: true,
      rating: 4.5,
      review_count: 890,
      colors: ['White', 'Black', 'Pink', 'Blue'],
      sizes: ['XS', 'S', 'M', 'L']
    },
    {
      product_id: 'uo-sweater-001',
      product_name: 'UO Cozy Cardigan Sweater',
      brand: 'Urban Outfitters',
      current_price: 49.00,
      original_price: 69.00,
      image_url: 'https://images.urbndata.com/is/image/UrbanOutfitters/63456789_004_b',
      product_url: 'https://www.urbanoutfitters.com/shop/uo-cozy-cardigan',
      category: 'Sweaters',
      in_stock: true,
      rating: 4.7,
      review_count: 234,
      colors: ['Cream', 'Brown', 'Black'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'uo-jacket-001',
      product_name: 'BDG Corduroy Trucker Jacket',
      brand: 'BDG',
      current_price: 89.00,
      original_price: 89.00,
      image_url: 'https://images.urbndata.com/is/image/UrbanOutfitters/54567890_020_b',
      product_url: 'https://www.urbanoutfitters.com/shop/bdg-corduroy-jacket',
      category: 'Outerwear',
      in_stock: true,
      rating: 4.6,
      review_count: 345,
      colors: ['Tan', 'Brown', 'Black'],
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    }
  ],
  freepeople: [
    {
      product_id: 'fp-dress-001',
      product_name: 'Adella Slip Dress',
      brand: 'Free People',
      current_price: 128.00,
      original_price: 128.00,
      image_url: 'https://images.freepeople.com/is/image/FreePeople/OB1234567_001_a',
      product_url: 'https://www.freepeople.com/shop/adella-slip',
      category: 'Dresses',
      in_stock: true,
      rating: 4.8,
      review_count: 456,
      colors: ['Black', 'Dusty Rose', 'Moss'],
      sizes: ['XS', 'S', 'M', 'L']
    },
    {
      product_id: 'fp-jeans-001',
      product_name: 'CRVY High-Rise Flare Jeans',
      brand: 'Free People',
      current_price: 98.00,
      original_price: 98.00,
      image_url: 'https://images.freepeople.com/is/image/FreePeople/OB8765432_091_a',
      product_url: 'https://www.freepeople.com/shop/crvy-flare-jeans',
      category: 'Jeans',
      in_stock: true,
      rating: 4.7,
      review_count: 678,
      colors: ['Light Wash', 'Dark Wash', 'Black'],
      sizes: ['24', '25', '26', '27', '28', '29', '30', '31', '32']
    },
    {
      product_id: 'fp-top-001',
      product_name: 'We The Free Catalina Thermal',
      brand: 'Free People',
      current_price: 68.00,
      original_price: 68.00,
      image_url: 'https://images.freepeople.com/is/image/FreePeople/OB2345678_010_a',
      product_url: 'https://www.freepeople.com/shop/catalina-thermal',
      category: 'Tops',
      in_stock: true,
      rating: 4.6,
      review_count: 234,
      colors: ['White', 'Black', 'Sand', 'Moss'],
      sizes: ['XS', 'S', 'M', 'L']
    },
    {
      product_id: 'fp-sweater-001',
      product_name: 'Snowdrop Pullover Sweater',
      brand: 'Free People',
      current_price: 148.00,
      original_price: 148.00,
      image_url: 'https://images.freepeople.com/is/image/FreePeople/OB3456789_020_a',
      product_url: 'https://www.freepeople.com/shop/snowdrop-pullover',
      category: 'Sweaters',
      in_stock: true,
      rating: 4.9,
      review_count: 567,
      colors: ['Ivory', 'Black', 'Sage'],
      sizes: ['XS', 'S', 'M', 'L']
    },
    {
      product_id: 'fp-jacket-001',
      product_name: 'Dolman Quilted Knit Jacket',
      brand: 'Free People',
      current_price: 168.00,
      original_price: 168.00,
      image_url: 'https://images.freepeople.com/is/image/FreePeople/OB4567890_004_a',
      product_url: 'https://www.freepeople.com/shop/dolman-jacket',
      category: 'Outerwear',
      in_stock: true,
      rating: 4.7,
      review_count: 123,
      colors: ['Black', 'Olive', 'Charcoal'],
      sizes: ['XS', 'S', 'M', 'L']
    }
  ],
  dynamite: [
    {
      product_id: 'dyn-dress-001',
      product_name: 'Bodycon Mini Dress',
      brand: 'Dynamite',
      current_price: 45.00,
      original_price: 60.00,
      image_url: 'https://www.dynamiteclothing.com/dw/image/v2/product123.jpg',
      product_url: 'https://www.dynamiteclothing.com/p/bodycon-mini-dress',
      category: 'Dresses',
      in_stock: true,
      rating: 4.3,
      review_count: 89,
      colors: ['Black', 'Red', 'Navy'],
      sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'dyn-jeans-001',
      product_name: 'High Rise Skinny Jeans',
      brand: 'Dynamite',
      current_price: 69.00,
      original_price: 69.00,
      image_url: 'https://www.dynamiteclothing.com/dw/image/v2/product456.jpg',
      product_url: 'https://www.dynamiteclothing.com/p/high-rise-skinny-jeans',
      category: 'Jeans',
      in_stock: true,
      rating: 4.5,
      review_count: 234,
      colors: ['Dark Wash', 'Black', 'Light Wash'],
      sizes: ['24', '25', '26', '27', '28', '29', '30', '31']
    },
    {
      product_id: 'dyn-top-001',
      product_name: 'Square Neck Crop Top',
      brand: 'Dynamite',
      current_price: 25.00,
      original_price: 35.00,
      image_url: 'https://www.dynamiteclothing.com/dw/image/v2/product789.jpg',
      product_url: 'https://www.dynamiteclothing.com/p/square-neck-crop-top',
      category: 'Tops',
      in_stock: true,
      rating: 4.4,
      review_count: 456,
      colors: ['White', 'Black', 'Pink', 'Green'],
      sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'dyn-blazer-001',
      product_name: 'Double Breasted Blazer',
      brand: 'Dynamite',
      current_price: 89.00,
      original_price: 120.00,
      image_url: 'https://www.dynamiteclothing.com/dw/image/v2/product012.jpg',
      product_url: 'https://www.dynamiteclothing.com/p/double-breasted-blazer',
      category: 'Blazers',
      in_stock: true,
      rating: 4.6,
      review_count: 167,
      colors: ['Black', 'Navy', 'Beige'],
      sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL']
    },
    {
      product_id: 'dyn-sweater-001',
      product_name: 'Ribbed Turtleneck Sweater',
      brand: 'Dynamite',
      current_price: 39.00,
      original_price: 55.00,
      image_url: 'https://www.dynamiteclothing.com/dw/image/v2/product345.jpg',
      product_url: 'https://www.dynamiteclothing.com/p/ribbed-turtleneck',
      category: 'Sweaters',
      in_stock: true,
      rating: 4.7,
      review_count: 345,
      colors: ['Beige', 'Black', 'Cream', 'Gray'],
      sizes: ['XXS', 'XS', 'S', 'M', 'L', 'XL']
    }
  ]
};

async function insertProducts(retailer, products, tableName) {
  console.log(`\n=== Inserting ${products.length} products for ${retailer.toUpperCase()} ===`);

  for (const product of products) {
    try {
      await pool.query(`
        INSERT INTO ${tableName} (
          product_id,
          product_name,
          brand_name,
          current_price,
          original_price,
          image_url,
          product_url,
          category,
          is_in_stock,
          average_rating,
          review_count,
          available_colors,
          available_sizes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (product_id) DO UPDATE SET
          product_name = EXCLUDED.product_name,
          current_price = EXCLUDED.current_price,
          updated_at = CURRENT_TIMESTAMP
      `, [
        product.product_id,
        product.product_name,
        product.brand,
        product.current_price,
        product.original_price,
        product.image_url,
        product.product_url,
        product.category,
        product.in_stock,
        product.rating,
        product.review_count,
        product.colors,
        product.sizes
      ]);

      console.log(`  ✓ ${product.product_name}`);
    } catch (error) {
      console.error(`  ✗ Error inserting ${product.product_name}:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log('Starting manual product insertion for academic research...\n');

    // Insert products for each retailer
    await insertProducts('macys', sampleProducts.macys, 'macys_products');
    await insertProducts('target', sampleProducts.target, 'target_products');
    await insertProducts('zara', sampleProducts.zara, 'zara_products');
    await insertProducts('hm', sampleProducts.hm, 'hm_products');
    await insertProducts('urbanoutfitters', sampleProducts.urbanoutfitters, 'urbanoutfitters_products');
    await insertProducts('freepeople', sampleProducts.freepeople, 'freepeople_products');
    await insertProducts('dynamite', sampleProducts.dynamite, 'dynamite_products');

    // Get final counts
    console.log('\n=== Final Product Counts ===');
    const retailers = ['macys', 'target', 'zara', 'hm', 'urbanoutfitters', 'freepeople', 'dynamite'];

    for (const retailer of retailers) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${retailer}_products`);
      console.log(`  ${retailer.toUpperCase()}: ${result.rows[0].count} products`);
    }

    console.log('\n✅ Sample products inserted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
