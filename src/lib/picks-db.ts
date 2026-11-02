// Braun's Picks: database side. Server-only (service role).
import type { SupabaseClient } from "@supabase/supabase-js";
import { braunRead } from "./flags";
import { hiringSentence } from "./hiring-text";
import type { CompanyStats } from "./data";
import {
  chooseSkip,
  choosePicks,
  cleanTitle,
  introFor,
  nextIssueDate,
  pickMeta,
  pickPay,
  sendAtFor,
  skipTake,
  subjectFor,
  templateTake,
  type PickCandidate,
} from "./picks";
import { k } from "./salaries";
import { cardLights, sellsTo } from "./card-lights";
import { HUNTER_LABELS } from "./hunter";
import type { JobView } from "./data";
import type { PickExtras } from "./picks-email";

const COLUMNS =
  "id, slug, title_raw, company_id, company_name, role_family, sales_segment, sales_motion, customer_segment, remote_type, city, state, location_raw, summary, salary_min, salary_max, ote_min, ote_max, self_sourcing_level, disclosures, flags, currency, markets, attainment, company_sells, buyer_short, first_seen_at:posted_at";

// ---------------------------------------------------------------------------
// What the email shows beyond the stored item: what you'd sell, who to, the motion, the key light,
// and how long it's been open. Looked up live from the job so older drafts get it too.
// ---------------------------------------------------------------------------

type ExtrasJob = Pick<
  JobView,
  | "id" | "role_family" | "sales_segment" | "sales_motion" | "customer_segment" | "self_sourcing_level" | "remote_type" | "city" | "state" | "location_raw"
  | "markets" | "salary_min" | "salary_max" | "ote_min" | "ote_max" | "flags" | "attainment" | "disclosures" | "company_sells" | "buyer_short" | "first_seen_at"
>;

function motionLabel(j: ExtrasJob): string | null {
  if (j.sales_motion === "Channel") return "Partnerships";
  return HUNTER_LABELS[j.sales_motion] ?? null;
}

/**
 * The single light worth a line in the email: any red, then a yellow about pay or the standout, then the
 * standout green. Missing quota info is so common it would say the same thing on every pick, so it goes last.
 */
export function keyLight(j: ExtrasJob): PickExtras["light"] {
  const job = j as unknown as JobView;
  const lights = cardLights(job, braunRead({ ...job, description_raw: null }));
  // The quota light's own wording (see card-lights.ts), not a green flag that happens to mention quota.
  const quota = /quota info$|^States the quota$|^Shares deal details$|hit quota$|average attainment$/;
  const pick =
    lights.find((l) => l.tone === "red") ??
    lights.find((l) => l.tone === "yellow" && !quota.test(l.text)) ??
    lights.find((l) => l.tone === "green" && !quota.test(l.text) && !/listed$/.test(l.text)) ??
    lights.find((l) => l.tone === "yellow") ??
    lights[lights.length - 1];
  return pick ? { tone: pick.tone, text: pick.text } : null;
}

export function extrasFor(j: ExtrasJob): PickExtras {
  return {
    meta: pickMeta(j as unknown as PickCandidate),
    motion: motionLabel(j),
    sells: j.company_sells?.trim() || null,
    sellsTo: sellsTo(j),
    light: keyLight(j),
    postedAt: j.first_seen_at,
  };
}

/** Live extras for an issue's items, keyed by item id. Jobs that went away just get none. */
export async function loadItemExtras(db: SupabaseClient, items: { id: string; job_id?: string | null }[]): Promise<Map<string, PickExtras>> {
  const ids = [...new Set(items.map((i) => i.job_id).filter((x): x is string => !!x))];
  const out = new Map<string, PickExtras>();
  if (!ids.length) return out;
  const { data, error } = await db
    .from("visible_jobs")
    .select(
      "id, role_family, sales_segment, sales_motion, customer_segment, self_sourcing_level, remote_type, city, state, location_raw, markets, salary_min, salary_max, ote_min, ote_max, flags, attainment, disclosures, company_sells, buyer_short, first_seen_at:posted_at",
    )
    .in("id", ids);
  if (error) return out; // the email still works without extras
  const byJob = new Map(((data ?? []) as unknown as ExtrasJob[]).map((j) => [j.id, j]));
  for (const i of items) {
    const j = i.job_id ? byJob.get(i.job_id) : null;
    if (j) out.set(i.id, extrasFor(j));
  }
  return out;
}

