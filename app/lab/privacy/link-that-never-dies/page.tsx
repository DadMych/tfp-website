import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PrivShell from "@/components/lab/privacy/PrivShell";
import LinkDemo from "@/components/lab/privacy/LinkDemo";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { STEPS, TTL_MINUTES } from "@/lib/privacy/link-steps";
import { linkRuns } from "@/lib/privacy/runs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/privacy/link-that-never-dies",
  "The Link That Never Dies — Privacy Lab",
  "The freelancer's project is over and their access is gone, but an old Harbor link still opens the PDF. One link is public and forever. The other lasts 10 minutes, works for one person, and dies when access is revoked."
);

const bad = {
  lang: "ts",
  filename: "careless · the address is the key",
  caption: "The link names the file, and the handler serves whatever the link names. Nothing about who is asking, or when, or whether they still should.",
  code: `const link = \`https://harbor…/f/\${project}/\${encodeURIComponent(file.name)}\`;

// GET /f/:project/:name
const file = await sql("SELECT * FROM files WHERE project_id = $1 AND name = $2", [project, name]);
return serve(file);`,
};

const good = {
  lang: "ts",
  filename: "careful · signed, short, checked at the click",
  caption: "The signature covers the file, the person, the expiry and the share. Change any of them and it stops matching. The share is looked up on every click, so revoking works now, not when the link expires.",
  code: `const exp = Math.floor(Date.now() / 1000) + 10 * 60;
const sig = hmac(key, \`\${file}|\${person}|\${exp}|\${grant}\`);
const link = \`https://harbor…/s/\${file}?for=\${person}&exp=\${exp}&g=\${grant}&sig=\${sig}\`;

// GET /s/:file
if (!timingSafeEqual(sig, hmac(key, \`\${file}|\${forWho}|\${exp}|\${grant}\`))) return status(400);
if (Date.now() / 1000 > exp) return status(410);
if (viewer !== forWho) return status(403);
const share = await sql("SELECT revoked_at FROM link_grants WHERE id = $1 AND file_id = $2", [grant, file]);
if (!share || share.revoked_at) return status(403);
return serve(file);`,
};

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";

