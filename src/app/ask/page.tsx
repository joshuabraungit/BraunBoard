import type { Metadata } from "next";
import { AskJoshForm } from "@/components/AskJosh";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ask Josh · Braun Board",
  description: "Got a sales job offer and not sure about it? Send Josh Braun your question.",
};

export default async function AskPage() {
  const user = await getUser().catch(() => null);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ask Josh</h1>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-2">
        <p>Got an offer and not sure about it? A comp plan that doesn&apos;t add up? A first call coming up and you don&apos;t know what to ask?</p>
        <p>Send it to me. I&apos;m Josh Braun, and I built Braun Board. I read every message myself.</p>
      </div>
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <AskJoshForm source="ask-page" defaultEmail={user?.email ?? ""} />
      </div>
    </div>
  );
}
