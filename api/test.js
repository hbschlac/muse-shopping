/**
 * Simple test endpoint
 */

module.exports = (req, res) => {
  res.json({
    status: 'ok',
    message: 'Serverless function is working',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      hasJWT: !!process.env.JWT_SECRET
    }
  });
};
