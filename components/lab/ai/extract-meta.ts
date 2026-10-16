export const BUILD_LABEL: Record<string, { tech: string; plain: string; what: string; whatPlain: string }> = {
  prose: { tech: "JSON in the reply", plain: "Just ask", what: "Fields described in the prompt, JSON written as text and parsed.", whatPlain: "Describe the fields and ask for the answer as text." },
  schema: { tech: "Strict schema", plain: "A strict form", what: "Same descriptions as a strict tool schema: types, allowed values, null allowed.", whatPlain: "The same fields as a form the AI must fill in, with fixed choices." },
  evidence: { tech: "Schema + quotes", plain: "A form with proof", what: "Every field also returns the exact words that show it. Code checks the words are in the thread and contain the value.", whatPlain: "Every answer comes with the exact words from the email that prove it, and code checks them." },
};

export const FIELD_LABEL: Record<string, { tech: string; plain: string }> = {
  client: { tech: "client", plain: "Company" },
  contact: { tech: "contact", plain: "Who wrote" },
  contact_email: { tech: "contact_email", plain: "Their email" },
  handled_by: { tech: "handled_by", plain: "Our person" },
  topic: { tech: "topic", plain: "About" },
  plan: { tech: "plan", plain: "Plan" },
  price_eur: { tech: "price_eur", plain: "Price (€)" },
  last_message_date: { tech: "last_message_date", plain: "Last email" },
};

export const GRADE_BG: Record<string, string> = { right: "#C6FF3D", format: "#FFE600", wrong: "#FF5CAA", missing: "#FF5CAA" };

export const show = (v: unknown) => (v === undefined ? "—" : v === null ? "null" : String(v));

export interface ThreadView {
  slug: string;
  title: string;
  body: string;
}
