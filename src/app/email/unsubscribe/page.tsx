import type { Metadata } from "next";
import { leaveEmails } from "./actions";

export const metadata: Metadata = { title: "Unsubscribe | Braun Board", robots: { index: false } };

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams;
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
      {done === "1" ? (
        <>
          <h1 className="text-xl font-bold">You&apos;re unsubscribed.</h1>
          <p className="mt-2 text-ink-2">No more emails like that one. Your job alerts aren&apos;t affected.</p>
        </>
      ) : done === "0" ? (
        <>
          <h1 className="text-xl font-bold">That link didn&apos;t work.</h1>
          <p className="mt-2 text-ink-2">Reply to the email and I&apos;ll take you off myself.</p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold">Unsubscribe?</h1>
          <p className="mt-2 text-ink-2">You&apos;ll stop getting occasional emails like this one. Your job alerts and Braun&apos;s Picks aren&apos;t affected.</p>
          <form action={leaveEmails} className="mt-4">
            <input type="hidden" name="t" value={t ?? ""} />
            <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Unsubscribe</button>
          </form>
        </>
      )}
    </div>
  );
}
