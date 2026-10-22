import React, { useEffect, useRef, useState } from 'react';

// Live elapsed timer; freezes once the entry has an endedAt.
function Elapsed({ startedAt, endedAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [endedAt]);
  const ms = (endedAt || now) - startedAt;
  return <span className="act-dur">{(ms / 1000).toFixed(1)}s</span>;
}

// Right-hand rail: a streaming feed of pipeline events with running timers.
export default function ActivityLog({ entries, onClose, onClear }) {
  const bodyRef = useRef(null);

  // Auto-scroll to the newest entry.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <section className="col activity">
      <div className="col-head">
        <h2>Activity</h2>
        <span className="sub">Live pipeline</span>
        <span style={{ flex: 1 }} />
        {entries.length > 0 && (
          <button className="btn sm ghost" onClick={onClear} title="Clear log">
            Clear
          </button>
        )}
        <button className="btn sm ghost" onClick={onClose} title="Hide activity">
          ✕
        </button>
      </div>
      <div className="col-body act-body" ref={bodyRef}>
        {entries.length === 0 ? (
          <div className="empty">
            <div className="big">🛰️</div>
            <div>No activity yet. Processing steps and LLM calls will stream here in real time.</div>
          </div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className={`act-item ${e.status}`}>
              <span className="act-ic">
                {e.status === 'running' ? <span className="mini-spin" /> : e.icon || (e.status === 'error' ? '⚠️' : '•')}
              </span>
              <div className="act-main">
                <div className="act-label">{e.label}</div>
                <div className="act-meta">
                  <span className="act-name">{e.name}</span>
                  {e.status !== 'info' && <Elapsed startedAt={e.startedAt} endedAt={e.endedAt} />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
