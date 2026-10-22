-- Orion RFQ MVP schema (PostgreSQL 16)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fastener catalog -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog (
  sku             TEXT PRIMARY KEY,
  part_number     TEXT,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  uom             TEXT NOT NULL DEFAULT 'each',   -- each | box-100 | box-50 | per-1000
  unit_qty        INTEGER NOT NULL DEFAULT 1,     -- pieces per UOM
  price_per_unit  NUMERIC(12,4) NOT NULL,         -- price per UOM
  attributes      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS catalog_name_trgm    ON catalog USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS catalog_partnum_trgm ON catalog USING gin (part_number gin_trgm_ops);

-- Email threads --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS threads (
  id                     SERIAL PRIMARY KEY,
  customer_name          TEXT NOT NULL,
  customer_email         TEXT NOT NULL,
  subject                TEXT NOT NULL,
  classification         TEXT NOT NULL DEFAULT 'unclassified', -- unclassified | rfq | misc
  classification_reason  TEXT,
  status                 TEXT NOT NULL DEFAULT 'new',          -- new | processing | ready | replied | error
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages within a thread ---------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  thread_id   INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  direction   TEXT NOT NULL,            -- inbound | outbound
  from_addr   TEXT NOT NULL,
  to_addr     TEXT NOT NULL,
  subject     TEXT,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_thread ON messages(thread_id, created_at);

-- Extracted + priced line items ---------------------------------------------
CREATE TABLE IF NOT EXISTS line_items (
  id                SERIAL PRIMARY KEY,
  thread_id         INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  raw_name          TEXT NOT NULL,          -- as the customer described it
  raw_part_number   TEXT,                   -- part number mentioned in email, if any
  quantity          NUMERIC(14,2) NOT NULL DEFAULT 1,
  matched_sku       TEXT REFERENCES catalog(sku) ON DELETE SET NULL,
  match_confidence  NUMERIC(5,4),           -- 0..1
  price_per_unit    NUMERIC(12,4),
  total             NUMERIC(14,2),
  is_manual         BOOLEAN NOT NULL DEFAULT false,
  needs_review      BOOLEAN NOT NULL DEFAULT false,
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS line_items_thread ON line_items(thread_id, position);

-- Draft replies --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drafts (
  id          SERIAL PRIMARY KEY,
  thread_id   INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',  -- draft | sent
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drafts_thread ON drafts(thread_id, created_at DESC);
