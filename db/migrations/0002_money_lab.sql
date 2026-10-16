-- Money Lab: one schema per module. Double-Spend keeps `ds` from 0001.
-- Webhooks move to their own schema; the old ds.events table goes.

DROP TABLE IF EXISTS ds.events;

DELETE FROM lab.counters WHERE key = 'ds_webhook_duplicates_blocked';
INSERT INTO lab.counters (key) VALUES
  ('idem_runs_total'),
  ('idem_duplicates_prevented'),
  ('wh_deliveries_total'),
  ('wh_duplicates_blocked'),
  ('sm_transitions_total'),
  ('sm_illegal_blocked'),
  ('lg_transactions_total'),
  ('lg_drift_prevented_cents')
ON CONFLICT (key) DO NOTHING;

-- ── Idempotency ──────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS idem;

CREATE TABLE IF NOT EXISTS idem.runs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash        TEXT,
  attempts       INTEGER     NOT NULL,
  amount_cents   INTEGER     NOT NULL,
  none_charges   INTEGER,
  check_charges  INTEGER,
  unique_charges INTEGER,
  duration_ms    INTEGER
);

CREATE INDEX IF NOT EXISTS idem_runs_created_at_idx ON idem.runs (created_at DESC);

-- Every charge that actually got created, per level. This is the money.
CREATE TABLE IF NOT EXISTS idem.charges (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID        NOT NULL REFERENCES idem.runs (id) ON DELETE CASCADE,
  level        TEXT        NOT NULL CHECK (level IN ('none', 'check_then_insert', 'unique_key')),
  idem_key     TEXT        NOT NULL,
  amount_cents INTEGER     NOT NULL,
  seq          SMALLINT    NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idem_charges_run_idx ON idem.charges (run_id, level);

-- Level 2: "did we see this key?" table with no uniqueness. A log, not a lock.
CREATE TABLE IF NOT EXISTS idem.key_log (
  run_id    UUID NOT NULL REFERENCES idem.runs (id) ON DELETE CASCADE,
  idem_key  TEXT NOT NULL,
  charge_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idem_key_log_idx ON idem.key_log (run_id, idem_key);

-- Level 3: the key is a primary key. Postgres serializes the racers.
CREATE TABLE IF NOT EXISTS idem.keys (
  run_id    UUID  NOT NULL REFERENCES idem.runs (id) ON DELETE CASCADE,
  idem_key  TEXT  NOT NULL,
  charge_id UUID,
  response  JSONB,
  PRIMARY KEY (run_id, idem_key)
);

-- ── Webhooks ─────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS wh;

-- Every HTTP delivery that hit an inbox, whatever the outcome.
CREATE TABLE IF NOT EXISTS wh.deliveries (
  id          BIGSERIAL   PRIMARY KEY,
  inbox_id    UUID        NOT NULL,
  ip_hash     TEXT,
  event_id    TEXT,
  event_type  TEXT,
  source      TEXT        NOT NULL CHECK (source IN ('button', 'http')),
  result      TEXT        NOT NULL CHECK (result IN ('processed', 'duplicate', 'stale', 'bad_signature', 'bad_payload')),
  latency_ms  INTEGER,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wh_deliveries_inbox_idx ON wh.deliveries (inbox_id, id DESC);
CREATE INDEX IF NOT EXISTS wh_deliveries_received_idx ON wh.deliveries (received_at);

-- Processed events. The primary key is the dedupe.
CREATE TABLE IF NOT EXISTS wh.events (
  inbox_id     UUID        NOT NULL,
  event_id     TEXT        NOT NULL,
  event_type   TEXT        NOT NULL,
  order_id     TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (inbox_id, event_id)
);

-- Projection the events drive. State never moves backwards in time.
CREATE TABLE IF NOT EXISTS wh.orders (
  inbox_id      UUID        NOT NULL,
  order_id      TEXT        NOT NULL,
  state         TEXT        NOT NULL,
  last_event_at TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (inbox_id, order_id)
);

-- ── State machine ────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS sm;

CREATE TABLE IF NOT EXISTS sm.payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL,
  impl           TEXT        NOT NULL CHECK (impl IN ('naive', 'guarded')),
  state          TEXT        NOT NULL DEFAULT 'created',
  amount_cents   INTEGER     NOT NULL,
  refunded_cents INTEGER     NOT NULL DEFAULT 0,
  version        INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, impl),
  CONSTRAINT guarded_refund_bounded
    CHECK (impl = 'naive' OR refunded_cents <= amount_cents)
);

CREATE INDEX IF NOT EXISTS sm_payments_created_idx ON sm.payments (created_at);

CREATE TABLE IF NOT EXISTS sm.transitions (
  id         BIGSERIAL   PRIMARY KEY,
  payment_id UUID        NOT NULL REFERENCES sm.payments (id) ON DELETE CASCADE,
  action     TEXT        NOT NULL,
  from_state TEXT        NOT NULL,
  to_state   TEXT,
  ok         BOOLEAN     NOT NULL,
  reason     TEXT,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sm_transitions_payment_idx ON sm.transitions (payment_id, id DESC);

-- ── Ledger ───────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS lg;

-- Naive side: a balance is a number you add to.
CREATE TABLE IF NOT EXISTS lg.balances (
  session_id    UUID   NOT NULL,
  account       TEXT   NOT NULL,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, account)
);

-- Double-entry side: a balance is the sum of entries. Entries come in groups.
CREATE TABLE IF NOT EXISTS lg.journal (
  tx_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL,
  memo       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lg_journal_session_idx ON lg.journal (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lg_journal_created_idx ON lg.journal (created_at);

CREATE TABLE IF NOT EXISTS lg.entries (
  id           BIGSERIAL PRIMARY KEY,
  tx_id        UUID      NOT NULL REFERENCES lg.journal (tx_id) ON DELETE CASCADE,
  session_id   UUID      NOT NULL,
  account      TEXT      NOT NULL,
  amount_cents BIGINT    NOT NULL CHECK (amount_cents <> 0)
);

CREATE INDEX IF NOT EXISTS lg_entries_session_idx ON lg.entries (session_id, account);

-- The invariant, enforced by Postgres at COMMIT: every transaction sums to zero.
CREATE OR REPLACE FUNCTION lg.assert_balanced() RETURNS TRIGGER AS $$
DECLARE
  unbalanced UUID;
BEGIN
  SELECT e.tx_id INTO unbalanced
  FROM lg.entries e
  WHERE e.tx_id = COALESCE(NEW.tx_id, OLD.tx_id)
  GROUP BY e.tx_id
  HAVING SUM(e.amount_cents) <> 0
  LIMIT 1;

  IF unbalanced IS NOT NULL THEN
    RAISE EXCEPTION 'ledger transaction % does not sum to zero', unbalanced
      USING ERRCODE = 'check_violation', CONSTRAINT = 'lg_tx_balanced';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lg_tx_balanced ON lg.entries;
CREATE CONSTRAINT TRIGGER lg_tx_balanced
  AFTER INSERT OR UPDATE OR DELETE ON lg.entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION lg.assert_balanced();

-- Operation log for both sides, so the page can show what happened and when.
CREATE TABLE IF NOT EXISTS lg.ops (
  id         BIGSERIAL   PRIMARY KEY,
  session_id UUID        NOT NULL,
  impl       TEXT        NOT NULL CHECK (impl IN ('naive', 'ledger')),
  memo       TEXT        NOT NULL,
  outcome    TEXT        NOT NULL CHECK (outcome IN ('applied', 'crashed', 'rolled_back', 'refused')),
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lg_ops_session_idx ON lg.ops (session_id, id DESC);
