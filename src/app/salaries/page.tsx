import type { Metadata } from "next";
import Link from "next/link";
import { getPayRows } from "@/lib/salary-data";
import { allSalaryPages, k, rowsFor, salaryStats, SALARY_ROLES, SALARY_SEGMENTS } from "@/lib/salaries";

export const dynamic = "force-dynamic";

const YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `What B2B salespeople actually make in ${YEAR} | Braun Board`,
  description: `Real OTE and base pay for AEs, SDRs, SEs, sales managers and sales leaders, built from live job postings that publish pay. Updated every few hours.`,
  alternates: { canonical: "/salaries" },
};

export default async function Salaries() {
  const { rows } = await getPayRows();
  const pages = allSalaryPages();
  const cell = (role: (typeof SALARY_ROLES)[number], segment: (typeof SALARY_SEGMENTS)[number] | null) => {
    const page = pages.find((p) => p.role === role && p.segment === segment);
    const sub = rowsFor(rows, { role, segment });
    const s = salaryStats(sub, sub.length);
    return { page, s };
  };
  const withPay = rows.filter((r) => r.salary_min != null || r.ote_min != null).length;
  const featured = cell("Account Executive", "Enterprise");

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Braun Board Salary Report</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">What B2B salespeople actually make in {YEAR}</h1>
      <p className="mt-3 text-lg text-ink-2">
        Real numbers from {withPay.toLocaleString()} open US sales job postings that publish pay. Straight from employer career pages, updated every few hours.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/salaries/uk" className="font-semibold underline">
          See UK salaries in pounds →
        </Link>
      </p>

      {featured.page && featured.s.ote && (
        <Link
          href={`/salaries/${featured.page.slug}`}
          className="mt-6 block rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong sm:p-6"
        >
          <p className="text-sm font-semibold text-ink-2">Enterprise Account Executives</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-accent">{k(featured.s.ote.median)} <span className="text-lg font-semibold text-ink-2">median OTE</span></p>
          <p className="mt-1 text-sm text-ink-2">
            {featured.s.base && `${k(featured.s.base.median)} median base · `}
            Middle half {k(featured.s.ote.p25)} to {k(featured.s.ote.p75)} · {featured.s.withPay} postings
          </p>
          <p className="mt-3 text-sm font-semibold">Read the full breakdown →</p>
        </Link>
      )}

      <h2 className="mb-3 mt-10 text-lg font-bold tracking-tight">Median OTE by role and segment</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">All</th>
              {SALARY_SEGMENTS.map((s) => (
                <th key={s} className="px-4 py-2.5 font-semibold">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {SALARY_ROLES.map((role) => (
              <tr key={role}>
                <th scope="row" className="px-4 py-3 text-left font-semibold">{role}</th>
                {[null, ...SALARY_SEGMENTS].map((seg) => {
                  const { page, s } = cell(role, seg);
                  const val = s.ote ? { v: k(s.ote.median), n: s.ote.n } : s.base ? { v: `${k(s.base.median)} base`, n: s.base.n } : null;
                  return (
                    <td key={seg ?? "all"} className="px-4 py-3">
                      {val && page ? (
                        <Link href={`/salaries/${page.slug}`} className="group">
                          <span className="font-semibold text-accent group-hover:underline">{val.v}</span>
                          <span className="block text-xs text-ink-3">{val.n} postings</span>
                        </Link>
                      ) : (
                        <span className="text-ink-3">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Medians of the midpoint of each posted range. Where too few postings list OTE, we show base instead. Blank means fewer than 5 postings.
      </p>

      <section className="mt-10 rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2">
        <h2 className="mb-1.5 font-bold text-ink">Why trust these numbers</h2>
        <p>
          They aren&apos;t surveys or self-reported. Every figure is published pay from a live US job posting on the employer&apos;s own
          career page. We only label pay as OTE when the posting does, we never estimate, and we skip any group with fewer than 5 postings.
        </p>
      </section>
    </div>
  );
}
