/**
 * Demo product data for testing without database
 */

export interface DemoProduct {
  id: number;
  brand_id: number;
  brand_name: string;
  brand_slug: string;
  brand_logo: string | null;
  brand_website: string | null;
  canonical_name: string;
  description: string;
  category: string;
  subcategory: string | null;
  gender: string | null;
  primary_image_url: string;
  additional_images: string[] | null;
  listings: Array<{
    id: number;
    retailer_id: number;
    retailer_name: string;
    retailer_logo: string | null;
    product_url: string;
    affiliate_url: string | null;
    price: number;
    sale_price: number | null;
    currency: string;
    in_stock: boolean;
    sizes_available: string[] | null;
    colors_available: string[] | null;
    last_scraped_at: string;
  }>;
  attributes: any;
  best_price: number | null;
  listing_count: number;
  is_favorited?: boolean;
}

export const demoProducts: Record<string, DemoProduct> = {
  '101': {
    id: 101,
    brand_id: 1,
    brand_name: 'Target',
    brand_slug: 'target',
    brand_logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png',
    brand_website: 'https://www.target.com',
    canonical_name: 'Oversized Cardigan',
    description: 'Cozy oversized cardigan perfect for layering. Features a relaxed fit, soft knit fabric, and classic button closure. Perfect for casual days and cool evenings.',
    category: 'Clothing',
    subcategory: 'Sweaters',
    gender: 'Women',
    primary_image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
    ],
    listings: [
      {
        id: 1,
        retailer_id: 1,
        retailer_name: 'Target',
        retailer_logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png',
        product_url: 'https://www.target.com',
        affiliate_url: null,
        price: 34.99,
        sale_price: null,
        currency: 'USD',
        in_stock: true,
        sizes_available: ['XS', 'S', 'M', 'L', 'XL'],
        colors_available: ['Beige', 'Black', 'Navy'],
        last_scraped_at: new Date().toISOString(),
      },
    ],
    attributes: {},
    best_price: 34.99,
    listing_count: 1,
  },
  '102': {
    id: 102,
    brand_id: 1,
    brand_name: 'Target',
    brand_slug: 'target',
    brand_logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png',
    brand_website: 'https://www.target.com',
    canonical_name: 'Graphic Tee',
    description: 'Modern graphic tee with a cool vintage-inspired design. Made from soft, breathable cotton. Perfect for everyday wear with jeans or shorts.',
    category: 'Clothing',
    subcategory: 'T-Shirts',
    gender: 'Unisex',
    primary_image_url: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800',
    ],
    listings: [
      {
        id: 2,
        retailer_id: 1,
        retailer_name: 'Target',
        retailer_logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png',
        product_url: 'https://www.target.com',
        affiliate_url: null,
        price: 12.99,
        sale_price: null,
        currency: 'USD',
        in_stock: true,
        sizes_available: ['S', 'M', 'L', 'XL'],
        colors_available: ['White', 'Black', 'Grey'],
        last_scraped_at: new Date().toISOString(),
      },
    ],
    attributes: {},
    best_price: 12.99,
    listing_count: 1,
  },
  '103': {
    id: 103,
    brand_id: 1,
    brand_name: 'Target',
    brand_slug: 'target',
    brand_logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png',
    brand_website: 'https://www.target.com',
    canonical_name: 'Wide Leg Pants',
    description: 'Flattering wide leg pants with a high waist and relaxed fit. Made from lightweight, flowy fabric. Perfect for both casual and dressed-up occasions.',
    category: 'Clothing',
    subcategory: 'Pants',
    gender: 'Women',
    primary_image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
    ],
    listings: [
      {
        id: 3,
        retailer_id: 1,
        retailer_name: 'Target',
        retailer_logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png',
        product_url: 'https://www.target.com',
        affiliate_url: null,
        price: 29.99,
        sale_price: 24.99,
        currency: 'USD',
        in_stock: true,
        sizes_available: ['XS', 'S', 'M', 'L'],
        colors_available: ['Black', 'Cream', 'Navy'],
        last_scraped_at: new Date().toISOString(),
      },
    ],
    attributes: {},
    best_price: 24.99,
    listing_count: 1,
  },
  '201': {
    id: 201,
    brand_id: 2,
    brand_name: 'Nordstrom',
    brand_slug: 'nordstrom',
    brand_logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp',
    brand_website: 'https://www.nordstrom.com',
    canonical_name: 'Ribbed Knit Dress',
    description: 'Elegant ribbed knit dress with a flattering silhouette. Features a midi length, bodycon fit, and stretchy fabric. Perfect for date nights or special occasions.',
    category: 'Clothing',
    subcategory: 'Dresses',
    gender: 'Women',
    primary_image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800',
    ],
    listings: [
      {
        id: 4,
        retailer_id: 2,
        retailer_name: 'Nordstrom',
        retailer_logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp',
        product_url: 'https://www.nordstrom.com',
        affiliate_url: null,
        price: 78.00,
        sale_price: null,
        currency: 'USD',
        in_stock: true,
        sizes_available: ['XS', 'S', 'M', 'L', 'XL'],
        colors_available: ['Black', 'Burgundy', 'Emerald'],
        last_scraped_at: new Date().toISOString(),
      },
      {
        id: 5,
        retailer_id: 3,
        retailer_name: 'Macy\'s',
        retailer_logo: null,
        product_url: 'https://www.macys.com',
        affiliate_url: null,
        price: 82.00,
        sale_price: null,
        currency: 'USD',
        in_stock: true,
        sizes_available: ['S', 'M', 'L'],
        colors_available: ['Black'],
        last_scraped_at: new Date().toISOString(),
      },
    ],
    attributes: {},
    best_price: 78.00,
    listing_count: 2,
  },
  '202': {
    id: 202,
    brand_id: 2,
    brand_name: 'Nordstrom',
    brand_slug: 'nordstrom',
    brand_logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp',
    brand_website: 'https://www.nordstrom.com',
    canonical_name: 'Leather Loafers',
    description: 'Classic leather loafers with a modern twist. Handcrafted from premium leather with cushioned insoles for all-day comfort. A versatile wardrobe staple.',
    category: 'Shoes',
    subcategory: 'Loafers',
    gender: 'Unisex',
    primary_image_url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800',
    ],
    listings: [
      {
        id: 6,
        retailer_id: 2,
        retailer_name: 'Nordstrom',
        retailer_logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp',
        product_url: 'https://www.nordstrom.com',
        affiliate_url: null,
        price: 129.00,
        sale_price: 99.00,
        currency: 'USD',
        in_stock: true,
        sizes_available: ['7', '8', '9', '10', '11'],
        colors_available: ['Black', 'Brown', 'Tan'],
        last_scraped_at: new Date().toISOString(),
      },
    ],
    attributes: {},
    best_price: 99.00,
    listing_count: 1,
  },
  '203': {
    id: 203,
    brand_id: 2,
    brand_name: 'Nordstrom',
    brand_slug: 'nordstrom',
    brand_logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp',
    brand_website: 'https://www.nordstrom.com',
    canonical_name: 'Wool Blazer',
    description: 'Timeless wool blazer with a tailored fit. Features notch lapels, single-button closure, and functional pockets. Perfect for the office or formal events.',
    category: 'Clothing',
    subcategory: 'Blazers',
    gender: 'Women',
    primary_image_url: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800',
    additional_images: [
      'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800',
    ],
    listings: [
      {
        id: 7,
        retailer_id: 2,
        retailer_name: 'Nordstrom',
        retailer_logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp',
        product_url: 'https://www.nordstrom.com',
        affiliate_url: null,
        price: 198.00,
        sale_price: null,
        currency: 'USD',
        in_stock: true,
        sizes_available: ['XS', 'S', 'M', 'L'],
        colors_available: ['Black', 'Navy', 'Charcoal'],
        last_scraped_at: new Date().toISOString(),
      },
      {
        id: 8,
        retailer_id: 4,
        retailer_name: 'Bloomingdale\'s',
        retailer_logo: null,
        product_url: 'https://www.bloomingdales.com',
        affiliate_url: null,
        price: 215.00,
        sale_price: null,
        currency: 'USD',
        in_stock: false,
        sizes_available: null,
        colors_available: null,
        last_scraped_at: new Date().toISOString(),
      },
    ],
    attributes: {},
    best_price: 198.00,
    listing_count: 2,
  },
};

