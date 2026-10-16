---
title: Case study: Becker Freight
updated: 2025-12-03
status: current
---

# Case study: Becker Freight

## The client

Becker Freight moves goods. The public site is how a shipper asks for a price, and for years that ask was harder than the haul. They hired us for a Website Sprint in 2025. Vlas Koerbatski led the design. Northwind does not build the site; after design QA, the files went to Pixelforge, the web studio Becker contracts directly.

## The problem

The old site explained the company at length and hid the quote. A shipper who already knew the lane, the weight, and the date still had to hunt for a form that asked the wrong questions first and the right ones in a footnote. Pages had been added whenever a service was launched: a template for the new lane, a PDF for the conditions, a hero that repeated the same reassurance because nobody trusted the form to arrive.

Internally, sales could not tell which requests were serious. Half-filled forms landed in an inbox. Operations retyped them. The brand was not the problem they came with. The path to a quote was.

## What we did

The sprint covered 8 page templates and a component sheet: home, services, a lane page, the quote request, the confirmation, an article page for conditions, contact, and an about page. That is the set a Website Sprint allows, and Becker used the set. States — empty, error, confirmation — sit on those templates. We did not sneak in another page by calling it a variation.

The quote form was the page that mattered. Vlas rebuilt it as a sequence a dispatcher can finish without a manual open beside them. What we are shipping, where it starts, where it ends, when it has to move. Optional detail stays optional. Validation states are drawn, not described in a footnote for the developer to invent: empty, typing, error, and the confirmation that names what happens next. Labels are visible. Errors say what to fix.

Design QA was part of the sprint, and we used it. Before launch, Vlas checked the built pages against the frames: type, space, the form states, focus, and the places where a long place name breaks a column. Notes went back to Pixelforge through the handoff, with the token JSON and the breakpoints the templates were drawn at. Becker's team owned the content. We did not write production code, and we did not run the site after it launched.

Feedback came as one list per round, from a single approver on their side, which kept the form from being redesigned by three departments in the same week.

## Result

In the first two months after launch, quote requests went up 31%. Becker counted requests that reached them, not clicks on the button. We take that figure as theirs. What we can see in the work is simpler: the form is the page the templates point at, the states exist in the file the developers used, and design QA happened before the site went live rather than in a thread afterwards.

The sprint ended with the handover. Becker has the templates, the component sheet, and the form. Further pages would be a new request.
