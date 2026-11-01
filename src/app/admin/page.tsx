import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import type { Traffic } from "./visitors/page";

interface Overview {
  jobs_live: number;
  jobs_new_1d: number;
  jobs_new_7d: number;
  jobs_with_pay: number;
  companies_hiring: number;
  companies_total: number;
  companies_no_board: number;
  companies_disabled: number;
  users: number;
  users_7d: number;
  watches: number;
  company_watches: number;
  alerts_sent_30d: number;
  alerts_clicked_30d: number;
  alerts_pending: number;
  last_crawl_at: string | null;
  crawls_24h: number;
  crawl_errors_24h: number;
  jobs_new_24h_found: number;
  recent_errors: { name: string; slug: string; error: string; started_at: string }[];
}

interface Audience {
  users: number;
  users_with_role: number;
  users_with_watch: number;
  roles: { label: string; n: number }[];
  countries: { label: string; n: number }[];
  picks_subscribers: number;
}

const COUNTRY_NAMES: Record<string, string> = { US: "United States", CA: "Canada", UK: "United Kingdom", DE: "Germany" };

/** Simple horizontal bars: label, bar, count. Shares are of `base` people. */
function Bars({ title, note, rows, base }: { title: string; note: string; rows: { label: string; n: number }[]; base: number }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-ink-3">{title}</p>
      {rows.length ? (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-3 text-sm">
              <span className="truncate font-medium">{r.label}</span>
              <span className="h-2 rounded-full bg-line">
                <span className="block h-2 rounded-full bg-accent" style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">
                {r.n} <span className="text-xs text-ink-3">{base ? `${Math.round((r.n / base) * 100)}%` : ""}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-3">Nobody yet.</p>
      )}
      <p className="mt-3 text-xs text-ink-3">{note}</p>
    </div>
  );
}

function ago(iso: string | null) {
  if (!iso) return "never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} hr ago` : `${Math.round(h / 24)} days ago`;
}

function Tile({ label, value, sub, tone, href }: { label: string; value: string | number; sub?: string; tone?: "good" | "bad"; href?: string }) {
  const body = (
    <>
      <p className="text-xs uppercase tracking-wide text-ink-3">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${tone === "good" ? "text-accent" : tone === "bad" ? "text-red" : ""} ${href ? "underline decoration-2 underline-offset-4" : ""}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-xl border border-line bg-surface p-4 hover:border-ink-3">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-line bg-surface p-4">{body}</div>
  );
}

interface AskRow {
  email: string;
  created_at: string;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-2">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
    </section>
  );
}

