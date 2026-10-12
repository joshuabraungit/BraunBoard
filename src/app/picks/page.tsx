import type { Metadata } from "next";
import Link from "next/link";
import { PicksSignup } from "@/components/PicksSignup";
import { adminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Braun's Picks: 5 sales jobs worth a look, every Tuesday | Braun Board",
  description: "A free weekly email from Josh Braun: five B2B sales jobs that publish pay and pass the Braun Read, why each made the cut, and one posting to skip.",
  alternates: { canonical: "/picks" },
};

interface Item {
  kind: "pick" | "skip";
  title: string;
  company: string | null;
  pay: string | null;
  meta: string | null;
  take: string;
  job_slug: string | null;
}

async function latestIssue() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const db = adminClient();
  const { data: issue } = await db.from("picks_issues").select("id, issue_date, intro, stat_line").eq("status", "sent").order("issue_date", { ascending: false }).limit(1).maybeSingle();
  if (!issue) return null;
  const { data: items } = await db.from("picks_items").select("kind, title, company, pay, meta, take, job_slug").eq("issue_id", issue.id).order("position");
  return { issue, items: (items ?? []) as Item[] };
}

export default async function PicksPage({ searchParams }: { searchParams: Promise<{ picks?: string }> }) {
  const { picks } = await searchParams;
  const latest = await latestIssue();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Braun&apos;s Picks</h1>
      <p className="mt-3 text-lg text-ink-2">
        Every Tuesday: five sales jobs I&apos;d actually look at, why each one made the cut, and one posting I&apos;d skip. Only jobs that publish pay and pass the Braun Read.
      </p>
      <div className="mt-6">
        <PicksSignup back="/picks" source="picks-page" status={picks} />
      </div>

      {latest && (
        <section className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-2">
            Latest issue · {new Date(`${latest.issue.issue_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </h2>
          <ol className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {latest.items
              .filter((i) => i.kind === "pick")
              .map((i) => (
                <li key={i.title + i.company} className="px-4 py-3">
                  {i.job_slug ? (
                    <Link href={`/jobs/${i.job_slug}`} className="font-semibold hover:underline">{i.title} · {i.company}</Link>
                  ) : (
                    <span className="font-semibold">{i.title} · {i.company}</span>
                  )}
                  <p className="text-sm font-semibold text-accent">{i.pay}</p>
                  <p className="mt-1 text-sm text-ink-2"><b className="text-ink">Josh&apos;s take:</b> {i.take}</p>
                </li>
              ))}
          </ol>
          {latest.items.find((i) => i.kind === "skip") && (
            <p className="mt-3 rounded-xl border border-red/20 bg-red-soft/60 px-4 py-3 text-sm">
              <b className="text-red">One to skip:</b> {latest.items.find((i) => i.kind === "skip")!.take}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
