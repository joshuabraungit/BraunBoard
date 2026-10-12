import Link from "next/link";
import { notFound } from "next/navigation";
import { countOtherOpenRoles, getJob } from "@/lib/data";
import { braunRead } from "@/lib/flags";
import { BraunReadPanel } from "@/components/BraunRead";
import { freshnessLabel } from "@/lib/freshness";
import { formatComp, formatLocation, money } from "@/lib/format";
import { CompanyLogo } from "@/components/CompanyLogo";
import { tagsFor } from "@/components/JobCard";
import { SaveJobButton, WatchCompanyButton } from "@/components/Actions";
import { MatchBadge } from "@/components/MatchBadge";
import { getActiveWatch, getUserState } from "@/lib/session";
import { scoreMatch } from "@/lib/match";

export const dynamic = "force-dynamic";

const DISCLOSURE_LABELS: Record<string, string> = {
  quota_size: "Quota size",
  quota_attainment: "Quota attainment",
  average_deal_size: "Average deal size",
  territory: "Territory",
  sales_cycle: "Sales cycle length",
};

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className={`mt-0.5 text-[15px] ${value ? "font-semibold" : "text-ink-3"}`}>{value ?? "Not disclosed"}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-5">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-2">{title}</h2>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

const range = (a: number | null, b: number | null) => (a == null ? null : a === b || b == null ? money(a) : `${money(a)}–${money(b)}`);
const known = (v: string) => (v === "Unknown" ? null : v);

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();
  const [state, watch, openRoles] = await Promise.all([getUserState(), getActiveWatch(), countOtherOpenRoles(job.company_id, job.id)]);
  const read = braunRead({ ...job, companyOpenRoles: openRoles });
  const match = watch ? scoreMatch(job, watch.prefs) : null;
  const back = `/jobs/${job.slug}`;
  const saved = state.savedJobIds.has(job.id);
  const btn = "rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold aria-pressed:border-fresh aria-pressed:text-fresh";

  const notDisclosed = [
    job.salary_min == null && "Base salary",
    job.ote_min == null && "OTE",
    ...Object.entries(DISCLOSURE_LABELS).filter(([k]) => !job.disclosures?.[k as keyof typeof job.disclosures]).map(([, l]) => l),
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <CompanyLogo name={job.company_name} logoUrl={job.company_logo_url} domain={job.company_domain} size={44} />
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{job.title_raw}</h1>
          <p className="text-ink-2">
            <Link href={`/company/${job.company_slug}`} className="font-medium text-ink hover:underline">{job.company_name}</Link> · {formatLocation(job)}
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-4 rounded-xl border border-line bg-surface p-4">
        <Fact label="Base" value={range(job.salary_min, job.salary_max)} />
        <Fact label="OTE" value={range(job.ote_min, job.ote_max)} />
        <Fact label="Posted" value={freshnessLabel(job.first_seen_at)} />
      </dl>

      <div className="mt-4 hidden gap-2 sm:flex">
        <a href={job.apply_url} target="_blank" rel="noopener" className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">Apply on {job.company_name} →</a>
        <WatchCompanyButton companyId={job.company_id} on={state.watchedCompanyIds.has(job.company_id)} back={back} className={btn} />
        <SaveJobButton jobId={job.id} saved={saved} back={back} className={btn} />
      </div>

      <BraunReadPanel read={read} />

      {match && match.score != null && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-3">Against your watch: {watch!.name}</p>
          <MatchBadge match={match} detailed />
        </div>
      )}
      {match && match.blocked_by && (
        <p className="mt-6 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-2">This one hits one of your dealbreakers, so it won&apos;t show up in your matches.</p>
      )}

      <div className="mt-6">
        <Block title="The role">
          <p>{job.summary ?? `${job.role_family}${known(job.sales_segment) ? `, ${job.sales_segment}` : ""}.`}</p>
          {tagsFor(job).length > 0 && <p className="mt-2 text-sm text-ink-2">{tagsFor(job).join(" · ")}</p>}
        </Block>
        <Block title="Selling motion">{known(job.sales_motion) ?? <span className="text-ink-3">Not stated in the posting.</span>}</Block>
        <Block title="Who you are selling to">
          {known(job.customer_segment) ?? known(job.sales_segment) ?? <span className="text-ink-3">Not stated in the posting.</span>}
        </Block>
        <Block title="Pipeline expectations">
          {job.self_sourcing_level === "High" && "Mostly self-sourced. Expect a lot of outbound."}
          {job.self_sourcing_level === "Medium" && "A mix of self-sourced pipeline and inbound / SDR support."}
          {job.self_sourcing_level === "Low" && "Mostly inbound or an assigned book of business."}
          {job.self_sourcing_level === "Unknown" && <span className="text-ink-3">Not stated in the posting.</span>}
        </Block>
        <Block title="Compensation">{formatComp(job) || <span className="text-ink-3">The posting doesn&apos;t list pay.</span>}</Block>
        <Block title="What is not disclosed">
          {notDisclosed.length ? (
            <>
              <p className="text-ink-2">This posting doesn&apos;t tell you:</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {notDisclosed.map((d) => (
                  <li key={d} className="rounded border border-line bg-surface px-2 py-0.5 text-sm">{d}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ink-3">Worth asking about on your first call.</p>
            </>
          ) : (
            "This posting is unusually transparent. Nice."
          )}
        </Block>
        {job.description_raw && (
          <details className="border-t border-line py-5">
            <summary className="cursor-pointer text-sm font-bold uppercase tracking-wide text-ink-2">Full posting</summary>
            <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{job.description_raw}</div>
          </details>
        )}
      </div>

      {/* Sticky actions on mobile (spec section 15) */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur sm:hidden">
        <SaveJobButton jobId={job.id} saved={saved} back={back} compact className="flex-1 rounded-lg border border-line-strong bg-surface py-3 text-center text-sm font-semibold aria-pressed:text-fresh" />
        <a href={job.apply_url} target="_blank" rel="noopener" className="flex-[2] rounded-lg bg-ink py-3 text-center text-sm font-semibold text-white">Apply →</a>
      </div>
    </div>
  );
}
