---
title: Postmortem: Harbor upload outage
updated: 2026-04-20
status: current
---

# Postmortem: Harbor upload outage

Blameless write-up of the Harbor upload failure on 14 April 2026. Reviewed the next day. This note is dated 20 April 2026. It does not name a person as the cause.

## Summary

On Tuesday 14 April 2026, file uploads in Harbor failed for 3 hours 20 minutes. The window was 10:05 to 13:25 CET. The storage provider had rotated credentials. No files were lost. 23 clients were affected and were emailed the same day.

Harbor is the client portal for requests, files, and invoices. It launched in May 2025. This incident was limited to uploads. The note below does not describe any other Harbor feature as down, because that is not what we observed.

## Timeline (CET times)

- 10:05 — File uploads in Harbor start failing.
- 10:05–13:25 — Uploads continue to fail. The length of that window is 3 hours 20 minutes.
- 13:25 — Uploads succeed again.
- Same day, after service returned — Sandra Tsapljoek and Vladislav Boerdonos email the 23 clients who were affected.

The incident review itself was on 15 April 2026. This postmortem follows that review.

## Impact

23 clients could not upload a file during the window. Files already stored were still there when uploads resumed. No files were lost. We are not claiming a figure for requests that were delayed inside the 3 hours 20 minutes; we did not count those separately from the upload failure.

Clients who did not need to upload during that window are outside the 23.

## Root cause

The storage provider rotated credentials. Harbor was still using the previous credentials, so uploads failed. When the credentials in use matched what the provider expected, uploads worked again. That is the cause. The review did not treat it as an individual mistake, and this note does not either.

## What went well

- No files were lost. The failure was an upload failure, not a deletion.
- The 23 clients were told the same day, by the account leads, rather than at the next scheduled contact.
- The review on 15 April stayed on the mechanism and the follow-ups. It was blameless, which is how we want an incident review to go.

## Follow-ups

- Alerting on upload errors, so a repeat is visible without a client writing in. Tracked from the 15 April review.
- A credential rotation runbook, so the next time the storage provider rotates credentials the portal is updated as part of that rotation, not after uploads have already failed.

No other follow-up was agreed in the review.
