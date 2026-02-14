const { Pool } = require('pg');

const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'muse_shopping_dev',
  user: 'muse_admin',
  password: 'SecurePassword123!'
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_J57iDsBcWVkX@ep-cool-bread-aigme40c.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function migrateUsers() {
  try {
    console.log('📦 Fetching users from local database...');
    const { rows: users } = await localPool.query('SELECT * FROM users ORDER BY id');
    console.log(`Found ${users.length} users`);

    console.log('📥 Inserting users into Neon...');
    
    // Get column names from first user
    const columns = Object.keys(users[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    let inserted = 0;
    for (const user of users) {
      try {
        const values = columns.map(col => user[col]);
        await neonPool.query(
          `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          values
        );
        inserted++;
      } catch (err) {
        console.error(`Error inserting user ${user.id}:`, err.message);
      }
      process.stdout.write(`\r${inserted}/${users.length} users inserted...`);
    }
    
    console.log(`\n✅ Successfully inserted ${inserted} users`);

    // Update sequence
    await neonPool.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
    console.log('🔢 Updated users sequence');

    const { rows } = await neonPool.query('SELECT COUNT(*) FROM users');
    console.log(`\n✅ Final count: ${rows[0].count} users in Neon database`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

migrateUsers();
