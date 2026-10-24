import type { Metadata } from "next";
import Link from "next/link";

// Braun Board Job Market Report #1. A snapshot: every number below was read from the 25 postings
// on Oct 24, 2026, and pay is labeled the way each posting labels it. Postings change; this page doesn't.

export const metadata: Metadata = {
  title: "Job Market Report, October 2026 · Braun Board",
  description:
    "We read 25 new B2B sales job postings. 23 showed a pay number. 9 showed both base and commission. None said what the quota is or how many reps hit it.",
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

const ORDER: Pay[] = ["split", "total", "base", "unlabeled", "none"];
const count = (p: Pay) => ROWS.filter((r) => r.pay === p).length;

const MISSING = [
  { n: 0, what: "said what the quota is" },
  { n: 0, what: "said how many reps hit quota" },
  { n: 1, what: "gave a typical deal size" },
  { n: 0, what: "gave a sales cycle length" },
  { n: 0, what: "mentioned a ramp period" },
  { n: 0, what: "mentioned accelerators or clawbacks" },
];

export default function Report() {
  const total = ROWS.length;
  const anyPay = total - count("none");
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">Braun Board Job Market Report · No. 1</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Most sales jobs show a number. Few show the one that matters.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        We read 25 new B2B sales job postings, line by line. {anyPay} showed a pay number. Only {count("split")} showed both the base and the
        commission. None said what the quota is or how many reps hit it. By Josh Braun, October 24, 2026.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [`${anyPay} of ${total}`, "showed a pay number"],
          [`${count("split")} of ${total}`, "showed base and commission"],
          ["0 of 25", "said what the quota is"],
          ["0 of 25", "said how many reps hit quota"],
        ].map(([n, t]) => (
          <div key={t} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-2xl font-bold tracking-tight">{n}</p>
            <p className="mt-0.5 text-sm text-ink-2">{t}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Pay: a number, but not the whole picture</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Pay transparency is real progress. But for a commission job, a salary range alone can leave out a big part of the paycheck. {count("base")} of the 25
          postings showed a base salary and nothing about commission.
        </p>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full" role="img" aria-label="How the 25 postings showed pay">
          {ORDER.map((p) => (
            <div key={p} className={PAY[p].tone} style={{ width: `${(count(p) / total) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-4 space-y-2.5">
          {ORDER.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px]">
              <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-sm ${PAY[p].tone}`} aria-hidden />
              <span>
                <span className="font-semibold">
                  {PAY[p].label}: {count(p)}
                </span>
                {PAY[p].note && <span className="text-ink-2"> · {PAY[p].note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">What the postings left out</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">The details that decide whether the pay is reachable were almost never there. Of the 25 postings:</p>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {MISSING.map((m) => (
            <li key={m.what} className="flex items-baseline gap-4 px-4 py-3">
              <span className="w-10 shrink-0 text-xl font-bold tabular-nums">{m.n}</span>
              <span className="text-[15px]">{m.what}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          One more thing stood out. Two postings asked candidates for a <span className="font-semibold text-ink">consistent history of quota attainment</span>.
          None of the 25 shared how their own team is doing.
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
        <h2 className="text-xl font-bold tracking-tight">All 25 postings</h2>
        <p className="mt-2 text-sm text-ink-3">Pay is written the way each posting labeled it. This isn&apos;t a ranking.</p>
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
        <h2 className="font-bold text-ink-2">How we picked the 25</h2>
        <p className="mt-1">
          The 25 newest openings on Braun Board for individual SDRs, AEs and account managers in the US, one per company, posted October 22 to 24,
          2026. Every posting comes straight from the company&apos;s own careers page. We read each one in full, including the pay details the job
          system shows. Postings change after they go up, so this is a snapshot of what they said on October 24.
        </p>
      </section>

      <p className="mt-8 text-[15px]">
        <Link href="/for-you" className="font-semibold text-ink underline underline-offset-2">Find sales jobs that show their numbers →</Link>
      </p>
    </article>
  );
}
