import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { AdminNotice } from "@/components/AdminNotice";
import { orderLines, type SponsoredJobRow } from "@/lib/sponsor";
import { isRunning } from "@/lib/sponsor-form";
import { goLive, setSponsoredStatus } from "./actions";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

type Stage = "pending" | "approve" | "scheduled" | "running" | "ended" | "done" | "canceled";
function stage(r: SponsoredJobRow, now = new Date()): Stage {
  if (r.status === "paid") return "approve";
  if (r.status === "live") return isRunning(r, now) ? "running" : r.live_at && new Date(r.live_at) > now ? "scheduled" : "ended";
  return r.status as Stage;
}
const BADGE: Record<Stage, [string, string]> = {
  pending: ["Unfinished checkout", "bg-bg text-ink-3 ring-1 ring-line"],
  approve: ["Paid · needs your OK", "bg-amber-soft text-amber"],
  scheduled: ["Scheduled", "bg-bg text-ink-2 ring-1 ring-line"],
  running: ["Live now", "bg-accent-soft text-accent"],
  ended: ["Ended", "bg-bg text-ink-2 ring-1 ring-line"],
  done: ["Done", "bg-bg text-ink-2 ring-1 ring-line"],
  canceled: ["Canceled", "bg-red-soft text-red"],
};

export default async function AdminSponsored({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string; all?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  let q = adminClient().from("sponsored_jobs").select("*").order("created_at", { ascending: false }).limit(200);
  if (!sp.all) q = q.neq("status", "pending");
  const { data, error } = await q;
  if (error) return <p className="text-red">Couldn&apos;t load sponsored jobs: {error.message}</p>;
  const rows = (data ?? []) as SponsoredJobRow[];
  const now = new Date();
  const runningCount = rows.filter((r) => stage(r, now) === "running").length;

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Sponsored jobs</h1>
      <p className="mb-4 text-sm text-ink-2">
        {runningCount} of 2 home page spots in use.{" "}
        <a href={sp.all ? "/admin/sponsored" : "/admin/sponsored?all=1"} className="font-semibold text-ink underline underline-offset-2">
          {sp.all ? "Hide unfinished checkouts" : "Show unfinished checkouts too"}
        </a>
      </p>
      <AdminNotice msg={sp.msg} err={sp.err} />
      {!rows.length && <p className="text-sm text-ink-3">No orders yet.</p>}
      <ul className="space-y-2">
        {rows.map((r) => {
          const st = stage(r, now);
          const [label, cls] = BADGE[st];
          return (
            <li key={r.id} className="rounded-xl border border-line bg-surface">
              <details open={st === "approve"}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {r.job_title} · {r.company}
                  </span>
                  {r.live_at && r.ends_at ? (
                    <span className="text-ink-3">
                      {day(r.live_at)} to {day(r.ends_at)}
                    </span>
                  ) : (
                    <span className="text-ink-3">Ordered {day(r.paid_at ?? r.created_at)}</span>
                  )}
                  {r.live_at && (
                    <span className="text-ink-2">
                      {r.views.toLocaleString()} views · {r.apply_clicks.toLocaleString()} apply clicks
                    </span>
                  )}
                </summary>
                <div className="border-t border-line px-4 py-3 text-sm">
                  <table>
                    <tbody>
                      {orderLines(r).map(([k, v]) => (
                        <tr key={k}>
                          <td className="py-0.5 pr-4 align-top text-ink-3">{k}</td>
                          <td className="break-all py-0.5">
                            {v.startsWith("http") ? (
                              <a href={v} target="_blank" rel="noopener" className="underline">
                                {v}
                              </a>
                            ) : (
                              v
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 whitespace-pre-wrap text-ink-2">{r.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {["paid", "live", "done"].includes(r.status) && (
                      <Link href={`/sponsored/${r.id}`} target="_blank" className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold">
                        {st === "running" ? "View job page ↗" : "Preview job page ↗"}
                      </Link>
                    )}
                    {st === "approve" && (
                      <form action={goLive}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                          {r.start_date && r.start_date > now.toISOString().slice(0, 10) ? `Approve for ${r.start_date}` : "Mark live"}
                        </button>
                      </form>
                    )}
                    {(st === "running" || st === "ended" || st === "scheduled") && (
                      <form action={setSponsoredStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="done" />
                        <button className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold">
                          {st === "ended" ? "Mark done" : "Take down now"}
                        </button>
                      </form>
                    )}
                    {st === "approve" && (
                      <form action={setSponsoredStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="canceled" />
                        <button className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm text-red">Cancel order</button>
                      </form>
                    )}
                  </div>
                  {st === "approve" && runningCount >= 2 && (
                    <p className="mt-2 text-xs text-amber">Both home page spots are taken. If you approve it now, it starts automatically when a spot opens, and gets its full 30 days from then.</p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
