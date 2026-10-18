-- Part 5: the broken client cabinet. One table of payment attempts per visitor
-- session, used by the "Show me" buttons in the report (double-pay, forged
-- webhook). Invoices themselves are a static catalogue in lib/audit/invoices.ts.

CREATE SCHEMA IF NOT EXISTS cab;

CREATE TABLE IF NOT EXISTS cab.payments (
  id          SERIAL      PRIMARY KEY,
  session     UUID        NOT NULL,
  build       TEXT        NOT NULL CHECK (build IN ('careless', 'careful')),
  invoice     TEXT        NOT NULL,
  amount_cents BIGINT     NOT NULL,
  -- Present only on the careful build; its unique index is what stops the double charge.
  idem_key    TEXT,
  source      TEXT        NOT NULL CHECK (source IN ('tap', 'webhook')),
  -- Webhook demo: did the signature verify? The careful build only keeps verified ones.
  verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cab_payments_session_idx ON cab.payments (session, invoice);
CREATE INDEX IF NOT EXISTS cab_payments_created_idx ON cab.payments (created_at);

-- The careful build carries one idempotency key per payment; the database refuses a second.
CREATE UNIQUE INDEX IF NOT EXISTS cab_payments_idem
  ON cab.payments (session, build, invoice, idem_key)
  WHERE idem_key IS NOT NULL;

INSERT INTO lab.counters (key) VALUES
  ('p5_shows'),
  ('p5_forged_paid'),
  ('p5_fixed_shows')
ON CONFLICT (key) DO NOTHING;
