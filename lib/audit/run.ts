// Measured facts from running the audit on the broken cabinet. Honest numbers:
// change these only when the tools are re-run, and keep the copy matching.
//
//  - Secret scan:   gitleaks 8.30.1 over the cabinet's own code (lib/audit,
//                   components/lab/audit, app/.../audit) — 41.98 KB in 175 ms.
//  - Dependency scan: osv-scanner 2.7.0 over package-lock.json, 2.2 s. The repo's
//                   own deps were updated (Next 16.2.1 -> 16.4.2, transitive bumps),
//                   so the earlier 72 advisories are down to 2, both in dev-only
//                   tooling (braces via the eslint plugin, tmp via solc) with no
//                   clean fix. A skeptic re-running osv on the repo sees the same 2.
//  - By hand:       reading the code and using the cabinet.
// Both tools were re-run on 2026-10-18.

export const AUDIT_RUN = {
  days: 5,
  tools: {
    /** gitleaks hits in the cabinet's shipped code. The leaked key is a plain
     *  constant in the browser bundle, which a repo secret scan doesn't flag. */
    secretsInCode: 0,
    secretScanMs: 175,
    /** osv-scanner advisories against the real lockfile: library CVEs, not these bugs.
     *  Down from 72 after updating the repo's deps; the 2 left are dev-only (braces, tmp). */
    depAdvisories: 2,
    depPackages: 2,
    depScanSeconds: 2.2,
  },
  /** How many of the ranked findings a tool surfaced on its own. */
  foundByTools: 0,
} as const;
