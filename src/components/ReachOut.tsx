import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { firstNote, likelyManagers, linkedinSearch } from "@/lib/reach-out";
import { proofPromptFor } from "@/lib/proof-prompt";
import type { RoleFamily } from "@/lib/ingest/types";

interface Props {
  signedIn: boolean;
  slug: string;
  title: string;
  company: string;
  role: RoleFamily;
  companySize?: string | null;
  sells?: string | null;
  buyer?: string | null;
  url: string;
}

const small = "rounded-md border border-line-strong px-2.5 py-1 text-xs font-semibold hover:border-ink";

/** Reach the person who owns the hire: who, a first note, and a Proof page prompt for this job. Sign-in only. */
export function ReachOut(p: Props) {
  if (!p.signedIn) {
    return (
      <section className="mt-6 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-bold tracking-tight">Reach out to the hiring manager</h2>
        <p className="mt-1 text-[15px] text-ink-2">Hundreds of people hit Apply. Very few write to the person who owns the hire. For this job I&apos;ll give you:</p>
        <ul className="mt-3 space-y-1.5 text-[15px]">
          {["Who likely owns the hire, and how to find them", "A short first note built from this posting", "The Proof page prompt, already filled in for this job"].map((t) => (
            <li key={t} className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-accent">✓</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <Link
          href={`/login?why=reach&next=${encodeURIComponent(`/jobs/${p.slug}#reach`)}`}
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          Sign in to see it →
        </Link>
      </section>
    );
  }

  const managers = likelyManagers(p.role, p.companySize);
  const note = firstNote({ title: p.title, sells: p.sells, buyer: p.buyer });
  const prompt = proofPromptFor({ title: p.title, company: p.company, url: p.url, sells: p.sells, buyer: p.buyer });

  return (
    <section id="reach" className="mt-6 scroll-mt-24 rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-bold tracking-tight">Reach out to the hiring manager</h2>
      <p className="mt-1 text-sm text-ink-3">Apply on their site, then send a short note to the person who owns the hire.</p>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-3">1 · Who to reach</p>
        <p className="mt-1 text-[15px]">
          Likely {managers.join(" or ")} at {p.company}.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {managers.map((m) => (
            <a key={m} href={linkedinSearch(p.company, m)} target="_blank" rel="noopener" className={small}>
              Find {m} on LinkedIn ↗
            </a>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-3">2 · Your Proof page</p>
          <CopyButton text={prompt} label="Copy prompt" className={small} />
        </div>
        <p className="mt-1 text-[15px] text-ink-2">
          A one-page site built for {p.company}. The prompt already has this job in it. Paste it into Claude and fill in the rest.{" "}
          <Link href="/proof-page" className="font-semibold text-ink underline underline-offset-2">See an example</Link>
        </p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-ink-2">Show the prompt</summary>
          <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl bg-bg p-4 font-sans text-sm leading-relaxed text-ink-2">{prompt}</pre>
        </details>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-3">3 · Your first note</p>
          <CopyButton text={`Subject: ${note.subject}\n\n${note.body}`} label="Copy note" className={small} />
        </div>
        <div className="mt-2 rounded-xl bg-bg p-4 text-[15px] leading-relaxed">
          <p className="text-sm text-ink-3">Subject: {note.subject}</p>
          <p className="mt-2 whitespace-pre-line">{note.body}</p>
        </div>
        <p className="mt-2 text-sm text-ink-3">
          The note works even if they never click the link. The page is a bonus.{" "}
          <Link href="/outreach" className="font-semibold text-ink-2 underline underline-offset-2">More first notes and follow-ups</Link>
          {" · "}
          <Link href="/cold-call" className="font-semibold text-ink-2 underline underline-offset-2">Rather call?</Link>
        </p>
      </div>
    </section>
  );
}
