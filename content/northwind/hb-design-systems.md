---
title: Handbook: how we build design systems
updated: 2025-12-15
status: current
---

# Handbook: how we build design systems

Michiel Dembitski keeps this page. If you are about to start a library for a client, read it before you open Figma. The order matters more than the taste.

## tokens first

We work tokens first. Colour, type, and space are decided and named before anyone draws a button. A component that hard-codes a hex, a font size, or a gap is not done, even if it looks finished in the frame.

Colour tokens describe a role, not a pigment. "The blue we liked in the workshop" is not a name. Background, text, border, and the status colours are. Set the pairs so body text and its background can meet WCAG 2.2 AA, and check the pairs again when a client asks for a brighter brand colour late in the project. Type tokens are the family, the weight, and the sizes we actually use, not a specimen of every cut the foundry sells. Space tokens are the scale we pad and stack with. If a screen needs a one-off gap, the scale is wrong; fix the scale.

Do not export a token you would be embarrassed to see in a pull request comment. Names should still make sense to an engineer who was not in the crit.

## Primitives, then components

Primitives come after the tokens and before the product components. A primitive is the smallest thing we repeat: a text style applied, an icon slot, a focus ring, a hit area. Primitives have no marketing opinion in them.

Components are built out of primitives. A text field is a component. A settings page is not. If you cannot say what the component is without naming the screen it was drawn for, it is still a screen, and it stays on the exploration page until you pull the reusable part out.

We do not ship production code. The library is the design, the documentation, and the token file. When a client asks us to "just component-ise it in React", that work sits with their own developers or with a development partner they contract. Say so early.

## Names and variants

Name from broad to narrow: family, then role, then state. `button` is the component. Size, tone, and state are variants, not separate components called `button-small-danger-hover`. Hover, focus, disabled, empty, and error belong on the component as variants so a reviewer can see them in one place.

Icons stay as their own set. Don't bury a unique icon inside the only component that uses it and then redraw it when the next screen needs the same symbol.

When a client already has names, we map ours to theirs in the documentation rather than renaming their product out from under the engineers. New work uses our names. A translation table is cheaper than a fight.

## Documentation pages

Every library file has documentation pages in Figma, next to the work itself, not in a slide deck that will go stale. Write the page as if the reader is a developer who has never met us. For each component: what it is, when not to use it, the variants, and the tokens it consumes. Link the token, don't paste the value, or the page will lie the next time the colour changes.

Foundations get a page too: colour roles, type scale, space scale, and a short note on focus. Screens that show the components in context are useful; they are not a substitute for the component page.

## What leaves the building

Tokens are exported as JSON in the W3C design tokens format. That is the file we hand over. One export, generated from the tokens, not a spreadsheet someone retyped. The handoff conversation walks through the JSON and the documentation pages together.

If the engagement is a Design System Audit rather than a build, the output is a written review and a prioritised list. Doing the fixes is a different piece of work. Don't let the audit file turn into a silent rebuild.

Questions on a live library: ask Michiel before you invent a second naming scheme to get through Friday.
