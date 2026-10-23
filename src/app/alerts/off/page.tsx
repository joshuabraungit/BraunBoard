import type { Metadata } from "next";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { readOffToken } from "@/lib/alerts/off";
import { alertsOff, alertsUndo } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Turn off alerts · Braun Board", robots: { index: false } };

const btn = "rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90";
const quiet = "rounded-lg border border-line-strong px-4 py-2.5 text-sm font-semibold hover:border-ink";

// A button, not an automatic switch-off: email scanners open links before people do.
export default async function AlertsOff({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t = "", done } = await searchParams;
  const who = readOffToken(t);
  let name = "your watched companies";
  if (who?.watchId) {
    const { data } = await adminClient().from("watches").select("name").eq("id", who.watchId).eq("user_id", who.userId).maybeSingle();
    if (data?.name) name = `“${data.name}”`;
  }
  const Field = () => <input type="hidden" name="t" value={t} />;
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
      {!who || done === "bad" ? (
        <>
          <h1 className="text-xl font-bold">That link didn&apos;t work.</h1>
          <p className="mt-2 text-ink-2">
            Use the link at the bottom of any alert email, or <Link href="/alerts" className="underline">change your alerts here</Link>.
          </p>
        </>
      ) : done?.startsWith("one-") ? (
        <>
          <h1 className="text-xl font-bold">Done. No more alerts for {name}.</h1>
          <p className="mt-2 text-ink-2">Your watch is still saved. You can turn alerts back on anytime.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <form action={alertsUndo}>
              <Field />
              <input type="hidden" name="was" value={done.slice(4)} />
              <button className={quiet}>Undo</button>
            </form>
            <form action={alertsOff}>
              <Field />
              <input type="hidden" name="all" value="1" />
              <button className={quiet}>Turn off all alerts</button>
            </form>
          </div>
        </>
      ) : done === "all" ? (
        <>
          <h1 className="text-xl font-bold">Done. All alerts are off.</h1>
          <p className="mt-2 text-ink-2">Your watches are still saved, and Braun&apos;s Picks isn&apos;t affected.</p>
          <form action={alertsUndo} className="mt-5">
            <Field />
            <input type="hidden" name="all" value="1" />
            <button className={quiet}>Undo (daily emails)</button>
          </form>
        </>
      ) : done === "back" ? (
        <>
          <h1 className="text-xl font-bold">Alerts are back on.</h1>
          <p className="mt-2 text-ink-2">
            You can always change how often they come on the <Link href="/alerts" className="underline">Alerts page</Link>.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold">Turn off alerts for {name}?</h1>
          <p className="mt-2 text-ink-2">You&apos;ll stop getting these emails. Your watch stays saved.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <form action={alertsOff}>
              <Field />
              <button className={btn}>Turn off these alerts</button>
            </form>
            <form action={alertsOff}>
              <Field />
              <input type="hidden" name="all" value="1" />
              <button className={quiet}>Turn off all alerts</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
