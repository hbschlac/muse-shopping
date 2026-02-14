/**
 * Create Admin Account Script (Simple Version)
 * Run this to create your first admin account
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createAdmin() {
  // EDIT THESE VALUES
  const adminDetails = {
    fullName: 'Hannah Schlacter',
    email: 'hannah@muse.shopping',
    password: 'MuseAdmin2024!'
  };

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const { fullName, email, password } = adminDetails;

    // Validate
    if (!fullName || !email || !password) {
      console.error('❌ All fields are required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.is_admin) {
        console.log('ℹ️  Admin account already exists for this email');
        console.log(`User ID: ${user.id}`);
        console.log(`Email: ${email}`);
        console.log('\n🌐 Login at: http://localhost:3000/api/v1/admin/email-ui/login');
        process.exit(0);
      } else {
        // Update existing user to admin
        await client.query(
          'UPDATE users SET is_admin = $1 WHERE id = $2',
          [true, user.id]
        );
        console.log('✅ Updated existing user to admin!');
        console.log(`User ID: ${user.id}`);
        console.log(`Email: ${email}`);
        console.log('\n🌐 Login at: http://localhost:3000/api/v1/admin/email-ui/login');
        process.exit(0);
      }
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Create admin user
    console.log('👤 Creating admin account...');
    const result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, is_admin, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, email, full_name, is_admin`,
      [email, hashedPassword, fullName, true]
    );

    const admin = result.rows[0];

    console.log('\n✅ Admin account created successfully!\n');
    console.log('=== Account Details ===');
    console.log(`ID: ${admin.id}`);
    console.log(`Name: ${admin.full_name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Admin: ${admin.is_admin ? 'Yes' : 'No'}`);
    console.log('\n=== Login Credentials ===');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\n🌐 Login at: http://localhost:3000/api/v1/admin/email-ui/login');
    console.log('\n🎉 You can now login to the admin interface!');

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();
