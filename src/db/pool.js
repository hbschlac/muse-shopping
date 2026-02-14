const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL if available (Vercel/production), otherwise use individual vars
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Serverless-friendly settings
      min: 0,
      max: parseInt(process.env.DB_POOL_MAX_SERVERLESS) || 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Performance optimizations
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // 30s max query time
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 20000, // 20s query timeout
      application_name: 'muse-shopping-api',
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // Optimized pool settings for development/dedicated server
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      // Performance optimizations
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 20000,
      application_name: 'muse-shopping-api',
      // Connection reuse optimization
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('connect', (client) => {
  console.log('Database pool connected');
  // Set optimal PostgreSQL parameters for performance
  client.query('SET join_collapse_limit = 12');
  client.query('SET from_collapse_limit = 12');
  client.query('SET random_page_cost = 1.1'); // Optimized for SSD
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit in serverless environment
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

pool.on('acquire', () => {
  const totalCount = pool.totalCount;
  const idleCount = pool.idleCount;
  const waitingCount = pool.waitingCount;
  if (waitingCount > 0) {
    console.warn(`Pool pressure: ${waitingCount} waiting, ${totalCount} total, ${idleCount} idle`);
  }
});

module.exports = pool;
