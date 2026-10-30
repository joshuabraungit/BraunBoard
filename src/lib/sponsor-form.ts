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
