# Orion · RFQ Desk (MVP)

Localhost simulation of email-layer software for a **fastener distributor**. Incoming
email threads are parsed by an LLM, which classifies them, extracts structured line items,
matches them to a SKU catalog, prices a quote, and drafts a reply for a rep to approve.

## What it does

- **Two panels**
  - **Inbox / Processing** — tabs for **RFQs** and **Misc**. Right side lists threads and
    shows the full conversation; left side shows the live processing timer/steps and then
    the priced line-item table + draft reply.
  - **Compose** (drawer) — send an email *as a customer*; it appears in the inbox and is
    processed by the LLM. No real SMTP/IMAP — it's an in-app simulation.
- **Pipeline**: classify (RFQ vs. general) → extract line items → match SKUs → price →
  ready for review → craft reply → send + "Send to ERP" (stub).
- **SKU matching**: exact part-number hit, else `pg_trgm` fuzzy match on name; unmatched
  items surface a catalog **search bar** so the rep can pick a SKU manually.

## Stack

React + Vite (client) · Express + SSE (server) · PostgreSQL 16 · OpenAI.

## Setup

1. **Install**
   ```bash
   npm install
   ```
2. **Configure** — copy `.env.example` to `.env` and add your key:
   ```bash
   cp .env.example .env
   # then edit .env and set OPENAI_API_KEY=sk-...
   ```
   Defaults: `OPENAI_MODEL=gpt-4o`, `API_PORT=4000`,
   `DATABASE_URL=postgresql://shariqkhan@localhost:5432/orion_rfq_mvp`.
3. **Seed the database** (creates the DB, applies schema, loads catalog + sample threads):
   ```bash
   npm run seed
   ```
4. **Run** (starts Express API + Vite together):
   ```bash
   npm run dev
   ```
   Open the Vite URL it prints (http://localhost:5173).

> When a valid `OPENAI_API_KEY` is present, the 4 seeded threads auto-process on server
> boot. Without a key the app runs, but classification/extraction/craft are disabled —
> you'll see a red "No API key" indicator.

## Try it

1. Click **Compose**, use a preset (or write your own RFQ), and **Send**.
2. Watch the left panel: *Classifying → Extracting line items → Matching SKUs & pricing*.
3. Review the line-item table. For any unmatched item, use the search bar to pick a SKU.
4. Click **Craft response**, review/edit the draft, **Send reply**, then **Send to ERP**.
5. A general question (no line items) lands in the **Misc** tab instead.

## Layout

```
server/  Express API, SSE, LLM (OpenAI), pipeline, pg_trgm matcher, seed scripts
client/  React + Vite two-panel UI
```

## Notes

- `npm run seed` is idempotent (catalog upserts; sample threads inserted once).
- Reset everything: `dropdb orion_rfq_mvp && npm run seed`.
- State lives in Postgres, so it survives restarts.
