-- AI Lab outcomes are not only attacks: an agent can break on its own.
-- "broke" = the failure happened, "stopped" = code stopped it.

DELETE FROM lab.counters WHERE key IN ('ai_attacks_through', 'ai_attacks_blocked');
INSERT INTO lab.counters (key) VALUES ('ai_broke'), ('ai_stopped') ON CONFLICT (key) DO NOTHING;

ALTER TABLE ai.evals RENAME COLUMN attack_got_through TO broke;

-- Tuning runs from before the outcome rename. Nothing public ever showed them.
DELETE FROM ai.evals;
DELETE FROM ai.runs;
