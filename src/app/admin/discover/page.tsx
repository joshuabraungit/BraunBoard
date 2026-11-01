import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { decideCandidate } from "../actions";
import { AdminNotice } from "@/components/AdminNotice";

type Show = "pending" | "flagged" | "approved" | "rejected";
const SHOWS: [Show, string][] = [
  ["pending", "To review"],
  ["flagged", "Flagged"],
  ["approved", "Added"],
  ["rejected", "Skipped"],
];

interface Row {
  id: string;
  name: string;
  domain: string | null;
  ats_provider: string;
  ats_identifier: string;
  source: string;
  sales_jobs: number;
  sample_titles: string[];
  markets: string[];
  status: string;
  note: string | null;
  first_found_at: string;
  last_found_at: string;
}

const SOURCE: Record<string, string> = { "workable-feed": "Workable feed", search: "Search" };

function boardUrl(p: string, id: string) {
  if (p === "greenhouse") return `https://job-boards.greenhouse.io/${id}`;
  if (p === "lever") return `https://jobs.lever.co/${id}`;
  if (p === "ashby") return `https://jobs.ashbyhq.com/${id}`;
  if (p === "workable") return `https://apply.workable.com/${id}/`;
  return null;
}

export default async function AdminDiscover({ searchParams }: { searchParams: Promise<{ show?: string; msg?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const show = (SHOWS.find(([k]) => k === sp.show)?.[0] ?? "pending") as Show;
  const db = adminClient();
  const { data } = await db.from("company_candidates").select("*").order("sales_jobs", { ascending: false }).order("name").limit(2000);
  const all = (data ?? []) as Row[];
  const pick = (k: Show) =>
    all.filter((r) => (k === "pending" ? r.status === "pending" && !r.note : k === "flagged" ? r.status === "pending" && !!r.note : r.status === k));
  const rows = pick(show);
  const here = `/admin/discover?show=${show}`;

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Discover</h1>
      <p className="mb-4 max-w-2xl text-sm text-ink-2">
        Companies hiring salespeople on their own job board that aren&apos;t on Braun Board yet. Add the ones that sell B2B. Nothing here shows on the site until you add it.
        &ldquo;Flagged&rdquo; means something looked off, like a recruiter or commission-only roles.
      </p>
      <AdminNotice msg={sp.msg} err={sp.err} />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {SHOWS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/discover?show=${k}`}
            aria-current={k === show ? "page" : undefined}
            className="rounded-full border border-line bg-surface px-3 py-1 text-ink-2 aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {label} <span className="opacity-70">{pick(k).length}</span>
          </Link>
        ))}
      </nav>

      {!rows.length ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-3">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {rows.slice(0, 300).map((r) => {
            const url = boardUrl(r.ats_provider, r.ats_identifier);
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 basis-72">
                  <p className="font-semibold">
                    {r.name}
                    {r.domain && (
                      <a href={`https://${r.domain}`} target="_blank" rel="noopener" className="ml-2 text-xs font-normal text-ink-3 hover:underline">{r.domain}</a>
                    )}
                  </p>
                  <p className="text-sm text-ink-2">
                    {r.sales_jobs} sales {r.sales_jobs === 1 ? "job" : "jobs"} · {r.markets.join(", ")} ·{" "}
                    {url ? <a href={url} target="_blank" rel="noopener" className="hover:underline">{r.ats_provider} board</a> : r.ats_provider} · {SOURCE[r.source] ?? r.source}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-3" title={r.sample_titles.join(" | ")}>{r.sample_titles.join(" · ")}</p>
                  {r.note && <p className="mt-1 text-xs font-semibold text-red">Check: {r.note}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    {(["approve", "reject"] as const).map((d) => (
                      <form key={d} action={decideCandidate}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value={d} />
                        <input type="hidden" name="returnTo" value={here} />
                        <button
                          className={
                            d === "approve"
                              ? "rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                              : "rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:border-line-strong"
                          }
                        >
                          {d === "approve" ? "Add" : "Skip"}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
