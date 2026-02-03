/**
 * Email Scanner Service
 * Handles Gmail integration, email scanning, and brand extraction
 */

const pool = require('../db/pool');
const googleAuth = require('../config/googleAuth');
const BrandMatcherService = require('./brandMatcherService');
const ShopperProfileService = require('./shopperProfileService');
const StoreAccountService = require('./storeAccountService');
const emailParser = require('../utils/emailParser');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Email scanning configuration
const MAX_EMAILS_TO_SCAN = 500;
const MONTHS_TO_SCAN_BACK = 12;
const BATCH_SIZE = 50; // Process emails in batches to avoid memory issues

class EmailScannerService {
  /**
   * Initiate Gmail OAuth connection
   * @param {number} userId - User ID to include in state parameter
   * @returns {string} Authorization URL for user to visit
   */
  static getAuthUrl(userId) {
    try {
      googleAuth.verifyConfiguration();
      return googleAuth.getAuthUrl(userId);
    } catch (error) {
      logger.error('Error generating auth URL:', error);
      throw new ValidationError('Gmail integration not properly configured');
    }
  }

  /**
   * Complete Gmail OAuth connection
   * @param {number} userId - User ID
   * @param {string} authCode - Authorization code from OAuth callback
   * @returns {Promise<Object>} Connection information
   */
  static async connectGmail(userId, authCode) {
    if (!authCode) {
      throw new ValidationError('Authorization code is required');
    }

    try {
      // Exchange code for tokens
      const tokens = await googleAuth.getTokensFromCode(authCode);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new ValidationError('Failed to obtain access tokens from Google');
      }

      // Get user's email address
      const gmail = googleAuth.createGmailClient(
        tokens.access_token,
        tokens.refresh_token
      );
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const emailAddress = profile.data.emailAddress;

      // Calculate token expiration
      const expiresAt = new Date(Date.now() + tokens.expiry_date);

      // Encrypt tokens before storing
      const encryptedAccessToken = await encrypt(tokens.access_token);
      const encryptedRefreshToken = await encrypt(tokens.refresh_token);

      // Store connection in database
      const result = await pool.query(
        `INSERT INTO email_connections
          (user_id, provider, email_address, access_token, refresh_token, token_expires_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, provider)
         DO UPDATE SET
           email_address = EXCLUDED.email_address,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           token_expires_at = EXCLUDED.token_expires_at,
           is_active = EXCLUDED.is_active,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, user_id, provider, email_address, is_active, created_at`,
        [
          userId,
          'gmail',
          emailAddress,
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          true,
        ]
      );

      logger.info(`Gmail connected for user ${userId}: ${emailAddress}`);

      return {
        connectionId: result.rows[0].id,
        provider: result.rows[0].provider,
        emailAddress: result.rows[0].email_address,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      logger.error('Error connecting Gmail:', error);

      if (error.message?.includes('invalid_grant')) {
        throw new ValidationError('Invalid or expired authorization code');
      }

      throw error;
    }
  }

