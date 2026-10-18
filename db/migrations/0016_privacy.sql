-- Part 4 (privacy): the counters on the hub's black panel.

INSERT INTO lab.counters (key) VALUES
  ('p4_asks'),
  ('p4_careless_leaks'),
  ('p4_careful_kept_out'),
  ('p4_deleted_resurfaced')
ON CONFLICT (key) DO NOTHING;
