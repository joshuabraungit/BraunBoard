import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { AdminNotice } from "@/components/AdminNotice";
import { CopyButton } from "@/components/CopyButton";
import { canRefund, getOrder, orderLines, resultsLink, reviewFields, reviewLink, videoUrl, type SponsoredJobRow } from "@/lib/sponsor";
import { REMOTE_TYPES, formatPrice } from "@/lib/sponsor-form";
import { reviewSummary, type AssetReview } from "@/lib/sponsor-review";
import { cancelOrder, editCopy, goLive, removeVideo, saveCarousel, saveLinkedInPost, saveLinkedInPost2, saveVideo2, sendReceiptAgain, setSponsoredStatus } from "../actions";
import { VideoUpload } from "../VideoUpload";
import { FastTrackAdmin } from "../FastTrackAdmin";
import { Badge, REVIEW_BADGE, STAGE_BADGE, day, firstName, nextStep, shortDay, stage } from "../shared";

const BTN = "inline-flex items-center rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90";
const BTN2 = "inline-flex items-center rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-bg";
const FIELD = "mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm";
const H2 = "mb-3 text-xs font-bold uppercase tracking-wide text-ink-3";

/** One thing the client reviews: its status, their note, a peek at it, and its edit form right underneath. */
function AssetCard({
  title,
  review,
  who,
  children,
  edit,
  editLabel = "Edit",
  editOpen = false,
}: {
  title: string;
  review: AssetReview | null;
  who: string;
  children?: React.ReactNode;
  edit?: React.ReactNode;
  editLabel?: string;
  editOpen?: boolean;
}) {
  const [text, cls] = review ? REVIEW_BADGE[review.status] : ["Not on the review link", "bg-bg text-ink-3 ring-1 ring-line"];
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <Badge text={text} cls={cls} />
      </div>
      {review?.note && (review.status === "down" || review.status === "changed") && (
        <p className="mt-2 rounded-md bg-amber-soft px-3 py-2 text-sm text-ink">
          <span className="font-semibold">{who}:</span> &ldquo;{review.note}
          &rdquo;
        </p>
      )}
      {children && <div className="mt-2 text-sm text-ink-2">{children}</div>}
      {edit && (
        <details className="mt-3" open={editOpen}>
          <summary className="cursor-pointer text-sm font-semibold text-ink underline underline-offset-2">{editLabel}</summary>
          <div className="mt-3">{edit}</div>
        </details>
      )}
    </div>
  );
}

const peek = (s: string, n = 180) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

function LinkRow({ label, url, open }: { label: string; url: string; open: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="text-sm font-semibold">{label}</span>
      <span className="flex gap-2">
        <CopyButton text={url} label="Copy" className="rounded-md border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold hover:bg-bg" />
        <a href={url} target="_blank" rel="noopener" className="rounded-md border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold hover:bg-bg">
          {open} ↗
        </a>
      </span>
    </div>
  );
}