export default async function Page() {
  const runs = await linkRuns();
  const steps = runs.filter((r) => r.id !== "forged");
  const at = (build: "careless" | "careful", id: string) => steps.find((r) => r.build === build && r.id === id);
  const shouldRefuse = STEPS.filter((s) => s.id !== "open");
  const carelessOpened = shouldRefuse.filter((s) => at("careless", s.id)?.opened).length;
  const carefulRight = steps.filter((r) => r.build === "careful" && r.right).length;
  const forged = runs.find((r) => r.id === "forged");
  const [forgedOpened, forgedTried] = (forged?.reason ?? "0/0").split("/").map(Number);
  const code = (build: "careless" | "careful", id: string) => at(build, id)?.reason ?? "?";

  return (
    <PrivShell slug="link-that-never-dies">
      <Section
        n="01"
        tone="tile"
        title="Send the link around"
        plainTitle="Try it"
        lede={`Vlas shared the Website Sprint proposal with the freelancer on Verdant Energy's project. Harbor made two links: the plain one, and a signed one that lasts ${TTL_MINUTES} minutes. Open them, forward them, wait, remove access, edit them.`}
        plainLede={`Vlas sent the freelancer a link to a project file. There are two kinds: a plain one, and one that lasts ${TTL_MINUTES} minutes and only works for them. See what happens to each as the project goes on and ends.`}
      >
        <LinkDemo />
      </Section>

      <Section
        n="02"
        title="Five things, both links"
        plainTitle="What happened every time"
        lede={`Each step ran on a fresh share. The number is what Harbor answered: 200 opened, 400 the link was changed, 403 not for you or not any more, 410 expired. After that, ${forgedTried.toLocaleString("en-GB")} forged versions of a valid signed link.`}
        plainLede="Each thing was tried on a fresh pair of links. Yellow means the file opened."
      >
        {runs.length > 0 ? (
          <div className="border-[3px] border-brutal-black bg-white overflow-x-auto">
            <div className="min-w-[34rem]">
              <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 px-4 min-h-12 py-2 items-center border-b-[3px] border-brutal-black bg-cream">
                <span className={label}>
                  <T tech="Step" plain="What happened" />
                </span>
                <span className={label}>
                  <T tech="Plain" plain="Plain link" />
                </span>
                <span className={label}>
                  <T tech="Signed" plain="Signed link" />
                </span>
              </div>
              {STEPS.map((s, i) => (
                <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 px-4 py-2 items-center border-b-2 border-brutal-black/15">
                  <span className="font-display text-[14px] leading-snug">
                    {i + 1}. <T tech={s.tech} plain={s.plain} />
                    {s.id === "later" && <span className="font-mono text-[11px] opacity-60"> · simulated clock</span>}
                  </span>
                  {(["careless", "careful"] as const).map((b) => (
                    <span key={b} title={at(b, s.id)?.why} className="justify-self-start font-mono text-[12px] font-bold px-2 py-0.5 border-2 border-brutal-black" style={{ background: at(b, s.id)?.opened ? "#FFE600" : "#fff" }}>
                      {code(b, s.id)}
                    </span>
                  ))}
                </div>
              ))}
              {forged && (
                <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 px-4 py-2 items-center">
                  <span className="font-display text-[14px] leading-snug">
                    <T tech="Forged signatures and edited fields" plain="Made-up links" />
                  </span>
                  <span className="font-mono text-[11px] opacity-50">—</span>
                  <span className="font-mono text-[12px] font-bold">
                    {forgedOpened} / {forgedTried.toLocaleString("en-GB")} <T tech="opened" plain="opened" />
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="font-display text-lg">The experiment hasn&apos;t been run on this database yet.</p>
        )}
      </Section>

      {runs.length > 0 && (
        <Section n="03" title="What it showed" plainTitle="What actually happened">
          <Points
            items={[
              {
                title: `The plain link opened ${carelessOpened} of ${shouldRefuse.length} times it shouldn't have`,
                plainTitle: `The plain link never said no`,
                body: `Forwarded, ${TTL_MINUTES + 1} minutes later, after access was removed, and edited to point at another file in the project: it opened every time. Removing the freelancer from Harbor changed nothing, because the link never asks who is clicking. The edit opened Accessibility fixes.xlsx, a file nobody shared with them.`,
                plainBody: "Forwarded, later, after the project ended, even changed to point at a different file: it opened every time. Taking away the freelancer's access did nothing to it.",
              },
              {
                title: `Forwarded: ${code("careful", "forward")}`,
                plainTitle: "Forwarding doesn't help",
                body: "The signed link names the person it was made for, and the signature covers that name. A friend who gets it is asked to sign in as the freelancer.",
                plainBody: "The signed link knows who it's for. Anyone else gets turned away.",
              },
              {
                title: `Gone after ${TTL_MINUTES} minutes: ${code("careful", "later")}`,
                plainTitle: `Gone after ${TTL_MINUTES} minutes`,
                body: "Long enough to click it, short enough that a copy in a chat, an inbox or a browser history is worth nothing by tomorrow. Need it again? Harbor makes a new one, and checks you still have access when it does.",
                plainBody: "Long enough to open it, too short for an old copy to be any use. Need it again? Ask for a new one.",
              },
              {
                title: `Access removed, link dead: ${code("careful", "revoked")}`,
                plainTitle: "Removing access works straight away",
                body: `This link was brand new, well inside its ${TTL_MINUTES} minutes and correctly signed. The expiry wouldn't have stopped it. What stopped it is the lookup at the click: the share it was made from was revoked.`,
                plainBody: "This link was brand new and would have worked for another ten minutes. It stopped because Harbor checks, at every click, whether the access still exists.",
              },
              {
                title: `Edited: ${code("careful", "edited")}, forged: ${forgedOpened} of ${forgedTried.toLocaleString("en-GB")}`,
                plainTitle: "It can't be changed",
                body: `Changing the file, the person, the expiry or the share number breaks the signature, and without the key a new one can't be made. ${forgedTried.toLocaleString("en-GB")} forged versions of a valid link, half with random signatures, half with one field changed: ${forgedOpened} opened. Signed build overall: ${carefulRight} of ${steps.filter((r) => r.build === "careful").length} steps answered right.`,
                plainBody: `Change one character and it stops working. We made up ${forgedTried.toLocaleString("en-GB")} fake versions; ${forgedOpened} opened.`,
              },
            ]}
          />
        </Section>
      )}

      <Section n="04" title="The code" lede="A path anyone can type, against a signed, short link checked at the click." plainLede="What the two approaches do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The plain link is just the file's address, so whoever has it gets the file. The signed one carries who it's for and when it ends, sealed with a key only Harbor has, and Harbor checks the access still exists every time it's clicked.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Public, forever" note="The path is the permission." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Signed, short, revocable" note="Who, until when, still shared." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Isn't a long random URL enough?" plain="What if the link is just very hard to guess?" />}>
            <p>
              <T
                tech="Unguessable isn't private. Links get forwarded, pasted into tickets, kept in browser history and chat logs, and opened by email scanners. A random URL still works for whoever has it, for as long as the file exists, and removing someone's access doesn't touch it."
                plain="Hard to guess isn't the same as private. Links get forwarded, saved and pasted around. A random link still works for anyone who has it, forever."
              />
            </p>
          </Deep>
          <Deep q={<T tech="The link is signed. Why check the database too?" plain="Why check every click?" />}>
            <p>
              <T
                tech={`The signature proves Harbor made the link; it can't know what happened since. Without the lookup, revoking takes effect when the link expires, up to ${TTL_MINUTES} minutes later. The price is one small query per click. Storage services' signed URLs (S3 presigned URLs, for example) have no per-link lookup, so one link can't be revoked on its own and the expiry is the real off switch: keep it short.`}
                plain={`The seal proves the link is real, not that access still stands. Checking every click is what makes removing access work straight away instead of up to ${TTL_MINUTES} minutes later.`}
              />
            </p>
          </Deep>
          <Deep q={<T tech="What about the copy they already downloaded?" plain="What about files they already saved?" />}>
            <p>
              <T
                tech="Nothing on Harbor's side reaches it. A link controls who can fetch the file from now on, not what's on someone's laptop. That's why Sofie's deletion confirmation in Chapter 3 says what isn't deleted: copies people downloaded. Contracts and offboarding cover the rest."
                plain="Nothing can reach a file once it's on someone's laptop. That's why Sofie's deletion email in Chapter 3 says downloaded copies stay. Contracts cover the rest."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why does “for the freelancer” mean anything?" plain="How does the link know who's clicking?" />}>
            <p>
              <T
                tech="In Harbor it means the signed-in user. Here the demo stands in for that by saying which person clicks, freelancer or friend; there's no login in the lab. The check itself is the same: the name in the link must be the person asking."
                plain="In the real portal it's whoever is logged in. The lab has no logins, so the demo just says who is clicking. The check is the same."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How is it graded?" plain="Who checks the result?" />}>
            <p>
              <T
                tech={`Code, not a model, so the same input gives the same answer every time. Each step ran once on a fresh share. The ${TTL_MINUTES + 1}-minute wait is simulated by passing a later time to the same check. The forgeries are ${forgedTried.toLocaleString("en-GB")} copies of a valid link with a random signature or one field changed (person, expiry or share number).`}
                plain={`Plain code checks the links, not an AI, so the result is the same every time. The wait in step 3 is pretend: we told the check the clock was ${TTL_MINUTES + 1} minutes later.`}
              />
            </p>
          </Deep>
        </div>
      </Section>
    </PrivShell>
  );
}
