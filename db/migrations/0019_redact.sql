-- Part 4.4 (What Leaves for the AI): chapter counters.

INSERT INTO lab.counters (key) VALUES
  ('p4_redact_asks'),
  ('p4_redact_sent')
ON CONFLICT (key) DO NOTHING;
