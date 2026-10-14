import { describe, expect, it } from "vitest";
import { questionsFor, questionsAsText } from "../src/lib/questions";
import { computeFlags } from "../src/lib/flags";
import { checkedLabel } from "../src/lib/freshness";

const base = {
  salary_min: null as number | null,
  ote_min: null as number | null,
  self_sourcing_level: "Unknown",
  disclosures: {},
  flags: [] as ReturnType<typeof computeFlags>,
};

describe("questionsFor", () => {
  it("asks about the big gaps and always ends with why the role is open", () => {
    const qs = questionsFor(base);
    expect(qs.length).toBe(6);
    expect(qs[0]!.text).toMatch(/percentage of fully ramped reps hit quota/);
    expect(qs.some((q) => /base and the OTE/.test(q.text))).toBe(true);
    expect(qs.at(-1)!.text).toMatch(/Why is this role open/);
  });

  it("puts red flags first", () => {
    const flags = computeFlags({ ...base, salary_max: null, ote_max: null, description_raw: "Commissions are subject to clawback if the customer churns." });
    const qs = questionsFor({ ...base, flags });
    expect(qs[0]!.text).toMatch(/clawbacks/);
  });

  it("skips what the posting already says", () => {
    const qs = questionsFor({
      ...base,
      salary_min: 120_000,
      ote_min: 240_000,
      self_sourcing_level: "Low",
      disclosures: { quota_attainment: true, quota_size: true, territory: true, average_deal_size: true, sales_cycle: true },
      flags: computeFlags({ ...base, salary_min: 120_000, salary_max: 120_000, ote_min: 240_000, ote_max: 240_000, description_raw: "6 month ramp with a draw. 75% of our reps hit quota last year." }),
    });
    expect(qs.map((q) => q.text)).toEqual(["Why is this role open? Did someone leave, or is it new?"]);
  });

  it("asks only for the missing half of pay", () => {
    expect(questionsFor({ ...base, salary_min: 100_000 }).some((q) => /What's the OTE/.test(q.text))).toBe(true);
    expect(questionsFor({ ...base, ote_min: 200_000 }).some((q) => /What's the base/.test(q.text))).toBe(true);
  });

  it("formats a copyable list", () => {
    const txt = questionsAsText("Enterprise AE", "Acme", questionsFor(base, 2));
    expect(txt.split("\n")[0]).toBe("Questions for Acme, Enterprise AE");
    expect(txt).toContain("2. Why is this role open?");
  });
});

describe("checkedLabel", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  it("says still open for a recent check", () => {
    expect(checkedLabel("2026-10-13T10:00:00Z", now)).toEqual({ open: true, text: "Still open · checked 2h ago" });
    expect(checkedLabel("2026-10-13T11:45:00Z", now).text).toBe("Still open · checked 15 min ago");
  });
  it("is honest when our last check is old", () => {
    expect(checkedLabel("2026-10-10T12:00:00Z", now)).toEqual({ open: false, text: "Last confirmed open 3 days ago" });
  });
});

import { braunRead } from "../src/lib/flags";

describe("verdict and red flags", () => {
  const strong = {
    salary_min: 120_000, salary_max: 130_000, ote_min: 240_000, ote_max: 250_000,
    self_sourcing_level: "Medium",
    disclosures: { quota_size: true, quota_attainment: true },
    first_seen_at: new Date().toISOString(),
  };
  it("never says Worth a look with a real red flag", () => {
    const r = braunRead({ ...strong, description_raw: "Commissions are subject to clawback." });
    expect(r.verdict).toBe("Ask hard questions");
  });
  it("heads-ups don't drag down a good posting", () => {
    const r = braunRead({ ...strong, ote_max: 600_000, description_raw: "Great team." });
    expect(r.flags.some((f) => f.code === "wide_pay_range")).toBe(true);
    expect(["Strong posting", "Worth a look"]).toContain(r.verdict);
  });
});

describe("coaching", () => {
  it("pairs the attainment question with who coaches, for people carrying a number", () => {
    const qs = questionsFor({ ...base, role_family: "Account Executive" });
    expect(qs[0]!.text).toMatch(/percentage of fully ramped reps hit quota/);
    expect(qs[1]!.text).toBe("Who sits with reps and reviews calls each week?");
    expect(questionsFor({ ...base, role_family: "Sales Director" }).some((q) => /reviews calls/.test(q.text))).toBe(false);
  });
  it("flags real coaching for reps, not for managers whose job is coaching", () => {
    const t = "You'll get structured weekly coaching and call reviews.";
    const j = { ...base, salary_max: null, ote_max: null, description_raw: t };
    expect(computeFlags({ ...j, role_family: "SDR/BDR" }).some((f) => f.code === "coaching")).toBe(true);
    expect(computeFlags({ ...j, role_family: "Sales Manager" }).some((f) => f.code === "coaching")).toBe(false);
    expect(computeFlags({ ...j, role_family: "Account Executive", description_raw: "Participate in ongoing sales enablement and coaching." }).some((f) => f.code === "coaching")).toBe(false);
  });
  it("skips the coaching question when the posting already commits to it", () => {
    const flags = computeFlags({ ...base, salary_max: null, ote_max: null, role_family: "Account Executive", description_raw: "Dedicated coaching from day one." });
    expect(questionsFor({ ...base, role_family: "Account Executive", flags }).some((q) => /reviews calls/.test(q.text))).toBe(false);
  });
});

describe("coaching for managers", () => {
  it("doesn't flag or ask a BDR manager about being coached", () => {
    const t = "Provide weekly coaching and call reviews for your team.";
    const j = { ...base, salary_max: null, ote_max: null, description_raw: t, role_family: "SDR/BDR", seniority: "Manager" };
    expect(computeFlags(j).some((f) => f.code === "coaching")).toBe(false);
    expect(questionsFor({ ...base, role_family: "SDR/BDR", seniority: "Manager" }).some((q) => /reviews calls/.test(q.text))).toBe(false);
  });
});

import { classifyTitle } from "../src/lib/ingest/classify";
describe("BDR managers", () => {
  it("classes 'Manager, BDR' as a sales manager", () => {
    expect(classifyTitle("Manager, BDR - SAARC")?.role_family).toBe("Sales Manager");
    expect(classifyTitle("Manager, SDRs")?.role_family).toBe("Sales Manager");
  });
});

describe("economic buyer question", () => {
  it("asks only once we've read the posting and found no buyer", () => {
    const has = (x: object) => questionsFor({ ...base, ...x }, 10).some((q) => /economic buyer/.test(q.text));
    expect(has({ buyer: null, buyer_checked_at: "2026-10-13T00:00:00Z" })).toBe(true);
    expect(has({ buyer: "CFOs", buyer_checked_at: "2026-10-13T00:00:00Z" })).toBe(false);
    expect(has({ buyer: null, buyer_checked_at: null })).toBe(false);
  });
});

describe("why it matters", () => {
  it("every question explains itself in one short line", () => {
    const all = questionsFor({ ...base, role_family: "Account Executive", buyer: null, buyer_checked_at: "2026-10-14T00:00:00Z" }, 50);
    for (const q of all) {
      expect(q.why.split(/\s+/).length).toBeLessThanOrEqual(16);
      expect(q.why).not.toMatch(/Not in the posting|Always ask/);
      expect(q.why).not.toMatch(/—/);
    }
  });
});
