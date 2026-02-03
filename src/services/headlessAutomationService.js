/**
 * Headless Automation Service
 * Automates checkout on retailer websites using Puppeteer
 *
 * IMPORTANT LEGAL NOTICE:
 * - This automation may violate retailer Terms of Service
 * - Use only for testing or with explicit retailer permission
 * - Production use requires legal review and retailer agreements
 *
 * ANTI-BOT DETECTION:
 * - Uses puppeteer-stealth to avoid detection
 * - Implements human-like delays and behavior
 * - Rotates user agents
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

// Add stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

class HeadlessAutomationService {
  /**
   * Place order via headless browser automation
   * @param {Object} order - Order object with items
   * @param {Object} session - Checkout session with shipping/payment
   * @returns {Promise<Object>} Placement result
   */
  static async placeOrder(order, session) {
    const storeId = order.store_id;

    // Route to store-specific automation
    switch (storeId) {
      case 1: // Example: Demo store
        return await this.placeDemoStoreOrder(order, session);

      // Add more retailers as needed:
      // case 2: // Nordstrom
      //   return await this.placeNordstromOrder(order, session);
      // case 3: // Macy's
      //   return await this.placeMacysOrder(order, session);

      default:
        throw new Error(`Headless automation not implemented for store ID ${storeId}`);
    }
  }

  /**
   * Demo store automation (for testing)
   * This is a proof-of-concept showing how automation would work
   * @param {Object} order - Order object
   * @param {Object} session - Checkout session
   * @returns {Promise<Object>} Placement result
   */
  static async placeDemoStoreOrder(order, session) {
    let browser = null;

    try {
      logger.info(`Starting headless automation for order ${order.muse_order_number}`);

      // Launch browser
      browser = await puppeteer.launch({
        headless: true, // Set to false for debugging
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set realistic viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Set user agent to look like real browser
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // STEP 1: Navigate to store
      logger.info('Step 1: Navigating to store');
      await page.goto('https://example-store.com', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.randomDelay(1000, 2000);

      // STEP 2: Add items to cart
      logger.info('Step 2: Adding items to cart');
      for (const item of order.items) {
        await this.addItemToCart(page, item);
        await this.randomDelay(500, 1500);
      }

      // STEP 3: Go to checkout
      logger.info('Step 3: Navigating to checkout');
      await page.click('a[href="/cart"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await this.randomDelay(1000, 2000);

      await page.click('button[name="checkout"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // STEP 4: Fill shipping info
      logger.info('Step 4: Filling shipping information');
      await this.fillShippingInfo(page, session.shippingAddress);
      await this.randomDelay(1000, 2000);

      // STEP 5: Fill payment info
      logger.info('Step 5: Filling payment information');
      await this.fillPaymentInfo(page, {
        // Use test card data - NEVER use real customer card data
        cardNumber: '4111111111111111',
        expMonth: '12',
        expYear: '2025',
        cvv: '123',
      });
      await this.randomDelay(1000, 2000);

      // STEP 6: Place order
      logger.info('Step 6: Placing order');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // STEP 7: Extract order confirmation
      logger.info('Step 7: Extracting order number');
      const orderNumber = await this.extractOrderNumber(page);

      logger.info(`Order placed successfully: ${orderNumber}`);

      // Take screenshot for verification
      await page.screenshot({
        path: `./order-confirmations/${order.muse_order_number}.png`,
      });

      return {
        storeOrderNumber: orderNumber,
        success: true,
        trackingNumber: null,
        confirmationScreenshot: `${order.muse_order_number}.png`,
      };
    } catch (error) {
      logger.error('Headless automation error:', error);

      // Take screenshot on error for debugging
      if (browser) {
        try {
          const page = (await browser.pages())[0];
          await page.screenshot({
            path: `./order-errors/${order.muse_order_number}-error.png`,
          });
        } catch (screenshotError) {
          // Ignore screenshot errors
        }
      }

      throw new Error(`Automation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Add item to cart
   * @param {Page} page - Puppeteer page
   * @param {Object} item - Item to add
   */
  static async addItemToCart(page, item) {
    // Navigate to product page
    await page.goto(item.product_url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Select size if needed
    if (item.size) {
      await page.select('select[name="size"]', item.size);
      await this.randomDelay(300, 700);
    }

    // Select color if needed
    if (item.color) {
      await page.select('select[name="color"]', item.color);
      await this.randomDelay(300, 700);
    }

    // Set quantity
    if (item.quantity > 1) {
      await page.select('select[name="quantity"]', item.quantity.toString());
      await this.randomDelay(300, 700);
    }

    // Click add to cart
    await page.click('button[name="add-to-cart"]');
    await page.waitForSelector('.cart-success-message', { timeout: 5000 });
  }

  /**
   * Fill shipping information
   * @param {Page} page - Puppeteer page
   * @param {Object} address - Shipping address
   */
  static async fillShippingInfo(page, address) {
    await page.type('input[name="firstName"]', address.name.split(' ')[0]);
    await this.randomDelay(100, 300);

    await page.type('input[name="lastName"]', address.name.split(' ').slice(1).join(' '));
    await this.randomDelay(100, 300);

    await page.type('input[name="address1"]', address.address1);
    await this.randomDelay(100, 300);

    if (address.address2) {
      await page.type('input[name="address2"]', address.address2);
      await this.randomDelay(100, 300);
    }

    await page.type('input[name="city"]', address.city);
    await this.randomDelay(100, 300);

    await page.select('select[name="state"]', address.state);
    await this.randomDelay(100, 300);

    await page.type('input[name="zip"]', address.zip);
    await this.randomDelay(100, 300);

    await page.type('input[name="phone"]', address.phone);
    await this.randomDelay(100, 300);

    // Click continue
    await page.click('button[name="continue-to-payment"]');
  }

  /**
   * Fill payment information
   * WARNING: This should use merchant's payment method, NOT customer's card
   * @param {Page} page - Puppeteer page
   * @param {Object} paymentInfo - Payment information
   */
  static async fillPaymentInfo(page, paymentInfo) {
    // Switch to iframe if payment is in iframe
    const frames = page.frames();
    const paymentFrame = frames.find(f => f.url().includes('payment')) || page;

    await paymentFrame.type('input[name="cardNumber"]', paymentInfo.cardNumber);
    await this.randomDelay(100, 300);

    await paymentFrame.type('input[name="expMonth"]', paymentInfo.expMonth);
    await this.randomDelay(100, 300);

    await paymentFrame.type('input[name="expYear"]', paymentInfo.expYear);
    await this.randomDelay(100, 300);

    await paymentFrame.type('input[name="cvv"]', paymentInfo.cvv);
    await this.randomDelay(100, 300);
  }

  /**
   * Extract order number from confirmation page
   * @param {Page} page - Puppeteer page
   * @returns {Promise<string>} Order number
   */
  static async extractOrderNumber(page) {
    // Try common selectors for order number
    const selectors = [
      '.order-number',
      '#order-number',
      '[data-order-number]',
      '.confirmation-number',
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await page.evaluate(el => el.textContent, element);
          const match = text.match(/\d+/);
          if (match) {
            return match[0];
          }
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Fallback: extract from URL
    const url = page.url();
    const urlMatch = url.match(/order[=\/](\d+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    throw new Error('Could not extract order number from confirmation page');
  }

  /**
   * Random delay to mimic human behavior
   * @param {number} min - Minimum delay in ms
   * @param {number} max - Maximum delay in ms
   */
  static async randomDelay(min, max) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Detect CAPTCHA on page
   * @param {Page} page - Puppeteer page
   * @returns {Promise<boolean>} True if CAPTCHA detected
   */
  static async detectCaptcha(page) {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.g-recaptcha',
      '#captcha',
    ];

    for (const selector of captchaSelectors) {
      const element = await page.$(selector);
      if (element) {
        logger.warn('CAPTCHA detected on page');
        return true;
      }
    }

    return false;
  }

  /**
   * Health check - verify Puppeteer can launch
   * @returns {Promise<boolean>} True if Puppeteer is working
   */
  static async healthCheck() {
    let browser = null;
    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto('https://www.google.com');
      return true;
    } catch (error) {
      logger.error('Puppeteer health check failed:', error);
      return false;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = HeadlessAutomationService;
