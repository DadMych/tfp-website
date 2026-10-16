---
title: Handoff notes: Becker Freight website
updated: 2025-11-20
status: current
---

# Handoff notes: Becker Freight website

For the developers at Pixelforge. Vlas Koerbatski, 20 November 2025. Becker Freight, logistics, Website Sprint 2025. Read this before the handoff call so we are not hunting layers on the call.

Pixelforge is Becker's development partner, on Becker's contract. Northwind does not subcontract you and is not responsible for the build. These notes are the design handoff only.

## Where the files are

Figma project: Becker Freight. Build from the Handoff page. Final is the approved frames. Explorations is our working history. Do not implement from Explorations.

Assets for the approved frames are exported as SVG and PNG from that Handoff page. This sprint is the website. If a frame is not on the Handoff page, it is not in the build.

## Breakpoints

Layouts are drawn at 360/768/1280. Those three are the ones to build. Do not invent a fourth from a frame that was only used in an exploration.

- 360 — small. Navigation collapses. The quote form stacks.
- 768 — mid. Same sections, more of them side by side.
- 1280 — the desktop frames we reviewed with Becker.

## Tokens

Design tokens are a JSON file in the W3C design tokens format, linked from the Handoff page. Colour, type and space live there. If a value in a frame disagrees with the JSON, the JSON is what we will check at design QA. Tell us in Harbor and we will fix the frame.

## Form

The quote-request form is the one Becker cares about. Validation states are in the Handoff page, next to the form frames.

- Empty, before anyone has typed.
- Error, when a required field is missing or a value does not pass. The message sits with the field, not only at the top of the form.
- Hover and focus on the fields and on the submit control. Focus is visible. Do not rely on colour alone for the error.

We did not design a signed-in product. This is the marketing site, up to the eight page templates in the sprint, plus the component sheet.

## Questions

One 45-minute handoff call covers this deliverable. After the call, developer questions are free for 14 days, via Harbor. Please do not send them only by email. After those 14 days, questions are billed as normal work.

Design QA is included in this Website Sprint. When a template is built, send the URL through Harbor and we will review it against the Handoff page.
