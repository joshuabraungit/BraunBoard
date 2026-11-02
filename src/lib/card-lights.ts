// The Braun Read as three lights a rep can scan (pay, quota, the standout). Shared by job cards and the Picks email.
import type { JobView } from "./data";
import { braunRead, FLAG_RULES, flagsFromCodes, isHeadsUp, isRedFlag, type Flag } from "./flags";
import { attainmentLabel } from "./attainment";

export type Tone = "green" | "yellow" | "red";
export interface Light {
  tone: Tone;
  text: string;
  why?: string;
}

// Flags the pay and quota lights already cover, or that are too routine to be the standout.
const NOT_STANDOUT = new Set(["pay_type_unclear", "publishes_ote", "shares_attainment", "attainment_average", "states_quota", "states_deal_size", "open_90_days"]);

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
        : job.salary_min != null && job.flags?.includes("pay_type_unclear")
          ? { tone: "yellow", text: "Base or OTE? Ask", why: FLAG_RULES.pay_type_unclear?.why }
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
          : { tone: "yellow", text: "No quota info" };

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


const SIZE_WORDS: Record<string, string> = { SMB: "small businesses", "Mid-Market": "medium-size companies", Enterprise: "big companies", Strategic: "very big companies" };

/** "Restaurant owners", from the posting; or the size of company, when that's all it says. */
export function sellsTo(job: Pick<JobView, "buyer_short" | "customer_segment" | "sales_segment">): string | null {
  // The short label ("Restaurant owners"); the full buyer line is on the job page.
  const b = job.buyer_short?.trim();
  if (b) return b;
  const seg = job.customer_segment !== "Unknown" ? job.customer_segment : job.sales_segment !== "Unknown" ? job.sales_segment : null;
  const words = seg ? SIZE_WORDS[seg] ?? null : null;
  return words ? words[0]!.toUpperCase() + words.slice(1) : null;
}

