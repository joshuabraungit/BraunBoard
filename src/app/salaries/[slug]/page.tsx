import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayRows } from "@/lib/salary-data";
import { allSalaryPages, findSalaryPage, k, oteMid, baseMid, rowsFor, salaryStats, type SalaryPage, type SalaryStats } from "@/lib/salaries";
import { OteHistogram, Stat } from "@/components/SalaryBits";
import { PicksSignupFromUrl } from "@/components/PicksSignupFromUrl";

export const revalidate = 3600;

// Built the first time someone opens each one, then reused for an hour.
export function generateStaticParams() {
  return [];
}

const YEAR = new Date().getFullYear();

function headline(p: SalaryPage) {
  return `What ${p.plural} actually make in ${YEAR}`;
}

function summaryLine(p: SalaryPage, s: SalaryStats) {
  const parts = [s.ote && `median OTE ${k(s.ote.median)}`, s.base && `median base ${k(s.base.median)}`].filter(Boolean);
  return parts.length
    ? `${parts.join(" and ")} across ${s.withPay} real ${p.title} job postings with published pay.`
    : `Pay data from real ${p.title} job postings.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = findSalaryPage(slug);
  if (!p) return {};
  const { rows } = await getPayRows();
  const all = rowsFor(rows, p);
  const s = salaryStats(all, all.length);
  const description = `${summaryLine(p, s).replace(/^./, (c) => c.toUpperCase())} Pulled straight from employer career pages and updated every few hours.`;
  return {
    title: `${headline(p)} | Braun Board`,
    description,
    alternates: { canonical: `/salaries/${p.slug}` },
    openGraph: { title: headline(p), description, type: "article", url: `/salaries/${p.slug}` },
    twitter: { card: "summary", title: headline(p), description },
  };
}

function takeaways(p: SalaryPage, s: SalaryStats, total: number): string[] {
  const out: string[] = [];
  if (s.ote) out.push(`Half of the ${p.title} postings that list OTE land between ${k(s.ote.p25)} and ${k(s.ote.p75)}. If an offer comes in under ${k(s.ote.p25)}, ask what you're missing.`);
  if (s.basePct != null) out.push(`The typical split is about ${s.basePct}/${100 - s.basePct} base to variable (from ${s.splitN} postings that list both).`);
  const [remote, office] = s.byWorkplace;
  if (remote?.ote && office?.ote) {
    const diff = remote.ote.median - office.ote.median;
    out.push(
      Math.abs(diff) < 10_000
        ? `Remote and in-office roles pay about the same: ${k(remote.ote.median)} vs ${k(office.ote.median)} median OTE.`
        : `Remote roles pay ${diff > 0 ? "more" : "less"}: ${k(remote.ote.median)} median OTE vs ${k(office.ote.median)} for hybrid or in-office.`,
    );
  }
  if (total) out.push(`Only ${Math.round((s.withPay / total) * 100)}% of ${p.title} postings publish any pay at all. The rest make you ask.`);
  return out;
}

