-- AI Lab: one agent, one small CRM. Every run gets its own copy of the CRM,
-- keyed by run id, so the careless and guarded agents never share rows.
-- Additive only: nothing outside schema `ai` changes except new counter keys.

INSERT INTO lab.counters (key) VALUES
  ('ai_runs_total'),
  ('ai_attacks_through'),
  ('ai_attacks_blocked')
ON CONFLICT (key) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS ai;

-- One row per agent run (one column of one click). The transcript doubles as
-- the replay shown when the daily budget is spent.
CREATE TABLE IF NOT EXISTS ai.runs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash       TEXT,
  session_id    UUID,
  article       TEXT        NOT NULL,
  scenario      TEXT        NOT NULL,
  side          TEXT        NOT NULL CHECK (side IN ('careless', 'guarded')),
  model         TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed', 'budget')),
  outcome       TEXT,
  steps         SMALLINT    NOT NULL DEFAULT 0,
  input_tokens  INTEGER     NOT NULL DEFAULT 0,
  output_tokens INTEGER     NOT NULL DEFAULT 0,
  cost_nano_usd BIGINT      NOT NULL DEFAULT 0,
  transcript    JSONB       NOT NULL DEFAULT '[]',
  replay_of     UUID,
  eval          BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS ai_runs_created_idx ON ai.runs (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_runs_replay_idx ON ai.runs (article, scenario, side, created_at DESC) WHERE status = 'done' AND replay_of IS NULL;

-- ── The CRM. `shop` separates two businesses in one database. ──────────────

CREATE TABLE IF NOT EXISTS ai.contacts (
  run_id   UUID     NOT NULL REFERENCES ai.runs (id) ON DELETE CASCADE,
  id       SMALLINT NOT NULL,
  shop     TEXT     NOT NULL,
  name     TEXT     NOT NULL,
  email    TEXT     NOT NULL,
  company  TEXT     NOT NULL,
  PRIMARY KEY (run_id, id)
);

CREATE TABLE IF NOT EXISTS ai.deals (
  run_id       UUID     NOT NULL REFERENCES ai.runs (id) ON DELETE CASCADE,
  id           SMALLINT NOT NULL,
  shop         TEXT     NOT NULL,
  contact_id   SMALLINT NOT NULL,
  title        TEXT     NOT NULL,
  amount_cents INTEGER  NOT NULL,
  discount_pct SMALLINT NOT NULL DEFAULT 0,
  stage        TEXT     NOT NULL,
  PRIMARY KEY (run_id, id)
);

-- Notes are written by people outside the company (forms, emails, calls).
-- That makes them untrusted input, which is the whole point of article one.
CREATE TABLE IF NOT EXISTS ai.notes (
  run_id     UUID     NOT NULL REFERENCES ai.runs (id) ON DELETE CASCADE,
  id         SMALLINT NOT NULL,
  shop       TEXT     NOT NULL,
  contact_id SMALLINT NOT NULL,
  author     TEXT     NOT NULL,
  body       TEXT     NOT NULL,
  PRIMARY KEY (run_id, id)
);

-- Nothing is really sent. The outbox is what "sent" means in the lab.
CREATE TABLE IF NOT EXISTS ai.outbox (
  run_id   UUID        NOT NULL REFERENCES ai.runs (id) ON DELETE CASCADE,
  seq      SMALLINT    NOT NULL,
  to_addr  TEXT        NOT NULL,
  subject  TEXT        NOT NULL,
  body     TEXT        NOT NULL,
  idem_key TEXT,
  sent_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, seq)
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_outbox_idem_idx ON ai.outbox (run_id, idem_key) WHERE idem_key IS NOT NULL;

-- A write the guarded agent asked for and a human has to approve.
CREATE TABLE IF NOT EXISTS ai.proposals (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id     UUID        NOT NULL REFERENCES ai.runs (id) ON DELETE CASCADE,
  tool       TEXT        NOT NULL,
  args       JSONB       NOT NULL,
  reason     TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

-- Every tool call, who made it and what happened.
CREATE TABLE IF NOT EXISTS ai.audit (
  run_id  UUID        NOT NULL REFERENCES ai.runs (id) ON DELETE CASCADE,
  seq     SMALLINT    NOT NULL,
  actor   TEXT        NOT NULL CHECK (actor IN ('agent', 'human')),
  tool    TEXT        NOT NULL,
  args    JSONB       NOT NULL,
  result  TEXT        NOT NULL CHECK (result IN ('done', 'blocked', 'proposed', 'error')),
  detail  TEXT,
  at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, seq)
);

-- ── Money for the model ─────────────────────────────────────────────────────

-- One row per UTC day. A call reserves its worst case before it goes out and
-- settles to the real usage after. The CHECK makes overspending impossible
-- even with many calls in flight.
CREATE TABLE IF NOT EXISTS ai.budget (
  day            DATE   PRIMARY KEY,
  cap_nano_usd   BIGINT NOT NULL,
  spent_nano_usd BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT ai_budget_within_cap CHECK (spent_nano_usd <= cap_nano_usd)
);

-- Owner-run evals. Visitors only read these.
CREATE TABLE IF NOT EXISTS ai.evals (
  id         BIGSERIAL   PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  batch      UUID        NOT NULL,
  article    TEXT        NOT NULL,
  scenario   TEXT        NOT NULL,
  side       TEXT        NOT NULL CHECK (side IN ('careless', 'guarded')),
  run_id     UUID        REFERENCES ai.runs (id) ON DELETE SET NULL,
  attack_got_through BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_evals_idx ON ai.evals (article, scenario, side, created_at DESC);
