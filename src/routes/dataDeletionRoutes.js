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
const { findUserIdByMetaId, deleteInstagramData } = require('../services/privacyDeletion');

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
    const siteUrl = (process.env.APP_URL || 'https://www.muse.shopping').replace(/\/+$/, '');
    const confirmationUrl = `${siteUrl}/api/v1/deletion-status?id=${confirmationCode}`;

    // Find the Muse user behind this Meta user id
    const userId = await findUserIdByMetaId(user_id);

    if (!userId) {
      logger.warn(`Data deletion request for unknown Meta user: ${user_id}`);

      // Still return success - user might have already been deleted
      return res.json({
        url: confirmationUrl,
        confirmation_code: confirmationCode
      });
    }

    // Delete right away; nothing waits for a person.
    const deleted = await deleteInstagramData(userId);

    // Record it so the status page can show it was done
    await pool.query(
      `INSERT INTO audit_logs (
        user_id, action, resource_type, description,
        metadata, severity, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'data_deletion_request',
        'user_data',
        'Meta data deletion request received and completed',
        JSON.stringify({
          meta_user_id: user_id,
          confirmation_code: confirmationCode,
          algorithm,
          completed_at: new Date().toISOString(),
          deleted
        }),
        'info',
        'completed'
      ]
    );

    logger.info(`Instagram data deleted for user ${userId} (Meta ID: ${user_id})`);

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

  let sig;
  let data;
  try {
    sig = Buffer.from(base64UrlToBase64(encodedSig), 'base64');
    data = JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }

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

  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
    logger.error('Invalid signature');
    return null;
  }

  return data;
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str) {
  return Buffer.from(base64UrlToBase64(str), 'base64').toString('utf8');
}

function base64UrlToBase64(str) {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }

  return base64;
}

module.exports = router;
module.exports.parseSignedRequest = parseSignedRequest;
