// Minimal Server-Sent Events hub.
// Clients subscribe to a global channel and receive every event; each event
// carries a threadId so the UI can filter to the thread it is viewing.

const clients = new Set();

export function addClient(res) {
  clients.add(res);
  const drop = () => clients.delete(res);
  res.on('close', drop);
  // Without an 'error' listener, a broken SSE socket emits an unhandled 'error'
  // event that crashes the whole process. Swallow it and drop the client.
  res.on('error', drop);
}

// Broadcast an event to all connected clients.
// type: pipeline step or entity change; payload: arbitrary JSON.
export function emit(type, payload = {}) {
  const data = JSON.stringify({ type, ...payload, at: Date.now() });
  for (const res of clients) {
    try {
      res.write(`event: ${type}\n`);
      res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}
