import { describe, expect, it } from "vitest";
import { allSalaryPages, dist, findSalaryPage, k, percentile, rowsFor, salaryStats, type PayRow } from "../src/lib/salaries";

const row = (p: Partial<PayRow>): PayRow => ({
  slug: "x",
  title_raw: "Enterprise AE",
  role_family: "Account Executive",
  sales_segment: "Enterprise",
  remote_type: "Remote",
  city: null,
  state: null,
  salary_min: null,
  salary_max: null,
  ote_min: null,
  ote_max: null,
  company_name: "Acme",
  company_slug: "acme",
  posted_at: "2026-10-01T00:00:00Z",
  ...p,
});

describe("percentile and dist", () => {
  it("interpolates", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([10], 0.25)).toBe(10);
  });
  it("won't publish a number from fewer than 5 postings", () => {
    expect(dist([1, 2, 3, 4])).toBeNull();
    expect(dist([1, 2, 3, 4, 5, null])?.median).toBe(3);
  });
});

describe("salaryStats", () => {
  const rows = [
    row({ salary_min: 140000, salary_max: 160000, ote_min: 280000, ote_max: 320000, company_slug: "a", company_name: "A" }),
    row({ salary_min: 150000, salary_max: 150000, ote_min: 300000, ote_max: 300000, company_slug: "b", company_name: "B" }),
    row({ ote_min: 250000, ote_max: 270000, remote_type: "Hybrid", company_slug: "c", company_name: "C" }),
    row({ salary_min: 120000, salary_max: 140000, ote_min: 240000, ote_max: 280000, remote_type: "Onsite" }),
    row({ salary_min: 160000, salary_max: 180000, ote_min: 340000, ote_max: 360000 }),
    row({ salary_min: 145000, salary_max: 155000, ote_min: 290000, ote_max: 310000 }),
    row({}), // no pay: counted in postings, not in stats
  ];
  const s = salaryStats(rows, rows.length);

  it("uses range midpoints", () => {
    expect(s.withPay).toBe(6);
    expect(s.ote?.median).toBe(300000);
    expect(s.base?.median).toBe(150000);
  });
  it("computes the typical base share of OTE", () => {
    expect(s.basePct).toBe(50);
    expect(s.splitN).toBe(5);
  });
  it("ranks companies by median OTE", () => {
    expect(s.topCompanies.map((c) => c.ote)).toEqual([300000, 300000, 300000, 260000]);
    expect(s.topCompanies.find((c) => c.slug === "acme")?.n).toBe(3);
  });
  it("builds a histogram that covers every in-range posting", () => {
    expect(s.histogram.reduce((a, b) => a + b.count, 0)).toBe(6);
  });
});

describe("pages", () => {
  it("has the headline page and filters by segment", () => {
    const p = findSalaryPage("enterprise-account-executive");
    expect(p?.plural).toBe("Enterprise AEs");
    expect(rowsFor([row({}), row({ sales_segment: "SMB" })], p!)).toHaveLength(1);
    expect(new Set(allSalaryPages().map((x) => x.slug)).size).toBe(allSalaryPages().length);
  });
  it("formats money", () => {
    expect(k(274_600)).toBe("$275K");
    expect(k(1_250_000)).toBe("$1.25M");
  });
});
