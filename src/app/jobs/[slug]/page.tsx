import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyStats, getJob } from "@/lib/data";
import { braunRead } from "@/lib/flags";
import { BraunReadPanel } from "@/components/BraunRead";
import { checkedLabel, freshnessLabel } from "@/lib/freshness";
import { questionsFor } from "@/lib/questions";
import { ATTAINMENT_ROLES, attainmentLabel } from "@/lib/attainment";
import { QuestionsPanel } from "@/components/Questions";
import { AskJoshForm } from "@/components/AskJosh";
import { getUser } from "@/lib/session";
import { loadProductData } from "@/lib/products";
import { formatComp, formatLocation, money } from "@/lib/format";
import { CompanyLogo } from "@/components/CompanyLogo";
import { tagsFor } from "@/components/JobCard";
import { SaveJobButton, WatchCompanyButton } from "@/components/Actions";
import { MatchBadge } from "@/components/MatchBadge";
import { getActiveWatch, getUserState } from "@/lib/session";
import { scoreMatch } from "@/lib/match";
import { jsonLd, jobPostingSchema } from "@/lib/job-schema";

export const dynamic = "force-dynamic";

// One database read shared by the page and its metadata.
const loadJob = cache(getJob);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) return { title: "Job not found · Braun Board" };
  const pay = formatComp(job);
  return {
    title: `${job.title_raw} at ${job.company_name} · Braun Board`,
    description: `${job.title_raw} at ${job.company_name}${pay ? `, ${pay}` : ""}. See what the posting leaves out and the questions to ask on the first call.`,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: {
      type: "website",
      siteName: "Braun Board",
      url: `/jobs/${job.slug}`,
      title: `${job.title_raw} at ${job.company_name}`,
      description: pay ? `${pay}. Plus what the posting leaves out and the questions to ask.` : "See what the posting leaves out and the questions to ask on the first call.",
    },
    twitter: { card: "summary_large_image" },
  };
}

const DISCLOSURE_LABELS: Record<string, string> = {
  quota_size: "Quota size",
  quota_attainment: "Quota attainment",
  average_deal_size: "Average deal size",
  territory: "Territory",
  sales_cycle: "Sales cycle length",
};

function Fact({ label, value, tone }: { label: string; value: string | null; tone?: "good" }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className={`mt-0.5 text-[15px] ${value ? `font-semibold ${tone === "good" ? "text-accent" : ""}` : "text-ink-3"}`}>{value ?? "Not disclosed"}</dd>
    </div>
  );
}

const ASK_ATTAINMENT = "What percentage of fully ramped reps hit quota last year?";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-5">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-2">{title}</h2>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

