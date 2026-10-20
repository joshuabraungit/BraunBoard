import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

interface AskRow {
  id: number; email: string; name: string | null; message: string; offer: string | null;
  job_slug: string | null; source: string | null; emailed: boolean | null; created_at: string;
}

const NY = { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } as const;

/** Every message, so nothing gets lost if an email lands in spam. */
function AskList({ rows }: { rows: AskRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
      {rows.map((r) => {
        const subject = encodeURIComponent("Re: your question on Braun Board");
        return (
          <div key={r.id} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-semibold">
                {r.name ? `${r.name} · ` : ""}
                <span className="font-normal text-ink-2">{r.email}</span>
              </p>
              <p className="text-xs text-ink-3">
                {new Date(r.created_at).toLocaleString("en-US", NY)}
                {r.emailed === false && <span className="ml-2 font-semibold text-red">Email didn&apos;t send</span>}
              </p>
            </div>
            {r.job_slug && (
              <p className="mt-1 text-xs text-ink-3">
                About{" "}
                <a href={`/jobs/${r.job_slug}`} className="underline underline-offset-2">
                  this job
                </a>
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{r.message}</p>
            {r.offer && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">
                <span className="font-semibold">Offer details: </span>
                {r.offer}
              </p>
            )}
            <a href={`mailto:${r.email}?subject=${subject}`} className="mt-2 inline-block text-sm font-semibold text-accent underline underline-offset-2">
              Reply →
            </a>
          </div>
        );
      })}
    </div>
  );
}

export default async function AdminAsk() {
  await requireAdmin();
  const { data, error } = await adminClient()
    .from("ask_messages")
    .select("id, email, name, message, offer, job_slug, source, emailed, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return <p className="text-red">Couldn&apos;t load messages: {error.message}</p>;
  const rows = (data ?? []) as AskRow[];
  return (
    <div>
      <Link href="/admin" className="text-sm text-ink-2 hover:text-ink">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Ask Josh messages</h1>
      <p className="mt-1 text-sm text-ink-2">
        {rows.length ? `${rows.length} message${rows.length === 1 ? "" : "s"}, newest first.` : "No messages yet."}
      </p>
      <AskList rows={rows} />
    </div>
  );
}
