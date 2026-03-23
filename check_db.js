import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:backend/inventory.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  try {
    const result = await db.execute("PRAGMA table_info(auto_orders)");
    console.log('--- auto_orders COLUMNS ---');
    result.rows.forEach(row => {
      console.log(`- ${row.name} (${row.type})`);
    });
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    process.exit(0);
  }
}

check();
