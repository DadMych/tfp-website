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
    status: "draft",
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
    status: "draft",
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
    status: "draft",
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
    status: "draft",
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
    status: "draft",
  },
  {
    slug: "poisoned-files",
    kicker: "Part 2 · Injection",
    title: "Poisoned Files",
    proves:
      "Six planted files, five defences added one at a time, every answer stored. The model shrugged off the orders by itself. It passed on fake bank details every time until code stepped in, and a believable wrong price beat everything except knowing who wrote the file.",
    plain:
      "Someone slips a file into the drive that tells the AI to lie. Usually it doesn't listen. But fake bank details and a fake new price got through every time, until the right safeguards went on. A warning in the prompt did nothing.",
    counters: [],
    color: "#FF5CAA",
    status: "draft",
  },
  {
    slug: "pulling-data-out",
    kicker: "Part 2 · Extraction",
    title: "Pulling Data Out",
    proves:
      "18 client email threads into CRM records, three ways, every field graded against a hand-written key. Plain JSON was already good, a strict schema made it worse, and asking for a quote per field fixed that without catching a single misfiled value.",
    plain:
      "Turning emails into customer records. Simply asking worked well. A strict fill-in form made the AI worse. Asking it to show its proof fixed that, but proof can't tell when a real number lands in the wrong box.",
    counters: [],
    color: "#4ECDC4",
    status: "draft",
  },
  {
    slug: "half-written-calls",
    kicker: "Tool calls",
    title: "Half-Written Calls",
    proves:
      "The model hits its output limit in the middle of writing an email. The careless code runs what arrived: a subject and no body. The guarded code checks why the model stopped and validates every argument before anything runs.",
    plain:
      "The AI runs out of room halfway through writing an email. The careless app sends the half it got: a subject line and nothing else. The careful one notices the AI didn't finish and sends nothing.",
    counters: [],
    color: "#FF5CAA",
    status: "draft",
  },
  {
    slug: "retries",
    kicker: "Tool calls",
    title: "Retries Twice",
    proves:
      "The email went out, then the call timed out. The agent tries again. Without an idempotency key the client gets two emails. With one, the second call does nothing.",
    plain:
      "The email went out, but the confirmation got lost. The AI tries again and the client gets it twice. A receipt number on each send stops the second one.",
    counters: [],
    color: "#C6FF3D",
    status: "draft",
  },
  {
    slug: "approval",
    kicker: "Writes",
    title: "Approval",
    proves:
      "Ask for a 20% discount and an email to the client. The careless agent does both before you finish reading. The guarded one shows you the change and waits for a click.",
    plain:
      "You ask the assistant to give a client a discount and tell them. The careless one just does it. The careful one shows you exactly what will change and waits for your OK.",
    counters: [],
    color: "#FFE600",
    status: "draft",
  },
  {
    slug: "permissions",
    kicker: "Writes",
    title: "Permissions",
    proves:
      "A viewer asks the agent to delete a contact. 'You are read-only' in the prompt is a suggestion. A tool list filtered on the server is a rule.",
    plain:
      "An intern asks the assistant to delete a client. Telling the AI 'this person can't delete' is a polite request. Not giving it a delete button at all is a rule.",
    counters: [],
    color: "#B79CFF",
    status: "draft",
  },
  {
    slug: "prompt-injection",
    kicker: "Untrusted input",
    title: "Prompt Injection",
    proves:
      "A customer note hides one instruction. The careless agent reads it and emails your contact list to a stranger. The guarded agent reads the same note and has nowhere to send it.",
    plain:
      "Someone types one sentence into a customer note. Your AI assistant reads it, takes it as an order and mails your client list to them. The safe version reads the same note and still can't.",
    counters: [],
    color: "#FF8A3D",
    status: "draft",
  },
  {
    slug: "runaway",
    kicker: "Cost",
    title: "Runaway Loop",
    proves:
      "An impossible task. The careless agent keeps searching and the bill keeps ticking. The guarded one has a step limit, a cost cap per run, and notices when it repeats itself.",
    plain:
      "Ask for something that doesn't exist and the AI keeps looking. Every look costs money. The careful version knows when to stop.",
    counters: [],
    color: "#4ECDC4",
    status: "draft",
  },
  {
    slug: "data-leaks",
    kicker: "Isolation",
    title: "Data Leaks",
    proves:
      "Two shops in one database. The careless search tool forgets one WHERE clause and the agent answers with the other shop's prices. The guarded one runs under Postgres row-level security.",
    plain:
      "Two businesses share one database. Ask the careless assistant a question and it answers with the other business's data. The safe one can't see it at all.",
    counters: [],
    color: "#3B5BFF",
    ink: "#FFFDF5",
    status: "draft",
  },
  {
    slug: "evals",
    kicker: "Quality",
    title: "Evals",
    proves:
      "Change one line of the prompt and the agent gets better at one thing and quietly worse at three. A suite of saved scenarios is how you find out before your customers do.",
    plain:
      "Tweak the instructions and the AI improves at one task and gets worse at others, quietly. A saved list of test cases is how you notice first.",
    counters: [],
    color: "#FFE600",
    status: "draft",
  },
  {
    slug: "pick-dont-write",
    kicker: "Output",
    title: "Pick, Don't Write",
    proves:
      "Let the model choose from answers you wrote instead of writing its own. It can still choose the wrong one. It cannot promise something you never offered.",
    plain:
      "Instead of letting the AI write replies, give it answers you wrote and let it choose. It can pick wrong, but it can't make things up.",
    caseSlug: "proptech-crm",
    caseLabel: "Proptech CRM: a GPT responder that chose from prepared answers",
    counters: [],
    color: "#C6FF3D",
    status: "draft",
  },
];

export const liveArticles = aiArticles.filter((a) => a.status === "live" || showDrafts);

/** Sandbox limits shown on pages and enforced in the routes. */
export const aiLimits = {
  runsPerHour: 30,
  dailyCapUsd: 5,
  maxSteps: 12,
} as const;
