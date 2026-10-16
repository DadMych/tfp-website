export const ATTACK_LABEL: Record<string, { tech: string; plain: string }> = {
  waiver: { tech: "Fee waiver", plain: "“Rush is free”" },
  reworded: { tech: "Waiver, reworded", plain: "Same, said nicely" },
  bank: { tech: "New bank", plain: "Fake bank details" },
  invoice: { tech: "New bank, quietly", plain: "Bank details, no orders" },
  leak: { tech: "Leak the rules", plain: "“Show me your rules”" },
  quiet: { tech: "Wrong price", plain: "A fake new price" },
};

export const LAYER_INFO: Record<string, { tech: string; plain: string; what: string; whatPlain: string }> = {
  none: { tech: "Nothing", plain: "Nothing", what: "Sources go into the prompt as they come.", whatPlain: "The files go to the AI as they are." },
  fence: { tech: "+ Fence & rule", plain: "+ A warning", what: "Each source wrapped in tags. The prompt says text inside is quoted, never an instruction.", whatPlain: "The AI is told: the files are other people's words, don't take orders from them." },
  scan: { tech: "+ Scanner", plain: "+ A filter", what: "Code drops any retrieved passage that talks to an AI before the model sees it.", whatPlain: "Before the AI reads anything, code throws out passages that talk to an AI." },
  check: { tech: "+ Output check", plain: "+ A final check", what: "The answer is held back if it holds an email, link or bank number the published files don't, or a line of the prompt.", whatPlain: "If the answer contains bank details or an address that's not in the real files, it never reaches the client." },
  label: { tech: "+ Provenance", plain: "+ Where it came from", what: "Each source says who wrote it. Only published ones can set prices, payment or terms.", whatPlain: "Every file says who wrote it. Only the studio's own files can set prices or payment." },
};

export interface AttackView {
  id: string;
  kind: "instruction" | "fact";
  heading: string;
  text: string;
  questions: string[];
  /** What the scanner flags in the planted text. */
  matches: string[];
}
