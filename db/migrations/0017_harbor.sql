-- Part 4.1: a small Harbor (projects and files per client) with row-level security.
-- The app's own role has BYPASSRLS, so the policy only applies under harbor_client.

CREATE SCHEMA IF NOT EXISTS harbor;

CREATE TABLE IF NOT EXISTS harbor.projects (
  id      INTEGER PRIMARY KEY,
  client  TEXT    NOT NULL,
  name    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS harbor.files (
  id          SERIAL  PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES harbor.projects (id),
  client      TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  size_kb     INTEGER NOT NULL,
  updated     DATE    NOT NULL
);

ALTER TABLE harbor.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE harbor.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_projects ON harbor.projects;
CREATE POLICY own_projects ON harbor.projects FOR SELECT USING (client = current_setting('harbor.client', true));
DROP POLICY IF EXISTS own_files ON harbor.files;
CREATE POLICY own_files ON harbor.files FOR SELECT USING (client = current_setting('harbor.client', true));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'harbor_client') THEN CREATE ROLE harbor_client NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA harbor TO harbor_client;
GRANT SELECT ON harbor.projects, harbor.files TO harbor_client;
GRANT harbor_client TO CURRENT_USER;

INSERT INTO harbor.projects (id, client, name) VALUES
  (1038, 'acme',       'Brand Sprint 2025'),
  (1039, 'becker',     'Website Sprint 2025'),
  (1042, 'brightlane', 'Studio retainer'),
  (1043, 'kestrel',    'Partner retainer'),
  (1044, 'ortiz',      'Starter retainer'),
  (1045, 'atlas',      'Studio retainer'),
  (1046, 'tidepool',   'Partner retainer'),
  (1047, 'halden',     'Design System Audit 2026'),
  (1048, 'quill',      'Brand Sprint 2026'),
  (1049, 'verdant',    'Website Sprint 2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO harbor.files (project_id, client, name, size_kb, updated)
SELECT v.* FROM (VALUES
  (1038, 'acme',       'Brand book v1.pdf',                    8420, DATE '2025-06-20'),
  (1038, 'acme',       'Logo files.zip',                      14300, DATE '2025-06-20'),
  (1039, 'becker',     'Quote request flow.fig',               6100, DATE '2025-11-14'),
  (1039, 'becker',     'Handoff notes for Pixelforge.pdf',      410, DATE '2025-11-20'),
  (1042, 'brightlane', 'Clause review flow v3.fig',            9800, DATE '2026-08-27'),
  (1042, 'brightlane', 'Status report August 2026.pdf',         260, DATE '2026-09-01'),
  (1042, 'brightlane', 'Confidentiality amendment.pdf',         120, DATE '2026-09-18'),
  (1043, 'kestrel',    'Chart explainers v2.fig',             11200, DATE '2026-05-22'),
  (1043, 'kestrel',    'Monthly report May 2026.pdf',           240, DATE '2026-06-01'),
  (1043, 'kestrel',    'Invoices 2026.zip',                    1900, DATE '2026-09-01'),
  (1044, 'ortiz',      'Project boards.fig',                   5300, DATE '2026-03-10'),
  (1044, 'ortiz',      'Pause request.pdf',                      90, DATE '2026-04-02'),
  (1045, 'atlas',      'Brief.pdf',                             380, DATE '2026-02-11'),
  (1045, 'atlas',      'Downgrade confirmation.pdf',            110, DATE '2026-06-30'),
  (1046, 'tidepool',   'Onboarding flow v5.fig',              12600, DATE '2026-08-04'),
  (1046, 'tidepool',   'Legal review of copy.xlsx',             330, DATE '2026-08-06'),
  (1046, 'tidepool',   'Partner retainer proposal.pdf',         290, DATE '2026-03-05'),
  (1048, 'quill',      'Naming shortlist.pdf',                  170, DATE '2026-05-19'),
  (1048, 'quill',      'Brief.pdf',                             350, DATE '2026-04-08'),
  (1049, 'verdant',    'Accessibility fixes.xlsx',              140, DATE '2026-07-15'),
  (1049, 'verdant',    'Website Sprint proposal.pdf',           300, DATE '2026-05-27')
) AS v(project_id, client, name, size_kb, updated)
WHERE NOT EXISTS (SELECT 1 FROM harbor.files);

INSERT INTO lab.counters (key) VALUES
  ('p4_iso_tries'),
  ('p4_iso_careless_files')
ON CONFLICT (key) DO NOTHING;
