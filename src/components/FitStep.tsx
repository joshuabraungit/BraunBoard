"use client";
// Before You Apply, step 2: where you fit, where you might, and where you don't.
// A few questions before anything gets rewritten. No score.

import { useState } from "react";
import Link from "next/link";
import { fitForJob, saveAnswer } from "@/app/jobs/[slug]/tools-actions";
import type { Fit, FitPoint } from "@/lib/job-tools/fit";
import type { GapNote } from "@/lib/job-tools/prep";

const btn = "rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50";
const ghost = "rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:border-ink";
const field = "w-full rounded-lg border border-line-strong bg-bg p-3 text-[15px] leading-relaxed outline-none focus:border-ink";
const label = "text-xs font-bold uppercase tracking-wide text-ink-3";

const LINES_UP = {
  well: { word: "Lines up well", tone: "text-accent" },
  partly: { word: "Partly lines up", tone: "text-amber" },
  not_much: { word: "Doesn't line up much", tone: "text-ink" },
} as const;

function Points({ title, items, mark }: { title: string; items: FitPoint[]; mark: string }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={label}>{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((p) => (
          <li key={p.point} className="flex gap-2.5 text-[15px]">
            <span aria-hidden className="mt-0.5 w-4 shrink-0 text-center font-bold">
              {mark}
            </span>
            <span>
              {p.point}
              {p.why && <span className="block text-xs text-ink-3">{p.why}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type QState = "open" | "no" | "busy" | "saved";

export function FitStep({
  slug,
  company,
  hasResume,
  onNotes,
  onDone,
}: {
  slug: string;
  company: string;
  hasResume: boolean;
  /** Their answers, for interview prep. */
  onNotes: (notes: GapNote[]) => void;
  onDone: (fit: Fit | null) => void;
}) {
  const [fit, setFit] = useState<Fit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState<Record<string, QState>>({});
  const [said, setSaid] = useState<Record<string, string>>({});
  const [qError, setQError] = useState<Record<string, string>>({});

  const report = (next: Record<string, QState>) => {
    if (!fit) return;
    onNotes(
      fit.questions.flatMap((x): GapNote[] =>
        next[x.want] === "no" ? [{ want: x.want, has: false }] : next[x.want] === "saved" ? [{ want: x.want, has: true, said: said[x.want] ?? "" }] : [],
      ),
    );
  };
  const setState = (want: string, st: QState) => {
    const next = { ...q, [want]: st };
    setQ(next);
    report(next);
  };

  async function run() {
    setBusy(true);
    setError("");
    try {
      const r = await fitForJob(slug);
      if (!r.ok) return setError(r.error);
      setFit(r.data);
      setQ({});
      onNotes([]);
      onDone(r.data);
    } catch {
      setError("Something went wrong. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(want: string) {
    setQ((s) => ({ ...s, [want]: "busy" }));
    setQError((s) => ({ ...s, [want]: "" }));
    try {
      const r = await saveAnswer(want, said[want] ?? "");
      if (!r.ok) {
        setQError((s) => ({ ...s, [want]: r.error }));
        setQ((s) => ({ ...s, [want]: "open" }));
        return;
      }
      setState(want, "saved");
    } catch {
      setQError((s) => ({ ...s, [want]: "Couldn't save that. Try again in a minute." }));
      setQ((s) => ({ ...s, [want]: "open" }));
    }
  }

  return (
    <div className="mt-3">
      {!fit && (
        <button type="button" className={btn} disabled={busy || !hasResume} onClick={run}>
          {busy ? "Reading both… (about 20 seconds)" : "See where I fit"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red">{error}</p>}

      {fit && (
        <div className="space-y-5">
          <div className="rounded-xl bg-bg p-4">
            <p className={`text-lg font-bold ${LINES_UP[fit.lines_up].tone}`}>{LINES_UP[fit.lines_up].word}</p>
            {fit.summary && <p className="mt-1 text-[15px]">{fit.summary}</p>}
          </div>

          <Points title="Where you're strong" items={fit.strong} mark="✓" />
          <Points title="Worth exploring" items={fit.explore} mark="?" />
          <Points title="Possible gaps" items={fit.gaps} mark="–" />

          {fit.questions.length > 0 && (
            <div>
              <p className={label}>A few questions before we rewrite anything</p>
              <p className="mt-1 text-sm text-ink-2">No is a fine answer. If yes, I&apos;ll remember it for other jobs too.</p>
              <ul className="mt-2 space-y-3">
                {fit.questions.map((x) => {
                  const st = q[x.want];
                  return (
                    <li key={x.want} className={`rounded-xl border border-line p-3 ${st === "no" ? "opacity-60" : ""}`}>
                      <p className="text-[15px]">{x.ask}</p>
                      {!st && (
                        <div className="mt-2 flex gap-2">
                          <button type="button" className={ghost} onClick={() => setQ((s) => ({ ...s, [x.want]: "open" }))}>
                            Yes, I have
                          </button>
                          <button type="button" className={ghost} onClick={() => setState(x.want, "no")}>
                            No
                          </button>
                        </div>
                      )}
                      {(st === "open" || st === "busy") && (
                        <div className="mt-2">
                          <textarea
                            rows={3}
                            className={field}
                            placeholder="What did you do? Plain words are fine. Only what's true."
                            value={said[x.want] ?? ""}
                            onChange={(e) => setSaid((s) => ({ ...s, [x.want]: e.target.value }))}
                          />
                          <button type="button" className={`${btn} mt-2`} disabled={st === "busy"} onClick={() => answer(x.want)}>
                            {st === "busy" ? "Saving…" : "Save"}
                          </button>
                          {qError[x.want] && <p className="mt-2 text-sm text-red">{qError[x.want]}</p>}
                        </div>
                      )}
                      {st === "saved" && <p className="mt-2 text-sm text-accent">Got it. Saved to Things I&apos;ve done.</p>}
                      {st === "no" && <p className="mt-2 text-sm text-ink-3">Good to know. I&apos;ll help you talk about it honestly in your prep.</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {fit.lines_up === "not_much" && (
            <div className="rounded-xl border border-line p-4 text-[15px]">
              <p>
                This one asks for a lot you haven&apos;t done yet. That&apos;s useful to know before you spend an hour on it. You can still go for it.
                It&apos;s your call.
              </p>
              <p className="mt-2 text-ink-2">
                Want jobs that line up better with your background?{" "}
                <Link href="/for-you" className="font-semibold text-ink underline underline-offset-2">
                  Tell me what you&apos;d take
                </Link>{" "}
                and I&apos;ll watch for them.
              </p>
            </div>
          )}

          <button type="button" className="text-sm text-ink-3 underline underline-offset-2 hover:text-ink" onClick={run} disabled={busy}>
            {busy ? "Reading again…" : `Read ${company} again`}
          </button>
        </div>
      )}
    </div>
  );
}