export default async function SalaryReport({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = findSalaryPage(slug);
  if (!p) notFound();
  const { rows, loadedAt } = await getPayRows();
  const all = rowsFor(rows, p);
  const s = salaryStats(all, all.length);
  const enough = s.ote || s.base;

  const siblings = allSalaryPages().filter((x) => x.role === p.role && x.slug !== p.slug);
  const topPostings = all
    .filter((r) => oteMid(r) != null || baseMid(r) != null)
    .sort((a, b) => (oteMid(b) ?? baseMid(b)!) - (oteMid(a) ?? baseMid(a)!))
    .slice(0, 8);
  const jobsHref = `/jobs?role=${encodeURIComponent(p.role)}${p.segment ? `&segment=${encodeURIComponent(p.segment)}` : ""}`;
  const updated = new Date(loadedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
        <Link href="/salaries" className="hover:text-ink">Braun Board Salary Report</Link> · Updated {updated}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{headline(p)}</h1>
      <p className="mt-3 text-lg text-ink-2">
        {enough
          ? `Built from ${s.withPay} real ${p.title} job postings that publish pay. No surveys, no self-reported numbers.`
          : `We don't have enough ${p.title} postings with published pay to report a number yet.`}
      </p>

      {enough && (
        <>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Median OTE" d={s.ote} />
            <Stat label="Median base" d={s.base} />
            <div className="rounded-xl border border-line bg-surface p-4">
              <dt className="text-xs uppercase tracking-wide text-ink-3">Typical split</dt>
              {s.basePct != null ? (
                <>
                  <dd className="mt-1 text-3xl font-bold tracking-tight">
                    {s.basePct}/{100 - s.basePct}
                  </dd>
                  <dd className="mt-1 text-sm text-ink-2">Base / variable</dd>
                  <dd className="mt-0.5 text-xs text-ink-3">From {s.splitN} postings listing both</dd>
                </>
              ) : (
                <dd className="mt-1 text-sm text-ink-3">Not enough postings list both yet.</dd>
              )}
            </div>
          </dl>

          <section className="mt-8">
            <h2 className="text-lg font-bold tracking-tight">What this means for you</h2>
            <ul className="mt-3 space-y-2.5">
              {takeaways(p, s, all.length).map((t) => (
                <li key={t} className="flex gap-2.5 text-[15px] leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-8">
            <OteHistogram h={s.histogram} median={s.ote?.median ?? null} />
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold tracking-tight">Remote vs. in office</h2>
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Workplace</th>
                    <th className="px-4 py-2.5 font-semibold">Median OTE</th>
                    <th className="px-4 py-2.5 font-semibold">Median base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.byWorkplace.map((w) => (
                    <tr key={w.label}>
                      <td className="px-4 py-2.5 font-medium">{w.label}</td>
                      <td className="px-4 py-2.5">{w.ote ? `${k(w.ote.median)} (${w.ote.n})` : <span className="text-ink-3">Too few</span>}</td>
                      <td className="px-4 py-2.5">{w.base ? `${k(w.base.median)} (${w.base.n})` : <span className="text-ink-3">Too few</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-xs text-ink-3">Number of postings in parentheses.</p>
          </section>

          {s.topCompanies.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-bold tracking-tight">Highest posted OTE by company</h2>
              <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {s.topCompanies.map((c, i) => (
                  <li key={c.slug} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-5 text-ink-3">{i + 1}</span>
                    <Link href={`/company/${c.slug}`} className="flex-1 font-medium hover:underline">{c.name}</Link>
                    <span className="font-semibold text-accent">{k(c.ote)}</span>
                    <span className="w-20 text-right text-xs text-ink-3">{c.n} posting{c.n === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {topPostings.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-bold tracking-tight">Top-paying open roles right now</h2>
                <Link href={jobsHref} className="text-sm text-ink-2 hover:text-ink">See all →</Link>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                {topPostings.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/jobs/${r.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-bg">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.title_raw}</span>
                        <span className="text-xs text-ink-3">{r.company_name}</span>
                      </span>
                      <span className="whitespace-nowrap font-semibold text-accent">
                        {oteMid(r) != null ? `${k(oteMid(r)!)} OTE` : `${k(baseMid(r)!)} base`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {siblings.length > 0 && (
        <nav className="mt-10" aria-label="Related salary reports">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-2">More {p.role} pay</h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((x) => (
              <Link key={x.slug} href={`/salaries/${x.slug}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm hover:border-line-strong">
                {x.plural}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <div className="mt-10">
        <PicksSignupFromUrl back={`/salaries/${p.slug}`} source={`salary-${p.slug}`} compact />
      </div>

      <section className="mt-10 rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2">
        <h2 className="mb-1.5 font-bold text-ink">How I got these numbers</h2>
        <p>
          Every number comes from a US sales job posting on an employer&apos;s own career page (Greenhouse, Lever and Ashby boards) that
          is open right now and publishes pay. Each posting counts once, at the midpoint of its posted range. We only call a number OTE
          when the posting says so. I don&apos;t estimate, survey or fill gaps, and I don&apos;t publish a number from fewer than 5 postings.
          {s.postings > 0 && ` ${s.postings} open ${p.title} roles are in this report's pool; ${s.withPay} publish pay.`}
        </p>
      </section>
    </article>
  );
}
