import DemoShell from "@/components/lab/DemoShell";

// Route skeleton. Renders only when lib/lab-config.ts marks "safe-agent" as live.
export default function Page() {
  return <DemoShell slug="safe-agent" />;
}