export const demoReviews: Record<string, any> = {
  '101': {
    summary: {
      total_reviews: 12,
      rating: 4.5,
      count_5: 8,
      count_4: 3,
      count_3: 1,
      count_2: 0,
      count_1: 0,
    },
    reviews: [
      {
        id: 1,
        rating: 5,
        title: 'Perfect for Fall!',
        body: 'This cardigan is so soft and cozy! The oversized fit is exactly what I was looking for. It goes perfectly with jeans and boots.',
        helpful_count: 5,
        created_at: '2024-10-15T14:30:00Z',
        source_retailer: 'Target',
        source_url: null,
        reviewer_name: 'Sarah M.',
      },
      {
        id: 2,
        rating: 4,
        title: 'Great quality, runs large',
        body: 'Love the quality of this cardigan, but it definitely runs large. I would recommend sizing down if you want a less oversized fit.',
        helpful_count: 3,
        created_at: '2024-10-10T09:15:00Z',
        source_retailer: null,
        source_url: null,
        reviewer_name: 'Jessica K.',
      },
      {
        id: 3,
        rating: 5,
        title: 'Obsessed!',
        body: 'I bought this in all three colors! So comfortable and versatile. Perfect for layering.',
        helpful_count: 8,
        created_at: '2024-10-05T16:45:00Z',
        source_retailer: null,
        source_url: null,
        reviewer_name: 'Amanda R.',
      },
    ],
  },
  '201': {
    summary: {
      total_reviews: 28,
      rating: 4.7,
      count_5: 20,
      count_4: 6,
      count_3: 2,
      count_2: 0,
      count_1: 0,
    },
    reviews: [
      {
        id: 4,
        rating: 5,
        title: 'Stunning dress!',
        body: 'This dress is absolutely beautiful! The ribbed knit hugs in all the right places and the quality is amazing. Worth every penny.',
        helpful_count: 12,
        created_at: '2024-11-01T10:20:00Z',
        source_retailer: 'Nordstrom',
        source_url: null,
        reviewer_name: 'Emily P.',
      },
      {
        id: 5,
        rating: 5,
        title: 'Perfect for date night',
        body: 'Wore this on a date and received so many compliments! Super flattering and comfortable.',
        helpful_count: 7,
        created_at: '2024-10-28T18:30:00Z',
        source_retailer: null,
        source_url: null,
        reviewer_name: 'Rachel S.',
      },
    ],
  },
};

