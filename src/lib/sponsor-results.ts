// The sponsor results page: turns raw counts into the rows the sponsor reads. Pure, so it's tested.

export interface ResultsCounts {
  views_by_source: Record<string, number>;
  clicks_by_source: Record<string, number>;
  tracked_clicks: number;
}

export interface SourceRow {
  label: string;
  views: number;
  /** Share of visits, 0 to 100, whole numbers. */
  pct: number;
  clicks: number;
}

/** Plain names a sponsor recognizes. Visits from Braun Board itself (the home page card) show as "Direct". */
const LABELS: Record<string, string> = {
  Direct: "Braun Board home page and direct",
  Email: "Newsletter and email",
  "com.linkedin.android": "LinkedIn",
};
const labelOf = (source: string) => LABELS[source] ?? source;

/** Rows by source, biggest first. Small sources (under 2% of visits) fold into "Other", clicks and all. */
export function sourceRows(c: ResultsCounts): SourceRow[] {
  const merged = new Map<string, { views: number; clicks: number }>();
  const add = (src: string, k: "views" | "clicks", n: number) => {
    const label = labelOf(src);
    const r = merged.get(label) ?? { views: 0, clicks: 0 };
    r[k] += n;
    merged.set(label, r);
  };
  for (const [s, n] of Object.entries(c.views_by_source ?? {})) add(s, "views", n);
  for (const [s, n] of Object.entries(c.clicks_by_source ?? {})) add(s, "clicks", n);

  const total = [...merged.values()].reduce((a, r) => a + r.views, 0);
  const rows: SourceRow[] = [];
  const other = { views: 0, clicks: 0 };
  for (const [label, r] of merged) {
    if (total && r.views / total < 0.02) {
      other.views += r.views;
      other.clicks += r.clicks;
      continue;
    }
    rows.push({ label, views: r.views, clicks: r.clicks, pct: 0 });
  }
  if (other.views) rows.push({ label: "Other", views: other.views, clicks: other.clicks, pct: 0 });
  for (const r of rows) r.pct = total ? Math.round((r.views / total) * 100) : 0;
  return rows.sort((a, b) => (a.label === "Other" ? 1 : b.label === "Other" ? -1 : b.views - a.views || b.clicks - a.clicks));
}

/** Apply clicks per 100 views, one decimal when it's small. */
export function applyRate(views: number, clicks: number): string | null {
  if (!views) return null;
  const r = (clicks / views) * 100;
  return `${r < 10 ? Math.round(r * 10) / 10 : Math.round(r)}%`;
}

/** Whole days between two moments, never negative. */
export const daysBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));

/** Where the run stands: "Day 6 of 30" while live, "Finished Dec 3" after. */
export function runLine(liveAt: string | null, endsAt: string | null, now = new Date()): string {
  if (!liveAt || !endsAt) return "Not live yet";
  const start = new Date(liveAt);
  const end = new Date(endsAt);
  if (now < start) return `Goes live ${shortDay(start)}`;
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  if (now >= end) return `Ran ${shortDay(start)} to ${shortDay(end)}`;
  return `Day ${Math.min(total, daysBetween(start, now) + 1)} of ${total}`;
}

export const shortDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

/** A count the sponsor typed in: whole number 0..100000, or null for blank. Anything else is an error. */
export function parseCount(raw: FormDataEntryValue | null): number | null | "bad" {
  const s = String(raw ?? "").trim().replace(/,/g, "");
  if (!s) return null;
  if (!/^\d{1,6}$/.test(s)) return "bad";
  const n = Number(s);
  return n <= 100000 ? n : "bad";
}

/** Where a sponsored run is: the day, the total, days left, and whether it's over. Null before it goes live. */
export function runState(liveAt: string | null, endsAt: string | null, now = new Date()) {
  if (!liveAt || !endsAt) return null;
  const start = new Date(liveAt);
  const end = new Date(endsAt);
  if (now < start) return null;
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const over = now >= end;
  const day = over ? total : Math.min(total, daysBetween(start, now) + 1);
  return { day, total, left: over ? 0 : Math.max(0, total - day), over };
}

/** Josh's note on the results page. It changes with where the run is. */
export function phaseNote(r: { day: number; total: number; left: number; over: boolean } | null, newsletterStillSending: boolean): string {
  if (!r) return "Your job isn't live yet. As soon as it is, this page starts filling in.";
  if (r.over) return "That's a wrap. Thanks for trusting me with this one. If you hire someone who found you on Braun Board, I'd really like to hear about it.";
  if (r.left <= 7) return "Final stretch. If the role's still open, you can run it another 30 days. The renew button is at the bottom of this page.";
  if (r.day <= 10)
    return newsletterStillSending
      ? "Early days. My newsletter is still going out, so more people will see your job over the next few days."
      : "Early days. Your job is pinned to the top of the home page, so sellers who stop by see it first.";
  return "Past the halfway mark. Your job is still pinned to the top of the home page, so sellers who stop by every day keep seeing it.";
}
