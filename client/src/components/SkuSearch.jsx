import React, { useEffect, useRef, useState } from 'react';
import { api, money } from '../api.js';

// Manual catalog search used when the LLM/DB couldn't confidently match an item.
export default function SkuSearch({ onPick, placeholder = 'Search catalog by name, SKU, or part #…' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const { results } = await api.searchCatalog(q);
        if (live) {
          setResults(results);
          setOpen(true);
        }
      } catch {
        /* ignore */
      }
    }, 180);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="sku-search" ref={boxRef}>
      <input
        value={q}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="sku-results">
          {results.map((r) => (
            <div
              key={r.sku}
              className="r"
              onClick={() => {
                onPick(r);
                setQ('');
                setResults([]);
                setOpen(false);
              }}
            >
              <div className="n">{r.name}</div>
              <div className="d">
                <span className="sku-tag">{r.sku}</span>
                <span>
                  {money(r.price_per_unit)} / {r.uom}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