export function getDemoProduct(id: string): DemoProduct | null {
  // If we have specific demo data for this ID, return it
  if (demoProducts[id]) {
    return demoProducts[id];
  }

  // Otherwise, generate a generic demo product for any ID
  const productImages = [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800',
    'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
    'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800',
  ];

  const productNames = [
    'Stylish Oversized Blazer',
    'Classic Cotton T-Shirt',
    'High-Waisted Denim Jeans',
    'Cozy Knit Sweater',
    'Leather Ankle Boots',
    'Silk Midi Dress',
    'Wool Trench Coat',
    'Casual Linen Shirt',
  ];

  const categories = ['Clothing', 'Shoes', 'Accessories'];
  const subcategories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Footwear'];
  const brands = [
    { id: 1, name: 'Target', slug: 'target', logo: 'https://corporate.target.com/_media/TargetCorp/news/2017/bullseye-logo.png' },
    { id: 2, name: 'Nordstrom', slug: 'nordstrom', logo: 'https://logowik.com/content/uploads/images/nordstrom1639.logowik.com.webp' },
    { id: 3, name: 'Macy\'s', slug: 'macys', logo: null },
  ];

  // Use the ID to consistently generate the same product for the same ID
  const hash = parseInt(id) || id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageIndex = hash % productImages.length;
  const nameIndex = hash % productNames.length;
  const categoryIndex = hash % categories.length;
  const subcategoryIndex = hash % subcategories.length;
  const brandIndex = hash % brands.length;
  const brand = brands[brandIndex];
  const price = 19.99 + (hash % 180);

  return {
    id: parseInt(id) || hash,
    brand_id: brand.id,
    brand_name: brand.name,
    brand_slug: brand.slug,
    brand_logo: brand.logo,
    brand_website: `https://www.${brand.slug}.com`,
    canonical_name: productNames[nameIndex],
    description: `A versatile and stylish addition to your wardrobe. This ${productNames[nameIndex].toLowerCase()} features premium materials and a modern design that works for any occasion. Perfect for everyday wear or special events.`,
    category: categories[categoryIndex],
    subcategory: subcategories[subcategoryIndex],
    gender: hash % 2 === 0 ? 'Women' : 'Unisex',
    primary_image_url: productImages[imageIndex],
    additional_images: [
      productImages[imageIndex],
      productImages[(imageIndex + 1) % productImages.length],
    ],
    listings: [
      {
        id: hash,
        retailer_id: brand.id,
        retailer_name: brand.name,
        retailer_logo: brand.logo,
        product_url: `https://www.${brand.slug}.com`,
        affiliate_url: null,
        price: price,
        sale_price: hash % 3 === 0 ? price * 0.8 : null,
        currency: 'USD',
        in_stock: true,
        sizes_available: ['XS', 'S', 'M', 'L', 'XL'],
        colors_available: ['Black', 'White', 'Navy'],
        last_scraped_at: new Date().toISOString(),
      },
    ],
    attributes: {},
    best_price: hash % 3 === 0 ? price * 0.8 : price,
    listing_count: 1,
  };
}

