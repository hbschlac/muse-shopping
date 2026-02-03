/**
 * Test script for encryption utilities
 * Tests token encryption and decryption
 */

require('dotenv').config();
const { encrypt, decrypt, generateEncryptionKey } = require('../src/utils/encryption');

async function testEncryption() {
  console.log('=== Testing Encryption Utilities ===\n');

  // Test 1: Generate encryption key
  console.log('Test 1: Generate Encryption Key');
  const newKey = generateEncryptionKey();
  console.log(`Generated key: ${newKey}`);
  console.log(`Key length: ${newKey.length} characters`);
  console.log('✓ Passed\n');

  // Test 2: Check environment configuration
  console.log('Test 2: Check Environment Configuration');
  if (!process.env.ENCRYPTION_KEY) {
    console.error('✗ ENCRYPTION_KEY not set in .env file');
    console.log('\nTo fix: Add this to your .env file:');
    console.log(`ENCRYPTION_KEY=${newKey}\n`);
    process.exit(1);
  }
  console.log('✓ ENCRYPTION_KEY is configured\n');

  // Test 3: Encrypt test data
  console.log('Test 3: Encrypt Test Data');
  const testToken = 'test_oauth_access_token_12345';
  console.log(`Original token: ${testToken}`);

  const encrypted = await encrypt(testToken);
  console.log(`Encrypted: ${encrypted}`);
  console.log(`Encrypted length: ${encrypted.length} characters`);

  const parts = encrypted.split(':');
  console.log(`Format verification: ${parts.length} parts (should be 4)`);
  console.log('  - Salt length:', parts[0].length);
  console.log('  - IV length:', parts[1].length);
  console.log('  - Tag length:', parts[2].length);
  console.log('  - Encrypted length:', parts[3].length);

  if (parts.length !== 4) {
    console.error('✗ Invalid encrypted format');
    process.exit(1);
  }
  console.log('✓ Passed\n');

  // Test 4: Decrypt test data
  console.log('Test 4: Decrypt Test Data');
  const decrypted = await decrypt(encrypted);
  console.log(`Decrypted: ${decrypted}`);

  if (decrypted !== testToken) {
    console.error('✗ Decryption failed - tokens do not match');
    process.exit(1);
  }
  console.log('✓ Passed\n');

  // Test 5: Multiple encryptions produce different results
  console.log('Test 5: Verify Unique Salts (Multiple Encryptions)');
  const encrypted1 = await encrypt(testToken);
  const encrypted2 = await encrypt(testToken);
  const encrypted3 = await encrypt(testToken);

  console.log(`Encryption 1: ${encrypted1.substring(0, 50)}...`);
  console.log(`Encryption 2: ${encrypted2.substring(0, 50)}...`);
  console.log(`Encryption 3: ${encrypted3.substring(0, 50)}...`);

  if (encrypted1 === encrypted2 || encrypted2 === encrypted3) {
    console.error('✗ Multiple encryptions produced same result (salts not unique)');
    process.exit(1);
  }

  // Verify all decrypt to same value
  const decrypted1 = await decrypt(encrypted1);
  const decrypted2 = await decrypt(encrypted2);
  const decrypted3 = await decrypt(encrypted3);

  if (decrypted1 !== testToken || decrypted2 !== testToken || decrypted3 !== testToken) {
    console.error('✗ Not all encrypted values decrypt correctly');
    process.exit(1);
  }

  console.log('✓ Passed - All encryptions unique but decrypt to same value\n');

  // Test 6: Long token encryption
  console.log('Test 6: Encrypt Long Token');
  const longToken = 'a'.repeat(500);
  const encryptedLong = await encrypt(longToken);
  const decryptedLong = await decrypt(encryptedLong);

  console.log(`Long token length: ${longToken.length}`);
  console.log(`Encrypted length: ${encryptedLong.length}`);

  if (decryptedLong !== longToken) {
    console.error('✗ Long token decryption failed');
    process.exit(1);
  }
  console.log('✓ Passed\n');

  // Test 7: Special characters
  console.log('Test 7: Encrypt Special Characters');
  const specialToken = 'token!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
  const encryptedSpecial = await encrypt(specialToken);
  const decryptedSpecial = await decrypt(encryptedSpecial);

  console.log(`Special token: ${specialToken}`);

  if (decryptedSpecial !== specialToken) {
    console.error('✗ Special character decryption failed');
    process.exit(1);
  }
  console.log('✓ Passed\n');

  // Test 8: Error handling
  console.log('Test 8: Error Handling');
  try {
    await decrypt('invalid:encrypted:data');
    console.error('✗ Should have thrown error for invalid data');
    process.exit(1);
  } catch (error) {
    console.log('✓ Correctly throws error for invalid encrypted data\n');
  }

  // Summary
  console.log('=== All Tests Passed ===');
  console.log('\nEncryption utility is working correctly!');
  console.log('You can safely store OAuth tokens in the database.\n');
}

// Run tests
testEncryption().catch((error) => {
  console.error('\n✗ Test failed with error:');
  console.error(error);
  process.exit(1);
});
