import type { SponsoredJobRow } from "@/lib/sponsor";
import { isRunning } from "@/lib/sponsor-form";
import type { AssetReview, ReviewSummary } from "@/lib/sponsor-review";

export const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
export const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
export const firstName = (r: Pick<SponsoredJobRow, "contact_name">) => r.contact_name.trim().split(/\s+/)[0] || "The client";

export type Stage = "pending" | "approve" | "scheduled" | "running" | "ended" | "done" | "canceled";
export function stage(r: SponsoredJobRow, now = new Date()): Stage {
  if (r.status === "paid") return "approve";
  if (r.status === "live") return isRunning(r, now) ? "running" : r.live_at && new Date(r.live_at) > now ? "scheduled" : "ended";
  return r.status as Stage;
}

const NEUTRAL = "bg-bg text-ink-2 ring-1 ring-line";
export const STAGE_BADGE: Record<Stage, [string, string]> = {
  pending: ["Unfinished checkout", "bg-bg text-ink-3 ring-1 ring-line"],
  approve: ["Getting ready", "bg-amber-soft text-amber"],
  scheduled: ["Scheduled", NEUTRAL],
  running: ["Live now", "bg-accent-soft text-accent"],
  ended: ["Run ended", "bg-amber-soft text-amber"],
  done: ["Done", NEUTRAL],
  canceled: ["Canceled", "bg-red-soft text-red"],
};

export const REVIEW_BADGE: Record<AssetReview["status"], [string, string]> = {
  waiting: ["Waiting on client", NEUTRAL],
  changed: ["Edited, needs another look", NEUTRAL],
  up: ["Approved", "bg-accent-soft text-accent"],
  down: ["Changes requested", "bg-amber-soft text-amber"],
};

export function Badge({ text, cls }: { text: string; cls: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

export type NextStep = {
  text: string;
  tone: "act" | "wait" | "calm";
  action?: "copy-review" | "go-live" | "copy-results" | "mark-done";
};

/** The one thing to do next on this sponsor, in plain words. */
export function nextStep(r: SponsoredJobRow, rev: ReviewSummary, now = new Date()): NextStep {
  const who = firstName(r);
  const st = stage(r, now);
  if (st === "pending")
    return {
      text: "They started checkout and didn't pay. Nothing to do.",
      tone: "calm",
    };
  if (st === "canceled")
    return {
      text: r.stripe_refund_id ? "Canceled and refunded." : "Canceled.",
      tone: "calm",
    };
  if (st === "done") return { text: "All wrapped up.", tone: "calm" };
  if (st === "scheduled")
    return {
      text: `Approved. Goes live ${shortDay(r.live_at!)}.`,
      tone: "calm",
    };
  if (st === "running") {
    const left = r.ends_at ? Math.max(0, Math.ceil((new Date(r.ends_at).getTime() - now.getTime()) / 86_400_000)) : null;
    return {
      text: `Live${left != null ? `, ${left} day${left === 1 ? "" : "s"} left` : ""}. Share the results page any time.`,
      tone: "calm",
      action: "copy-results",
    };
  }
  if (st === "ended")
    return {
      text: "The 30 days are up. Send the wrap-up, then mark it done.",
      tone: "act",
      action: "mark-done",
    };
  // Getting ready: everything hangs on the job ad.
  if (rev.ad.status === "up")
    return {
      text: "Job ad approved. Ready to go live.",
      tone: "act",
      action: "go-live",
    };
  if (rev.ad.status === "down")
    return {
      text: `${who} asked for changes on the job ad. Edit it below, then send the link again.`,
      tone: "act",
      action: "copy-review",
    };
  if (rev.ad.status === "changed")
    return {
      text: `You edited the job ad. Send ${who} the link for another look.`,
      tone: "act",
      action: "copy-review",
    };
  if (r.review_opened_at)
    return {
      text: `${who} opened the review link on ${shortDay(r.review_opened_at)} and hasn't sent thumbs yet.`,
      tone: "wait",
      action: "copy-review",
    };
  return {
    text: `Send ${who} the review link so they can approve the job ad.`,
    tone: "act",
    action: "copy-review",
  };
}
