---
title: Handbook: accessibility checks
updated: 2025-09-15
status: current
---

# Handbook: accessibility checks

*Internal. Last updated 15 September 2025. Use this on the file before handoff, not as a certificate for the client's built product.*

Our accessibility target is WCAG 2.2 AA. This page is the short list we actually check in Figma. If a check fails, fix the token or the component. Don't leave a note that says "dev will handle it". We don't write production code, so a problem we ship in the file is a problem we designed.

## Contrast

Check the colours that are really next to each other, including hover and the colour on a photo or a tinted panel. A swatch on white is not the test.

- Body text: **4.5:1** against its background.
- Large text: **3:1** against its background.
- If the text colour changes on hover or focus, check that state too.
- If a token fails, change the token. Don't override one layer and leave the style rotten.

## Focus

Focus has to be visible. A colour shift that only some of us can see is not a focus state. The ring or other indicator needs to show against the colours around it, on both the default surface and on anything it can sit on (a selected row, a dark footer, a photo).

Tab order in the prototype should follow the reading order. If you had to cheat the order, say so in the file notes before handoff.

## Target size

Interactive targets are **24 by 24** CSS pixels minimum. That is the hit area, padding included, not the size of the icon glyph. A small icon inside a target that still meets the minimum is fine. An icon that is the whole clickable layer, and is smaller than the minimum, is not.

Check icon-only buttons, checkbox hits, and links stacked in a footer. Those are the usual misses.

## Colour is not the only signal

No information by colour alone. Selected, error, success, and "this one is different" all need a second cue: text, an icon, a pattern, or a change in weight or underline. Red text on its own does not count.

## What this page is not

- It is not a promise that the coded site is compliant. We check our design files.
- It is not the paid accessibility audit. That is a separate add-on. If a client asks us to review screens they already built, the account lead quotes it. Don't offer it as a favour inside the hours.
- It does not replace the pre-handoff list (states, tokens, a second designer). Run that too.

## If something fails

Fix it before the file is marked ready, or write down the exception and tell the account lead the same day. "We'll catch it in dev" is not an exception. Bring a stubborn case to crit on Wednesday if you want another pair of eyes. The owner of the file still makes the call.
