// Idempotent seeder: creates the database (if missing), applies schema,
// upserts the fastener catalog, and inserts sample threads once.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { catalog } from './catalog.seed.js';
import { sampleThreads } from './threads.seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://shariqkhan@localhost:5432/orion_rfq_mvp';

const dbName = new URL(DATABASE_URL).pathname.replace(/^\//, '') || 'orion_rfq_mvp';

async function ensureDatabase() {
  // Connect to the maintenance DB to create the target if needed.
  const adminUrl = new URL(DATABASE_URL);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rowCount) {
    await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`✓ created database "${dbName}"`);
  } else {
    console.log(`• database "${dbName}" already exists`);
  }
  await admin.end();
}

async function run() {
  await ensureDatabase();

  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  // Schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('✓ schema applied');

  // Catalog upsert
  let up = 0;
  for (const c of catalog) {
    await pool.query(
      `INSERT INTO catalog (sku, part_number, name, description, category, uom, unit_qty, price_per_unit, attributes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (sku) DO UPDATE SET
         part_number=EXCLUDED.part_number, name=EXCLUDED.name, description=EXCLUDED.description,
         category=EXCLUDED.category, uom=EXCLUDED.uom, unit_qty=EXCLUDED.unit_qty,
         price_per_unit=EXCLUDED.price_per_unit, attributes=EXCLUDED.attributes`,
      [c.sku, c.part_number, c.name, c.description, c.category, c.uom, c.unit_qty, c.price_per_unit, c.attributes],
    );
    up++;
  }
  console.log(`✓ catalog upserted (${up} SKUs)`);

  // Sample threads — insert once (dedupe on subject + customer_email)
  let created = 0;
  for (const t of sampleThreads) {
    const exists = await pool.query(
      'SELECT 1 FROM threads WHERE subject = $1 AND customer_email = $2',
      [t.subject, t.customer_email],
    );
    if (exists.rowCount) continue;
    const thread = await pool.query(
      `INSERT INTO threads (customer_name, customer_email, subject, classification, status)
       VALUES ($1,$2,$3,'unclassified','new') RETURNING id`,
      [t.customer_name, t.customer_email, t.subject],
    );
    const threadId = thread.rows[0].id;
    await pool.query(
      `INSERT INTO messages (thread_id, direction, from_addr, to_addr, subject, body)
       VALUES ($1,'inbound',$2,'sales@orionfasteners.com',$3,$4)`,
      [threadId, t.customer_email, t.subject, t.body],
    );
    created++;
  }
  console.log(`✓ sample threads ready (${created} new inserted)`);

  await pool.end();
  console.log('\nSeed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
