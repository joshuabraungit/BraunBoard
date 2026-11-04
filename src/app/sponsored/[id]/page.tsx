import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import { OteBadge, sponsorWhere } from "@/components/SponsoredCard";
import { bump, getOrder, logoUrl, reviewFields, videoUrl } from "@/lib/sponsor";
import { videoApproved } from "@/lib/sponsor-review";
import { AdText } from "@/components/AdText";
import { VideoLightbox } from "@/components/VideoLightbox";
import { isRunning, payLine } from "@/lib/sponsor-form";
import { isUuid } from "@/lib/picks-subscribe";
import { isBot } from "@/lib/visits";
import { getUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!isUuid(id)) return null;
  const s = await getOrder(id);
  // Public once it has gone live (and after it ends, so old links still work). Paid-but-not-live is admin preview only.
  if (!s || !["paid", "live", "done"].includes(s.status)) return null;
  return s;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await load((await params).id);
  return {
    title: s ? `${s.job_title} at ${s.company} · Sponsored · Braun Board` : "Braun Board",
    robots: { index: false, follow: true },
  };
}

export default async function SponsoredJobPage({ params }: Props) {
  const { id } = await params;
  const s = await load(id);
  if (!s) notFound();

  const admin = isAdmin(await getUser());
  const running = isRunning(s);
  const video = s.video_path && videoApproved(reviewFields(s)) ? videoUrl(s.video_path) : null;
  const adParts = splitAfterSellSection(s.description);
  const hasRun = s.status === "done" || (s.status === "live" && !!s.ends_at && new Date(s.ends_at) <= new Date());
  if (!running && !hasRun && !admin) notFound();

  const ended = hasRun && !!s.live_at && !!s.ends_at;
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  const ua = (await headers()).get("user-agent") ?? "";
  if (running && !admin && !isBot(ua)) await bump(s.id, "view");

  return (
    <div className="mx-auto max-w-2xl">
      {admin && !running && (
        <p className="mb-5 rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber">
          Admin preview. {hasRun ? "This sponsorship has ended." : "Visitors can't see this until it's live."}
        </p>
      )}
      {ended && (
        <div className="mb-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <p className="text-[17px] font-semibold text-ink">
            This job was featured {day(s.live_at!)} to {day(s.ends_at!)}.
          </p>
          <p className="mt-1 text-[15px] text-ink-2">It may be filled by now.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`/sponsored/${s.id}/apply`}
              rel="nofollow noopener"
              target="_blank"
              className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-bg px-4 text-sm font-semibold text-ink hover:bg-surface"
            >
              Check if it&apos;s still open ↗
            </a>
            <Link href="/new" className="inline-flex min-h-11 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:opacity-90">
              See today&apos;s sales jobs →
            </Link>
          </div>
        </div>
      )}
      <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber">Sponsored</span>

      {/* Phones: logo on top, so the title gets the full width. */}
      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
        <CompanyLogo name={s.company} logoUrl={logoUrl(s.logo_path)} domain={null} size={56} />
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{s.job_title}</h1>
          <p className="mt-1 text-ink-2">
            {s.company} · {sponsorWhere(s)}
          </p>
        </div>
      </div>

      {/* Wraps between base and OTE, never inside a range. */}
      <p className="mt-5 text-lg font-semibold text-accent">
        {payLine(s)
          .split(" · ")
          .map((part, i) => (
            <span key={part}>
              {i > 0 && " · "}
              <span className="whitespace-nowrap">{part}</span>
            </span>
          ))}
      </p>
      {(s.ote_attainment_pct != null || s.first_sales_hire) && (
        <p className="mt-2">
          <OteBadge s={s} />
        </p>
      )}
      {s.buyer_short && (
        <p className="mt-3 text-[15px]">
          <span className="text-ink-3">Who you&apos;d sell to: </span>
          <span className="font-semibold">{s.buyer_short}</span>
        </p>
      )}

      {/* The video waits in a lightbox, right under the ad's "what you'll sell" part (or up top if the ad has no such part). */}
      {video && !adParts.rest && <VideoLightbox src={video} className="mt-6" />}
      <AdText text={adParts.lead} className="mt-6" />
      {video && adParts.rest && <VideoLightbox src={video} className="mb-2 mt-1" />}
      {adParts.rest && <AdText text={adParts.rest} className="mt-7" />}

      {/* The headline alone lives on the home page card; the box is for when there's a story to tell. */}
      {s.product_story && (
        <section className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-3">What {s.company} sells, in plain English</h2>
          {s.product_short && <p className="mt-2 text-[17px] font-bold leading-snug">{s.product_short}</p>}
          {s.product_story && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.product_story}</p>}
        </section>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        {/* Plain <a>, not <Link>, so prefetching never counts as an apply click. */}
        <a
          href={`/sponsored/${s.id}/apply`}
          rel="nofollow noopener"
          target="_blank"
          className="mt-0 flex min-h-12 w-full items-center justify-center rounded-lg bg-ink px-5 py-2 text-center text-[15px] font-semibold text-white hover:opacity-90 sm:inline-flex sm:min-h-11 sm:w-auto sm:text-sm"
        >
          {ended ? `Check if it's still open on ${s.company}'s site ↗` : `Apply on ${s.company}'s site ↗`}
        </a>
        {!ended && (
          // Credit for the sponsor's renewal: most application forms ask how you heard about the job.
          <p className="mt-3 text-sm text-ink-2">
            When the application asks how you heard about the job, say <span className="font-semibold text-ink">Braun Board</span>. It helps
            me bring you more jobs like this one.
          </p>
        )}
        <p className="mt-4 text-sm text-ink-2">
          Before your first call, here are{" "}
          <Link href="/kit?from=job-page#top-five" className="font-semibold text-ink underline underline-offset-2">
            the five questions I ask in every sales interview
          </Link>
          .
        </p>
      </div>

      <p className="mt-6 text-xs text-ink-3">
        {s.company} paid to feature this job. Sponsored jobs have to be sales roles and show base pay. I don&apos;t give them a Braun Read.
      </p>
    </div>
  );
}

/**
 * Splits the ad right after its opening "What will you sell?" section, so the video button can sit there.
 * When the ad doesn't open with a sell section, everything stays in `lead`.
 */
function splitAfterSellSection(text: string): { lead: string; rest: string | null } {
  const first = text.match(/^\s*##\s+(.+)$/m);
  if (!first || !/sell/i.test(first[1])) return { lead: text, rest: null };
  const next = text.indexOf("\n## ", (first.index ?? 0) + first[0].length);
  if (next === -1) return { lead: text, rest: null };
  return { lead: text.slice(0, next).trimEnd(), rest: text.slice(next + 1) };
}
