/**
 * Free People Inventory Scraping Service
 * Purpose: Academic research - tracking Free People women's clothing inventory
 *
 * IMPORTANT: This service is designed for academic research purposes.
 * Users must ensure compliance with:
 * - Free People's Terms of Service
 * - Free People's robots.txt
 * - Applicable data protection regulations
 * - Academic institution's research ethics guidelines
 *
 * Recommended: Contact Free People for API access or explicit permission for research
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const pool = require('../db/pool');
const logger = require('../config/logger');

puppeteer.use(StealthPlugin());

class FreepeopleInventoryService {
  constructor() {
    this.baseUrl = 'https://www.freepeople.com';
    this.womensCategoryUrl = `${this.baseUrl}/womens-clothing/`;
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.requestDelay = 3000; // 3 seconds between requests to be respectful
    this.maxProductsPerRun = 100; // Limit to 100 for academic research dataset
  }

  /**
   * Main scraping function - orchestrates the full inventory scrape
   */
  async scrapeInventory() {
    const startTime = Date.now();
    const scrapeDate = new Date().toISOString().split('T')[0];

    logger.info('[FreePeople] Starting inventory scrape');

    let browser;
    let stats = {
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      errors: 0,
      errorLog: []
    };

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1920,1080'
        ]
      });

      const page = await browser.newPage();
      await page.setUserAgent(this.userAgent);
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setJavaScriptEnabled(true);

      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['media', 'font'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Get category URLs
      const categoryUrls = await this.getCategoryUrls(page);
      logger.info(`[FreePeople] Found ${categoryUrls.length} category URLs`);

      // Scrape products from each category
      for (const categoryUrl of categoryUrls) {
        try {
          await this.delay(this.requestDelay);
          const products = await this.scrapeCategory(page, categoryUrl);

          for (const product of products) {
            try {
              await this.saveProduct(product);
              stats.totalProducts++;

              if (stats.totalProducts >= this.maxProductsPerRun) {
                logger.info(`[FreePeople] Reached max products limit: ${this.maxProductsPerRun}`);
                break;
              }
            } catch (error) {
              stats.errors++;
              stats.errorLog.push(`Product ${product.productId}: ${error.message}`);
              logger.error(`[FreePeople] Error saving product:`, error);
            }
          }

          if (stats.totalProducts >= this.maxProductsPerRun) break;

        } catch (error) {
          stats.errors++;
          stats.errorLog.push(`Category ${categoryUrl}: ${error.message}`);
          logger.error(`[FreePeople] Error scraping category ${categoryUrl}:`, error);
        }
      }

      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.saveSnapshot(scrapeDate, stats, duration);

      logger.info(`[FreePeople] Scrape completed. Products: ${stats.totalProducts}, Errors: ${stats.errors}`);

      return {
        success: true,
        stats,
        duration
      };

    } catch (error) {
      logger.error('[FreePeople] Fatal scraping error:', error);

      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.saveSnapshot(scrapeDate, stats, duration, 'failed', error.message);

      return {
        success: false,
        error: error.message,
        stats,
        duration
      };

    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Get category URLs from main women's clothing page
   */
  async getCategoryUrls(page) {
    try {
      await page.goto(this.womensCategoryUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(3000);

      try {
        await page.waitForSelector('.product-tile, [data-product], article', { timeout: 10000 });
      } catch (e) {
        logger.warn('[FreePeople] Product cards did not load in time');
      }

      const urls = await page.evaluate((baseUrl) => {
        const links = [];
        const selectors = [
          'a[href*="/womens-clothing"]',
          'a[href*="/womens"]',
          'nav a[href*="clothing"]',
          '.category-link'
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('clothing') && !links.includes(href)) {
              links.push(href.startsWith('http') ? href : baseUrl + href);
            }
          });
        });

        return links;
      }, this.baseUrl);

      logger.info(`[FreePeople] Found ${urls.length} potential category URLs`);

      if (urls.length > 0) {
        return urls.slice(0, 10);
      }

      // Fallback categories
      return [
        `${this.baseUrl}/womens-clothing/`,
        `${this.baseUrl}/womens-clothing/dresses`,
        `${this.baseUrl}/womens-clothing/tops`,
        `${this.baseUrl}/womens-clothing/pants`,
        `${this.baseUrl}/womens-clothing/jackets-coats`
      ];

    } catch (error) {
      logger.error('[FreePeople] Error getting category URLs:', error);
      return [
        `${this.baseUrl}/womens-clothing/`,
        `${this.baseUrl}/womens-clothing/dresses`,
        `${this.baseUrl}/womens-clothing/tops`
      ];
    }
  }

  /**
   * Scrape products from a category page
   */
  async scrapeCategory(page, categoryUrl) {
    const products = [];

    try {
      logger.info(`[FreePeople] Scraping category: ${categoryUrl}`);

      await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.delay(3000);

      try {
        await page.waitForNetworkIdle({ timeout: 15000 });
      } catch (e) {
        logger.warn('[FreePeople] Network did not idle, continuing anyway');
      }

      await this.autoScroll(page);
      await this.delay(2000);

      const productData = await page.evaluate((baseUrl) => {
        const items = [];

        const selectorPatterns = [
          '.product-tile',
          '[data-product-tile]',
          'article[data-product]',
          '[class*="ProductTile"]',
          '[data-testid*="product"]',
          'div[data-productid]',
          '.product-card'
        ];

        let productCards = [];
        let usedSelector = null;

        for (const pattern of selectorPatterns) {
          productCards = document.querySelectorAll(pattern);
          if (productCards.length > 0) {
            usedSelector = pattern;
            console.log(`Found ${productCards.length} products with selector: ${pattern}`);
            break;
          }
        }

        if (productCards.length === 0) {
          console.log('No product cards found with any selector');
          return [];
        }

        productCards.forEach((card, index) => {
          try {
            const productId = card.getAttribute('data-productid') ||
                            card.getAttribute('data-product-id') ||
                            card.getAttribute('id') ||
                            card.querySelector('[data-productid]')?.getAttribute('data-productid') ||
                            card.querySelector('a')?.href?.match(/\/product\/([^\/\?]+)/)?.[1] ||
                            `FREEPEOPLE-${Date.now()}-${index}`;

            const nameSelectors = ['h3', 'h2', '.product-title', '[data-product-title]', 'a[title]', '.product-name'];
            let productName = null;
            for (const sel of nameSelectors) {
              const el = card.querySelector(sel);
              if (el?.textContent?.trim()) {
                productName = el.textContent.trim();
                break;
              }
            }

            if (!productName) {
              const link = card.querySelector('a[title]');
              productName = link?.getAttribute('title')?.trim();
            }

            let brandName = 'Free People';

            const priceSelectors = ['.price', '[data-price]', '.product-price', '[class*="Price"]', '[class*="price"]'];
            let price = null;
            let originalPrice = null;
            let isOnSale = false;

            for (const sel of priceSelectors) {
              const priceContainer = card.querySelector(sel);
              if (priceContainer) {
                const priceText = priceContainer.textContent;
                const priceMatches = priceText.match(/\$?([\d,]+\.?\d*)/g);

                if (priceMatches && priceMatches.length > 0) {
                  if (priceMatches.length === 1) {
                    price = parseFloat(priceMatches[0].replace(/[$,]/g, ''));
                  } else if (priceMatches.length >= 2) {
                    isOnSale = true;
                    price = parseFloat(priceMatches[0].replace(/[$,]/g, ''));
                    originalPrice = parseFloat(priceMatches[1].replace(/[$,]/g, ''));
                  }
                  break;
                }
              }
            }

            const imageEl = card.querySelector('img');
            let imageUrl = imageEl?.getAttribute('src') ||
                          imageEl?.getAttribute('data-src') ||
                          imageEl?.getAttribute('data-srcset');

            if (imageUrl && imageUrl.includes(',')) {
              imageUrl = imageUrl.split(',')[0].trim().split(' ')[0];
            }

            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('//') ? 'https:' + imageUrl : baseUrl + imageUrl;
            }

            const linkEl = card.querySelector('a');
            let productUrl = linkEl?.getAttribute('href');
            if (productUrl && !productUrl.startsWith('http')) {
              productUrl = baseUrl + productUrl;
            }

            const ratingEl = card.querySelector('[class*="rating"], .stars, [aria-label*="star"]');
            const ratingText = ratingEl?.getAttribute('aria-label') || ratingEl?.textContent;
            const ratingMatch = ratingText?.match(/([\d.]+)\s*(?:out|stars?)/i);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

            const reviewEl = card.querySelector('[class*="review"], .review-count');
            const reviewText = reviewEl?.textContent?.trim();
            const reviewMatch = reviewText?.match(/(\d+)/);
            const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0;

            const colorSwatches = card.querySelectorAll('[class*="swatch"], [data-color], [class*="color"]');
            const availableColors = Array.from(colorSwatches).map(swatch =>
              swatch.getAttribute('data-color') || swatch.getAttribute('title') || swatch.getAttribute('aria-label')
            ).filter(Boolean);

            if (productId && productName && productName.length > 3) {
              items.push({
                productId,
                productName,
                brandName,
                price,
                originalPrice,
                isOnSale,
                imageUrl,
                productUrl,
                rating,
                reviewCount,
                availableColors: availableColors.length > 0 ? availableColors : null
              });
            }
          } catch (e) {
            console.error('Error parsing product card:', e);
          }
        });

        return items;
      }, this.baseUrl);

      products.push(...productData);

    } catch (error) {
      logger.error(`[FreePeople] Error scraping category ${categoryUrl}:`, error);
    }

    return products;
  }

  /**
   * Save product to database
   */
  async saveProduct(product) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let salePercentage = null;
      if (product.isOnSale && product.originalPrice && product.price) {
        salePercentage = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
      }

      const productResult = await client.query(`
        INSERT INTO freepeople_products (
          product_id, product_name, brand_name, current_price, original_price,
          is_on_sale, sale_percentage, image_url, product_url,
          average_rating, review_count, available_colors, is_in_stock,
          last_seen_at, last_scraped_at, raw_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), $14)
        ON CONFLICT (product_id)
        DO UPDATE SET
          product_name = EXCLUDED.product_name,
          brand_name = EXCLUDED.brand_name,
          current_price = EXCLUDED.current_price,
          original_price = EXCLUDED.original_price,
          is_on_sale = EXCLUDED.is_on_sale,
          sale_percentage = EXCLUDED.sale_percentage,
          image_url = EXCLUDED.image_url,
          product_url = EXCLUDED.product_url,
          average_rating = EXCLUDED.average_rating,
          review_count = EXCLUDED.review_count,
          available_colors = EXCLUDED.available_colors,
          is_in_stock = EXCLUDED.is_in_stock,
          last_seen_at = NOW(),
          last_scraped_at = NOW(),
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS is_new
      `, [
        product.productId,
        product.productName,
        product.brandName || 'Free People',
        product.price,
        product.originalPrice,
        product.isOnSale || false,
        salePercentage,
        product.imageUrl,
        product.productUrl,
        product.rating,
        product.reviewCount || 0,
        product.availableColors || [],
        true,
        JSON.stringify(product)
      ]);

      if (product.price) {
        await client.query(`
          INSERT INTO freepeople_price_history (product_id, price, was_on_sale, sale_price, recorded_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (product_id, recorded_at) DO NOTHING
        `, [
          product.productId,
          product.originalPrice || product.price,
          product.isOnSale || false,
          product.isOnSale ? product.price : null
        ]);
      }

      await client.query('COMMIT');

      return productResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save inventory snapshot
   */
  async saveSnapshot(date, stats, duration, status = 'success', errorLog = null) {
    try {
      const client = await pool.connect();

      const inventoryStats = await client.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock_products,
          COUNT(*) FILTER (WHERE is_in_stock = false) as out_of_stock_products,
          AVG(current_price) as average_price,
          COUNT(*) FILTER (WHERE is_on_sale = true) as products_on_sale,
          AVG(sale_percentage) FILTER (WHERE is_on_sale = true) as average_discount
        FROM freepeople_products
      `);

      const {
        total_products,
        in_stock_products,
        out_of_stock_products,
        average_price,
        products_on_sale,
        average_discount
      } = inventoryStats.rows[0];

      await client.query(`
        INSERT INTO freepeople_inventory_snapshots (
          snapshot_date, total_products, in_stock_products, out_of_stock_products,
          average_price, products_on_sale, average_discount_percentage,
          scrape_duration_seconds, scrape_status, error_log
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (snapshot_date)
        DO UPDATE SET
          total_products = EXCLUDED.total_products,
          in_stock_products = EXCLUDED.in_stock_products,
          out_of_stock_products = EXCLUDED.out_of_stock_products,
          average_price = EXCLUDED.average_price,
          products_on_sale = EXCLUDED.products_on_sale,
          average_discount_percentage = EXCLUDED.average_discount_percentage,
          scrape_duration_seconds = EXCLUDED.scrape_duration_seconds,
          scrape_status = EXCLUDED.scrape_status,
          error_log = EXCLUDED.error_log
      `, [
        date,
        total_products,
        in_stock_products,
        out_of_stock_products,
        average_price,
        products_on_sale,
        average_discount,
        duration,
        status,
        errorLog || (stats.errorLog?.length > 0 ? stats.errorLog.join('\n') : null)
      ]);

      client.release();

    } catch (error) {
      logger.error('[FreePeople] Error saving snapshot:', error);
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock_count,
          COUNT(*) FILTER (WHERE is_in_stock = false) as out_of_stock_count,
          COUNT(DISTINCT brand_name) as total_brands,
          AVG(current_price) as avg_price,
          MIN(current_price) as min_price,
          MAX(current_price) as max_price,
          AVG(average_rating) as avg_rating,
          SUM(review_count) as total_reviews,
          COUNT(*) FILTER (WHERE is_on_sale = true) as products_on_sale,
          AVG(sale_percentage) FILTER (WHERE is_on_sale = true) as avg_discount
        FROM freepeople_products
      `);

      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Get products with filters
   */
  async getProducts(filters = {}) {
    const { brand, inStock, minPrice, maxPrice, category, onSale, limit = 100, offset = 0 } = filters;

    const client = await pool.connect();
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (brand) {
      conditions.push(`brand_name ILIKE $${paramCount++}`);
      params.push(`%${brand}%`);
    }

    if (typeof inStock === 'boolean') {
      conditions.push(`is_in_stock = $${paramCount++}`);
      params.push(inStock);
    }

    if (typeof onSale === 'boolean') {
      conditions.push(`is_on_sale = $${paramCount++}`);
      params.push(onSale);
    }

    if (minPrice) {
      conditions.push(`current_price >= $${paramCount++}`);
      params.push(minPrice);
    }

    if (maxPrice) {
      conditions.push(`current_price <= $${paramCount++}`);
      params.push(maxPrice);
    }

    if (category) {
      conditions.push(`category ILIKE $${paramCount++}`);
      params.push(`%${category}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const result = await client.query(`
        SELECT
          product_id, product_name, brand_name, current_price, original_price,
          is_on_sale, sale_percentage, image_url, product_url, is_in_stock,
          category, subcategory, average_rating, review_count, available_colors,
          available_sizes, last_seen_at, first_seen_at
        FROM freepeople_products
        ${whereClause}
        ORDER BY last_seen_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...params, limit, offset]);

      const countResult = await client.query(`
        SELECT COUNT(*) as total
        FROM freepeople_products
        ${whereClause}
      `, params);

      return {
        products: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(productId) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT price, was_on_sale, sale_price, recorded_at
        FROM freepeople_price_history
        WHERE product_id = $1
        ORDER BY recorded_at DESC
        LIMIT 100
      `, [productId]);

      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Helper: Auto-scroll page to load lazy content
   */
  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 5000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * Helper: Delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new FreepeopleInventoryService();
