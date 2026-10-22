import { pool } from './db.js';

const MATCH_THRESHOLD = 0.28; // pg_trgm similarity below this => needs manual review

// Resolve a single extracted line item to a catalog SKU.
// item: { name, part_number?, sku?, quantity }
// returns { matched_sku, match_confidence, price_per_unit, needs_review, catalog? }
export async function matchLineItem(item) {
  const rawName = (item.name || '').trim();
  const partNo = (item.part_number || item.sku || '').trim();

  // 1) Exact SKU / part-number hit (case-insensitive) => high confidence.
  if (partNo) {
    const exact = await pool.query(
      `SELECT * FROM catalog
        WHERE lower(sku) = lower($1) OR lower(part_number) = lower($1)
        LIMIT 1`,
      [partNo],
    );
    if (exact.rowCount) {
      return finalize(exact.rows[0], 1.0, false);
    }
  }

  // 2) Fuzzy match on name (+ part number) via trigram similarity.
  const best = await pool.query(
    `SELECT *,
            GREATEST(
              similarity(name, $1),
              CASE WHEN part_number IS NOT NULL AND $2 <> ''
                   THEN similarity(part_number, $2) ELSE 0 END
            ) AS score
       FROM catalog
      ORDER BY score DESC
      LIMIT 1`,
    [rawName, partNo],
  );

  if (best.rowCount && Number(best.rows[0].score) >= MATCH_THRESHOLD) {
    const row = best.rows[0];
    return finalize(row, Number(row.score), false);
  }

  // 3) No confident match — flag for the rep's manual search.
  return {
    matched_sku: null,
    match_confidence: best.rowCount ? Number(best.rows[0].score) : 0,
    price_per_unit: null,
    needs_review: true,
    catalog: null,
  };
}

function finalize(row, confidence, needsReview) {
  return {
    matched_sku: row.sku,
    match_confidence: Math.round(confidence * 10000) / 10000,
    price_per_unit: Number(row.price_per_unit),
    needs_review: needsReview,
    catalog: row,
  };
}
