import { Router } from 'express';
import { pool } from '../db.js';
import { fetchThreadBundle, listThreads } from '../repo.js';
import { processThread } from '../pipeline.js';

const router = Router();

// DELETE /api/threads  -> clear ALL emails (messages, line items, drafts cascade). Catalog untouched.
router.delete('/', async (req, res) => {
  await pool.query('TRUNCATE threads RESTART IDENTITY CASCADE');
  res.json({ ok: true });
});

// GET /api/threads?tab=rfq|misc
router.get('/', async (req, res) => {
  const tab = ['all', 'misc', 'rfq'].includes(req.query.tab) ? req.query.tab : 'all';
  const threads = await listThreads(tab);
  res.json({ threads });
});

// GET /api/threads/:id  -> full bundle
router.get('/:id', async (req, res) => {
  const bundle = await fetchThreadBundle(Number(req.params.id));
  if (!bundle) return res.status(404).json({ error: 'not found' });
  res.json(bundle);
});

// POST /api/threads/:id/reprocess  -> re-run the pipeline
router.post('/:id/reprocess', async (req, res) => {
  const id = Number(req.params.id);
  processThread(id); // async; UI listens on SSE
  res.json({ ok: true });
});

export default router;