/** Jobs posted in the last 2 weeks, with company hiring stats attached. Picks is a US + Canada email. */
export async function loadCandidates(db: SupabaseClient): Promise<PickCandidate[]> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const rows: PickCandidate[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("visible_jobs").select(COLUMNS).gte("posted_at", since).overlaps("markets", ["US", "CA"]).order("id").range(from, from + 999);
    if (error) throw new Error(`picks candidates: ${error.message}`);
    rows.push(...((data ?? []) as unknown as PickCandidate[]));
    if (!data || data.length < 1000) break;
  }
  const { data: stats } = await db.from("company_stats").select("company_id, open_roles, new_30d, new_prev_30d, closed_30d, median_days_open, open_roles_30d_ago, trend");
  const byCo = new Map((stats ?? []).map((s) => [s.company_id as string, s as unknown as CompanyStats]));
  return rows.map((r) => ({ ...r, description_raw: null, company: byCo.get(r.company_id) ?? null }));
}

/** A rotating "number of the week" built from live data. */
export async function statLine(db: SupabaseClient, weekIndex: number): Promise<string | null> {
  const { data: ov } = await db.rpc("admin_overview");
  const o = ov as { jobs_live: number; jobs_with_pay: number } | null;
  const { data: ramp } = await db
    .from("company_stats")
    .select("new_30d, companies!inner(name, is_disabled)")
    .eq("trend", "ramping")
    .eq("companies.is_disabled", false)
    .order("new_30d", { ascending: false })
    .limit(1);
  const top = (ramp?.[0] as unknown as { new_30d: number; companies: { name: string } } | undefined) ?? null;

  const options = [
    o && o.jobs_live ? `${Math.round((o.jobs_with_pay / o.jobs_live) * 100)}% of the ${o.jobs_live.toLocaleString()} sales jobs on Braun Board publish pay. If a company won't, ask why on the first call.` : null,
    top ? `${top.companies.name} posted ${top.new_30d} sales roles in the last 30 days, more than anyone we track. Fast hiring means open territory, or a revolving door. Ask which.` : null,
    await remoteVsOffice(db),
  ].filter((x): x is string => !!x);
  return options.length ? options[weekIndex % options.length]! : null;
}

async function remoteVsOffice(db: SupabaseClient): Promise<string | null> {
  const { data } = await db
    .from("visible_jobs")
    .select("remote_type, ote_min, ote_max")
    .eq("role_family", "Account Executive")
    .eq("sales_segment", "Enterprise")
    .eq("currency", "USD")
    .not("ote_min", "is", null)
    .limit(1000);
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)]! : null;
  };
  const mid = (r: { ote_min: number; ote_max: number | null }) => (r.ote_min + (r.ote_max ?? r.ote_min)) / 2;
  const rows = (data ?? []) as { remote_type: string; ote_min: number; ote_max: number | null }[];
  const remote = med(rows.filter((r) => r.remote_type === "Remote").map(mid));
  const office = med(rows.filter((r) => r.remote_type === "Hybrid" || r.remote_type === "Onsite").map(mid));
  if (remote == null || office == null || Math.abs(remote - office) < 10_000) return null;
  return `Remote Enterprise AEs post a median ${k(remote)} OTE vs ${k(office)} for hybrid or in-office roles.`;
}

// ---------------------------------------------------------------------------
// AI takes in Josh's voice, grounded in the posting's facts. Falls back to the template.
// ---------------------------------------------------------------------------

