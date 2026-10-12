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

describe("ATS OTE labels + plausibility (seen in real data)", () => {
  it("Ashby/Greenhouse ranges labeled OTE become OTE", () => {
    const c = resolveCompensation({ min: 310000, max: 407000, currency: "USD", isOte: true }, "");
    expect(c.ote_min).toBe(310000);
    expect(c.salary_min).toBeNull();
  });
  it("drops nonsense ranges like $14K-$214K", () => {
    const c = resolveCompensation({ min: 14000, max: 214000, currency: "USD" }, "");
    expect(c.salary_min).toBeNull();
    expect(c.ote_min).toBeNull();
  });
});

describe("OTE described as 'base + commission' (Verkada wording)", () => {
  const text =
    "Below is the annual on-target earnings (OTE) range for full-time employees for this position, comprised of base compensation and commissions (if applicable). Estimated Annual Pay Range $280,000-$320,000 USD";
  it("labels it OTE, never base", () => {
    const c = resolveCompensation({ min: 280000, max: 320000, currency: "USD" }, text);
    expect(c.ote_min).toBe(280000);
    expect(c.salary_min).toBeNull();
  });
  it("never shows the same range as both base and OTE", () => {
    const c = resolveCompensation({ min: 150000, max: 200000, currency: "USD" }, "Base salary: $150,000 - $200,000. OTE: $150,000 - $200,000.");
    expect(c.salary_min).toBeNull();
    expect(c.ote_min).toBe(150000);
  });
});

describe("crossed labels", () => {
  it("swaps base and OTE when OTE comes out lower than base", () => {
    const r = resolveCompensation(
      { min: 260000, max: 320000, currency: "USD" },
      "Salary Range: $260K-320k potential total on target earnings ($130K-$160k base + $130K-$160k commission), per year",
    );
    expect([r.salary_min, r.salary_max, r.ote_min, r.ote_max]).toEqual([130000, 160000, 260000, 320000]);
  });
});

describe("OTE phrasings seen in the wild", () => {
  const label = (t: string) => findPayInText(t)[0]?.label;
  it("reads total target cash after the range", () => {
    expect(label("Salary range: $74,000 - $112,000 total target cash (inclusive of bonus or commission)")).toBe("ote");
    expect(label("Salary Range: $240K-$300K potential total on target earnings (base + commission), per year")).toBe("ote");
  });
  it("reads OTE labels that also mention base or salary", () => {
    expect(label("The OTE salary range for candidates within the Greater Chicago Area is $208,170-$248,650")).toBe("ote");
    expect(label("the estimated range for total on target earnings (including base salary and on target incentive pay) for this role is $306,000 - $390,000 per year")).toBe("ote");
    expect(label("The OTE (base + variable) salary range for this position is $275,000 - $350,000 per year.")).toBe("ote");
  });
  it("reads a total-targeted-cash note far above per-zone ranges", () => {
    const t = "The estimated Total Targeted Cash compensation range for this role is listed below. Total Targeted Cash for this role includes base salary, commission, and bonus (if eligible). This role qualifies for uncapped commissions. The starting salary will be determined based on skills, experience, and geographic location. In addition to cash compensation, our total rewards components include benefits and equity (if eligible). You can learn more about how we align pay with local labor markets in our Geographic Pay Zone Philosophy.\n\nZone A\n$148,000-$237,000 USD";
    expect(label(t)).toBe("ote");
  });
  it("still reads plain base ranges as base", () => {
    expect(label("The salary range for this position is $120,000- $155,000 per year, and is eligible for on-target-earnings (OTE).")).toBe("base");
    expect(label("Base salary: $83,000-105,000; uncapped accelerators")).toBe("base");
  });
});
