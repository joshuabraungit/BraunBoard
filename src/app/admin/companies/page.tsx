import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { addCompany, setCompanyEnabled, setCompanySize } from "../actions";
import { checkSize, SIZE_BUCKETS, SIZE_LABELS } from "@/lib/ingest/size";
import { AdminNotice } from "@/components/AdminNotice";
import { ENABLED_PROVIDERS } from "@/lib/ingest/providers";

export const maxDuration = 60;

type Show = "all" | "hiring" | "no-board" | "off" | "errors" | "size";
const SHOWS: [Show, string][] = [
  ["all", "All"],
  ["hiring", "Hiring now"],
  ["no-board", "No job board"],
  ["errors", "Errors"],
  ["size", "Sizes to check"],
  ["off", "Switched off"],
];

interface Row {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  ats_provider: string | null;
  ats_identifier: string | null;
  last_crawled_at: string | null;
  is_disabled: boolean;
  size_bucket: string | null;
  size_source: string | null;
  size_quote: string | null;
  open_jobs_total: number | null;
  company_stats: { open_roles: number; new_30d: number; trend: string } | null;
}

/** Why a size estimate looks off, judged by how many openings the company has. */
const sizeFlag = (r: Row) => checkSize(r.size_bucket as never, r.size_source, r.open_jobs_total).flag;

function ago(iso: string | null) {
  if (!iso) return "never";
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  return h < 1 ? `${Math.round(h * 60)}m ago` : h < 48 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`;
}

function boardUrl(p: string | null, id: string | null) {
  if (!p || !id) return null;
  if (p === "greenhouse") return `https://job-boards.greenhouse.io/${id}`;
  if (p === "lever") return `https://jobs.lever.co/${id}`;
  if (p === "ashby") return `https://jobs.ashbyhq.com/${id}`;
  if (p === "workday") return `https://${id}`;
  if (p === "smartrecruiters") return `https://jobs.smartrecruiters.com/${id}`;
  return null;
}

