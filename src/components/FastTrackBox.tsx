"use client";

import { useActionState } from "react";
import { claimFastTrack, type ClaimResult } from "@/app/sponsored/[id]/fast-track-action";
import { CopyButton } from "./CopyButton";

interface Props {
  id: string;
  company: string;
  total: number;
  left: number;
  minutes: number;
  where: string;
  lastClaimed: string | null;
}

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} days ago`;
}

/** The Fast Track box on a sponsored job page: a live counter, a claim form, then the code and the steps. */
export function FastTrackBox({ id, company, total, left, minutes, where, lastClaimed }: Props) {
  const [state, action, pending] = useActionState<ClaimResult | null, FormData>(claimFastTrack, null);
  const gone = left <= 0 || (state && !state.ok && state.gone);

  if (state?.ok) {
    return (
      <section id="fast-track" className="mt-8 rounded-2xl border-2 border-accent bg-accent-soft p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-accent">You&apos;re on the Fast Track</p>
        <p className="mt-2 text-[15px] text-ink-2">Your code:</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="font-mono text-3xl font-bold tracking-wider text-ink">{state.code}</span>
          <CopyButton
            text={state.code}
            label="Copy code"
            className="inline-flex min-h-10 items-center rounded-lg border border-line-strong bg-bg px-3 text-sm font-semibold text-ink hover:bg-surface"
          />
        </div>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-[15px] text-ink">
          <li>
            <a href={`/sponsored/${id}/apply?ft=1`} target="_blank" rel="nofollow noopener" className="font-semibold underline underline-offset-2">
              Apply on {company}&apos;s form ↗
            </a>
          </li>
          <li>{where}</li>
          <li>
            {company}&apos;s team will reach out to set up a {minutes}-minute screening call.
          </li>
        </ol>
        <p className="mt-4 text-sm text-ink-2">I emailed you the code too, so you have it later. It&apos;s yours, so please don&apos;t share it.</p>
      </section>
    );
  }

  return (
    <section id="fast-track" className="mt-8 rounded-2xl border-2 border-ink bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-ink">Fast Track</p>
        <p className={`text-sm font-bold ${gone ? "text-ink-3" : "text-accent"}`}>
          {gone ? `All ${total} claimed` : `${left} of ${total} left`}
        </p>
      </div>
      <p className="mt-2 text-[17px] font-semibold leading-snug text-ink">
        {total} guaranteed {minutes}-minute screening calls with {company}.
      </p>

      {/* One dot per code: filled = still open. */}
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-full ${i < left && !gone ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>

      {gone ? (
        <p className="mt-4 text-[15px] text-ink-2">
          They went fast. You can still apply the regular way with the button below. Keep an eye on Braun&apos;s Picks for the next one.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[15px] text-ink-2">
            Grab a code, put it on your application, and {company}&apos;s team will set up a call with you. No resume black hole. Once they&apos;re gone, they&apos;re gone.
          </p>
          <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="id" value={id} />
            <input type="text" name="company_site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <input
              name="name"
              required
              autoComplete="name"
              placeholder="Your name"
              className="min-h-11 rounded-lg border border-line-strong bg-bg px-3 text-[15px]"
            />
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Your email"
              className="min-h-11 rounded-lg border border-line-strong bg-bg px-3 text-[15px]"
            />
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-lg bg-ink px-5 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Grabbing…" : "Claim my code"}
            </button>
          </form>
          {state && !state.ok && <p className="mt-2 text-sm font-semibold text-red">{state.error}</p>}
          <p className="mt-3 text-xs text-ink-3">
            One per person. I&apos;ll email you the code and add you to Braun&apos;s Picks (unsubscribe anytime).
            {lastClaimed && <span suppressHydrationWarning>{` Last code claimed ${ago(lastClaimed)}.`}</span>}
          </p>
        </>
      )}
    </section>
  );
}
