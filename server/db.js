import 'dotenv/config';
import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://shariqkhan@localhost:5432/orion_rfq_mvp';

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export const query = (text, params) => pool.query(text, params);
