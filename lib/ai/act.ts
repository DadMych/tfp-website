import { sql } from "@/lib/db";
import type { AgentEvent, Outcome } from "./agent";
import type { Side } from "./scenarios";

export interface ActRun {
  scenario: string;
  side: Side;
  outcome: Outcome;
  /** What reached a client: one entry per delivered email. */
  sent: { to: string; subject: string; empty: boolean; repeat: boolean }[];
  /** What waited for a person instead. */
  held: string[];
  /** Contacts deleted for good. */
  deleted: number;
  steps: number;
  report: string;
}

/** The latest owner experiment for each scenario of "Agents That Act", run by run. */
export async function actRuns(): Promise<ActRun[]> {
  const rows = await sql<{
    scenario: string;
    side: Side;
    outcome: Outcome;
    steps: number;
    transcript: AgentEvent[];
    outbox: { to: string; subject: string; body: string }[] | null;
    held: { tool: string; args: Record<string, unknown> }[] | null;
    contacts: number;
  }>(
    `WITH l AS (SELECT DISTINCT ON (scenario) scenario, batch FROM ai.evals WHERE article = 'agents-that-act' ORDER BY scenario, created_at DESC)
     SELECT e.scenario, e.side, r.outcome, r.steps, r.transcript,
            (SELECT json_agg(json_build_object('to', to_addr, 'subject', subject, 'body', body) ORDER BY seq) FROM ai.outbox o WHERE o.run_id = r.id) AS outbox,
            (SELECT json_agg(json_build_object('tool', tool, 'args', args) ORDER BY created_at) FROM ai.proposals p WHERE p.run_id = r.id) AS held,
            (SELECT count(*) FROM ai.contacts c WHERE c.run_id = r.id)::int AS contacts
       FROM ai.evals e JOIN l USING (scenario, batch) JOIN ai.runs r ON r.id = e.run_id
      ORDER BY e.scenario, e.side, e.created_at`
  );
  return rows.map((r) => {
    const seen = new Set<string>();
    const sent = (r.outbox ?? []).map((m) => {
      const to = m.to.toLowerCase();
      const repeat = seen.has(to);
      seen.add(to);
      return { to: m.to, subject: m.subject, empty: !m.to.trim() || !m.body.trim(), repeat };
    });
    const end = r.transcript.find((e) => e.k === "end");
    return {
      scenario: r.scenario,
      side: r.side,
      outcome: r.outcome,
      sent,
      held: (r.held ?? []).map(({ tool, args }) =>
        tool === "send_email" ? `email ${String(args.to)}` : tool === "update_deal" ? `change deal ${String(args.deal_id)}` : `delete contact ${String(args.contact_id)}`
      ),
      deleted: 5 - r.contacts,
      steps: r.steps,
      report: end && end.k === "end" ? end.text : "",
    };
  });
}
