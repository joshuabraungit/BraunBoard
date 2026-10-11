import { describe, expect, it } from "vitest";
import { findPayInText, resolveCompensation } from "../src/lib/ingest/compensation";

const none = { min: null, max: null, currency: null };

describe("trust rule: never invent compensation", () => {
  it("returns nulls when nothing is published", () => {
    const c = resolveCompensation(none, "Join our team selling to enterprise customers. Uncapped commission!");
    expect(c).toEqual({ salary_min: null, salary_max: null, ote_min: null, ote_max: null, currency: null });
  });

  it("ignores unlabeled ranges (could be base or OTE)", () => {
    const c = resolveCompensation(none, "Compensation: $150,000 - $300,000 depending on experience.");
    expect(c.salary_min).toBeNull();
    expect(c.ote_min).toBeNull();
  });

  it("ignores numbers that aren't money", () => {
    expect(findPayInText("Manage 150 - 200 accounts across 50 states")).toEqual([]);
  });
});

describe("labeled pay", () => {
  it("parses base and OTE written out", () => {
    const c = resolveCompensation(none, "The base salary range is $150,000 - $175,000. OTE is $300,000.");
    expect(c.salary_min).toBe(150000);
    expect(c.salary_max).toBe(175000);
    expect(c.ote_min).toBe(300000);
    expect(c.currency).toBe("USD");
  });

  it("parses K notation with OTE after the number", () => {
    const c = resolveCompensation(none, "Pay: $280K–$320K OTE with a 50/50 split.");
    expect(c.ote_min).toBe(280000);
    expect(c.ote_max).toBe(320000);
    expect(c.salary_min).toBeNull();
  });

  it("treats structured ATS ranges as base", () => {
    const c = resolveCompensation({ min: 140000, max: 160000, currency: "USD" }, "Great role.");
    expect(c.salary_min).toBe(140000);
    expect(c.ote_min).toBeNull();
  });

  it("re-labels a structured range as OTE when the posting says so", () => {
    const c = resolveCompensation(
      { min: 250000, max: 290000, currency: "USD" },
      "The on-target earnings for this role are $250,000 - $290,000.",
    );
    expect(c.ote_min).toBe(250000);
    expect(c.salary_min).toBeNull();
  });
});
