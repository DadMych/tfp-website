-- Part 3 (web3): the payer's next nonce, as the lab last used it. Public RPC nodes behind a
-- load balancer can report a stale pending count for a few seconds after a send.

CREATE TABLE IF NOT EXISTS w3.payer (
  id          INTEGER     PRIMARY KEY CHECK (id = 1),
  next_nonce  BIGINT      NOT NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
