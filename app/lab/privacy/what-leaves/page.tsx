import type { Metadata } from "next";
import { labMeta } from "@/lib/lab-og";
import PrivShell from "@/components/lab/privacy/PrivShell";
import RedactDemo from "@/components/lab/privacy/RedactDemo";
import { Deep, ImplHeader, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import CodeSnippet from "@/components/work/CodeSnippet";
import { FIELDS, PATIENTS, TASKS } from "@/lib/privacy/brief";
import { PLACEHOLDER_RULE } from "@/lib/privacy/leaves";
import { redactRuns, type RedactRun } from "@/lib/privacy/runs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = labMeta(
  "/lab/privacy/what-leaves",
  "What Leaves for the AI — Privacy Lab",
  "Halden's brief has test patient records in it, all made up. See exactly what goes to the model: one build sends it all, the other swaps personal details for placeholders and puts them back only for the person reading."
);

const bad = {
  lang: "ts",
  filename: "careless · send the brief",
  caption: "The task needs the email, so the email goes. Everything pasted into it goes too, to the model provider and to any log on the way.",
  code: `const reply = await callModel({
  system: SYSTEM,
  messages: [{ role: "user", content: \`Client email:\\n\\n\${brief}\\n\\nTask: \${task}\` }],
});
return reply.text;`,
};

const good = {
  lang: "ts",
  filename: "careful · swap out, swap back",
  caption: "The map from placeholder to value is made and used on our server and thrown away after the request. The model only ever sees [PATIENT_1].",
  code: `const { parts: [safeBrief, safeTask], swaps } = redact([brief, task]);
// [PATIENT_1] ↔ "Marta Okonkwo-Lindqvist", kept here, never sent

const reply = await callModel({
  system: SYSTEM + PLACEHOLDER_RULE,
  messages: [{ role: "user", content: \`Client email:\\n\\n\${safeBrief}\\n\\nTask: \${safeTask}\` }],
});
return rehydrate(reply.text, swaps); // real values, for the person reading`,
};

const label = "font-mono text-[10px] font-bold uppercase tracking-[0.2em]";
const ALL = PATIENTS.length * FIELDS.length;

function Cells({ runs }: { runs: RedactRun[] }) {
  return (
    <span className="flex gap-1">
      {runs.map((r, i) => (
        <span key={i} title={r.reason} className="size-5 border-2 border-brutal-black" style={{ background: r.clean ? "#C6FF3D" : "#FF5CAA" }} />
      ))}
    </span>
  );
}

/** Of the names a task needs back, how many the reader actually got. */
const namesBack = (rs: RedactRun[]) =>
  rs.reduce(
    (acc, r) => {
      const needs = TASKS.find((t) => t.id === r.id)?.needs ?? [];
      return { got: acc.got + needs.filter((n) => r.answer.includes(PATIENTS[n].name)).length, of: acc.of + needs.length };
    },
    { got: 0, of: 0 }
  );

