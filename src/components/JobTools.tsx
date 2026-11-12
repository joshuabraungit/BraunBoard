"use client";
// Before You Apply: one flow on the job page. Is the job worth it (the Braun Read), where you
// fit (strong / worth exploring / gaps, a few questions), then, only if they want it, a
// résumé copy in the job's words, and interview prep that uses their answers.
// "What people say" is the free extra. Résumé steps need a sign-in.

import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { LIGHT } from "./lights";
import { TheirWords } from "./TheirWords";
import { FitStep } from "./FitStep";
import { WhyThisWayFolded } from "./WhyThisWay";
import type { GapNote } from "@/lib/job-tools/prep";
import { forgetResume, myResume, peopleSay, prepForJob, readResumeText, type PrepSheet } from "@/app/jobs/[slug]/tools-actions";
import type { Chatter } from "@/lib/job-tools/chatter";

const STAGE_LABELS = {
  recruiter: "Recruiter screen",
  hiring_manager: "Hiring manager",
  panel: "Panel or role play",
  final: "Final round",
} as const;

const KEY = "bb-resume";
interface Resume {
  name: string;
  text: string;
}

const btn = "rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50";
const ghost = "rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold hover:border-ink";
const field = "w-full rounded-lg border border-line-strong bg-bg p-3 text-[15px] leading-relaxed outline-none focus:border-ink";
const label = "text-xs font-bold uppercase tracking-wide text-ink-3";

