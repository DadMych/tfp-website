// ─────────────────────────────────────────────────────────────────────────────
// AI Lab — article registry. One entry per /lab/ai/<slug>.
// Same shape and rules as lib/money-lab.ts: drafts are not listed and 404,
// unless LAB_SHOW_DRAFTS=1 locally.
// ─────────────────────────────────────────────────────────────────────────────

import { showDrafts } from "./lab-config";
import type { MoneyModule } from "./money-lab";

export type AiArticle = MoneyModule;

export const aiArticles: AiArticle[] = [
  {
    slug: "chunking",
    kicker: "Part 1 · Chunking",
    title: "Where to Cut",
    proves:
      "Before a bot can find anything, every file is cut into pieces. Cut every 400 characters and a price table loses its heading: the model gets \u201c\u20ac5,200 a month\u201d and no way to tell it's the 2025 list. Cut by section and every piece keeps its file's name, date and status.",
    plain:
      "Before an AI can look anything up, every file gets cut into small pieces. Cut them evenly and a price gets separated from its label. Cut them by section and each piece keeps its name and date.",
    counters: [],
    color: "#C6FF3D",
    status: "live",
  },
  {
    slug: "retrieval",
    kicker: "Part 1 · Retrieval",
    title: "Words or Meaning",
    proves:
      "Keyword search finds NW-SPR-B and misses \u201ctake a break for the summer\u201d. Vector search does the reverse, and reads German. Swap the parts of the pipeline and ask again: same model, same prompt, different pages, different answers.",
    plain:
      "Searching by matching words finds exact codes but misses the same idea said differently. Searching by meaning catches that, even in another language. Switch between them and see the answers change.",
    counters: [],
    color: "#FFE600",
    status: "live",
  },
  {
    slug: "old-versions",
    kicker: "Part 1 · Versions",
    title: "Old Versions",
    proves:
      "Three prices for one plan, all in the drive. I took away the warnings, the labels, the prompt rule and the dates, one at a time. The flag barely mattered, hiding the archive broke history questions, and the date did the work.",
    plain:
      "The old prices are all still in the files. I removed the safety nets one by one to see which one actually keeps the AI on today's price. It wasn't the one you'd guess.",
    counters: [],
    color: "#FF8A3D",
    status: "live",
  },
  {
    slug: "cite-or-decline",
    kicker: "Part 1 · Citations",
    title: "Cite or Decline",
    proves:
      "Every number in an answer, checked by code against the source it cites. An audit of the stored test answers, the three ways citations go wrong, and what six builds said when the files had no answer.",
    plain:
      "The AI says which file each fact came from. The page checks every number against that file, live. And when the files don't say, the right answer is \u201cI don't know\u201d.",
    counters: [],
    color: "#4ECDC4",
    status: "live",
  },
  {
    slug: "test-set",
    kicker: "Part 1 · Evals",
    title: "Prove It",
    proves:
      "65 questions with an answer key, from exact product codes to questions the files can't answer. Six pipelines on the same model and prompt, from about three in four right to nearly all of them. Every answer on this page is a stored run, graded by code.",
    plain:
      "Trying a few questions by hand proves nothing. 65 questions with known answers, run through six versions of the bot, checked automatically. Every answer here is real.",
    counters: [],
    color: "#B79CFF",
    status: "live",
  },
  {
    slug: "poisoned-files",
    kicker: "Part 1 · Injection",
    title: "Poisoned Files",
    proves:
      "Six planted files, five defences added one at a time, every answer stored. The model shrugged off the orders by itself. It passed on fake bank details every time until code stepped in, and a believable wrong price beat everything except knowing who wrote the file.",
    plain:
      "Someone slips a file into the drive that tells the AI to lie. Usually it doesn't listen. But fake bank details and a fake new price got through every time, until the right safeguards went on. A warning in the prompt did nothing.",
    counters: [],
    color: "#FF5CAA",
    status: "live",
  },
  {
    slug: "pulling-data-out",
    kicker: "Part 1 · Extraction",
    title: "Pulling Data Out",
    proves:
      "18 client email threads into CRM records, three ways, every field graded against a hand-written key. Plain JSON was already good, a strict schema made it worse, and asking for a quote per field fixed that without catching a single misfiled value.",
    plain:
      "Turning emails into customer records. Simply asking worked well. A strict fill-in form made the AI worse. Asking it to show its proof fixed that, but proof can't tell when a real number lands in the wrong box.",
    counters: [],
    color: "#4ECDC4",
    status: "live",
  },
  {
    slug: "agents-that-act",
    kicker: "Part 1 · Actions",
    title: "Agents That Act",
    proves:
      "An agent with a CRM and an outbox, four everyday tasks, ten runs each. Without guards it broke 23 times in 40: cut-off emails, a duplicate after a timeout that wasn't, a signed client deleted because the task said so. With guards, 0 times, and it asked a person to approve 45 writes.",
    plain:
      "An AI that can send emails and edit the client list. Without safety checks it went wrong 23 times out of 40, including deleting a client who had signed. With checks it never went wrong, but a person had to approve 45 actions.",
    counters: [],
    color: "#FFD23F",
    status: "live",
  },
  {
    slug: "cost-and-speed",
    kicker: "Part 1 · Cost",
    title: "Cost and Speed",
    proves:
      "One RAG answer timed and priced stage by stage, 65 questions three times through six setups. Two thirds of the bill was the reranker, not the model; a shorter rerank list cut cost by 38% at the same accuracy. Shorter prompts saved money, not time. Prompt caching cut an agent's per-turn prompt cost.",
    plain:
      "Where the time and money of one AI answer go. Most of the money went to a helper service, not the AI itself, and one small change cut the bill by a third without more wrong answers.",
    counters: [],
    color: "#B8A4FF",
    status: "live",
  },
];

export const liveArticles = aiArticles.filter((a) => a.status === "live" || showDrafts);

/** The Northwind drive the bot reads. */
export const aiCorpus = { files: 140, languages: 4 } as const;

/** Sandbox limits shown on pages and enforced in the routes. */
export const aiLimits = {
  runsPerHour: 30,
  dailyCapUsd: 5,
  maxSteps: 12,
} as const;
