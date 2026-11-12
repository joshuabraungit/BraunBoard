"use client";
// "Say it in their words": suggested rewrites in the job's language, reviewed one by one,
// then saved as a copy for this job. The original résumé never changes.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { answerGap, saveWordsCopy, tuneForJob, type WordsRun } from "@/app/jobs/[slug]/tools-actions";
import { buildCopy, type Add } from "@/lib/job-tools/words-text";
import type { FactAdd } from "@/lib/job-tools/tune";
import type { GapNote } from "@/lib/job-tools/prep";

type Choice = "yes" | "no";
const btn = "rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50";
const ghost = "rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold hover:border-ink";
const field = "w-full rounded-lg border border-line-strong bg-bg p-3 text-[15px] leading-relaxed outline-none focus:border-ink";
const label = "text-xs font-bold uppercase tracking-wide text-ink-3";

function Decide({ choice, onChoose }: { choice: Choice | undefined; onChoose: (c: Choice) => void }) {
  // aria-pressed styles, so the picked button's colors always win over the plain ones.
  const pick = `${ghost} aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white`;
  return (
    <div className="mt-2 flex gap-2">
      <button type="button" aria-pressed={choice === "yes"} className={pick} onClick={() => onChoose("yes")}>
        Use it
      </button>
      <button type="button" aria-pressed={choice === "no"} className={pick} onClick={() => onChoose("no")}>
        Skip
      </button>
    </div>
  );
}

