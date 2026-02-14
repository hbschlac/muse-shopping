/**
 * Bloomingdales Inventory Scraping Service
 * Purpose: Academic research - tracking Bloomingdales women's clothing inventory
 *
 * IMPORTANT: This service is designed for academic research purposes.
 * Users must ensure compliance with:
 * - Bloomingdales' Terms of Service
 * - Bloomingdales' robots.txt
 * - Applicable data protection regulations
 * - Academic institution's research ethics guidelines
 *
 * Recommended: Contact Bloomingdales for API access or explicit permission for research
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const pool = require('../db/pool');
const logger = require('../config/logger');

puppeteer.use(StealthPlugin());

class BloomingdalesInventoryService {
  constructor() {
    this.baseUrl = 'https://www.bloomingdales.com';
    this.womensCategoryUrl = `${this.baseUrl}/shop/womens-apparel`;
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.requestDelay = 2000; // 2 seconds between requests
    this.maxProductsPerRun = 100; // Limit to 100 for academic research
  }

  /**
   * Main scraping function
   */
  async scrapeInventory() {
    const startTime = Date.now();
    const scrapeDate = new Date().toISOString().split('T')[0];

    logger.info('[Bloomingdales] Starting inventory scrape');

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
        headless: false,
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

      // Request interception
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
      logger.info(`[Bloomingdales] Found ${categoryUrls.length} category URLs`);

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
                logger.info(`[Bloomingdales] Reached max products limit: ${this.maxProductsPerRun}`);
                break;
              }
            } catch (error) {
              stats.errors++;
              stats.errorLog.push({
                product: product.product_id,
                error: error.message
              });
              logger.error(`[Bloomingdales] Error saving product: ${error.message}`);
            }
          }

          if (stats.totalProducts >= this.maxProductsPerRun) {
            break;
          }
        } catch (error) {
          stats.errors++;
          logger.error(`[Bloomingdales] Error scraping category ${categoryUrl}: ${error.message}`);
        }
      }

      // Create inventory snapshot
      await this.createSnapshot(scrapeDate, stats);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`[Bloomingdales] Scrape completed in ${duration}s`, stats);

      return stats;

    } catch (error) {
      logger.error('[Bloomingdales] Scraping failed:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Get category URLs from main women's page
   */
  async getCategoryUrls(page) {
    logger.info('[Bloomingdales] Fetching category URLs from womens apparel');

    try {
      await page.goto(this.womensCategoryUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await this.delay(3000);

      // Try multiple selector patterns
      const categoryUrls = await page.evaluate(() => {
        const urls = new Set();

        // Pattern 1: Shop by category links
        document.querySelectorAll('a[href*="/shop/"]').forEach(link => {
          const href = link.getAttribute('href');
          if (href && (
            href.includes('/womens-apparel') ||
            href.includes('/dresses') ||
            href.includes('/tops') ||
            href.includes('/jeans')
          )) {
            urls.add(href.startsWith('http') ? href : `https://www.bloomingdales.com${href}`);
          }
        });

        return Array.from(urls);
      });

      if (categoryUrls.length === 0) {
        logger.warn('[Bloomingdales] No categories found, using fallback URLs');
        return [
          `${this.baseUrl}/shop/womens-apparel/dresses`,
          `${this.baseUrl}/shop/womens-apparel/tops`,
          `${this.baseUrl}/shop/womens-apparel/jeans`,
          `${this.baseUrl}/shop/womens-apparel/activewear`,
          `${this.baseUrl}/shop/womens-apparel/sweaters`
        ];
      }

      return categoryUrls.slice(0, 10); // Limit to 10 categories
    } catch (error) {
      logger.error('[Bloomingdales] Error getting categories:', error);
      return [this.womensCategoryUrl]; // Fallback to main page
    }
  }

  /**
   * Scrape products from a category page
   */
  async scrapeCategory(page, categoryUrl) {
    logger.info(`[Bloomingdales] Scraping category: ${categoryUrl}`);

    try {
      await page.goto(categoryUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await this.delay(3000);

      // Wait for products to load
      await page.waitForSelector('div[class*="product"], article[class*="product"]', {
        timeout: 10000
      }).catch(() => logger.warn('[Bloomingdales] Product selector timeout'));

      const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll(
          'div[class*="product-thumbnail"], div[class*="productThumbnail"], article[id*="product"]'
        );

        return Array.from(productElements).map((el, index) => {
          // Extract product data
          const nameEl = el.querySelector('[class*="productName"], [class*="product-name"], h3, h2');
          const priceEl = el.querySelector('[class*="price"], [class*="current"], .sale-price, .regular-price');
          const imageEl = el.querySelector('img');
          const linkEl = el.querySelector('a[href*="/product/"]');
          const brandEl = el.querySelector('[class*="brand"], [class*="designer"]');

          const name = nameEl?.textContent?.trim() || `Bloomingdales Product ${index + 1}`;
          const priceText = priceEl?.textContent?.trim() || '';
          const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
          const imageUrl = imageEl?.src || imageEl?.getAttribute('data-src') || '';
          const productUrl = linkEl?.href || '';
          const brand = brandEl?.textContent?.trim() || 'Unknown Brand';

          // Generate product ID from URL or name
          const productId = productUrl
            ? productUrl.split('/').filter(Boolean).pop()?.split('?')[0]
            : `BLOOMIES-${Date.now()}-${index}`;

          return {
            product_id: productId,
            product_name: name,
            brand_name: brand,
            current_price: price,
            image_url: imageUrl,
            product_url: productUrl || `https://www.bloomingdales.com/shop/product/${productId}`,
            category: 'Womens Apparel',
            subcategory: 'Clothing'
          };
        });
      });

      logger.info(`[Bloomingdales] Found ${products.length} products in category`);
      return products.filter(p => p.current_price > 0); // Filter out invalid products

    } catch (error) {
      logger.error(`[Bloomingdales] Error scraping category: ${error.message}`);
      return [];
    }
  }

  /**
   * Save product to database
   */
  async saveProduct(product) {
    const query = `
      INSERT INTO bloomingdales_products (
        product_id, product_name, brand_name, current_price,
        image_url, product_url, category, subcategory,
        last_scraped_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (product_id)
      DO UPDATE SET
        product_name = EXCLUDED.product_name,
        current_price = EXCLUDED.current_price,
        image_url = EXCLUDED.image_url,
        brand_name = EXCLUDED.brand_name,
        last_scraped_at = NOW()
      RETURNING id
    `;

    const values = [
      product.product_id,
      product.product_name,
      product.brand_name,
      product.current_price,
      product.image_url,
      product.product_url,
      product.category || 'Womens Apparel',
      product.subcategory || 'Clothing'
    ];

    const result = await pool.query(query, values);

    // Track price history
    await pool.query(
      `INSERT INTO bloomingdales_price_history (product_id, price, recorded_at)
       VALUES ($1, $2, NOW())`,
      [product.product_id, product.current_price]
    );

    return result.rows[0];
  }

  /**
   * Create inventory snapshot
   */
  async createSnapshot(date, stats) {
    const query = `
      INSERT INTO bloomingdales_inventory_snapshots (
        snapshot_date, total_products, in_stock_products,
        out_of_stock_products, average_price
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (snapshot_date) DO UPDATE SET
        total_products = EXCLUDED.total_products,
        in_stock_products = EXCLUDED.in_stock_products,
        average_price = EXCLUDED.average_price
    `;

    const avgPriceResult = await pool.query(
      'SELECT AVG(current_price) as avg_price FROM bloomingdales_products WHERE current_price > 0'
    );

    await pool.query(query, [
      date,
      stats.totalProducts,
      stats.totalProducts,
      0,
      avgPriceResult.rows[0]?.avg_price || 0
    ]);
  }

  /**
   * Utility: delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get inventory statistics
   */
  async getStats() {
    const query = `
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock,
        AVG(current_price) as avg_price,
        MIN(current_price) as min_price,
        MAX(current_price) as max_price,
        COUNT(DISTINCT brand_name) as total_brands
      FROM bloomingdales_products
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = new BloomingdalesInventoryService();
