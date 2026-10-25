import type { Metadata } from "next";
import Link from "next/link";

// Braun Board Job Market Report #1. A snapshot. The full-set numbers come from reading all 1,473 live rep
// postings on Oct 25, 2026 (quote-backed AI read, counted only when the posting gives a number, reviewed by hand).
// The 25-posting table was read entirely by hand on Oct 24. Postings change; this page doesn't.

export const metadata: Metadata = {
  alternates: { canonical: "/report/october-2026" },
  title: "Job Market Report, October 2026 · Braun Board",
  description:
    "I analyzed all 1,473 live sales rep postings on Braun Board. 75% showed a pay number. 19% showed both base and commission. 1% said what the quota is. One said how many reps hit it.",
};

type Pay = "split" | "total" | "base" | "unlabeled" | "none";

const PAY: Record<Pay, { label: string; note: string; tone: string }> = {
  split: { label: "Base and commission", note: "You can see the base and the variable, so you can work out the split.", tone: "bg-accent" },
  total: { label: "Total pay only", note: "One number for base plus commission. No split.", tone: "bg-accent/60" },
  base: { label: "Base only", note: "A salary range, but no number for the commission.", tone: "bg-amber/70" },
  unlabeled: { label: "Unclear what it covers", note: "A range with no label for base or total.", tone: "bg-ink-3/60" },
  none: { label: "No pay at all", note: "", tone: "bg-red/70" },
};

const ROWS: { company: string; role: string; pay: Pay; shown: string }[] = [
  { company: "Samsara", role: "Account Executive, Mid Market (West)", pay: "total", shown: "OTE $152K–$190K. Typical deals $20K–$100K." },
  { company: "Mindbody", role: "SMB Account Executive", pay: "split", shown: "Base $40K–$50K, $40K commission target" },
  { company: "Twilio", role: "Senior Strategic Account Executive", pay: "base", shown: "Salary about $159K–$220K, by location" },
  { company: "Rubrik", role: "Account Executive, NAS Product Specialist", pay: "none", shown: "None" },
  { company: "Fivetran", role: "Enterprise Account Executive", pay: "split", shown: "Base $151K–$189K, OTE $303K–$378K" },
  { company: "CreatorIQ", role: "Enterprise Account Executive", pay: "base", shown: "Base $120K–$130K, “offers commission”" },
  { company: "SpotOn", role: "Territory Sales Representative", pay: "split", shown: "Base $60K, OTE $120K–$275K" },
  { company: "Ambience Healthcare", role: "Account Manager", pay: "unlabeled", shown: "$232K–$290K, “80/20 base and variable”" },
  { company: "Starburst", role: "Commercial Account Executive", pay: "unlabeled", shown: "“Pay range” $160K–$200K" },
  { company: "Klaviyo", role: "Principal Partner Manager II", pay: "base", shown: "Base $164K–$246K" },
  { company: "GitLab", role: "Strategic Account Executive, AI", pay: "split", shown: "Base $124K–$187K, incentive up to 100% of base" },
  { company: "Rasa", role: "Senior Business Development Representative", pay: "split", shown: "Base $50K–$63K, commission $20K–$23K" },
  { company: "Elastic", role: "Sales Development Representative", pay: "split", shown: "Base $46K–$73K, OTE $66K–$104K" },
  { company: "Toast", role: "Flex Account Executive, SMB", pay: "total", shown: "Total targeted cash $128K–$205K" },
  { company: "Monte Carlo", role: "Enterprise Account Executive", pay: "none", shown: "“Competitive compensation”" },
  { company: "StackAdapt", role: "Account Manager, Enterprise", pay: "base", shown: "Base $88K–$121K" },
  { company: "UiPath", role: "Associate Sales Representative, Federal", pay: "split", shown: "Base $78K–$90K, commission $23K–$27K" },
  { company: "The Trade Desk", role: "Senior Programmatic Account Manager", pay: "base", shown: "Base $72K–$132K" },
  { company: "Help Scout", role: "Business Development Representative", pay: "split", shown: "Base $71K–$77K, OTE $102K–$111K" },
  { company: "Cloudflare", role: "Senior Named Account Executive", pay: "total", shown: "$269K–$360K by location, includes on-target incentive" },
  { company: "Figma", role: "Account Executive, Federal, State & Local", pay: "base", shown: "Base $165K–$190K" },
  { company: "Taktile", role: "Senior Business Development Representative", pay: "base", shown: "Salary $90K–$105K" },
  { company: "Vanta", role: "Senior Account Executive", pay: "base", shown: "Salary $215K–$315K" },
  { company: "Augury", role: "Enterprise Account Executive", pay: "split", shown: "OTE $220K–$260K, 50/50 base and variable" },
  { company: "OneTrust", role: "Strategic Account Executive", pay: "base", shown: "Salary $129K–$173K" },
];

