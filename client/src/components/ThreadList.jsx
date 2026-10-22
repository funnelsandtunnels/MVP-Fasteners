import React from 'react';

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function ThreadList({ threads, selectedId, onSelect, tab }) {
  if (!threads.length) {
    return (
      <div className="empty">
        <div className="big">{tab === 'misc' ? '💬' : '📨'}</div>
        <div>
          {tab === 'misc'
            ? 'No general inquiries yet. Emails without quotable line items land here.'
            : 'No RFQs yet. Use “Compose” to send a customer email and watch it get processed.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      {threads.map((t) => {
        const processing = t.status === 'processing' || t.status === 'new';
        const activeFlag = t.status !== 'replied';
        return (
          <div
            key={t.id}
            className={`thread-card ${selectedId === t.id ? 'active' : ''} ${activeFlag ? 'live-active' : ''} ${processing ? 'processing-flash' : ''}`}
            onClick={() => onSelect(t.id)}
          >
            <div className="row1">
              <span className="cust">{t.customer_name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>{timeAgo(t.last_at || t.created_at)}</span>
            </div>
            <div className="subj">{t.subject}</div>
            <div className="snippet">{(t.last_body || '').slice(0, 140)}</div>
            <div className="meta">
              <span className={`status-chip ${activeFlag ? 'green-active' : t.status}`}>
                {processing && <span className="chip-spin" />}
                {processing ? 'processing' : t.status}
              </span>
              {Number(t.line_item_count) > 0 && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.line_item_count} line items</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
