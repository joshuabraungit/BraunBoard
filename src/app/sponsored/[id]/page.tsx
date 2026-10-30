import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import { sponsorWhere } from "@/components/SponsoredCard";
import { bump, getOrder, logoUrl } from "@/lib/sponsor";
import { isRunning, payLine } from "@/lib/sponsor-form";
import { isUuid } from "@/lib/picks-subscribe";
import { isBot } from "@/lib/visits";
import { getUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!isUuid(id)) return null;
  const s = await getOrder(id);
  // Public once it has gone live (and after it ends, so old links still work). Paid-but-not-live is admin preview only.
  if (!s || !["paid", "live", "done"].includes(s.status)) return null;
  return s;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await load((await params).id);
  return {
    title: s ? `${s.job_title} at ${s.company} · Sponsored · Braun Board` : "Braun Board",
    robots: { index: false, follow: true },
  };
}

export default async function SponsoredJobPage({ params }: Props) {
  const { id } = await params;
  const s = await load(id);
  if (!s) notFound();

  const admin = isAdmin(await getUser());
  const running = isRunning(s);
  const hasRun = s.status === "done" || (s.status === "live" && !!s.ends_at && new Date(s.ends_at) <= new Date());
  if (!running && !hasRun && !admin) notFound();

  const ua = (await headers()).get("user-agent") ?? "";
  if (running && !admin && !isBot(ua)) await bump(s.id, "view");

  return (
    <div className="mx-auto max-w-2xl">
      {admin && !running && (
        <p className="mb-5 rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber">
          Admin preview. {hasRun ? "This sponsorship has ended." : "Visitors can't see this until it's live."}
        </p>
      )}
      <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber">Sponsored</span>

      <div className="mt-4 flex items-start gap-4">
        <CompanyLogo name={s.company} logoUrl={logoUrl(s.logo_path)} domain={null} size={56} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.job_title}</h1>
          <p className="mt-1 text-ink-2">
            {s.company} · {sponsorWhere(s)}
          </p>
        </div>
      </div>

      <p className="mt-5 text-lg font-semibold text-accent">{payLine(s)}</p>

      <div className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink">{s.description}</div>

      {(s.product_short || s.product_story) && (
        <section className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-3">What {s.company} sells, in plain English</h2>
          {s.product_short && <p className="mt-2 text-[17px] font-bold leading-snug">{s.product_short}</p>}
          {s.product_story && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.product_story}</p>}
        </section>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        {hasRun && !admin ? (
          <p className="text-sm text-ink-2">This job is no longer featured on Braun Board. The posting may still be open on {s.company}&apos;s site.</p>
        ) : null}
        {/* Plain <a>, not <Link>, so prefetching never counts as an apply click. */}
        <a
          href={`/sponsored/${s.id}/apply`}
          rel="nofollow noopener"
          target="_blank"
          className="mt-0 inline-flex min-h-11 items-center rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          Apply on {s.company}&apos;s site ↗
        </a>
        <p className="mt-4 text-sm text-ink-2">
          Before your first call, here are{" "}
          <Link href="/kit?from=job-page#top-five" className="font-semibold text-ink underline underline-offset-2">
            the five questions I ask in every sales interview
          </Link>
          .
        </p>
      </div>

      <p className="mt-6 text-xs text-ink-3">
        {s.company} paid to feature this job. Sponsored jobs have to be sales roles and show base pay. I don&apos;t give them a Braun Read.
      </p>
    </div>
  );
}
