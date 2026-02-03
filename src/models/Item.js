const pool = require('../db/pool');

class Item {
  /**
   * Find all items with optional filters
   */
  static async findAll({
    brands = null,
    categories = null,
    subcategories = null,
    attributes = null,
    minPrice = null,
    maxPrice = null,
    onSale = null,
    inStock = true,
    search = null,
    sortBy = 'newest',
    limit = 50,
    offset = 0
  } = {}) {
    let query = `
      SELECT DISTINCT ON (i.id)
        i.id,
        i.brand_id,
        b.name as brand_name,
        b.logo_url as brand_logo,
        i.canonical_name,
        i.description,
        i.category,
        i.subcategory,
        i.gender,
        i.primary_image_url,
        i.additional_images,
        MIN(il.price) as min_price,
        MIN(il.sale_price) as sale_price,
        COUNT(DISTINCT il.id) as listing_count,
        i.created_at
      FROM items i
      JOIN brands b ON i.brand_id = b.id
      LEFT JOIN item_listings il ON i.id = il.item_id
      WHERE i.is_active = TRUE
    `;

    const params = [];
    let paramIndex = 1;

    // Brand filter
    if (brands && brands.length > 0) {
      query += ` AND i.brand_id = ANY($${paramIndex}::int[])`;
      params.push(brands);
      paramIndex++;
    }

    // Category filter
    if (categories && categories.length > 0) {
      query += ` AND i.category = ANY($${paramIndex}::text[])`;
      params.push(categories);
      paramIndex++;
    }

    // Subcategory filter
    if (subcategories && subcategories.length > 0) {
      query += ` AND i.subcategory = ANY($${paramIndex}::text[])`;
      params.push(subcategories);
      paramIndex++;
    }

    // In stock filter
    if (inStock) {
      query += ` AND EXISTS (
        SELECT 1 FROM item_listings
        WHERE item_id = i.id AND in_stock = TRUE
      )`;
    }

    // Search filter (full-text search on name and description)
    if (search) {
      query += ` AND (
        i.canonical_name ILIKE $${paramIndex}
        OR i.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Attribute filter (items must have ALL specified attributes)
    if (attributes && attributes.length > 0) {
      query += ` AND i.id IN (
        SELECT item_id
        FROM item_attributes ia
        JOIN attribute_taxonomy at ON ia.attribute_id = at.id
        WHERE at.name = ANY($${paramIndex}::text[])
        GROUP BY item_id
        HAVING COUNT(DISTINCT at.name) = $${paramIndex + 1}
      )`;
      params.push(attributes);
      params.push(attributes.length);
      paramIndex += 2;
    }

    query += ` GROUP BY i.id, b.name, b.logo_url`;

    // Price filters (applied after aggregation)
    const havingClauses = [];

    if (minPrice !== null) {
      havingClauses.push(`MIN(il.price) >= $${paramIndex}`);
      params.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== null) {
      havingClauses.push(`MIN(il.price) <= $${paramIndex}`);
      params.push(maxPrice);
      paramIndex++;
    }

    if (onSale === true) {
      havingClauses.push(`MIN(il.sale_price) IS NOT NULL`);
    }

    if (havingClauses.length > 0) {
      query += ` HAVING ${havingClauses.join(' AND ')}`;
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        query += ` ORDER BY MIN(il.price) ASC NULLS LAST`;
        break;
      case 'price_high':
        query += ` ORDER BY MIN(il.price) DESC NULLS LAST`;
        break;
      case 'newest':
        query += ` ORDER BY i.created_at DESC`;
        break;
      case 'popular':
        // TODO: Add popularity score based on interactions
        query += ` ORDER BY i.created_at DESC`;
        break;
      default:
        query += ` ORDER BY i.created_at DESC`;
    }

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Count items matching filters (for pagination)
   */
  static async count({
    brands = null,
    categories = null,
    subcategories = null,
    attributes = null,
    minPrice = null,
    maxPrice = null,
    onSale = null,
    inStock = true,
    search = null
  } = {}) {
    let query = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM items i
      JOIN brands b ON i.brand_id = b.id
      LEFT JOIN item_listings il ON i.id = il.item_id
      WHERE i.is_active = TRUE
    `;

    const params = [];
    let paramIndex = 1;

    // Apply same filters as findAll
    if (brands && brands.length > 0) {
      query += ` AND i.brand_id = ANY($${paramIndex}::int[])`;
      params.push(brands);
      paramIndex++;
    }

    if (categories && categories.length > 0) {
      query += ` AND i.category = ANY($${paramIndex}::text[])`;
      params.push(categories);
      paramIndex++;
    }

    if (subcategories && subcategories.length > 0) {
      query += ` AND i.subcategory = ANY($${paramIndex}::text[])`;
      params.push(subcategories);
      paramIndex++;
    }

    if (inStock) {
      query += ` AND EXISTS (
        SELECT 1 FROM item_listings
        WHERE item_id = i.id AND in_stock = TRUE
      )`;
    }

    if (search) {
      query += ` AND (
        i.canonical_name ILIKE $${paramIndex}
        OR i.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (attributes && attributes.length > 0) {
      query += ` AND i.id IN (
        SELECT item_id
        FROM item_attributes ia
        JOIN attribute_taxonomy at ON ia.attribute_id = at.id
        WHERE at.name = ANY($${paramIndex}::text[])
        GROUP BY item_id
        HAVING COUNT(DISTINCT at.name) = $${paramIndex + 1}
      )`;
      params.push(attributes);
      params.push(attributes.length);
      paramIndex += 2;
    }

    // Price and sale filters
    if (minPrice !== null || maxPrice !== null || onSale !== null) {
      // For count with price filters, we need a subquery
      query = `SELECT COUNT(*) as total FROM (${query} GROUP BY i.id`;

      const havingClauses = [];
      if (minPrice !== null) {
        havingClauses.push(`MIN(il.price) >= $${paramIndex}`);
        params.push(minPrice);
        paramIndex++;
      }
      if (maxPrice !== null) {
        havingClauses.push(`MIN(il.price) <= $${paramIndex}`);
        params.push(maxPrice);
        paramIndex++;
      }
      if (onSale === true) {
        havingClauses.push(`MIN(il.sale_price) IS NOT NULL`);
      }

      if (havingClauses.length > 0) {
        query += ` HAVING ${havingClauses.join(' AND ')}`;
      }
      query += `) as filtered_items`;
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total);
  }

  /**
   * Find item by ID with all details
   */
  static async findById(itemId) {
    const query = `
      SELECT
        i.id,
        i.brand_id,
        b.name as brand_name,
        b.slug as brand_slug,
        b.logo_url as brand_logo,
        b.website_url as brand_website,
        i.canonical_name,
        i.description,
        i.category,
        i.subcategory,
        i.gender,
        i.primary_image_url,
        i.additional_images,
        i.created_at,
        i.updated_at
      FROM items i
      JOIN brands b ON i.brand_id = b.id
      WHERE i.id = $1 AND i.is_active = TRUE
    `;

    const result = await pool.query(query, [itemId]);
    return result.rows[0] || null;
  }

  /**
   * Get all listings for an item (price comparison)
   */
  static async getListings(itemId) {
    const query = `
      SELECT
        il.id,
        il.retailer_id,
        b.name as retailer_name,
        b.logo_url as retailer_logo,
        il.product_url,
        il.affiliate_url,
        il.price,
        il.sale_price,
        il.currency,
        il.in_stock,
        il.sizes_available,
        il.colors_available,
        il.last_scraped_at
      FROM item_listings il
      JOIN brands b ON il.retailer_id = b.id
      WHERE il.item_id = $1
      ORDER BY
        il.in_stock DESC,
        COALESCE(il.sale_price, il.price) ASC
    `;

    const result = await pool.query(query, [itemId]);
    return result.rows;
  }

  /**
   * Get attributes for an item
   */
  static async getAttributes(itemId) {
    const query = `
      SELECT
        at.id,
        at.name,
        at.category as attribute_category,
        at.display_name,
        ia.confidence,
        ia.source
      FROM item_attributes ia
      JOIN attribute_taxonomy at ON ia.attribute_id = at.id
      WHERE ia.item_id = $1
      ORDER BY at.category, at.display_name
    `;

    const result = await pool.query(query, [itemId]);
    return result.rows;
  }

  /**
   * Get similar items based on attributes
   */
  static async findSimilar(itemId, limit = 10) {
    const query = `
      SELECT * FROM find_similar_items($1, $2)
    `;

    const result = await pool.query(query, [itemId, limit]);
    return result.rows;
  }

  /**
   * Get available filter options (for discovery UI)
   */
  static async getFilterOptions() {
    const categoriesQuery = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM items
      WHERE is_active = TRUE
      GROUP BY category
      ORDER BY category
    `;

    const subcategoriesQuery = `
      SELECT category, subcategory, COUNT(*) as count
      FROM items
      WHERE is_active = TRUE AND subcategory IS NOT NULL
      GROUP BY category, subcategory
      ORDER BY category, subcategory
    `;

    const attributesQuery = `
      SELECT
        at.category,
        at.name,
        at.display_name,
        COUNT(DISTINCT ia.item_id) as item_count
      FROM attribute_taxonomy at
      LEFT JOIN item_attributes ia ON at.id = ia.attribute_id
      GROUP BY at.category, at.name, at.display_name
      HAVING COUNT(DISTINCT ia.item_id) > 0
      ORDER BY at.category, at.display_name
    `;

    const priceRangeQuery = `
      SELECT
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM item_listings
      WHERE in_stock = TRUE
    `;

    const [categories, subcategories, attributes, priceRange] = await Promise.all([
      pool.query(categoriesQuery),
      pool.query(subcategoriesQuery),
      pool.query(attributesQuery),
      pool.query(priceRangeQuery)
    ]);

    // Group attributes by category
    const attributesByCategory = {};
    attributes.rows.forEach(attr => {
      if (!attributesByCategory[attr.category]) {
        attributesByCategory[attr.category] = [];
      }
      attributesByCategory[attr.category].push({
        name: attr.name,
        display_name: attr.display_name,
        item_count: parseInt(attr.item_count)
      });
    });

    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.rows.forEach(sub => {
      if (!subcategoriesByCategory[sub.category]) {
        subcategoriesByCategory[sub.category] = [];
      }
      subcategoriesByCategory[sub.category].push({
        value: sub.subcategory,
        count: parseInt(sub.count)
      });
    });

    return {
      categories: categories.rows.map(c => ({
        value: c.category,
        count: parseInt(c.count)
      })),
      subcategories: subcategoriesByCategory,
      attributes: attributesByCategory,
      price_range: {
        min: parseFloat(priceRange.rows[0].min_price) || 0,
        max: parseFloat(priceRange.rows[0].max_price) || 1000
      }
    };
  }
}

module.exports = Item;