export function getDemoReviews(id: string) {
  // If we have specific demo reviews for this ID, return them
  if (demoReviews[id]) {
    return demoReviews[id];
  }

  // Otherwise, generate generic demo reviews
  const hash = parseInt(id) || id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const totalReviews = 5 + (hash % 25);
  const rating = 3.5 + (hash % 15) / 10;

  const reviewTitles = [
    'Love it!',
    'Great quality',
    'Perfect fit',
    'Highly recommend',
    'Exactly as described',
    'Good value',
    'Nice purchase',
  ];

  const reviewBodies = [
    'This product exceeded my expectations! The quality is fantastic and it looks even better in person.',
    'Really happy with this purchase. It fits perfectly and the material is high quality.',
    'Great addition to my wardrobe. I get compliments every time I wear it!',
    'Exactly what I was looking for. Fast shipping and excellent quality.',
    'Good quality for the price. Would definitely buy again.',
  ];

  const reviewerNames = [
    'Sarah M.',
    'Jessica K.',
    'Amanda R.',
    'Emily P.',
    'Rachel S.',
    'Lauren B.',
    'Michelle T.',
  ];

  return {
    summary: {
      total_reviews: totalReviews,
      rating: rating,
      count_5: Math.floor(totalReviews * 0.6),
      count_4: Math.floor(totalReviews * 0.25),
      count_3: Math.floor(totalReviews * 0.1),
      count_2: Math.floor(totalReviews * 0.03),
      count_1: Math.floor(totalReviews * 0.02),
    },
    reviews: [
      {
        id: hash,
        rating: 5,
        title: reviewTitles[hash % reviewTitles.length],
        body: reviewBodies[hash % reviewBodies.length],
        helpful_count: 3 + (hash % 10),
        created_at: new Date(Date.now() - (hash % 30) * 24 * 60 * 60 * 1000).toISOString(),
        source_retailer: null,
        source_url: null,
        reviewer_name: reviewerNames[hash % reviewerNames.length],
      },
      {
        id: hash + 1,
        rating: 4,
        title: reviewTitles[(hash + 1) % reviewTitles.length],
        body: reviewBodies[(hash + 1) % reviewBodies.length],
        helpful_count: 1 + (hash % 5),
        created_at: new Date(Date.now() - (hash % 45) * 24 * 60 * 60 * 1000).toISOString(),
        source_retailer: null,
        source_url: null,
        reviewer_name: reviewerNames[(hash + 1) % reviewerNames.length],
      },
      {
        id: hash + 2,
        rating: 5,
        title: reviewTitles[(hash + 2) % reviewTitles.length],
        body: reviewBodies[(hash + 2) % reviewBodies.length],
        helpful_count: 5 + (hash % 8),
        created_at: new Date(Date.now() - (hash % 60) * 24 * 60 * 60 * 1000).toISOString(),
        source_retailer: null,
        source_url: null,
        reviewer_name: reviewerNames[(hash + 2) % reviewerNames.length],
      },
    ],
  };
}