const TAKE_SYSTEM = `You write one short "Josh's take" for a sales job in Josh Braun's weekly job picks email.
Josh is a sales trainer known for plain, warm, curious, no-hype writing. He talks to sellers like a friend over coffee.
The reader already sees the title, pay, location, what they'd sell and the key light. Don't repeat those back.
Your job is the opinion: who this job is a good fit for, and the one thing Josh would want to know before taking the call.
Rules:
- 15 to 35 words. One or two sentences. No greeting, no hashtags, no exclamation points, no em dashes.
- Use ONLY the facts provided. Never invent facts about the company, product, culture, quota or pay.
- Interpret signals instead of restating them. A company hiring lots of reps could mean new territory or a revolving door, so say what to ask. A long sales cycle or finding your own leads is a "yellow light" to know about, not a reason to pass.
- End with one specific question to ask on the first call when something important is unknown.
- No jargon. If a non-tech friend wouldn't get a word, use a plainer one.
- Plain text only.
Example of the voice: "Good fit if you like finding your own deals and talking to people who run warehouses. Eight reps hired in a month is a lot. Ask if those are new seats or backfills."`;

/** Why the last AI take fell back to the template, for the job log. */
export let lastTakeError = "";

export async function aiTake(c: PickCandidate, description: string | null): Promise<string> {
  const fallback = templateTake(c);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback;
  const read = braunRead({ ...c, description_raw: null });
  const facts = {
    title: cleanTitle(c.title_raw),
    company: c.company_name,
    what_youd_sell: c.company_sells ?? null,
    new_business_or_account_growth: motionLabel(c as unknown as ExtrasJob),
    pay: pickPay(c),
    where: pickMeta(c),
    summary: c.summary,
    braun_read: read.verdict,
    checks: read.checks.map((x) => `${x.label}: ${x.detail}`),
    green_flags: read.flags.filter((f) => f.tone === "green").map((f) => f.label),
    company_hiring: c.company ? hiringSentence(c.company as CompanyStats) : null,
    posting_excerpt: description?.slice(0, 3000) ?? null,
  };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
        // The model may think before answering; leave room for that plus the take.
        max_tokens: 1500,
        system: TAKE_SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(facts, null, 1) }],
      }),
    });
    if (!res.ok) {
      lastTakeError = `Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`;
      return fallback;
    }
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .replace(/\s*[—–]\s*/g, ", ")
      .replace(/!/g, ".")
      .replace(/^["']|["']$/g, "")
      .trim();
    const words = text.split(/\s+/).length;
    if (words >= 8 && words <= 45) return text;
    lastTakeError = `unusable reply (${words} words, blocks: ${data.content.map((b) => b.type).join(",")}): ${text.slice(0, 120)}`;
    return fallback;
  } catch (e) {
    lastTakeError = (e as Error).message;
    return fallback;
  }
}

const OPENER_SYSTEM = `You write the 1 to 2 sentence opener for Josh Braun's weekly sales job picks email.
Josh is a sales trainer known for plain, warm, curious, no-hype writing. He talks to sellers like a friend.
You get this week's picks. Notice one pattern across them (pay not listed, lots of remote, lots of finding your own leads, a range of deal sizes) and say what a rep should do about it.
Rules: 20 to 40 words. No greeting, no "this week's picks", no hashtags, no exclamation points, no em dashes. Don't name a company. Use only the facts given. Plain text only.`;

