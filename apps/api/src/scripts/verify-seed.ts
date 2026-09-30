import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function checkSeedData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const tablesCount = await client.query('SELECT count(*) FROM tables');
    const categoriesCount = await client.query('SELECT count(*) FROM menu_categories');
    const itemsCount = await client.query('SELECT count(*) FROM menu_items');
    const usersCount = await client.query('SELECT count(*) FROM admin_users');
    
    console.log('Seed Data Verification:');
    console.log(`Tables: ${tablesCount.rows[0].count}`);
    console.log(`Categories: ${categoriesCount.rows[0].count}`);
    console.log(`Menu Items: ${itemsCount.rows[0].count}`);
    console.log(`Admin Users: ${usersCount.rows[0].count}`);
    
    await client.end();
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

checkSeedData();
