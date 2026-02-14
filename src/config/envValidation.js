const REQUIRED_SECRET_MIN_LENGTH = 32;

function isEnabled(flagName, defaultValue = true) {
  const value = process.env[flagName];
  if (value === undefined) {
    return defaultValue;
  }

  return !['0', 'false', 'off', 'no'].includes(String(value).toLowerCase());
}

function hasValue(name) {
  const value = process.env[name];
  return value !== undefined && String(value).trim() !== '';
}

function validateEnvironment(options = {}) {
  const {
    includeFrontend = false,
    failFast = false,
  } = options;

  const missing = [];
  const warnings = [];

  const requireVar = (name) => {
    if (!hasValue(name)) {
      missing.push(name);
    }
  };

  requireVar('JWT_SECRET');
  requireVar('JWT_REFRESH_SECRET');
  requireVar('ENCRYPTION_KEY');

  if (!hasValue('DATABASE_URL')) {
    ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].forEach(requireVar);
  }

  if (isEnabled('ENABLE_STRIPE_PAYMENTS', true)) {
    requireVar('STRIPE_SECRET_KEY');
    requireVar('STRIPE_WEBHOOK_SECRET');
  }

  if (isEnabled('ENABLE_TRANSACTIONAL_EMAIL', true)) {
    ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'BASE_URL'].forEach(requireVar);
  }

  if (isEnabled('ENABLE_GOOGLE_AUTH', true)) {
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].forEach(requireVar);
  }

  if (isEnabled('ENABLE_APPLE_AUTH', true)) {
    requireVar('APPLE_CLIENT_ID');
  }

  if (isEnabled('ENABLE_META_AUTH', false)) {
    ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'].forEach(requireVar);
  }

  if (includeFrontend) {
    requireVar('NEXT_PUBLIC_API_URL');

    if (isEnabled('ENABLE_GOOGLE_AUTH', true)) {
      requireVar('NEXT_PUBLIC_GOOGLE_CLIENT_ID');
    }

    if (isEnabled('ENABLE_APPLE_AUTH', true)) {
      requireVar('NEXT_PUBLIC_APPLE_CLIENT_ID');
    }
  }

  if (hasValue('JWT_SECRET') && process.env.JWT_SECRET.length < REQUIRED_SECRET_MIN_LENGTH) {
    warnings.push(`JWT_SECRET should be at least ${REQUIRED_SECRET_MIN_LENGTH} characters`);
  }

  if (hasValue('JWT_REFRESH_SECRET') && process.env.JWT_REFRESH_SECRET.length < REQUIRED_SECRET_MIN_LENGTH) {
    warnings.push(`JWT_REFRESH_SECRET should be at least ${REQUIRED_SECRET_MIN_LENGTH} characters`);
  }

  if (hasValue('ENCRYPTION_KEY') && process.env.ENCRYPTION_KEY.length < REQUIRED_SECRET_MIN_LENGTH) {
    warnings.push(`ENCRYPTION_KEY should be at least ${REQUIRED_SECRET_MIN_LENGTH} characters`);
  }

  const result = {
    ok: missing.length === 0,
    missing,
    warnings,
  };

  if (failFast && !result.ok) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return result;
}

module.exports = {
  validateEnvironment,
};

