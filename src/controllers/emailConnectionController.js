/**
 * Email Connection Controller
 * Handles HTTP requests for Gmail integration
 */

const EmailScannerService = require('../services/emailScannerService');
const { successResponse } = require('../utils/responseFormatter');
const { ValidationError } = require('../utils/errors');

class EmailConnectionController {
  /**
   * Start OAuth flow - return authorization URL
   * GET /api/v1/email/connect
   */
  static async initiateConnection(req, res, next) {
    try {
      // Pass userId as state parameter
      const authUrl = EmailScannerService.getAuthUrl(req.userId);

      res.status(200).json(
        successResponse(
          { authUrl },
          'Please visit the authorization URL to connect your Gmail account'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle OAuth callback - complete connection
   * GET /api/v1/email/callback?code=xxx&state=userId
   */
  static async handleCallback(req, res, next) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).send('<h1>Error: Authorization code missing</h1><p>Please try connecting your Gmail again.</p>');
      }

      if (!state) {
        return res.status(400).send('<h1>Error: Invalid request</h1><p>Missing state parameter. Please try connecting your Gmail again.</p>');
      }

      // state contains the userId
      const userId = parseInt(state);

      const connection = await EmailScannerService.connectGmail(userId, code);

      // Return friendly HTML page
      res.status(200).send(`
        <html>
          <head>
            <title>Gmail Connected - Muse Shopping</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; }
              h1 { color: #10b981; font-size: 32px; margin-bottom: 16px; }
              p { color: #6b7280; font-size: 18px; line-height: 1.6; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 24px; }
              .button:hover { background: #5a67d8; }
              .emoji { font-size: 64px; margin-bottom: 24px; }
            </style>
          </head>
          <body>
            <div class="emoji">✅</div>
            <h1>Gmail Connected Successfully!</h1>
            <p>Your Gmail account has been securely connected to Muse Shopping.</p>
            <p>We'll now scan your order confirmations to find brands you already shop at and automatically follow them for you.</p>
            <a href="http://localhost:8080/demo.html" class="button">Return to Muse</a>
            <script>
              // Auto-close this window after 3 seconds
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
      `);

      // Trigger automatic scan in the background (don't wait for it)
      EmailScannerService.scanEmailsForBrands(userId).catch(err => {
        console.error('Background email scan failed:', err);
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger email scan for brands
   * POST /api/v1/email/scan
   */
  static async scanEmails(req, res, next) {
    try {
      const scanResult = await EmailScannerService.scanEmailsForBrands(req.userId);

      res.status(200).json(
        successResponse(
          scanResult,
          `Email scan completed. Found ${scanResult.brandsMatched} brands, auto-followed ${scanResult.brandsAutoFollowed}.`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get connection status
   * GET /api/v1/email/status
   */
  static async getStatus(req, res, next) {
    try {
      const status = await EmailScannerService.getConnectionStatus(req.userId);

      if (!status) {
        return res.status(200).json(
          successResponse(
            { isConnected: false },
            'No Gmail connection found'
          )
        );
      }

      res.status(200).json(successResponse(status));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disconnect Gmail connection
   * DELETE /api/v1/email/disconnect
   */
  static async disconnect(req, res, next) {
    try {
      await EmailScannerService.disconnectEmail(req.userId);

      res.status(200).json(
        successResponse(null, 'Gmail account disconnected successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scan history
   * GET /api/v1/email/scans
   */
  static async getScanHistory(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const pool = require('../db/pool');

      const result = await pool.query(
        `SELECT
           id,
           scan_date,
           emails_scanned,
           brands_found,
           brands_matched,
           brands_auto_followed,
           scan_duration_ms
         FROM email_scan_results
         WHERE user_id = $1
         ORDER BY scan_date DESC
         LIMIT $2 OFFSET $3`,
        [req.userId, parseInt(limit), offset]
      );

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM email_scan_results WHERE user_id = $1`,
        [req.userId]
      );

      const total = parseInt(countResult.rows[0].count);

      res.status(200).json(
        successResponse({
          scans: result.rows,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EmailConnectionController;
