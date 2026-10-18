import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PrivShell from "@/components/lab/privacy/PrivShell";
import HarborDemo from "@/components/lab/privacy/HarborDemo";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { sql } from "@/lib/db";
import { CLIENTS, type ClientId } from "@/lib/privacy/access";
import { sweep } from "@/lib/privacy/harbor";
import { PERSONAS } from "@/lib/privacy/questions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/privacy/someone-elses-files",
  "Someone Else's Files — Privacy Lab",
  "Change the project number in the address and another client's files open. Three portals on a real Postgres database: logged-in only, row-level security with the owner's key, and two locks that each hold."
);

const bad = {
  lang: "ts",
  filename: "row security on, owner's key",
  caption: "The policy is right and the client is set on every request. The app's database role has BYPASSRLS, so Postgres never applies the policy.",
  code: `-- migration
ALTER TABLE harbor.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_files ON harbor.files
  USING (client = current_setting('harbor.client', true));

// GET /projects/:id/files
await q("SELECT set_config('harbor.client', $1, true)", [user.client]);
return q("SELECT * FROM harbor.files WHERE project_id = $1", [id]);
// connected as the app's role: rolbypassrls = true`,
};

const good = {
  lang: "ts",
  filename: "two locks",
  caption: "The app checks the project is yours. Then the query runs as a role the policy applies to, so a forgotten check on some new page still gets nothing.",
  code: `const [p] = await sql("SELECT client FROM harbor.projects WHERE id = $1", [id]);
if (p?.client !== user.client) return notFound();   // lock 1: the app

return withTx(async (q) => {
  await q("SET LOCAL ROLE harbor_client");          // lock 2: no BYPASSRLS
  await q("SELECT set_config('harbor.client', $1, true)", [user.client]);
  return q("SELECT * FROM harbor.files WHERE project_id = $1", [id]);
});`,
};

const VIEWER: ClientId = "brightlane";

