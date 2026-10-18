import { permanentRedirect } from "next/navigation";

// Part 5 is now one page. 5.3 folded into /lab/audit.
export default function AfterRedirect() {
  permanentRedirect("/lab/audit");
}