export default async function Page() {
  const [runs, first] = await Promise.all([redactRuns("v2"), redactRuns("v1")]);
  const of = (build: RedactRun["build"], id?: string, rs = runs) => rs.filter((r) => r.build === build && (!id || r.id === id));
  const [careless, careful] = [of("careless"), of("careful")];
  const sent = (rs: RedactRun[]) => rs.reduce((n, r) => n + r.sent.length, 0);
  const allSent = careless.filter((r) => r.sent.length === ALL).length;
  const back = namesBack(careful);
  const noNames = TASKS.filter((t) => t.needs.length === 0).length;
  const v1List = of("careful", "list", first);
  const v1Refused = v1List.filter((r) => namesBack([r]).got < PATIENTS.length);
  const replies = [...of("careless", "reply"), ...of("careful", "reply")];
  const flagged = replies.filter((r) => /patient data|personal data|real patient|identifiable|privacy|shouldn['’]t send|should not send|don['’]t send|do not send/i.test(r.answer)).length;

  return (
    <PrivShell slug="what-leaves">
      <Section
        n="01"
        tone="tile"
        title="X-ray the prompt"
        plainTitle="Try it"
        lede="Lena at Halden Health sent a brief about the scheduling screens and pasted five rows from their test system into it: names, birth dates, record numbers, reasons for visit. You ask the AI to help with the brief. Both columns show the exact text each build sends to the model, before you press anything."
        plainLede="A client sent an email with patient details pasted in by mistake. You ask the AI to help with it. Both columns show exactly what each version sends to the AI. All the patients are made up."
      >
        <RedactDemo />
      </Section>

      <Section
        n="02"
        title="Four tasks, three runs each"
        plainTitle="What happened every time"
        lede={`Pink: at least one of the ${ALL} real patient details was in the text sent to the model. Green: none were, and every placeholder in the answer was put back. Open a row to read what the reader saw.`}
        plainLede="Pink means patient details were sent to the AI. Green means none were. Click a task to read the answers."
      >
        {runs.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="border-[3px] border-brutal-black bg-white overflow-x-auto">
              <div className="min-w-[34rem]">
                <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] gap-3 px-4 h-12 items-center border-b-[3px] border-brutal-black bg-cream">
                  <span className={label}>
                    <T tech="Task" plain="What the AI was asked" />
                  </span>
                  <span className={label}>Careless</span>
                  <span className={label}>Careful</span>
                </div>
                {TASKS.map((t) => {
                  const [c, s] = [of("careless", t.id), of("careful", t.id)];
                  return (
                    <details key={t.id} className="border-b-2 border-brutal-black/15 last:border-b-0">
                      <summary className="cursor-pointer list-none grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] gap-3 px-4 py-2.5 items-center hover:bg-cream">
                        <span className="font-display text-[15px] leading-snug">{t.q}</span>
                        <Cells runs={c} />
                        <Cells runs={s} />
                      </summary>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 pb-4">
                        {[
                          { name: "Careless", r: c[0], bg: "#FFD1E8" },
                          { name: "Careful", r: s[0], bg: "#EEFFC2" },
                        ].map(
                          ({ name, r, bg }) =>
                            r && (
                              <div key={name} className="border-2 border-brutal-black p-3 flex flex-col gap-1.5" style={{ background: bg }}>
                                <span className={label}>
                                  {name} · {r.reason}
                                </span>
                                <p className="font-display text-[14px] leading-snug whitespace-pre-wrap">{r.answer}</p>
                              </div>
                            )
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
            {v1Refused.length > 0 && (
              <div className="border-[3px] border-brutal-black bg-white p-4 flex flex-col gap-2 max-w-3xl">
                <span className={label}>
                  <T tech="The first careful prompt" plain="My first try" />
                </span>
                <p className="font-display text-[15px] leading-snug">
                  <T
                    tech={`An earlier batch used a different placeholder rule. Asked to list the patients, the careful build refused in ${v1Refused.length} of ${v1List.length} runs, and the swap-back turned its refusal into this:`}
                    plain={`My first version told the AI never to guess what the stand-ins meant. Asked to list the patients, it refused ${v1Refused.length} of ${v1List.length} times, and putting the names back made the refusal read like this:`}
                  />
                </p>
                <blockquote className="border-l-[3px] border-brutal-black pl-3 font-display text-[14px] leading-snug italic">{v1Refused[0].answer}</blockquote>
              </div>
            )}
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
                title: "The careless build sent all of it",
                plainTitle: "Everything went to the AI",
                body: `${allSent} of ${careless.length} careless runs sent all ${ALL} patient details: every name, birth date, record number, phone, email and reason for visit, ${sent(careless)} in total. ${noNames} of the ${TASKS.length} tasks needed none of them. Summarising a brief about status chips doesn't need anyone's diagnosis.`,
                plainBody: `Every time, the careless version sent all ${ALL} patient details to the AI: names, birthdays, phone numbers and why each person was seeing a doctor. ${noNames} of the ${TASKS.length} tasks didn’t need any of it.`,
              },
              {
                title: "The careful build sent none",
                plainTitle: "The careful one sent nothing personal",
                body: `${sent(careful)} details in ${careful.length} careful runs. The check is done on the exact text that went to the model, against the ${ALL} real values, and the check knows them; the redactor doesn't.`,
                plainBody: `Not one patient detail in ${careful.length} tries. I checked the exact text that was sent, word by word.`,
              },
              {
                title: "The reader still got the names",
                plainTitle: "You still get the answer",
                body: `Two tasks need patients by name. In the careful answers the reader got ${back.got} of the ${back.of} names those tasks needed. The model wrote [PATIENT_1]; our server put "${PATIENTS[0].name}" back after the reply came in.`,
                plainBody: `When the task needed names, you still saw them: ${back.got} of ${back.of}. The AI wrote a stand-in, and the real name was put back on our side.`,
              },
              ...(v1Refused.length
                ? [
                    {
                      title: "The first prompt broke the task",
                      plainTitle: "Hiding things can break the answer",
                      body: `With the first placeholder rule the careful build refused to list the patients in ${v1Refused.length} of ${v1List.length} runs: it didn't know the reader would get the real values back. One sentence fixed it. Redaction has to be tested on the job, not just on what leaves.`,
                      plainBody: `My first version made the AI refuse to list the patients ${v1Refused.length} of ${v1List.length} times. One sentence telling it that the reader sees the real names fixed it. You have to check that the answers still work.`,
                    },
                  ]
                : []),
              ...(replies.length && flagged === 0
                ? [
                    {
                      title: "Nobody told Lena",
                      plainTitle: "Neither one said anything",
                      body: `In ${replies.length} drafted replies, neither build told Lena her brief had patient records in it. Redaction controls what leaves; it doesn't notice that something went wrong. Asking Halden to stop sending real-looking patient rows is a person's job.`,
                      plainBody: `When asked to write back to the client, neither version mentioned the patient details, not once in ${replies.length}. Hiding data isn't the same as noticing the problem. A person still has to say something.`,
                    },
                  ]
                : []),
            ]}
          />
        </Section>
      )}

      <Section n="04" title="The code" lede="Send the email, against swap out, send, swap back." plainLede="What the two approaches do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The careless version sends the email as it is. The careful one replaces personal details with stand-ins before sending, and puts the real ones back in the answer on our side.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
            <div className="flex flex-col gap-3">
              <ImplHeader kind="bad" title="Sent" note="Whatever was pasted in goes with it." />
              <CodeSnippet snippet={bad} />
            </div>
            <div className="flex flex-col gap-3">
              <ImplHeader kind="good" title="Swapped" note="Placeholders out, real values back, map stays home." />
              <CodeSnippet snippet={good} />
            </div>
          </div>
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Is this GDPR or HIPAA compliance?" plain="Is this what privacy law asks for?" />}>
            <p>
              <T
                tech="It's the same mechanism GDPR and HIPAA ask for: send the least the job needs. GDPR calls it data minimisation, HIPAA the minimum necessary standard. Swapping in placeholders is pseudonymisation: the map can turn them back, so under GDPR the data is still personal and the map has to be guarded. Doing this doesn't make anyone compliant."
                plain="It's one of the things those laws ask for: don't send more personal data than the job needs. The stand-ins can be turned back into names, so the list that does that has to be protected too. Doing this alone doesn't make anyone compliant."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why not tell the model to ignore personal data?" plain="Why not just tell the AI to ignore it?" />}>
            <p>
              <T
                tech="By the time the model reads the instruction, it has the data, and so has the provider, plus every log, trace and error report on the way. An instruction controls what the model writes, not what it received. Redaction happens before the request leaves."
                plain="Because by the time the AI reads that instruction, it already has the data. Hiding it has to happen before anything is sent."
              />
            </p>
          </Deep>
          <Deep q={<T tech="What would this redactor miss?" plain="Can it miss things?" />}>
            <p>
              <T
                tech="It finds the table by its headers, emails, phones, dates and record numbers by pattern, and the table's names wherever else they appear. A patient mentioned only in prose (“the boy with the ear infection”) or by a nickname gets through. Real systems use a trained entity finder, like Microsoft's open-source Presidio, and still miss things. The safest detail is the one nobody pasted in."
                plain="Yes. It finds tables, email addresses, phone numbers, dates and names it has seen in the table. A patient described in words, or called by a nickname, would slip through. Better tools exist and they miss things too."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Placeholders lose the shape" plain="Does the AI lose anything?" />}>
            <p>
              <T
                tech={`Marta's name breaks the card, and the careful model never saw that it's ${PATIENTS[0].name.length} characters long. Here the brief already says it wraps to three lines, so the answer held up. When the length or format is the point, swap in a fake value of the same shape, or put the length in the placeholder.`}
                plain="Sometimes. The AI never saw how long Marta's name is, and that was the problem. Here the email says it wraps to three lines, so it was fine. When the shape matters, use a made-up name of the same length."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Where else does it leave?" plain="Is the AI the only place it goes?" />}>
            <p>
              <T
                tech="Logs that store prompts, error trackers that capture request bodies, analytics, saved test sets, and the provider's own retention. Under HIPAA, a vendor that receives patient data needs a business associate agreement; check the AI provider offers one before anything clinical is sent."
                plain="No. Logs, error reports and saved test data can all keep a copy. Health data has its own rules about which companies may receive it."
              />
            </p>
          </Deep>
          <Deep q={<T tech="How is “sent a detail” decided?" plain="Who checks what was sent?" />}>
            <p>
              <T
                tech={`Code: the grader holds the ${ALL} real values and searches the exact system prompt and message for each, ignoring case; a name also counts if the first or last name appears alone. Two batches of ${TASKS.length} tasks × 3: the first with the original placeholder rule, the second after one sentence changed. Not re-run otherwise.`}
                plain="A check in code that knows all the made-up details and looks for each one in exactly what was sent. Two test runs: one before I fixed the instructions and one after."
              />
            </p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px] leading-relaxed">
              <p className="border-2 border-brutal-black bg-[#FFD1E8] p-3">
                <span className="font-bold block mb-1">First rule</span>
                {PLACEHOLDER_RULE.v1}
              </p>
              <p className="border-2 border-brutal-black bg-[#EEFFC2] p-3">
                <span className="font-bold block mb-1">Rule now</span>
                {PLACEHOLDER_RULE.v2}
              </p>
            </div>
          </Deep>
        </div>
      </Section>
    </PrivShell>
  );
}
