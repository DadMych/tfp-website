-- Part 4.6 (The Link That Never Dies): who a file was shared with, per visitor.
-- A signed link points at a row here; revoking the row kills every link made from it.

CREATE SCHEMA IF NOT EXISTS priv;

CREATE TABLE IF NOT EXISTS priv.link_grants (
  id          BIGSERIAL   PRIMARY KEY,
  session_id  UUID        NOT NULL,
  grantee     TEXT        NOT NULL,
  file_id     INT         NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS link_grants_session ON priv.link_grants (session_id);
CREATE INDEX IF NOT EXISTS link_grants_created ON priv.link_grants (created_at);

INSERT INTO lab.counters (key) VALUES
  ('p4_link_tries'),
  ('p4_link_careless_opened')
ON CONFLICT (key) DO NOTHING;
