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
