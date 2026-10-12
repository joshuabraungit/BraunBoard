import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { addPick, removePick, saveIssueText, savePickTake, setIssuePaused } from "../../actions";
import { AdminNotice } from "@/components/AdminNotice";
import { loadCandidates } from "@/lib/picks-db";
import { choosePicks, pickMeta, pickPay } from "@/lib/picks";
import { renderPicks, type ItemContent } from "@/lib/picks-email";

export const maxDuration = 60;

interface Item extends ItemContent {
  position: number;
  job_id: string | null;
  job_slug: string | null;
}

export default async function EditIssue({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const db = adminClient();
  const { data: issue } = await db.from("picks_issues").select("*").eq("id", id).maybeSingle();
  if (!issue) notFound();
  const { data: rows } = await db.from("picks_items").select("id, kind, position, job_id, job_slug, title, company, pay, meta, take").eq("issue_id", id).order("position");
  const items = (rows ?? []) as Item[];
  const picks = items.filter((i) => i.kind === "pick");
  const skip = items.find((i) => i.kind === "skip");
  const locked = issue.status === "sent" || issue.status === "sending";

  const { data: clickRows } = locked ? await db.from("picks_clicks").select("item_id").in("item_id", items.map((i) => i.id)) : { data: [] };
  const clicksBy = new Map<string, number>();
  for (const c of clickRows ?? []) clicksBy.set(c.item_id as string, (clicksBy.get(c.item_id as string) ?? 0) + 1);

  // Swap-in options: the best remaining jobs, skipping companies already picked.
  const usedJobs = new Set(items.map((i) => i.job_id).filter(Boolean) as string[]);
  const usedCompanies = new Set(picks.map((p) => p.company));
  const options = locked ? [] : choosePicks(await loadCandidates(db), 40, Date.now(), usedJobs).filter((c) => !usedCompanies.has(c.company_name)).slice(0, 12);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";
  const preview = renderPicks(issue, items, { siteUrl: site, subscriberId: "preview" });
  const when = new Date(issue.send_at).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const input = "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm";

  return (
    <>
      <Link href="/admin/picks" className="text-sm text-ink-2 hover:text-ink">← All issues</Link>
      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Picks for {new Date(`${issue.issue_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</h1>
          <p className="text-sm text-ink-2">
            {issue.status === "scheduled" && <>Goes out <b>{when} ET</b> on its own. Change anything below, or pause it.</>}
            {issue.status === "paused" && <>Paused. It won&apos;t go out unless you resume it before {when} ET.</>}
            {issue.status === "sending" && <>Sending now.</>}
            {issue.status === "sent" && <>Sent to {issue.recipients} subscribers.</>}
          </p>
        </div>
        {!locked && (
          <form action={setIssuePaused}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="pause" value={issue.status === "paused" ? "0" : "1"} />
            <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${issue.status === "paused" ? "bg-ink text-white" : "border border-line-strong bg-surface"}`}>
              {issue.status === "paused" ? "Resume" : "Pause this week"}
            </button>
          </form>
        )}
      </div>
      <AdminNotice msg={sp.msg} err={sp.err} />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,600px)]">
        <div className="space-y-6">
          <form action={saveIssueText} className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <input type="hidden" name="id" value={id} />
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-3">Subject line</label>
            <input name="subject" defaultValue={issue.subject} disabled={locked} className={input} />
            <label className="block pt-1 text-xs font-semibold uppercase tracking-wide text-ink-3">Opening line</label>
            <input name="intro" defaultValue={issue.intro} disabled={locked} className={input} />
            <label className="block pt-1 text-xs font-semibold uppercase tracking-wide text-ink-3">This week&apos;s number</label>
            <textarea name="stat_line" defaultValue={issue.stat_line ?? ""} disabled={locked} rows={2} className={input} />
            {!locked && <button className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white">Save</button>}
          </form>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-2">The picks ({picks.length})</h2>
            {picks.map((p) => (
              <div key={p.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-ink-3">#{p.position}</p>
                    {p.job_slug ? <Link href={`/jobs/${p.job_slug}`} target="_blank" className="font-semibold hover:underline">{p.title} · {p.company}</Link> : <p className="font-semibold">{p.title} · {p.company}</p>}
                    <p className="text-sm font-semibold text-accent">{p.pay}</p>
                    {p.meta && <p className="text-xs text-ink-3">{p.meta}</p>}
                  </div>
                  {locked ? (
                    <span className="text-sm text-ink-2">{clicksBy.get(p.id) ?? 0} clicks</span>
                  ) : (
                    <form action={removePick}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="issue_id" value={id} />
                      <button className="text-xs font-semibold text-red hover:underline">Remove</button>
                    </form>
                  )}
                </div>
                <form action={savePickTake} className="mt-2 space-y-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="issue_id" value={id} />
                  <label className="block text-xs font-semibold text-ink-3">Josh&apos;s take</label>
                  <textarea name="take" defaultValue={p.take} disabled={locked} rows={2} className={input} />
                  {!locked && <button className="rounded-md border border-line-strong px-3 py-1 text-xs font-semibold">Save take</button>}
                </form>
              </div>
            ))}
          </section>

          {skip && (
            <section className="rounded-xl border border-red/25 bg-surface p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-red">One to skip</h2>
              <p className="mt-1 text-xs text-ink-3">
                Based on <Link href={`/jobs/${skip.job_slug}`} target="_blank" className="underline">{skip.title}</Link>. The email describes the posting, never names the company.
              </p>
              <form action={savePickTake} className="mt-2 space-y-2">
                <input type="hidden" name="id" value={skip.id} />
                <input type="hidden" name="issue_id" value={id} />
                <textarea name="take" defaultValue={skip.take} disabled={locked} rows={3} className={input} />
                {!locked && (
                  <div className="flex gap-3">
                    <button className="rounded-md border border-line-strong px-3 py-1 text-xs font-semibold">Save</button>
                  </div>
                )}
              </form>
              {!locked && (
                <form action={removePick} className="mt-2">
                  <input type="hidden" name="id" value={skip.id} />
                  <input type="hidden" name="issue_id" value={id} />
                  <button className="text-xs font-semibold text-red hover:underline">Drop the skip this week</button>
                </form>
              )}
            </section>
          )}

          {!locked && picks.length < 5 && options.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-2">Add a pick</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {options.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <Link href={`/jobs/${c.slug}`} target="_blank" className="block truncate font-medium hover:underline">{c.title_raw} · {c.company_name}</Link>
                      <span className="text-xs text-ink-3">{pickPay(c)} · {pickMeta(c)}</span>
                    </span>
                    <form action={addPick}>
                      <input type="hidden" name="issue_id" value={id} />
                      <input type="hidden" name="job_id" value={c.id} />
                      <button className="rounded-md bg-ink px-2.5 py-1 text-xs font-semibold text-white">Add</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!locked && picks.length >= 5 && <p className="text-xs text-ink-3">To swap a pick, remove one and a list of replacements shows up here.</p>}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-2">Preview</h2>
          <iframe title="Email preview" srcDoc={preview.html} className="h-[1100px] w-full rounded-xl border border-line bg-white" />
        </div>
      </div>
    </>
  );
}
