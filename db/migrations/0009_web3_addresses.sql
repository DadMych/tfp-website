-- Part 3 (web3): one deposit address per invoice (3.2 Which invoice?).

CREATE SEQUENCE IF NOT EXISTS w3.address_index_seq START 1;

ALTER TABLE w3.invoices ADD COLUMN IF NOT EXISTS client TEXT;
ALTER TABLE w3.invoices ADD COLUMN IF NOT EXISTS address_index BIGINT UNIQUE;
ALTER TABLE w3.invoices ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE w3.deposits ADD COLUMN IF NOT EXISTS to_address TEXT;

INSERT INTO lab.counters (key) VALUES
  ('w3_which_runs'),
  ('w3_careless_misattributed_units')
ON CONFLICT (key) DO NOTHING;
