// Validation for the /sponsor order form. Pure, so it's easy to test.
import { z } from "zod";

export const SPONSOR_DAYS = 30;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
export const CURRENCIES = ["USD", "CAD", "GBP"] as const;
export const REMOTE_TYPES = ["Remote", "Hybrid", "On-site"] as const;

/** "$120,000", "120k", "120000" -> 120000. Blank -> null. Junk -> NaN. */
export function parseMoney(raw: unknown): number | null {
  const s = String(raw ?? "").trim().toLowerCase().replace(/[$£,\s]/g, "");
  if (!s) return null;
  const m = s.match(/^(\d+(?:\.\d+)?)(k)?$/);
  if (!m) return NaN;
  return Math.round(Number(m[1]) * (m[2] ? 1000 : 1));
}

const text = (max: number) => z.string().trim().min(1, "Required").max(max, `Keep it under ${max} characters`);
const money = z
  .unknown()
  .transform(parseMoney)
  .refine((v) => v === null || (Number.isFinite(v) && v >= 10_000 && v <= 2_000_000), "Use a yearly amount like 120,000");

const schema = z
  .object({
    company: text(120),
    contact_name: text(120),
    email: z.string().trim().toLowerCase().pipe(z.email("That email doesn't look right")),
    job_title: text(140),
    job_url: z.string().trim().pipe(z.url({ protocol: /^https?$/, error: "Paste the full link, starting with https://" })),
    description: text(3000),
    salary_min: money,
    salary_max: money,
    ote_min: money,
    ote_max: money,
    currency: z.enum(CURRENCIES),
    location: z.string().trim().max(120).optional().transform((v) => v || null),
    remote_type: z.enum(REMOTE_TYPES, { error: "Pick one" }),
    start_date: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a date"),
    notes: z.string().trim().max(1000).optional().transform((v) => v || null),
    product_short: z.string().trim().max(80, "Keep it under 80 characters").optional().transform((v) => v || null),
    product_story: z.string().trim().max(500, "Keep it under 500 characters").optional().transform((v) => v || null),
    sales_role: z.literal("yes", { error: "Sponsored jobs have to be sales roles" }),
  });

/** Checks that span fields. Runs on the raw input so they show alongside every other error. */
function crossChecks(raw: Record<string, unknown>): FieldErrors {
  const e: FieldErrors = {};
  const m = (k: string) => parseMoney(raw[k]);
  const ok = (n: number | null): n is number => n !== null && Number.isFinite(n);
  const [smin, smax, omin, omax] = [m("salary_min"), m("salary_max"), m("ote_min"), m("ote_max")];
  if (smin === null) e.salary_min = "Base salary is required";
  if (smax === null) e.salary_max = "Base salary is required";
  if (ok(smin) && ok(smax) && smin > smax) e.salary_max = "Max should be at least the min";
  if ((omin === null) !== (omax === null)) e[omin === null ? "ote_min" : "ote_max"] = "Add both ends of the OTE range, or leave both blank";
  else if (ok(omin) && ok(omax) && omin > omax) e.ote_max = "Max should be at least the min";
  const remote = String(raw.remote_type ?? "");
  if (remote && remote !== "Remote" && !String(raw.location ?? "").trim()) e.location = "Where is the job?";
  const start = String(raw.start_date ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(start) && start < new Date().toISOString().slice(0, 10)) e.start_date = "Pick today or later";
  return e;
}

export type SponsorOrder = Omit<z.output<typeof schema>, "sales_role" | "salary_min" | "salary_max"> & {
  salary_min: number;
  salary_max: number;
};
export type FieldErrors = Partial<Record<string, string>>;

export function parseSponsorForm(fd: FormData): { ok: true; order: SponsorOrder } | { ok: false; errors: FieldErrors } {
  const raw = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string"));
  const r = schema.safeParse(raw);
  const errors: FieldErrors = {};
  for (const i of r.success ? [] : r.error.issues) errors[String(i.path[0] ?? "form")] ??= i.message;
  for (const [k, msg] of Object.entries(crossChecks(raw))) errors[k] ??= msg;
  if (!r.success || Object.keys(errors).length) return { ok: false, errors };
  const { sales_role: _ok, ...order } = r.data;
  void _ok;
  return { ok: true, order: order as SponsorOrder };
}

/** Logo is optional. Returns an error message, or null when it's fine (or absent). */
export function checkLogo(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > LOGO_MAX_BYTES) return "That logo is over 2MB. Try a smaller PNG.";
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return "Use a PNG, JPG, WebP or SVG.";
  return null;
}

