import Link from "next/link";
import { listJobsWithTotal, type JobFilters } from "@/lib/data";
import { JobGrid } from "@/components/JobCard";
import { getUserState } from "@/lib/session";
import { watchSearch } from "@/app/actions";
import { REMOTE_TYPES, ROLE_FAMILIES, SALES_MOTIONS, SALES_SEGMENTS } from "@/lib/ingest/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

const DEFAULT_POSTED_DAYS = 90;
const PAGE_SIZE = 60;

function toFilters(sp: SP): JobFilters {
  const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
  const num = (v?: string) => (v && !isNaN(+v) ? +v : undefined);
  return {
    q: sp.q || undefined,
    role: pick(sp.role, ROLE_FAMILIES),
    segment: pick(sp.segment, SALES_SEGMENTS),
    motion: pick(sp.motion, SALES_MOTIONS),
    remote: pick(sp.remote, REMOTE_TYPES),
    country: pick(sp.country, ["US", "CA"] as const),
    minBase: num(sp.minBase),
    minOte: num(sp.minOte),
    // Default to the last 90 days so old postings don't bury fresh ones. "all" means any time.
    postedWithinDays: sp.posted === "all" ? undefined : (num(sp.posted) ?? DEFAULT_POSTED_DAYS),
  };
}

function Select({ name, label, options, value }: { name: string; label: string; options: readonly string[]; value?: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm" aria-label={label}>
      <option value="">{label}</option>
      {options.filter((o) => o !== "Unknown").map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export default async function AllJobs({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const [{ jobs, total }, state] = await Promise.all([
    listJobsWithTotal(toFilters(sp), PAGE_SIZE, { offset: (page - 1) * PAGE_SIZE }),
    getUserState(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // The search itself, without the page number (used for watches and page links).
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();
  const pageHref = (n: number) => {
    const p = new URLSearchParams(qs);
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return `/jobs${s ? `?${s}` : ""}`;
  };
  const first = (page - 1) * PAGE_SIZE + 1;
  const hasFilters = qs.length > 0;
  const suggestedName = [sp.segment, sp.role === "Account Executive" ? "AE" : sp.role, sp.remote, sp.country === "CA" ? "Canada" : null, sp.minOte && `$${Math.round(+sp.minOte / 1000)}K+ OTE`, sp.q]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">All Jobs</h1>
      <form className="mb-6 mt-4 flex flex-wrap gap-2" action="/jobs">
        <input name="q" defaultValue={sp.q} placeholder="Keyword or company" className="min-w-0 flex-1 basis-48 rounded-md border border-line bg-surface px-3 py-1.5 text-sm" />
        <Select name="role" label="Any role" options={ROLE_FAMILIES} value={sp.role} />
        <Select name="segment" label="Any segment" options={SALES_SEGMENTS} value={sp.segment} />
        <Select name="motion" label="Any motion" options={SALES_MOTIONS.filter((m) => m !== "Channel")} value={sp.motion} />
        <Select name="remote" label="Any workplace" options={REMOTE_TYPES} value={sp.remote} />
        <select name="country" defaultValue={sp.country ?? ""} className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm" aria-label="Country">
          <option value="">US + Canada</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
        <select name="minBase" defaultValue={sp.minBase ?? ""} className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm" aria-label="Minimum base">
          <option value="">Any base</option>
          {[100, 125, 150, 175, 200].map((k) => <option key={k} value={k * 1000}>${k}K+ base</option>)}
        </select>
        <select name="minOte" defaultValue={sp.minOte ?? ""} className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm" aria-label="Minimum OTE">
          <option value="">Any OTE</option>
          {[150, 200, 250, 300, 400].map((k) => <option key={k} value={k * 1000}>${k}K+ OTE</option>)}
        </select>
        <select name="posted" defaultValue={sp.posted ?? ""} className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm" aria-label="Posted">
          <option value="">Last 90 days</option>
          <option value="30">Last 30 days</option>
          <option value="7">Last 7 days</option>
          <option value="3">Last 3 days</option>
          <option value="1">Last 24h</option>
          <option value="all">Any time</option>
        </select>
        <button className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white">Search</button>
      </form>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-3">
          {total.toLocaleString()} {total === 1 ? "job" : "jobs"}
          {!sp.posted && " posted in the last 90 days"}
          {pages > 1 && jobs.length > 0 && ` · showing ${first.toLocaleString()}–${(first + jobs.length - 1).toLocaleString()}`}
        </p>
        {hasFilters && (
          <form action={watchSearch} className="flex w-full items-center gap-2 sm:w-auto">
            <input type="hidden" name="qs" value={qs} />
            <input name="name" defaultValue={suggestedName} aria-label="Name this watch" placeholder="Name this watch" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm sm:w-56 sm:flex-none" />
            <button className="whitespace-nowrap rounded-md border border-ink px-3 py-1.5 text-sm font-semibold hover:bg-ink hover:text-white">♡ Watch this search</button>
          </form>
        )}
      </div>
      <JobGrid
        jobs={jobs}
        ctx={{ savedJobIds: state.savedJobIds, back: pageHref(page) }}
        empty={page > 1 ? "That page is past the end of the results." : "No jobs match those filters."}
      />
      {(pages > 1 || page > 1) && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={pageHref(Math.min(page - 1, pages))} rel="prev" className="rounded-md border border-line px-3 py-1.5 font-semibold hover:border-ink">
              ← Newer
            </Link>
          ) : (
            <span className="rounded-md border border-line px-3 py-1.5 text-ink-3">← Newer</span>
          )}
          <span className="text-ink-3">
            Page {page.toLocaleString()} of {pages.toLocaleString()}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} rel="next" className="rounded-md border border-line px-3 py-1.5 font-semibold hover:border-ink">
              Older →
            </Link>
          ) : (
            <span className="rounded-md border border-line px-3 py-1.5 text-ink-3">Older →</span>
          )}
        </nav>
      )}
    </>
  );
}
