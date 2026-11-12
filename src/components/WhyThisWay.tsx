// Josh's point of view on Before You Apply. Shown on the job page (folded) and the Toolkit page (open).
import Link from "next/link";

export const WHY_LEAD = "Most résumé tools try to make you look like a match. I'd rather help you find out if you are one.";

/** builtIn: the Braun Board tool, where the honesty rules are checked in code. The prompt alone can only ask. */
export const whyPoints = (builtIn: boolean): [string, string][] => [
  [
    "No truth, no transaction.",
    builtIn
      ? "Nothing goes on your résumé that you didn't do. If a line would need a number you didn't give me, I ask. I don't guess. On Braun Board it's checked in code, not just promised."
      : "Nothing goes on your résumé that you didn't do. If a line would need a number you didn't give it, it asks. It doesn't guess. The prompt spells that out, and the test below is how you check.",
  ],
  [
    "Curiosity before conclusions.",
    "If the job wants something your résumé doesn't show, I ask before I assume. Plenty of sellers have done the thing and just never wrote it down.",
  ],
  [
    "Sorting, not selling.",
    "Some jobs won't line up with what you've done. Finding that out before you apply isn't a loss. It's an hour back, spent on a job that fits.",
  ],
  ["No score.", "A match score tells you how well you copied their words. It doesn't tell you whether you'd be good at the job, or happy there."],
];

export const WHY_CLOSE =
  "It's the same way I teach selling. We don't control who says yes. We do control where we spend our time, and whether everything we say is true.";

function Points({ builtIn }: { builtIn: boolean }) {
  return (
    <>
      <ul className="mt-3 space-y-3">
        {whyPoints(builtIn).map(([t, d]) => (
          <li key={t}>
            <p className="font-semibold">{t}</p>
            <p className="text-ink-2">{d}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-ink-2">{WHY_CLOSE}</p>
      <p className="mt-2 font-semibold">Josh</p>
    </>
  );
}

/** Folded version for the job page. */
export function WhyThisWayFolded() {
  return (
    <details className="group mt-3 rounded-xl border border-line bg-bg px-4 py-3 text-sm">
      <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
        Why I built it this way <span className="text-ink-3 group-open:hidden">↓</span>
      </summary>
      <p className="mt-2 text-[15px]">{WHY_LEAD}</p>
      <Points builtIn />
      <Link href="/before-you-apply" className="mt-2 inline-block text-ink-3 underline underline-offset-2 hover:text-ink">
        More on this
      </Link>
    </details>
  );
}

/** Open version for the Toolkit page. */
export function WhyThisWayOpen({ builtIn }: { builtIn: boolean }) {
  return (
    <div className="text-[15px] leading-relaxed">
      <p className="text-lg">{WHY_LEAD}</p>
      <Points builtIn={builtIn} />
    </div>
  );
}