export function TheirWords({
  slug,
  company,
  resume,
  signedIn,
  onGaps,
  askGaps = true,
}: {
  slug: string;
  company: string;
  resume: { text: string } | null;
  signedIn: boolean;
  /** Their yes/no answers, so interview prep can use them. */
  onGaps?: (notes: GapNote[]) => void;
  /** False when Before You Apply already asked its questions. */
  askGaps?: boolean;
}) {
  const [data, setData] = useState<WordsRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Rewrites: their choice and any wording they changed.
  const [pick, setPick] = useState<Record<number, Choice>>({});
  const [text, setText] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<number | null>(null);

  // New lines: from their notes, or from answering a gap question.
  const [adds, setAdds] = useState<(FactAdd & { from: string })[]>([]);
  const [addPick, setAddPick] = useState<Record<number, Choice>>({});

  // Gap questions.
  const [gapState, setGapState] = useState<Record<string, "open" | "no" | "busy" | "done">>({});
  const [gapText, setGapText] = useState<Record<string, string>>({});
  const [gapError, setGapError] = useState<Record<string, string>>({});

  // Hand their answers to the other tools on this page (interview prep).
  useEffect(() => {
    if (!onGaps || !data) return;
    const notes: GapNote[] = [];
    for (const g of data.gaps) {
      const st = gapState[g.want];
      if (st === "no") notes.push({ want: g.want, has: false });
      if (st === "done") notes.push({ want: g.want, has: true, said: gapText[g.want] ?? "" });
    }
    onGaps(notes);
  }, [data, gapState, gapText, onGaps]);

  const [saved, setSaved] = useState<{ id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  // The copy as they last edited it. Set when they hit "Make my copy".
  const [draft, setDraft] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    setSaved(null);
    setShowCopy(false);
    try {
      const r = await tuneForJob(slug);
      if (!r.ok) return setError(r.error);
      setData(r.data);
      setPick({});
      setText({});
      setAdds(r.data.adds.map((a) => ({ ...a, from: "From Things I've done" })));
      setAddPick({});
      setGapState({});
      setEditing(null);
    } catch {
      setError("Something went wrong. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(want: string) {
    const said = gapText[want] ?? "";
    setGapState((s) => ({ ...s, [want]: "busy" }));
    setGapError((s) => ({ ...s, [want]: "" }));
    try {
      const r = await answerGap(slug, want, said);
      if (!r.ok) {
        setGapError((s) => ({ ...s, [want]: r.error }));
        setGapState((s) => ({ ...s, [want]: "open" }));
        return;
      }
      setAdds((a) => [...a, { ...r.data, from: `You said yes to: ${want}` }]);
      setGapState((s) => ({ ...s, [want]: "done" }));
    } catch {
      setGapError((s) => ({ ...s, [want]: "Something went wrong. Try again in a minute." }));
      setGapState((s) => ({ ...s, [want]: "open" }));
    }
  }

  const swaps = useMemo(
    () => (data ? data.edits.map((e, i) => ({ before: e.before, after: text[i] ?? e.after, i })).filter((s) => pick[s.i] === "yes") : []),
    [data, pick, text],
  );
  const chosenAdds: Add[] = useMemo(() => adds.filter((_, i) => addPick[i] === "yes").map((a) => ({ text: a.text, after: a.after })), [adds, addPick]);
  const copy = useMemo(() => (resume ? buildCopy(resume.text, swaps, chosenAdds) : ""), [resume, swaps, chosenAdds]);
  const undecided = data ? data.edits.filter((_, i) => !pick[i]).length + adds.filter((_, i) => !addPick[i]).length : 0;
  const changes = swaps.length + chosenAdds.length;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const r = await saveWordsCopy(slug, draft);
      if (!r.ok) return setError(r.error);
      setSaved(r.data);
    } catch {
      setError("Couldn't save it. Try again in a minute.");
    } finally {
      setSaving(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="mt-3 rounded-xl bg-bg p-4 text-[15px]">
        <p className="font-semibold">Upload once, tailor for any job.</p>
        <p className="mt-1 text-ink-2">Sign in and add your résumé. On any job here, you&apos;ll see your lines in their words, approve what fits, and download a copy for that job.</p>
        <Link href={`/login?why=words&next=/jobs/${slug}%23get-ready`} className={`${btn} mt-3 inline-block`}>
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-sm text-ink-2">Change the words, never the facts. You approve every change, and your original résumé stays as it is.</p>
      <button type="button" className={`${btn} mt-3`} disabled={busy || !resume} onClick={run}>
        {busy ? "Reading both… (about 20 seconds)" : data ? "Start over" : `Say it in ${company}'s words`}
      </button>
      {error && <p className="mt-2 text-sm text-red">{error}</p>}

      {data && (
        <div className="mt-5 space-y-6">
          {data.keywords.length > 0 && (
            <div>
              <p className={label}>What they keep saying</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-bg px-2.5 py-1 text-sm ring-1 ring-line">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className={label}>Your lines, in their words</p>
            {data.edits.length === 0 ? (
              <p className="mt-2 text-sm text-ink-2">Nothing I can change without stretching the truth. Your résumé already speaks their language, or the questions below are where the gaps are.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {data.edits.map((e, i) => (
                  <li key={e.before} className={`rounded-xl border p-3 ${pick[i] === "yes" ? "border-accent" : "border-line"} ${pick[i] === "no" ? "opacity-60" : ""}`}>
                    <p className="text-sm text-ink-3 line-through">{e.before}</p>
                    {editing === i ? (
                      <textarea rows={3} className={`${field} mt-2`} value={text[i] ?? e.after} onChange={(ev) => setText((t) => ({ ...t, [i]: ev.target.value }))} onBlur={() => setEditing(null)} autoFocus />
                    ) : (
                      <p className="mt-1 text-[15px] font-medium leading-relaxed">{text[i] ?? e.after}</p>
                    )}
                    {e.why && <p className="mt-1 text-xs text-ink-3">{e.why}</p>}
                    {e.ask && <p className="mt-2 rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">{e.ask} If you know it, tap Edit and add it. If not, leave it out.</p>}
                    <div className="flex flex-wrap items-end gap-2">
                      <Decide choice={pick[i]} onChoose={(c) => setPick((p) => ({ ...p, [i]: c }))} />
                      <button type="button" className="mb-1.5 text-sm text-ink-3 underline underline-offset-2 hover:text-ink" onClick={() => setEditing(editing === i ? null : i)}>
                        {editing === i ? "Done" : "Edit"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {askGaps && data.gaps.length > 0 && (
            <div>
              <p className={label}>Questions, not guesses</p>
              <p className="mt-1 text-sm text-ink-2">They want these and your résumé doesn&apos;t show them. No is a fine answer. If yes, I&apos;ll remember it for other jobs.</p>
              <ul className="mt-2 space-y-3">
                {data.gaps.map((g) => {
                  const st = gapState[g.want];
                  return (
                    <li key={g.want} className={`rounded-xl border border-line p-3 ${st === "no" ? "opacity-60" : ""}`}>
                      <p className="text-[15px]">{g.ask}</p>
                      {!st && (
                        <div className="mt-2 flex gap-2">
                          <button type="button" className={ghost} onClick={() => setGapState((s) => ({ ...s, [g.want]: "open" }))}>
                            Yes, I have
                          </button>
                          <button type="button" className={ghost} onClick={() => setGapState((s) => ({ ...s, [g.want]: "no" }))}>
                            No
                          </button>
                        </div>
                      )}
                      {(st === "open" || st === "busy") && (
                        <div className="mt-2">
                          <textarea
                            rows={3}
                            className={field}
                            placeholder="What did you do? Plain words are fine. Only include what's true."
                            value={gapText[g.want] ?? ""}
                            onChange={(e) => setGapText((t) => ({ ...t, [g.want]: e.target.value }))}
                          />
                          <button type="button" className={`${btn} mt-2`} disabled={st === "busy"} onClick={() => answer(g.want)}>
                            {st === "busy" ? "Writing a line…" : "Turn it into a line"}
                          </button>
                          {gapError[g.want] && <p className="mt-2 text-sm text-red">{gapError[g.want]}</p>}
                        </div>
                      )}
                      {st === "done" && <p className="mt-2 text-sm text-accent">Saved to Things I&apos;ve done. Your new line is below.</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {adds.length > 0 && (
            <div>
              <p className={label}>New lines</p>
              <ul className="mt-2 space-y-3">
                {adds.map((a, i) => (
                  <li key={`${a.text}-${i}`} className={`rounded-xl border p-3 ${addPick[i] === "yes" ? "border-accent" : "border-line"} ${addPick[i] === "no" ? "opacity-60" : ""}`}>
                    <p className="text-[15px] font-medium leading-relaxed">• {a.text}</p>
                    <p className="mt-1 text-xs text-ink-3">
                      {a.from}. {a.after ? `Goes under “${a.after.slice(0, 60)}${a.after.length > 60 ? "…" : ""}”` : "Goes in a short section at the end."}
                    </p>
                    <Decide choice={addPick[i]} onChoose={(c) => setAddPick((p) => ({ ...p, [i]: c }))} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-bg p-4">
            <p className="text-[15px]">
              <span className="font-semibold">The test:</span> could you talk about every line for two minutes in an interview?
            </p>
            {undecided > 0 && <p className="mt-1 text-sm text-ink-2">{undecided} still to decide. Anything you don&apos;t pick stays the way it is.</p>}
            <button
              type="button"
              className={`${btn} mt-3`}
              disabled={changes === 0}
              onClick={() => {
                setDraft(copy);
                setSaved(null);
                setShowCopy(true);
              }}
            >
              {changes === 0
                ? "Pick at least one change"
                : showCopy && draft !== copy
                  ? "Rebuild my copy (replaces your edits below)"
                  : `Make my copy (${changes} change${changes === 1 ? "" : "s"})`}
            </button>
          </div>

          {showCopy && (
            <div>
              <p className={label}>Your copy for {company}</p>
              <p className="mt-1 text-sm text-ink-2">Change anything you like. It&apos;s your résumé.</p>
              <textarea
                rows={18}
                className={`${field} mt-2 font-mono text-[13px]`}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSaved(null);
                }}
              />
              {!saved ? (
                <button type="button" className={`${btn} mt-3`} disabled={saving} onClick={save}>
                  {saving ? "Saving…" : data.copy_id ? "Save and download (replaces your last copy for this job)" : "Save and download"}
                </button>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a href={`/copy/${saved.id}/pdf`} className={btn}>
                    Download PDF
                  </a>
                  <a href={`/copy/${saved.id}/docx`} className={ghost}>
                    Word
                  </a>
                  <Link href="/watchlist#copies" className="text-sm text-ink-3 underline underline-offset-2 hover:text-ink">
                    Saved under Saved
                  </Link>
                </div>
              )}
              <p className="mt-2 text-xs text-ink-3">One clean layout that application systems read easily. Get the Word file if you want to tweak it.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
