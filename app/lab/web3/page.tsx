import { notFound, redirect } from "next/navigation";
import { getLiveDemo } from "@/lib/lab-config";

export default function Web3LabPage() {
  const web3 = getLiveDemo("web3");
  if (!web3) notFound();
  redirect(web3.href);
}
