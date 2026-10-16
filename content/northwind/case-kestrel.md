---
title: Case study: Kestrel Analytics
updated: 2026-06-20
status: current
---

# Case study: Kestrel Analytics

## The client

Kestrel Analytics builds analytics software for teams who live in the charts and still have to explain them to someone who does not. They are based in Ireland. Since January 2026 they have been on a Partner retainer, the first client on that plan.

Sandra Tsapljoek is the account lead. Sofie Milkova is the second senior designer on the account, which is part of what Partner is for. Michiel Dembitski led the system work. Once a month the studio director, Oleksij van Koeropatkin, joins a review call with Kestrel. Those calls are where scope that has drifted gets put back, and where Kestrel tells us which part of the product is about to matter.

## The problem

Kestrel's product had a library the way a product of that age usually does: earnest, overlapping, and slightly different in every squad. Buttons that were cousins. Charts that each invented a legend. Empty states written in three tones of voice, depending on who had last touched the file. Engineers were implementing the frame in front of them, which was rational, and the product was drifting, which was the cost.

They did not need a rebrand. They needed one system the squads could share, documented well enough that a new engineer could use it without booking us.

## What we did

The Partner hours went into the library first. Michiel set the order the studio always uses: tokens for colour, type, and space, then primitives, then components. Sofie took the product surfaces that were already in flight, so the system was tested against a real dashboard rather than against a sample card on a pleasant grey.

Naming follows role, then state. Variants cover size, tone, and the states a chart actually has, including the unglamorous ones: no data, partial data, a series hidden, a point you cannot read. Documentation pages sit in the Figma file. Each component says what it is, when to leave it alone, and which tokens it uses.

We exported the tokens as JSON in the W3C design tokens format and walked Kestrel's engineers through that file. We did not write the production components. Their team implements. Questions after the handoff stayed with the account, inside the retainer, instead of becoming a second project with a second language.

Sandra kept the queue honest. A Partner account can hold more than one active request, and Kestrel always had a feature that felt urgent beside the library. The monthly review with Oleksij was useful exactly there: the library stayed on the list until it was actually shared, not until the kickoff energy ran out.

## Result

The library we handed over holds 140 components, from the smallest control to the chart patterns Kestrel's product is known for. Squads that used to redraw a filter now take it from the file. New work starts from the token set, which is the part we care about most; a component count without that discipline would just have been a larger drawer of one-offs.

The retainer continues. The system is in use, and the requests that come in now are about extending it, not about founding it again.
