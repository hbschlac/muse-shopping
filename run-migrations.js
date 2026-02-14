const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  // Clean the DATABASE_URL (remove newlines)
  const databaseUrl = process.env.DATABASE_URL.trim().replace(/\\n/g, '');

  console.log('Connecting to production database...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Run migration 025
    console.log('\n🚀 Running migration 025 (4D → 16D)...');
    const migration025 = fs.readFileSync(
      path.join(__dirname, 'migrations', '025_expand_style_profile_dimensions.sql'),
      'utf8'
    );
    await client.query(migration025);
    console.log('✅ Migration 025 complete');

    // Run migration 026
    console.log('\n🚀 Running migration 026 (16D → 100D)...');
    const migration026 = fs.readFileSync(
      path.join(__dirname, 'migrations', '026_expand_to_100_dimensions.sql'),
      'utf8'
    );
    await client.query(migration026);
    console.log('✅ Migration 026 complete');

    // Verify
    console.log('\n🔍 Verifying columns...');
    const result = await client.query(`
      SELECT COUNT(*) FROM information_schema.columns
      WHERE table_name = 'style_profiles'
      AND column_name LIKE '%_layers'
    `);

    const count = parseInt(result.rows[0].count);
    console.log(`\n📊 Total dimension columns: ${count}`);

    if (count === 100) {
      console.log('✅ All 100 dimension columns verified!');
      console.log('\n🎉 100D SYSTEM IS NOW LIVE IN PRODUCTION!');
    } else {
      console.log(`⚠️  Expected 100 columns, found ${count}`);
    }

  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
