import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useEvents } from './useThreadStream.js';
import ThreadList from './components/ThreadList.jsx';
import ThreadView from './components/ThreadView.jsx';
import ProcessingPanel from './components/ProcessingPanel.jsx';
import ComposePanel from './components/ComposePanel.jsx';
import CatalogPage from './components/CatalogPage.jsx';

// Log a pipeline SSE event to the browser console instead of an on-screen panel.
function logEvent(ev, name) {
  const tag = '%c[pipeline]';
  const style = 'color:#1f9d55;font-weight:600';
  switch (ev.type) {
    case 'inbound': console.log(tag, style, `📨 email received — ${name}`); break;
    case 'step': console.log(tag, style, `${name}: ${ev.label}${ev.count != null ? ` (${ev.count} items)` : ''}`); break;
    case 'classified': console.log(tag, style, `${name}: classified as ${String(ev.classification || '').toUpperCase()}`); break;
    case 'done': console.log(tag, style, `${name}: ✅ processing complete`); break;
    case 'draft_crafted': console.log(tag, style, `${name}: ✍️ draft reply ready`); break;
    case 'reply_sent': console.log(tag, style, `${name}: ✉️ reply sent`); break;
    case 'erp_pushed': console.log(tag, style, `${name}: ⇪ pushed to ERP`); break;
    case 'error': console.error('[pipeline]', `${name}: ${ev.message || 'request failed'}`); break;
    default: break;
  }
}

const parseHash = () => {
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  return h === 'compose' || h === 'catalog' ? h : 'inbox';
};

