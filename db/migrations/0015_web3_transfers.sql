-- Part 3 (web3): every real transaction the lab wallet broadcast, for the /lab card.

-- Starts from what is already on chain: deposits, plus three transfers per payout run.
INSERT INTO lab.counters (key, value)
SELECT 'w3_transfers_total',
       COALESCE((SELECT value FROM lab.counters WHERE key = 'w3_deposits_total'), 0)
       + 3 * COALESCE((SELECT value FROM lab.counters WHERE key = 'w3_payout_runs'), 0)
ON CONFLICT (key) DO NOTHING;