export default async function Page() {
  const [rows, homes, [who]] = await Promise.all([
    sweep(VIEWER),
    sql<{ id: number; client: string }>("SELECT id, client FROM harbor.projects WHERE client = ANY($1)", [PERSONAS]),
    sql<{ role: string }>("SELECT current_user AS role"),
  ]);
  const home = Object.fromEntries(homes.map((h) => [h.client, h.id]));
  const others = rows.filter((r) => r.client !== VIEWER);
  const sum = (k: "careless" | "ownerKey" | "dbOnly") => others.reduce((s, r) => s + r[k], 0);
  const withFiles = others.filter((r) => r.careless > 0).length;
  const notFound = others.filter((r) => r.carefulStatus === 404).length;
  const name = (id: string) => CLIENTS[id as ClientId] ?? id;
  const cell = (n: number, open: boolean) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-3 border-2 border-brutal-black" style={{ background: open ? "#FF5CAA" : "#C6FF3D" }} />
      {n}
    </span>
  );

  return (
    <PrivShell slug="someone-elses-files">
      <Section
        n="01"
        tone="tile"
        title="Change one number"
        plainTitle="Try it"
        lede="You're logged in to Harbor, the client portal. Your project's files sit at an address with a number in it. Open your project, then change the number by one. The same address goes to three portals on the same database."
        plainLede="You're logged in to the client portal. Your files have a project number in the address. Open yours, then change the number by one and see what three versions of the portal show you."
      >
        <HarborDemo home={home} />
      </Section>

      <Section
        n="02"
        title="Every project, as Brightlane"
        plainTitle="Every project number, tried"
        lede="All ten project numbers opened as Brightlane by each portal. These queries ran when this page loaded. Brightlane's own is 1042."
        plainLede="Brightlane tries every project number in each portal. Pink means it got files that aren't Brightlane's. These lookups ran when you opened this page."
      >
        <div className="border-[3px] border-brutal-black bg-white overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead className="bg-cream border-b-[3px] border-brutal-black">
              <tr className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
                <th className="px-4 h-10">Project</th>
                <th className="px-4">
                  <T tech="Logged in only" plain="Only checks login" />
                </th>
                <th className="px-4">
                  <T tech="Row security, owner's key" plain="Rule on, master key" />
                </th>
                <th className="px-4">
                  <T tech="Careful: app check" plain="Careful: first check" />
                </th>
                <th className="px-4">
                  <T tech="Careful: database alone" plain="Careful: database alone" />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const mine = r.client === VIEWER;
                return (
                  <tr key={r.id} className={`border-b border-brutal-black/10 last:border-b-0 ${mine ? "bg-brutal-yellow/40" : ""}`}>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[12px] font-bold mr-2">{r.id}</span>
                      <span className="font-display text-[14px]">{name(r.client)}</span>
                      <span className="font-mono text-[10.5px] opacity-60 ml-2 hidden sm:inline">{r.name}</span>
                    </td>
                    <td className="px-4 font-mono text-[12px]">{cell(r.careless, !mine && r.careless > 0)} files</td>
                    <td className="px-4 font-mono text-[12px]">{cell(r.ownerKey, !mine && r.ownerKey > 0)} files</td>
                    <td className="px-4 font-mono text-[12px] font-bold">{r.carefulStatus === 200 ? "200" : "404"}</td>
                    <td className="px-4 font-mono text-[12px]">{cell(r.dbOnly, !mine && r.dbOnly > 0)} rows</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section n="03" title="What it showed" plainTitle="What actually happened">
        <Points
          items={[
            {
              title: "Logged in isn't allowed",
              plainTitle: "Logged in doesn't mean allowed",
              body: `As Brightlane, the first portal opens all ${others.length} other projects and shows ${sum("careless")} files from ${withFiles} other clients, Tidepool's onboarding flow and proposal included. Nothing was hacked. The address had a number in it, and the number changed.`,
              plainBody: `Logged in as Brightlane, the first portal shows ${sum("careless")} files from ${withFiles} other clients, including a confidential one. Nobody broke in. They changed a number in the address.`,
            },
            {
              title: "The rule was there. The key skipped it.",
              plainTitle: "The rule existed and did nothing",
              body: `The second portal has row-level security on, a policy that says “only your client's rows”, and sets the client on every request. It still returned ${sum("ownerKey")} files. It connects as ${who.role}, the role the app was given, and that role has BYPASSRLS. Supabase's service-role key does the same.`,
              plainBody: `The second portal has the database rule switched on. It still showed ${sum("ownerKey")} files, because it talks to the database with a master key that ignores the rule. Lots of real apps do exactly this.`,
            },
            {
              title: "Two locks, either one holds",
              plainTitle: "Two checks, each one enough",
              body: `The careful portal checks the project is yours and answers 404 for ${notFound} of ${others.length}. With that check skipped, the database alone returned ${sum("dbOnly")} rows: the query runs as harbor_client, a role the policy applies to. Forget the check on one new page and the database still says no.`,
              plainBody: `The careful portal checks the project is yours: ${notFound} of ${others.length} other projects get “not found”. Skip that check and the database on its own returns ${sum("dbOnly")} files, because it's asked as Brightlane, not with a master key.`,
            },
            {
              title: "404, not 403",
              plainTitle: "“Not found”, not “forbidden”",
              body: "“Forbidden” tells a stranger the project exists. Not yours and doesn't exist get the same answer here, so counting through numbers learns nothing. Halden's project, emptied on request, looks no different from a number nobody uses.",
              plainBody: "“Forbidden” would tell a stranger the project exists. The careful portal says “not found” either way, so trying numbers teaches you nothing.",
            },
          ]}
        />
      </Section>

      <Section n="04" title="The code" lede="Row security with the owner's key, against two locks." plainLede="What the two approaches do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The careless setup writes the database rule but connects with a master key that ignores it. The careful one checks in the app and asks the database as the client, so either check alone is enough.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Looked safe" note="The policy exists. Nothing applies it." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Held" note="Check in the app, ask the database as the client." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="I've shipped the owner's-key version" plain="Has this happened for real?" />}>
            <p>
              <T
                tech="On a ticketing platform I rescued, the policies were written in a migration and the Go server connected with Supabase's service role, so they applied to nothing. What kept venues apart was code: the venue is in every path, middleware checks the user belongs to it, and nested things are checked against it, so a show from another venue is a 404. Switching roles per request wasn't worth it for a handful of venues. The weak spot is that a new route has to remember the check, so a path convention and a middleware make forgetting harder."
                plain="Yes. On a ticketing platform I took over, the database rules existed but the server used a master key, so they did nothing. What actually kept customers apart was checks in the code on every request. The risk with that: someone adding a new page has to remember the check, so I made it hard to forget."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What about Supabase?" plain="Does this apply to Supabase?" />}>
            <p>
              <T
                tech="With the anon key and the user's token, Supabase applies your policies. The service-role key bypasses them, and it's the key most server code reaches for because everything just works. If your server holds it, either check access in code on every request or pass the user's token through so the policies apply."
                plain="Yes. Supabase gives you a normal key that follows the rules and a master key that skips them. Server code often uses the master key because it's easier. Then the rules only work if the code checks access too."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why not FORCE ROW LEVEL SECURITY?" plain="Isn't there a switch that makes the rule apply to everyone?" />}>
            <p>
              <T
                tech="FORCE makes the table's owner obey its policies. It does nothing for a role with BYPASSRLS, and the app's role here has it. So the fix is a role without it, switched to per request with SET LOCAL ROLE inside a transaction. LOCAL matters with a connection pool: it ends with the transaction, so the next request on that connection doesn't inherit someone else's client."
                plain="There is, but it doesn't touch a master key. The fix is to ask the database as a normal client for each request, and make sure that setting ends when the request does, so the next visitor doesn't inherit it."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Isn't the guessable number the bug?" plain="Wouldn't random numbers fix it?" />}>
            <p>
              <T
                tech="Random IDs make guessing harder. They don't make a link private: links get forwarded, logged and pasted into tickets. The check is the fix. Random IDs are a nice extra, and Chapter 6 is about links that outlive the access behind them."
                plain="They make guessing harder, but links get forwarded and copied. Only the check actually protects the files. Chapter 6 is about old links that keep working."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </PrivShell>
  );
}
