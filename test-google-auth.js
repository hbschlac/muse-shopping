const pool = require('./src/db/pool');

async function testGoogleUserCreation() {
  try {
    console.log('Testing Google user creation...');
    
    // Simulate what the Google OAuth service does
    const testEmail = `test-google-${Date.now()}@example.com`;
    const testGoogleId = `google_${Date.now()}`;
    
    const result = await pool.query(
      `INSERT INTO users
        (email, first_name, last_name, google_id, email_verified, is_active, last_login_at)
       VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
       RETURNING id, email, first_name, last_name, google_id, is_active, created_at, onboarding_completed`,
      [testEmail, 'Test', 'User', testGoogleId, true]
    );
    
    console.log('✅ User created successfully!');
    console.log('User data:', result.rows[0]);
    
    // Clean up
    await pool.query('DELETE FROM users WHERE id = $1', [result.rows[0].id]);
    console.log('✅ Test user cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testGoogleUserCreation();
