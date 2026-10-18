-- Part 4.3: deletion, per visitor. The shared rag.* tables are never touched;
-- a sandbox marks Halden's files deleted for one session and one build.

CREATE SCHEMA IF NOT EXISTS priv;

CREATE TABLE IF NOT EXISTS priv.deletions (
  session_id  UUID        NOT NULL,
  build       TEXT        NOT NULL CHECK (build IN ('careless', 'careful')),
  deleted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, build)
);

-- The bot's answer cache: same question, same answer, no model call.
CREATE TABLE IF NOT EXISTS priv.answer_cache (
  session_id  UUID        NOT NULL,
  build       TEXT        NOT NULL CHECK (build IN ('careless', 'careful')),
  question    TEXT        NOT NULL,
  answer      TEXT        NOT NULL,
  sources     JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, build, question)
);
CREATE INDEX IF NOT EXISTS answer_cache_created ON priv.answer_cache (created_at);
CREATE INDEX IF NOT EXISTS deletions_created ON priv.deletions (deleted_at);
