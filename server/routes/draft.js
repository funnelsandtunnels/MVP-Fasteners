import { Router } from 'express';
import { pool } from '../db.js';
import { fetchThreadBundle } from '../repo.js';
import { emit } from '../events.js';
import { craftReply, threadToText } from '../llm.js';

const router = Router();
const OUR_ADDR = 'sales@orionfasteners.com';

// POST /api/draft/craft  { thread_id }  -> LLM drafts a reply from priced line items.
router.post('/craft', async (req, res) => {
  const threadId = Number(req.body.thread_id);
  const bundle = await fetchThreadBundle(threadId);
  if (!bundle) return res.status(404).json({ error: 'thread not found' });

  emit('step', { threadId, step: 'crafting', label: 'Crafting response (LLM)' });
  try {
    const { subject, body } = await craftReply({
      customerName: bundle.thread.customer_name,
      threadText: threadToText(bundle.thread, bundle.messages),
      lineItems: bundle.lineItems,
    });

    const draft = await pool.query(
      `INSERT INTO drafts (thread_id, body, status) VALUES ($1,$2,'draft') RETURNING *`,
      [threadId, body],
    );
    const payload = { ...draft.rows[0], subject };
    emit('draft_crafted', { threadId });
    res.json({ draft: payload });
  } catch (err) {
    emit('error', { threadId, message: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/draft/send  { thread_id, body, subject? }  -> send the reply (append outbound).
router.post('/send', async (req, res) => {
  const threadId = Number(req.body.thread_id);
  const bundle = await fetchThreadBundle(threadId);
  if (!bundle) return res.status(404).json({ error: 'thread not found' });

  const subject = req.body.subject || `RE: ${bundle.thread.subject}`;
  const body = req.body.body || bundle.draft?.body || '';

  await pool.query(
    `INSERT INTO messages (thread_id, direction, from_addr, to_addr, subject, body)
     VALUES ($1,'outbound',$2,$3,$4,$5)`,
    [threadId, OUR_ADDR, bundle.thread.customer_email, subject, body],
  );
  await pool.query(`UPDATE threads SET status='replied', updated_at=now() WHERE id=$1`, [threadId]);
  if (bundle.draft) {
    await pool.query(`UPDATE drafts SET status='sent' WHERE id=$1`, [bundle.draft.id]);
  }

  const updated = await fetchThreadBundle(threadId);
  emit('reply_sent', { threadId, thread: updated.thread });
  res.json(updated);
});

// POST /api/draft/erp  { thread_id }  -> stub, no real integration.
router.post('/erp', async (req, res) => {
  const threadId = Number(req.body.thread_id);
  emit('erp_pushed', { threadId });
  res.json({ ok: true, message: 'RFQ pushed to ERP (simulated).' });
});

export default router;
