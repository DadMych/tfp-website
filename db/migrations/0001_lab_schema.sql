-- Lab: shared tables + Double-Spend Lab schema.
-- Applied by scripts/migrate.mjs over the direct (unpooled) connection.

CREATE SCHEMA IF NOT EXISTS lab;

-- Honest counters shown on /lab and each demo. Incremented by real runs only.
CREATE TABLE IF NOT EXISTS lab.counters (
  key   TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);

INSERT INTO lab.counters (key) VALUES
  ('ds_runs_total'),
  ('ds_overdraft_prevented_cents'),
  ('ds_webhook_duplicates_blocked')
ON CONFLICT (key) DO NOTHING;

-- Rate limiting in Postgres. One row per (ip_hash, bucket, window).
CREATE TABLE IF NOT EXISTS lab.rate_limits (
  ip_hash      TEXT        NOT NULL,
  bucket       TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, bucket, window_start)
);

-- ── Double-Spend Lab ─────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS ds;

CREATE TABLE IF NOT EXISTS ds.runs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash               TEXT,
  attempted             INTEGER     NOT NULL,
  debit_cents           INTEGER     NOT NULL,
  naive_accepted        INTEGER,
  correct_accepted      INTEGER,
  naive_balance_cents   INTEGER,
  correct_balance_cents INTEGER,
  overdraft_cents       INTEGER,
  duration_ms           INTEGER
);

CREATE INDEX IF NOT EXISTS runs_created_at_idx ON ds.runs (created_at DESC);

-- One account per (run, implementation). The CHECK applies only to `correct`:
-- the naive path must be allowed to go negative, or the race stays invisible.
CREATE TABLE IF NOT EXISTS ds.accounts (
  run_id        UUID    NOT NULL REFERENCES ds.runs (id) ON DELETE CASCADE,
  impl          TEXT    NOT NULL CHECK (impl IN ('naive', 'correct')),
  balance_cents INTEGER NOT NULL,
  PRIMARY KEY (run_id, impl),
  CONSTRAINT correct_never_negative
    CHECK (impl = 'naive' OR balance_cents >= 0)
);

CREATE TABLE IF NOT EXISTS ds.debits (
  run_id     UUID     NOT NULL REFERENCES ds.runs (id) ON DELETE CASCADE,
  impl       TEXT     NOT NULL CHECK (impl IN ('naive', 'correct')),
  seq        SMALLINT NOT NULL,
  status     TEXT     NOT NULL CHECK (status IN ('accepted', 'rejected', 'overdraft')),
  balance_after_cents INTEGER,
  latency_ms INTEGER,
  PRIMARY KEY (run_id, impl, seq)
);

-- Webhook dedupe table, same shape as the production one in the ticketing case.
CREATE TABLE IF NOT EXISTS ds.events (
  id           TEXT        PRIMARY KEY,
  run_id       UUID        REFERENCES ds.runs (id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status       TEXT        NOT NULL DEFAULT 'processed'
               CHECK (status IN ('processed', 'failed'))
);
