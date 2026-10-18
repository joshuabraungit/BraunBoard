import { describe, expect, it } from "vitest";
import { cleanProduct, joinPostings, problemsWith } from "../src/lib/ingest/product";

const POSTING = "Toast creates technology to help restaurants and local businesses succeed in a digital world, helping business owners operate, increase sales, engage customers, and keep employees happy.";

describe("cleanProduct", () => {
  it("keeps a plain story backed by a real quote", () => {
    const r = cleanProduct({ story: "Running a restaurant is a juggle. Toast puts it in one system.", short: "One system to run a restaurant.", quote: POSTING.slice(0, 80), category: "Industry-specific software" }, POSTING);
    expect(r.story).toMatch(/Toast puts it/);
    expect(r.short).toBe("One system to run a restaurant");
    expect(r.category).toBe("Industry-specific software");
  });
  it("drops stories with a made-up quote, buzzwords, or a category off the list", () => {
    expect(cleanProduct({ story: "Simple story.", quote: "We are the best restaurant company ever made", category: "Security" }, POSTING).story).toBeNull();
    expect(cleanProduct({ story: "Toast is a seamless platform.", quote: POSTING.slice(0, 80), category: "Security" }, POSTING).story).toBeNull();
    expect(cleanProduct({ story: "Plain words here.", quote: POSTING.slice(0, 80), category: "Restaurants" as never }, POSTING).category).toBeNull();
  });
  it("swaps em dashes for commas", () => {
    expect(cleanProduct({ story: "Owners juggle a lot — Toast helps.", quote: POSTING.slice(0, 80), category: null }, POSTING).story).toBe("Owners juggle a lot, Toast helps.");
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