export default function App() {
  const [route, setRoute] = useState(parseHash());
  const [tab, setTab] = useState('all'); // all | rfq | misc
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [live, setLive] = useState({}); // threadId -> { steps, startedAt }
  const [crafting, setCrafting] = useState(false);
  const [health, setHealth] = useState({ hasKey: true, model: '' });
  const [toast, setToast] = useState(null);
  const namesRef = useRef({}); // threadId -> customer name, for console logs

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const loadThreads = useCallback(async (t) => {
    const { threads } = await api.listThreads(t);
    setThreads(threads);
    for (const th of threads) namesRef.current[th.id] = th.customer_name;
  }, []);

  const loadBundle = useCallback(async (id) => {
    if (!id) return;
    const b = await api.getThread(id);
    setBundle(b);
  }, []);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const nav = (r) => { window.location.hash = r === 'inbox' ? '#/' : `#/${r}`; };

  useEffect(() => {
    loadThreads(tab);
  }, [tab, loadThreads]);

  const selectThread = async (id) => {
    setSelectedId(id);
    setCrafting(false);
    await loadBundle(id);
  };

  const back = () => {
    setSelectedId(null);
    setBundle(null);
  };

  // --- SSE event handling ---
  const onEvent = useCallback(
    (ev) => {
      const { type, threadId } = ev;

      // Log pipeline progress to the browser console (replaces the on-screen panel).
      if (ev.thread?.customer_name && threadId) namesRef.current[threadId] = ev.thread.customer_name;
      const name = namesRef.current[threadId] || (threadId ? `Thread #${threadId}` : 'System');
      if (type !== 'ready') logEvent(ev, name);

      switch (type) {
        case 'step':
          // 'crafting' happens after the RFQ is ready — keep the line-item table
          // visible and show craft progress in the sidebar, not the full-panel timer.
          if (ev.step === 'crafting') break;
          setLive((prev) => {
            const cur = prev[threadId] || { steps: [], startedAt: Date.now() };
            return { ...prev, [threadId]: { ...cur, steps: [...cur.steps, { step: ev.step, label: ev.label }] } };
          });
          break;
        case 'classified':
          loadThreads(tab);
          if (threadId === selectedId) loadBundle(threadId);
          break;
        case 'done':
        case 'error':
          setLive((prev) => {
            const next = { ...prev };
            delete next[threadId];
            return next;
          });
          loadThreads(tab);
          if (threadId === selectedId) loadBundle(threadId);
          break;
        case 'inbound':
          loadThreads(tab);
          break;
        case 'draft_crafted':
          setCrafting(false);
          if (threadId === selectedId) loadBundle(threadId);
          break;
        case 'reply_sent':
        case 'line_items_updated':
          loadThreads(tab);
          if (threadId === selectedId) loadBundle(threadId);
          break;
        default:
          break;
      }
    },
    [tab, selectedId, loadThreads, loadBundle],
  );
  useEvents(onEvent);

  // --- Line item actions (optimistic reload from server response) ---
  const applyBundle = (b) => {
    setBundle(b);
    loadThreads(tab);
  };
  const onChangeQty = async (item, qty) => {
    if (!qty) return;
    applyBundle(await api.patchLineItem(item.id, { quantity: Number(qty) }));
  };
  const onPickSku = async (item, r) => {
    applyBundle(await api.patchLineItem(item.id, { matched_sku: r.sku }));
  };
  const onDeleteItem = async (item) => {
    applyBundle(await api.deleteLineItem(item.id));
  };
  const onAddItem = async (r) => {
    applyBundle(await api.addLineItem({ thread_id: selectedId, matched_sku: r.sku, quantity: 1 }));
  };

  // --- Draft actions ---
  const onCraft = async () => {
    setCrafting(true);
    try {
      await api.craft(selectedId);
      await loadBundle(selectedId);
    } catch (e) {
      showToast('Craft failed: ' + e.message);
    } finally {
      setCrafting(false);
    }
  };
  const onSend = async (body) => {
    const b = await api.sendReply({ thread_id: selectedId, body });
    setBundle(b);
    loadThreads(tab);
    showToast('Reply sent ✓');
  };
  const onErp = async () => {
    const r = await api.pushErp(selectedId);
    showToast(r.message || 'Sent to ERP ✓');
  };
  const onReprocess = async () => {
    await api.reprocess(selectedId);
    showToast('Re-processing…');
  };

  const onClearAll = async () => {
    if (!confirm('Clear ALL emails? This cannot be undone. (Catalog is kept.)')) return;
    await api.clearAll();
    back();
    loadThreads(tab);
    showToast('Inbox cleared');
  };

  const onComposed = async () => {
    // Stay on the compose page after sending; just refresh the inbox in the
    // background so the new email is there (delayed) when the user navigates to it.
    setTab('all');
    loadThreads('all');
  };

  const tabTitle = tab === 'all' ? 'Inbox' : tab === 'rfq' ? 'RFQs' : 'Misc';

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="dot" />
          Orion <small>RFQ Desk</small>
        </div>
        {route === 'inbox' ? (
          <div className="tabs">
            {['all', 'rfq', 'misc'].map((t) => (
              <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); back(); }}>
                {t === 'all' ? 'Inbox' : t === 'rfq' ? 'RFQs' : 'Misc'}
              </button>
            ))}
          </div>
        ) : (
          <button className="tab" onClick={() => nav('inbox')}>← Inbox</button>
        )}
        <div className="spacer" />
        <div className="pill">
          <span className={`k ${health.hasKey ? '' : 'off'}`} />
          {health.hasKey ? `OpenAI · ${health.model}` : 'No API key'}
        </div>
        {route === 'inbox' && (
          <button className="btn ghost sm" onClick={onClearAll} title="Delete all emails">Clear all</button>
        )}
      </header>

      {route === 'compose' && <ComposePanel onSent={onComposed} />}
      {route === 'catalog' && <CatalogPage />}
      {route === 'inbox' && (

      <div className="main">
        <div className="workspace">
        {/* LEFT — processed data */}
        <section className="col">
          <div className="col-head">
            <h2>Processing</h2>
            <span className="sub">Extracted line items & quote</span>
          </div>
          <div className="col-body">
            <ProcessingPanel
              bundle={selectedId ? bundle : null}
              live={selectedId ? live[selectedId] : null}
              crafting={crafting}
              onChangeQty={onChangeQty}
              onPickSku={onPickSku}
              onDeleteItem={onDeleteItem}
              onAddItem={onAddItem}
              onCraft={onCraft}
              onSend={onSend}
              onErp={onErp}
              onReprocess={onReprocess}
            />
          </div>
        </section>

        {/* RIGHT — thread list / conversation */}
        <section className="col">
          <div className="col-head">
            <h2>{selectedId && bundle ? 'Conversation' : tabTitle}</h2>
            <span className="sub">
              {selectedId && bundle ? bundle.thread.customer_name : `${threads.length} thread${threads.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="col-body">
            {selectedId && bundle ? (
              <ThreadView bundle={bundle} onBack={back} />
            ) : (
              <ThreadList threads={threads} selectedId={selectedId} onSelect={selectThread} tab={tab} />
            )}
          </div>
        </section>
        </div>
      </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
