import type { Metadata } from "next";
import AiShell from "@/components/lab/ai/AiShell";
import ActDemo from "@/components/lab/ai/ActDemo";
import ActGrid from "@/components/lab/ai/ActGrid";
import { ACT_LABEL, ACT_ORDER } from "@/components/lab/ai/act-meta";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import { actRuns } from "@/lib/ai/act";
import { SCENARIOS } from "@/lib/ai/scenarios";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agents That Act — AI Lab",
  description: "An agent with a CRM and an outbox, four everyday tasks, ten runs each with and without guards. A cut-off email, a timeout that wasn't, a cleanup that deleted a signed client, and what the guards cost a person in approvals.",
  alternates: { canonical: "/lab/ai/agents-that-act" },
};

const scenarios = ACT_ORDER.map((id) => SCENARIOS.find((s) => s.article === "agents-that-act" && s.id === id)!).map(({ id, task }) => ({
  id,
  label: ACT_LABEL[id].tech,
  plainLabel: ACT_LABEL[id].plain,
  task,
}));

const bad = {
  lang: "ts",
  filename: "tools-naive.ts",
  caption: "The tool does what it is told. A timeout is reported as a failure, so the model sends again. A delete runs the moment it is asked for.",
  code: `case "send_email":
  return await mail.send({ to, subject, body });
  // timed out → "Error: no delivery confirmation"
  // → the model retries → the client gets it twice

case "delete_contact":
  await db.query("DELETE FROM deals WHERE contact_id = $1", [id]);
  await db.query("DELETE FROM contacts WHERE id = $1", [id]);
  return { deleted: true };`,
};

const good = {
  lang: "ts",
  filename: "lib/ai/crm.ts",
  caption: "Two checks in code, before the tool runs. The send log is asked, not the model. A delete becomes a proposal a person approves.",
  code: `if (guards.checkSentLog && name === "send_email") {
  const prev = await sentInThisRun(runId, input.to);
  if (prev) return blocked(
    \`Message \${prev.seq} to \${input.to} was delivered. Do not send it again.\`);
}

if (guards.holdIrreversible && name === "delete_contact") {
  await db.query("INSERT INTO proposals (run_id, tool, args, reason) …",
    [runId, name, input, "a delete can't be undone"]);
  return proposed("Saved for a person to approve. It has not happened.");
}`,
};

