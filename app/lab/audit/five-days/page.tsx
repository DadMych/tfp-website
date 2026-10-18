import { permanentRedirect } from "next/navigation";

// Part 5 is now one page. 5.2 folded into /lab/audit.
export default function FiveDaysRedirect() {
  permanentRedirect("/lab/audit");
}
