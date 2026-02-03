/**
 * Data Deletion Callback Routes
 * Required for Meta/Facebook platform compliance
 * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db/pool');
const logger = require('../utils/logger');

/**
 * POST /data-deletion-callback
 * Meta/Facebook data deletion callback endpoint
 *
 * When a user deletes their Facebook/Instagram account or revokes app permissions,
 * Meta sends a signed request to this endpoint with the user's ID.
 *
 * Required response format:
 * {
 *   url: "https://yourdomain.com/deletion?id=<unique_confirmation_code>",
 *   confirmation_code: "<unique_confirmation_code>"
 * }
 */
router.post('/data-deletion-callback', async (req, res) => {
  try {
    const { signed_request } = req.body;

    if (!signed_request) {
      logger.error('Data deletion callback: missing signed_request');
      return res.status(400).json({
        error: 'Missing signed_request parameter'
      });
    }

    // Parse and verify the signed request
    const parsed = parseSignedRequest(signed_request, process.env.FACEBOOK_APP_SECRET);

    if (!parsed) {
      logger.error('Data deletion callback: invalid signature');
      return res.status(401).json({
        error: 'Invalid signature'
      });
    }

    const { user_id, algorithm } = parsed;

    if (!user_id) {
      logger.error('Data deletion callback: missing user_id');
      return res.status(400).json({
        error: 'Missing user_id in signed request'
      });
    }

    logger.info(`Data deletion request for Meta user: ${user_id}`);

    // Generate unique confirmation code
    const confirmationCode = crypto.randomBytes(16).toString('hex');
    const confirmationUrl = `${process.env.APP_URL}/deletion-status?id=${confirmationCode}`;

    // Find user by Meta user ID
    const userResult = await pool.query(
      `SELECT u.id, u.email
       FROM users u
       JOIN social_connections sc ON u.id = sc.user_id
       WHERE sc.platform = 'instagram' AND sc.platform_user_id = $1`,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      logger.warn(`Data deletion request for unknown Meta user: ${user_id}`);

      // Still return success - user might have already been deleted
      return res.json({
        url: confirmationUrl,
        confirmation_code: confirmationCode
      });
    }

    const user = userResult.rows[0];

    // Log the deletion request
    await pool.query(
      `INSERT INTO audit_logs (
        user_id, action, resource_type, description,
        metadata, severity, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user.id,
        'data_deletion_request',
        'user_data',
        'Meta/Facebook data deletion request received',
        JSON.stringify({
          meta_user_id: user_id,
          confirmation_code: confirmationCode,
          algorithm
        }),
        'warning',
        'pending'
      ]
    );

    // Delete Instagram-related data
    await deleteInstagramData(user.id, user_id, confirmationCode);

    logger.info(`Instagram data deleted for user ${user.id} (Meta ID: ${user_id})`);

    // Return confirmation URL
    res.json({
      url: confirmationUrl,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    logger.error('Data deletion callback error:', error);
    res.status(500).json({
      error: 'Internal server error processing deletion request'
    });
  }
});

/**
 * GET /deletion-status
 * Deletion confirmation status page
 */
router.get('/deletion-status', async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing confirmation ID');
  }

  // Look up deletion request by confirmation code
  const result = await pool.query(
    `SELECT created_at, status, metadata
     FROM audit_logs
     WHERE action = 'data_deletion_request'
       AND metadata->>'confirmation_code' = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).send('Deletion request not found');
  }

  const deletion = result.rows[0];

  // Return simple HTML status page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Data Deletion Status</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          line-height: 1.6;
        }
        .status {
          background: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 15px;
          margin: 20px 0;
        }
        .details {
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <h1>Data Deletion Status</h1>
      <div class="status">
        <p><strong>Status:</strong> ${deletion.status === 'completed' ? 'Completed' : 'In Progress'}</p>
        <p><strong>Request Date:</strong> ${new Date(deletion.created_at).toLocaleString()}</p>
      </div>
      <div class="details">
        <p>Your Instagram-related data has been removed from our system in compliance with Meta's data deletion policy.</p>
        <p>Confirmation Code: ${id}</p>
        <h3>Data Deleted:</h3>
        <ul>
          <li>Instagram OAuth tokens</li>
          <li>Instagram follows data</li>
          <li>Instagram style insights</li>
          <li>Connected social accounts</li>
        </ul>
        <p>If you have any questions, please contact support.</p>
      </div>
    </body>
    </html>
  `);
});

/**
 * Delete all Instagram-related data for a user
 */
async function deleteInstagramData(userId, metaUserId, confirmationCode) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete Instagram style insights
    await client.query(
      'DELETE FROM instagram_style_insights WHERE user_id = $1',
      [userId]
    );

    // Delete user Instagram follows
    await client.query(
      'DELETE FROM user_instagram_follows WHERE user_id = $1',
      [userId]
    );

    // Delete social connection
    await client.query(
      `DELETE FROM social_connections
       WHERE user_id = $1 AND platform = 'instagram'`,
      [userId]
    );

    // Log completion
    await client.query(
      `UPDATE audit_logs
       SET status = 'completed',
           metadata = metadata || $1::jsonb
       WHERE action = 'data_deletion_request'
         AND metadata->>'confirmation_code' = $2`,
      [
        JSON.stringify({
          completed_at: new Date().toISOString(),
          tables_cleared: ['instagram_style_insights', 'user_instagram_follows', 'social_connections']
        }),
        confirmationCode
      ]
    );

    await client.query('COMMIT');

    logger.info(`Instagram data deletion completed for user ${userId}`);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting Instagram data:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Parse and verify Meta's signed request
 * https://developers.facebook.com/docs/games/gamesonfacebook/login#parsingsr
 */
function parseSignedRequest(signedRequest, appSecret) {
  if (!signedRequest || !appSecret) {
    return null;
  }

  const [encodedSig, payload] = signedRequest.split('.', 2);

  if (!encodedSig || !payload) {
    return null;
  }

  // Decode signature
  const sig = base64UrlDecode(encodedSig);

  // Decode payload
  const data = JSON.parse(base64UrlDecode(payload));

  // Check algorithm
  if (!data.algorithm || data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
    logger.error('Unknown algorithm. Expected HMAC-SHA256');
    return null;
  }

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest();

  if (!crypto.timingSafeEqual(Buffer.from(sig), expectedSig)) {
    logger.error('Invalid signature');
    return null;
  }

  return data;
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str) {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }

  return Buffer.from(base64, 'base64').toString('utf8');
}

module.exports = router;
