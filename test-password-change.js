/**
 * Test script to verify admin password change functionality
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testPasswordChange() {
  console.log('🧪 Testing Admin Password Change Functionality\n');

  try {
    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await fetch(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hannah@muse.shopping',
        password: 'SecureP@ss2025!'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.error);
      return;
    }

    console.log('✅ Login successful');
    console.log(`   User: ${loginData.data.user.full_name}`);
    console.log(`   Email: ${loginData.data.user.email}`);

    const token = loginData.data.token;
    const originalFullName = loginData.data.user.full_name;

    // Step 2: Update password
    console.log('\nStep 2: Updating password...');
    const updateResponse = await fetch(`${BASE_URL}/users/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        full_name: originalFullName,
        password: 'NewTestPassword123!'
      })
    });

    const updateData = await updateResponse.json();

    console.log('\nResponse Status:', updateResponse.status);
    console.log('Response Data:', JSON.stringify(updateData, null, 2));

    if (!updateData.success) {
      console.error('❌ Password update failed');
      if (updateData.error) {
        console.error('   Error:', updateData.error);
      }
      return;
    }

    console.log('✅ Password updated successfully!');

    // Step 3: Test login with new password
    console.log('\nStep 3: Testing login with new password...');
    const newLoginResponse = await fetch(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hannah@muse.shopping',
        password: 'NewTestPassword123!'
      })
    });

    const newLoginData = await newLoginResponse.json();

    if (!newLoginData.success) {
      console.error('❌ Login with new password failed');
      return;
    }

    console.log('✅ Login with new password successful!');

    // Step 4: Reset password back to original
    console.log('\nStep 4: Resetting password to original...');
    const resetResponse = await fetch(`${BASE_URL}/users/me/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newLoginData.data.token}`
      },
      body: JSON.stringify({
        full_name: originalFullName,
        password: 'SecureP@ss2025!'
      })
    });

    const resetData = await resetResponse.json();

    if (!resetData.success) {
      console.error('❌ Password reset failed');
      return;
    }

    console.log('✅ Password reset to original');

    // Step 5: Verify original password works
    console.log('\nStep 5: Verifying original password...');
    const finalLoginResponse = await fetch(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hannah@muse.shopping',
        password: 'SecureP@ss2025!'
      })
    });

    const finalLoginData = await finalLoginResponse.json();

    if (!finalLoginData.success) {
      console.error('❌ Final login verification failed');
      return;
    }

    console.log('✅ Original password verified');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✅ Password change functionality is working correctly!');
    console.log('✅ The "Save Changes" button in the admin UI will work.');
    console.log('\nNext steps:');
    console.log('1. Hard refresh the admin page (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('2. Open browser console (F12)');
    console.log('3. Click Account → Manage My Account');
    console.log('4. Enter a new password and click "Save Changes"');
    console.log('5. You should see success message and modal will close');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error('\nStack trace:', error.stack);
  }
}

// Run the test
testPasswordChange();
