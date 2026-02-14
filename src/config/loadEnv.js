const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { validateEnvironment } = require('./envValidation');

let loaded = false;

function loadEnv(options = {}) {
  const { skipValidation = false } = options;
  if (loaded) return;

  const rootDir = path.join(__dirname, '../..');
  const candidates = ['.env', '.env.local', '.env.production.local'];

  candidates.forEach((filename) => {
    const filePath = path.join(rootDir, filename);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: true });
    }
  });

  if (!skipValidation && process.env.NODE_ENV === 'production' && process.env.SKIP_ENV_VALIDATION !== 'true') {
    validateEnvironment({ failFast: true });
  }

  loaded = true;
}

module.exports = loadEnv;