const count = (p: Pay) => ROWS.filter((r) => r.pay === p).length;

// All 1,473 live rep postings (SDR, AE, AM; individual contributors) from 229 companies, Oct 25, 2026.
const FULL = { postings: 1473, companies: 229 };
const FULL_PAY: { label: string; n: number; tone: string; note: string }[] = [
  { label: "Base and commission", n: 274, tone: "bg-accent", note: "You can see both parts of the paycheck." },
  { label: "OTE or commission only", n: 408, tone: "bg-accent/60", note: "A total or variable number, but no base." },
  { label: "Base only", n: 419, tone: "bg-amber/70", note: "A salary, but nothing about commission." },
  { label: "Unclear", n: 4, tone: "bg-ink-3/60", note: "" },
  { label: "No pay at all", n: 368, tone: "bg-red/70", note: "" },
];
const FULL_MISSING: { what: string; n: number; cos: number }[] = [
  { what: "said how many reps hit quota", n: 1, cos: 1 },
  { what: "gave a number for the quota", n: 15, cos: 8 },
  { what: "described a ramp or onboarding timeline", n: 7, cos: 5 },
  { what: "gave a sales cycle length", n: 30, cos: 18 },
  { what: "mentioned accelerators", n: 52, cos: 13 },
  { what: "gave a deal size, even roughly", n: 62, cos: 19 },
  { what: "mentioned clawbacks", n: 0, cos: 0 },
];
const pct = (n: number) => (n === 0 ? "0%" : n / FULL.postings < 0.01 ? "under 1%" : `${Math.round((n / FULL.postings) * 100)}%`);

