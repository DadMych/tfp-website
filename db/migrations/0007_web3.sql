-- Part 3 (web3): Sepolia deposits watched by two watchers.

CREATE SCHEMA IF NOT EXISTS w3;

INSERT INTO lab.counters (key) VALUES
  ('w3_deposits_total'),
  ('w3_careless_lost_units'),
  ('w3_careful_lost_units')
ON CONFLICT (key) DO NOTHING;

-- The real chain as the sync has seen it. A real reorg overwrites the hash at a height.
CREATE TABLE IF NOT EXISTS w3.blocks (
  height      BIGINT      PRIMARY KEY,
  hash        TEXT        NOT NULL,
  parent_hash TEXT        NOT NULL,
  ts          TIMESTAMPTZ NOT NULL,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row: when the chain was last read, so concurrent visitors share one sync.
CREATE TABLE IF NOT EXISTS w3.sync (
  id      INTEGER     PRIMARY KEY CHECK (id = 1),
  at      TIMESTAMPTZ NOT NULL DEFAULT 'epoch',
  tip     BIGINT
);
INSERT INTO w3.sync (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS w3.deposits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID        NOT NULL,
  ip_hash             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  invoice             TEXT        NOT NULL,
  amount_units        BIGINT      NOT NULL,
  tx_hash             TEXT        UNIQUE,
  -- Where the real chain put it. NULL while pending.
  block_height        BIGINT,
  block_hash          TEXT,
  -- The careful watcher's rule for this run.
  needed              INTEGER     NOT NULL CHECK (needed BETWEEN 1 AND 12),
  -- What each watcher did, at which chain tip, trusting which block hash.
  careless_paid_tip   BIGINT,
  careful_paid_tip    BIGINT,
  careful_paid_hash   TEXT,
  careful_caught_tip  BIGINT,
  -- Simulator: this visitor's chain lost its last `reorg_depth` blocks at `reorg_tip`.
  reorg_tip           BIGINT,
  reorg_depth         INTEGER     CHECK (reorg_depth BETWEEN 1 AND 12),
  lost_counted        BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS w3_deposits_session_idx ON w3.deposits (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS w3_deposits_created_idx ON w3.deposits (created_at);
