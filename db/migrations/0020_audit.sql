-- Part 4.5 (Who Looked?): who opened Tidepool's contract, per visitor and build.

CREATE SCHEMA IF NOT EXISTS priv;

-- Careless: people only, and anyone with the owner key can rewrite it.
CREATE TABLE IF NOT EXISTS priv.log_careless (
  session_id  UUID        NOT NULL,
  seq         INT         NOT NULL,
  at          TIMESTAMPTZ NOT NULL,
  actor       TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  detail      TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, seq)
);

-- Careful: every read, the bot's too, each entry chained to the one before.
CREATE TABLE IF NOT EXISTS priv.log_careful (
  session_id  UUID        NOT NULL,
  seq         INT         NOT NULL,
  at          TIMESTAMPTZ NOT NULL,
  actor       TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  detail      TEXT        NOT NULL DEFAULT '',
  prev_hash   TEXT        NOT NULL,
  hash        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, seq)
);

-- The hash Tidepool received with its monthly report. In real life it sits in Tidepool's inbox.
CREATE TABLE IF NOT EXISTS priv.log_receipts (
  session_id  UUID        PRIMARY KEY,
  seq         INT         NOT NULL,
  hash        TEXT        NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS log_careless_created ON priv.log_careless (created_at);
CREATE INDEX IF NOT EXISTS log_careful_created ON priv.log_careful (created_at);
CREATE INDEX IF NOT EXISTS log_receipts_created ON priv.log_receipts (created_at);

-- The app writes the careful log as this role: it can add entries and read them, nothing else.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audit_writer') THEN CREATE ROLE audit_writer NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA priv TO audit_writer;
GRANT SELECT, INSERT ON priv.log_careful TO audit_writer;
GRANT audit_writer TO CURRENT_USER;

INSERT INTO lab.counters (key) VALUES
  ('p4_audit_tampers'),
  ('p4_audit_caught')
ON CONFLICT (key) DO NOTHING;
