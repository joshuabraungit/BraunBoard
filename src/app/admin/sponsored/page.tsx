import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { AdminNotice } from "@/components/AdminNotice";
import { reviewFields, type SponsoredJobRow } from "@/lib/sponsor";
import { reviewSummary } from "@/lib/sponsor-review";
import { Badge, STAGE_BADGE, day, nextStep, shortDay, stage, type Stage } from "./shared";

const GROUPS: { title: string; stages: Stage[]; empty?: string }[] = [
  {
    title: "Needs you",
    stages: ["approve", "ended"],
    empty: "Nothing waiting on you.",
  },
  { title: "Live now", stages: ["running"] },
  { title: "Scheduled", stages: ["scheduled"] },
];

function Row({ r, now }: { r: SponsoredJobRow; now: Date }) {
  const st = stage(r, now);
  const [label, cls] = STAGE_BADGE[st];
  const step = nextStep(r, reviewSummary(reviewFields(r)), now);
  return (
    <li>
      <Link href={`/admin/sponsored/${r.id}`} className="block rounded-xl border border-line bg-surface px-4 py-3 hover:border-line-strong">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge text={label} cls={cls} />
          {r.renewal_of && <Badge text="Renewal" cls="bg-accent-soft text-accent" />}
          <span className="min-w-0 flex-1 truncate font-semibold">
            {r.company} <span className="font-normal text-ink-2">· {r.job_title}</span>
          </span>
          <span className="text-sm text-ink-3">{r.live_at && r.ends_at ? `${shortDay(r.live_at)} to ${shortDay(r.ends_at)}` : `Ordered ${day(r.paid_at ?? r.created_at)}`}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
          <span className={step.tone === "act" ? "font-semibold text-ink" : "text-ink-2"}>{step.text}</span>
          {r.live_at && (
            <span className="text-ink-3">
              {r.views.toLocaleString()} views · {r.apply_clicks.toLocaleString()} apply clicks
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

export default async function AdminSponsored({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string; all?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const { data, error } = await adminClient().from("sponsored_jobs").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return <p className="text-red">Couldn&apos;t load sponsored jobs: {error.message}</p>;
  const all = (data ?? []) as SponsoredJobRow[];
  const now = new Date();
  const rows = all.filter((r) => r.status !== "pending");
  const pending = all.filter((r) => r.status === "pending");
  const running = rows.filter((r) => stage(r, now) === "running");
  const past = rows.filter((r) => ["done", "canceled"].includes(stage(r, now)));

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Sponsored jobs</h1>
      <AdminNotice msg={sp.msg} err={sp.err} />

      <section className="mb-8">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">Home page spots</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => {
            const r = running[i];
            return r ? (
              <Link key={i} href={`/admin/sponsored/${r.id}`} className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 hover:border-accent">
                <div className="text-xs font-semibold text-accent">
                  Spot {i + 1} · live until {shortDay(r.ends_at!)}
                </div>
                <div className="truncate font-semibold">{r.company}</div>
              </Link>
            ) : (
              <div key={i} className="rounded-xl border border-dashed border-line-strong px-4 py-3">
                <div className="text-xs font-semibold text-ink-3">Spot {i + 1}</div>
                <div className="text-ink-3">Open</div>
              </div>
            );
          })}
        </div>
      </section>

      {GROUPS.map((g) => {
        const list = rows.filter((r) => g.stages.includes(stage(r, now)));
        if (!list.length && !g.empty) return null;
        return (
          <section key={g.title} className="mb-8">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">
              {g.title} {list.length > 0 && <span className="text-ink-2">· {list.length}</span>}
            </h2>
            {list.length ? (
              <ul className="space-y-2">
                {list.map((r) => (
                  <Row key={r.id} r={r} now={now} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">{g.empty}</p>
            )}
          </section>
        );
      })}

      {past.length > 0 && (
        <details className="mb-6">
          <summary className="mb-2 cursor-pointer text-xs font-bold uppercase tracking-wide text-ink-3">Past · {past.length}</summary>
          <ul className="space-y-2">
            {past.map((r) => (
              <Row key={r.id} r={r} now={now} />
            ))}
          </ul>
        </details>
      )}

      {pending.length > 0 && (
        <details open={!!sp.all}>
          <summary className="mb-2 cursor-pointer text-xs font-bold uppercase tracking-wide text-ink-3">Unfinished checkouts · {pending.length}</summary>
          <ul className="space-y-2">
            {pending.map((r) => (
              <Row key={r.id} r={r} now={now} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
