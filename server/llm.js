import 'dotenv/config';
import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

let _client = null;
function client() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it to your .env file.');
  }
  if (!_client) {
    // 45s per-request timeout so a stalled call fails visibly instead of hanging.
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45_000,
      maxRetries: 1,
    });
  }
  return _client;
}

async function chatJSON(system, user) {
  const resp = await client().chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const text = resp.choices[0]?.message?.content || '{}';
  return JSON.parse(text);
}

// Flatten a thread's messages into a readable transcript for the model.
export function threadToText(thread, messages) {
  const header = `Customer: ${thread.customer_name} <${thread.customer_email}>\nSubject: ${thread.subject}\n`;
  const body = messages
    .map((m) => `--- ${m.direction === 'inbound' ? 'FROM CUSTOMER' : 'FROM US'} ---\n${m.body}`)
    .join('\n\n');
  return `${header}\n${body}`;
}

// 1) Classify a thread as an RFQ (request for quote with identifiable items)
//    or a general inquiry (misc).
export async function classifyThread(threadText) {
  const system = `You classify inbound emails for an industrial FASTENER distributor's sales desk.
Return strict JSON: {"classification": "rfq" | "misc", "reason": string}.
- "rfq": the customer is requesting a price/quote AND lists one or more concrete products
  or quantities we could quote (bolts, nuts, washers, screws, anchors, threaded rod, etc.).
- "misc": general questions, product advice, order status, or anything without clearly
  quotable line items.
Keep "reason" to one short sentence.`;
  const out = await chatJSON(system, threadText);
  const classification = out.classification === 'rfq' ? 'rfq' : 'misc';
  return { classification, reason: out.reason || '' };
}

// 2) Extract structured line items from an RFQ thread.
export async function extractLineItems(threadText) {
  const system = `You extract line items from an industrial FASTENER RFQ email.
Return strict JSON: {"items": [{"name": string, "quantity": number, "part_number": string|null, "unit": string|null}]}.
Rules:
- One object per distinct product the customer wants quoted.
- "name": a clean, complete product description (size, type, grade/finish if stated).
- "quantity": numeric count the customer asked for (convert "1,000" -> 1000). If a quantity
  is given in boxes/cases, keep the number they wrote and note the unit in "unit".
- "part_number": include only if the email explicitly states a part number or SKU, else null.
- "unit": "each", "box", "case", "pcs", etc. if stated, else null.
- Ignore greetings, questions, and non-orderable requests.
- IMPORTANT — this may be a multi-message thread (oldest to newest). If later messages
  from the customer revise a quantity, add a new item, or remove/cancel one, reflect the
  customer's LATEST intent: the most recent instruction wins. Return the final, current
  list of items to quote — not a running history.`;
  const out = await chatJSON(system, threadText);
  const items = Array.isArray(out.items) ? out.items : [];
  return items
    .filter((i) => i && i.name)
    .map((i) => ({
      name: String(i.name).trim(),
      quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1,
      part_number: i.part_number ? String(i.part_number).trim() : null,
      unit: i.unit ? String(i.unit).trim() : null,
    }));
}

// 3) Craft a reply email quoting the priced line items.
export async function craftReply({ customerName, threadText, lineItems }) {
  const linesForModel = lineItems.map((li) => ({
    item: li.raw_name,
    sku: li.matched_sku,
    quantity: Number(li.quantity),
    price_per_unit: li.price_per_unit != null ? Number(li.price_per_unit) : null,
    total: li.total != null ? Number(li.total) : null,
    unpriced: li.matched_sku == null,
  }));
  const anyUnpriced = linesForModel.some((l) => l.unpriced);
  const grandTotal = linesForModel.reduce((s, l) => s + (l.total || 0), 0);

  const system = `You are a customer-service rep at Orion Fasteners writing a quote reply.
Return strict JSON: {"subject": string, "body": string}.
Guidelines:
- Warm, professional, concise. Sign off as "Orion Fasteners — Sales Desk".
- Present the quote as a clean itemized list: item, SKU, qty, unit price, line total.
- Include a grand total.
- ${anyUnpriced ? 'Some items could not be matched to a SKU — politely ask the customer to confirm those items or offer to source them, and exclude them from the total.' : 'All items are priced.'}
- Mention standard lead time of 3–5 business days and that the quote is valid for 30 days.
- Do not invent prices; use only what is provided.`;

  const user = `CUSTOMER: ${customerName}
GRAND TOTAL (matched items): $${grandTotal.toFixed(2)}
LINE ITEMS JSON:
${JSON.stringify(linesForModel, null, 2)}

ORIGINAL THREAD:
${threadText}`;

  const out = await chatJSON(system, user);
  return {
    subject: out.subject || 'Your quote from Orion Fasteners',
    body: out.body || '',
  };
}

export { MODEL };
