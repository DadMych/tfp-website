---
title: Handbook: file naming and Figma structure
updated: 2025-07-22
status: current
---

# Handbook: file naming and Figma structure

If the name of the file does not tell us the client, the deliverable, the version and the date, it is not named. "Final-final" is how a developer receives the wrong homepage.

## File names

The pattern is client-deliverable-version-date, in lowercase, with hyphens. A name looks like this:

brightlane-homepage-v3-2026-02-10

That is client `brightlane`, deliverable `homepage`, version `v3`, date `2026-02-10`. Follow that shape even when the real date is a different day. Do not insert spaces, underscores, or your own initials to make the file feel personal.

The version is our file version. It is not the client's revision round. Do not renumber the file so that it matches the round. When the work changes enough that someone could open the wrong one, increment the version and keep the older file.

One project per client in Figma. Not one project per request, and not a personal draft project with a copy of their logo. The string above is the shape of a name. It is not a claim that a particular homepage shipped on that date.

## Pages

Each client project uses these pages, in this order:

- **Cover.** What the file is, for whom, and which version a stranger should trust.
- **Explorations.** The tries. The ugly ones, the ones we dropped, the ones a client never saw.
- **Final.** The work we are willing to call current.
- **Handoff.** What someone building the thing needs: components, specs, the exports.

Do not invent a fifth page called Archive, Graveyard or Old and sweep things into it. If a page is not one of those four, you need a reason you can say out loud, and the account lead should agree before it becomes a habit.

## Never delete Explorations

Never delete Explorations. Not when the client picks a direction, not when the file feels messy, not when you are embarrassed by last Tuesday. The final makes sense because the tries are still there. Delete them and the next designer rebuilds a dead end we already paid for.

Move a rejected route down the page if you must. Hide it if the file is genuinely hard to read. Deleting it is the thing this page forbids. If Harbor or a client asks "what else did you look at", the answer is the Explorations page, not your memory.
