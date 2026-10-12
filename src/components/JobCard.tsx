import Link from "next/link";
import type { JobView } from "@/lib/data";
import { freshnessLabel, isFresh } from "@/lib/freshness";
import { formatComp, formatLocation } from "@/lib/format";
import { CompanyLogo } from "./CompanyLogo";
import { SaveJobButton, HideJobButton } from "./Actions";
import { MatchBadge } from "./MatchBadge";
import { FlagChips } from "./BraunRead";
import { cardFlags, flagsFromCodes } from "@/lib/flags";
import type { MatchResult } from "@/lib/match";

export interface CardContext {
  savedJobIds?: Set<string>;
  matches?: Map<string, MatchResult>;
  back: string;
  allowHide?: boolean;
}

export function tagsFor(j: Pick<JobView, "sales_segment" | "sales_motion" | "self_sourcing_level">): string[] {
  const t: string[] = [];
  if (j.sales_segment !== "Unknown") t.push(j.sales_segment);
  if (j.sales_motion !== "Unknown") t.push(j.sales_motion);
  if (j.self_sourcing_level === "High") t.push("Outbound");
  if (j.self_sourcing_level === "Low") t.push("Inbound");
  return t;
}

export function JobCard({ job, ctx }: { job: JobView; ctx: CardContext }) {
  const comp = formatComp(job);
  const match = ctx.matches?.get(job.id);
  const fresh = isFresh(job.first_seen_at);
  return (
    <article className="group relative flex flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong hover:shadow-[0_2px_12px_rgba(22,20,15,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug">
          <Link href={`/jobs/${job.slug}`} className="after:absolute after:inset-0">
            {job.title_raw}
          </Link>
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${fresh ? "bg-fresh-soft text-fresh" : "text-ink-3"}`}
        >
          {freshnessLabel(job.first_seen_at)}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-ink-2">{formatLocation(job)}</p>

      <p className={`mt-3 text-[15px] font-semibold ${comp ? "text-accent" : "text-ink-3 font-normal text-sm"}`}>
        {comp || "Compensation not listed"}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <CompanyLogo name={job.company_name} logoUrl={job.company_logo_url} domain={job.company_domain} size={24} />
        <span className="text-sm font-medium">{job.company_name}</span>
      </div>

      {tagsFor(job).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tagsFor(job).map((t) => (
            <span key={t} className="rounded border border-line px-1.5 py-0.5 text-xs text-ink-2">
              {t}
            </span>
          ))}
        </div>
      )}

      <FlagChips flags={cardFlags(flagsFromCodes(job.flags))} max={2} />

      {job.summary && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-2">{job.summary}</p>}

      {match && (
        <div className="mt-3 border-t border-line pt-3">
          <MatchBadge match={match} />
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-4 text-sm">
        <div className="flex items-center gap-3">
          <SaveJobButton jobId={job.id} saved={!!ctx.savedJobIds?.has(job.id)} back={ctx.back} compact className="text-ink-2 hover:text-ink aria-pressed:font-semibold aria-pressed:text-fresh" />
          {ctx.allowHide && <HideJobButton jobId={job.id} back={ctx.back} />}
        </div>
        <Link href={`/jobs/${job.slug}`} className="font-semibold hover:underline">
          View Job →
        </Link>
      </div>
    </article>
  );
}

export function JobGrid({ jobs, ctx, empty = "Nothing here yet." }: { jobs: JobView[]; ctx: CardContext; empty?: string }) {
  if (!jobs.length) return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-3">{empty}</p>;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((j) => (
        <JobCard key={j.id} job={j} ctx={ctx} />
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
