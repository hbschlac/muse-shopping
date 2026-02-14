/**
 * Create Admin Account Script
 * Run this to create your first admin account
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
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

    // Get admin details
    console.log('=== Create Admin Account ===\n');

    const fullName = await question('Full Name: ');
    const email = await question('Email: ');
    const password = await question('Password (min 8 chars): ');

    // Validate
    if (!fullName || !email || !password) {
      console.error('\n❌ All fields are required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('\n❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.error('\n❌ A user with this email already exists');
      process.exit(1);
    }

    // Hash password
    console.log('\n🔒 Hashing password...');
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
    console.log(`Admin: ${admin.is_admin}`);
    console.log('\n=== Login Credentials ===');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: [the password you just entered]`);
    console.log('\n🌐 Login at: http://localhost:3000/api/v1/admin/email-ui/login');
    console.log('\n🎉 You can now login to the admin interface!');

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    rl.close();
  }
}

createAdmin();
