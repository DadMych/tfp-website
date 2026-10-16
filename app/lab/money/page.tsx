import { notFound, redirect } from "next/navigation";
import { getLiveDemo } from "@/lib/lab-config";

export default function MoneyLabPage() {
  if (!getLiveDemo("money")) notFound();
  redirect("/lab/money/games");
}
