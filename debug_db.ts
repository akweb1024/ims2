import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
  const url = process.env.DATABASE_URL;
  console.log('DATABASE_URL starts with:', url?.substring(0, 20));
  
  try {
    const pool = new Pool({ connectionString: url });
    const res = await pool.query('SELECT NOW()');
    console.log('Connection successful, server time:', res.rows[0]);
    await pool.end();
  } catch (e) {
    console.error('Connection failed:', e);
  }
}

debug();
