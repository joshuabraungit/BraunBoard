"use client";
// 3-2-1 Interview Prep on the job page: 3 numbers to know, 2 stories to tell, 1 question to ask.
// Built from their saved résumé (or a deal story or two). Needs a sign-in.

import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { forgetResume, myResume, prepForJob, readResumeText, type PrepSheet } from "@/app/jobs/[slug]/tools-actions";

const STAGE_LABELS = {
  recruiter: "Recruiter screen",
  hiring_manager: "Hiring manager",
  panel: "Panel or role play",
  final: "Final round",
} as const;

interface Resume {
  name: string;
  text: string;
}

const btn = "rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50";
const ghost = "rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-semibold hover:border-ink";
const field = "w-full rounded-lg border border-line-strong bg-bg p-3 text-[15px] leading-relaxed outline-none focus:border-ink";
const label = "text-xs font-bold uppercase tracking-wide text-ink-3";

export function JobTools({ slug, company, title, preview, signedIn }: { slug: string; company: string; title: string; preview: boolean; signedIn: boolean }) {
  const [resume, setResume] = useState<Resume | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    myResume()
      .then((r) => {
        if (r.ok && r.data) setResume(r.data);
      })
      .catch(() => {});
  }, [signedIn]);
  const keep = (r: Resume | null) => {
    setResume(r);
    if (!r) forgetResume().catch(() => {});
  };

  return (
    <section id="get-ready" className="mt-6 scroll-mt-24 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold tracking-tight">3-2-1 Interview Prep</h2>
        {preview && <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber">Preview · only you can see this</span>}
      </div>
      <p className="mt-1 text-[15px] text-ink-2">3 numbers to know, 2 stories to tell, 1 question to ask. Short enough to remember without notes.</p>

      {signedIn ? (
        <>
          <ResumeBar resume={resume} onChange={keep} />
          <PrepTool slug={slug} resume={resume} company={company} title={title} />
        </>
      ) : (
        <SignInFirst slug={slug} />
      )}
    </section>
  );
}

function SignInFirst({ slug }: { slug: string }) {
  return (
    <div className="mt-3 rounded-xl bg-bg p-4 text-[15px]">
      <p className="font-semibold">Upload once, prep for any job.</p>
      <p className="mt-1 text-ink-2">Sign in and add your résumé. I&apos;ll pull your numbers and stories from it, and never add anything you didn&apos;t do.</p>
      <a href={`/login?why=words&next=/jobs/${slug}%23get-ready`} className={`${btn} mt-3 inline-block`}>
        Sign in →
      </a>
    </div>
  );
}

const ACCEPT = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function ResumeBar({ resume, onChange }: { resume: Resume | null; onChange: (r: Resume | null) => void }) {
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
              <input type="file" accept={ACCEPT} className="sr-only" disabled={busy} onChange={(e) => read(e.target.files?.[0])} />
            </label>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete your saved résumé?")) onChange(null);
              }}
              className="text-ink-3 underline underline-offset-2 hover:text-ink"
            >
              Delete
            </button>
          </span>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-wrap items-center gap-2">
          <span className={ghost}>{busy ? "Reading…" : "Add your résumé (PDF or Word)"}</span>
          <span className="text-ink-3">Saved to your account so it works on any job. Delete it anytime.</span>
          <input type="file" accept={ACCEPT} className="sr-only" disabled={busy} onChange={(e) => read(e.target.files?.[0])} />
        </label>
      )}
      {error && <p className="mt-2 text-red">{error}</p>}
    </div>
  );
}