export default async function AdminCompanies({ searchParams }: { searchParams: Promise<{ q?: string; show?: string; msg?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const show = (SHOWS.find(([k]) => k === sp.show)?.[0] ?? "all") as Show;
  const q = (sp.q ?? "").trim().toLowerCase();
  const db = adminClient();

  const [{ data: companies }, { data: errs }] = await Promise.all([
    db
      .from("companies")
      .select("id, slug, name, domain, ats_provider, ats_identifier, last_crawled_at, is_disabled, size_bucket, size_source, size_quote, open_jobs_total, company_stats(open_roles, new_30d, trend)")
      .order("name")
      .limit(3000),
    db.from("crawl_runs").select("company_id, error, started_at").not("error", "is", null).gte("started_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  const errorBy = new Map((errs ?? []).map((e) => [e.company_id as string, e.error as string]));
  const all = (companies ?? []) as unknown as Row[];
  const open = (r: Row) => r.company_stats?.open_roles ?? 0;
  // A board we found but aren't crawling (Workday / SmartRecruiters for now) counts as "no board".
  const crawled = (r: Row) => !!r.ats_provider && ENABLED_PROVIDERS.includes(r.ats_provider as never);

  const rows = all
    .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.domain ?? "").includes(q))
    .filter((r) =>
      show === "hiring" ? open(r) > 0 && !r.is_disabled
      : show === "no-board" ? !crawled(r) && !r.is_disabled
      : show === "off" ? r.is_disabled
      : show === "errors" ? errorBy.has(r.id)
      : show === "size" ? open(r) > 0 && !!sizeFlag(r)
      : true,
    )
    .sort((a, b) => open(b) - open(a) || a.name.localeCompare(b.name));
  const counts: Record<Show, number> = {
    all: all.length,
    hiring: all.filter((r) => open(r) > 0 && !r.is_disabled).length,
    "no-board": all.filter((r) => !crawled(r) && !r.is_disabled).length,
    errors: all.filter((r) => errorBy.has(r.id)).length,
    off: all.filter((r) => r.is_disabled).length,
    size: all.filter((r) => open(r) > 0 && !!sizeFlag(r)).length,
  };
  const here = `/admin/companies?show=${show}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Companies</h1>
      <AdminNotice msg={sp.msg} err={sp.err} />

      <details className="mb-6 rounded-xl border border-line bg-surface p-4" open={!!sp.err}>
        <summary className="cursor-pointer font-semibold">+ Add a company</summary>
        <form action={addCompany} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
          <input name="name" required placeholder="Company name" className="rounded-md border border-line bg-bg px-3 py-2 text-sm" />
          <input name="domain" placeholder="Domain (acme.com)" className="rounded-md border border-line bg-bg px-3 py-2 text-sm" />
          <input name="careers_url" placeholder="Careers URL (best: their Greenhouse / Lever / Ashby page)" className="rounded-md border border-line bg-bg px-3 py-2 text-sm" />
          <button className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">Find board &amp; add</button>
        </form>
        <p className="mt-2 text-xs text-ink-3">
          Paste the company&apos;s job board link if you have it. Otherwise we&apos;ll look for one by name and only add it if we can confirm it&apos;s theirs. Takes up to 30 seconds.
        </p>
      </details>

      <form className="mb-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="show" value={show} />
        <input name="q" defaultValue={sp.q} placeholder="Search companies" className="min-w-0 flex-1 basis-56 rounded-md border border-line bg-surface px-3 py-1.5 text-sm" />
        <button className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold">Search</button>
      </form>
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {SHOWS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/companies?show=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            aria-current={k === show ? "page" : undefined}
            className="rounded-full border border-line bg-surface px-3 py-1 text-ink-2 aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {label} <span className="opacity-70">{counts[k]}</span>
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Company</th>
              <th className="px-4 py-2.5 font-semibold">Open sales roles</th>
              <th className="px-4 py-2.5 font-semibold">Size</th>
              <th className="px-4 py-2.5 font-semibold">Job board</th>
              <th className="px-4 py-2.5 font-semibold">Last crawl</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.slice(0, 400).map((r) => {
              const url = boardUrl(r.ats_provider, r.ats_identifier);
              const err = errorBy.get(r.id);
              return (
                <tr key={r.id} className={r.is_disabled ? "opacity-55" : ""}>
                  <td className="px-4 py-2.5">
                    <Link href={`/company/${r.slug}`} className="font-medium hover:underline">{r.name}</Link>
                    {r.domain && <span className="block text-xs text-ink-3">{r.domain}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {open(r)}
                    {(r.company_stats?.new_30d ?? 0) > 0 && <span className="text-xs text-ink-3"> · {r.company_stats!.new_30d} new in 30d</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={setCompanySize} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="returnTo" value={here} />
                      <select name="size" defaultValue={r.size_bucket ?? ""} className="rounded border border-line bg-bg px-1 py-0.5 text-xs" aria-label={`Size of ${r.name}`}>
                        <option value="">Unknown</option>
                        {SIZE_BUCKETS.map((b) => <option key={b} value={b}>{SIZE_LABELS[b].label}</option>)}
                      </select>
                      <button className="rounded border border-line px-1.5 py-0.5 text-xs font-semibold hover:border-line-strong">Save</button>
                    </form>
                    {r.size_source && (
                      <span className="block text-xs text-ink-3" title={r.size_quote ?? undefined}>
                        {{ posting: "from a posting", estimate: "AI estimate", admin: "set by you", careers: "from careers site" }[r.size_source] ?? r.size_source}
                        {r.open_jobs_total != null && ` · ${r.open_jobs_total} openings`}
                      </span>
                    )}
                    {sizeFlag(r) && <span className="block max-w-[220px] text-xs font-semibold text-red">Check: {sizeFlag(r)}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {url ? (
                      <a href={url} target="_blank" rel="noopener" className="hover:underline">
                        {r.ats_provider}
                        {!crawled(r) && <span className="text-xs text-ink-3"> (not crawled)</span>}
                      </a>
                    ) : (
                      <span className="text-ink-3">none found</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {ago(r.last_crawled_at)}
                    {err && <span className="block max-w-[260px] truncate text-xs text-red" title={err}>{err}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={setCompanyEnabled}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="enable" value={r.is_disabled ? "1" : "0"} />
                      <input type="hidden" name="returnTo" value={here} />
                      <button className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:border-line-strong">
                        {r.is_disabled ? "Turn on" : "Turn off"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {rows.length > 400 ? `Showing 400 of ${rows.length}. Search to narrow it down. ` : `${rows.length} companies. `}
        Turning a company off hides all its jobs right away. Turning it back on brings them back.
      </p>
    </>
  );
}
