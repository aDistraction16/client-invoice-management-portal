import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

export default db;
