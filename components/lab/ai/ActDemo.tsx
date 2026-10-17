"use client";

import AgentDemo, { type ScenarioButton, type SideRun } from "./AgentDemo";
import { ACT_LABEL } from "./act-meta";

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

function count(run: SideRun) {
  return {
    refused: run.calls.filter((c) => c.status === "blocked").length,
    held: run.calls.filter((c) => c.status === "proposed").length,
  };
}

export default function ActDemo({ scenarios }: { scenarios: ScenarioButton[] }) {
  return (
    <AgentDemo
      article="agents-that-act"
      scenarios={scenarios}
      careless={{
        title: "No guards",
        note: "Runs every tool call as it arrives. Whatever the model decides, happens.",
        plainTitle: "Careless app",
        plainNote: "Whatever the AI decides to do, it does.",
      }}
      guarded={{
        title: "Every guard on",
        note: "Checks stop_reason and arguments, emails only known contacts, reads the send log before sending, and holds deletes and anything after outside text for a person.",
        plainTitle: "Careful app",
        plainNote: "Checks the AI finished, never emails the same person twice, and asks a person before anything that can't be undone.",
      }}
      intro={{
        tech: "Same model, same prompt, same task on both sides. The only difference is code around the tools. Pick a task.",
        plain: "Two copies of the same AI get the same job. The only difference is the safety checks around them. Pick a job.",
      }}
      verdict={(side, run, id) => {
        const c = count(run);
        if (run.outcome === "broke") return { tone: "bad", tech: `Broke: ${ACT_LABEL[id].broke}.`, plain: `Went wrong: ${ACT_LABEL[id].plainBroke}.` };
        if (run.outcome === "stopped")
          return {
            tone: "good",
            tech: `Tried it. Code stopped it: ${n(c.refused, "call refused", "calls refused")}, ${n(c.held, "held for a person", "held for a person")}.`,
            plain: `It tried. The checks caught it${c.held ? `: ${n(c.held, "thing waits", "things wait")} for a person` : ""}.`,
          };
        if (!run.report)
          return { tone: "neutral", tech: "Ended early: the model's last turn had no text and no tool call. Nothing broke, nothing got done.", plain: "The AI stopped without finishing or saying why. Nothing went wrong, but nothing got done either." };
        if (side === "careless") return { tone: "neutral", tech: "Nothing broke this time. Luck, not code.", plain: "Nothing went wrong this time. Luck, not safety." };
        return c.held
          ? { tone: "neutral", tech: `Nothing to stop. ${n(c.held, "write", "writes")} held for a person anyway.`, plain: `Nothing went wrong. ${n(c.held, "thing waits", "things wait")} for a person to approve.` }
          : { tone: "good", tech: "Nothing to stop this time.", plain: "Nothing went wrong, nothing to catch." };
      }}
      summary={(runs) =>
        runs.careless.outcome === "broke" && runs.guarded.outcome === "stopped"
          ? {
              tech: "Same model, same prompt, same task. The careless side broke; the guarded side didn't, because of code around the tools.",
              plain: "Same AI, same job. The careless app let the mistake through. The careful app's checks caught it.",
            }
          : runs.careless.outcome === "broke"
            ? {
                tech: "The careless side broke. The guarded model never tried the same thing this time, so its guards had nothing to stop. Press it again, or see 10 stored runs of each below.",
                plain: "The careless app went wrong. The careful one never got that far this time, so its checks had nothing to catch. Press it again, or see 10 runs of each below.",
              }
            : {
              tech: "The careless side didn't break this time. The model decides differently from run to run; the grid below has 10 stored runs of each.",
              plain: "The careless app got lucky this time. The AI behaves differently every run, so press it again, or see 10 runs of each below.",
            }
      }
      measured={(c, g) => ({
        tech: `Last 7 days: careless broke in ${c.broke} of ${c.runs} runs, guarded in ${g.broke} of ${g.runs}.`,
        plain: `In the last 7 days the careless app went wrong in ${c.broke} of ${c.runs} runs. The careful one in ${g.broke} of ${g.runs}.`,
      })}
    />
  );
}
