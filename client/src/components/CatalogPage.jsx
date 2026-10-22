import React, { useEffect, useState } from 'react';
import { api, money } from '../api.js';

const BLANK = { sku: '', name: '', category: '', uom: 'each', unit_qty: 1, price_per_unit: 0 };

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // sku being edited
  const [draft, setDraft] = useState({});
  const [adding, setAdding] = useState(BLANK);
  const [err, setErr] = useState('');

  const load = () => api.listCatalog().then((r) => setItems(r.items));
  useEffect(() => { load(); }, []);

  const startEdit = (it) => { setEditing(it.sku); setDraft({ ...it }); };
  const saveEdit = async () => {
    await api.updateSku(editing, {
      name: draft.name, category: draft.category, uom: draft.uom,
      unit_qty: draft.unit_qty, price_per_unit: draft.price_per_unit,
    });
    setEditing(null); load();
  };
  const del = async (sku) => { if (confirm(`Delete ${sku}?`)) { await api.deleteSku(sku); load(); } };
  const add = async () => {
    setErr('');
    try { await api.createSku(adding); setAdding(BLANK); load(); }
    catch (e) { setErr(e.message); }
  };

  const cell = (k, type = 'text') => (
    <input className="qty-input" style={{ width: '100%', textAlign: type === 'number' ? 'right' : 'left' }}
      type={type} value={draft[k] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} />
  );

  return (
    <div className="page">
      <div className="col" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div className="col-head"><h2>Stock catalog</h2><span className="sub">{items.length} items · click a row to edit</span></div>
        <div className="col-body">
          {/* Add new */}
          <div className="add-item" style={{ marginTop: 0, borderTop: 'none' }}>
            <div className="add-label">Add stock item</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {['sku', 'name', 'category', 'uom'].map((k) => (
                <input key={k} className="qty-input" style={{ width: k === 'name' ? 200 : 110, textAlign: 'left' }}
                  placeholder={k} value={adding[k]} onChange={(e) => setAdding((a) => ({ ...a, [k]: e.target.value }))} />
              ))}
              <input className="qty-input" type="number" placeholder="unit qty" value={adding.unit_qty}
                onChange={(e) => setAdding((a) => ({ ...a, unit_qty: e.target.value }))} />
              <input className="qty-input" type="number" placeholder="price" value={adding.price_per_unit}
                onChange={(e) => setAdding((a) => ({ ...a, price_per_unit: e.target.value }))} />
              <button className="btn primary sm" onClick={add}>Add</button>
              {err && <span className="warn-tag">{err}</span>}
            </div>
          </div>

          <table className="li-table" style={{ marginTop: 14 }}>
            <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>UOM</th><th style={{ textAlign: 'right' }}>Unit qty</th><th style={{ textAlign: 'right' }}>Price</th><th></th></tr></thead>
            <tbody>
              {items.map((it) => editing === it.sku ? (
                <tr key={it.sku} className="needs-review">
                  <td><span className="sku-tag">{it.sku}</span></td>
                  <td>{cell('name')}</td><td>{cell('category')}</td><td>{cell('uom')}</td>
                  <td>{cell('unit_qty', 'number')}</td><td>{cell('price_per_unit', 'number')}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="link" onClick={saveEdit}>save</button>{' · '}
                    <button className="link" onClick={() => setEditing(null)}>cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={it.sku}>
                  <td><span className="sku-tag">{it.sku}</span></td>
                  <td className="li-name">{it.name}</td>
                  <td>{it.category}</td><td>{it.uom}</td>
                  <td className="li-total">{it.unit_qty}</td>
                  <td className="li-total">{money(it.price_per_unit)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="link" onClick={() => startEdit(it)}>edit</button>{' · '}
                    <button className="link" onClick={() => del(it.sku)}>delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
