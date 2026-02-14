#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const loadEnv = require('../src/config/loadEnv');
const { validateEnvironment } = require('../src/config/envValidation');

const rootDir = path.join(__dirname, '..');
const frontendEnvFiles = [
  path.join(rootDir, 'frontend/.env.local'),
  path.join(rootDir, 'frontend/.env'),
];

loadEnv({ skipValidation: true });

frontendEnvFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: false });
  }
});

const strict = process.env.ENV_VALIDATION_STRICT === 'true';
const result = validateEnvironment({
  includeFrontend: true,
  failFast: false,
});

if (result.missing.length > 0) {
  console.error('Missing required environment variables:');
  result.missing.forEach((name) => console.error(`- ${name}`));
}

if (result.warnings.length > 0) {
  console.warn('Environment warnings:');
  result.warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (result.ok) {
  console.log('Environment validation passed.');
  process.exit(0);
}

process.exit(strict ? 1 : 0);
