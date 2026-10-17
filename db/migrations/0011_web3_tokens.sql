-- Part 3 (web3): which token contract a deposit came from (3.4 Fake USDC).

ALTER TABLE w3.deposits ADD COLUMN IF NOT EXISTS token TEXT;

INSERT INTO lab.counters (key) VALUES
  ('w3_fake_runs'),
  ('w3_careless_fake_units')
ON CONFLICT (key) DO NOTHING;