export default function Report() {
  const total = ROWS.length;
  const anyPay = FULL.postings - 368;
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">Braun Board Job Market Report · No. 1 · October 2026</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Most sales jobs show a number. Few show the one that matters.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        I analyzed every live sales rep posting on Braun Board: {FULL.postings.toLocaleString()} SDR, AE and account manager jobs from {FULL.companies}{" "}
        companies. Three in four showed a pay number. Fewer than one in five showed both the base and the commission. And only one said how many
        reps hit quota. By Josh Braun, October 25, 2026.
      </p>
      <a
        href="/report/braun-board-job-market-report-october-2026.pdf"
        download
        className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold hover:border-ink"
      >
        Download the PDF →
      </a>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [pct(anyPay), "showed a pay number", "206 of 229 companies, in at least one posting"],
          [pct(274), "showed base and commission", "53 of 229 companies"],
          ["1%", "gave a number for the quota", "8 of 229 companies"],
          ["1", "said how many reps hit quota", "out of 1,473 postings"],
        ].map(([n, t, c]) => (
          <div key={t} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-2xl font-bold tracking-tight">{n}</p>
            <p className="mt-0.5 text-sm text-ink-2">{t}</p>
            <p className="mt-1 text-xs text-ink-3">{c}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Pay: a number, but not the whole picture</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Pay transparency is real progress. But for a commission job, one number rarely tells you what you&apos;d take home. 419 postings showed a
          base salary and nothing about commission. Another 408 showed an OTE or commission figure with no base, so you can&apos;t see how much
          of the pay is guaranteed.
        </p>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full" role="img" aria-label={`How the ${FULL.postings} postings showed pay`}>
          {FULL_PAY.map((p) => (
            <div key={p.label} className={p.tone} style={{ width: `${(p.n / FULL.postings) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-4 space-y-2.5">
          {FULL_PAY.map((p) => (
            <li key={p.label} className="flex items-start gap-3 text-[15px]">
              <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-sm ${p.tone}`} aria-hidden />
              <span>
                <span className="font-semibold">
                  {p.label}: {p.n.toLocaleString()} ({pct(p.n)})
                </span>
                {p.note && <span className="text-ink-2"> · {p.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">What the postings left out</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          The details that decide whether the pay is reachable were almost never there. Of {FULL.postings.toLocaleString()} postings:
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-line px-4 py-2 text-xs uppercase tracking-wide text-ink-3">
            <span>Details</span>
            <span className="w-20 text-right">Postings</span>
            <span className="w-24 text-right">Companies</span>
          </div>
          {FULL_MISSING.map((m) => (
            <div key={m.what} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-line px-4 py-3 last:border-b-0">
              <span className="text-[15px]">{m.what}</span>
              <span className="w-20 text-right font-bold tabular-nums">{m.n.toLocaleString()}</span>
              <span className="w-24 text-right text-sm tabular-nums text-ink-2">{m.cos} of {FULL.companies}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-3">
          Quota numbers that did appear were mostly meeting or deal targets, like &ldquo;6 qualified demos per month.&rdquo; None of the 15 gave a
          dollar quota.
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-accent/30 bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-bold">The one that said it</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">
          Out of 1,473 postings, one told you how the team is actually doing. Kong: &ldquo;49% of reps are achieving 100%+ of quota and fully ramped
          reps are averaging 117% attainment.&rdquo;
        </p>
        <p className="mt-2 text-sm text-ink-2">
          Two others shared a team result without saying how many reps hit: Ramp&apos;s top 20% of reps, and Samsara&apos;s DACH team.
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold">What to do with this</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          If the posting won&apos;t tell you, ask. Start with: &ldquo;What percentage of fully ramped reps earned their full OTE last year?&rdquo;
          And if the posting only shows a base, ask what the commission target is and how it&apos;s paid.
        </p>
        <Link href="/kit#top-five" className="mt-4 inline-block font-semibold text-accent hover:underline">
          Josh&apos;s top five questions for any sales interview →
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">A closer look: 25 postings, checked line by line</h2>
        <p className="mt-2 text-sm text-ink-3">
          The 25 newest US rep openings, one per company, posted October 22 to 24. {total - count("none")} showed a pay number, {count("split")} showed
          base and commission, and none gave a quota or said how many reps hit it. Pay is written the way each posting labeled it. This isn&apos;t a
          ranking.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2.5">Company and role</th>
                <th className="px-3 py-2.5">What the posting showed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROWS.map((r) => (
                <tr key={r.company}>
                  <td className="px-3 py-2.5 align-top">
                    <span className="font-semibold">{r.company}</span>
                    <br />
                    <span className="text-ink-2">{r.role}</span>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                      <span className={`h-2.5 w-2.5 rounded-sm ${PAY[r.pay].tone}`} aria-hidden />
                      {PAY[r.pay].label}
                    </span>
                    <br />
                    {r.shown}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 text-sm leading-relaxed text-ink-3">
        <h2 className="font-bold text-ink-2">How I did it</h2>
        <p className="mt-1">
          I analyzed every live posting on Braun Board for individual SDRs, AEs and account managers on October 25, 2026: {FULL.postings.toLocaleString()}{" "}
          postings from {FULL.companies} companies in the US, Canada and the UK. Every posting comes straight from the company&apos;s own careers page.
          Pay comes from the posting text and the pay fields the company&apos;s job system shows. For everything else, AI read each posting, and a
          detail only counted when it quoted the posting word for word and gave a number where one was needed. Requirements about a candidate&apos;s
          past, like &ldquo;a history of quota attainment,&rdquo; don&apos;t count.
        </p>
        <p className="mt-2">
          Then 50 random postings were checked line by line against the AI&apos;s reading: no false &ldquo;yes&rdquo; calls, and one borderline
          miss. Every quota, attainment and ramp result was also reviewed individually. Postings change after they go up, so this is a snapshot.
        </p>
      </section>

      <p className="mt-8 text-[15px]">
        <Link href="/for-you" className="font-semibold text-ink underline underline-offset-2">Find sales jobs that show their numbers →</Link>
      </p>
    </article>
  );
}
