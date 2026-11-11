import { describe, expect, it } from "vitest";
import { applyRate, parseCount, runLine, sourceRows } from "../src/lib/sponsor-results";

describe("sourceRows", () => {
  it("names sources plainly, merges LinkedIn app visits, and sorts by visits", () => {
    const rows = sourceRows({
      views_by_source: { Direct: 50, LinkedIn: 30, "com.linkedin.android": 10, Email: 10 },
      clicks_by_source: { LinkedIn: 4, Email: 2 },
      tracked_clicks: 6,
    });
    expect(rows.map((r) => r.label)).toEqual(["Braun Board home page and direct", "LinkedIn", "Newsletter and email"]);
    expect(rows[1]).toMatchObject({ views: 40, clicks: 4, pct: 40 });
  });

  it("folds tiny sources with no clicks into Other, last", () => {
    const rows = sourceRows({ views_by_source: { Direct: 98, Bing: 1, "x.com": 1 }, clicks_by_source: {}, tracked_clicks: 0 });
    expect(rows.at(-1)).toMatchObject({ label: "Other", views: 2 });
  });

  it("folds a tiny source into Other and keeps its apply clicks", () => {
    const rows = sourceRows({ views_by_source: { Direct: 99, Bing: 1 }, clicks_by_source: { Bing: 1 }, tracked_clicks: 1 });
    expect(rows.find((r) => r.label === "Bing")).toBeFalsy();
    expect(rows.at(-1)).toMatchObject({ label: "Other", views: 1, clicks: 1 });
  });

  it("handles nothing yet", () => {
    expect(sourceRows({ views_by_source: {}, clicks_by_source: {}, tracked_clicks: 0 })).toEqual([]);
  });
});

describe("applyRate", () => {
  it("rounds", () => {
    expect(applyRate(115, 16)).toBe("14%");
    expect(applyRate(1000, 7)).toBe("0.7%");
    expect(applyRate(0, 0)).toBeNull();
  });
});

describe("runLine", () => {
  const live = "2026-11-03T13:18:29Z";
  const end = "2026-12-03T13:18:29Z";
  it("counts days while running", () => {
    expect(runLine(live, end, new Date("2026-11-08T20:00:00Z"))).toBe("Day 6 of 30");
  });
  it("says when it finished", () => {
    expect(runLine(live, end, new Date("2026-12-10T00:00:00Z"))).toBe("Ran Nov 3 to Dec 3");
  });
});

describe("parseCount", () => {
  it("accepts blanks and whole numbers, rejects the rest", () => {
    expect(parseCount("")).toBeNull();
    expect(parseCount("1,200")).toBe(1200);
    expect(parseCount("12")).toBe(12);
    expect(parseCount("-3")).toBe("bad");
    expect(parseCount("a few")).toBe("bad");
    expect(parseCount("999999")).toBe("bad");
  });
});
