#!/usr/bin/env node

/**
 * Automatic Test Watcher
 * Runs tests automatically when files change and provides clear output
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Automatic Testing Enabled\n');
console.log('Watching for file changes...');
console.log('Tests will run automatically when you save files.\n');
console.log('─'.repeat(60));

// Run Jest in watch mode
const jest = spawn('npx', ['jest', '--watch', '--testEnvironment=node', '--passWithNoTests'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    FORCE_COLOR: '1', // Enable colored output
  },
});

jest.on('error', (error) => {
  console.error('Failed to start test watcher:', error);
  process.exit(1);
});

jest.on('exit', (code) => {
  console.log('\n🛑 Test watcher stopped');
  process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping test watcher...');
  jest.kill('SIGINT');
  process.exit(0);
});
