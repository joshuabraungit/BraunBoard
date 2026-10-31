import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { AdminNotice } from "@/components/AdminNotice";
import { CopyButton } from "@/components/CopyButton";
import { canRefund, orderLines, reviewFields, reviewLink, videoUrl, type SponsoredJobRow } from "@/lib/sponsor";
import { formatPrice, isRunning } from "@/lib/sponsor-form";
import { reviewSummary, type AssetReview } from "@/lib/sponsor-review";
import { cancelOrder, editCopy, goLive, removeVideo, sendReceiptAgain, setSponsoredStatus } from "./actions";
import { VideoUpload } from "./VideoUpload";

const REVIEW_BADGE: Record<AssetReview["status"], [string, string]> = {
  waiting: ["Waiting on client", "bg-bg text-ink-2 ring-1 ring-line"],
  changed: ["Changed since their review", "bg-bg text-ink-2 ring-1 ring-line"],
  up: ["Approved", "bg-accent-soft text-accent"],
  down: ["Changes requested", "bg-amber-soft text-amber"],
};

function ReviewRow({ label, a }: { label: string; a: AssetReview }) {
  const [text, cls] = REVIEW_BADGE[a.status];
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="w-16 shrink-0 text-ink-3">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>
      {a.note && (a.status === "down" || a.status === "changed") && <span className="min-w-0 flex-1 text-ink-2">&ldquo;{a.note}&rdquo;</span>}
    </div>
  );
}

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
          const reviewable = r.status === "paid" || r.status === "live";
          const rev = reviewSummary(reviewFields(r));
          const link = reviewLink(r);
          const vid = videoUrl(r.video_path);
          return (
            <li key={r.id} className="rounded-xl border border-line bg-surface">
              <details open={st === "approve"}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {r.renewal_of && <span className="mr-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">Renewal</span>}
                    {r.job_title} · {r.company}
                  </span>
                  {st === "approve" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rev.allApproved ? "bg-accent-soft text-accent" : rev.changesRequested ? "bg-amber-soft text-amber" : "bg-bg text-ink-2 ring-1 ring-line"}`}
                    >
                      {rev.allApproved ? "Client approved ✓" : rev.changesRequested ? "Client wants changes" : r.review_opened_at ? "Client opened the link" : "Client hasn't reviewed"}
                    </span>
                  )}
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
                  {reviewable && link && (
                    <section className="mt-4 space-y-3 rounded-lg border border-line px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold">Client review</h2>
                        <span className="text-xs text-ink-3">
                          {r.review_sent_at ? `${r.contact_name.split(" ")[0]} sent their thumbs ${day(r.review_sent_at)}` : r.review_opened_at ? `Opened ${day(r.review_opened_at)}, not sent yet` : "Link not opened yet"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {rev.video ? <ReviewRow label="Video" a={rev.video} /> : <div className="flex gap-3"><span className="w-16 shrink-0 text-ink-3">Video</span><span className="text-ink-3">None yet. Upload one to add it to the review.</span></div>}
                        <ReviewRow label="Job ad" a={rev.ad} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CopyButton text={link} label="Copy review link" className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90" />
                        <a href={link} target="_blank" rel="noopener" className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold">
                          See what {r.contact_name.split(" ")[0]} sees ↗
                        </a>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                        <VideoUpload id={r.id} hasVideo={!!r.video_path} />
                        {vid && (
                          <>
                            <a href={vid} target="_blank" rel="noopener" className="text-sm underline">Watch current video</a>
                            <form action={removeVideo}>
                              <input type="hidden" name="id" value={r.id} />
                              <button className="text-sm text-red underline">Remove</button>
                            </form>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-ink-3">
                        The video shows on the job page once she approves it. Edit the copy or swap the video and the review link asks them to look again. Going live is still your button.
                      </p>
                    </section>
                  )}
                  {r.status !== "canceled" && r.status !== "pending" && (
                    <details className="mt-3 rounded-lg border border-line px-3 py-2">
                      <summary className="cursor-pointer text-sm font-semibold">Edit copy</summary>
                      <form action={editCopy} className="mt-3 space-y-3">
                        <input type="hidden" name="id" value={r.id} />
                        {(
                          [
                            ["job_title", "Job title", r.job_title, 140, 1],
                            ["job_url", "Link to apply", r.job_url, 2000, 1],
                            ["description", "Description (the card shows about 3 lines). Formatting: ## Heading, - bullet, 1. numbered, **bold**", r.description, 10000, 8],
                            ["product_short", "What they sell: headline (4 to 8 words)", r.product_short ?? "", 80, 1],
                            ["product_story", "What they sell: story (2 to 4 sentences, under 60 words)", r.product_story ?? "", 500, 3],
                            ["ote_attainment_pct", "% of ramped reps who hit OTE last year (blank = not shared)", r.ote_attainment_pct?.toString() ?? "", 4, 1],
                          ] as const
                        ).map(([name, label, value, max, rows]) => (
                          <label key={name} className="block">
                            <span className="text-xs text-ink-2">{label}</span>
                            {rows > 1 ? (
                              <textarea name={name} defaultValue={value} rows={rows} maxLength={max} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm" />
                            ) : (
                              <input name={name} defaultValue={value} maxLength={max} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm" />
                            )}
                          </label>
                        ))}
                        <button className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">Save copy</button>
                        <p className="text-xs text-ink-3">Updates the home page card and job page right away. Pay, location and dates stay as the buyer sent them.</p>
                      </form>
                    </details>
                  )}
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
                    {["paid", "live", "done"].includes(r.status) && (
                      <form action={sendReceiptAgain}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm">Resend receipt</button>
                      </form>
                    )}
                  </div>
                  {canRefund(r, now) && (
                    <details className="mt-3 rounded-lg border border-red/20 bg-red-soft/40 px-3 py-2">
                      <summary className="cursor-pointer text-sm font-semibold text-red">Cancel and refund…</summary>
                      <form action={cancelOrder} className="mt-2 space-y-2">
                        <input type="hidden" name="id" value={r.id} />
                        <label className="block text-xs text-ink-2" htmlFor={`reason-${r.id}`}>
                          Reason (optional). It goes in the email to {r.contact_name}, right after &ldquo;I can&apos;t run this one on Braun Board.&rdquo;
                        </label>
                        <textarea
                          id={`reason-${r.id}`}
                          name="reason"
                          rows={2}
                          maxLength={500}
                          placeholder="Sponsored jobs have to be sales roles with base pay listed."
                          className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
                        />
                        <button className="rounded-md bg-red px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                          {r.amount_cents > 0 ? `Refund ${formatPrice(r.amount_cents)} and cancel` : "Cancel (nothing to refund)"}
                        </button>
                        <p className="text-xs text-ink-3">Refunds in Stripe right away and can&apos;t be undone.</p>
                      </form>
                    </details>
                  )}
                  {r.status === "canceled" && r.refunded_at && (
                    <p className="mt-3 text-xs text-ink-2">
                      {r.stripe_refund_id ? `Refunded ${formatPrice(r.amount_cents)}` : "Canceled"} on {day(r.refunded_at)}.{r.cancel_reason ? ` Reason: ${r.cancel_reason}` : ""}
                    </p>
                  )}
                  {st === "approve" && !rev.allApproved && (
                    <p className="mt-2 text-xs text-amber">Heads up: the client hasn&apos;t approved everything yet.</p>
                  )}
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
