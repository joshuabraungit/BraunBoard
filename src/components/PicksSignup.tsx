import { joinPicks } from "@/app/picks/actions";

/** "Get Braun's Picks" box. `status` comes from ?picks= after submitting. */
export function PicksSignup({ back, source, status, compact = false }: { back: string; source: string; status?: string; compact?: boolean }) {
  return (
    <section id="picks" className={`rounded-2xl border border-line bg-surface ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-accent">Free · Every Tuesday</p>
      <h2 className={`mt-1 font-bold tracking-tight ${compact ? "text-lg" : "text-2xl"}`}>Braun&apos;s Picks</h2>
      <p className="mt-1 text-ink-2">5 sales jobs worth a look each week, why they made the cut, and one posting to skip.</p>
      {status === "ok" ? (
        <p className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">You&apos;re in. The next issue lands Tuesday morning.</p>
      ) : (
        <form action={joinPicks} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="source" value={source} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <label className="sr-only" htmlFor={`picks-email-${source}`}>Email</label>
          <input id={`picks-email-${source}`} name="email" type="email" required placeholder="you@company.com" className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">Get the picks</button>
        </form>
      )}
      {status === "invalid" && <p className="mt-2 text-sm text-red">That email doesn&apos;t look right. Try again?</p>}
      <p className="mt-2 text-xs text-ink-3">One email a week. Unsubscribe in one click.</p>
    </section>
  );
}
