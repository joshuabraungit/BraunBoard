import Link from "next/link";
import type { JobView } from "@/lib/data";
import { freshnessLabel, isFresh } from "@/lib/freshness";
import { languageFor, formatComp, formatLocation } from "@/lib/format";
import { CompanyLogo } from "./CompanyLogo";
import { SaveJobButton, HideJobButton } from "./Actions";
import { MatchBadge, matchShowsOnCard } from "./MatchBadge";
import { LIGHT, VerdictPill } from "./BraunRead";
import { braunRead, flagsFromCodes, isHeadsUp, isRedFlag, type Flag } from "@/lib/flags";
import type { MatchResult } from "@/lib/match";
import { attainmentLabel } from "@/lib/attainment";
import { collapseOpenings, openingsLabel } from "@/lib/openings";
import { cardExtrasFor, type CardExtras } from "@/lib/card-extras";

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

type Tone = "green" | "yellow" | "red";
interface Light {
  tone: Tone;
  text: string;
  why?: string;
}

const DOT: Record<Tone, string> = LIGHT;

// Flags the pay and quota lights already cover, or that are too routine to be the standout.
const NOT_STANDOUT = new Set(["publishes_ote", "shares_attainment", "attainment_average", "states_quota", "states_deal_size", "open_90_days"]);

/**
 * The Braun Read on a card: three lights a rep can scan. Pay, quota, and the one thing that
 * stands out most about this job. The full verdict and the reasons live on the job page.
 */
export function cardLights(job: JobView, read: ReturnType<typeof braunRead>): Light[] {
  // Pay
  const pay: Light =
    job.ote_min != null && job.salary_min != null
      ? { tone: "green", text: "Base + OTE listed" }
      : job.ote_min != null
        ? { tone: "green", text: "OTE listed" }
        : job.salary_min != null
          ? { tone: "yellow", text: "Base only, no OTE" }
          : { tone: "red", text: "No pay listed" };

  // Quota
  const a = job.attainment;
  const t = read.checks.find((c) => c.label === "Transparency")?.grade;
  const quota: Light = a
    ? { tone: a.kind === "hit" ? "green" : "yellow", text: attainmentLabel(a), why: `In their words: "${a.quote}"` }
    : job.disclosures?.quota_size
      ? { tone: "green", text: "States the quota" }
      : t === "good"
        ? { tone: "green", text: "Shares deal details" }
        : t === "ok"
          ? { tone: "yellow", text: "Some quota info" }
          : { tone: "red", text: "No quota info" };

  // The standout: a red flag first, then a stale posting, then a heads-up, then the best green flag, then freshness.
  const flags = flagsFromCodes(job.flags).filter((f) => !NOT_STANDOUT.has(f.code));
  const asLight = (f: Flag, tone: Tone): Light => ({ tone, text: f.label, why: f.why });
  const red = flags.find(isRedFlag);
  const headsUp = flags.find(isHeadsUp);
  const green = flags.find((f) => f.tone === "green");
  // How long it's been open is the life meter's job, so it's not a light.
  const standout: Light | null = red ? asLight(red, "red") : headsUp ? asLight(headsUp, "yellow") : green ? asLight(green, "green") : null;
  // Nothing stands out: say where deals come from, which matters to AEs (SDRs prospect by definition).
  const sdr = job.role_family === "SDR/BDR";
  const pipeline: Record<string, string> = { High: "You find your own leads", Medium: "Some leads come to you", Low: "Leads come to you" };
  const fallback: Light | null = !sdr && pipeline[job.self_sourcing_level] ? { tone: "green", text: pipeline[job.self_sourcing_level]! } : null;

  // When base and OTE are both listed, the pay line and its base/commission bar already say so.
  const payLight = job.ote_min != null && job.salary_min != null ? null : pay;
  return [payLight, quota, standout ?? fallback].filter((l): l is Light => !!l);
}

function Lights({ lights }: { lights: Light[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3.5 gap-y-1">
      {lights.map((l) => (
        <li key={l.text} title={l.why} className="flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[l.tone]}`} aria-label={l.tone} />
          {l.text}
        </li>
      ))}
    </ul>
  );
}

/**
 * A job card answers one question: is this worth a click? Title, who and where, the pay, the
 * Braun Read, and what you'd sell in plain English. Tags and the long summary live on the job page.
 */
/**
 * The life meter: a video-game health bar that drains as a job stays open. Five bars when it's
 * new, one lost about every two weeks. Long-open jobs are worth a question, not a pass.
 */
const LIFE: { maxDays: number; bars: number; tone: Tone; line: string }[] = [
  { maxDays: 14, bars: 5, tone: "green", line: "Full health. Just posted." },
  { maxDays: 30, bars: 4, tone: "green", line: "Still going strong." },
  { maxDays: 45, bars: 3, tone: "yellow", line: "Taking some hits. Ask how long they've been looking." },
  { maxDays: 60, bars: 2, tone: "yellow", line: "Health running low. Ask why it's still open." },
  { maxDays: 90, bars: 1, tone: "red", line: "Last life. Ask why it's been hard to fill." },
  { maxDays: Infinity, bars: 0, tone: "red", line: "Game over? Still on their site, but open 3+ months." },
];

export function LifeMeter({ postedAt, now = Date.now() }: { postedAt: string; now?: number }) {
  const days = Math.max(0, Math.floor((now - new Date(postedAt).getTime()) / 86_400_000));
  const life = LIFE.find((l) => days <= l.maxDays)!;
  const label = `${life.line} Open ${days === 1 ? "1 day" : `${days} days`}.`;
  return (
    <span className="inline-flex items-center gap-[2px] align-[1px]" title={label} aria-label={label} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`h-2.5 w-[5px] rounded-[1px] ${i < life.bars ? DOT[life.tone] : "bg-line-strong"}`} />
      ))}
    </span>
  );
}

