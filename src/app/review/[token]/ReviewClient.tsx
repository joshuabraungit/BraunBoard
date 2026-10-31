"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import type { ReviewStatus, Verdict } from "@/lib/sponsor-review";
import { sendReview } from "./actions";
import { ExplainerVideo } from "@/components/ExplainerVideo";

type Key = "video" | "ad";
interface Asset {
  status: ReviewStatus;
  note: string | null;
}
interface Draft {
  verdict: Verdict | null;
  note: string;
  saved: boolean;
}

const fresh = (): Draft => ({ verdict: null, note: "", saved: false });
const needsLook = (s: ReviewStatus) => s === "waiting" || s === "changed";

function ThumbUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}
function ThumbDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}
function Check({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ReviewClient({
  token,
  firstName,
  video,
  ad,
  adCard,
  adBody,
}: {
  token: string;
  firstName: string;
  video: ({ src: string; path: string } & Asset) | null;
  ad: { hash: string } & Asset;
  adCard: ReactNode;
  adBody: ReactNode;
}) {
  const keys: Key[] = video ? ["video", "ad"] : ["ad"];
  const asset = (k: Key): Asset => (k === "video" ? video! : ad);
  const version = (k: Key) => (k === "video" ? video!.path : ad.hash);
  const storeKey = `bb-review:${token}`;

  const [open, setOpen] = useState<Record<Key, boolean>>({ video: !!video && needsLook(video.status), ad: needsLook(ad.status) });
  const [drafts, setDrafts] = useState<Record<Key, Draft>>({ video: fresh(), ad: fresh() });
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<{ msg: string; stale?: boolean } | null>(null);
  const [pending, start] = useTransition();

  // Pick up where they left off if they closed the tab. Drafts are tied to the version they were about.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) ?? "null") as Record<Key, Draft & { v: string; open: boolean }> | null;
      if (!saved) return;
      for (const k of keys) {
        const d = saved[k];
        if (d && d.v === version(k) && d.open) {
          setDrafts((x) => ({ ...x, [k]: { verdict: d.verdict, note: d.note, saved: d.saved } }));
          setOpen((x) => ({ ...x, [k]: true }));
        }
      }
    } catch {
      // Private window or blocked storage: start fresh.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(Object.fromEntries(keys.map((k) => [k, { ...drafts[k], v: version(k), open: open[k] }]))));
    } catch {
      // Not saved for later. Fine.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, open]);

  const decided = (k: Key) => drafts[k].verdict === "up" || (drafts[k].verdict === "down" && drafts[k].saved);
  const settled = (k: Key) => (open[k] ? decided(k) : true);
  const toSend = keys.filter((k) => open[k] && decided(k));
  const doneCount = keys.filter((k) => (open[k] ? decided(k) : asset(k).status === "up" || asset(k).status === "down")).length;
  const ready = keys.every(settled) && toSend.length > 0;
  const nothingToDo = keys.every((k) => !open[k]);

  const set = (k: Key, d: Partial<Draft>) => setDrafts((x) => ({ ...x, [k]: { ...x[k], ...d } }));
  const reopen = (k: Key) => {
    setOpen((x) => ({ ...x, [k]: true }));
    set(k, fresh());
  };

  function send() {
    setErr(null);
    const payload: Record<string, unknown> = {};
    for (const k of toSend) payload[k] = { verdict: drafts[k].verdict, note: drafts[k].note, ...(k === "video" ? { path: video!.path } : { hash: ad.hash }) };
    start(async () => {
      const r = await sendReview(token, payload);
      if (r.ok) {
        setSent(r.line);
        try {
          localStorage.removeItem(storeKey);
        } catch {}
      } else setErr({ msg: r.error, stale: r.stale });
    });
  }

  if (sent) {
    return (
      <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Thanks, {firstName}!</h1>
        <p className="max-w-md text-[16px] leading-relaxed text-ink-2">
          {sent}. I&apos;ll take a look and get back to you. Nothing goes live until you&apos;ve approved it and I hit the button.
        </p>
        <p className="mt-1 text-[15px]">Josh</p>
      </div>
    );
  }

  const pct = Math.round((doneCount / keys.length) * 100);

  const cards: { k: Key; n: number; title: string; blurb: string; body: ReactNode }[] = keys.map((k, i) =>
    k === "video"
      ? {
          k,
          n: i + 1,
          title: "The explainer video",
          blurb: "Shows sellers what they'd sell before they read a word.",
          body: (
            <ExplainerVideo src={video!.src} label="Play (60 sec)" />
          ),
        }
      : {
          k,
          n: i + 1,
          title: "The job ad",
          blurb: "First, the card sellers see on the home page. Then the full ad they land on.",
          body: (
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Home page card</p>
                {adCard}
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Full job ad · scroll to read</p>
                <div className="max-h-[32rem] overflow-y-auto rounded-xl border border-line bg-bg px-4 py-4 sm:px-5" tabIndex={0} aria-label="Full job ad">
                  {adBody}
                </div>
              </div>
            </div>
          ),
        },
  );

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-2xl border border-line bg-surface px-5 py-4 sm:px-7">
        <div className="flex justify-between text-sm text-ink-2">
          <span>
            {doneCount} of {keys.length} reviewed
          </span>
          <span>{nothingToDo ? "You're all caught up" : "Saves as you go"}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Review progress">
          <div className="h-2 rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {cards.map(({ k, n, title, blurb, body }) => {
        const a = asset(k);
        const d = drafts[k];
        if (!open[k] || decided(k)) {
          const up = open[k] ? d.verdict === "up" : a.status === "up";
          const line = open[k]
            ? up
              ? "Approved"
              : `Changes requested${d.note.trim() ? `: "${d.note.trim()}"` : ""}`
            : up
              ? "You approved this"
              : `You asked for changes${a.note ? `: "${a.note}"` : ""}. Josh is on it.`;
          return (
            <div key={k} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${up ? "bg-accent-soft text-accent" : "bg-amber-soft text-amber"}`}>
                {up ? <Check /> : <ThumbDown />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{title}</p>
                <p className={`text-sm ${up ? "text-accent" : "text-amber"}`}>{line}</p>
              </div>
              <button type="button" onClick={() => reopen(k)} className="min-h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-sm font-semibold hover:bg-bg">
                Change
              </button>
            </div>
          );
        }
        return (
          <section key={k} className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-7" aria-labelledby={`h-${k}`}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                  {n} of {keys.length}
                </span>
                {a.status === "changed" && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">Updated since your last look</span>}
              </div>
              <h2 id={`h-${k}`} className="mt-1 text-xl font-bold tracking-tight">
                {title}
              </h2>
              <p className="mt-0.5 text-sm text-ink-2">{blurb}</p>
            </div>
            {body}
            {d.verdict === null && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => set(k, { verdict: "up", saved: false })}
                  className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-accent bg-surface font-semibold text-accent hover:bg-accent-soft"
                >
                  <ThumbUp />
                  Looks good
                </button>
                <button
                  type="button"
                  onClick={() => set(k, { verdict: "down", saved: false })}
                  className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-amber bg-surface font-semibold text-amber hover:bg-amber-soft"
                >
                  <ThumbDown />
                  Needs changes
                </button>
              </div>
            )}
            {d.verdict === "down" && !d.saved && (
              <div className="space-y-2.5 rounded-xl bg-amber-soft p-4">
                <label htmlFor={`note-${k}`} className="block font-semibold">
                  What should I change?
                </label>
                <textarea
                  id={`note-${k}`}
                  rows={3}
                  maxLength={2000}
                  autoFocus
                  value={d.note}
                  onChange={(e) => set(k, { note: e.target.value })}
                  placeholder={k === "video" ? "e.g. Can we end on our real logo?" : "e.g. Our buyers are mostly counties, not cities."}
                  className="w-full resize-y rounded-lg border border-amber/30 bg-surface px-3 py-2.5 text-[15px] leading-relaxed"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => set(k, fresh())} className="min-h-11 rounded-lg px-4 text-sm font-medium text-ink-2 hover:text-ink">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!d.note.trim()}
                    onClick={() => set(k, { saved: true })}
                    className="min-h-11 rounded-lg bg-amber px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Save note
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {err && (
        <div className="rounded-xl bg-red-soft px-4 py-3 text-sm text-red" role="alert">
          {err.msg}{" "}
          {err.stale && (
            <button type="button" onClick={() => location.reload()} className="font-semibold underline">
              Reload
            </button>
          )}
        </div>
      )}

      {ready ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-ink px-5 py-5 text-white sm:px-7">
          <p className="text-lg font-semibold">All set? Send it over and I&apos;ll take it from here.</p>
          <button
            type="button"
            onClick={send}
            disabled={pending}
            className="min-h-[52px] rounded-xl bg-surface font-semibold text-ink hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send to Josh"}
          </button>
        </div>
      ) : (
        !nothingToDo && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled
              aria-describedby="send-hint"
              className="min-h-[52px] cursor-not-allowed rounded-xl bg-line font-semibold text-ink-3"
            >
              Send to Josh
            </button>
            <p id="send-hint" className="text-center text-sm text-ink-2">
              {keys.length === 2 ? "Review both pieces first" : "Review it first"} ({doneCount} of {keys.length} done)
            </p>
          </div>
        )
      )}

      <p className="text-center text-sm text-ink-3">Nothing goes live until you approve it and I hit publish.</p>
    </div>
  );
}
