---
title: Blog: accessibility is a design decision
updated: 2026-05-05
status: current
---

# Blog: accessibility is a design decision

I'm Vlas Koerbatski. I design websites at Northwind. When a page is hard to use, the failure usually happened in the file, weeks before anyone wrote a line of code. Accessibility is a design decision. Treating it as a check at the end is how you get a beautiful frame that only works for the person who drew it.

## The target is not a mood

Our baseline is WCAG 2.2 AA. That is a specific target, not a vibe we add to a case study. It changes what I am willing to call a screen finished. A page can look complete and still be unfinished, because the decisions that make it usable were never made. They were left for "the build", and the build cannot invent a focus style you never drew.

We don't write production code. That makes the decision more important, not less. Whoever implements the page will follow the file. If the file is silent, they will guess, and the guess will be the browser's guess, or theirs. I would rather the file say so.

## Focus is part of the layout

A focus state is not decoration you add if there is time. It is how someone moving through the page without a pointer knows where they are. If I can't see it, the screen is not done. I draw it next to hover, empty, and error, in the same pass as the default. Leaving it for later means it gets designed under pressure, or not at all, and then we discover the omission when a keyboard user meets a button that doesn't change.

This is ordinary work. It is not a specialist track we bolt on for clients who ask. If you have to ask whether the focus state exists, the page was not finished.

## Contrast is a choice, not a filter

Text has to stand clear of what sits behind it. A pale grey that looks refined on a bright monitor in our studio will fail for someone else, in other light, on another screen. I have lost arguments about this and I intend to keep losing them in the direction of the text being readable. Contrast is not a layer you apply after the palette is "done". The palette isn't done if the text disappears.

The same goes for meaning carried only by colour. A red border that is the only sign of an error is a sign some people won't get. The message has to be in the words as well. That is a writing decision and a design decision, and it belongs in the frame before anyone calls the page complete.

## What this is not

Designing to WCAG 2.2 AA is not a certificate, and it is not a promise about the site after it leaves the file. The implementation can undo a decision we made. What we can do is refuse to hand over a page where the decision was never made. If focus, contrast, and the empty and error states are in the file, the person building it has something real to follow. If they aren't, no later audit will enjoy putting them back.
