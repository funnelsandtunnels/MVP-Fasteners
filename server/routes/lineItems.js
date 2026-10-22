import { Router } from 'express';
import { pool } from '../db.js';
import { fetchThreadBundle } from '../repo.js';
import { emit } from '../events.js';

const router = Router();
const round2 = (n) => Math.round(n * 100) / 100;

// Compute per-each price + total for a given SKU and quantity.
async function priceFor(sku, quantity) {
  if (!sku) return { price_per_unit: null, total: null };
  const { rows } = await pool.query('SELECT price_per_unit, unit_qty FROM catalog WHERE sku = $1', [sku]);
  if (!rows.length) return { price_per_unit: null, total: null };
  const unitQty = Number(rows[0].unit_qty) || 1;
  const perEach = round2(Number(rows[0].price_per_unit) / unitQty);
  return { price_per_unit: perEach, total: round2(perEach * Number(quantity)) };
}

async function respondWithThread(threadId, res) {
  const bundle = await fetchThreadBundle(threadId);
  emit('line_items_updated', { threadId, thread: bundle.thread });
  res.json(bundle);
}

// PATCH /api/line-items/:id  { matched_sku?, quantity? }
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cur = await pool.query('SELECT * FROM line_items WHERE id = $1', [id]);
  if (!cur.rowCount) return res.status(404).json({ error: 'not found' });
  const li = cur.rows[0];

  const matched_sku = req.body.matched_sku !== undefined ? req.body.matched_sku : li.matched_sku;
  const quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : Number(li.quantity);
  // Must be a real boolean — used in SQL `CASE WHEN $5`. A string here makes
  // Postgres try to cast it to boolean and throw, failing the whole update.
  const manuallyPickedSku = req.body.matched_sku !== undefined && Boolean(req.body.matched_sku);

  const { price_per_unit, total } = await priceFor(matched_sku, quantity);

  // Explicit casts so Postgres can resolve every parameter's type (a bare $1 used
  // in `SET matched_sku=$1` + `CASE WHEN $1 IS NULL` is otherwise ambiguous and errors).
  await pool.query(
    `UPDATE line_items
        SET matched_sku=$1::text, quantity=$2::numeric, price_per_unit=$3::numeric, total=$4::numeric,
            is_manual = CASE WHEN $5::boolean THEN true ELSE is_manual END,
            needs_review = ($1::text IS NULL),
            match_confidence = CASE WHEN $5::boolean THEN 1.0 ELSE match_confidence END
      WHERE id=$6::int`,
    [matched_sku || null, quantity, price_per_unit, total, manuallyPickedSku, id],
  );

  await respondWithThread(li.thread_id, res);
});

// POST /api/line-items  { thread_id, matched_sku, quantity, raw_name? }
router.post('/', async (req, res) => {
  const { thread_id, matched_sku, quantity = 1, raw_name } = req.body || {};
  if (!thread_id || !matched_sku) {
    return res.status(400).json({ error: 'thread_id and matched_sku are required' });
  }
  const cat = await pool.query('SELECT name FROM catalog WHERE sku = $1', [matched_sku]);
  if (!cat.rowCount) return res.status(400).json({ error: 'unknown SKU' });

  const { price_per_unit, total } = await priceFor(matched_sku, quantity);
  const pos = await pool.query(
    'SELECT coalesce(max(position), -1) + 1 AS p FROM line_items WHERE thread_id = $1',
    [thread_id],
  );

  await pool.query(
    `INSERT INTO line_items
       (thread_id, raw_name, quantity, matched_sku, match_confidence, price_per_unit, total,
        is_manual, needs_review, position)
     VALUES ($1,$2,$3,$4,1.0,$5,$6,true,false,$7)`,
    [thread_id, raw_name || cat.rows[0].name, quantity, matched_sku, price_per_unit, total, pos.rows[0].p],
  );

  await respondWithThread(Number(thread_id), res);
});

// DELETE /api/line-items/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cur = await pool.query('SELECT thread_id FROM line_items WHERE id = $1', [id]);
  if (!cur.rowCount) return res.status(404).json({ error: 'not found' });
  await pool.query('DELETE FROM line_items WHERE id = $1', [id]);
  await respondWithThread(cur.rows[0].thread_id, res);
});

export default router;
