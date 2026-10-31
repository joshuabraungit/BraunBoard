import type { Metadata } from "next";
import Link from "next/link";
import { getPayRows } from "@/lib/salary-data";
import { k, MIN_SAMPLE, rowsFor, salaryStats, SALARY_ROLES, type SalaryStats } from "@/lib/salaries";

// Pay data refreshes hourly.
export const revalidate = 3600;

const YEAR = new Date().getFullYear();
const gbp = (n: number) => k(n, "£");

export const metadata: Metadata = {
  title: `What B2B salespeople make in the UK in ${YEAR} | Braun Board`,
  description: "Real OTE and base pay for UK sales roles, from live job postings that publish pay in pounds. Plus how few UK postings publish pay at all.",
  alternates: { canonical: "/salaries/uk" },
};

function Cell({ s }: { s: SalaryStats }) {
  const v = s.ote ? { v: gbp(s.ote.median), n: s.ote.n, what: "OTE" } : s.base ? { v: gbp(s.base.median), n: s.base.n, what: "base" } : null;
  if (!v) return <span className="text-ink-3">Too few</span>;
  return (
    <>
      <span className="font-semibold text-accent">
        {v.v} <span className="text-xs font-medium text-ink-2">{v.what}</span>
      </span>
      <span className="block text-xs text-ink-3">{v.n} postings</span>
    </>
  );
}

export default async function UkSalaries() {
  const { rows } = await getPayRows("UK");
  const all = salaryStats(rows, rows.length);
  const pct = rows.length ? Math.round((all.withPay / rows.length) * 100) : 0;
  const byRole = SALARY_ROLES.map((role) => {
    const sub = rowsFor(rows, { role, segment: null });
    return { role, n: sub.length, s: salaryStats(sub, sub.length) };
  }).filter((r) => r.n > 0);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Braun Board Salary Report · United Kingdom</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">What UK salespeople actually make in {YEAR}</h1>
      <p className="mt-3 text-lg text-ink-2">
        Real numbers from UK sales job postings that publish pay in pounds. Straight from employer career pages, updated every few hours.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-ink-3">Publish any pay</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{pct}%</p>
          <p className="mt-0.5 text-xs text-ink-3">
            {all.withPay} of {rows.length} open UK sales roles
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-ink-3">Median OTE</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-accent">{all.ote ? gbp(all.ote.median) : "–"}</p>
          <p className="mt-0.5 text-xs text-ink-3">{all.ote ? `All UK sales roles, from ${all.ote.n} postings` : `Fewer than ${MIN_SAMPLE} postings list OTE`}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-ink-3">Median base</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-accent">{all.base ? gbp(all.base.median) : "–"}</p>
          <p className="mt-0.5 text-xs text-ink-3">{all.base ? `All UK sales roles, from ${all.base.n} postings` : `Fewer than ${MIN_SAMPLE} postings list base`}</p>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold tracking-tight">Median pay by role</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Median pay</th>
              <th className="px-4 py-2.5 font-semibold">Open roles</th>
              <th className="px-4 py-2.5 font-semibold">Publish pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {byRole.map(({ role, n, s }) => (
              <tr key={role}>
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  <Link href={`/jobs?role=${encodeURIComponent(role)}&country=UK`} className="hover:underline">
                    {role}
                  </Link>
                </th>
                <td className="px-4 py-3">
                  <Cell s={s} />
                </td>
                <td className="px-4 py-3">{n}</td>
                <td className="px-4 py-3">{n ? `${Math.round((s.withPay / n) * 100)}%` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Medians of the midpoint of each posted range. Where too few postings list OTE, we show base instead. &quot;Too few&quot; means fewer than {MIN_SAMPLE} postings.
      </p>

      {all.topCompanies.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold tracking-tight">Highest posted OTE by company</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {all.topCompanies.map((c) => (
              <li key={c.slug} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Link href={`/company/${c.slug}`} className="flex-1 font-medium hover:underline">
                  {c.name}
                </Link>
                <span className="font-semibold text-accent">{gbp(c.ote)}</span>
                <span className="w-20 text-right text-xs text-ink-3">
                  {c.n} posting{c.n === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2">
        <h2 className="mb-1.5 font-bold text-ink">Why so few numbers?</h2>
        <p>
          Many US states require a pay range in job postings. The UK doesn&apos;t, so most UK sales postings leave pay out. Every figure here
          is published pay in pounds from a live UK posting on the employer&apos;s own career page. We only call it OTE when the posting does,
          we never estimate, and we skip any group with fewer than {MIN_SAMPLE} postings.
        </p>
        <p className="mt-3">
          <Link href="/jobs?country=UK" className="font-semibold text-ink hover:underline">
            Browse UK sales jobs →
          </Link>{" "}
          ·{" "}
          <Link href="/salaries" className="font-semibold text-ink hover:underline">
            US salary report →
          </Link>
        </p>
      </section>
    </div>
  );
}
