import { describe, expect, it } from "vitest";
import { fitsIndustry, jobIndustries } from "../src/lib/industries";
import { cleanPrefill } from "../src/lib/resume-read";
import { answersToPrefs, OnboardingAnswers, rowToPrefs } from "../src/lib/watch-prefs";

describe("jobIndustries", () => {
  it("uses the company's sector", () => {
    expect(jobIndustries({ company_sector: "Fintech" })).toContain("fintech");
    expect(jobIndustries({ company_sector: "Security" })).toEqual(["security"]);
  });
  it("uses who the job sells to", () => {
    expect(jobIndustries({ industry: "Banking and financial services" })).toContain("fintech");
    expect(jobIndustries({ industry: "Restaurants", buyer: "Restaurant owners" })).toEqual(["retail"]);
    expect(jobIndustries({ industry: "K-12 education" })).toEqual(["government"]);
    expect(jobIndustries({ industry: "Healthcare" })).toEqual(["healthcare"]);
  });
  it("doesn't read hospitality as a hospital", () => {
    expect(jobIndustries({ industry: "Hospitality" })).toEqual(["retail"]);
    expect(jobIndustries({ industry: "Hospitals and clinics" })).toEqual(["healthcare"]);
  });
  it("places a job in more than one industry when it fits", () => {
    expect(jobIndustries({ company_sector: "Vertical SaaS", industry: "Retail, government and healthcare" }).sort()).toEqual(["government", "healthcare", "retail"]);
  });
  it("knows nothing about a job with no sector or buyer", () => {
    expect(jobIndustries({})).toEqual([]);
  });
});

describe("fitsIndustry", () => {
  it("lets everything through with no pick", () => {
    expect(fitsIndustry({}, {})).toBe(true);
    expect(fitsIndustry({ company_sector: "Security" }, { industries: [] })).toBe(true);
  });
  it("keeps only the picked industries", () => {
    expect(fitsIndustry({ company_sector: "Fintech" }, { industries: ["fintech"] })).toBe(true);
    expect(fitsIndustry({ company_sector: "Security" }, { industries: ["fintech"] })).toBe(false);
  });
  it("drops jobs it can't place when a pick is set", () => {
    expect(fitsIndustry({}, { industries: ["fintech"] })).toBe(false);
  });
});

describe("résumé industries", () => {
  it("keeps valid industries, drops made-up ones", () => {
    const p = cleanPrefill({ industry_keys: ["fintech", "crypto", "fintech", "security"] });
    expect(p.answers.industries).toEqual(["fintech", "security"]);
  });
  it("flows through to a watch and back out of the database", () => {
    const a = OnboardingAnswers.parse({ roles: ["ae"], min_base: null, min_ote: null, work: "any", motion: "either", industries: ["fintech"] });
    const prefs = answersToPrefs(a);
    expect(prefs.industries).toEqual(["fintech"]);
    expect(rowToPrefs({ industries: ["fintech", "nope"] }).industries).toEqual(["fintech"]);
  });
});
