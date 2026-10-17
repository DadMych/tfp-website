import { articleCard, labOgImage } from "@/lib/lab-og";

export const alt = "Paid Twice — Web3 Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return labOgImage(articleCard("web3", "payout-twice"));
}
