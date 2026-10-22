import React, { useState } from 'react';
import { api } from '../api.js';

// Panel 2 — "send" an email as a customer. It becomes an inbound message and
// triggers the LLM pipeline in the inbox panel.
const PRESETS = [
  {
    label: 'RFQ · bolts & nuts',
    customer_name: 'Halvorsen Fab',
    customer_email: 'buyer@halvorsenfab.com',
    subject: 'RFQ — hardware for trailer build',
    body: `Hi, please quote:
- 300 ea 3/8-16 x 1 hex cap screws grade 5
- 300 ea 3/8-16 hex nuts
- 600 ea 3/8 flat washers
Need by end of month. Thanks!`,
  },
  {
    label: 'RFQ · ambiguous item',
    customer_name: 'Rivera Ironworks',
    customer_email: 'shop@riveraironworks.com',
    subject: 'Quote needed',
    body: `Need pricing on:
- 200 ea 1/2-13 x 3 hex bolts grade 8
- 50 ea galvanized turnbuckles 1/2 (not sure of your part number)
- 200 ea 1/2 lock washers`,
  },
  {
    label: 'Misc · question',
    customer_name: 'Delta Contractors',
    customer_email: 'ops@deltacontractors.com',
    subject: 'Quick question',
    body: `Do your wedge anchors work for overhead applications in concrete? Just researching, not ordering yet.`,
  },
  {
    label: 'Follow-up · revise qty',
    customer_name: 'Dwyer Mechanical',
    customer_email: 'purchasing@dwyermech.com',
    subject: 'RFQ — hex bolts, nuts & washers for skid job',
    body: `Quick update — please change the 1/2-13 x 2 grade 8 hex cap screws from 500 to 800,
and add 200 ea 5/8-11 hex nuts. Everything else stays the same. Thanks!`,
  },
];

export default function ComposePanel({ onClose, onSent }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    subject: '',
    body: '',
  });
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const applyPreset = (p) => setForm({ ...p });

  const [sent, setSent] = useState(false);
  const send = async () => {
    if (!form.customer_email || !form.body) return;
    setSending(true);
    try {
      await api.compose(form);
      setForm({ customer_name: '', customer_email: '', subject: '', body: '' });
      setSent(true);
      setTimeout(() => setSent(false), 4000);
      onSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="col compose-page">
        <div className="col-head">
          <h2>Compose as customer</h2>
          <span className="sub">Simulate an incoming email</span>
        </div>
        <div className="d-body">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Simulate an incoming email. On send it appears in the inbox and is processed by the LLM.
            <br />
            Reusing the same customer email + subject continues an existing thread and re-parses it.
          </div>
          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p.label} className="preset" onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="field">
            <label>Customer name</label>
            <input value={form.customer_name} onChange={set('customer_name')} placeholder="Acme Fabrication" />
          </div>
          <div className="field">
            <label>Customer email *</label>
            <input value={form.customer_email} onChange={set('customer_email')} placeholder="buyer@acme.com" />
          </div>
          <div className="field">
            <label>Subject</label>
            <input value={form.subject} onChange={set('subject')} placeholder="RFQ — …" />
          </div>
          <div className="field">
            <label>Message *</label>
            <textarea value={form.body} onChange={set('body')} placeholder="List the items and quantities…" />
          </div>

          <button className="btn primary" disabled={sending || !form.customer_email || !form.body} onClick={send}>
            {sending ? 'Sending…' : '✉ Send email'}
          </button>
          {sent && <span className="warn-tag" style={{ marginLeft: 12 }}>Sent — arriving in the inbox shortly…</span>}
        </div>
      </div>
    </div>
  );
}
