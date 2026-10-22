import React, { useEffect, useState } from 'react';
import { money } from '../api.js';
import LineItemRow from './LineItemRow.jsx';
import DraftReply from './DraftReply.jsx';
import SkuSearch from './SkuSearch.jsx';

function Timer({ startedAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, (now - startedAt) / 1000);
  return <span className="t">{s.toFixed(1)}s</span>;
}

function LiveSteps({ live }) {
  const steps = live.steps || [];
  const currentLabel = steps.length ? steps[steps.length - 1].label : 'Working…';
  return (
    <div className="processing">
      <div className="proc-timer">
        <div className="spinner" />
        <div>
          <Timer startedAt={live.startedAt} />
          <div className="lab">{currentLabel}…</div>
        </div>
      </div>
      <ul className="step-list">
        {steps.map((st, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={st.step + i} className={isLast ? 'active' : 'done'}>
              <span className="ic">{isLast ? '•' : '✓'}</span>
              {st.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MiscReply({ bundle, onSend }) {
  const [body, setBody] = useState('');
  const replied = bundle.thread.status === 'replied';
  return (
    <div className="draft">
      <div className="col-head" style={{ padding: '0 0 12px', border: 'none' }}>
        <h2>Reply</h2>
        <span className="sub">{replied ? 'Reply sent' : 'Type a manual response'}</span>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply to this inquiry…" />
      <div className="actions">
        <button className="btn primary" disabled={!body.trim()} onClick={() => { onSend(body); setBody(''); }}>
          Send reply
        </button>
      </div>
    </div>
  );
}

export default function ProcessingPanel({
  bundle,
  live,
  crafting,
  onChangeQty,
  onPickSku,
  onDeleteItem,
  onAddItem,
  onCraft,
  onSend,
  onErp,
  onReprocess,
}) {
  if (!bundle) {
    return (
      <div className="empty">
        <div className="big">📥</div>
        <div>Select a thread on the right to see extracted line items and the quote.</div>
      </div>
    );
  }

  const { thread, lineItems } = bundle;

  // Actively processing this thread
  if (live) return <LiveSteps live={live} />;

  // Processing started before this client connected (missed the live events).
  if (thread.status === 'processing') {
    return (
      <div className="proc-timer">
        <div className="spinner" />
        <div>
          <div className="lab">Processing thread…</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Classifying, extracting & pricing.</div>
        </div>
      </div>
    );
  }

  if (thread.status === 'error') {
    return (
      <div className="empty">
        <div className="big">⚠️</div>
        <div>Processing failed for this thread.</div>
        <button className="btn primary" onClick={onReprocess}>
          Retry processing
        </button>
      </div>
    );
  }

  if (thread.classification === 'misc') {
    return (
      <div>
        <div className="misc-note">
          <b>Classified as general inquiry (Misc).</b>
          <div style={{ marginTop: 6 }}>{thread.classification_reason || 'No quotable line items detected.'}</div>
        </div>
        <MiscReply bundle={bundle} onSend={onSend} />
      </div>
    );
  }

  if (thread.classification !== 'rfq') {
    return (
      <div className="empty">
        <div className="big">⏳</div>
        <div>Not processed yet.</div>
        <button className="btn primary" onClick={onReprocess}>
          Process now
        </button>
      </div>
    );
  }

  // RFQ — show line items + quote + draft
  const grand = lineItems.reduce((s, li) => s + (Number(li.total) || 0), 0);
  const unmatched = lineItems.filter((li) => li.needs_review).length;

  return (
    <div>
      <div className="col-head" style={{ padding: '0 0 12px', border: 'none' }}>
        <h2>Line items</h2>
        <span className="sub">
          {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
          {unmatched > 0 && ` · ${unmatched} need review`}
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn sm ghost" onClick={onReprocess}>
          ↻ Re-run
        </button>
      </div>

      {lineItems.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No line items were extracted.</p>
      ) : (
        <>
          <table className="li-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>SKU</th>
                <th style={{ textAlign: 'right' }}>Unit</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <LineItemRow
                  key={li.id}
                  item={li}
                  onChangeQty={onChangeQty}
                  onPickSku={onPickSku}
                  onDelete={onDeleteItem}
                />
              ))}
            </tbody>
          </table>
          <div className="grand">
            <span>Quote total {unmatched > 0 && <span className="warn-tag">(excl. {unmatched} unmatched)</span>}</span>
            <span className="amt">{money(grand)}</span>
          </div>
        </>
      )}

      <div className="add-item">
        <div className="add-label">Add a line item from the catalog</div>
        <SkuSearch onPick={(r) => onAddItem(r)} placeholder="Search catalog to add an item…" />
      </div>

      <DraftReply bundle={bundle} crafting={crafting} onCraft={onCraft} onSend={onSend} onErp={onErp} />
    </div>
  );
}
