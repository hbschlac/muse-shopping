const pool = require('../db/pool');
const ItemService = require('./itemService');

class ChatRetrievalService {
  static async retrieve({ query, filters = {}, limit = 12, userId = null }) {
    const pagination = { limit, offset: 0 };
    const result = await ItemService.searchItems(query, {
      minPrice: filters.min_price ?? null,
      maxPrice: filters.max_price ?? null,
      categories: Array.isArray(filters.categories) ? filters.categories : null,
      subcategories: Array.isArray(filters.subcategories) ? filters.subcategories : null,
      attributes: Array.isArray(filters.attributes) ? filters.attributes : null,
      onSale: typeof filters.on_sale === 'boolean' ? filters.on_sale : null,
      inStock: typeof filters.in_stock === 'boolean' ? filters.in_stock : true,
      sortBy: filters.sort_by || 'newest',
    }, pagination);

    const items = result.items || [];
    const sources = ['items'];

    const extra = await this._retrieveContext({ query, userId, limit: Math.min(limit, 8) });
    if (extra.brands.length) sources.push('brands');
    if (extra.favorites.length) sources.push('favorites');
    if (extra.recentOrders.length) sources.push('orders');
    if (extra.recentCart.length) sources.push('cart');
    if (extra.recentViews.length) sources.push('views');

    return { items, sources, context: extra };
  }

  static async logRetrieval({ sessionId, messageId, query, sources = [], items = [], context = {} }) {
    const result = await pool.query(
      `INSERT INTO chat_retrieval_logs (session_id, message_id, query, sources, items)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sessionId || null, messageId || null, query || null, JSON.stringify(sources), JSON.stringify({ items, context })]
    );
    return result.rows[0];
  }

  static async _retrieveContext({ query, userId, limit = 8 }) {
    const context = { brands: [], favorites: [], recentOrders: [], recentCart: [], recentViews: [] };

    if (query) {
      const brands = await pool.query(
        `SELECT id, name, logo_url
         FROM brands
         WHERE name ILIKE $1
         ORDER BY name ASC
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      context.brands = brands.rows;
    }

    if (userId) {
      const favorites = await pool.query(
        `SELECT i.id, i.canonical_name, b.name as brand_name, i.primary_image_url
         FROM user_favorites uf
         JOIN items i ON uf.item_id = i.id
         JOIN brands b ON i.brand_id = b.id
         WHERE uf.user_id = $1
         ORDER BY uf.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      context.favorites = favorites.rows;

      const orders = await pool.query(
        `SELECT product_name, category, price_cents, brand_name, order_date
         FROM order_products
         WHERE user_id = $1
         ORDER BY order_date DESC
         LIMIT $2`,
        [userId, limit]
      );
      context.recentOrders = orders.rows;

      const cart = await pool.query(
        `SELECT i.id, i.canonical_name, b.name as brand_name, i.primary_image_url, ci.quantity
         FROM cart_items ci
         JOIN carts c ON ci.cart_id = c.id
         JOIN items i ON ci.item_id = i.id
         JOIN brands b ON i.brand_id = b.id
         WHERE c.user_id = $1
         ORDER BY ci.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      context.recentCart = cart.rows;

      const views = await pool.query(
        `SELECT i.id, i.canonical_name, b.name as brand_name, i.primary_image_url, ui.created_at
         FROM user_item_interactions ui
         JOIN items i ON ui.item_id = i.id
         JOIN brands b ON i.brand_id = b.id
         WHERE ui.user_id = $1 AND ui.interaction_type = 'view'
         ORDER BY ui.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      context.recentViews = views.rows;
    }

    return context;
  }
}

module.exports = ChatRetrievalService;
