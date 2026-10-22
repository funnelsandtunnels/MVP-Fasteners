import React, { useEffect, useState } from 'react';
import Markdown from './Markdown.jsx';

// Craft / preview / edit / send the reply, plus the "Send to ERP" stub.
export default function DraftReply({ bundle, crafting, onCraft, onSend, onErp }) {
  const existing = bundle.draft;
  const [body, setBody] = useState(existing?.body || '');
  const [editing, setEditing] = useState(false);

  // Sync when a new draft is crafted (bundle.draft changes) and drop back to preview.
  useEffect(() => {
    if (existing?.body) {
      setBody(existing.body);
      setEditing(false);
    }
  }, [existing?.id]);

  const alreadyReplied = bundle.thread.status === 'replied';
  const hasDraft = Boolean(existing);

  return (
    <div className="draft">
      <div className="col-head" style={{ padding: '0 0 12px', border: 'none' }}>
        <h2>Reply</h2>
        <span className="sub">
          {alreadyReplied ? 'Reply sent' : hasDraft ? (editing ? 'Editing draft' : 'Review the draft before sending') : 'Generate a quote reply'}
        </span>
      </div>

      {!hasDraft && !crafting && (
        <button className="btn primary" onClick={onCraft}>
          Craft response
        </button>
      )}

      {crafting && (
        <div className="proc-timer" style={{ padding: '4px' }}>
          <div className="spinner" />
          <div>
            <div className="lab">Crafting response (LLM)…</div>
          </div>
        </div>
      )}

      {hasDraft && !crafting && (
        <>
          {editing ? (
            <textarea value={body} onChange={(e) => setBody(e.target.value)} />
          ) : (
            <div className="draft-preview">
              <Markdown text={body} />
            </div>
          )}
          <div className="actions">
            {!alreadyReplied && (
              <button className="btn primary" onClick={() => onSend(body)}>
                Send reply
              </button>
            )}
            <button className="btn" onClick={() => setEditing((e) => !e)}>
              {editing ? 'Preview' : 'Edit'}
            </button>
            <button className="btn ghost" onClick={onCraft}>
              Re-craft
            </button>
            <button className="btn" onClick={onErp}>
              Send to ERP
            </button>
          </div>
        </>
      )}
    </div>
  );
}