const range = (a: number | null, b: number | null, cur?: string | null) => (a == null ? null : a === b || b == null ? money(a, cur) : `${money(a, cur)}–${money(b, cur)}`);
const known = (v: string) => (v === "Unknown" ? null : v);

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) notFound();
  const [state, watch, stats, user, products] = await Promise.all([
    getUserState(),
    getActiveWatch(),
    getCompanyStats(job.company_id),
    getUser().catch(() => null),
    loadProductData().catch(() => null),
  ]);
  const product = products?.companies.find((c) => c.id === job.company_id && c.story) ?? null;
  const read = braunRead({ ...job, company: stats });
  const match = watch ? scoreMatch(job, watch.prefs) : null;
  // Attainment is the question for people carrying a number. For SEs and leaders it means something else.
  const showAttainment = ATTAINMENT_ROLES.has(job.role_family) && job.seniority === "Individual Contributor";
  const questions = questionsFor({ ...job, flags: read.flags, company: stats });
  const checked = job.last_seen_at ? checkedLabel(job.last_seen_at) : null;
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
      {/* Lets Google show this job in its jobs search. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jobPostingSchema(job, process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com")) }} />
      <div className="flex items-center gap-3">
        <CompanyLogo name={job.company_name} logoUrl={job.company_logo_url} domain={job.company_domain} size={44} />
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{job.title_raw}</h1>
          <p className="text-ink-2">
            <Link href={`/company/${job.company_slug}`} className="font-medium text-ink hover:underline">{job.company_name}</Link> · {formatLocation(job)}
          </p>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-line bg-surface">
        <dl className={`grid gap-4 p-4 ${showAttainment ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
          <Fact label="Base" value={range(job.salary_min, job.salary_max, job.currency)} />
          <Fact label="OTE" value={range(job.ote_min, job.ote_max, job.currency)} />
          {showAttainment && <Fact label="Quota attainment" value={job.attainment ? attainmentLabel(job.attainment) : null} tone={job.attainment?.kind === "hit" ? "good" : undefined} />}
          <Fact label="Posted" value={freshnessLabel(job.first_seen_at)} />
        </dl>
        {showAttainment && (
          <div className="space-y-1 border-t border-line px-4 py-3 text-sm">
            {job.attainment ? (
              <>
                <p className="text-ink-2">
                  <span className="font-semibold text-ink">In their words:</span> &ldquo;{job.attainment.quote}&rdquo;
                </p>
                {job.attainment.kind === "average" && (
                  <>
                    <p className="text-ink-2">
                      <span className="font-semibold text-ink">Why it matters:</span> that&apos;s an average, not how many reps hit. A{" "}
                      {job.attainment.pct}% average can mean two reps are carrying the number for everyone else.
                    </p>
                    <p className="text-ink-2">
                      <span className="font-semibold text-ink">Ask:</span> &ldquo;{ASK_ATTAINMENT}&rdquo; Then: &ldquo;How much of last year&apos;s
                      number came from your top two reps?&rdquo;
                    </p>
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-ink-2">
                  <span className="font-semibold text-ink">Why it matters:</span> OTE tells you what you could earn. Attainment tells you how
                  realistic it is.
                </p>
                <p className="text-ink-2">
                  <span className="font-semibold text-ink">Ask:</span> &ldquo;{ASK_ATTAINMENT}&rdquo;
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {checked && (
        <p className={`mt-3 flex items-center gap-1.5 text-sm ${checked.open ? "text-accent" : "text-ink-3"}`}>
          {checked.open && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-accent" />}
          {checked.text}
          <span className="text-ink-3">on {job.company_name}&apos;s careers page</span>
        </p>
      )}

      <div className="mt-4 hidden gap-2 sm:flex">
        <a href={job.apply_url} target="_blank" rel="noopener" className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">Apply on {job.company_name} →</a>
        <WatchCompanyButton companyId={job.company_id} on={state.watchedCompanyIds.has(job.company_id)} back={back} className={btn} />
        <SaveJobButton jobId={job.id} saved={saved} back={back} className={btn} />
      </div>

      {product?.story && (
        <section className="mt-6 rounded-xl border border-line bg-surface p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-3">What {job.company_name} sells</h2>
          {product.short && <p className="mt-1.5 font-semibold">{product.short}</p>}
          <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{product.story}</p>
          <p className="mt-2 text-xs text-ink-3">
            In plain English, from their own job posts.{" "}
            <Link href={`/ask?about=${encodeURIComponent(job.company_name)}`} className="underline underline-offset-2 hover:text-ink">
              Something wrong? Tell us
            </Link>
          </p>
          {product.category && (
            <Link href={`/products?cat=${encodeURIComponent(product.category)}`} className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
              More {product.category} companies →
            </Link>
          )}
        </section>
      )}

      <BraunReadPanel read={read} />

      <QuestionsPanel questions={questions} title={job.title_raw} company={job.company_name} roleFamily={job.role_family} />

      {/* Ask Josh: the job rides along with the message, so he sees exactly which posting it's about. */}
      <details id="ask" className="group mt-6 rounded-2xl border border-line bg-surface p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-bold">Got an offer from {job.company_name}? Not sure about it?</span>
            <span className="mt-0.5 block text-sm text-ink-2">Ask me. I read every message myself. · Josh</span>
          </span>
          <span className="shrink-0 rounded-lg border border-line-strong px-3 py-2 text-sm font-semibold group-open:hidden">Ask Josh</span>
        </summary>
        <div className="mt-4">
          <AskJoshForm source="job-page" job={{ slug: job.slug, company: job.company_name }} defaultEmail={user?.email ?? ""} />
        </div>
      </details>

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
        <Block title="Who you're selling to">
          <dl className="space-y-2.5">
            <div>
              <dt className="inline font-semibold">Buyer: </dt>
              <dd className="inline">
                {job.buyer ? (
                  <>
                    {job.buyer}
                    <span className="mt-0.5 block text-sm text-ink-3">In their words: &ldquo;{job.buyer_quote}&rdquo;</span>
                  </>
                ) : job.buyer_checked_at ? (
                  <>
                    <span className="text-ink-3">Not stated in the posting.</span>
                    <span className="mt-0.5 block text-sm text-ink-2">Ask: &ldquo;Who&apos;s the economic buyer, and who else is in the deal?&rdquo;</span>
                  </>
                ) : (
                  <span className="text-ink-3">Still reading the posting. Check back within the hour.</span>
                )}
              </dd>
            </div>
            {job.industry && (
              <div>
                <dt className="inline font-semibold">Industry: </dt>
                <dd className="inline">
                  {job.industry}
                  <span className="mt-0.5 block text-sm text-ink-3">In their words: &ldquo;{job.industry_quote}&rdquo;</span>
                </dd>
              </div>
            )}
            {(known(job.customer_segment) ?? known(job.sales_segment)) && (
              <div>
                <dt className="inline font-semibold">Company size: </dt>
                <dd className="inline">{known(job.customer_segment) ?? known(job.sales_segment)}</dd>
              </div>
            )}
          </dl>
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
              <p className="mt-3 text-sm text-ink-3">The questions above cover the big ones.</p>
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
