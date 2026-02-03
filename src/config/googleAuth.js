/**
 * Google OAuth 2.0 Configuration for Gmail API
 * Handles authentication and authorization for Gmail integration
 */

const { google } = require('googleapis');
require('dotenv').config();

/**
 * Gmail API scopes required for the application
 * gmail.readonly - Read-only access to Gmail (for scanning emails)
 */
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email', // To get user's email address
];

/**
 * Create and configure OAuth2 client
 * @returns {OAuth2Client} Configured OAuth2 client
 */
function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  return oauth2Client;
}

/**
 * Generate authorization URL for OAuth flow
 * @param {number} userId - User ID to include in state parameter
 * @returns {string} Authorization URL to redirect user to
 */
function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get refresh token
    scope: GMAIL_SCOPES,
    prompt: 'consent', // Force consent screen to ensure refresh token is returned
    state: userId.toString(), // Pass userId so callback knows which user is connecting
  });

  return authUrl;
}

/**
 * Exchange authorization code for access and refresh tokens
 * @param {string} code - Authorization code from OAuth callback
 * @returns {Promise<Object>} Token object containing access_token, refresh_token, etc.
 */
async function getTokensFromCode(code) {
  const oauth2Client = createOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Refresh an expired access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New token object
 */
async function refreshAccessToken(refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

/**
 * Create an authenticated Gmail API client
 * @param {string} accessToken - Valid access token
 * @param {string} refreshToken - Refresh token
 * @returns {gmail_v1.Gmail} Authenticated Gmail client
 */
function createGmailClient(accessToken, refreshToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  return gmail;
}

/**
 * Verify OAuth2 client configuration
 * @returns {boolean} True if configuration is valid
 */
function verifyConfiguration() {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
  ];

  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  return true;
}

module.exports = {
  GMAIL_SCOPES,
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  refreshAccessToken,
  createGmailClient,
  verifyConfiguration,
};
