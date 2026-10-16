-- AI Lab, layer 1: retrieval over the Northwind knowledge base (content/northwind).
-- Additive. Chunks exist once per chunking strategy so the strategies can be compared.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS rag;

CREATE TABLE rag.docs (
  slug    TEXT PRIMARY KEY,
  title   TEXT NOT NULL,
  updated DATE NOT NULL,
  status  TEXT NOT NULL CHECK (status IN ('current', 'archived')),
  body    TEXT NOT NULL
);

CREATE TABLE rag.chunks (
  id        BIGSERIAL PRIMARY KEY,
  strategy  TEXT NOT NULL CHECK (strategy IN ('fixed', 'section')),
  doc_slug  TEXT NOT NULL REFERENCES rag.docs (slug) ON DELETE CASCADE,
  ord       INT NOT NULL,
  heading   TEXT NOT NULL DEFAULT '',
  text      TEXT NOT NULL,
  tokens    INT NOT NULL,
  tsv       TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', heading || ' ' || text)) STORED,
  embedding VECTOR(1024),
  UNIQUE (strategy, doc_slug, ord)
);
CREATE INDEX chunks_tsv ON rag.chunks USING GIN (tsv);
CREATE INDEX chunks_embedding ON rag.chunks USING hnsw (embedding vector_cosine_ops);

-- Query embeddings, so a repeated question costs nothing.
CREATE TABLE rag.query_cache (
  model     TEXT NOT NULL,
  text      TEXT NOT NULL,
  embedding VECTOR(1024) NOT NULL,
  PRIMARY KEY (model, text)
);

-- One row per (question, pipeline config) in an eval batch.
CREATE TABLE rag.evals (
  id          BIGSERIAL PRIMARY KEY,
  batch       UUID NOT NULL,
  config      TEXT NOT NULL,
  question_id TEXT NOT NULL,
  kind        TEXT NOT NULL,
  retrieved   TEXT[] NOT NULL,
  hit         BOOLEAN NOT NULL,
  answer      TEXT,
  correct     BOOLEAN,
  reason      TEXT,
  in_tokens   INT NOT NULL DEFAULT 0,
  out_tokens  INT NOT NULL DEFAULT 0,
  latency_ms  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX evals_batch ON rag.evals (batch, config);

-- Live questions from visitors. Kept 7 days.
CREATE TABLE rag.queries (
  id         BIGSERIAL PRIMARY KEY,
  ip_hash    TEXT NOT NULL,
  session_id TEXT NOT NULL,
  question   TEXT NOT NULL,
  config     TEXT NOT NULL,
  retrieved  JSONB NOT NULL,
  answer     TEXT,
  cost_nano_usd BIGINT NOT NULL DEFAULT 0,
  latency_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX queries_created ON rag.queries (created_at);