// Campaign demo data
export interface DemoCampaignItem {
  id: string;
  name: string;
  brand_name?: string;
  price: number;
  sale_price?: number;
  image_url: string;
  categories?: string[];
}

export interface DemoCampaign {
  id: string;
  title: string;
  subtitle?: string;
  gradient?: string;
  image_url?: string;
  video_url?: string;
  items: DemoCampaignItem[];
}

// Helper function to generate additional campaign items
function generateCampaignItems(baseItems: DemoCampaignItem[], targetCount: number = 40): DemoCampaignItem[] {
  const items = [...baseItems];
  const brands = ['Target', 'Nordstrom', 'H&M', 'Zara', 'Macy\'s', 'J.Crew'];

  const productNames = [
    'Cashmere Sweater', 'Silk Blouse', 'Denim Jacket', 'Leather Boots', 'Cotton T-Shirt',
    'Wool Coat', 'Midi Skirt', 'Blazer', 'Ankle Boots', 'Knit Cardigan',
    'Maxi Dress', 'Trench Coat', 'Sneakers', 'Loafers', 'Handbag',
    'Crossbody Bag', 'Tote Bag', 'Belt', 'Scarf', 'Sunglasses',
    'Watch', 'Earrings', 'Necklace', 'Bracelet', 'Ring',
    'Hat', 'Gloves', 'Socks', 'Tights', 'Leggings',
    'Joggers', 'Sweatshirt', 'Hoodie', 'Tank Top', 'Camisole',
    'Bodysuit', 'Jumpsuit', 'Romper', 'Kimono', 'Poncho',
    'Vest', 'Puffer Jacket', 'Bomber Jacket', 'Peacoat', 'Parka'
  ];

  const images = [
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
    'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800',
    'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800',
    'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800',
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800',
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800',
    'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800',
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
    'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800',
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800',
    'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
    'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=800',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800',
    'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
    'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800'
  ];

  while (items.length < targetCount) {
    const index = items.length;
    const price = 15 + Math.floor(Math.random() * 185);
    const hasSale = Math.random() > 0.7;

    items.push({
      id: `campaign-${index + 1000}`,
      name: productNames[index % productNames.length],
      brand_name: brands[index % brands.length],
      price: price,
      sale_price: hasSale ? Math.floor(price * 0.75) : undefined,
      image_url: images[index % images.length],
      categories: ['Fashion', 'Apparel'],
    });
  }

  return items;
}

