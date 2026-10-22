import { pool } from './db.js';
import { emit } from './events.js';
import { classifyThread, extractLineItems, threadToText } from './llm.js';
import { matchLineItem } from './matcher.js';
import { fetchThreadBundle } from './repo.js';

const round2 = (n) => Math.round(n * 100) / 100;

async function setStatus(threadId, patch) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [k, v] of Object.entries(patch)) {
    sets.push(`${k} = $${i++}`);
    vals.push(v);
  }
  sets.push(`updated_at = now()`);
  vals.push(threadId);
  await pool.query(`UPDATE threads SET ${sets.join(', ')} WHERE id = $${i}`, vals);
}

async function emitThread(type, threadId, extra = {}) {
  const bundle = await fetchThreadBundle(threadId);
  emit(type, { threadId, thread: bundle?.thread, ...extra });
}

// Orchestrates: classify -> (rfq) extract -> match -> price. Emits SSE at each step.
export async function processThread(threadId) {
  try {
    const bundle = await fetchThreadBundle(threadId);
    if (!bundle) return;
    const text = threadToText(bundle.thread, bundle.messages);

    await setStatus(threadId, { status: 'processing' });
    emit('step', { threadId, step: 'classifying', label: 'Classifying thread' });

    // 1) Classify
    const { classification, reason } = await classifyThread(text);
    await setStatus(threadId, { classification, classification_reason: reason });
    await emitThread('classified', threadId, { classification, reason });

    if (classification === 'misc') {
      await setStatus(threadId, { status: 'ready' });
      await emitThread('done', threadId, { classification: 'misc' });
      return;
    }

    // 2) Extract line items
    emit('step', { threadId, step: 'extracting', label: 'Extracting line items (LLM)' });
    const items = await extractLineItems(text);
    emit('step', { threadId, step: 'matching', label: 'Matching SKUs & pricing', count: items.length });

    // Reset any prior line items (safe re-processing)
    await pool.query('DELETE FROM line_items WHERE thread_id = $1', [threadId]);

    // 3) Match + price each item
    let position = 0;
    for (const item of items) {
      const m = await matchLineItem(item);

      let perEach = null;
      let total = null;
      if (m.matched_sku && m.catalog) {
        const unitQty = Number(m.catalog.unit_qty) || 1;
        perEach = round2(Number(m.catalog.price_per_unit) / unitQty);
        total = round2(perEach * Number(item.quantity));
      }

      await pool.query(
        `INSERT INTO line_items
           (thread_id, raw_name, raw_part_number, quantity, matched_sku, match_confidence,
            price_per_unit, total, is_manual, needs_review, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10)`,
        [
          threadId,
          item.name,
          item.part_number,
          item.quantity,
          m.matched_sku,
          m.match_confidence,
          perEach,
          total,
          m.needs_review,
          position++,
        ],
      );
    }

    await setStatus(threadId, { status: 'ready' });
    await emitThread('done', threadId, { classification: 'rfq' });
  } catch (err) {
    console.error(`Pipeline error (thread ${threadId}):`, err.message);
    await setStatus(threadId, { status: 'error' });
    emit('error', { threadId, message: err.message });
  }
}

// Fire-and-forget processing for any threads still 'new' (used on boot).
export async function processPending() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('• OPENAI_API_KEY not set — skipping auto-processing of seeded threads.');
    return;
  }
  const { rows } = await pool.query(`SELECT id FROM threads WHERE status = 'new' ORDER BY id`);
  for (const r of rows) {
    processThread(r.id); // don't await — let them stream in
  }
  if (rows.length) console.log(`• auto-processing ${rows.length} pending thread(s)`);
}
