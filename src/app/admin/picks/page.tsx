import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { buildNextIssue } from "../actions";
import { AdminNotice } from "@/components/AdminNotice";
import { nextIssueDate } from "@/lib/picks";
import { postalAddress } from "@/lib/picks-email";

export const maxDuration = 60;

const STATUS: Record<string, string> = {
  scheduled: "bg-accent-soft text-accent",
  paused: "bg-amber-soft text-amber",
  sending: "bg-bg text-ink-2",
  sent: "bg-bg text-ink-2 ring-1 ring-line",
};

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

export default async function AdminPicks({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = adminClient();
  const [{ data: issues }, { count: active }, { count: unsub }, { data: clicks }] = await Promise.all([
    db.from("picks_issues").select("id, issue_date, status, subject, recipients, picks_items(id, kind)").order("issue_date", { ascending: false }).limit(52),
    db.from("picks_subscribers").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("picks_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
    db.from("picks_clicks").select("item_id, subscriber_id, picks_items!inner(issue_id)"),
  ]);
  const clickers = new Map<string, Set<string>>();
  for (const c of (clicks ?? []) as unknown as { subscriber_id: string | null; picks_items: { issue_id: string } }[]) {
    const s = clickers.get(c.picks_items.issue_id) ?? new Set();
    if (c.subscriber_id) s.add(c.subscriber_id);
    clickers.set(c.picks_items.issue_id, s);
  }
  const next = nextIssueDate();
  const hasNext = (issues ?? []).some((i) => i.issue_date === next);
  const needsAddress = !postalAddress();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Braun&apos;s Picks</h1>
          <p className="text-sm text-ink-2">
            {active ?? 0} subscribers{unsub ? ` · ${unsub} unsubscribed` : ""}. Built Mondays around 2pm ET, sent Tuesdays at 8am ET.
          </p>
        </div>
        {!hasNext && (
          <form action={buildNextIssue}>
            <button className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white">Build {day(next)} issue now</button>
          </form>
        )}
      </div>
      <AdminNotice msg={sp.msg} err={sp.err} />

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Issue</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Subject</th>
              <th className="px-4 py-2.5 font-semibold">Sent to</th>
              <th className="px-4 py-2.5 font-semibold">Clicked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(issues ?? []).map((i) => {
              const people = clickers.get(i.id)?.size ?? 0;
              return (
                <tr key={i.id}>
                  <td className="px-4 py-2.5"><Link href={`/admin/picks/${i.id}`} className="font-semibold hover:underline">{day(i.issue_date)}</Link></td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[i.status]}`}>{i.status}</span></td>
                  <td className="max-w-[320px] truncate px-4 py-2.5 text-ink-2">{i.subject}</td>
                  <td className="px-4 py-2.5">{i.status === "sent" ? i.recipients : "–"}</td>
                  <td className="px-4 py-2.5">{i.status === "sent" ? `${people}${i.recipients ? ` (${Math.round((people / i.recipients) * 100)}%)` : ""}` : "–"}</td>
                </tr>
              );
            })}
            {!issues?.length && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-3">No issues yet. The first one builds Monday afternoon, or build it now.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {needsAddress && (
        <p className="mt-4 rounded-lg border border-amber/30 bg-amber-soft px-4 py-3 text-sm text-amber">
          Picks needs a mailing address in the email footer before the first issue can go out (US email law). A PO box is fine. Send it to Claude to add.
        </p>
      )}
    </>
  );
}
