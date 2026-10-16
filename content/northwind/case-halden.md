---
title: Case study: Halden Health
updated: 2026-05-15
status: current
---

# Case study: Halden Health

Written for internal use. Halden Health has a confidentiality clause, so this page carries no screens and does not go on the public portfolio. The wording was cleared with them.

## The client

Halden Health builds software for clinics. The product is dense, regulated, and used by people who are already tired when they open it. In 2026 they asked for a Design System Audit, not a new brand and not a rebuild.

Michiel Dembitski led the audit. An audit here is a written review of the library the client already has. It produces a prioritised list. It does not include doing the fixes. Halden knew that when they signed, and they planned to make the changes with their own designers.

## The problem

Halden's Figma file had grown with the product. New flows arrived faster than anyone retired the components they replaced. Two buttons did the same job under different names. Form fields differed by a padding value nobody could justify. Status colour had been extended locally, in the file of whoever needed a "pending" that the core set did not have.

Clinicians do not experience this as a library problem. They experience it as a product that feels slightly different in every corner, and as a team that cannot say which corner is current. Halden's design lead could feel the drift. They could not see its size, and they did not want us to start "tidying" inside a file their engineers were implementing from.

## What we did

Michiel read the library against the product, component by component, and wrote down what he found. We reviewed 210 components. The count is everything that was published as a component in the file they gave us, including variants that had been detached and saved back under a new name.

The clearest finding was duplication. We found 38 duplicates: components that differed in name, or in a value that should have been a variant, and not in purpose. Each pair is listed in the review with a recommendation to keep one, and with a note where the "duplicate" was actually a state the original component was missing. Those are not the same fix, and the list says which is which.

The rest of the review is priority. What blocks a team this month, what will hurt the next squad that copies from the file, and what can wait. Colour contrast against WCAG 2.2 AA is called out where a pair fails, without us redrawing the component. Naming is called out where an engineer could not predict the name from the job. Documentation gaps are called out where a component had no page and the only usage was a screen somewhere in the file.

We did not merge the duplicates. We did not rebuild the primitives. We did not open a retainer inside the audit and start the work because the list was interesting. Halden's own team took the document and did the fixes. Where they wanted a second pair of eyes on a decision, that was a separate conversation, after the audit, and it was scoped as its own request.

## Result

Halden left with a written review, the list of 38 duplicates, and an order of work their team could run. The library is still theirs. The value of the audit was the map, not a second file with our names on the components.

Because of the confidentiality clause we do not show the library, the clinical screens, or the review document outside the account. If a sales conversation needs proof that we do this kind of audit, talk about the shape of the work, not about Halden's product.
