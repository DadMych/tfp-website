---
title: Handbook: pre-handoff QA checklist
updated: 2026-01-26
status: current
---

# Handbook: pre-handoff QA checklist

Run this before any handoff, not only before a Website Sprint. The handoff itself is one 45-minute call per deliverable. After it, developer questions are free for 14 days, through Harbor. If the file is sloppy, those 14 days become us doing the checklist out loud, on their time and ours.

A second designer reviews the file against this list before the call is booked. Not you, reviewing your own work with kinder eyes. Someone who did not draw it.

## States

Check hover, focus, empty and error. A screen that only shows the happy path is not ready. Empty is what the page is when there is nothing to list. Error is what a field does when the input is bad. Hover and focus are how someone knows a control is a control, including by keyboard.

If a state does not apply, say so on the handoff page in one line. Do not leave a gap and hope the developer invents the missing one in your taste.

## Contrast and tokens

Contrast meets our accessibility target, WCAG 2.2 AA. Check the type that sits on colour, and the components that only work if you can already see them. We do not ship a note that says "contrast to be checked later".

Export the tokens as JSON in the W3C design tokens format. The file the developer gets is that JSON, not a screenshot of the variables panel and not a private naming scheme that only makes sense inside our Figma. If the tokens and the frames disagree, the handoff is not ready. Fix the tokens or fix the frames before the call.

## Spacing, assets, and the review

Include a spacing sheet: the steps you actually used, not a library dump of every number Figma offered you. Someone outside the file should be able to see the rhythm without hovering a layer.

Export the assets. Logos as SVG, PNG and PDF where the delivery includes a logo. Icons as SVG. A simple logo animation, if this deliverable has one, as MP4 and as Lottie. Do not leave "we'll export in the call" as an item. The call is for questions, not for watching you package.

The second designer signs the list by leaving their name on the handoff page. No name, no call. If they find a miss, it goes back to the owner of the file. Crit is not a substitute for this pass, and a client's approval of a visual is not a substitute either.
