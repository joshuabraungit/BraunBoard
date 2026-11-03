import { LIGHT } from "./lights";

type Tone = keyof typeof LIGHT;

/**
 * The life meter: a video-game health bar that drains as a job stays open. Five bars when it's
 * new, one lost about every week for the first month, then every two weeks. Long-open jobs are worth a question, not a pass.
 */
const LIFE: { maxDays: number; bars: number; tone: Tone; line: string }[] = [
  { maxDays: 7, bars: 5, tone: "green", line: "Full health. Just posted." },
  { maxDays: 14, bars: 4, tone: "green", line: "Still going strong." },
  { maxDays: 30, bars: 3, tone: "yellow", line: "Taking some hits. Ask how long they've been looking." },
  { maxDays: 45, bars: 2, tone: "yellow", line: "Health running low. Ask why it's still open." },
  { maxDays: 60, bars: 1, tone: "red", line: "Last life. Ask why it's been hard to fill." },
  { maxDays: 90, bars: 0, tone: "red", line: "Game over? Still on their site, but open 2+ months." },
  { maxDays: Infinity, bars: 0, tone: "red", line: "Game over? Still on their site, but open 3+ months." },
];

/** What the meter is, shown on hover. Just what it is, no advice. */
export const LIFE_METER_TIP = "Drains a bar as the job stays open.";

/** `decorative` for the sample in the color key: no label for screen readers. */
/** Where a job is on the meter, and the line that goes with it. */
export function lifeFor(postedAt: string, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - new Date(postedAt).getTime()) / 86_400_000));
  return { days, ...LIFE.find((l) => days <= l.maxDays)! };
}

export function LifeMeter({ postedAt, now = Date.now(), decorative = false, children }: { postedAt: string; now?: number; decorative?: boolean; children?: React.ReactNode }) {
  const life = lifeFor(postedAt, now);
  const bars = (
    <span className="inline-flex items-center gap-[2px] align-[1px]" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`h-2.5 w-[5px] rounded-[1px] ${i < life.bars ? LIGHT[life.tone] : "bg-line-strong"}`} />
      ))}
    </span>
  );
  if (decorative) return bars;
  // Sits above the card's click-anywhere link (z-10) so the hover reaches it, and shows its own
  // bubble right away instead of the browser's slow, tiny tooltip.
  return (
    <span className="group/meter relative z-10 inline-flex items-center gap-1.5" tabIndex={0} role="img" aria-label={`${LIFE_METER_TIP} Open ${life.days === 1 ? "1 day" : `${life.days} days`}.`}>
      {bars}
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-white shadow-md group-hover/meter:block group-focus-visible/meter:block"
      >
        {LIFE_METER_TIP}
      </span>
    </span>
  );
}