/** A short, pattern-spotting opener from Josh. Null if the AI isn't available; the email works without it. */
export async function aiOpener(picks: PickCandidate[]): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || picks.length < 2) return null;
  const facts = picks.map((c) => {
    const x = extrasFor(c as unknown as ExtrasJob);
    return { pay: pickPay(c), where: x.meta, motion: x.motion, light: x.light ? `${x.light.tone}: ${x.light.text}` : null, finds_own_leads: c.self_sourcing_level };
  });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
        max_tokens: 1500,
        system: OPENER_SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(facts, null, 1) }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .replace(/\s*[—–]\s*/g, ", ")
      .replace(/!/g, ".")
      .replace(/^["']|["']$/g, "")
      .trim();
    const words = text.split(/\s+/).length;
    return words >= 10 && words <= 55 ? text : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

export interface DraftResult {
  issueId: string;
  issueDate: string;
  created: boolean;
  picks: number;
  hasSkip: boolean;
}

/** Build next Tuesday's issue unless it already exists (never overwrites Josh's edits). */
export async function createDraft(db: SupabaseClient, now = new Date(), { rebuildUntouched = false } = {}): Promise<DraftResult> {
  const issueDate = nextIssueDate(now);
  const { data: existing } = await db.from("picks_issues").select("id, status, created_at, updated_at").eq("issue_date", issueDate).maybeSingle();
  // A rebuild only replaces a draft nobody has touched: no saved edits, pauses or sends, and no
  // picks added after it was built (the original items are inserted within seconds of the issue).
  const { count: itemEdits } = existing
    ? await db.from("picks_items").select("id", { count: "exact", head: true }).eq("issue_id", existing.id).gt("created_at", new Date(new Date(existing.created_at as string).getTime() + 5 * 60_000).toISOString())
    : { count: 0 };
  const untouched = existing && existing.status === "scheduled" && existing.updated_at === existing.created_at && !itemEdits;
  if (existing && rebuildUntouched && untouched) {
    await db.from("picks_issues").delete().eq("id", existing.id);
  } else if (existing) {
    const { count } = await db.from("picks_items").select("id", { count: "exact", head: true }).eq("issue_id", existing.id).eq("kind", "pick");
    const { count: skips } = await db.from("picks_items").select("id", { count: "exact", head: true }).eq("issue_id", existing.id).eq("kind", "skip");
    return { issueId: existing.id as string, issueDate, created: false, picks: count ?? 0, hasSkip: !!skips };
  }

  const cands = await loadCandidates(db);
  const picks = choosePicks(cands, 5, now.getTime());
  const skip = chooseSkip(cands, new Set(picks.map((p) => p.company_id)), now.getTime());

  // Full text for the chosen jobs only, so the AI can quote real details.
  const { data: descs } = await db.from("visible_jobs").select("id, description_raw").in("id", picks.map((p) => p.id));
  const descBy = new Map((descs ?? []).map((d) => [d.id as string, d.description_raw as string | null]));
  const [takes, opener] = await Promise.all([Promise.all(picks.map((p) => aiTake(p, descBy.get(p.id) ?? null))), aiOpener(picks)]);

  const week = Math.floor(now.getTime() / (7 * 86_400_000));
  const { data: issue, error } = await db
    .from("picks_issues")
    .insert({
      issue_date: issueDate,
      status: "scheduled",
      subject: subjectFor(picks),
      intro: introFor(picks.length, !!skip),
      opener,
      stat_line: await statLine(db, week),
      send_at: sendAtFor(issueDate),
    })
    .select("id")
    .single();
  if (error) throw new Error(`create issue: ${error.message}`);

  const items = [
    ...picks.map((p, i) => ({
      issue_id: issue.id,
      kind: "pick",
      position: i + 1,
      job_id: p.id,
      job_slug: p.slug,
      title: cleanTitle(p.title_raw),
      company: p.company_name,
      pay: pickPay(p),
      meta: pickMeta(p),
      take: takes[i]!,
    })),
    ...(skip
      ? [{ issue_id: issue.id, kind: "skip", position: 0, job_id: skip.id, job_slug: skip.slug, title: skip.title_raw, company: null, pay: null, meta: null, take: skipTake(skip) }]
      : []),
  ];
  if (items.length) {
    const { error: itemErr } = await db.from("picks_items").insert(items);
    if (itemErr) throw new Error(`create items: ${itemErr.message}`);
  }
  return { issueId: issue.id as string, issueDate, created: true, picks: picks.length, hasSkip: !!skip };
}

/** Item fields for adding a job to an issue (admin swap). */
export function itemFromCandidate(c: PickCandidate) {
  return { job_id: c.id, job_slug: c.slug, title: cleanTitle(c.title_raw), company: c.company_name, pay: pickPay(c), meta: pickMeta(c), take: templateTake(c) };
}
