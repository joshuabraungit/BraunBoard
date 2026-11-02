import { checkLight, isHeadsUp, isRedFlag, type BraunRead as Read, type Flag } from "@/lib/flags";

const CHIP = {
  red: { cls: "border-red/25 bg-red-soft text-red", icon: "▲ " },
  headsUp: { cls: "border-amber/25 bg-amber-soft text-amber", icon: "? " },
  green: { cls: "border-accent/25 bg-accent-soft text-accent", icon: "✓ " },
};
const chipFor = (f: Flag) => (isRedFlag(f) ? CHIP.red : isHeadsUp(f) ? CHIP.headsUp : CHIP.green);

/** Compact chips for job cards. Red first, capped so cards stay calm. */
export function FlagChips({ flags, max = 3, inline = false }: { flags: Flag[]; max?: number; inline?: boolean }) {
  if (!flags.length) return null;
  const shown = flags.slice(0, max);
  const more = inline ? 0 : flags.length - shown.length;
  return (
    <div className={inline ? "contents" : "mt-3 flex flex-wrap gap-1.5"}>
      {shown.map((f) => (
        <span key={f.code} title={f.why} className={`rounded border px-1.5 py-0.5 text-xs font-medium ${chipFor(f).cls}`}>
          {chipFor(f).icon}
          {f.label}
        </span>
      ))}
      {more > 0 && <span className="px-1 py-0.5 text-xs text-ink-3">+{more} more</span>}
    </div>
  );
}

import { LifeMeter } from "./LifeMeter";

import { LIGHT } from "./lights";
export { LIGHT };

/** What the colors mean, shown once above a list of jobs. */
export function LightsKey({ className = "" }: { className?: string }) {
  const items: [keyof typeof LIGHT, string][] = [["green", "good sign"], ["yellow", "ask about it"], ["red", "watch out"]];
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3 ${className}`}>
      {items.map(([tone, text]) => (
        <span key={tone} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${LIGHT[tone]}`} aria-hidden />
          {text}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <LifeMeter postedAt={new Date(Date.now() - 35 * 86_400_000).toISOString()} decorative />
        life meter: drains the longer a job stays open
      </span>
    </p>
  );
}

const VERDICT_STYLE: Record<Read["verdict"], string> = {
  "Strong posting": "bg-accent text-white",
  "Worth a look": "bg-accent-soft text-accent",
  "Ask hard questions": "bg-amber-soft text-amber",
  "Proceed with caution": "bg-red-soft text-red",
};

const ROW_LIGHT: Record<ReturnType<typeof checkLight>, { dot: string; label: string }> = {
  green: { dot: LIGHT.green, label: "Good" },
  yellow: { dot: LIGHT.yellow, label: "Ask about it" },
  red: { dot: LIGHT.red, label: "Watch out" },
  none: { dot: "bg-line-strong", label: "Unknown" },
};

/** Small verdict pill for cards. */
export function VerdictPill({ verdict }: { verdict: Read["verdict"] }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${VERDICT_STYLE[verdict]}`}>{verdict}</span>;
}

/** "The Braun Read" panel on the job page. */
/** `hide` drops rows the page already shows elsewhere (they still count toward the verdict). */
export function BraunReadPanel({ read, hide = [] }: { read: Read; hide?: string[] }) {
  // Any row that shows red also gets listed under Red lights, so the two never disagree.
  const redRows: Flag[] = read.checks
    .filter((c) => checkLight(c) === "red")
    .map((c) => ({ code: `check:${c.label}`, label: c.label, why: c.detail, tone: "red" }) as Flag);
  const reds = [...read.flags.filter(isRedFlag), ...redRows];
  const headsUps = read.flags.filter(isHeadsUp);
  const greens = read.flags.filter((f) => f.tone === "green");
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-2">The Braun Read</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${VERDICT_STYLE[read.verdict]}`}>{read.verdict}</span>
        <p className="w-full text-sm text-ink-2">{read.line}</p>
      </div>

      <dl className="divide-y divide-line">
        {read.checks.filter((c) => !hide.includes(c.label)).map((c) => (
          <div key={c.label} className="flex gap-3 px-4 py-2.5">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ROW_LIGHT[checkLight(c)].dot}`} aria-label={ROW_LIGHT[checkLight(c)].label} />
            <dt className="w-28 shrink-0 sm:w-32 text-sm font-semibold">{c.label}</dt>
            <dd className="text-sm text-ink-2">{c.detail}</dd>
          </div>
        ))}
      </dl>

      {(reds.length > 0 || greens.length > 0 || headsUps.length > 0) && (
        <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
          <div className="space-y-4">
            <FlagList title="Red lights" flags={reds} empty="None spotted." tone="red" />
            {headsUps.length > 0 && <FlagList title="Yellow lights" flags={headsUps} empty="" tone="headsUp" />}
          </div>
          <FlagList title="Green lights" flags={greens} empty="None spotted." tone="green" />
        </div>
      )}
      <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">
        Based only on what the posting says. Lights are a starting point for your first call, not a final judgment.
      </p>
    </section>
  );
}

const TITLE_TONE = { red: "text-red", headsUp: "text-amber", green: "text-accent" };
const TITLE_DOT = { red: LIGHT.red, headsUp: LIGHT.yellow, green: LIGHT.green };

function FlagList({ title, flags, empty, tone }: { title: string; flags: Flag[]; empty: string; tone: keyof typeof TITLE_TONE }) {
  return (
    <div>
      <h3 className={`mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${TITLE_TONE[tone]}`}>
        <span className={`h-2 w-2 rounded-full ${TITLE_DOT[tone]}`} aria-hidden />
        {title}
      </h3>
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
