import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { addClient } from './events.js';
import { processPending } from './pipeline.js';
import { MODEL } from './llm.js';
import threadsRouter from './routes/threads.js';
import composeRouter from './routes/compose.js';
import catalogRouter from './routes/catalog.js';
import lineItemsRouter from './routes/lineItems.js';
import draftRouter from './routes/draft.js';

// Keep the dev server alive: log stray errors instead of crashing (node --watch
// does NOT auto-restart after a crash, which would silently take the API down).
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

const app = express();
const PORT = process.env.API_PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health / config probe
app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL, hasKey: Boolean(process.env.OPENAI_API_KEY) });
});

// SSE stream — clients subscribe here for live pipeline events.
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`event: ready\ndata: {"type":"ready"}\n\n`);
  addClient(res);
});

app.use('/api/threads', threadsRouter);
app.use('/api/compose', composeRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/line-items', lineItemsRouter);
app.use('/api/draft', draftRouter);

app.listen(PORT, () => {
  console.log(`\nOrion RFQ server → http://localhost:${PORT}`);
  console.log(`  model: ${MODEL} · OpenAI key: ${process.env.OPENAI_API_KEY ? 'present' : 'MISSING'}`);
  // Kick off processing for any seeded 'new' threads (if a key is configured).
  processPending().catch((e) => console.error('processPending error:', e.message));
});
