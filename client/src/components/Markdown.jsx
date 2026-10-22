import React from 'react';

// Render inline **bold** (and leave everything else as text).
function inline(text, keyPrefix) {
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`${keyPrefix}-b${i++}`}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Minimal markdown for LLM-crafted emails: bold, bullet/numbered lists, paragraphs.
export default function Markdown({ text, className = '' }) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let list = null; // { type: 'ul' | 'ol', items: [] }

  const flush = () => {
    if (list) {
      blocks.push({ kind: list.type, items: list.items });
      list = null;
    }
  };

  for (const line of lines) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] }; }
      list.items.push(bullet[1]);
    } else if (num) {
      if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [] }; }
      list.items.push(num[1]);
    } else {
      flush();
      blocks.push({ kind: 'p', text: line });
    }
  }
  flush();

  return (
    <div className={`md ${className}`}>
      {blocks.map((b, i) => {
        if (b.kind === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ul>;
        if (b.kind === 'ol') return <ol key={i}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</ol>;
        if (b.text.trim() === '') return <div key={i} className="spacer" />;
        return <p key={i}>{inline(b.text, `${i}`)}</p>;
      })}
    </div>
  );
}
