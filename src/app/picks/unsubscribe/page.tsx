import type { Metadata } from "next";
import Link from "next/link";
import { leavePicks } from "../actions";

export const metadata: Metadata = { title: "Unsubscribe | Braun's Picks", robots: { index: false } };

export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ s?: string; done?: string }> }) {
  const { s, done } = await searchParams;
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
      {done === "1" ? (
        <>
          <h1 className="text-xl font-bold">You&apos;re unsubscribed.</h1>
          <p className="mt-2 text-ink-2">No more Braun&apos;s Picks. Changed your mind? You can rejoin anytime on the <Link href="/picks" className="underline">Picks page</Link>.</p>
        </>
      ) : done === "0" ? (
        <>
          <h1 className="text-xl font-bold">That link didn&apos;t work.</h1>
          <p className="mt-2 text-ink-2">Use the unsubscribe link at the bottom of any Picks email, or reply to it and we&apos;ll take you off.</p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold">Unsubscribe from Braun&apos;s Picks?</h1>
          <p className="mt-2 text-ink-2">You&apos;ll stop getting the weekly email. Your Braun Board account and job alerts aren&apos;t affected.</p>
          <form action={leavePicks} className="mt-4">
            <input type="hidden" name="s" value={s ?? ""} />
            <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Unsubscribe</button>
          </form>
        </>
      )}
    </div>
  );
}
