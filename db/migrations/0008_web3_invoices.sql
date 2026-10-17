-- Part 3 (web3): one invoice, several deposits (3.3 Wrong amount).

CREATE TABLE IF NOT EXISTS w3.invoices (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL,
  chapter       TEXT        NOT NULL,
  label         TEXT        NOT NULL,
  scenario      TEXT        NOT NULL,
  amount_units  BIGINT      NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- What the careless matcher had lost when the last deposit settled. Counted once.
  counted       BOOLEAN     NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS w3_invoices_session_idx ON w3.invoices (session_id, chapter, created_at DESC);

ALTER TABLE w3.deposits ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES w3.invoices (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS w3_deposits_invoice_idx ON w3.deposits (invoice_id);

INSERT INTO lab.counters (key) VALUES
  ('w3_wrong_amount_runs'),
  ('w3_careless_unmatched_units')
ON CONFLICT (key) DO NOTHING;
