import { notFound, redirect } from "next/navigation";
import { labEnabled } from "@/lib/lab-config";

export default function LabPage() {
  if (!labEnabled) notFound();
  redirect("/lab/money/games");
}
