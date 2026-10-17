-- Part 3 (web3): address poisoning rounds (3.5). Simulator: nothing here is on chain.

CREATE TABLE IF NOT EXISTS w3.poison_rounds (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL,
  ip_hash     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The wallet history shown, newest first, and which row is the real payout.
  rows        JSONB       NOT NULL,
  answer      INT         NOT NULL,
  picked      INT,
  ms          INT,
  timed_out   BOOLEAN     NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS w3_poison_rounds_session_idx ON w3.poison_rounds (session_id, created_at DESC);

INSERT INTO lab.counters (key) VALUES
  ('w3_poison_rounds'),
  ('w3_poison_fooled')
ON CONFLICT (key) DO NOTHING;
