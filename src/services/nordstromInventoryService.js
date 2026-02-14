/**
 * Nordstrom Inventory Scraping Service
 * Purpose: Academic research - tracking Nordstrom women's clothing inventory
 *
 * IMPORTANT: This service is designed for academic research purposes.
 * Users must ensure compliance with:
 * - Nordstrom's Terms of Service
 * - Nordstrom's robots.txt
 * - Applicable data protection regulations
 * - Academic institution's research ethics guidelines
 *
 * Recommended: Contact Nordstrom for API access or explicit permission for research
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const pool = require('../db/pool');
const logger = require('../config/logger');

puppeteer.use(StealthPlugin());

class NordstromInventoryService {
  constructor() {
    this.baseUrl = 'https://www.nordstrom.com';
    this.womensCategoryUrl = `${this.baseUrl}/browse/women/clothing`;
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.requestDelay = 2000; // 2 seconds between requests to be respectful
    this.maxProductsPerRun = 100; // Limit to 100 for academic research dataset
  }

  /**
   * Main scraping function - orchestrates the full inventory scrape
   */
  async scrapeInventory() {
    const startTime = Date.now();
    const scrapeDate = new Date().toISOString().split('T')[0];

    logger.info('[Nordstrom] Starting inventory scrape');

    let browser;
    let stats = {
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      errors: 0,
      errorLog: []
    };

    try {
      // Launch browser with JavaScript enabled
      browser = await puppeteer.launch({
        headless: false, // Changed to false to see what's happening
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

      // Enable JavaScript
      await page.setJavaScriptEnabled(true);

      // Don't block resources - we need CSS and some images for proper rendering
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        // Only block media files, allow everything else including images and CSS
        if (['media', 'font'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Step 1: Get all product listing page URLs
      const categoryUrls = await this.getCategoryUrls(page);
      logger.info(`[Nordstrom] Found ${categoryUrls.length} category URLs`);

      // Step 2: Scrape products from each category
      for (const categoryUrl of categoryUrls) {
        try {
          await this.delay(this.requestDelay);
          const products = await this.scrapeCategory(page, categoryUrl);

          // Process each product
          for (const product of products) {
            try {
              await this.saveProduct(product);
              stats.totalProducts++;

              // Limit products per run
              if (stats.totalProducts >= this.maxProductsPerRun) {
                logger.info(`[Nordstrom] Reached max products limit: ${this.maxProductsPerRun}`);
                break;
              }
            } catch (error) {
              stats.errors++;
              stats.errorLog.push(`Product ${product.productId}: ${error.message}`);
              logger.error(`[Nordstrom] Error saving product:`, error);
            }
          }

          if (stats.totalProducts >= this.maxProductsPerRun) break;

        } catch (error) {
          stats.errors++;
          stats.errorLog.push(`Category ${categoryUrl}: ${error.message}`);
          logger.error(`[Nordstrom] Error scraping category ${categoryUrl}:`, error);
        }
      }

      // Step 3: Save snapshot
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.saveSnapshot(scrapeDate, stats, duration);

      logger.info(`[Nordstrom] Scrape completed. Products: ${stats.totalProducts}, Errors: ${stats.errors}`);

      return {
        success: true,
        stats,
        duration
      };

    } catch (error) {
      logger.error('[Nordstrom] Fatal scraping error:', error);

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

      // Wait for content to load
      try {
        await page.waitForSelector('article, .product-tile, [data-productid]', { timeout: 10000 });
      } catch (e) {
        logger.warn('[Nordstrom] Product cards did not load in time');
      }

      // Extract category links - try multiple selectors
      const urls = await page.evaluate(() => {
        const links = [];

        // Try multiple selector patterns
        const selectors = [
          'a[href*="/browse/women/clothing"]',
          'a[href*="/c/women"]',
          'nav a[href*="women"]',
          '.category-link',
          '[data-category-link]'
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('women') && !links.includes(href)) {
              links.push(href);
            }
          });
        });

        return links;
      });

      logger.info(`[Nordstrom] Found ${urls.length} potential category URLs`);

      // Convert relative URLs to absolute
      const absoluteUrls = urls.map(url => url.startsWith('http') ? url : `${this.baseUrl}${url}`);

      // If we found URLs, return them; otherwise fallback
      if (absoluteUrls.length > 0) {
        return absoluteUrls.slice(0, 10); // Limit to first 10 categories
      }

      // Fallback to predefined categories
      return [
        `${this.baseUrl}/browse/women/clothing`,
        `${this.baseUrl}/browse/women/clothing/dresses`,
        `${this.baseUrl}/browse/women/clothing/tops`,
        `${this.baseUrl}/browse/women/clothing/pants-leggings`,
        `${this.baseUrl}/browse/women/clothing/jeans-denim`
      ];

    } catch (error) {
      logger.error('[Nordstrom] Error getting category URLs:', error);
      // Return fallback categories
      return [
        `${this.baseUrl}/browse/women/clothing`,
        `${this.baseUrl}/browse/women/clothing/dresses`,
        `${this.baseUrl}/browse/women/clothing/tops`
      ];
    }
  }

  /**
   * Scrape products from a category page
   */
  async scrapeCategory(page, categoryUrl) {
    const products = [];

    try {
      logger.info(`[Nordstrom] Scraping category: ${categoryUrl}`);

      // Navigate and wait for page to fully load
      await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.delay(3000); // Give JavaScript time to execute

      // Wait for network to be idle (all AJAX requests complete)
      try {
        await page.waitForNetworkIdle({ timeout: 15000 });
      } catch (e) {
        logger.warn('[Nordstrom] Network did not idle, continuing anyway');
      }

      // Scroll to load lazy-loaded products
      await this.autoScroll(page);
      await this.delay(2000); // Wait after scrolling

      // First, let's see what's actually on the page
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          bodyText: document.body?.innerText?.substring(0, 200),
          articleCount: document.querySelectorAll('article').length,
          divCount: document.querySelectorAll('div').length,
          allClassesUsed: Array.from(new Set(
            Array.from(document.querySelectorAll('[class]'))
              .flatMap(el => Array.from(el.classList))
              .filter(cls => cls.toLowerCase().includes('product') || cls.toLowerCase().includes('card') || cls.toLowerCase().includes('item'))
          )).slice(0, 20)
        };
      });

      logger.info(`[Nordstrom] Page info: ${JSON.stringify(pageInfo)}`);

      // Extract product data using multiple selector strategies
      const productData = await page.evaluate(() => {
        const items = [];

        // Try multiple selector patterns for Nordstrom's product cards
        const selectorPatterns = [
          'article[id*="product"]',
          'article[id*="Product"]',
          '[data-element-type="product-card"]',
          '.product-tile',
          'article[data-productid]',
          '[class*="ProductCard"]',
          '[class*="product-card"]',
          'div[data-id]',
          'article',
          '[data-testid*="product"]',
          '[class*="Product_"]'
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
          console.log('Sample classes on page:', Array.from(document.querySelectorAll('[class]')).slice(0, 5).map(el => el.className));
          return [];
        }

        productCards.forEach((card, index) => {
          try {
            // Try multiple ways to get product ID
            const productId = card.getAttribute('data-productid') ||
                            card.getAttribute('id') ||
                            card.getAttribute('data-id') ||
                            card.querySelector('[data-productid]')?.getAttribute('data-productid') ||
                            card.querySelector('a')?.href?.match(/\/s\/([^\/\?]+)/)?.[1] ||
                            `NORD-${Date.now()}-${index}`;

            // Extract product name - try multiple selectors
            const nameSelectors = ['h3', '.product-title', '[data-element-type="product-title"]', 'h4', 'h2', 'a'];
            let productName = null;
            for (const sel of nameSelectors) {
              const el = card.querySelector(sel);
              if (el?.textContent?.trim()) {
                productName = el.textContent.trim();
                break;
              }
            }

            // Extract brand
            const brandSelectors = ['.brand', '[data-element-type="brand"]', '[class*="Brand"]', 'span'];
            let brandName = null;
            for (const sel of brandSelectors) {
              const el = card.querySelector(sel);
              const text = el?.textContent?.trim();
              if (text && text.length < 50) { // Reasonable brand name length
                brandName = text;
                break;
              }
            }

            // Extract price - improved pattern
            const priceSelectors = ['.price', '[data-element-type="price"]', '[class*="Price"]', 'span'];
            let price = null;
            for (const sel of priceSelectors) {
              const el = card.querySelector(sel);
              const priceText = el?.textContent?.trim();
              if (priceText) {
                const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
                if (priceMatch) {
                  price = parseFloat(priceMatch[1].replace(',', ''));
                  break;
                }
              }
            }

            // Extract image
            const imageEl = card.querySelector('img');
            let imageUrl = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src') || imageEl?.getAttribute('data-srcset');
            if (imageUrl && imageUrl.includes(',')) {
              imageUrl = imageUrl.split(',')[0].trim();
            }

            // Extract link
            const linkEl = card.querySelector('a');
            let productUrl = linkEl?.getAttribute('href');
            if (productUrl && !productUrl.startsWith('http')) {
              productUrl = 'https://www.nordstrom.com' + productUrl;
            }

            // Extract rating
            const ratingEl = card.querySelector('[class*="rating"], .stars, [class*="Rating"]');
            const ratingText = ratingEl?.getAttribute('aria-label') || ratingEl?.textContent;
            const ratingMatch = ratingText?.match(/([\d.]+)\s*(?:out|stars?)/i);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

            // Extract review count
            const reviewEl = card.querySelector('[class*="review"], .review-count, [class*="Review"]');
            const reviewText = reviewEl?.textContent?.trim();
            const reviewMatch = reviewText?.match(/(\d+)/);
            const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0;

            // Only add if we have minimum required data
            if (productId && productName && productName.length > 3) {
              items.push({
                productId,
                productName,
                brandName,
                price,
                imageUrl,
                productUrl,
                rating,
                reviewCount
              });
            }
          } catch (e) {
            console.error('Error parsing product card:', e);
          }
        });

        return items;
      });

      products.push(...productData);

    } catch (error) {
      logger.error(`[Nordstrom] Error scraping category ${categoryUrl}:`, error);
    }

    return products;
  }

  /**
   * Scrape detailed product information including variants
   */
  async scrapeProductDetails(page, productUrl) {
    try {
      await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(1500);

      const details = await page.evaluate(() => {
        const data = {
          variants: [],
          description: '',
          category: '',
          subcategory: ''
        };

        // Extract variants (sizes/colors)
        const sizeButtons = document.querySelectorAll('[data-id="size-option"], .size-option, button[class*="size"]');
        sizeButtons.forEach(btn => {
          const size = btn.textContent?.trim();
          const isAvailable = !btn.hasAttribute('disabled') && !btn.classList.contains('out-of-stock');
          if (size) {
            data.variants.push({
              size,
              isInStock: isAvailable
            });
          }
        });

        // Extract category from breadcrumbs
        const breadcrumbs = document.querySelectorAll('[data-element-type="breadcrumb"] a, .breadcrumb a');
        if (breadcrumbs.length > 0) {
          data.category = breadcrumbs[1]?.textContent?.trim() || '';
          data.subcategory = breadcrumbs[2]?.textContent?.trim() || '';
        }

        return data;
      });

      return details;

    } catch (error) {
      logger.error(`[Nordstrom] Error scraping product details:`, error);
      return { variants: [], description: '', category: '', subcategory: '' };
    }
  }

  /**
   * Save product to database
   */
  async saveProduct(product) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Upsert product
      const productResult = await client.query(`
        INSERT INTO nordstrom_products (
          product_id, product_name, brand_name, current_price, image_url,
          product_url, average_rating, review_count, is_in_stock,
          last_seen_at, last_scraped_at, raw_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
        ON CONFLICT (product_id)
        DO UPDATE SET
          product_name = EXCLUDED.product_name,
          brand_name = EXCLUDED.brand_name,
          current_price = EXCLUDED.current_price,
          image_url = EXCLUDED.image_url,
          product_url = EXCLUDED.product_url,
          average_rating = EXCLUDED.average_rating,
          review_count = EXCLUDED.review_count,
          is_in_stock = EXCLUDED.is_in_stock,
          last_seen_at = NOW(),
          last_scraped_at = NOW(),
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS is_new
      `, [
        product.productId,
        product.productName,
        product.brandName,
        product.price,
        product.imageUrl,
        product.productUrl,
        product.rating,
        product.reviewCount,
        true, // is_in_stock - default to true, update with variant data
        JSON.stringify(product)
      ]);

      // Track price history
      if (product.price) {
        await client.query(`
          INSERT INTO nordstrom_price_history (product_id, price, recorded_at)
          VALUES ($1, $2, NOW())
        `, [product.productId, product.price]);
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

      // Get current inventory stats
      const inventoryStats = await client.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock_products,
          COUNT(*) FILTER (WHERE is_in_stock = false) as out_of_stock_products,
          AVG(current_price) as average_price
        FROM nordstrom_products
      `);

      const { total_products, in_stock_products, out_of_stock_products, average_price } = inventoryStats.rows[0];

      await client.query(`
        INSERT INTO nordstrom_inventory_snapshots (
          snapshot_date, total_products, in_stock_products, out_of_stock_products,
          average_price, scrape_duration_seconds, scrape_status, error_log
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (snapshot_date)
        DO UPDATE SET
          total_products = EXCLUDED.total_products,
          in_stock_products = EXCLUDED.in_stock_products,
          out_of_stock_products = EXCLUDED.out_of_stock_products,
          average_price = EXCLUDED.average_price,
          scrape_duration_seconds = EXCLUDED.scrape_duration_seconds,
          scrape_status = EXCLUDED.scrape_status,
          error_log = EXCLUDED.error_log
      `, [
        date,
        total_products,
        in_stock_products,
        out_of_stock_products,
        average_price,
        duration,
        status,
        errorLog || (stats.errorLog?.length > 0 ? stats.errorLog.join('\n') : null)
      ]);

      client.release();

    } catch (error) {
      logger.error('[Nordstrom] Error saving snapshot:', error);
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
          SUM(review_count) as total_reviews
        FROM nordstrom_products
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
    const { brand, inStock, minPrice, maxPrice, category, limit = 100, offset = 0 } = filters;

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
          image_url, product_url, is_in_stock, category, subcategory,
          average_rating, review_count, last_seen_at, first_seen_at
        FROM nordstrom_products
        ${whereClause}
        ORDER BY last_seen_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...params, limit, offset]);

      // Get total count
      const countResult = await client.query(`
        SELECT COUNT(*) as total
        FROM nordstrom_products
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
        SELECT price, was_on_sale, recorded_at
        FROM nordstrom_price_history
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

module.exports = new NordstromInventoryService();
