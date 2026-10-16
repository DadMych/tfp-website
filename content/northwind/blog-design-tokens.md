---
title: Blog: design tokens for people who don't care about tokens
updated: 2026-01-28
status: current
---

# Blog: design tokens for people who don't care about tokens

I'm Michiel Dembitski. I lead design systems at Northwind, and I have watched perfectly intelligent people leave the room, politely, when someone says "tokens". This is for them. You can keep not caring about the machinery. You should care about the decision the machinery is holding.

## A token is a decision with a name

A colour you use on buttons. A size of type for a heading. A gap you keep using between a label and a field. If that decision lives in one place, with a name, you can change it once. If it lives as a raw value, copied, you will change it in the file you remember and miss the one you don't.

That is the whole idea. Not a new religion. A name, pointing at a value, so the next person doesn't have to guess which blue was the real one.

We start there on purpose. Colour, type, space, named, before anyone builds a clever component on top of a guess. Components come after. They should be made of decisions you can point at. When they're made of loose numbers, the system is a drawing, and drawings drift.

## Why the file format is the part engineers ask about

Designers can keep those decisions inside Figma and be happy. Engineers cannot use a decision that only exists as a selected swatch on a frame. They need a file. We hand tokens over as JSON, in the W3C design tokens format, because that is a format a front-end can read without us inventing a private dialect and then documenting the dialect.

"W3C" is doing a specific job in that sentence. It means we didn't make up the shape of the file. The names and the values follow a format other tools already expect. Your engineers can take the JSON and wire it to their styles without a translation meeting where I explain, again, what a token is. The meeting can be about the product instead.

We don't write your production code. The JSON is how the decisions travel without us sitting in the repository. If the format is private, the travel fails, and someone retypes the blues by eye. That is how a system quietly becomes two systems.

## What you can safely ignore

You can ignore the arguments about what to call the names. You can ignore the diagram. You cannot ignore a second blue that showed up because someone eyedropped the wrong frame. If you care about the product looking like one product, you care about tokens, even if you never open the JSON.

When we hand the work over there is one handoff call, 45 minutes, per deliverable. Questions from the people building it are free for 14 days after that. Bring the engineer who will actually read the file. The format only helps if someone on your side is willing to use it.

If you sign the invoice and never open Figma, the practical version is shorter. Ask for the JSON. Give it to the person who will build the thing. Stop treating a screenshot as the specification. A screenshot is a picture of a decision. The token file is the decision, in a form the W3C format already describes, and that is the file worth keeping.
