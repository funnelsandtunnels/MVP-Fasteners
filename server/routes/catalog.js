import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/catalog  -> all stock items (for the DB/CRUD page)
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM catalog ORDER BY category, name');
  res.json({ items: rows });
});

// POST /api/catalog  -> create a stock item
router.post('/', async (req, res) => {
  const { sku, part_number, name, category, uom, unit_qty, price_per_unit } = req.body || {};
  if (!sku || !name) return res.status(400).json({ error: 'sku and name are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO catalog (sku, part_number, name, category, uom, unit_qty, price_per_unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [sku, part_number || null, name, category || null, uom || 'each', Number(unit_qty) || 1, Number(price_per_unit) || 0],
    );
    res.json({ item: rows[0] });
  } catch (e) {
    res.status(400).json({ error: e.code === '23505' ? 'SKU already exists' : e.message });
  }
});

// PATCH /api/catalog/:sku  -> update editable fields
router.patch('/:sku', async (req, res) => {
  const { name, part_number, category, uom, unit_qty, price_per_unit } = req.body || {};
  const { rows } = await pool.query(
    `UPDATE catalog SET
       name=COALESCE($2,name), part_number=COALESCE($3,part_number), category=COALESCE($4,category),
       uom=COALESCE($5,uom), unit_qty=COALESCE($6,unit_qty), price_per_unit=COALESCE($7,price_per_unit)
     WHERE sku=$1 RETURNING *`,
    [req.params.sku, name ?? null, part_number ?? null, category ?? null, uom ?? null,
     unit_qty != null ? Number(unit_qty) : null, price_per_unit != null ? Number(price_per_unit) : null],
  );
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json({ item: rows[0] });
});

// DELETE /api/catalog/:sku
router.delete('/:sku', async (req, res) => {
  await pool.query('DELETE FROM catalog WHERE sku=$1', [req.params.sku]);
  res.json({ ok: true });
});

// GET /api/catalog/search?q=...  -> fuzzy catalog search for the manual SKU picker.
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });

  const { rows } = await pool.query(
    `SELECT sku, part_number, name, category, uom, unit_qty, price_per_unit,
            GREATEST(similarity(name, $1), similarity(coalesce(part_number,''), $1)) AS score
       FROM catalog
      WHERE name ILIKE '%' || $1 || '%'
         OR part_number ILIKE '%' || $1 || '%'
         OR sku ILIKE '%' || $1 || '%'
         OR similarity(name, $1) > 0.15
      ORDER BY score DESC
      LIMIT 15`,
    [q],
  );
  res.json({ results: rows });
});

export default router;
