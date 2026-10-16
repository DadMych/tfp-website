import { notFound, redirect } from "next/navigation";
import { getLiveDemo } from "@/lib/lab-config";

export default function AiArticlesPage() {
  if (!getLiveDemo("ai")) notFound();
  redirect("/lab/ai");
}
