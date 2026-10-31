import { joinPicks } from "@/app/picks/actions";

/** "Get Braun's Picks" box. `status` comes from ?picks= after submitting. */
export function PicksSignup({
  back,
  source,
  status,
  compact = false,
  eyebrow = "Free · Every Tuesday",
  title = "Braun\u2019s Picks",
  blurb = "5 sales jobs worth a look each week, why they made the cut, and one posting to skip.",
  button = "Get the picks",
  done = "You\u2019re in. The next issue lands Tuesday morning.",
}: {
  back: string;
  source: string;
  status?: string;
  compact?: boolean;
  eyebrow?: string;
  title?: string;
  blurb?: string;
  button?: string;
  done?: string;
}) {
  return (
    <section id="picks" className={`rounded-2xl border border-line bg-surface ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-accent">{eyebrow}</p>
      <h2 className={`mt-1 font-bold tracking-tight ${compact ? "text-lg" : "text-2xl"}`}>{title}</h2>
      <p className="mt-1 text-ink-2">{blurb}</p>
      {status === "ok" ? (
        <p className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">{done}</p>
      ) : (
        <form action={joinPicks} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="source" value={source} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <label className="sr-only" htmlFor={`picks-email-${source}`}>Email</label>
          <input id={`picks-email-${source}`} name="email" type="email" required placeholder="you@company.com" className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">{button}</button>
        </form>
      )}
      {status === "invalid" && <p className="mt-2 text-sm text-red">That email doesn&apos;t look right. Try again?</p>}
      <p className="mt-2 text-xs text-ink-3">One email a week. Unsubscribe in one click.</p>
    </section>
  );
}
