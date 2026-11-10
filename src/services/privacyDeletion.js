/**
 * Privacy deletion: the code behind the promises in the privacy policy
 * (frontend/app/privacy/page.tsx, sections 8 and 9). Every path here runs
 * automatically; none of it waits for a person.
 *
 * - deleteInstagramData: Meta's data deletion callback and Instagram disconnect.
 * - deleteGmailData:     Gmail disconnect (removes tokens and scan results).
 * - deleteAccount:       the shopper's "Delete my data" button and DELETE /users/me.
 *
 * Kept on purpose (the policy says so): agent_events (the shopping agent log)
 * and checkout_intents (order records), for fraud, disputes and legal duties.
 * Neither table holds a name, email or card number.
 *
 * Some tables are created on first use or by migrations that may not have run
 * everywhere, so each delete checks the table exists first.
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

const META_PROVIDERS = ['instagram', 'facebook'];

// Tables keyed by user_id with no foreign key to users, so deleting the user
// row does not remove them. Everything else cascades from users.
const UNLINKED_USER_TABLES = ['push_subscriptions', 'notification_prefs', 'alert_log'];

async function tableExists(db, table) {
  const { rows } = await db.query('SELECT to_regclass($1) AS t', [`public.${table}`]);
  return Boolean(rows[0] && rows[0].t);
}

async function deleteFrom(db, table, where, params) {
  if (!(await tableExists(db, table))) return 0;
  const result = await db.query(`DELETE FROM ${table} WHERE ${where}`, params);
  return result.rowCount || 0;
}

async function inTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find the Muse user behind a Meta user id (from Meta's signed request).
 * @returns {Promise<number|null>}
 */
async function findUserIdByMetaId(metaUserId) {
  const { rows } = await pool.query(
    `SELECT user_id FROM social_connections
      WHERE provider = ANY($1) AND provider_user_id = $2
      LIMIT 1`,
    [META_PROVIDERS, String(metaUserId)]
  );
  return rows.length ? rows[0].user_id : null;
}

/**
 * Delete everything Muse saved from Instagram/Facebook for a user.
 * @param {number} userId
 * @param {string[]} [providers] which connections to remove (default both)
 * @returns {Promise<Object>} rows deleted per table
 */
async function deleteInstagramData(userId, providers = META_PROVIDERS) {
  return inTransaction(async (db) => {
    const deleted = {
      social_connections: await deleteFrom(db, 'social_connections',
        'user_id = $1 AND provider = ANY($2)', [userId, providers]),
    };
    // Style data only goes once no Meta connection is left.
    const { rows } = await db.query(
      'SELECT 1 FROM social_connections WHERE user_id = $1 AND provider = ANY($2) LIMIT 1',
      [userId, META_PROVIDERS]
    );
    if (rows.length === 0) {
      for (const table of ['user_instagram_follows', 'instagram_style_insights', 'instagram_sync_jobs']) {
        deleted[table] = await deleteFrom(db, table, 'user_id = $1', [userId]);
      }
    }
    logger.info(`Instagram data deleted for user ${userId}`, { deleted });
    return deleted;
  });
}

/**
 * Delete the Gmail connection (encrypted tokens) and what Muse found in it.
 * Scan results and queued brands cascade from email_connections.
 */
async function deleteGmailData(userId) {
  return inTransaction(async (db) => {
    const deleted = {
      email_connections: await deleteFrom(db, 'email_connections', 'user_id = $1', [userId]),
    };
    logger.info(`Gmail data deleted for user ${userId}`, { deleted });
    return deleted;
  });
}

/**
 * Delete a shopper's account and personal data right away.
 * @returns {Promise<Object>} rows deleted per table
 */
async function deleteAccount(userId, reason = 'user_request') {
  const deleted = await inTransaction(async (db) => {
    const counts = {};
    for (const table of UNLINKED_USER_TABLES) {
      counts[table] = await deleteFrom(db, table, 'user_id = $1', [userId]);
    }
    // Cascades to profiles, saves, cart, watches, connections, activity, etc.
    counts.users = await deleteFrom(db, 'users', 'id = $1', [userId]);
    return counts;
  });

  // Record that it happened, without any personal details.
  try {
    if (await tableExists(pool, 'audit_logs')) {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, description, metadata, status, severity)
         VALUES (NULL, 'account_deleted', 'user', $1, 'Shopper account and personal data deleted', $2, 'success', 'info')`,
        [String(userId), JSON.stringify({ reason, deleted })]
      );
    }
  } catch (error) {
    logger.warn('Account deleted but audit log write failed', { userId, error: error.message });
  }

  logger.info(`Account ${userId} deleted (${reason})`, { deleted });
  return deleted;
}

module.exports = {
  findUserIdByMetaId,
  deleteInstagramData,
  deleteGmailData,
  deleteAccount,
  META_PROVIDERS,
};