export const formatPrice = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

/** Price lives in SPONSOR_PRICE_CENTS so it can change without a deploy of code. */
export function sponsorPriceCents(): number | null {
  const n = Number(process.env.SPONSOR_PRICE_CENTS);
  return Number.isInteger(n) && n >= 100 ? n : null;
}

export const MAX_LIVE_SPONSORS = 2;

/**
 * When a sponsorship runs once Josh marks it live: from now, or from the buyer's
 * preferred start date if that's later (8am ET that day), for SPONSOR_DAYS days.
 */
export function liveWindow(
  startDate: string | null,
  now = new Date(),
  booked: { live_at: string; ends_at: string }[] = [],
): { live_at: string; ends_at: string } {
  const preferred = startDate ? new Date(`${startDate}T12:00:00Z`) : null;
  const start = nextOpenSpot(preferred && preferred > now ? preferred : now, booked);
  const end = new Date(start.getTime() + SPONSOR_DAYS * 86_400_000);
  return { live_at: start.toISOString(), ends_at: end.toISOString() };
}

/**
 * Earliest moment at or after `from` when a new SPONSOR_DAYS run never puts more than
 * MAX_LIVE_SPONSORS on the page at once. A third sponsor waits for a spot instead of
 * pushing someone off mid-run, and a sponsor already scheduled for later keeps its slot.
 */
export function nextOpenSpot(from: Date, booked: { live_at: string; ends_at: string }[]): Date {
  const runs = booked.map((b) => ({ start: new Date(b.live_at).getTime(), end: new Date(b.ends_at).getTime() }));
  const showingAt = (x: number) => runs.filter((r) => r.start <= x && r.end > x);
  let t = from.getTime();
  for (let guard = 0; guard < 4 * runs.length + 2; guard++) {
    const until = t + SPONSOR_DAYS * 86_400_000;
    // Who's on the page only changes when someone starts, so check our start and every start inside our run.
    const checks = [t, ...runs.map((r) => r.start).filter((x) => x > t && x < until)];
    const full = checks.find((x) => showingAt(x).length >= MAX_LIVE_SPONSORS);
    if (full === undefined) return new Date(t);
    t = Math.min(...showingAt(full).map((r) => r.end));
  }
  return new Date(t);
}

/** Showing on the site right now. */
export const isRunning = (s: { status: string; live_at: string | null; ends_at: string | null }, now = new Date()) =>
  s.status === "live" && !!s.live_at && !!s.ends_at && new Date(s.live_at) <= now && new Date(s.ends_at) > now;

const short = (n: number, cur: string) => {
  const sym = cur === "GBP" ? "£" : "$";
  return `${sym}${n % 1000 === 0 ? `${n / 1000}K` : `${Math.round(n / 100) / 10}K`}`;
};
const range = (a: number, b: number, cur: string) => (a === b ? short(a, cur) : `${short(a, cur)}–${short(b, cur)}`);

/** "$95K–$110K base · $190K–$220K OTE" (CAD noted at the end). */
export function payLine(p: { salary_min: number; salary_max: number; ote_min: number | null; ote_max: number | null; currency: string }) {
  const parts = [`${range(p.salary_min, p.salary_max, p.currency)} base`];
  if (p.ote_min && p.ote_max) parts.push(`${range(p.ote_min, p.ote_max, p.currency)} OTE`);
  return parts.join(" · ") + (p.currency === "CAD" ? " CAD" : "");
}

/** Josh's edits from Admin: the words sellers read. Blank product fields clear them. */
const editSchema = z.object({
  job_title: text(140),
  job_url: z.string().trim().pipe(z.url({ protocol: /^https?$/, error: "Paste the full link, starting with https://" })),
  description: text(3000),
  product_short: z.string().trim().max(80, "Keep it under 80 characters").transform((v) => v || null),
  product_story: z.string().trim().max(500, "Keep it under 500 characters").transform((v) => v || null),
});
export type SponsorEdit = z.output<typeof editSchema>;

export function parseSponsorEdit(fd: FormData): { ok: true; edit: SponsorEdit } | { ok: false; error: string } {
  const raw = Object.fromEntries(["job_title", "job_url", "description", "product_short", "product_story"].map((k) => [k, String(fd.get(k) ?? "")]));
  const r = editSchema.safeParse(raw);
  if (!r.success) {
    const i = r.error.issues[0];
    return { ok: false, error: `${String(i.path[0]).replace("_", " ")}: ${i.message}` };
  }
  return { ok: true, edit: r.data };
}