  /**
   * Refresh expired access token
   * @param {number} userId - User ID
   * @returns {Promise<Object>} New tokens
   */
  static async refreshAccessToken(userId) {
    // Get connection from database
    const result = await pool.query(
      `SELECT id, refresh_token, token_expires_at
       FROM email_connections
       WHERE user_id = $1 AND provider = 'gmail' AND is_active = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Gmail connection');
    }

    const connection = result.rows[0];

    try {
      // Decrypt refresh token
      const refreshToken = await decrypt(connection.refresh_token);

      // Get new access token
      const newTokens = await googleAuth.refreshAccessToken(refreshToken);

      // Calculate new expiration
      const expiresAt = new Date(Date.now() + newTokens.expiry_date);

      // Encrypt new access token
      const encryptedAccessToken = await encrypt(newTokens.access_token);

      // Update in database
      await pool.query(
        `UPDATE email_connections
         SET access_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [encryptedAccessToken, expiresAt, connection.id]
      );

      logger.info(`Access token refreshed for user ${userId}`);

      return {
        accessToken: newTokens.access_token,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);

      // If refresh fails, mark connection as inactive
      await pool.query(
        `UPDATE email_connections SET is_active = FALSE WHERE id = $1`,
        [connection.id]
      );

      throw new ValidationError(
        'Failed to refresh access token. Please reconnect your Gmail account.'
      );
    }
  }

  /**
   * Get valid access token (refresh if expired)
   * @param {number} userId - User ID
   * @returns {Promise<string>} Valid access token
   */
  static async getValidAccessToken(userId) {
    const result = await pool.query(
      `SELECT id, access_token, refresh_token, token_expires_at
       FROM email_connections
       WHERE user_id = $1 AND provider = 'gmail' AND is_active = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Gmail connection');
    }

    const connection = result.rows[0];

    // Check if token is expired or will expire soon (within 5 minutes)
    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt < fiveMinutesFromNow) {
      logger.info(`Access token expired for user ${userId}, refreshing...`);
      const refreshed = await this.refreshAccessToken(userId);
      return refreshed.accessToken;
    }

    // Decrypt and return existing token
    return await decrypt(connection.access_token);
  }

  /**
   * Scan user's Gmail for order confirmation emails
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Scan results
   */
  static async scanEmailsForBrands(userId) {
    const startTime = Date.now();

    try {
      // Get valid access token
      const accessToken = await this.getValidAccessToken(userId);
      const connectionResult = await pool.query(
        `SELECT id, refresh_token FROM email_connections
         WHERE user_id = $1 AND provider = 'gmail' AND is_active = TRUE`,
        [userId]
      );

      const connectionId = connectionResult.rows[0].id;
      const refreshToken = await decrypt(connectionResult.rows[0].refresh_token);

      // Create Gmail client
      const gmail = googleAuth.createGmailClient(accessToken, refreshToken);

      // Calculate date range for scan
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - MONTHS_TO_SCAN_BACK);
      const dateFromFormatted = dateFrom.toISOString().split('T')[0].replace(/-/g, '/');

      // Search query for order confirmation emails
      const query = `after:${dateFromFormatted} (subject:order OR subject:confirmation OR subject:receipt OR subject:purchase)`;

      logger.info(`Scanning emails for user ${userId} with query: ${query}`);

      // Get list of matching emails
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: MAX_EMAILS_TO_SCAN,
      });

      const messageIds = listResponse.data.messages || [];
      logger.info(`Found ${messageIds.length} potential order emails`);

      if (messageIds.length === 0) {
        return this.createScanResult(userId, connectionId, 0, [], startTime);
      }

      // Process emails in batches
      const allBrandMatches = [];
      const extractedBrands = [];
      const allStoresDetected = [];

      for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        const batch = messageIds.slice(i, i + BATCH_SIZE);
        const batchResults = await this.processBatch(gmail, batch, userId, connectionId);

        allBrandMatches.push(...batchResults.matches);
        extractedBrands.push(...batchResults.extracted);
        allStoresDetected.push(...batchResults.storesDetected);
      }

      // Remove duplicates
      const uniqueMatches = this.deduplicateMatches(allBrandMatches);
      const uniqueStores = this.deduplicateStores(allStoresDetected);

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
        uniqueStores,
        startTime
      );

      // Update last_scanned_at
      await pool.query(
        `UPDATE email_connections SET last_scanned_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [connectionId]
      );

      logger.info(
        `Email scan completed for user ${userId}: ${uniqueMatches.length} brands matched, ${followedBrandIds.length} auto-followed, ${uniqueStores.length} stores detected`
      );

      return scanResult;
    } catch (error) {
      logger.error('Error scanning emails:', error);
      throw error;
    }
  }

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
    const storesDetected = [];

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

        // NEW: Match email to store account
        const store = await StoreAccountService.matchEmailToStore(headers.fromEmail);

        if (store) {
          // Extract order details from email body
          const emailBody = emailParser.getEmailBody(message.data);
          const orderDetails = emailParser.extractOrderDetails(emailBody);

          // Create or update store account
          const storeAccount = await StoreAccountService.createOrUpdateStoreAccount(userId, {
            storeId: store.id,
            accountEmail: headers.toEmail || headers.fromEmail,
            orderNumber: orderDetails.orderNumber,
            orderDate: headers.date || new Date(),
            orderTotal: orderDetails.totalCents,
            gmailMessageId: id,
          });

          storesDetected.push({
            storeId: store.id,
            storeName: store.display_name || store.name,
            accountId: storeAccount.id,
            orderCount: storeAccount.total_orders_detected,
          });

          logger.debug(`Store account detected: ${store.display_name} for user ${userId}`);
        }
      } catch (error) {
        logger.error(`Error processing email ${id}:`, error);
        // Continue with next email
      }
    }

    return { matches, extracted, storesDetected };
  }

  /**
   * Deduplicate brand matches
   * @param {Array} matches - Array of brand matches
   * @returns {Array} Deduplicated matches
   */
  static deduplicateMatches(matches) {
    const seen = new Map();

    for (const match of matches) {
      const existing = seen.get(match.brandId);

      if (!existing || match.confidenceScore > existing.confidenceScore) {
        seen.set(match.brandId, match);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Deduplicate store detections
   * @param {Array} stores - Array of detected stores
   * @returns {Array} Deduplicated stores with aggregated order counts
   */
  static deduplicateStores(stores) {
    const seen = new Map();

    for (const store of stores) {
      const existing = seen.get(store.storeId);

      if (!existing) {
        seen.set(store.storeId, store);
      } else {
        // Keep the entry with higher order count
        existing.orderCount = Math.max(existing.orderCount, store.orderCount);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Store scan result in database
   * @param {number} userId - User ID
   * @param {number} connectionId - Connection ID
   * @param {number} emailsScanned - Number of emails scanned
   * @param {Array} extractedBrands - Extracted brand identifiers
   * @param {Array} matchedBrands - Matched brands
   * @param {Array} followedBrandIds - Auto-followed brand IDs
   * @param {Array} storesDetected - Detected stores
   * @param {number} startTime - Scan start time
   * @returns {Promise<Object>} Scan result
   */
  static async storeScanResult(
    userId,
    connectionId,
    emailsScanned,
    extractedBrands,
    matchedBrands,
    followedBrandIds,
    storesDetected,
    startTime
  ) {
    const duration = Date.now() - startTime;

    const brandsFound = extractedBrands.map((b) => b.identifier);
    const brandsMatched = matchedBrands.map((m) => ({
      brandId: m.brandId,
      brandName: m.brandName,
      confidenceScore: m.confidenceScore,
    }));

    const storesFound = storesDetected.map((s) => ({
      storeId: s.storeId,
      storeName: s.storeName,
      orderCount: s.orderCount,
    }));

    const result = await pool.query(
      `INSERT INTO email_scan_results
        (user_id, email_connection_id, emails_scanned, brands_found, brands_matched, brands_auto_followed, scan_duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        connectionId,
        emailsScanned,
        JSON.stringify(brandsFound),
        JSON.stringify(brandsMatched),
        JSON.stringify(followedBrandIds),
        duration,
      ]
    );

    return {
      scanId: result.rows[0].id,
      emailsScanned,
      brandsFound: brandsFound.length,
      brandsMatched: matchedBrands.length,
      brandsAutoFollowed: followedBrandIds.length,
      storesDetected: storesDetected.length,
      durationMs: duration,
      details: {
        matchedBrands: brandsMatched,
        followedBrandIds,
        storesDetected: storesFound,
      },
    };
  }

  /**
   * Create empty scan result
   * @param {number} userId - User ID
   * @param {number} connectionId - Connection ID
   * @param {number} emailsScanned - Number of emails scanned
   * @param {Array} errors - Any errors encountered
   * @param {number} startTime - Scan start time
   * @returns {Object} Empty scan result
   */
  static createScanResult(userId, connectionId, emailsScanned, errors, startTime) {
    return {
      emailsScanned,
      brandsFound: 0,
      brandsMatched: 0,
      brandsAutoFollowed: 0,
      durationMs: Date.now() - startTime,
      details: {
        matchedBrands: [],
        followedBrandIds: [],
        errors,
      },
    };
  }

  /**
   * Disconnect email connection
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async disconnectEmail(userId) {
    const result = await pool.query(
      `UPDATE email_connections
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND provider = 'gmail'
       RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Gmail connection');
    }

    logger.info(`Gmail disconnected for user ${userId}`);
  }

  /**
   * Get email connection status
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Connection status or null
   */
  static async getConnectionStatus(userId) {
    const result = await pool.query(
      `SELECT
         id,
         provider,
         email_address,
         last_scanned_at,
         is_active,
         created_at,
         updated_at
       FROM email_connections
       WHERE user_id = $1 AND provider = 'gmail'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const connection = result.rows[0];

    // Get latest scan result
    const scanResult = await pool.query(
      `SELECT
         scan_date,
         emails_scanned,
         brands_found,
         brands_matched,
         brands_auto_followed
       FROM email_scan_results
       WHERE user_id = $1 AND email_connection_id = $2
       ORDER BY scan_date DESC
       LIMIT 1`,
      [userId, connection.id]
    );

    return {
      isConnected: connection.is_active,
      emailAddress: connection.email_address,
      lastScannedAt: connection.last_scanned_at,
      connectedAt: connection.created_at,
      lastScanResult: scanResult.rows[0] || null,
    };
  }
}

module.exports = EmailScannerService;
