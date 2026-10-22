import React from 'react';
import Markdown from './Markdown.jsx';

const fmt = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ThreadView({ bundle, onBack }) {
  const { thread, messages } = bundle;
  return (
    <div>
      <div className="thread-head" style={{ marginBottom: 14 }}>
        <button className="link" onClick={onBack}>
          ← All threads
        </button>
        <span style={{ flex: 1 }} />
        <span className={`status-chip ${thread.status}`}>{thread.status}</span>
      </div>
      <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>{thread.subject}</h2>
      <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>
        {thread.customer_name} &lt;{thread.customer_email}&gt;
      </div>

      {messages.map((m) => (
        <div key={m.id} className={`msg ${m.direction}`}>
          <div className="m-head">
            <span>
              <span className={`dir-tag ${m.direction}`}>{m.direction === 'inbound' ? 'Customer' : 'Orion'}</span>{' '}
              <span className="m-from">{m.from_addr}</span>
            </span>
            <span>{fmt(m.created_at)}</span>
          </div>
          <Markdown className="m-body" text={m.body} />
        </div>
      ))}
    </div>
  );
}
