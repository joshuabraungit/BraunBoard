import type { BraunRead as Read, Flag, Grade } from "@/lib/flags";

const TONE = {
  red: "border-red/25 bg-red-soft text-red",
  green: "border-accent/25 bg-accent-soft text-accent",
};

/** Compact chips for job cards. Red first, capped so cards stay calm. */
export function FlagChips({ flags, max = 3 }: { flags: Flag[]; max?: number }) {
  if (!flags.length) return null;
  const shown = flags.slice(0, max);
  const more = flags.length - shown.length;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {shown.map((f) => (
        <span key={f.code} title={f.why} className={`rounded border px-1.5 py-0.5 text-xs font-medium ${TONE[f.tone]}`}>
          {f.tone === "red" ? "▲ " : "✓ "}
          {f.label}
        </span>
      ))}
      {more > 0 && <span className="px-1 py-0.5 text-xs text-ink-3">+{more} more</span>}
    </div>
  );
}

const VERDICT_STYLE: Record<Read["verdict"], string> = {
  "Strong posting": "bg-accent text-white",
  "Worth a look": "bg-accent-soft text-accent",
  "Ask hard questions": "bg-amber-soft text-amber",
  "Proceed with caution": "bg-red-soft text-red",
};

const GRADE: Record<Grade, { dot: string; label: string }> = {
  good: { dot: "bg-accent", label: "Good" },
  ok: { dot: "bg-amber", label: "Mixed" },
  bad: { dot: "bg-red", label: "Weak" },
  unknown: { dot: "bg-line-strong", label: "Unknown" },
};

/** "The Braun Read" panel on the job page. */
export function BraunReadPanel({ read }: { read: Read }) {
  const reds = read.flags.filter((f) => f.tone === "red");
  const greens = read.flags.filter((f) => f.tone === "green");
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-2">The Braun Read</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${VERDICT_STYLE[read.verdict]}`}>{read.verdict}</span>
        <p className="w-full text-sm text-ink-2">{read.line}</p>
      </div>

      <dl className="divide-y divide-line">
        {read.checks.map((c) => (
          <div key={c.label} className="flex gap-3 px-4 py-2.5">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${GRADE[c.grade].dot}`} aria-label={GRADE[c.grade].label} />
            <dt className="w-28 shrink-0 sm:w-32 text-sm font-semibold">{c.label}</dt>
            <dd className="text-sm text-ink-2">{c.detail}</dd>
          </div>
        ))}
      </dl>

      {(reds.length > 0 || greens.length > 0) && (
        <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
          <FlagList title="Red flags" flags={reds} empty="None spotted." tone="red" />
          <FlagList title="Green flags" flags={greens} empty="None spotted." tone="green" />
        </div>
      )}
      <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">
        Based only on what the posting says. Flags are a starting point for your first call, not a final judgment.
      </p>
    </section>
  );
}

function FlagList({ title, flags, empty, tone }: { title: string; flags: Flag[]; empty: string; tone: "red" | "green" }) {
  return (
    <div>
      <h3 className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${tone === "red" ? "text-red" : "text-accent"}`}>{title}</h3>
      {flags.length ? (
        <ul className="space-y-2">
          {flags.map((f) => (
            <li key={f.code} className="text-sm">
              <span className="font-semibold">{f.label}.</span> <span className="text-ink-2">{f.why}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">{empty}</p>
      )}
    </div>
  );
}
