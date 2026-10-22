import { pool } from './db.js';

// Full thread bundle used by routes and SSE payloads.
export async function fetchThreadBundle(threadId) {
  const t = await pool.query('SELECT * FROM threads WHERE id = $1', [threadId]);
  if (!t.rowCount) return null;
  const thread = t.rows[0];

  const messages = (
    await pool.query('SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at, id', [threadId])
  ).rows;

  const lineItems = (
    await pool.query(
      `SELECT li.*, c.name AS catalog_name, c.category AS catalog_category,
              c.uom AS catalog_uom, c.unit_qty AS catalog_unit_qty
         FROM line_items li
         LEFT JOIN catalog c ON c.sku = li.matched_sku
        WHERE li.thread_id = $1
        ORDER BY li.position, li.id`,
      [threadId],
    )
  ).rows;

  const draftRes = await pool.query(
    'SELECT * FROM drafts WHERE thread_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1',
    [threadId],
  );

  return { thread, messages, lineItems, draft: draftRes.rows[0] || null };
}

// Lightweight thread summaries for the list panel.
export async function listThreads(tab) {
  // RFQ tab shows RFQs plus anything still in-flight (new/processing/unclassified);
  // Misc tab shows only classified-misc threads.
  const where =
    tab === 'all'
      ? 'TRUE'
      : tab === 'misc'
      ? `classification = 'misc'`
      : `(classification = 'rfq' OR classification = 'unclassified' OR status = 'processing' OR status = 'new')`;

  const rows = (
    await pool.query(
      `SELECT t.*,
              (SELECT count(*) FROM line_items li WHERE li.thread_id = t.id) AS line_item_count,
              (SELECT body FROM messages m WHERE m.thread_id = t.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_body,
              (SELECT max(created_at) FROM messages m WHERE m.thread_id = t.id) AS last_at
         FROM threads t
        WHERE ${where}
        ORDER BY t.updated_at DESC, t.id DESC`,
    )
  ).rows;
  return rows;
}
