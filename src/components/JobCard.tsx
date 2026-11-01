import Link from "next/link";
import type { JobView } from "@/lib/data";
import { freshnessLabel, isFresh } from "@/lib/freshness";
import { languageFor, formatComp, formatLocation } from "@/lib/format";
import { CompanyLogo } from "./CompanyLogo";
import { SaveJobButton, HideJobButton } from "./Actions";
import { MatchBadge } from "./MatchBadge";
import { FlagChips, VerdictPill } from "./BraunRead";
import { braunRead, cardFlags, flagsFromCodes } from "@/lib/flags";
import type { MatchResult } from "@/lib/match";
import { attainmentLabel } from "@/lib/attainment";
import { collapseOpenings, openingsLabel } from "@/lib/openings";

export interface CardContext {
  savedJobIds?: Set<string>;
  matches?: Map<string, MatchResult>;
  back: string;
  allowHide?: boolean;
}

export function tagsFor(j: Pick<JobView, "sales_segment" | "sales_motion" | "self_sourcing_level"> & { title_raw?: string }): string[] {
  const t: string[] = [];
  const lang = j.title_raw ? languageFor(j.title_raw) : null;
  if (lang) t.push(lang);
  if (j.sales_segment !== "Unknown") t.push(j.sales_segment);
  if (j.sales_motion !== "Unknown") t.push(j.sales_motion === "Channel" ? "Partnerships" : j.sales_motion);
  if (j.self_sourcing_level === "High") t.push("Outbound");
  if (j.self_sourcing_level === "Low") t.push("Inbound");
  return t;
}

/** The one light worth showing on a card: real attainment numbers first, then the most telling flag. */
function topLight(job: JobView) {
  if (job.attainment?.kind === "hit") return <span title={`In their words: "${job.attainment.quote}"`} className="rounded border border-accent/25 bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">✓ {attainmentLabel(job.attainment)}</span>;
  return <FlagChips flags={cardFlags(flagsFromCodes(job.flags))} max={1} inline />;
}

/**
 * A job card answers one question: is this worth a click? Title, who and where, the pay, the
 * Braun Read, and what you'd sell in plain English. Tags and the long summary live on the job page.
 */
export function JobCard({ job, ctx, openings = 1, locations = 1 }: { job: JobView; ctx: CardContext; openings?: number; locations?: number }) {
  const more = openingsLabel({ openings, locations });
  const comp = formatComp(job);
  const match = ctx.matches?.get(job.id);
  const fresh = isFresh(job.first_seen_at);
  const read = braunRead({ ...job, description_raw: null });
  return (
    <article className="group relative flex flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong hover:shadow-[0_2px_12px_rgba(22,20,15,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug">
          <Link href={`/jobs/${job.slug}`} className="after:absolute after:inset-0">
            {job.title_raw}
          </Link>
        </h3>
        <div className="relative z-10 -mr-1 -mt-1 flex shrink-0 items-center">
          <SaveJobButton
            jobId={job.id}
            saved={!!ctx.savedJobIds?.has(job.id)}
            back={ctx.back}
            icon
            className="rounded-full px-2 py-0.5 text-lg leading-none text-ink-3 hover:text-ink aria-pressed:text-fresh"
          />
        </div>
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
        <CompanyLogo name={job.company_name} logoUrl={job.company_logo_url} domain={job.company_domain} size={18} />
        <span className="min-w-0">
          <span className="font-medium text-ink">{job.company_name}</span> · {formatLocation(job)} ·{" "}
          <span className={fresh ? "font-medium text-fresh" : ""}>{freshnessLabel(job.first_seen_at)}</span>
          {more && <span className="font-medium text-ink"> · {more}</span>}
        </span>
      </p>

      <p className={`mt-2 text-[15px] font-semibold ${comp ? "text-accent" : "text-sm font-normal text-ink-3"}`}>
        {comp || "Pay not listed"}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <VerdictPill verdict={read.verdict} />
        {topLight(job)}
      </div>

      {job.company_sells && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-2">
          <span className="text-ink-3">Sells: </span>
          {job.company_sells}
        </p>
      )}

      {match && (
        <div className="mt-3 border-t border-line pt-3">
          <MatchBadge match={match} />
        </div>
      )}

      {ctx.allowHide && (
        <div className="relative z-10 mt-auto pt-3 text-sm">
          <HideJobButton jobId={job.id} back={ctx.back} />
        </div>
      )}
    </article>
  );
}

export function JobGrid({ jobs, ctx, empty = "Nothing here yet." }: { jobs: JobView[]; ctx: CardContext; empty?: string }) {
  if (!jobs.length) return empty ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-3">{empty}</p> : null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {collapseOpenings(jobs).map(({ job, openings, locations }) => (
        <JobCard key={job.id} job={job} ctx={ctx} openings={openings} locations={locations} />
      ))}
    </div>
  );
}

export function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {href && (
          <Link href={href} className="text-sm text-ink-2 hover:text-ink">
            See all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