const Dot = ({ tone }: { tone: "green" | "yellow" | "red" }) => <span aria-hidden className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${LIGHT[tone]}`} />;
const toneWord = { green: "Green light", yellow: "Yellow light", red: "Red light" } as const;

export interface Qualify {
  verdict: string;
  line: string;
  reds: string[];
  yellows: string[];
}

export function JobTools({
  slug,
  company,
  title,
  preview,
  signedIn,
  qualify,
}: {
  slug: string;
  company: string;
  title: string;
  preview: boolean;
  signedIn: boolean;
  qualify: Qualify;
}) {
  const [fitDone, setFitDone] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [resume, setResume] = useState<Resume | null>(null);
  const [gapNotes, setGapNotes] = useState<GapNote[]>([]);

  // Signed in: the résumé saved to their account. Signed out: one read earlier in this tab.
  useEffect(() => {
    if (signedIn) {
      myResume()
        .then((r) => {
          if (r.ok && r.data) setResume(r.data);
        })
        .catch(() => {});
      return;
    }
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) setResume(JSON.parse(saved) as Resume);
    } catch {}
  }, [signedIn]);
  const keep = (r: Resume | null) => {
    setResume(r);
    // A different résumé means a different read.
    setFitDone(false);
    setShowWords(false);
    setGapNotes([]);
    if (signedIn) {
      if (!r) forgetResume().catch(() => {});
      return;
    }
    try {
      if (r) sessionStorage.setItem(KEY, JSON.stringify(r));
      else sessionStorage.removeItem(KEY);
    } catch {}
  };

  const step = "flex items-baseline gap-2 text-base font-bold tracking-tight";
  const num = "font-serif text-xl leading-none text-accent";

  return (
    <section id="get-ready" className="mt-6 scroll-mt-24 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold tracking-tight">Before You Apply</h2>
        {preview && <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber">Preview · only you can see this</span>}
      </div>
      <p className="mt-1 text-[15px] text-ink-2">Find out where you fit, and where you don&apos;t, before you hit submit.</p>
      <WhyThisWayFolded />

      <h3 className={`${step} mt-6`}>
        <span className={num}>1</span> Is the job worth it?
      </h3>
      <WorthIt qualify={qualify} />

      <h3 className={`${step} mt-6`}>
        <span className={num}>2</span> Where you fit
      </h3>
      {signedIn ? (
        <>
          <ResumeBar resume={resume} onChange={keep} signedIn={signedIn} />
          {/* Keyed on the résumé, so a new or deleted résumé starts a fresh read. */}
          <FitStep
            key={resume?.name ?? "none"}
            slug={slug}
            hasResume={!!resume}
            onNotes={setGapNotes}
            onDone={(f) => setFitDone(!!f)}
          />
        </>
      ) : (
        <SignInFirst slug={slug} />
      )}

      {fitDone && (
        <>
          <h3 className={`${step} mt-6`}>
            <span className={num}>3</span> Want a résumé that shows it?
          </h3>
          {!showWords ? (
            <div className="mt-2 text-[15px]">
              <p className="text-ink-2">Optional. I&apos;ll put your real experience in their words, and you approve every change. Your original stays as it is.</p>
              <button type="button" className={`${ghost} mt-2`} onClick={() => setShowWords(true)}>
                Yes, show me
              </button>
            </div>
          ) : (
            <TheirWords slug={slug} company={company} resume={resume} signedIn={signedIn} askGaps={false} />
          )}

          <h3 className={`${step} mt-6`}>
            <span className={num}>4</span> Prep for the interview
          </h3>
          <PrepTool slug={slug} resume={resume} company={company} title={title} gapNotes={gapNotes} />
        </>
      )}

      <details className="group mt-6 border-t border-line pt-4">
        <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">
          What people say about working at {company} <span className="text-ink-3 group-open:hidden">↓</span>
        </summary>
        <People slug={slug} company={company} />
      </details>
    </section>
  );
}

/** Qualify the job before putting time into it: the same read the page shows, in two lines. */
function WorthIt({ qualify }: { qualify: Qualify }) {
  const { verdict, line, reds, yellows } = qualify;
  return (
    <div className="mt-4 rounded-xl bg-bg p-4 text-sm">
            <p className="mt-1 text-[15px]">
        <span className="font-semibold">{verdict}.</span> {line}
      </p>
      {reds.length > 0 && (
        <ul className="mt-2 space-y-1">
          {reds.slice(0, 3).map((r) => (
            <li key={r} className="flex gap-2">
              <Dot tone="red" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
      {reds.length > 0 ? (
        <p className="mt-2 text-ink-2">Might be worth asking about {reds.length === 1 ? "this" : "these"} before you spend an hour on a tailored résumé.</p>
      ) : yellows.length > 0 ? (
        <p className="mt-2 text-ink-2">
          No red lights. {yellows.length} thing{yellows.length === 1 ? "" : "s"} the posting doesn&apos;t say, worth asking on the first call.
        </p>
      ) : (
        <p className="mt-2 text-ink-2">No red lights. If it fits what you want, the tools below help you get ready.</p>
      )}
      <a href="#read" className="mt-1 inline-block text-ink-3 underline underline-offset-2 hover:text-ink">
        See the full Braun Read
      </a>
    </div>
  );
}

function SignInFirst({ slug }: { slug: string }) {
  return (
    <div className="mt-3 rounded-xl bg-bg p-4 text-[15px]">
      <p className="font-semibold">Upload once, see where you fit on any job.</p>
      <p className="mt-1 text-ink-2">Sign in and add your résumé. I&apos;ll show you where you line up, ask before I assume, and never add anything you didn&apos;t do.</p>
      <a href={`/login?why=words&next=/jobs/${slug}%23get-ready`} className={`${btn} mt-3 inline-block`}>
        Sign in →
      </a>
    </div>
  );
}

function ResumeBar({ resume, onChange, optional, signedIn }: { resume: Resume | null; onChange: (r: Resume | null) => void; optional?: boolean; signedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function read(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append("resume", file);
    try {
      const r = await readResumeText(fd);
      if (!r.ok) return setError(r.error);
      onChange(r.data);
    } catch {
      setError("Something went wrong reading that file.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 rounded-xl border border-dashed border-line-strong px-3 py-3 text-sm">
      {resume ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            <span className="font-semibold">Your résumé:</span> {resume.name}
          </span>
          <span className="flex items-center gap-3">
            <label className="cursor-pointer text-ink-3 underline underline-offset-2 hover:text-ink">
              {busy ? "Reading…" : "Replace"}
              <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" disabled={busy} onChange={(e) => read(e.target.files?.[0])} />
            </label>
            <button
              type="button"
              onClick={() => {
                if (!signedIn || window.confirm("Delete your saved résumé? Your saved copies stay.")) onChange(null);
              }}
              className="text-ink-3 underline underline-offset-2 hover:text-ink"
            >
              {signedIn ? "Delete" : "Remove"}
            </button>
          </span>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-wrap items-center gap-2">
          <span className={ghost}>{busy ? "Reading…" : "Add your résumé (PDF or Word)"}</span>
          <span className="text-ink-3">{optional ? "Optional here, but it helps." : signedIn ? "Saved to your account so it works on any job. Delete it anytime." : "Stays in this browser tab. I don't save it."}</span>
          <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" disabled={busy} onChange={(e) => read(e.target.files?.[0])} />
        </label>
      )}
      {error && <p className="mt-2 text-red">{error}</p>}
    </div>
  );
}

function useRun<T>() {
  const [data, setData] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>) {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      if (r.ok) setData(r.data);
      else setError(r.error);
    } catch {
      setError("Something went wrong. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }
  return { data, setData, busy, error, run };
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function ChatterLines({ chatter, company }: { chatter: Chatter; company: string }) {
  return (
    <div>
      {chatter.lines.length > 0 ? (
        <ul className="space-y-3">
          {chatter.lines.map((l) => (
            <li key={l.url + l.text} className="flex gap-2.5">
              <Dot tone={l.tone} />
              <span className="sr-only">{toneWord[l.tone]}: </span>
              <span className="text-[15px] leading-relaxed">
                {l.text}{" "}
                <a href={l.url} target="_blank" rel="noopener nofollow" className="whitespace-nowrap text-sm text-ink-3 underline underline-offset-2 hover:text-ink">
                  {l.source} ↗
                </a>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {chatter.thin && <p className="mt-3 text-sm text-ink-2">Not much out there about working at {company} yet. That&apos;s not good or bad, it just means you&apos;ll learn more by asking.</p>}
      <p className="mt-3 text-xs text-ink-3">Checked {day(chatter.checked_at)}. Summarized from public posts and news, not reviews. One post is one person&apos;s take.</p>
    </div>
  );
}

function People({ slug, company }: { slug: string; company: string }) {
  const { data, busy, error, run } = useRun<Chatter>();
  return (
    <div className="mt-3">
      {!data && (
        <button type="button" className={btn} disabled={busy} onClick={() => run(() => peopleSay(slug))}>
          {busy ? "Looking around… (about 30 seconds)" : `What are people saying about ${company}?`}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
      {data && <ChatterLines chatter={data} company={company} />}
    </div>
  );
}

function sheetText(s: PrepSheet, company: string, title: string): string {
  const out: string[] = [`${title} at ${company}`, `Prep for: ${STAGE_LABELS[s.stage]}`, ""];
  out.push(
    "3 NUMBERS TO KNOW",
    ...s.numbers.map((n) => `- ${n.value ?? "Know this one"}: ${n.label}`),
    "",
    "2 STORIES TO TELL",
    ...s.stories.slice(0, 2).map((st) => `- ${st.title}`),
    "",
    "1 QUESTION TO ASK",
    `- ${s.one.text} (${s.one.why})`,
    "",
  );
  if (s.sell) out.push("WHAT YOU'D SELL", `- ${s.sell}`, "");
  if (s.buyer) out.push("WHO YOU'D SELL TO", `- ${s.buyer}`, "");
  if (s.interviewer.length) out.push("WHO YOU'RE MEETING", ...s.interviewer.map((b) => `- ${b}`), "");
  if (s.stories.length) {
    out.push("YOUR STORIES");
    for (const st of s.stories) out.push(`- ${st.title} (${st.when})`, ...st.beats.map((b) => `    - ${b}`));
    out.push("");
  }
  if (s.gap_talk.length) out.push("IF THEY ASK ABOUT SOMETHING YOU HAVEN'T DONE", ...s.gap_talk.map((g) => `- ${g.want}: "${g.say}"`), "");
  if (s.lights.length) out.push("ASK ABOUT", ...s.lights.map((l) => `- [${l.tone}] ${l.text}`), "");
  if (s.chatter?.lines.length) out.push("WHAT PEOPLE SAY", ...s.chatter.lines.map((l) => `- [${l.tone}] ${l.text} (${l.url})`), "");
  out.push("QUESTIONS TO ASK", ...[...s.questions, ...s.asks].map((q) => `- ${q.text}`));
  return out.join("\n");
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Opens just the sheet in a new tab and brings up the print dialog (Save as PDF works there too). */
function printSheet(s: PrepSheet, company: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const lines = sheetText(s, company, title).split("\n");
  const body = lines
    .map((l) => (/^[A-Z' ]{6,}$/.test(l) ? `<h2>${esc(l)}</h2>` : l.startsWith("    - ") ? `<li class="sub">${esc(l.slice(6))}</li>` : l.startsWith("- ") ? `<li>${esc(l.slice(2))}</li>` : l ? `<p>${esc(l)}</p>` : ""))
    .join("");
  w.document.write(
    `<!doctype html><meta charset="utf-8"><title>${esc(`Prep: ${title} at ${company}`)}</title><style>body{font:14px/1.45 -apple-system,system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px;color:#111}h2{font-size:11px;letter-spacing:.08em;color:#666;margin:18px 0 4px}p:first-child{font-size:20px;font-weight:700;margin:0}li{margin:3px 0 3px 18px}li.sub{margin-left:36px;color:#333}</style>${body}<p style="margin-top:24px;color:#888;font-size:11px">Braun Board · braunboard.com</p><script>setTimeout(()=>print(),300)</script>`,
  );
  w.document.close();
}