export default async function AdminDashboard() {
  await requireAdmin();
  const db = adminClient();
  const [{ data, error }, { data: traffic }, { data: aud }, { data: asks }, { data: kits }, { data: pev }, { count: storyCount }, { data: changed }] = await Promise.all([
    db.rpc("admin_overview"),
    db.rpc("admin_traffic", { days: 30 }),
    db.rpc("admin_audience"),
    db.from("ask_messages").select("email, created_at").range(0, 9999),
    db.from("kit_downloads").select("created_at, source").range(0, 49999),
    db.from("product_events").select("created_at, event").gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).range(0, 49999),
    db.from("companies").select("id", { count: "exact", head: true }).not("product_story", "is", null),
    db.from("companies").select("name, slug, product_short, product_category, product_changed_at").not("product_changed_at", "is", null).order("product_changed_at", { ascending: false }).limit(10),
  ]);
  if (error || !data) return <p className="text-red">Couldn&apos;t load the dashboard: {error?.message}</p>;
  const o = data as Overview;
  const tr = traffic as Traffic | null;
  const a = aud as Audience | null;
  const clickRate = o.alerts_sent_30d ? Math.round((o.alerts_clicked_30d / o.alerts_sent_30d) * 100) : null;
  // Ask Josh: people = distinct emails that sent the form.
  const askRows = (asks ?? []) as AskRow[];
  const askPeople = (days?: number) =>
    new Set(askRows.filter((r) => !days || Date.now() - new Date(r.created_at).getTime() < days * 86_400_000).map((r) => r.email)).size;
  const kitRows = (kits ?? []) as { created_at: string; source: string | null }[];
  const kitSince = (days: number) => kitRows.filter((r) => Date.now() - new Date(r.created_at).getTime() < days * 86_400_000).length;
  const pevRows = (pev ?? []) as { created_at: string; event: string }[];
  const pevCount = (event: string, days = 30) => pevRows.filter((r) => r.event === event && Date.now() - new Date(r.created_at).getTime() < days * 86_400_000).length;
  const recentStories = (changed ?? []) as { name: string; slug: string; product_short: string | null; product_category: string | null; product_changed_at: string }[];
  const crawlStale = !o.last_crawl_at || Date.now() - new Date(o.last_crawl_at).getTime() > 6 * 3_600_000;

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Dashboard</h1>

      {tr && (
        <Group title="Visitors">
          <Tile label="Today" value={tr.today_visitors} sub={`${tr.today_views.toLocaleString()} page views`} href="/admin/visitors" />
          <Tile label="Last 7 days" value={tr.week_visitors} sub={`${tr.week_views.toLocaleString()} page views`} href="/admin/visitors?days=7" />
          <Tile label="Last 30 days" value={tr.month_visitors} sub={`${tr.month_views.toLocaleString()} page views`} href="/admin/visitors" />
          <Tile label="Top source, 30 days" value={tr.sources[0]?.label ?? "None yet"} sub={tr.sources[0] ? `${tr.sources[0].n.toLocaleString()} visitors` : "Click a number for the full breakdown"} />
        </Group>
      )}

      <Group title="Jobs">
        <Tile label="Live jobs" value={o.jobs_live} />
        <Tile label="Posted today" value={o.jobs_new_1d} sub={`${o.jobs_new_7d} this week`} />
        <Tile label="Publish pay" value={`${o.jobs_live ? Math.round((o.jobs_with_pay / o.jobs_live) * 100) : 0}%`} sub={`${o.jobs_with_pay.toLocaleString()} jobs`} />
        <Tile label="Companies hiring" value={o.companies_hiring} sub={`of ${o.companies_total} tracked`} />
      </Group>

      <Group title="People">
        <Tile label="Signups" value={o.users} sub={`${o.users_7d} this week`} />
        <Tile label="Job watches" value={o.watches} />
        <Tile label="Company watches" value={o.company_watches} />
        <Tile label="Alerts waiting to send" value={o.alerts_pending} sub="Go out with the next instant run or daily digest" />
      </Group>

      <Group title="Products page (last 30 days)">
        <Tile label="Companies with a story" value={storyCount ?? 0} sub="What they sell, in plain English" />
        <Tile label="See jobs taps" value={pevCount("see_jobs")} sub={`${pevCount("see_jobs", 7)} this week`} />
        <Tile label="Watches from the page" value={pevCount("watch")} sub={`${pevCount("watch", 7)} this week`} />
        <Tile label="Something wrong? reports" value={pevCount("report")} sub="They land in your Ask Josh inbox" />
      </Group>
      {recentStories.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Recently changed stories (spot-check a few)</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface text-sm">
            {recentStories.map((s) => (
              <li key={s.slug} className="flex flex-wrap gap-x-3 px-4 py-2">
                <Link href={`/products?q=${encodeURIComponent(s.name)}`} className="font-medium hover:underline">{s.name}</Link>
                <span className="text-ink-2">{s.product_short}</span>
                <span className="ml-auto text-ink-3">{s.product_category} · {ago(s.product_changed_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Group title="Interview kit downloads">
        <Tile label="Downloads" value={kitRows.length} sub="Before You Say Yes" />
        <Tile label="This week" value={kitSince(7)} />
        <Tile label="Last 30 days" value={kitSince(30)} />
        <Tile label="From job pages" value={kitRows.filter((r) => r.source === "job-page").length} sub="People who found it through a job's questions box" />
      </Group>

      <Group title="Ask Josh">
        <Tile label="People who wrote in" value={askPeople()} sub="Gave their email in the Ask Josh form" href="/admin/ask" />
        <Tile label="This week" value={askPeople(7)} />
        <Tile label="Last 30 days" value={askPeople(30)} />
        <Tile label="Messages" value={askRows.length} sub="Click to read them" href="/admin/ask" />
      </Group>

      {a && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-2">Who&apos;s signing up</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Bars
              title="Role they're looking for"
              rows={a.roles}
              base={a.users_with_role}
              note={`From the For You setup. ${a.users_with_role} of ${a.users} signups picked a role, and people can pick more than one, so it adds up to more than 100%. This is the job they want, not the one they have today. Sales Leader covers Manager, Director, VP and CRO.`}
            />
            <Bars
              title="Where they want to work"
              rows={a.countries.map((c) => ({ label: COUNTRY_NAMES[c.label] ?? c.label, n: c.n }))}
              base={a.users_with_watch}
              note="From their job watches. Someone watching both the US and Canada counts in both."
            />
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {a.picks_subscribers} people get Braun&apos;s Picks. Picks signups only give an email, so they aren&apos;t in these charts unless they also made an account.
          </p>
        </section>
      )}

      <Group title="Alerts (last 30 days)">
        <Tile label="Alert emails sent" value={o.alerts_sent_30d} />
        <Tile label="Clicked" value={o.alerts_clicked_30d} />
        <Tile
          label="Click rate"
          value={clickRate == null ? "n/a" : `${clickRate}%`}
          sub="The main V1 success number"
          tone={clickRate == null ? undefined : clickRate >= 20 ? "good" : clickRate < 5 ? "bad" : undefined}
        />
      </Group>

      <Group title="Crawler (last 24 hours)">
        <Tile label="Last crawl" value={ago(o.last_crawl_at)} tone={crawlStale ? "bad" : "good"} sub={crawlStale ? "Should run every 4 hours" : "Running on schedule"} />
        <Tile label="Company crawls" value={o.crawls_24h} />
        <Tile label="New jobs found" value={o.jobs_new_24h_found} />
        <Tile label="Crawl errors" value={o.crawl_errors_24h} tone={o.crawl_errors_24h ? "bad" : "good"} />
      </Group>

      {o.recent_errors.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold">Companies that errored</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface text-sm">
            {o.recent_errors.map((e) => (
              <li key={e.slug} className="flex flex-wrap gap-x-3 px-4 py-2">
                <Link href={`/admin/companies?q=${encodeURIComponent(e.name)}`} className="font-medium hover:underline">{e.name}</Link>
                <span className="text-ink-3">{ago(e.started_at)}</span>
                <span className="w-full truncate text-xs text-ink-2">{e.error}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-ink-3">A one-off error usually clears on the next crawl. The same company erroring every time usually means its job board moved.</p>
        </section>
      )}

      <p className="mt-8 text-sm text-ink-3">
        {o.companies_no_board} companies have no supported job board yet. {o.companies_disabled ? `${o.companies_disabled} are switched off.` : ""}{" "}
        <Link href="/admin/companies?show=no-board" className="underline">See them</Link>
      </p>
    </>
  );
}
