# Email Scanner Enhancement Patch

## Changes to make in `src/services/emailScannerService.js`:

### 1. Add ShopperProfileService import (line 8)

```javascript
const ShopperProfileService = require('./shopperProfileService');
```

### 2. Update processBatch method (replace lines 314-367)

```javascript
  /**
   * Process a batch of emails
   * @param {gmail_v1.Gmail} gmail - Gmail client
   * @param {Array} messageIds - Array of message IDs
   * @param {number} userId - User ID
   * @param {number} connectionId - Connection ID
   * @returns {Promise<Object>} Batch results
   */
  static async processBatch(gmail, messageIds, userId, connectionId) {
    const matches = [];
    const extracted = [];
    const products = [];

    for (const { id } of messageIds) {
      try {
        // Get email details
        const message = await gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'full',
        });

        // Check if it's an order confirmation
        const headers = emailParser.parseEmailHeaders(message.data.payload.headers);
        const isOrder = emailParser.isOrderConfirmation({
          subject: headers.subject,
          snippet: message.data.snippet,
        });

        if (!isOrder) {
          continue;
        }

        // Get email body
        const emailBody = this.getEmailBody(message.data);

        // Check if fashion-related (in scope)
        const isFashion = emailParser.isFashionEmail(emailBody, headers.subject);
        if (!isFashion) {
          logger.debug(`Skipping non-fashion email: ${headers.subject}`);
          continue;
        }

        // Extract brand identifiers
        const identifiers = emailParser.extractAllBrandIdentifiers(message.data);

        // Match to database brands
        const match = await BrandMatcherService.extractBrandFromEmail(identifiers);

        if (match) {
          matches.push(match);

          // Store extracted brand in queue
          extracted.push({
            userId,
            connectionId,
            identifier: identifiers.domain || identifiers.subjectBrands[0] || 'unknown',
            source: match.source,
            emailSubject: headers.subject,
            emailSender: headers.fromEmail,
            emailDate: headers.date,
            matchedBrandId: match.brandId,
            confidenceScore: match.confidenceScore,
          });
        }

        // Extract products from email
        const extractedProducts = emailParser.extractProducts(emailBody, headers.subject);
        const orderTotal = emailParser.extractOrderTotal(emailBody);
        const orderNumber = emailParser.extractOrderNumber(emailBody, headers.subject);

        // Store products for later processing
        for (const product of extractedProducts) {
          products.push({
            userId,
            productName: product.name,
            category: product.category,
            size: product.size,
            quantity: product.quantity,
            priceCents: product.price,
            brandId: match?.brandId || null,
            brandName: match?.brandName || identifiers.domain,
            orderNumber,
            orderDate: headers.date,
            orderTotalCents: orderTotal,
            emailSubject: headers.subject,
            emailSender: headers.fromEmail,
            gmailMessageId: id,
          });
        }
      } catch (error) {
        logger.error(`Error processing email ${id}:`, error);
        // Continue with next email
      }
    }

    return { matches, extracted, products };
  }

  /**
   * Get email body from message
   * @param {Object} messageData - Gmail message data
   * @returns {string} Email body text
   */
  static getEmailBody(messageData) {
    let body = '';

    // Try to get body from payload
    if (messageData.payload) {
      if (messageData.payload.body?.data) {
        body = emailParser.decodeBase64Url(messageData.payload.body.data);
      } else if (messageData.payload.parts) {
        // Multi-part email
        for (const part of messageData.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += emailParser.decodeBase64Url(part.body.data);
          }
        }
      }
    }

    // Fallback to snippet
    if (!body && messageData.snippet) {
      body = messageData.snippet;
    }

    return body;
  }
```

### 3. Update scanEmailsForBrands method (update lines 257-299)

Replace the batch processing section:

```javascript
      // Process emails in batches
      const allBrandMatches = [];
      const extractedBrands = [];
      const allProducts = [];

      for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        const batch = messageIds.slice(i, i + BATCH_SIZE);
        const batchResults = await this.processBatch(gmail, batch, userId, connectionId);

        allBrandMatches.push(...batchResults.matches);
        extractedBrands.push(...batchResults.extracted);
        allProducts.push(...batchResults.products);
      }

      // Remove duplicates
      const uniqueMatches = this.deduplicateMatches(allBrandMatches);

      // Auto-follow high confidence matches
      const followedBrandIds = await BrandMatcherService.autoFollowMatchedBrands(
        userId,
        uniqueMatches
      );

      // Store scan results
      const scanResult = await this.storeScanResult(
        userId,
        connectionId,
        messageIds.length,
        extractedBrands,
        uniqueMatches,
        followedBrandIds,
        startTime
      );

      // Store products and update shopper profile
      const productsStored = await ShopperProfileService.storeProducts(
        userId,
        scanResult.scanId,
        allProducts
      );

      if (productsStored > 0) {
        await ShopperProfileService.updateShopperProfile(userId);
        logger.info(`Stored ${productsStored} products and updated shopper profile for user ${userId}`);
      }

      // Update last_scanned_at
      await pool.query(
        `UPDATE email_connections SET last_scanned_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [connectionId]
      );

      logger.info(
        `Email scan completed for user ${userId}: ${uniqueMatches.length} brands matched, ${followedBrandIds.length} auto-followed, ${productsStored} products found`
      );

      return {
        ...scanResult,
        productsFound: productsStored,
      };
```

## Manual Steps:

1. Open `src/services/emailScannerService.js`
2. Add import for ShopperProfileService at top
3. Replace processBatch method with enhanced version
4. Add getEmailBody helper method after processBatch
5. Update the batch processing loop in scanEmailsForBrands

These changes add:
- Fashion filtering (only scans fashion-related emails)
- Product extraction (items, sizes, prices)
- Shopper profile building
- 12-month scan window (already set via MONTHS_TO_SCAN_BACK constant)
