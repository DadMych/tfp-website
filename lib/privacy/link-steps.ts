export const TTL_MINUTES = 10;

export const STEPS = [
  { id: "open", tech: "The freelancer opens it", plain: "The freelancer opens it" },
  { id: "forward", tech: "They forward it to a friend", plain: "They forward it to a friend" },
  { id: "later", tech: "Eleven minutes later", plain: "Eleven minutes later" },
  { id: "revoked", tech: "Project over, access removed", plain: "The project ends, access removed" },
  { id: "edited", tech: "Someone edits the link", plain: "Someone changes the link" },
] as const;
export type Step = (typeof STEPS)[number]["id"];

export interface Links {
  careless: string;
  careful: string;
}
export interface Opened {
  status: 200 | 400 | 403 | 404 | 410;
  file?: string;
  why: string;
}
export interface Tried {
  step: Step;
  links: Links;
  careless: Opened;
  careful: Opened;
}
