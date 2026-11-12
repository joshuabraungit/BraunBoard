// Print view of a saved "their words" copy: the one clean template. "Save as PDF" from here.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { getCopy } from "@/lib/job-tools/words-db";
import { toBlocks } from "@/lib/job-tools/words-text";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your résumé copy · Braun Board", robots: { index: false } };

export default async function CopyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser().catch(() => null);
  if (!user) redirect(`/login?next=/copy/${id}`);
  const copy = await getCopy(user.id, id);
  if (!copy) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-ink-2">
          Your copy for {copy.company}, {copy.job_title}. Choose &ldquo;Save as PDF&rdquo; in the print window.
        </p>
        <div className="flex gap-2">
          <a href={`/copy/${copy.id}/docx`} className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold hover:border-ink">
            Word
          </a>
          <PrintButton />
        </div>
      </div>
      <article className="resume-sheet bg-white p-10 text-[13px] leading-relaxed text-black shadow-sm ring-1 ring-line print:p-0 print:shadow-none print:ring-0">
        {toBlocks(copy.body).map((b, i) =>
          b.kind === "name" ? (
            <h1 key={i} className="text-2xl font-bold">{b.text}</h1>
          ) : b.kind === "heading" ? (
            <h2 key={i} className="mt-5 border-b border-black/30 pb-0.5 text-xs font-bold uppercase tracking-wider">{b.text}</h2>
          ) : b.kind === "bullet" ? (
            <p key={i} className="mt-1 pl-4 -indent-3">• {b.text}</p>
          ) : (
            <p key={i} className="mt-1">{b.text}</p>
          ),
        )}
      </article>
    </div>
  );
}
