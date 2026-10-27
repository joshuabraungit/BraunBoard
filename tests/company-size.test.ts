import { describe, expect, it } from "vitest";
import { bucketFor, cleanSize } from "../src/lib/ingest/size";

const posting = "About us: We're a team of over 1,200 employees across 9 offices. We serve 50,000 customers.";

describe("company size", () => {
  it("buckets headcounts", () => {
    expect(bucketFor(45)).toBe("startup");
    expect(bucketFor(200)).toBe("growth");
    expect(bucketFor(999)).toBe("growth");
    expect(bucketFor(1000)).toBe("large");
    expect(bucketFor(12000)).toBe("enterprise");
  });
  it("trusts the posting when the quote is real", () => {
    expect(cleanSize({ headcount_quote: "We're a team of over 1,200 employees across 9 offices.", headcount: 1200 }, posting)).toEqual({ bucket: "large", source: "posting", quote: "We're a team of over 1,200 employees across 9 offices." });
  });
  it("drops a made-up quote and falls back to a confident estimate", () => {
    expect(cleanSize({ headcount_quote: "We have 300 employees.", headcount: 300, estimate: 1500, confident: true }, posting)).toEqual({ bucket: "large", source: "estimate", quote: null });
  });
  it("leaves it blank when the AI isn't sure", () => {
    expect(cleanSize({ headcount_quote: null, estimate: 80, confident: false }, posting)).toEqual({ bucket: null, source: null, quote: null });
    expect(cleanSize(null, posting).bucket).toBeNull();
  });
});

describe("company size in alerts and For You", () => {
  it("only keeps the sizes someone picked, but never drops a company we couldn't size", async () => {
    const { fitsSize } = await import("../src/lib/match");
    expect(fitsSize({ company_size: "startup" }, { company_sizes: ["startup", "growth"] })).toBe(true);
    expect(fitsSize({ company_size: "enterprise" }, { company_sizes: ["startup", "growth"] })).toBe(false);
    expect(fitsSize({ company_size: null }, { company_sizes: ["startup"] })).toBe(true);
    expect(fitsSize({ company_size: "enterprise" }, { company_sizes: [] })).toBe(true);
    expect(fitsSize({ company_size: "enterprise" }, {})).toBe(true);
  });
  it("onboarding answers carry the sizes into the watch", async () => {
    const { answersToPrefs, defaultWatchName, OnboardingAnswers } = await import("../src/lib/watch-prefs");
    const a = OnboardingAnswers.parse({ roles: ["ae"], min_base: null, min_ote: null, work: "remote", motion: "either", sizes: ["startup", "growth"] });
    expect(answersToPrefs(a).company_sizes).toEqual(["startup", "growth"]);
    expect(defaultWatchName(a)).toContain("Startup / Growth");
    const old = OnboardingAnswers.parse({ roles: ["ae"], min_base: null, min_ote: null, work: "any", motion: "either" });
    expect(answersToPrefs(old).company_sizes).toEqual([]);
  });
  it("old watches without sizes still load", async () => {
    const { rowToPrefs } = await import("../src/lib/watch-prefs");
    expect(rowToPrefs({ role_families: ["Account Executive"] }).company_sizes).toEqual([]);
    expect(rowToPrefs({ company_sizes: ["large", "bogus"] }).company_sizes).toEqual(["large"]);
  });
});
