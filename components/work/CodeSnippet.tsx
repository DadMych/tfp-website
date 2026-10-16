import type { Snippet } from "@/lib/work-data";

// Minimal tokenizer: comments, strings, keywords. Enough for a short, honest
// snippet. No highlighter dependency, no client JS.
const KEYWORDS = new Set([
  "func", "return", "if", "else", "for", "range", "nil", "err", "var", "const",
  "type", "struct", "defer", "go", "package", "import", "true", "false",
  "function", "await", "async", "let", "throw", "try", "catch", "new", "class",
  "def", "self", "None", "True", "False", "raise", "with", "as", "from",
]);

type Tok = { t: "c" | "s" | "k" | "p"; v: string };

function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    if (rest.startsWith("//") || rest.startsWith("#")) {
      out.push({ t: "c", v: rest });
      break;
    }
    const str = rest.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)/);
    if (str) {
      out.push({ t: "s", v: str[0] });
      i += str[0].length;
      continue;
    }
    const word = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (word) {
      out.push({ t: KEYWORDS.has(word[0]) ? "k" : "p", v: word[0] });
      i += word[0].length;
      continue;
    }
    out.push({ t: "p", v: rest[0] });
    i += 1;
  }
  return out;
}

const COLOR: Record<Tok["t"], string> = {
  c: "text-cream/55 italic",
  s: "text-brutal-yellow",
  k: "text-[#4ade80]",
  p: "text-cream/85",
};

export default function CodeSnippet({ snippet }: { snippet: Snippet }) {
  const lines = snippet.code.replace(/\t/g, "  ").split("\n");
  const gutter = String(lines.length).length;

  return (
    <figure className="border-[3px] border-cream bg-[#0a0a0a]" style={{ boxShadow: "6px 6px 0px 0px #FFE600" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b-[3px] border-cream/15 bg-[#111111]">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/30 flex-shrink-0" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/30 flex-shrink-0" />
        <span className="w-3 h-3 rounded-full bg-[#28C840] border border-black/30 flex-shrink-0" />
        <span className="ml-3 font-mono text-[11px] font-bold tracking-[0.2em] uppercase text-cream/55 truncate">
          {snippet.filename}
        </span>
        <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cream/50">
          {snippet.lang}
        </span>
      </div>

      <pre className="overflow-x-auto p-4 sm:p-5 font-mono text-[12px] sm:text-[13px] leading-[1.65] text-cream/85">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="block whitespace-pre">
              <span className="inline-block w-[2.5em] pr-3 text-right text-cream/60 select-none" aria-hidden="true">
                {String(i + 1).padStart(gutter, " ")}
              </span>
              {tokenize(line).map((tok, j) => (
                <span key={j} className={COLOR[tok.t]}>
                  {tok.v}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>

      <figcaption className="border-t-[3px] border-cream/15 px-4 py-3 font-mono text-xs text-cream/55 leading-relaxed">
        {snippet.caption}
      </figcaption>
    </figure>
  );
}
