// The client review link: where a sponsor gives each piece (explainer video, job ad) a thumbs
// up or down. Pure logic here; the database and email side lives in sponsor.ts.
import { createHash } from "node:crypto";

export type Verdict = "up" | "down";
/** waiting: never reviewed. changed: reviewed, but Josh changed it since, so it needs another look. */
export type ReviewStatus = "waiting" | "up" | "down" | "changed";

export interface ReviewFields {
  job_title: string;
  description: string;
  product_short: string | null;
  video_path: string | null;
  video_review: Verdict | null;
  video_note: string | null;
  video_reviewed_path: string | null;
  ad_review: Verdict | null;
  ad_note: string | null;
  ad_reviewed_hash: string | null;
}

export interface AssetReview {
  status: ReviewStatus;
  note: string | null;
}

/** A fingerprint of the ad words the client approves: title, the ad itself, and the "What they sell" line. */
export function adHash(o: Pick<ReviewFields, "job_title" | "description" | "product_short">): string {
  return createHash("sha256")
    .update(JSON.stringify([o.job_title.trim(), o.description.trim(), (o.product_short ?? "").trim()]))
    .digest("hex")
    .slice(0, 32);
}

export function adReview(o: ReviewFields): AssetReview {
  if (!o.ad_review) return { status: "waiting", note: null };
  if (o.ad_reviewed_hash !== adHash(o)) return { status: "changed", note: o.ad_note };
  return { status: o.ad_review, note: o.ad_note };
}

/** Null when there's no video to review. */
export function videoReview(o: ReviewFields): AssetReview | null {
  if (!o.video_path) return null;
  if (!o.video_review) return { status: "waiting", note: null };
  if (o.video_reviewed_path !== o.video_path) return { status: "changed", note: o.video_note };
  return { status: o.video_review, note: o.video_note };
}

/** The video only shows on the public job page once the client has approved that exact file. */
export const videoApproved = (o: ReviewFields) => videoReview(o)?.status === "up";

export interface ReviewSummary {
  video: AssetReview | null;
  ad: AssetReview;
  /** Everything there is to review has a current thumbs up. */
  allApproved: boolean;
  /** Something is waiting on the client (never reviewed, or changed since). */
  waitingOnClient: boolean;
  /** The client asked for changes on something that hasn't been changed yet. */
  changesRequested: boolean;
}

export function reviewSummary(o: ReviewFields): ReviewSummary {
  const ad = adReview(o);
  const video = videoReview(o);
  const all = [ad, ...(video ? [video] : [])];
  return {
    ad,
    video,
    allApproved: all.every((a) => a.status === "up"),
    waitingOnClient: all.some((a) => a.status === "waiting" || a.status === "changed"),
    changesRequested: all.some((a) => a.status === "down"),
  };
}

/** "Both approved", "1 approved, 1 needs changes", "Approved" (one piece only). */
export function verdictLine(verdicts: Verdict[]): string {
  const ups = verdicts.filter((v) => v === "up").length;
  const downs = verdicts.length - ups;
  if (verdicts.length === 1) return ups ? "Approved" : "Needs changes";
  if (!downs) return verdicts.length === 2 ? "Both approved" : "All approved";
  if (!ups) return `${downs} need changes`;
  return `${ups} approved, ${downs} ${downs === 1 ? "needs" : "need"} changes`;
}

export const REVIEW_NOTE_MAX = 2000;
