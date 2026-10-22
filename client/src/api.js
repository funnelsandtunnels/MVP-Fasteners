const j = async (r) => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  return r.json();
};

export const api = {
  health: () => fetch('/api/health').then(j),
  listThreads: (tab) => fetch(`/api/threads?tab=${tab}`).then(j),
  getThread: (id) => fetch(`/api/threads/${id}`).then(j),
  reprocess: (id) => fetch(`/api/threads/${id}/reprocess`, { method: 'POST' }).then(j),
  clearAll: () => fetch('/api/threads', { method: 'DELETE' }).then(j),

  compose: (payload) =>
    fetch('/api/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(j),

  searchCatalog: (q) => fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`).then(j),
  listCatalog: () => fetch('/api/catalog').then(j),
  createSku: (payload) => fetch('/api/catalog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(j),
  updateSku: (sku, patch) => fetch(`/api/catalog/${encodeURIComponent(sku)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then(j),
  deleteSku: (sku) => fetch(`/api/catalog/${encodeURIComponent(sku)}`, { method: 'DELETE' }).then(j),

  patchLineItem: (id, patch) =>
    fetch(`/api/line-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(j),
  addLineItem: (payload) =>
    fetch('/api/line-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(j),
  deleteLineItem: (id) => fetch(`/api/line-items/${id}`, { method: 'DELETE' }).then(j),

  craft: (thread_id) =>
    fetch('/api/draft/craft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id }),
    }).then(j),
  sendReply: (payload) =>
    fetch('/api/draft/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(j),
  pushErp: (thread_id) =>
    fetch('/api/draft/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id }),
    }).then(j),
};

export const money = (n) =>
  n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
