-- Part 3 (web3): payouts to a freelancer, sent and retried (3.6 Payout twice).

CREATE TABLE IF NOT EXISTS w3.payouts (
  id            BIGSERIAL   PRIMARY KEY,
  run_id        UUID        NOT NULL,
  session_id    UUID        NOT NULL,
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  side          TEXT        NOT NULL CHECK (side IN ('careless', 'careful')),
  attempt       INTEGER     NOT NULL,
  amount_units  BIGINT      NOT NULL,
  nonce         INTEGER     NOT NULL,
  -- What the app itself believes happened on this attempt.
  recorded      TEXT        NOT NULL,
  -- What the network actually did. The careful side stores the signed tx before sending.
  tx_hash       TEXT        NOT NULL,
  raw_tx        TEXT,
  node_said     TEXT,
  block_height  BIGINT,
  block_hash    TEXT
);
CREATE INDEX IF NOT EXISTS w3_payouts_session_idx ON w3.payouts (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS w3_payouts_run_idx ON w3.payouts (run_id);

CREATE TABLE IF NOT EXISTS w3.payout_runs (
  id          UUID        PRIMARY KEY,
  session_id  UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  counted     BOOLEAN     NOT NULL DEFAULT false
);

INSERT INTO lab.counters (key) VALUES
  ('w3_payout_runs'),
  ('w3_careless_overpaid_units')
ON CONFLICT (key) DO NOTHING;
