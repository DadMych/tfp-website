// Measured facts from running the audit on the broken cabinet. Honest numbers:
// change these only when the tools are re-run, and keep the copy matching.
//
//  - Secret scan:   gitleaks 8.30.1 over the cabinet's own code (lib/audit,
//                   components/lab/audit, app/.../audit) — 41.98 KB in 175 ms.
//  - Dependency scan: osv-scanner 2.7.0 over package-lock.json — 513 packages, 4.3 s.
//  - By hand:       reading the code and using the cabinet.
// Both tools were run on 2026-10-18.

export const AUDIT_RUN = {
  days: 5,
  tools: {
    /** gitleaks hits in the cabinet's shipped code. The leaked key is a plain
     *  constant in the browser bundle, which a repo secret scan doesn't flag. */
    secretsInCode: 0,
    secretScanMs: 175,
    /** osv-scanner advisories against the real lockfile: framework CVEs, not these bugs. */
    depAdvisories: 72,
    depPackages: 15,
    depScanSeconds: 4.3,
  },
  /** How many of the ranked findings a tool surfaced on its own. */
  foundByTools: 0,
} as const;
