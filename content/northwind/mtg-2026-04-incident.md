---
title: Incident review: Harbor outage 2026-04-14
updated: 2026-04-15
status: current
---

# Incident review: Harbor outage 2026-04-14

15 Apr 2026, 10:00. Day after. Blameless — we are writing down the failure, not a name.

Attendees: OvK, VW, ST, VB. Whoever sits nearest the portal on a given week is not "the owner of the outage." Noted because someone was going to ask.

## What broke

14 April 2026. Harbor file uploads failed for 3 hours 20 minutes, 10:05–13:25 CET. Downloads and the rest of the portal were not the thing people were shouting about. Uploads failed. The storage provider rotated credentials. Harbor kept running with the old ones until the window closed.

No files lost. Checked against what was in the store before 10:05 and after 13:25. Requests that failed did not half-write a file. Clients who retried after the window got a normal upload.

ST and VB emailed affected clients the same day, 14 April, not this morning. Short note: what failed, that nothing was lost, that they should resend anything the portal rejected. VW had the list of accounts with a failed upload. We are not putting that list in this note.

## What we are not claiming

Not a breach. Credentials rotated on the provider side; this was an availability failure. Not a reason to change how long we keep files, or where data is hosted. EU hosting stands. Don't let a client thread turn this into a security questionnaire we answer from memory — VW handles those.

## Decisions

- No files lost is the sentence we stand on. If a client says otherwise, ST or VB looks at the account before anyone debates it.
- Alerting on upload errors. We found this because people wrote to us, which is a bad monitor.

## Actions

- VW: alerting on upload errors, so a failed upload pages someone during working hours instead of waiting for a client.
- VW: a short runbook for the next time a provider rotates credentials. Where the secret lives, who can swap it, what "uploads work" means as a check.
- ST, VB: if anyone replies late to yesterday's email, same facts, no new theory.
- OvK: one line to the studio. Outage happened, clients were told, files are there, we don't relitigate it in #general.