/** The 3-2-1: know 3 numbers, tell 2 stories, ask 1 question. Short enough to remember without the sheet. */
function ThreeTwoOne({ data, company, title }: { data: PrepSheet; company: string; title: string }) {
  const n = "font-serif text-2xl leading-none text-ink";
  const head = "flex items-baseline gap-2 text-sm text-ink-2";
  const gap = data.gap_talk[0];
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-2">
          {company} · {STAGE_LABELS[data.stage].toLowerCase()}
        </p>
        <CopyButton text={sheetText(data, company, title)} label="Copy" className="text-sm text-ink-3 underline underline-offset-2 hover:text-ink" />
      </div>

      <p className={`${head} mt-3`}>
        <span className={n}>3</span> numbers to know
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {data.numbers.map((x) => (
          <div key={x.label} className="rounded-lg bg-bg px-2 py-2 text-center">
            {x.value ? <p className="text-lg font-bold tabular-nums">{x.value}</p> : <p className="text-sm font-semibold text-amber">Know this one</p>}
            <p className="text-xs text-ink-2">{x.label}</p>
          </div>
        ))}
      </div>

      <p className={`${head} mt-4`}>
        <span className={n}>2</span> stories to tell
      </p>
      <ul className="mt-1 space-y-1 text-[15px]">
        {data.stories.slice(0, 2).map((st) => (
          <li key={st.title}>{st.title}</li>
        ))}
      </ul>

      <p className={`${head} mt-4`}>
        <span className={n}>1</span> question to ask
      </p>
      <p className="mt-1 font-serif text-[16px] leading-snug">&ldquo;{data.one.text}&rdquo;</p>
      <p className="mt-0.5 text-xs text-ink-3">{data.one.why}</p>

      {gap && (
        <div className="mt-4 border-t border-line pt-3 text-sm">
          <p className="text-ink-2">If they ask about {gap.want.charAt(0).toLowerCase() === gap.want.charAt(0) ? gap.want : gap.want.replace(/^[A-Z][a-z]/, (m) => m.toLowerCase())}</p>
          <p className="mt-0.5">&ldquo;{gap.say}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

function PrepTool({ slug, resume, company, title, gapNotes }: { slug: string; resume: Resume | null; company: string; title: string; gapNotes: GapNote[] }) {
  const { data, busy, error, run } = useRun<PrepSheet>();
  const [stage, setStage] = useState<keyof typeof STAGE_LABELS>("hiring_manager");
  const [bio, setBio] = useState("");
  const [stories, setStories] = useState("");
  return (
    <div className="mt-3 space-y-3">
      <fieldset>
        <legend className={label}>Which interview?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(STAGE_LABELS) as (keyof typeof STAGE_LABELS)[]).map((k) => (
            <button key={k} type="button" aria-pressed={stage === k} onClick={() => setStage(k)} className={`${ghost} aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white`}>
              {STAGE_LABELS[k]}
            </button>
          ))}
        </div>
      </fieldset>
      <details className="group text-sm">
        <summary className="cursor-pointer list-none text-ink-3 underline underline-offset-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          Add who you&apos;re meeting or your own stories (optional)
        </summary>
        <div className="mt-2 space-y-3">
      <label className="block">
        <span className={label}>Who you&apos;re meeting (optional)</span>
        <textarea rows={3} className={`${field} mt-1`} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Paste their LinkedIn About section and recent roles. I only use what you paste." />
      </label>
      <label className="block">
        <span className={label}>Your deal stories (optional)</span>
        <textarea
          rows={4}
          className={`${field} mt-1`}
          value={stories}
          onChange={(e) => setStories(e.target.value)}
          placeholder="A win and a loss, a few lines each: who it was, what you did, how it ended. Skip it and I'll pull from your résumé."
        />
      </label>
        </div>
      </details>
      <button type="button" className={btn} disabled={busy || (!resume && stories.trim().length < 40)} onClick={() => run(() => prepForJob(slug, { resume: resume?.text ?? "", stage, bio, stories, gaps: gapNotes }))}>
        {busy ? "Building your 3-2-1… (about 20 seconds)" : data ? "Build it again" : "Build my 3-2-1"}
      </button>
      {!resume && stories.trim().length < 40 && <p className="text-xs text-ink-3">Add your résumé or write a story or two to start.</p>}
      {gapNotes.length > 0 && (
        <p className="text-xs text-ink-3">
          Using your {gapNotes.length} answer{gapNotes.length === 1 ? "" : "s"} from Where you fit.
        </p>
      )}
      {error && <p className="text-sm text-red">{error}</p>}
      {data && <ThreeTwoOne data={data} company={company} title={title} />}
      {data && (
        <details className="group rounded-xl border border-line bg-bg p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Show the full sheet <span className="text-ink-3 group-open:hidden">↓</span>
          </summary>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">
              Prep sheet · <span className="font-normal text-ink-2">{STAGE_LABELS[data.stage]}</span>
            </p>
            <div className="flex gap-2">
              <CopyButton text={sheetText(data, company, title)} label="Copy" className={ghost} />
              <button type="button" className={ghost} onClick={() => printSheet(data, company, title)}>
                Print / PDF
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-4 text-sm leading-relaxed">
            {data.sell && <Block title="What you'd sell" items={[data.sell]} />}
            {data.buyer && <Block title="Who you'd sell to" items={[data.buyer]} />}
            {data.interviewer.length > 0 && <Block title="Who you're meeting" items={data.interviewer} />}
            {data.stories.length > 0 && (
              <div>
                <p className={label}>Your stories</p>
                {data.stories.map((s) => (
                  <div key={s.title} className="mt-2">
                    <p className="font-semibold">
                      {s.title} <span className="font-normal text-ink-3">· {s.when}</span>
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {s.beats.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {data.gap_talk.length > 0 && (
              <div>
                <p className={label}>If they ask about something you haven&apos;t done</p>
                <ul className="mt-1 space-y-2">
                  {data.gap_talk.map((g) => (
                    <li key={g.want}>
                      <span className="font-semibold">{g.want}.</span> &ldquo;{g.say}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.lights.length > 0 && (
              <div>
                <p className={label}>Ask about</p>
                <ul className="mt-1 space-y-1.5">
                  {data.lights.map((l) => (
                    <li key={l.text} className="flex gap-2.5">
                      <Dot tone={l.tone} />
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.chatter && data.chatter.lines.length > 0 && (
              <div>
                <p className={label}>What people say</p>
                <div className="mt-1">
                  <ChatterLines chatter={data.chatter} company={company} />
                </div>
              </div>
            )}
            <div>
              <p className={label}>Questions to ask</p>
              <ul className="mt-1 space-y-2">
                {[...data.questions, ...data.asks].map((q) => (
                  <li key={q.text}>
                    <span className="font-medium">&ldquo;{q.text}&rdquo;</span>
                    {q.why && <span className="block text-xs text-ink-3">{q.why}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className={label}>{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
