import { describe, expect, it } from "vitest";
import { payTypeUnclear } from "../src/lib/pay-unclear";
import { formatComp } from "../src/lib/format";
import { computeFlags } from "../src/lib/flags";

const se = { role_family: "Sales Engineer", ote_min: null, currency: "USD" };

describe("payTypeUnclear", () => {
  it("Sierra: a high number with no word on what it covers", () => {
    expect(payTypeUnclear({ ...se, title_raw: "Enterprise Sales Engineer - Strategic, Retail", salary_max: 315000, description_raw: "Experience leading the sales process with deal sizes of $1M+." })).toBe(true);
    expect(payTypeUnclear({ ...se, title_raw: "Enterprise Sales Engineer", salary_max: 365000, currency: "CAD", description_raw: "" })).toBe(true);
  });
  it("trusts the posting when it names the number", () => {
    expect(payTypeUnclear({ ...se, salary_max: 266300, description_raw: "California Annual Salary Range\n\n$94,400 to $266,300 USD" })).toBe(false);
    expect(payTypeUnclear({ role_family: "Account Executive", ote_min: null, salary_max: 300000, description_raw: "Compensation - Base pay: $80,000 - $300,000" })).toBe(false);
    expect(payTypeUnclear({ role_family: "Account Executive", ote_min: null, salary_max: 286000, description_raw: "The salary range for this role is $234,000-286,000 plus annual bonus." })).toBe(false);
  });
  it("leaves believable base alone", () => {
    expect(payTypeUnclear({ ...se, salary_max: 210000, description_raw: "" })).toBe(false);
  });
  it("leaves partnerships roles, managers and leaders alone", () => {
    expect(payTypeUnclear({ role_family: "Account Executive", title_raw: "Partner Development Manager, AI", ote_min: null, salary_max: 274000, description_raw: "" })).toBe(false);
    expect(payTypeUnclear({ role_family: "SDR/BDR", title_raw: "Senior Manager, Enterprise Sales Development", ote_min: null, salary_max: 200000, description_raw: "" })).toBe(false);
    expect(payTypeUnclear({ role_family: "VP Sales", ote_min: null, salary_max: 400000, description_raw: "" })).toBe(false);
  });
  it("only applies when there's no separate OTE", () => {
    expect(payTypeUnclear({ ...se, salary_max: 315000, ote_min: 400000, description_raw: "" })).toBe(false);
  });
});

describe("showing it", () => {
  it("shows the number without calling it base", () => {
    expect(formatComp({ salary_min: 280000, salary_max: 290000, ote_min: null, ote_max: null, currency: "USD", flags: ["pay_type_unclear"] })).toBe("$280K–$290K (base or OTE not stated)");
    expect(formatComp({ salary_min: 150000, salary_max: 180000, ote_min: null, ote_max: null, currency: "USD", flags: [] })).toBe("$150K–$180K base");
  });
  it("is a heads-up, not held against the job", () => {
    const f = computeFlags({ title_raw: "Enterprise Sales Engineer", role_family: "Sales Engineer", currency: "USD", description_raw: "", salary_min: 280000, salary_max: 290000, ote_min: null, ote_max: null, self_sourcing_level: "Unknown", disclosures: null }).find((x) => x.code === "pay_type_unclear");
    expect(f?.scored).toBe(false);
  });
});
