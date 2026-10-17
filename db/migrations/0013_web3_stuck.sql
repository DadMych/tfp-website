-- Part 3 (web3): stuck deposits (3.7). The provider is simulated; the deposits and the chain read are real.

-- Where the careful side starts reading Transfer logs for this invoice's address.
ALTER TABLE w3.invoices ADD COLUMN IF NOT EXISTS from_block BIGINT;

INSERT INTO lab.counters (key) VALUES
  ('w3_stuck_runs'),
  ('w3_careless_stuck_units')
ON CONFLICT (key) DO NOTHING;
