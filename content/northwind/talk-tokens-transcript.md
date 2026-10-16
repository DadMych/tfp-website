---
title: Talk transcript: Michiel at Design Systems Meetup Rotterdam
updated: 2026-04-23
status: current
---

# Talk transcript: Michiel at Design Systems Meetup Rotterdam

Design Systems Meetup Rotterdam, 23 April 2026. A 20-minute talk. Audience questions were kept. Filler is as spoken.

[00:00] Host: Hi, uh, thanks for coming. We'll take questions at the end, but if you get lost, wave. Next is Michiel Dembitski. He's the design systems lead at Northwind Studio, which is here in Rotterdam, Lloydkwartier, so some of you have probably shared a tram with him. He's talking about tokens, the W3C format, and a system they built this year. Michiel, the floor is yours.

[00:48] Michiel Dembitski: Thanks. Hi. Um. I'll try not to open with a definition, and I'm going to open with a definition anyway. A token is the decision, written down, in a form an engineer can take without me on the call. If it only lives in a Figma style that nobody exports, it isn't a token. It's a swatch with a good memory.

[01:40] Michiel Dembitski: So, who we are, quickly, because it changes the point. Northwind designs for software companies. Brand, web, product, design systems. We don't write production code. That's not a gap we're about to fill. It means the handoff has to stand up without us in the repo. The thing that stands up is JSON, in the W3C design tokens format.

[02:30] Host: Sorry, the, uh, the slide clicker is yours, not mine. I just advanced you.

[02:36] Michiel Dembitski: Oh. Yeah, no, that was, give it here. Thanks. I didn't have a slide there anyway. Ok.

[03:10] Michiel Dembitski: Order of work. Tokens first. Colour, type, space. Then primitives. Then components. If you draw the component first you will type a hex into it, and then you will type a slightly different hex into its hover, and then you will have two blues and a story about why both are official.

[04:20] Michiel Dembitski: Colour, type, space. I say it in that order on purpose. Colour is what everyone wants to debate. Type is what everyone thinks is already decided because someone bought a font. Space is what actually makes the system feel like one product, and it's the one people leave as magic numbers on the frame. A space token is a step on a scale. A raw pixel someone nudged at the end of the day is a bug I will make them fix. I have become boring about this. I'm fine with it.

[05:40] Michiel Dembitski: Primitives next. A primitive is not a product pattern yet. It's the button shape, the focus ring, the stack, the thing you don't want twelve versions of. Components come after, and they compose primitives. Variants are for state. Disabled is not a new component. Empty is not a new component. If your library grows because someone duplicated a card and hid a slot, you don't have a system, you have a folder.

[07:05] Audience member: Do you, sorry, do you version the JSON or is Figma the version?

[07:12] Michiel Dembitski: Hold that, I will answer it, I just don't want to answer it in the middle of the colour thought. Um. Where was I. Right.

[07:40] Michiel Dembitski: We design to WCAG 2.2 AA. So a colour token that looks like the brand and fails contrast is the wrong token. We change the token. We don't patch the one screen where QA happened to look. Focus has to be visible. I mention it because people encode focus as "make it a bit lighter" and call that a token. It isn't. Not if you can't see it.

[09:00] Michiel Dembitski: The work I want to talk about is Kestrel Analytics. Analytics product, they've been with us since the start of this year. The system we built with them, as it stands, is 140 components.

[09:28] Audience member: Is that including icons?

[09:32] Michiel Dembitski: No. Don't, um, don't let me pad it. Icons are assets. 140 components means components. Charts, inputs, empty states, the dull ones. Tomás Pereira is the other senior designer on that work. If I sound like I drew every chart, I didn't. I lead the system. He will correct me in the office tomorrow if I get that wrong, so I'm getting it right now.

[10:40] Michiel Dembitski: How we keep 140 components from becoming junk. Naming has to say what the thing is for, not what it looks like this month. A name that is just the colour will lie the week the colour changes. Documentation sits in the Figma file, on pages next to the components, not in a wiki we all mean to update. And the names in Figma match the names in the JSON. If they don't, the developer will guess. They should guess. We were the sloppy ones.

[12:15] Michiel Dembitski: Ok, your version question. Figma is where we edit. The JSON is what we hand over, in the W3C design tokens format. When a token changes, the next handoff carries the new file. We don't mail a screenshot of a palette. There is one handoff call per deliverable, and developer questions are free for 14 days after that. I'm not going to recite a contract at you. The point is: the file is the source. The call is there so nobody has to invent a second source in a chat thread.

[14:10] Michiel Dembitski: What we refuse to do, and this is the part that saves the 140 components from being fiction. We don't draw a whole library in a vacuum and then go looking for a product to put it on. Kestrel is that size because the product is that size. A new system starts with tokens, colour type space, and a small set of primitives. You earn the next component by needing it twice. Once is a special. Twice is a pattern.

[15:50] Audience member: So you never start with, like, a big UI kit?

[16:00] Michiel Dembitski: We start with tokens. If someone sends us a kit and asks for a skin, that's a different conversation, and it's usually a sign the names are lying. Um. I have skinned a kit. It feels fast for a week. Then every screen is a special case and you don't have 140 components, you have 140 exceptions wearing the same colour.

[17:20] Host: We've got a few minutes. Questions. Yes, back row.

[17:30] Audience member: You said you don't write production code. Who actually builds this?

[17:40] Michiel Dembitski: The client's developers, or a studio the client hires themselves. We hand off Figma and the W3C JSON. We don't ship their application. If you came for a React library, uh, there isn't one. That's the shape of the studio, not a temporary gap.

[18:20] Audience member: And would you publish the Kestrel tokens?

[18:28] Michiel Dembitski: No. It's their product. I'm describing the shape of the work. I'm not handing out the file. Please don't ask me for it at the drinks, I will keep saying no, and then we'll both be awkward.

[19:05] Audience member: Last thing. The 140 components, how do you stop people adding a new one every sprint?

[19:15] Michiel Dembitski: A new component needs a reason that isn't "this screen is different". Different is usually a variant or a composition. We write the reason on the documentation page. If you can't write it, it isn't a component yet. It's a frame. Frames are allowed. They just don't get a name and a JSON entry and a permanent seat.

[19:50] Host: We should stop there. Michiel Dembitski, from Northwind. Thank you.

[19:58] Michiel Dembitski: Thanks. Um. Yeah. Thanks for staying till the end.
