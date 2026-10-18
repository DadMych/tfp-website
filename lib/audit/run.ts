// Measured facts from running the audit on the broken cabinet. Honest numbers:
// change these only when the tools are re-run, and keep the copy matching.
//
//  - Secret scan:   gitleaks 8.30.1 over the cabinet's own code (lib/audit,
//                   components/lab/audit, app/.../audit) — 41.98 KB in 175 ms.
//  - Dependency scan: osv-scanner 2.7.0 over package-lock.json, 1.8 s. The repo's
//                   own deps were updated (Next 16.2.1 -> 16.2.12 + transitive bumps),
//                   taking the earlier 72 advisories down to 17 across 5 packages
//                   (next, postcss, sharp, and dev-only braces/tmp). The remaining
//                   next advisories need 16.3+, which currently breaks the Vercel
//                   Turbopack font build — deferred. Re-run osv on the repo, get 17.
//  - By hand:       reading the code and using the cabinet.
// Both tools were re-run on 2026-10-18.

export const AUDIT_RUN = {
  days: 5,
  tools: {
    /** gitleaks hits in the cabinet's shipped code. The leaked key is a plain
     *  constant in the browser bundle, which a repo secret scan doesn't flag. */
    secretsInCode: 0,
    secretScanMs: 175,
    /** osv-scanner advisories against the real lockfile: framework/library CVEs, not these
     *  bugs. Down from 72 after bumping Next to 16.2.12; the rest need 16.3+ (breaks the
     *  Vercel font build) or are transitive/dev. */
    depAdvisories: 17,
    depPackages: 5,
    depScanSeconds: 1.8,
  },
  /** How many of the ranked findings a tool surfaced on its own. */
  foundByTools: 0,
} as const;
