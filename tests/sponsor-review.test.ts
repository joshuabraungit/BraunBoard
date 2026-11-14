import { describe, expect, it } from "vitest";
import { adPlainText, parseAdText, parseInline } from "../src/lib/ad-text";
import { adHash, adReview, postHash, postReview, post2Review, reviewSummary, verdictLine, videoApproved, videoReview, type ReviewFields } from "../src/lib/sponsor-review";

const base: ReviewFields = {
  job_title: "Director of Growth",
  description: "## What will you sell?\n\nEvery town has big decisions.",
  product_short: "Surveys that show what a whole community thinks",
  video_path: null,
  video_review: null,
  video_note: null,
  video_reviewed_path: null,
  ad_review: null,
  ad_note: null,
  ad_reviewed_hash: null,
};

describe("ad text", () => {
  it("reads headings, bullets, numbered items and paragraphs", () => {
    const blocks = parseAdText("## Hi\n\nOne line\nsecond line\n\n- a\n- b\n1. x\n2) y\n**Bold heading**");
    expect(blocks).toEqual([
      { type: "h", text: "Hi" },
      { type: "p", text: "One line\nsecond line" },
      { type: "ul", items: ["a", "b"] },
      { type: "ol", items: ["x", "y"] },
      { type: "h", text: "Bold heading" },
    ]);
  });
  it("keeps plain old descriptions as paragraphs", () => {
    expect(parseAdText("Sell to ops leaders.\n\nRemote.")).toEqual([
      { type: "p", text: "Sell to ops leaders." },
      { type: "p", text: "Remote." },
    ]);
  });
  it("bolds inline and leaves an unclosed ** alone", () => {
    expect(parseInline("**8:52:** Coffee.")).toEqual([
      { text: "8:52:", bold: true },
      { text: " Coffee.", bold: false },
    ]);
    expect(parseInline("5 ** stars")).toEqual([{ text: "5 ** stars", bold: false }]);
  });
  it("gives the card plain text with no headings or markers", () => {
    expect(adPlainText("## What will you sell?\n\nEvery town.\n\n- **Fast** surveys")).toBe("Every town. Fast surveys");
  });
});

describe("client review", () => {
  it("waits until the client weighs in", () => {
    expect(adReview(base).status).toBe("waiting");
    expect(videoReview(base)).toBeNull();
  });
  it("approval holds until the words change", () => {
    const approved = { ...base, ad_review: "up" as const, ad_reviewed_hash: adHash(base) };
    expect(adReview(approved).status).toBe("up");
    expect(reviewSummary(approved).allApproved).toBe(true);
    const edited = { ...approved, description: approved.description + " More." };
    expect(adReview(edited).status).toBe("changed");
    expect(reviewSummary(edited).waitingOnClient).toBe(true);
  });
  it("a new video file needs a new look, and only an approved one shows", () => {
    const v = { ...base, video_path: "x/1.mp4", video_review: "up" as const, video_reviewed_path: "x/1.mp4" };
    expect(videoApproved(v)).toBe(true);
    const swapped = { ...v, video_path: "x/2.mp4" };
    expect(videoReview(swapped)?.status).toBe("changed");
    expect(videoApproved(swapped)).toBe(false);
    expect(videoApproved({ ...v, video_review: "down" as const })).toBe(false);
  });
  it("keeps the change request and its note", () => {
    const r = { ...base, ad_review: "down" as const, ad_note: "Counties, not cities", ad_reviewed_hash: adHash(base) };
    expect(adReview(r)).toEqual({ status: "down", note: "Counties, not cities" });
    expect(reviewSummary(r).changesRequested).toBe(true);
  });
  it("says it plainly", () => {
    expect(verdictLine(["up", "up"])).toBe("Both approved");
    expect(verdictLine(["up", "down"])).toBe("1 approved, 1 needs changes");
    expect(verdictLine(["down", "down"])).toBe("2 need changes");
    expect(verdictLine(["up"])).toBe("Approved");
  });
});

describe("LinkedIn post review", () => {
  const post = "My favorite sales job had no playbook.\n\nhttps://braunboard.com/sponsored/x";
  it("is null until Josh writes one", () => {
    expect(postReview(base)).toBeNull();
    expect(reviewSummary(base).post).toBeNull();
  });
  it("waits, approves, and goes back up when the words change", () => {
    const w = { ...base, linkedin_post: post };
    expect(postReview(w)?.status).toBe("waiting");
    const up = { ...w, linkedin_review: "up" as const, linkedin_reviewed_hash: postHash(post) };
    expect(postReview(up)?.status).toBe("up");
    expect(postReview({ ...up, linkedin_post: post + " Edited." })?.status).toBe("changed");
  });
  it("counts toward all approved", () => {
    const ad = { ...base, ad_review: "up" as const, ad_reviewed_hash: adHash(base), linkedin_post: post };
    expect(reviewSummary(ad).allApproved).toBe(false);
    expect(reviewSummary({ ...ad, linkedin_review: "up", linkedin_reviewed_hash: postHash(post) }).allApproved).toBe(true);
    expect(verdictLine(["up", "up", "up"])).toBe("All approved");
  });
});

describe("Second LinkedIn post review", () => {
  const p2 = "This is a sponsored post.\n\nLink in comments.";
  const base2: ReviewFields = {
    job_title: "Director of Growth", description: "Ad", product_short: null,
    video_path: null, video_review: null, video_note: null, video_reviewed_path: null,
    ad_review: null, ad_note: null, ad_reviewed_hash: null,
  };
  it("waits, approves, and asks again after an edit", () => {
    expect(post2Review(base2)).toBeNull();
    const w = { ...base2, linkedin_post_2: p2 };
    expect(post2Review(w)?.status).toBe("waiting");
    const up = { ...w, linkedin_review_2: "up" as const, linkedin_reviewed_hash_2: postHash(p2) };
    expect(post2Review(up)?.status).toBe("up");
    expect(post2Review({ ...up, linkedin_post_2: p2 + " Edited." })?.status).toBe("changed");
  });
  it("holds up allApproved until it's approved", () => {
    const ad = { ...base2, ad_review: "up" as const, ad_reviewed_hash: adHash(base2), linkedin_post_2: p2 };
    expect(reviewSummary(ad).allApproved).toBe(false);
    expect(reviewSummary({ ...ad, linkedin_review_2: "up", linkedin_reviewed_hash_2: postHash(p2) }).allApproved).toBe(true);
  });
});
