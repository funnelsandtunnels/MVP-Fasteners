import { useEffect } from 'react';

const EVENT_TYPES = [
  'ready',
  'inbound',
  'step',
  'classified',
  'done',
  'error',
  'draft_crafted',
  'reply_sent',
  'line_items_updated',
  'erp_pushed',
];

// Singleton EventSource shared by all subscribers.
let es = null;
const subscribers = new Set();

function ensureStream() {
  if (es) return;
  es = new EventSource('/events');
  const dispatch = (e) => {
    let data = {};
    try {
      data = JSON.parse(e.data);
    } catch {
      /* ignore */
    }
    for (const cb of subscribers) cb(data);
  };
  for (const t of EVENT_TYPES) es.addEventListener(t, dispatch);
  es.onerror = () => {
    /* browser auto-reconnects */
  };
}

// Subscribe to all pipeline events. handler receives { type, threadId, ... }.
export function useEvents(handler) {
  useEffect(() => {
    ensureStream();
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  }, [handler]);
}