export default async function SponsorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const r = await getOrder(id);
  if (!r) notFound();
  const now = new Date();
  const { data: liveRows } = await adminClient().from("sponsored_jobs").select("*").eq("status", "live");
  const spotsTaken = ((liveRows ?? []) as SponsoredJobRow[]).filter((x) => stage(x, now) === "running").length;

  const st = stage(r, now);
  const [label, cls] = STAGE_BADGE[st];
  const rev = reviewSummary(reviewFields(r));
  const step = nextStep(r, rev, now);
  const who = firstName(r);
  const review = reviewLink(r);
  const results = r.live_at && (r.status === "live" || r.status === "done") ? resultsLink(r) : null;
  const vid = videoUrl(r.video_path);
  const active = r.status === "paid" || r.status === "live";
  const startsLater = !!r.start_date && r.start_date > now.toISOString().slice(0, 10);

  const details = orderLines(r).filter(([k, v]) => ["Contact", "Link", "Base", "OTE", "Where", "Paid", "Logo"].includes(k) || (k === "Notes" && v));

  const stepTone = step.tone === "act" ? "border-ink bg-surface" : "border-line bg-bg";

  return (
    <>
      <Link href="/admin/sponsored" className="text-sm text-ink-2 hover:text-ink">
        ← All sponsored jobs
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{r.company}</h1>
        <Badge text={label} cls={cls} />
        {r.renewal_of && <Badge text="Renewal" cls="bg-accent-soft text-accent" />}
      </div>
      <p className="mt-1 text-sm text-ink-2">
        {r.job_title}
        {" · "}
        {r.live_at && r.ends_at ? `${day(r.live_at)} to ${day(r.ends_at)}` : `Ordered ${day(r.paid_at ?? r.created_at)}`}
        {r.live_at && ` · ${r.views.toLocaleString()} views · ${r.apply_clicks.toLocaleString()} apply clicks`}
      </p>

      <div className="mt-4">
        <AdminNotice msg={sp.msg} err={sp.err} />
      </div>

      {/* Next step */}
      <section className={`mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 ${stepTone}`}>
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-ink-3">Next step</div>
          <p className="font-semibold">{step.text}</p>
          {step.action === "go-live" && spotsTaken >= 2 && (
            <p className="mt-1 text-sm text-amber">Both home page spots are taken. It starts on its own when one opens, with its full 30 days.</p>
          )}
          {step.action === "go-live" && rev.video && rev.video.status !== "up" && (
            <p className="mt-1 text-sm text-ink-2">The video isn&apos;t approved yet. It joins the job page once it is.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {step.action === "copy-review" && review && <CopyButton text={review} label="Copy review link" className={BTN} />}
          {step.action === "copy-results" && results && <CopyButton text={results} label="Copy results link" className={BTN} />}
          {step.action === "go-live" && (
            <form action={goLive}>
              <input type="hidden" name="id" value={r.id} />
              <button className={BTN}>{startsLater ? `Approve for ${shortDay(r.start_date! + "T12:00:00")}` : "Mark live"}</button>
            </form>
          )}
          {step.action === "mark-done" && (
            <form action={setSponsoredStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="done" />
              <button className={BTN}>Mark done</button>
            </form>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        {/* Side panel: links and order details. Comes first on phones so the links are handy. */}
        <aside className="space-y-6 lg:order-2">
          <section>
            <h2 className={H2}>Links</h2>
            <div className="divide-y divide-line rounded-xl border border-line bg-surface px-4">
              {review && active && <LinkRow label="Review link" url={review} open={`What ${who} sees`} />}
              {results && <LinkRow label="Results page" url={results} open="Open" />}
              {["paid", "live", "done"].includes(r.status) && (
                <LinkRow label="Job page" url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com"}/sponsored/${r.id}`} open={st === "running" ? "View" : "Preview"} />
              )}
            </div>
          </section>

          <section>
            <h2 className={H2}>Order</h2>
            <div className="rounded-xl border border-line bg-surface px-4 py-3">
              <dl className="space-y-2 text-sm">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-ink-3">{k === "Link" ? "Apply link" : k}</dt>
                    <dd className="break-words">
                      {v.startsWith("http") ? (
                        <a href={v} target="_blank" rel="noopener" className="underline">
                          {k === "Logo" ? "View logo" : peek(v.replace(/^https?:\/\//, ""), 48)}
                        </a>
                      ) : (
                        v
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {["paid", "live", "done"].includes(r.status) && (
                <form action={sendReceiptAgain} className="mt-3 border-t border-line pt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-sm font-semibold underline underline-offset-2">Resend receipt</button>
                </form>
              )}
            </div>
          </section>
        </aside>

        <div className="min-w-0 space-y-8 lg:order-1">
          {/* What the client reviews */}
          {r.status !== "pending" && r.status !== "canceled" && (
            <section>
              <h2 className={H2}>What {who} reviews</h2>
              <div className="space-y-3">
                <AssetCard
                  title="Job ad"
                  review={rev.ad}
                  who={who}
                  editLabel="Edit job ad"
                  editOpen={rev.ad.status === "down"}
                  edit={
                    <form action={editCopy} className="space-y-3">
                      <input type="hidden" name="id" value={r.id} />
                      {(
                        [
                          ["job_title", "Job title", r.job_title, 140, 1],
                          ["job_url", "Link to apply", r.job_url, 2000, 1],
                          ["description", "Description (## Heading, - bullet, 1. numbered, **bold**)", r.description, 10000, 8],
                          ["product_short", "What you'd sell: headline (4 to 8 words)", r.product_short ?? "", 80, 1],
                          ["product_story", "What you'd sell: story (under 60 words)", r.product_story ?? "", 500, 3],
                          ["buyer_short", "Who you'd sell to", r.buyer_short ?? "", 100, 1],
                          ["ote_attainment_pct", "% of ramped reps who hit OTE last year (blank = not shared)", r.ote_attainment_pct?.toString() ?? "", 4, 1],
                        ] as const
                      ).map(([name, lbl, value, max, rows]) => (
                        <label key={name} className="block">
                          <span className="text-xs text-ink-2">{lbl}</span>
                          {rows > 1 ? (
                            <textarea name={name} defaultValue={value} rows={rows} maxLength={max} className={FIELD} />
                          ) : (
                            <input name={name} defaultValue={value} maxLength={max} className={FIELD} />
                          )}
                        </label>
                      ))}
                      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                        <label className="block">
                          <span className="text-xs text-ink-2">Remote or in office?</span>
                          <select name="remote_type" defaultValue={r.remote_type} className={FIELD}>
                            {REMOTE_TYPES.map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs text-ink-2">Location (blank = none)</span>
                          <input name="location" defaultValue={r.location ?? ""} maxLength={120} className={FIELD} />
                        </label>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="first_sales_hire" defaultChecked={!!r.first_sales_hire} className="h-4 w-4" />
                        <span>First sales hire badge (only shows when there&apos;s no OTE %)</span>
                      </label>
                      <button className={BTN}>Save job ad</button>
                      <p className="text-xs text-ink-3">Updates the live card right away. If {who} already weighed in, it goes back to them for another look.</p>
                    </form>
                  }
                >
                  {r.product_short && <p className="font-semibold text-ink">{r.product_short}</p>}
                  <p>{peek(r.description.replace(/[#*]/g, "").replace(/\s+/g, " ").trim())}</p>
                </AssetCard>

                <AssetCard
                  title="Explainer video"
                  review={rev.video}
                  who={who}
                  editLabel={vid ? "Replace or remove" : "Upload a video"}
                  edit={
                    <div className="flex flex-wrap items-center gap-3">
                      <VideoUpload id={r.id} hasVideo={!!r.video_path} />
                      {vid && (
                        <form action={removeVideo}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-sm text-red underline">Remove video</button>
                        </form>
                      )}
                    </div>
                  }
                >
                  {vid ? (
                    <a href={vid} target="_blank" rel="noopener" className="underline">
                      Watch the current video ↗
                    </a>
                  ) : (
                    <span className="text-ink-3">Optional. Nothing uploaded yet.</span>
                  )}
                </AssetCard>

                <AssetCard
                  title="LinkedIn post"
                  review={rev.post}
                  who={who}
                  editLabel={r.linkedin_post ? "Edit post" : "Add the post"}
                  editOpen={rev.post?.status === "down"}
                  edit={
                    <form action={saveLinkedInPost} className="space-y-2">
                      <input type="hidden" name="id" value={r.id} />
                      <textarea
                        name="linkedin_post"
                        defaultValue={r.linkedin_post ?? ""}
                        rows={10}
                        maxLength={5000}
                        placeholder="Paste the post exactly as it'll go on LinkedIn, link included."
                        className={FIELD}
                      />
                      <button className={BTN}>Save post</button>
                    </form>
                  }
                >
                  {r.linkedin_post ? <p className="whitespace-pre-wrap">{peek(r.linkedin_post)}</p> : <span className="text-ink-3">Not written yet.</span>}
                </AssetCard>

                {r.linkedin_post_2 && (
                  <AssetCard
                    title="Second LinkedIn post"
                    review={rev.post2}
                    who={who}
                    editLabel="Edit second post"
                    editOpen={rev.post2?.status === "down"}
                    edit={<Post2Form r={r} who={who} />}
                  >
                    <p className="whitespace-pre-wrap">{peek(r.linkedin_post_2)}</p>
                  </AssetCard>
                )}
                {r.video2_url && (
                  <AssetCard title="Bonus video" review={rev.video2} who={who} editLabel="Edit link" edit={<Video2Form r={r} />}>
                    <a href={r.video2_url} target="_blank" rel="noopener" className="underline">
                      Watch ↗
                    </a>
                  </AssetCard>
                )}
                {r.carousel_slides && (
                  <AssetCard
                    title="LinkedIn carousel"
                    review={rev.carousel}
                    who={who}
                    editLabel="Edit carousel"
                    editOpen={rev.carousel?.status === "down"}
                    edit={<CarouselForm r={r} />}
                  >
                    {r.carousel_slides.split("\n").filter(Boolean).length} slides
                  </AssetCard>
                )}

                {/* Extras that aren't added yet, tucked behind one button */}
                {(!r.linkedin_post_2 && r.linkedin_post) || !r.video2_url || !r.carousel_slides ? (
                  <details className="rounded-xl border border-dashed border-line-strong px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold">+ Add something else for review</summary>
                    <div className="mt-3 space-y-5">
                      {!r.linkedin_post_2 && r.linkedin_post && (
                        <div>
                          <h3 className="mb-2 text-sm font-semibold">Second LinkedIn post</h3>
                          <Post2Form r={r} who={who} />
                        </div>
                      )}
                      {!r.video2_url && (
                        <div>
                          <h3 className="mb-2 text-sm font-semibold">Bonus video</h3>
                          <Video2Form r={r} />
                        </div>
                      )}
                      {!r.carousel_slides && (
                        <div>
                          <h3 className="mb-2 text-sm font-semibold">LinkedIn carousel</h3>
                          <CarouselForm r={r} />
                        </div>
                      )}
                    </div>
                  </details>
                ) : null}
              </div>
            </section>
          )}

          {active && (
            <section>
              <h2 className={H2}>Fast Track</h2>
              <FastTrackAdmin id={r.id} cfg={r} />
            </section>
          )}

          {r.status === "canceled" && r.refunded_at && (
            <p className="text-sm text-ink-2">
              {r.stripe_refund_id ? `Refunded ${formatPrice(r.amount_cents)}` : "Canceled"} on {day(r.refunded_at)}.{r.cancel_reason ? ` Reason: ${r.cancel_reason}` : ""}
            </p>
          )}

          {/* Danger zone */}
          {(st === "running" || st === "scheduled" || canRefund(r, now)) && (
            <section>
              <h2 className={H2}>Danger zone</h2>
              <div className="space-y-3 rounded-xl border border-red/20 bg-red-soft/30 px-4 py-3">
                {(st === "running" || st === "scheduled") && (
                  <form action={setSponsoredStatus} className="flex flex-wrap items-center justify-between gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="done" />
                    <span className="text-sm text-ink-2">Pull it off the home page early.</span>
                    <button className={BTN2}>Take down now</button>
                  </form>
                )}
                {canRefund(r, now) && (
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-red">Cancel and refund…</summary>
                    <form action={cancelOrder} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={r.id} />
                      <label className="block text-xs text-ink-2" htmlFor="reason">
                        Reason (optional). It goes in the email to {r.contact_name}, right after &ldquo;I can&apos;t run this one on Braun Board.&rdquo;
                      </label>
                      <textarea id="reason" name="reason" rows={2} maxLength={500} placeholder="Sponsored jobs have to be sales roles with base pay listed." className={FIELD} />
                      <button className="rounded-md bg-red px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
                        {r.amount_cents > 0 ? `Refund ${formatPrice(r.amount_cents)} and cancel` : "Cancel (nothing to refund)"}
                      </button>
                      <p className="text-xs text-ink-3">Refunds in Stripe right away. Can&apos;t be undone.</p>
                    </form>
                  </details>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Post2Form({ r, who }: { r: SponsoredJobRow; who: string }) {
  return (
    <form action={saveLinkedInPost2} className="space-y-2">
      <input type="hidden" name="id" value={r.id} />
      <label className="block text-xs text-ink-2">
        Note to {who} above the post (optional)
        <textarea name="linkedin_post_2_intro" defaultValue={r.linkedin_post_2_intro ?? ""} rows={2} maxLength={1000} className={FIELD} />
      </label>
      <textarea
        name="linkedin_post_2"
        defaultValue={r.linkedin_post_2 ?? ""}
        rows={8}
        maxLength={5000}
        placeholder="Paste the second post exactly as it'll go on LinkedIn."
        className={FIELD}
      />
      <button className={BTN}>Save second post</button>
    </form>
  );
}

function Video2Form({ r }: { r: SponsoredJobRow }) {
  return (
    <form action={saveVideo2} className="flex flex-wrap gap-2">
      <input type="hidden" name="id" value={r.id} />
      <input name="video2_url" defaultValue={r.video2_url ?? ""} placeholder="https:// link to the .mp4" className={`${FIELD} mt-0 min-w-0 flex-1`} />
      <button className={BTN}>Save video</button>
    </form>
  );
}

function CarouselForm({ r }: { r: SponsoredJobRow }) {
  return (
    <form action={saveCarousel} className="space-y-2">
      <input type="hidden" name="id" value={r.id} />
      <textarea
        name="carousel_intro"
        defaultValue={r.carousel_intro ?? ""}
        rows={2}
        maxLength={1000}
        placeholder="Optional note to the client, shown above the slides."
        className={FIELD}
      />
      <textarea
        name="carousel_slides"
        defaultValue={r.carousel_slides ?? ""}
        rows={5}
        placeholder="Slide image links, one per line, in order. Blank clears it."
        className={`${FIELD} font-mono text-xs`}
      />
      <input name="carousel_pdf_url" defaultValue={r.carousel_pdf_url ?? ""} placeholder="https:// link to the PDF" className={FIELD} />
      <button className={BTN}>Save carousel</button>
    </form>
  );
}