export default async function Page() {
  const runs = await actRuns();
  const of = (s: string, side: "careless" | "guarded") => runs.filter((r) => r.scenario === s && r.side === side);
  const side = (sd: "careless" | "guarded") => runs.filter((r) => r.side === sd);
  const broke = (rs: typeof runs) => rs.filter((r) => r.outcome === "broke").length;
  const reps = of("tidy", "careless").length;
  const perSide = side("careless").length;

  // Everything that reached a client, whatever the task: emails with no address or no body, repeats, deleted clients.
  const reached = (sd: "careless" | "guarded") => {
    const rs = side(sd);
    return {
      empty: rs.reduce((n, r) => n + r.sent.filter((m) => m.empty).length, 0),
      repeats: rs.reduce((n, r) => n + r.sent.filter((m) => m.repeat && !m.empty).length, 0),
      kestrel: broke(of("tidy", sd)),
    };
  };
  const rc = reached("careless");
  const rg = reached("guarded");
  const held = side("guarded").reduce((n, r) => n + r.held.length, 0);
  const inboxG = of("inbox", "guarded");
  const inboxHeld = inboxG.reduce((n, r) => n + r.held.length, 0);
  const inboxIdle = inboxG.filter((r) => r.held.length === 0 && r.sent.length === 0).length;
  const inboxDelivered = inboxG.reduce((n, r) => n + r.sent.length, 0);
  const inboxCarelessSent = of("inbox", "careless").filter((r) => r.sent.some((m) => !m.empty && !m.repeat)).length;
  const longIdle = of("long-email", "guarded").filter((r) => r.sent.length === 0).length;
  const timeoutRetried = broke(of("timeout", "careless"));
  const timeoutGuardedTried = of("timeout", "guarded").filter((r) => r.outcome === "stopped").length;
  const tidyHeld = of("tidy", "guarded").filter((r) => r.held.length > 0).length;

  return (
    <AiShell slug="agents-that-act">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="A real model with a sandbox CRM and an outbox. Two agents, one task. The only difference is code around the tools. Watch what each one actually does."
        plainLede="Two copies of the same AI can send emails and change the client list. They get the same job. One has safety checks, one doesn't. Watch what each actually does."
      >
        <ActDemo scenarios={scenarios} />
      </Section>

      <Section
        n="02"
        title={`${reps} runs of each`}
        plainTitle="What happened, every time"
        lede={`Four tasks, ${reps} runs per agent per task, ${perSide * 2} runs in total on claude-haiku-5-5. Whether a run broke is checked in the database afterwards. Click a number to see every run.`}
        plainLede={`Each job was run ${reps} times on each app. Each box counts the times it went wrong. Click it to see what was sent, what waited for a person, and what the AI said it did.`}
      >
        {runs.length > 0 ? <ActGrid runs={runs} /> : <p className="font-display text-lg">The experiment hasn&apos;t been run on this database yet.</p>}
      </Section>

      <Section n="03" title="What held" plainTitle="What actually mattered">
        <Points
          items={[
            {
              title: "Code stopped what it was written for",
              plainTitle: "The checks caught everything they were built for",
              body: `The careless agent broke in ${broke(side("careless"))} of ${perSide} runs, the guarded one in ${broke(side("guarded"))}. Same model, same prompt, same task. Each guard is a few lines around one tool, not a sentence in the prompt.`,
              plainBody: `The careless app went wrong ${broke(side("careless"))} times out of ${perSide}. The careful one ${broke(side("guarded"))} times. The AI was the same. Only the checks around it were different.`,
            },
            {
              title: "What reached a client",
              plainTitle: "What the client would have seen",
              body: `Without guards, across all four tasks: ${rc.empty} emails with no address or no body, ${rc.repeats} more complete emails to someone who already had one from the same run, and Kestrel deleted with its won deal in ${rc.kestrel} of ${reps} cleanups. With guards: ${rg.empty}, ${rg.repeats} and ${rg.kestrel}.`,
              plainBody: `Without checks: ${rc.empty} empty emails, ${rc.repeats} extra copies of emails, and a signed client deleted ${rc.kestrel} times out of ${reps}. With checks: ${rg.empty}, ${rg.repeats} and ${rg.kestrel}.`,
            },
            {
              title: "The bill is paid in approvals",
              plainTitle: "The price: a person has to say yes",
              body: `The guarded agent asked a person ${held} times in ${perSide} runs. In the inbox task it delivered ${inboxDelivered} emails on its own: every reply and deal change after reading outside text waited, ${inboxHeld} in ${inboxG.length} runs. The careless agent delivered at least one complete reply unattended in ${inboxCarelessSent} of ${of("inbox", "careless").length} runs, along with its mistakes.`,
              plainBody: `The careful app asked a person ${held} times in ${perSide} runs. Answering website messages, it sent nothing on its own: every reply waited for a person to approve. That is the trade.`,
            },
          ]}
        />
      </Section>

      <Section n="04" title="The code" lede="Trimmed from the tool layer behind the buttons." plainLede="What the two versions do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The careless version sends and deletes the moment the AI asks. The careful version checks its own send log before every email, and turns every delete into a request a person approves.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="05" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why didn't the fake discount work on the careless agent?" plain="Why didn't the fake discount fool the careless app?" />}>
            <p>
              <T
                tech={`Because the model refused it: ${broke(of("inbox", "careless"))} of ${reps} careless runs gave the discount or wrote to the lookalike address. That is the model's judgement on this message, today. In Poisoned Files a quieter planted line did change answers. The guards are for the message it doesn't see through.`}
                plain={`The AI saw through it on its own, ${reps - broke(of("inbox", "careless"))} times out of ${reps}. That was this message, on this day. A quieter fake did fool it in the Poisoned Files chapter. The checks are for the one it doesn't catch.`}
              />
            </p>
            <p>
              <T
                tech="What did go wrong in the inbox was the other failure on this page: replies cut off by the output limit, run anyway, then sent again."
                plain="What went wrong instead was ordinary: emails cut off halfway, sent anyway, then sent again."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Does clean mean the job got done?" plain="If nothing went wrong, was the job done?" />}>
            <p>
              <T
                tech={`No. In ${longIdle} of ${reps} long-email runs the guarded agent sent nothing: the CRM didn't say what the plan includes, and it wouldn't make it up. In ${inboxIdle} of ${inboxG.length} inbox runs it read everything, changed nothing and explained why. Both are fine outcomes. Neither is a finished task.`}
                plain={`Not always. ${longIdle} times out of ${reps} the careful app wrote no email at all, because the client record didn't say what the plan includes and it wouldn't guess. Sometimes the right result is a question for a person.`}
              />
            </p>
          </Deep>
          <Deep q={<T tech="Wasn't deleting Kestrel exactly what the task said?" plain="Didn't the AI just do what it was told?" />}>
            <p>
              <T
                tech={`Yes. Kestrel's only deal was won, so it had no open deal, and the task said to delete those. Every report that followed a delete named the won deal: the model knew, and followed the rule as written. The guarded agent proposed the same deletes in ${tidyHeld} of ${reps} runs. A person reading "delete Priya Nair, Kestrel, won deal" says no. That is the point of holding what can't be undone: the instruction can be wrong too.`}
                plain="Yes. The client had already signed, so they had no open deal, and the job said to delete those. The careful app wanted to do the same, but asked first. A person sees the name and says no."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why check the send log instead of never retrying?" plain="Why not just never send twice?" />}>
            <p>
              <T
                tech={`Because sometimes the send really failed. A timeout says nothing about delivery. Here the email always went out; the careless model sent it again in ${timeoutRetried} of ${reps} runs, and the guarded one tried to in ${timeoutGuardedTried}. Asking the mail log is the only way to know. My version allows one email per address per run, which would also block a legitimate second email. A production build would key it on the message, the way payment APIs use an idempotency key.`}
                plain={`Because sometimes the email really didn't go. The careless app sent it again ${timeoutRetried} times out of ${reps}. The careful app asks the email system whether the first one arrived before trying again.`}
              />
            </p>
          </Deep>
          <Deep q={<T tech="Did the guards ever get in the way?" plain="Did the checks ever cause trouble?" />}>
            <p>
              <T
                tech="Yes, in my first version. The argument check refused an empty search, which the tool's own description allows. In two trial runs the guarded agent spent up to seven calls on guessed search terms (“e”, “a”, “@”) to find every contact. I fixed the schema and ran the experiment above after the fix. The trial runs of the new tasks, two per side, are not in the grid."
                plain="Yes, in my first version. One check was stricter than the tool it guarded, and the careful app wasted steps working around it. I fixed it before running the numbers above."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Is ten runs enough?" plain="Is ten tries enough?" />}>
            <p>
              <T
                tech={`Enough to see that a failure happens, not to put a precise rate on it. ${reps} runs per agent per task, one batch, one model (claude-haiku-5-5), default temperature, 500 output tokens per turn. Run it yourself above: every live run counts toward the line under the buttons.`}
                plain="Enough to see that it happens, not to say exactly how often. You can run it yourself above. Every run counts."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}
