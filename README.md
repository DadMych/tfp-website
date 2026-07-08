# tfpdev website

Marketing site for [tfpdev](https://tfpdev.com) — fractional CTO and MVP development for startups.

**Live:** [https://tfpdev.com](https://tfpdev.com)

## Overview

Single-page marketing site with a few standalone routes: services, portfolio, insights, a lead quiz, and a free CTO hiring checklist. Content is data-driven so copy can be updated without touching UI components.

Built with Next.js App Router, TypeScript, Tailwind CSS v4, and Framer Motion.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, services, projects, tech stack, about |
| `/start` | Interactive quiz → project brief + Calendly |
| `/free` | Free checklist: 10 questions before hiring a fractional CTO |
| `/insights` | Articles, explainers, and lessons |

SEO extras: dynamic Open Graph image, sitemap, robots.txt, JSON-LD structured data.

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4, Framer Motion, Lucide icons
- **Fonts:** Space Grotesk, JetBrains Mono (Google Fonts)
- **Integrations:** Calendly widget (booking)

## Project structure

```
app/                  # Routes, layouts, global styles, metadata
components/           # Page sections and UI primitives
  ui/                 # Button, Badge, Sticker, etc.
lib/
  data.ts             # Main site copy — services, projects, stats, config
  insights-data.ts    # Insights page content
public/               # Static assets
```

## Editing content

Most text lives in two files:

- **`lib/data.ts`** — site config (email, Calendly, availability), services, projects, about, footer, and home page sections
- **`lib/insights-data.ts`** — insights, categories, explainers, lessons

Global SEO and structured data are in **`app/layout.tsx`**. Page-specific metadata is in each route's `layout.tsx` or `page.tsx`.

## Development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

## Deployment

The site is deployed to **Vercel** and served at [tfpdev.com](https://tfpdev.com).

```bash
npm run build
```

`next.config.ts` has optional static export (`output: "export"`) commented out — enabling it disables dynamic routes like `/icon`.

## License

Private repository. All rights reserved.
