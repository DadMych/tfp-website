-- Double-Spend v2: attacks against five defence levels, with per-request timing
-- so the page can draw the interleaving. Replaces the v1 ds tables.

DROP TABLE IF EXISTS ds.debits;
DROP TABLE IF EXISTS ds.accounts;
DROP TABLE IF EXISTS ds.runs;

CREATE TABLE ds.attacks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash         TEXT,
  session_id      UUID,
  level           SMALLINT    NOT NULL CHECK (level BETWEEN 0 AND 4),
  requests        SMALLINT    NOT NULL,
  concurrency     SMALLINT    NOT NULL,
  amount_cents    INTEGER     NOT NULL,
  start_cents     INTEGER     NOT NULL,
  approved        SMALLINT,
  final_cents     INTEGER,
  extracted_cents INTEGER,
  duration_ms     INTEGER
);

CREATE INDEX ds_attacks_created_idx ON ds.attacks (created_at DESC);
CREATE INDEX ds_attacks_level_idx ON ds.attacks (level, extracted_cents DESC);

-- One account per attack. The CHECK is on for levels 3-4 only, by name, so
-- the page can show the constraint firing as the last line of defence.
CREATE TABLE ds.accounts (
  attack_id     UUID    PRIMARY KEY REFERENCES ds.attacks (id) ON DELETE CASCADE,
  level         SMALLINT NOT NULL,
  balance_cents INTEGER NOT NULL,
  CONSTRAINT defended_never_negative CHECK (level < 3 OR balance_cents >= 0)
);

CREATE TABLE ds.requests (
  attack_id   UUID     NOT NULL REFERENCES ds.attacks (id) ON DELETE CASCADE,
  seq         SMALLINT NOT NULL,
  worker      SMALLINT NOT NULL,
  outcome     TEXT     NOT NULL CHECK (outcome IN ('approved', 'declined', 'refused')),
  read_cents  INTEGER,
  after_cents INTEGER,
  t_start_ms  INTEGER  NOT NULL,
  t_read_ms   INTEGER,
  t_end_ms    INTEGER  NOT NULL,
  PRIMARY KEY (attack_id, seq)
);

-- Honest per-level aggregates for the board. Never seeded.
CREATE TABLE ds.level_stats (
  level           SMALLINT PRIMARY KEY,
  attacks         BIGINT   NOT NULL DEFAULT 0,
  extracted_cents BIGINT   NOT NULL DEFAULT 0,
  best_cents      INTEGER  NOT NULL DEFAULT 0
);
INSERT INTO ds.level_stats (level) VALUES (0), (1), (2), (3), (4);

DELETE FROM lab.counters WHERE key IN ('ds_runs_total', 'ds_overdraft_prevented_cents');
INSERT INTO lab.counters (key) VALUES
  ('ds_attacks_total'),
  ('ds_extracted_cents'),
  ('ds_defended_attacks'),
  ('ds_defended_extracted_cents')
ON CONFLICT (key) DO NOTHING;
