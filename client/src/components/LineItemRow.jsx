import React, { useState } from 'react';
import { money } from '../api.js';
import SkuSearch from './SkuSearch.jsx';

// One extracted RFQ line item. Editable quantity; inline SKU search on "change"
// or when the item couldn't be matched automatically.
export default function LineItemRow({ item, onChangeQty, onPickSku, onDelete }) {
  const [editingSku, setEditingSku] = useState(false);
  const perEach = item.price_per_unit;
  const confidence = item.match_confidence != null ? Math.round(item.match_confidence * 100) : null;
  const showSearch = item.needs_review || editingSku;

  const pick = (r) => {
    onPickSku(item, r);
    setEditingSku(false);
  };

  return (
    <tr className={item.needs_review ? 'needs-review' : ''}>
      <td>
        <div className="li-name">{item.raw_name}</div>
        {item.raw_part_number && <div className="li-sub">Cust. P/N: {item.raw_part_number}</div>}
      </td>
      <td>
        <input
          className="qty-input"
          type="number"
          min="1"
          value={Number(item.quantity)}
          onChange={(e) => onChangeQty(item, e.target.value)}
        />
      </td>
      <td>
        {showSearch ? (
          <div className="sku-edit">
            <span className="warn-tag">{item.needs_review ? '⚠ Pick a SKU' : 'Change SKU'}</span>
            <SkuSearch onPick={pick} />
            {!item.needs_review && (
              <button className="link" onClick={() => setEditingSku(false)}>
                cancel
              </button>
            )}
          </div>
        ) : item.matched_sku ? (
          <>
            <span className="sku-tag">{item.matched_sku}</span>
            {item.catalog_name && <div className="li-sub">{item.catalog_name}</div>}
            <div className="conf">
              {item.is_manual ? 'manual' : `match ${confidence}%`}
              {' · '}
              <button className="link" onClick={() => setEditingSku(true)}>
                change
              </button>
            </div>
          </>
        ) : (
          <span className="warn-tag">unmatched</span>
        )}
      </td>
      <td className="li-total">{money(perEach)}</td>
      <td className="li-total">{money(item.total)}</td>
      <td>
        <button className="trash" title="Remove" onClick={() => onDelete(item)}>
          ✕
        </button>
      </td>
    </tr>
  );
}
