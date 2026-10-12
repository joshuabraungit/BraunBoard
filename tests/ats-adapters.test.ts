import { describe, expect, it } from "vitest";
import { findUsFacet, parsePostedOn, parseWorkdayId, workdayIdFromUrl, workdayJobId } from "../src/lib/ingest/adapters/workday";
import { detectFromUrl, smartRecruitersCandidates } from "../src/lib/ingest/detect-ats";

describe("Workday URLs", () => {
  it("reads host and site from a careers URL, with or without a locale", () => {
    expect(workdayIdFromUrl("https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site/job/x")).toBe("salesforce.wd12.myworkdayjobs.com/External_Career_Site");
    expect(workdayIdFromUrl("https://adobe.wd5.myworkdayjobs.com/external_experienced")).toBe("adobe.wd5.myworkdayjobs.com/external_experienced");
    expect(workdayIdFromUrl("https://example.com/careers")).toBeNull();
    expect(detectFromUrl("https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite")).toEqual({ provider: "workday", identifier: "nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite" });
  });
  it("parses an identifier into host, tenant and site", () => {
    expect(parseWorkdayId("ffive.wd5.myworkdayjobs.com/f5jobs")).toEqual({ host: "ffive.wd5.myworkdayjobs.com", tenant: "ffive", site: "f5jobs" });
    expect(parseWorkdayId("nope")).toBeNull();
  });
  it("finds the US country facet even when nested", () => {
    const facets = [
      { facetParameter: "jobFamilyGroup", values: [{ descriptor: "Sales", id: "s1" }] },
      { facetParameter: "locationMainGroup", values: [{ facetParameter: "locationCountry", values: [{ descriptor: "Canada", id: "ca" }, { descriptor: "United States of America", id: "us1" }] }] },
    ];
    expect(findUsFacet(facets)).toEqual({ param: "locationCountry", id: "us1" });
    expect(findUsFacet([{ facetParameter: "locations", values: [{ descriptor: "United States of America", id: "x" }] }])).toBeNull();
  });
  it("reads relative posted dates but not vague ones", () => {
    const now = Date.UTC(2026, 9, 12);
    expect(parsePostedOn("Posted Today", now)).toBe("2026-10-12T00:00:00.000Z");
    expect(parsePostedOn("Posted 3 Days Ago", now)).toBe("2026-10-09T00:00:00.000Z");
    expect(parsePostedOn("Posted 30+ Days Ago", now)).toBeNull();
  });
  it("uses the requisition id when there is one", () => {
    expect(workdayJobId({ title: "AE", externalPath: "/job/NY/AE_JR123", bulletFields: ["JR123"] })).toBe("JR123");
    expect(workdayJobId({ title: "AE", externalPath: "/job/NY/AE_JR123" })).toBe("AE_JR123");
  });
});

describe("SmartRecruiters", () => {
  it("detects pinned URLs and guesses ids", () => {
    expect(detectFromUrl("https://jobs.smartrecruiters.com/Visa")).toEqual({ provider: "smartrecruiters", identifier: "Visa" });
    expect(smartRecruitersCandidates("Western Digital")).toContain("WesternDigital");
  });
});
