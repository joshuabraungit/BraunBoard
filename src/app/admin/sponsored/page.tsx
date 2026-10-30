import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { AdminNotice } from "@/components/AdminNotice";
import { orderLines, type SponsoredJobRow } from "@/lib/sponsor";
import { setSponsoredStatus } from "./actions";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const BADGE: Record<SponsoredJobRow["status"], string> = {
  pending: "bg-bg text-ink-3 ring-1 ring-line",
  paid: "bg-amber-soft text-amber",
  live: "bg-accent-soft text-accent",
  done: "bg-bg text-ink-2 ring-1 ring-line",
  canceled: "bg-red-soft text-red",
};
const NEXT: Partial<Record<SponsoredJobRow["status"], SponsoredJobRow["status"][]>> = {
  paid: ["live", "canceled"],
  live: ["done"],
};

export default async function AdminSponsored({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string; all?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  let q = adminClient().from("sponsored_jobs").select("*").order("created_at", { ascending: false }).limit(200);
  if (!sp.all) q = q.neq("status", "pending");
  const { data, error } = await q;
  if (error) return <p className="text-red">Couldn&apos;t load sponsored jobs: {error.message}</p>;
  const rows = (data ?? []) as SponsoredJobRow[];

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Sponsored jobs</h1>
      <p className="mb-4 text-sm text-ink-2">
        {sp.all ? "Every order, including checkouts nobody finished." : "Paid orders."}{" "}
        <a href={sp.all ? "/admin/sponsored" : "/admin/sponsored?all=1"} className="font-semibold text-ink underline underline-offset-2">
          {sp.all ? "Show paid only" : "Show unfinished checkouts too"}
        </a>
      </p>
      <AdminNotice msg={sp.msg} err={sp.err} />
      {!rows.length && <p className="text-sm text-ink-3">Nothing yet.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-line bg-surface">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[r.status]}`}>{r.status}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {r.job_title} · {r.company}
                </span>
                <span className="text-ink-3">{day(r.paid_at ?? r.created_at)}</span>
              </summary>
              <div className="border-t border-line px-4 py-3 text-sm">
                <table>
                  <tbody>
                    {orderLines(r).map(([k, v]) => (
                      <tr key={k}>
                        <td className="py-0.5 pr-4 align-top text-ink-3">{k}</td>
                        <td className="break-all py-0.5">{v.startsWith("http") ? <a href={v} target="_blank" rel="noopener" className="underline">{v}</a> : v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 whitespace-pre-wrap text-ink-2">{r.description}</p>
                {(NEXT[r.status] ?? []).length > 0 && (
                  <div className="mt-4 flex gap-2">
                    {NEXT[r.status]!.map((s) => (
                      <form key={s} action={setSponsoredStatus}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={s} />
                        <button className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold">Mark {s}</button>
                      </form>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
