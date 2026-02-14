#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../migrations');
const LEGACY_ALLOWED_DUPLICATE_PREFIXES = new Set(['013', '024', '025', '026', '062']);

function getPrefix(filename) {
  const match = filename.match(/^(\d+)_/);
  return match ? match[1] : null;
}

function main() {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const byPrefix = new Map();
  const invalid = [];

  for (const file of files) {
    const prefix = getPrefix(file);
    if (!prefix) {
      invalid.push(file);
      continue;
    }
    if (!byPrefix.has(prefix)) {
      byPrefix.set(prefix, []);
    }
    byPrefix.get(prefix).push(file);
  }

  const duplicates = Array.from(byPrefix.entries())
    .filter(([, list]) => list.length > 1)
    .map(([prefix, list]) => ({ prefix, list }));
  const unexpectedDuplicates = duplicates.filter(
    ({ prefix }) => !LEGACY_ALLOWED_DUPLICATE_PREFIXES.has(prefix)
  );

  if (invalid.length > 0) {
    console.error('Invalid migration filenames (missing numeric prefix):');
    invalid.forEach((file) => console.error(`- ${file}`));
  }

  if (duplicates.length > 0) {
    console.warn('Duplicate migration prefixes detected:');
    duplicates.forEach(({ prefix, list }) => {
      const tag = LEGACY_ALLOWED_DUPLICATE_PREFIXES.has(prefix) ? 'legacy-allowed' : 'unexpected';
      console.warn(`- [${tag}] ${prefix}: ${list.join(', ')}`);
    });
  }

  if (invalid.length === 0 && unexpectedDuplicates.length === 0) {
    console.log('Migration filename check passed.');
    process.exit(0);
  }

  process.exit(1);
}

main();