export const demoCampaigns: Record<string, DemoCampaign> = {
  '1': {
    id: '1',
    title: 'Winter Collection 2024',
    subtitle: "Discover the season's must-haves",
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
    items: generateCampaignItems([
      {
        id: '101',
        name: 'Oversized Cardigan',
        brand_name: 'Target',
        price: 34.99,
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800',
        categories: ['Sweaters', 'Outerwear'],
      },
      {
        id: '203',
        name: 'Wool Blazer',
        brand_name: 'Nordstrom',
        price: 198.00,
        image_url: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800',
        categories: ['Blazers', 'Workwear'],
      },
      {
        id: '301',
        name: 'Cashmere Scarf',
        brand_name: 'Target',
        price: 45.00,
        image_url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800',
        categories: ['Accessories', 'Winter'],
      },
      {
        id: '302',
        name: 'Knit Beanie',
        brand_name: 'Nordstrom',
        price: 28.00,
        sale_price: 19.99,
        image_url: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800',
        categories: ['Accessories', 'Hats'],
      },
      {
        id: '303',
        name: 'Ankle Boots',
        brand_name: 'Target',
        price: 79.99,
        image_url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800',
        categories: ['Shoes', 'Boots'],
      },
      {
        id: '304',
        name: 'Turtleneck Sweater',
        brand_name: 'Nordstrom',
        price: 65.00,
        image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800',
        categories: ['Sweaters', 'Tops'],
      },
    ], 40),
  },
  '2': {
    id: '2',
    title: 'Spring Refresh',
    subtitle: 'Fresh styles for the new season',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200',
    items: generateCampaignItems([
      {
        id: '103',
        name: 'Wide Leg Pants',
        brand_name: 'Target',
        price: 29.99,
        sale_price: 24.99,
        image_url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
        categories: ['Pants', 'Bottoms'],
      },
      {
        id: '201',
        name: 'Ribbed Knit Dress',
        brand_name: 'Nordstrom',
        price: 78.00,
        image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
        categories: ['Dresses', 'Spring'],
      },
      {
        id: '102',
        name: 'Graphic Tee',
        brand_name: 'Target',
        price: 12.99,
        image_url: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800',
        categories: ['T-Shirts', 'Casual'],
      },
      {
        id: '305',
        name: 'Linen Shirt',
        brand_name: 'Nordstrom',
        price: 55.00,
        image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
        categories: ['Shirts', 'Linen'],
      },
      {
        id: '306',
        name: 'Floral Midi Skirt',
        brand_name: 'Target',
        price: 38.00,
        image_url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800',
        categories: ['Skirts', 'Spring'],
      },
      {
        id: '307',
        name: 'Canvas Sneakers',
        brand_name: 'Target',
        price: 32.00,
        sale_price: 24.99,
        image_url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800',
        categories: ['Shoes', 'Sneakers'],
      },
    ], 40),
  },
  '3': {
    id: '3',
    title: 'Sustainable Style',
    subtitle: 'Shop eco-friendly fashion',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
    items: generateCampaignItems([
      {
        id: '202',
        name: 'Leather Loafers',
        brand_name: 'Nordstrom',
        price: 129.00,
        sale_price: 99.00,
        image_url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800',
        categories: ['Shoes', 'Loafers'],
      },
      {
        id: '308',
        name: 'Organic Cotton Tote',
        brand_name: 'Target',
        price: 22.00,
        image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
        categories: ['Bags', 'Sustainable'],
      },
      {
        id: '309',
        name: 'Recycled Denim Jacket',
        brand_name: 'Nordstrom',
        price: 89.00,
        image_url: 'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=800',
        categories: ['Jackets', 'Denim'],
      },
      {
        id: '310',
        name: 'Bamboo T-Shirt',
        brand_name: 'Target',
        price: 18.00,
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
        categories: ['T-Shirts', 'Sustainable'],
      },
      {
        id: '311',
        name: 'Hemp Blend Pants',
        brand_name: 'Nordstrom',
        price: 72.00,
        sale_price: 59.99,
        image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800',
        categories: ['Pants', 'Sustainable'],
      },
      {
        id: '312',
        name: 'Cork Sandals',
        brand_name: 'Target',
        price: 42.00,
        image_url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800',
        categories: ['Shoes', 'Sandals'],
      },
    ], 40),
  },
};

export function getDemoCampaign(id: string): DemoCampaign | null {
  return demoCampaigns[id] || null;
}

/**
 * Get demo similar items for a product
 */
export function getDemoSimilarItems(productId: string, limit: number = 16) {
  const currentProduct = getDemoProduct(productId);

  // Get all demo product IDs
  const allIds = ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110'];

  // Filter out the current product
  const otherIds = allIds.filter(id => id !== productId);

  // If we have a current product with a category, prioritize same category
  let similarIds = otherIds;
  if (currentProduct?.category) {
    const sameCategoryIds = otherIds.filter(id => {
      const product = getDemoProduct(id);
      return product?.category === currentProduct.category;
    });

    // Mix same category items first, then others
    similarIds = [...sameCategoryIds, ...otherIds.filter(id => !sameCategoryIds.includes(id))];
  }

  // Take the requested number and convert to similar item format
  return similarIds.slice(0, limit).map(id => {
    const product = getDemoProduct(id);
    if (!product) return null;

    return {
      id: product.id,
      name: product.canonical_name,
      brand_name: product.brand_name,
      image_url: product.primary_image_url,
      price_cents: Math.round((product.best_price || 0) * 100),
      original_price_cents: product.listings[0]?.sale_price
        ? Math.round(product.listings[0].price * 100)
        : undefined,
      media_type: 'image',
      video_url: undefined,
      video_poster_url: undefined,
    };
  }).filter(Boolean);
}
