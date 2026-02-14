/**
 * Abercrombie Inventory Scraping Service
 * Purpose: Academic research - tracking Abercrombie women's clothing inventory
 *
 * IMPORTANT: This service is designed for academic research purposes.
 * Users must ensure compliance with:
 * - Abercrombie's Terms of Service
 * - Abercrombie's robots.txt
 * - Applicable data protection regulations
 * - Academic institution's research ethics guidelines
 *
 * Recommended: Contact Abercrombie for API access or explicit permission for research
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const pool = require('../db/pool');
const logger = require('../config/logger');

puppeteer.use(StealthPlugin());

class AbercrombieInventoryService {
  constructor() {
    this.baseUrl = 'https://www.abercrombie.com';
    this.womensCategoryUrl = `${this.baseUrl}/shop/us/womens-new-arrivals`;
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

    logger.info('[Abercrombie] Starting inventory scrape');

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

      // Set request interception to block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        // Block only heavy media and fonts
        if (['media', 'font'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Step 1: Get all product listing page URLs
      const categoryUrls = await this.getCategoryUrls(page);
      logger.info(`[Abercrombie] Found ${categoryUrls.length} category URLs`);

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
                logger.info(`[Abercrombie] Reached max products limit: ${this.maxProductsPerRun}`);
                break;
              }
            } catch (error) {
              stats.errors++;
              stats.errorLog.push(`Product ${product.productId}: ${error.message}`);
              logger.error(`[Abercrombie] Error saving product:`, error);
            }
          }

          if (stats.totalProducts >= this.maxProductsPerRun) break;

        } catch (error) {
          stats.errors++;
          stats.errorLog.push(`Category ${categoryUrl}: ${error.message}`);
          logger.error(`[Abercrombie] Error scraping category ${categoryUrl}:`, error);
        }
      }

      // Step 3: Save snapshot
      const duration = Math.floor((Date.now() - startTime) / 1000);
      await this.saveSnapshot(scrapeDate, stats, duration);

      logger.info(`[Abercrombie] Scrape completed. Products: ${stats.totalProducts}, Errors: ${stats.errors}`);

      return {
        success: true,
        stats,
        duration
      };

    } catch (error) {
      logger.error('[Abercrombie] Fatal scraping error:', error);

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
        await page.waitForSelector('.product-tile, [data-product], article', { timeout: 10000 });
      } catch (e) {
        logger.warn('[Abercrombie] Product cards did not load in time');
      }

      // Extract category links
      const urls = await page.evaluate((baseUrl) => {
        const links = [];

        const selectors = [
          'a[href*="/shop/us/womens"]',
          'a[href*="/womens"]',
          'nav a[href*="women"]',
          '.category-link',
          '[data-category]'
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('women') && !links.includes(href)) {
              links.push(href.startsWith('http') ? href : baseUrl + href);
            }
          });
        });

        return links;
      }, this.baseUrl);

      logger.info(`[Abercrombie] Found ${urls.length} potential category URLs`);

      // If we found URLs, return them; otherwise fallback
      if (urls.length > 0) {
        return urls.slice(0, 10); // Limit to first 10 categories
      }

      // Fallback to predefined categories
      return [
        `${this.baseUrl}/shop/us/womens-new-arrivals`,
        `${this.baseUrl}/shop/us/womens-dresses-and-jumpsuits`,
        `${this.baseUrl}/shop/us/womens-tops`,
        `${this.baseUrl}/shop/us/womens-jeans`,
        `${this.baseUrl}/shop/us/womens-pants`
      ];

    } catch (error) {
      logger.error('[Abercrombie] Error getting category URLs:', error);
      return [
        `${this.baseUrl}/shop/us/womens-new-arrivals`,
        `${this.baseUrl}/shop/us/womens-tops`,
        `${this.baseUrl}/shop/us/womens-dresses-and-jumpsuits`
      ];
    }
  }

  /**
   * Scrape products from a category page
   */
  async scrapeCategory(page, categoryUrl) {
    const products = [];

    try {
      logger.info(`[Abercrombie] Scraping category: ${categoryUrl}`);

      await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.delay(3000);

      // Wait for network to be idle
      try {
        await page.waitForNetworkIdle({ timeout: 15000 });
      } catch (e) {
        logger.warn('[Abercrombie] Network did not idle, continuing anyway');
      }

      // Scroll to load lazy-loaded products
      await this.autoScroll(page);
      await this.delay(2000);

      // Extract product data
      const productData = await page.evaluate((baseUrl) => {
        const items = [];

        const selectorPatterns = [
          '.product-tile',
          '[data-product-tile]',
          'article[data-product]',
          '[class*="ProductTile"]',
          '[class*="product-tile"]',
          '[data-testid*="product"]',
          'div[data-productid]'
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
            // Extract product ID
            const productId = card.getAttribute('data-productid') ||
                            card.getAttribute('data-product-id') ||
                            card.getAttribute('id') ||
                            card.querySelector('[data-productid]')?.getAttribute('data-productid') ||
                            card.querySelector('a')?.href?.match(/\/p\/([^\/\?]+)/)?.[1] ||
                            `ANF-${Date.now()}-${index}`;

            // Extract product name
            const nameSelectors = ['h3', 'h2', '.product-title', '[data-product-title]', 'a[title]'];
            let productName = null;
            for (const sel of nameSelectors) {
              const el = card.querySelector(sel);
              if (el?.textContent?.trim()) {
                productName = el.textContent.trim();
                break;
              }
            }

            // If no name from selectors, try link title
            if (!productName) {
              const link = card.querySelector('a[title]');
              productName = link?.getAttribute('title')?.trim();
            }

            // Extract brand - Abercrombie products
            let brandName = 'Abercrombie & Fitch';

            // Extract price
            const priceSelectors = ['.price', '[data-price]', '.product-price', '[class*="Price"]'];
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
                    // Sale price scenario
                    isOnSale = true;
                    price = parseFloat(priceMatches[0].replace(/[$,]/g, ''));
                    originalPrice = parseFloat(priceMatches[1].replace(/[$,]/g, ''));
                  }
                  break;
                }
              }
            }

            // Extract image
            const imageEl = card.querySelector('img');
            let imageUrl = imageEl?.getAttribute('src') ||
                          imageEl?.getAttribute('data-src') ||
                          imageEl?.getAttribute('data-srcset');

            if (imageUrl && imageUrl.includes(',')) {
              imageUrl = imageUrl.split(',')[0].trim().split(' ')[0];
            }

            // Make sure image URL is absolute
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = imageUrl.startsWith('//') ? 'https:' + imageUrl : baseUrl + imageUrl;
            }

            // Extract link
            const linkEl = card.querySelector('a');
            let productUrl = linkEl?.getAttribute('href');
            if (productUrl && !productUrl.startsWith('http')) {
              productUrl = baseUrl + productUrl;
            }

            // Extract rating
            const ratingEl = card.querySelector('[class*="rating"], .stars, [aria-label*="star"]');
            const ratingText = ratingEl?.getAttribute('aria-label') || ratingEl?.textContent;
            const ratingMatch = ratingText?.match(/([\d.]+)\s*(?:out|stars?)/i);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

            // Extract review count
            const reviewEl = card.querySelector('[class*="review"], .review-count');
            const reviewText = reviewEl?.textContent?.trim();
            const reviewMatch = reviewText?.match(/(\d+)/);
            const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0;

            // Extract colors/swatches
            const colorSwatches = card.querySelectorAll('[class*="swatch"], [data-color]');
            const availableColors = Array.from(colorSwatches).map(swatch =>
              swatch.getAttribute('data-color') || swatch.getAttribute('title') || swatch.getAttribute('aria-label')
            ).filter(Boolean);

            // Only add if we have minimum required data
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
      logger.error(`[Abercrombie] Error scraping category ${categoryUrl}:`, error);
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
          sizes: [],
          colors: [],
          description: '',
          category: '',
          subcategory: ''
        };

        // Extract size options
        const sizeButtons = document.querySelectorAll('[data-size], button[class*="size"], .size-option');
        sizeButtons.forEach(btn => {
          const size = btn.textContent?.trim() || btn.getAttribute('data-size');
          const isAvailable = !btn.hasAttribute('disabled') &&
                             !btn.classList.contains('out-of-stock') &&
                             !btn.classList.contains('sold-out');
          if (size) {
            data.sizes.push(size);
            data.variants.push({
              size,
              isInStock: isAvailable
            });
          }
        });

        // Extract color options
        const colorSwatches = document.querySelectorAll('[data-color], [class*="color-swatch"]');
        colorSwatches.forEach(swatch => {
          const color = swatch.getAttribute('data-color') ||
                       swatch.getAttribute('title') ||
                       swatch.getAttribute('aria-label');
          if (color) {
            data.colors.push(color);
          }
        });

        // Extract category from breadcrumbs
        const breadcrumbs = document.querySelectorAll('[data-breadcrumb] a, .breadcrumb a, nav a');
        if (breadcrumbs.length > 0) {
          data.category = breadcrumbs[1]?.textContent?.trim() || '';
          data.subcategory = breadcrumbs[2]?.textContent?.trim() || '';
        }

        // Extract description
        const descEl = document.querySelector('.product-description, [data-description], .description');
        data.description = descEl?.textContent?.trim() || '';

        return data;
      });

      return details;

    } catch (error) {
      logger.error(`[Abercrombie] Error scraping product details:`, error);
      return { variants: [], sizes: [], colors: [], description: '', category: '', subcategory: '' };
    }
  }

  /**
   * Save product to database
   */
  async saveProduct(product) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate sale percentage if on sale
      let salePercentage = null;
      if (product.isOnSale && product.originalPrice && product.price) {
        salePercentage = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
      }

      // Upsert product
      const productResult = await client.query(`
        INSERT INTO abercrombie_products (
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
        product.brandName || 'Abercrombie & Fitch',
        product.price,
        product.originalPrice,
        product.isOnSale || false,
        salePercentage,
        product.imageUrl,
        product.productUrl,
        product.rating,
        product.reviewCount || 0,
        product.availableColors || [],
        true, // is_in_stock - default to true
        JSON.stringify(product)
      ]);

      // Track price history
      if (product.price) {
        await client.query(`
          INSERT INTO abercrombie_price_history (product_id, price, was_on_sale, sale_price, recorded_at)
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

      // Get current inventory stats
      const inventoryStats = await client.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock_products,
          COUNT(*) FILTER (WHERE is_in_stock = false) as out_of_stock_products,
          AVG(current_price) as average_price,
          COUNT(*) FILTER (WHERE is_on_sale = true) as products_on_sale,
          AVG(sale_percentage) FILTER (WHERE is_on_sale = true) as average_discount
        FROM abercrombie_products
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
        INSERT INTO abercrombie_inventory_snapshots (
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
      logger.error('[Abercrombie] Error saving snapshot:', error);
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
        FROM abercrombie_products
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
        FROM abercrombie_products
        ${whereClause}
        ORDER BY last_seen_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...params, limit, offset]);

      // Get total count
      const countResult = await client.query(`
        SELECT COUNT(*) as total
        FROM abercrombie_products
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
        FROM abercrombie_price_history
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

module.exports = new AbercrombieInventoryService();
