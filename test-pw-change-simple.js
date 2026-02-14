const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing Admin Password Change\n');

  // Step 1: Login
  console.log('Step 1: Login...');
  const login = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'hannah@muse.shopping',
    password: 'MuseAdmin2024!'
  });

  if (!login.data.success) {
    console.error('❌ Login failed:', login.data);
    return;
  }

  console.log('✅ Login successful');
  const token = login.data.data.tokens.access_token;
  const fullName = login.data.data.user.full_name;

  // Step 2: Change password
  console.log('\nStep 2: Change password...');
  const update = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/users/me/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    full_name: fullName,
    password: 'NewPassword123!'
  });

  console.log('Response:', JSON.stringify(update, null, 2));

  if (!update.data.success) {
    console.error('❌ Update failed');
    return;
  }

  console.log('✅ Password changed!');

  // Step 3: Test new password
  console.log('\nStep 3: Test new password...');
  const newLogin = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'hannah@muse.shopping',
    password: 'NewPassword123!'
  });

  if (!newLogin.data.success) {
    console.error('❌ New password login failed');
    return;
  }

  console.log('✅ New password works!');

  // Step 4: Reset password
  console.log('\nStep 4: Reset to original...');
  const reset = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/users/me/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newLogin.data.data.tokens.access_token}`
    }
  }, {
    full_name: fullName,
    password: 'MuseAdmin2024!'
  });

  if (!reset.data.success) {
    console.error('❌ Reset failed');
    return;
  }

  console.log('✅ Password reset!');
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL TESTS PASSED!');
  console.log('='.repeat(60));
  console.log('\nThe password change API is working correctly!');
  console.log('The "Save Changes" button in the UI will now work.');
}

test().catch(console.error);
