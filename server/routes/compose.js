import { Router } from 'express';
import { pool } from '../db.js';
import { processThread } from '../pipeline.js';
import { fetchThreadBundle } from '../repo.js';
import { emit } from '../events.js';

const router = Router();
const OUR_ADDR = 'sales@orionfasteners.com';

// Normalize a subject for matching a follow-up to its thread: drop Re:/Fwd:
// prefixes, then reduce all punctuation/whitespace so "RFQ — a & b" and
// "RFQ - a and b"-style variations still line up.
const normSubject = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/^((re|fwd?|fw)\s*:\s*)+/i, '') // strip reply/forward prefixes first
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ') // em-dash, hyphen, commas, etc. -> space
    .trim();

// POST /api/compose  -> simulate an inbound customer email, then process it.
// body: { customer_name, customer_email, subject, body, thread_id? }
router.post('/', async (req, res) => {
  const { customer_name, customer_email, subject, body, thread_id } = req.body || {};
  if (!customer_email || !body) {
    return res.status(400).json({ error: 'customer_email and body are required' });
  }

  // Respond immediately; deliver the email after a short delay so it "arrives"
  // in the inbox a couple seconds later, like a real incoming email.
  res.json({ ok: true, queued: true });
  setTimeout(() => deliver({ customer_name, customer_email, subject, body, thread_id }).catch((e) => console.error('deliver error', e)), 2500);
});

async function deliver({ customer_name, customer_email, subject, body, thread_id }) {
  let threadId = thread_id ? Number(thread_id) : null;
  let isContinuation = Boolean(threadId);

  // Same customer + same (normalized) subject => a continuation of an existing thread.
  if (!threadId) {
    const norm = normSubject(subject);
    if (norm) {
      const cands = await pool.query(
        `SELECT id, subject FROM threads WHERE lower(customer_email) = lower($1) ORDER BY id DESC`,
        [customer_email],
      );
      const hit = cands.rows.find((r) => normSubject(r.subject) === norm);
      if (hit) {
        threadId = hit.id;
        isContinuation = true;
      }
    }
  }

  if (threadId) {
    // Append to existing thread and reset it so the WHOLE thread is re-parsed.
    await pool.query(
      `UPDATE threads SET status='new', classification='unclassified', updated_at=now() WHERE id=$1`,
      [threadId],
    );
  } else {
    const t = await pool.query(
      `INSERT INTO threads (customer_name, customer_email, subject, classification, status)
       VALUES ($1,$2,$3,'unclassified','new') RETURNING id`,
      [customer_name || customer_email, customer_email, subject || '(no subject)'],
    );
    threadId = t.rows[0].id;
  }

  await pool.query(
    `INSERT INTO messages (thread_id, direction, from_addr, to_addr, subject, body)
     VALUES ($1,'inbound',$2,$3,$4,$5)`,
    [threadId, customer_email, OUR_ADDR, subject || '(no subject)', body],
  );

  // Notify clients a new email landed, then kick off processing (async → streams).
  const bundle = await fetchThreadBundle(threadId);
  emit('inbound', { threadId, thread: bundle.thread, continuation: isContinuation });
  processThread(threadId);
}

export default router;
