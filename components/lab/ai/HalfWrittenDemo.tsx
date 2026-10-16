"use client";

import AgentDemo, { type ScenarioButton, type SideRun } from "./AgentDemo";

function count(run: SideRun) {
  const sent = run.calls.filter((c) => c.tool === "send_email" && c.status === "done");
  const empty = sent.filter((c) => String(c.input.body ?? "").trim() === "").length;
  const cut = sent.filter((c) => c.stop === "max_tokens" && String(c.input.body ?? "").trim() !== "").length;
  const caught = run.calls.filter((c) => c.status === "blocked").length;
  return { sent: sent.length, empty, cut, caught };
}

const emails = (n: number) => `${n} ${n === 1 ? "email" : "emails"}`;

export default function HalfWrittenDemo({ scenarios }: { scenarios: ScenarioButton[] }) {
  return (
    <AgentDemo
      article="half-written-calls"
      scenarios={scenarios}
      careless={{
        title: "Runs whatever arrives",
        note: "Executes every tool_use block in the response. Never looks at stop_reason, never checks the schema.",
        plainTitle: "Does whatever the AI wrote",
        plainNote: "Even when the AI stopped halfway through writing it.",
      }}
      guarded={{
        title: "Checks stop_reason and the schema",
        note: "A turn that ended on max_tokens runs nothing. Every argument is checked against the tool's own schema first.",
        plainTitle: "Checks the AI finished",
        plainNote: "If the AI was cut off, nothing runs. A missing piece goes back to the AI, not out to the client.",
      }}
      intro={{
        tech: "Both agents get the same task and a 500-token output limit per turn: low, like most apps that watch their bill. Pick a task.",
        plain: "Ask the AI for a long email. It gets a limited number of words per turn, like most apps that watch their bill. Watch what each app does when the AI runs out.",
      }}
      verdict={(side, run) => {
        const c = count(run);
        if (c.sent === 0 && c.caught === 0) return { tone: "neutral", tech: "No email sent, nothing to refuse.", plain: "No email went out this time. Nothing broke." };
        if (side === "careless") {
          if (run.outcome === "broke") {
            const broken = c.empty + c.cut;
            return {
              tone: "bad",
              tech: `${emails(c.sent)} sent, ${c.empty} empty${c.cut ? `, ${c.cut} cut off` : ""}.`,
              plain: `${emails(c.sent)} went out. ${broken} of them ${broken === 1 ? "was" : "were"} broken.`,
            };
          }
          return { tone: "neutral", tech: `${emails(c.sent)} sent, all complete. Luck, not code.`, plain: `${emails(c.sent)}, all complete this time. Luck, not code.` };
        }
        if (c.caught > 0)
          return {
            tone: "good",
            tech: `Refused ${c.caught} incomplete ${c.caught === 1 ? "call" : "calls"}. Sent ${c.sent} complete.`,
            plain: `Caught ${c.caught} half-written ${c.caught === 1 ? "email" : "emails"}. Sent ${c.sent} whole.`,
          };
        return { tone: "good", tech: `${emails(c.sent)} sent, nothing to refuse.`, plain: `${emails(c.sent)}, all complete. Nothing to catch this time.` };
      }}
      summary={(runs) =>
        runs.careless.outcome === "broke"
          ? count(runs.guarded).caught > 0
            ? {
                tech: "Same model, same task. The careless agent executed calls the model never finished; the guarded one refused them and the model resent them complete.",
                plain: "Same AI, same task. The careless app sent what the AI hadn't finished writing. The careful app noticed, sent nothing, and asked the AI to try again.",
              }
            : {
                tech: "The careless agent executed calls the model never finished. On the guarded side the model didn't hit the limit this time, so there was nothing to refuse.",
                plain: "The careless app sent what the AI hadn't finished writing. On the careful side the AI didn't run out of room this time, so there was nothing to catch.",
              }
          : {
              tech: "This time the model finished every call, so both agents were fine. It does not always finish.",
              plain: "This time the AI finished every email, so both apps did fine. It doesn't always. Press it again.",
            }
      }
      measured={(c, g) => ({
        tech: `Last 7 days: careless broke in ${c.broke} of ${c.runs} runs, guarded in ${g.broke} of ${g.runs}.`,
        plain: `This week the careless app sent broken emails in ${c.broke} of ${c.runs} runs. The careful one in ${g.broke} of ${g.runs}.`,
      })}
    />
  );
}
