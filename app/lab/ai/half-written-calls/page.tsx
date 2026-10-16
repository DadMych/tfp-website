import type { Metadata } from "next";
import AiShell from "@/components/lab/ai/AiShell";
import HalfWrittenDemo from "@/components/lab/ai/HalfWrittenDemo";
import { CodeCompare, Deep, Points, Section } from "@/components/lab/money/ui";
import { T, TechOnly } from "@/components/lab/money/Explain";
import { SCENARIOS } from "@/lib/ai/scenarios";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Half-Written Calls — AI Lab",
  description: "The model hits its output limit mid tool call. The careless agent sends an empty email. The guarded one checks stop_reason and the schema. Live, on a real model.",
  alternates: { canonical: "/lab/ai/half-written-calls" },
};

const scenarios = SCENARIOS.filter((s) => s.article === "half-written-calls").map(({ id, label, plainLabel, task }) => ({ id, label, plainLabel, task }));

const bad = {
  lang: "ts",
  filename: "agent-loop-naive.ts",
  caption: "Every tool_use block is executed as it arrived. When the response ended on max_tokens, the last block holds whatever the model finished: here a recipient and a subject, no body.",
  code: `const reply = await model.messages({ system, tools, messages, max_tokens: 500 });

for (const call of reply.content.filter((b) => b.type === "tool_use")) {
  const out = await runTool(call.name, call.input);
  results.push({ type: "tool_result", tool_use_id: call.id, content: out });
}

// send_email, as it arrived:  { to: "dana@…", subject: "Annual plan" }
await db.query(
  "INSERT INTO outbox (to_addr, subject, body) VALUES ($1, $2, $3)",
  [input.to, input.subject, input.body ?? ""]
);`,
};

const good = {
  lang: "ts",
  filename: "lib/ai/agent.ts",
  caption: "Two checks before anything runs. A response cut off by the limit runs nothing. A call that does not match the tool's own schema is sent back. Both go back to the model as errors, and it resends the call whole.",
  code: `const reply = await model.messages({ system, tools, messages, max_tokens: 500 });
const cut = reply.stop_reason === "max_tokens";

for (const call of reply.content.filter((b) => b.type === "tool_use")) {
  const problem = cut
    ? "you hit the output limit before this call was complete"
    : invalid(call.name, call.input);    // required, not empty, right types
  const out = problem
    ? \`Not run: \${problem}. Send it again with every argument.\`
    : await runTool(call.name, call.input);
  results.push({ type: "tool_result", tool_use_id: call.id, content: out, is_error: Boolean(problem) });
}`,
};

export default function Page() {
  return (
    <AiShell slug="half-written-calls">
      <Section
        n="01"
        tone="tile"
        title="Run it"
        plainTitle="Try it"
        lede="A real model, two agents, one task. Both ask for a detailed email with a 500-token output limit per turn. Watch the outbox."
        plainLede="Two copies of the same AI get the same job: write a long email. Each gets a limited number of words per turn. Watch what actually gets sent."
      >
        <HalfWrittenDemo scenarios={scenarios} />
      </Section>

      <Section n="02" title="What holds" plainTitle="What keeps the email whole">
        <Points
          items={[
            {
              title: "Read stop_reason",
              plainTitle: "Check the AI finished",
              body: "Every response says why it ended. max_tokens means it was cut off, and any tool call in it may be missing arguments. Run nothing from that turn.",
              plainBody: "Every reply from the AI says why it stopped. If it ran out of room, whatever it was in the middle of is incomplete. Don't act on it.",
            },
            {
              title: "Enforce your own schema",
              plainTitle: "Check nothing is missing",
              body: "You already wrote a JSON schema for each tool and sent it to the model. Enforce it on the way back in: required fields present, not empty, right types. The API does not do it for you.",
              plainBody: "You already told the AI what each action needs. Before doing anything, check it actually sent all of it.",
            },
            {
              title: "Send errors back, not out",
              plainTitle: "Ask again instead of guessing",
              body: "A refused call goes back as a tool_result with is_error. The model resends it complete. One whole email instead of three broken ones.",
              plainBody: "When something is missing, tell the AI and let it try again. The client gets one good email instead of a few broken ones.",
            },
          ]}
        />
      </Section>

      <Section n="03" title="The code" lede="Trimmed from the agent loop behind the buttons." plainLede="What the two versions do, in one sentence. The code itself is one click away.">
        <TechOnly plain="The careless version does whatever the AI's reply says, even if the reply was cut off. The careful version first checks that the AI finished and that every required piece is there, and otherwise asks the AI again.">
          <CodeCompare bad={bad} good={good} />
        </TechOnly>
      </Section>

      <Section n="04" title="Go deeper" plainTitle="Still curious?" lede="Short answers to the questions this page raises. Open what you need." plainLede="A few more questions people ask. Open what you need.">
        <div className="flex flex-col">
          <Deep q={<T tech="Why not just raise max_tokens?" plain="Why not just give the AI more room?" />}>
            <p>
              <T
                tech="Raise it and this happens less often, not never: long bodies, several calls in one turn or a long preamble still reach any limit. The limit is also what keeps one runaway response from running up your bill. Keep it, and check stop_reason."
                plain="It would happen less often, not never. And the limit is what stops one long reply from costing a lot of money. Keep the limit and check whether the AI finished."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Isn't the model supposed to return valid tool calls?" plain="Isn't the AI supposed to fill everything in?" />}>
            <p>
              <T
                tech="It returns valid JSON for what it managed to write. A tool_use block cut off by the limit arrives with the fields it finished. In this lab that was usually to and subject, without body, because the body comes last and is the long part."
                plain="It fills in what it had time for. The email text is the longest part and comes last, so that is the piece that goes missing."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Why did the careless agent send several emails?" plain="Why did the careless app send more than one email?" />}>
            <p>
              <T
                tech="After the empty send succeeded, the model usually noticed and sent another, sometimes hitting the limit again. Each attempt that ran is a real email in the outbox. Nobody asked for a retry; the tool said 'sent', so from the model's side it had a reason to try again."
                plain="The AI noticed the first one was empty and tried again, sometimes running out of room again. The careless app sent every attempt. The client gets all of them."
              />
            </p>
          </Deep>
          <Deep q={<T tech="Is this specific to one model?" plain="Is this a problem with one particular AI?" />}>
            <p>
              <T
                tech="I measured it on claude-haiku-5-5 only; the counts above are from real runs of that model. The other major APIs report the same thing under another name (finish_reason: length on OpenAI, finishReason: MAX_TOKENS on Gemini), so the check is the same."
                plain="I measured it on one model, the one running this page. Every major AI service reports when it was cut off, so the same check works everywhere."
              />
            </p>
          </Deep>
        </div>
      </Section>
    </AiShell>
  );
}