function sheetText(s: PrepSheet, company: string, title: string): string {
  return [
    `${title} at ${company}`,
    `Prep for: ${STAGE_LABELS[s.stage]}`,
    "",
    "3 NUMBERS TO KNOW",
    ...s.numbers.map((n) => `- ${n.value ?? "Know this one"}: ${n.label}`),
    "",
    "2 STORIES TO TELL",
    ...s.stories.flatMap((st) => [`- ${st.title} (${st.when})`, ...st.beats.map((b) => `    - ${b}`)]),
    "",
    "1 QUESTION TO ASK",
    `- ${s.one.text} (${s.one.why})`,
  ].join("\n");
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Opens just the 3-2-1 in a new tab and brings up the print dialog (Save as PDF works there too). */
function printSheet(s: PrepSheet, company: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const body = sheetText(s, company, title)
    .split("\n")
    .map((l) => (/^\d [A-Z ]{6,}$/.test(l) ? `<h2>${esc(l)}</h2>` : l.startsWith("    - ") ? `<li class="sub">${esc(l.slice(6))}</li>` : l.startsWith("- ") ? `<li>${esc(l.slice(2))}</li>` : l ? `<p>${esc(l)}</p>` : ""))
    .join("");
  w.document.write(
    `<!doctype html><meta charset="utf-8"><title>${esc(`3-2-1 Prep: ${title} at ${company}`)}</title><style>body{font:14px/1.45 -apple-system,system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px;color:#111}h2{font-size:11px;letter-spacing:.08em;color:#666;margin:18px 0 4px}p:first-child{font-size:20px;font-weight:700;margin:0}li{margin:3px 0 3px 18px}li.sub{margin-left:36px;color:#333}</style>${body}<p style="margin-top:24px;color:#888;font-size:11px">Braun Board · braunboard.com</p><script>setTimeout(()=>print(),300)</script>`,
  );
  w.document.close();
}

function ThreeTwoOne({ data, company, title }: { data: PrepSheet; company: string; title: string }) {
  const n = "font-serif text-2xl leading-none text-ink";
  const head = "flex items-baseline gap-2 text-sm text-ink-2";
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-2">
          {company} · {STAGE_LABELS[data.stage].toLowerCase()}
        </p>
        <span className="flex items-center gap-3">
          <CopyButton text={sheetText(data, company, title)} label="Copy" className="text-sm text-ink-3 underline underline-offset-2 hover:text-ink" />
          <button type="button" onClick={() => printSheet(data, company, title)} className="text-sm text-ink-3 underline underline-offset-2 hover:text-ink">
            Print / PDF
          </button>
        </span>
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
      <div className="mt-1 space-y-3 text-[15px]">
        {data.stories.map((st) => (
          <div key={st.title}>
            <p className="font-semibold">
              {st.title} <span className="text-sm font-normal text-ink-3">· {st.when}</span>
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
              {st.beats.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className={`${head} mt-4`}>
        <span className={n}>1</span> question to ask
      </p>
      <p className="mt-1 font-serif text-[16px] leading-snug">&ldquo;{data.one.text}&rdquo;</p>
      <p className="mt-0.5 text-xs text-ink-3">{data.one.why}</p>
    </div>
  );
}

function PrepTool({ slug, resume, company, title }: { slug: string; resume: Resume | null; company: string; title: string }) {
  const [data, setData] = useState<PrepSheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<keyof typeof STAGE_LABELS>("hiring_manager");
  const [stories, setStories] = useState("");
  const ready = !!resume || stories.trim().length >= 40;

  async function build() {
    setBusy(true);
    setError("");
    try {
      const r = await prepForJob(slug, { resume: resume?.text ?? "", stage, bio: "", stories });
      if (r.ok) setData(r.data);
      else setError(r.error);
    } catch {
      setError("Something went wrong. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
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
          Add your own deal stories (optional)
        </summary>
        <textarea
          rows={4}
          className={`${field} mt-2`}
          value={stories}
          onChange={(e) => setStories(e.target.value)}
          placeholder="A win and a loss, a few lines each: who it was, what you did, how it ended. Skip it and I'll pull from your résumé."
        />
      </details>
      <button type="button" className={btn} disabled={busy || !ready} onClick={build}>
        {busy ? "Building your 3-2-1… (about 20 seconds)" : data ? "Build it again" : "Build my 3-2-1"}
      </button>
      {!ready && <p className="text-xs text-ink-3">Add your résumé or write a story or two to start.</p>}
      {error && <p className="text-sm text-red">{error}</p>}
      {data && <ThreeTwoOne data={data} company={company} title={title} />}
    </div>
  );
}