/** Share of the paycheck that's base, from the middle of each range. Null unless both are listed. */
function baseShare(job: JobView): number | null {
  if (job.salary_min == null || job.ote_min == null) return null;
  const base = (job.salary_min + (job.salary_max ?? job.salary_min)) / 2;
  const ote = (job.ote_min + (job.ote_max ?? job.ote_min)) / 2;
  if (ote <= 0 || base > ote) return null;
  return Math.round((base / ote) * 10) * 10; // nearest 10%, so it reads "60/40"
}

const SIZE_WORDS: Record<string, string> = { SMB: "small businesses", "Mid-Market": "medium-size companies", Enterprise: "big companies", Strategic: "a short list of very big companies" };

/** "restaurant owners", from the posting; or the size of company, when that's all it says. */
function sellsTo(job: JobView): string | null {
  const b = job.buyer?.trim().replace(/\.\s*$/, "");
  // Lowercase the first letter so it reads as part of the line, but leave "UK rail" and "CISOs" alone.
  if (b) return /^[A-Z][a-z]/.test(b) ? b[0]!.toLowerCase() + b.slice(1) : b;
  const seg = job.customer_segment !== "Unknown" ? job.customer_segment : job.sales_segment !== "Unknown" ? job.sales_segment : null;
  return seg ? SIZE_WORDS[seg] ?? null : null;
}

/** The money row under the pay: base vs. commission, how the pay ranks, and deal size. */
function MoneyRow({ job, extras }: { job: JobView; extras?: CardExtras }) {
  const share = baseShare(job);
  if (share == null && !extras?.pay && !job.deal_size) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-ink-2">
      {share != null && (
        <span className="flex items-center gap-1.5" title={`About ${share}% of the paycheck is base salary and ${100 - share}% is commission, if you hit quota.`}>
          <span className="flex h-2 w-16 overflow-hidden rounded-full bg-accent/20" aria-hidden>
            <span className="h-full bg-accent" style={{ width: `${share}%` }} />
          </span>
          {share}/{100 - share} base/commission
        </span>
      )}
      {extras?.pay && (
        <span className={extras.pay.dir === "up" ? "font-semibold text-accent" : "text-ink-3"}>
          {extras.pay.dir === "up" ? "↑" : "↓"} {extras.pay.text}
        </span>
      )}
      {job.deal_size && <span title="What a deal in this job is worth, per the posting">Deals: {job.deal_size}</span>}
    </div>
  );
}

export function JobCard({ job, ctx, openings = 1, locations = 1, extras }: { job: JobView; ctx: CardContext; openings?: number; locations?: number; extras?: CardExtras }) {
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
          <span className="font-medium text-ink">{job.company_name}</span> · {job.remote_type === "Onsite" && "In office · "}{formatLocation(job)} ·{" "}
          <span className="whitespace-nowrap">
            <LifeMeter postedAt={job.first_seen_at} /> <span className={fresh ? "font-medium text-fresh" : ""}>{freshnessLabel(job.first_seen_at)}</span>
          </span>
          {more && <span className="font-medium text-ink"> · {more}</span>}
        </span>
      </p>

      {extras?.hiring && <p className="mt-1 text-xs font-semibold text-fresh">🔥 {extras.hiring}</p>}

      {comp && <p className="mt-2 text-[15px] font-semibold text-accent">{comp}</p>}
      <MoneyRow job={job} extras={extras} />

      {/* Only the two ends of the verdict earn a spot on the card; the lights carry the rest. */}
      {(read.verdict === "Strong posting" || read.verdict === "Proceed with caution") && (
        <div className="mt-2">
          <VerdictPill verdict={read.verdict} />
        </div>
      )}
      <div className="mt-2.5">
        <Lights lights={cardLights(job, read)} />
      </div>

      {job.company_sells && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-2">
          <span className="text-ink-3">Sells: </span>
          {job.company_sells.replace(/\.\s*$/, "")}
        </p>
      )}
      {sellsTo(job) && (
        <p className="mt-0.5 line-clamp-1 text-sm leading-relaxed text-ink-2">
          <span className="text-ink-3">Sells to: </span>
          {sellsTo(job)}
        </p>
      )}

      {match && matchShowsOnCard(match) && (
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

export async function JobGrid({ jobs, ctx, empty = "Nothing here yet." }: { jobs: JobView[]; ctx: CardContext; empty?: string }) {
  if (!jobs.length) return empty ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-3">{empty}</p> : null;
  const cards = collapseOpenings(jobs);
  const extras = await cardExtrasFor(cards.map((c) => c.job)).catch(() => new Map<string, CardExtras>());
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ job, openings, locations }) => (
        <JobCard key={job.id} job={job} ctx={ctx} openings={openings} locations={locations} extras={extras.get(job.id)} />
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
