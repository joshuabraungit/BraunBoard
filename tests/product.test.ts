import { describe, expect, it } from "vitest";
import { cleanProduct, joinPostings, problemsWith } from "../src/lib/ingest/product";

const POSTING = "Toast creates technology to help restaurants and local businesses succeed in a digital world, helping business owners operate, increase sales, engage customers, and keep employees happy.";

const STORY =
  "When a restaurant owner has to take orders, pay staff, and keep customers coming back, they usually juggle a pile of separate tools. The problem is, nothing talks to each other. Toast puts it in one system on a tablet and phone, and owners spend less time on busywork.";

describe("cleanProduct", () => {
  it("keeps a plain story backed by a real quote", () => {
    const r = cleanProduct({ story: STORY, short: "One system to run a restaurant.", quote: POSTING.slice(0, 80), category: "Industry-specific software" }, POSTING);
    expect(r.story).toMatch(/Toast puts it/);
    expect(r.short).toBe("One system to run a restaurant");
    expect(r.category).toBe("Industry-specific software");
  });
  it("drops stories with a made-up quote, buzzwords, or a category off the list", () => {
    expect(cleanProduct({ story: "Simple story.", quote: "We are the best restaurant company ever made", category: "Security" }, POSTING).story).toBeNull();
    expect(cleanProduct({ story: "Toast is a seamless platform.", quote: POSTING.slice(0, 80), category: "Security" }, POSTING).story).toBeNull();
    expect(cleanProduct({ story: STORY, quote: POSTING.slice(0, 80), category: "Restaurants" as never }, POSTING).category).toBeNull();
  });
  it("swaps em dashes for commas", () => {
    const dashed = STORY.replace("phone, and", "phone — and");
    expect(cleanProduct({ story: dashed, quote: POSTING.slice(0, 80), category: null }, POSTING).story).toContain("phone, and");
  });
  it("asks for the When / The problem is / so template", () => {
    const p = problemsWith({ story: "Running a restaurant is a juggle. Toast puts it in one system.", quote: POSTING.slice(0, 80), category: null }, POSTING);
    expect(p.join(" ")).toMatch(/3-sentence template/);
    expect(problemsWith({ story: STORY, quote: POSTING.slice(0, 80), category: null }, POSTING)).toEqual([]);
  });

  it("names the problems so the AI can fix them", () => {
    const p = problemsWith({ story: "A seamless platform for teams.", quote: "not in the posting at all, really", category: "Security" }, POSTING);
    expect(p.join(" ")).toMatch(/seamless, platform/);
    expect(p.join(" ")).toMatch(/quote isn't copied exactly/);
  });
  it("reads the three longest distinct postings", () => {
    const j = joinPostings(["a", "bbb", "bbb", "cc", "dddd"]);
    expect(j).toContain("dddd");
    expect(j).toContain("bbb");
    expect(j).toContain("cc");
    expect(j).not.toContain("Posting 4");
  });
});

describe("insider tech words", () => {
  it("flags the words a friend outside tech wouldn't know", async () => {
    const { jargonIn } = await import("../src/lib/ingest/product");
    expect(jargonIn("Tools to tune and run AI models for companies")).toContain("models");
    expect(jargonIn("AI security agents that find and fix code risks")).toContain("ai security agents");
    expect(jargonIn("AI agents that answer customer questions")).toContain("ai agents");
    expect(jargonIn("Software that automates security compliance")).toContain("compliance");
    expect(jargonIn("Helps insurance agents send quotes faster")).toEqual([]);
    expect(jargonIn("Helps restaurants take orders and payments in one place")).toEqual([]);
  });
});

describe("which existing stories get rewritten", () => {
  it("rewrites vague or insider headlines and keeps plain ones", async () => {
    const { needsPlainRewrite } = await import("../src/lib/ingest/product");
    const story = "When a restaurant owner takes orders, they write tickets by hand. The problem is, it's slow. Toast does it in one place, so the rush moves faster.";
    expect(needsPlainRewrite("Software that helps companies plan customer conversations", story)).toBe(true);
    expect(needsPlainRewrite("Tools to tune and run AI models for companies", story)).toBe(true);
    expect(needsPlainRewrite("Helps restaurants take orders and payments in one place", story)).toBe(false);
    expect(needsPlainRewrite("Helps restaurants take orders", null)).toBe(false);
  });
});
