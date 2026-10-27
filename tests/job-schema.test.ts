import { describe, expect, it } from "vitest";
import { employmentType, jobPostingSchema, jsonLd, postingHtml } from "../src/lib/job-schema";
import { SAMPLE_JOBS } from "../src/lib/sample-data";

const base = SAMPLE_JOBS[0]!;

describe("job schema for Google's job search", () => {
  it("maps careers-site employment types", () => {
    expect(employmentType("FullTime")).toBe("FULL_TIME");
    expect(employmentType("Regular - Full Time")).toBe("FULL_TIME");
    expect(employmentType("Contract")).toBe("CONTRACTOR");
    expect(employmentType("Temporary")).toBe("TEMPORARY");
    expect(employmentType("Mid-Senior Level")).toBeUndefined();
    expect(employmentType(null)).toBeUndefined();
  });

  it("turns posting text into safe paragraphs", () => {
    expect(postingHtml("About us\n\nWe sell <things> & more\nline two")).toBe("<p>About us</p><p>We sell &lt;things&gt; &amp; more<br>line two</p>");
  });

  it("remote jobs say where applicants can live", () => {
    const s = jobPostingSchema({ ...base, remote_type: "Remote", markets: ["US", "UK"] }, "https://x.com");
    expect(s.jobLocationType).toBe("TELECOMMUTE");
    expect(s.applicantLocationRequirements).toEqual([{ "@type": "Country", name: "United States" }, { "@type": "Country", name: "United Kingdom" }]);
    expect(s.jobLocation).toBeUndefined();
  });

  it("office jobs give the city, and UK becomes GB", () => {
    const s = jobPostingSchema({ ...base, remote_type: "Onsite", city: "London", state: null, markets: ["UK"] }, "https://x.com") as { jobLocation: { address: Record<string, string> } };
    expect(s.jobLocation.address).toEqual({ "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" });
  });

  it("only base pay goes in the salary field, never OTE", () => {
    const withBase = jobPostingSchema({ ...base, salary_min: 120000, salary_max: 140000, ote_min: 240000, ote_max: 280000, currency: "USD" }, "https://x.com");
    expect(withBase.baseSalary).toEqual({ "@type": "MonetaryAmount", currency: "USD", value: { "@type": "QuantitativeValue", minValue: 120000, maxValue: 140000, unitText: "YEAR" } });
    const oteOnly = jobPostingSchema({ ...base, salary_min: null, salary_max: null, ote_min: 240000, ote_max: 280000 }, "https://x.com");
    expect(oteOnly.baseSalary).toBeUndefined();
  });

  it("can't break out of the script tag", () => {
    expect(jsonLd({ d: "</script><script>x" })).not.toContain("</script>");
  });
});

describe("filling the fields Google asked for", () => {
  it("reads full-time from the posting when the careers site didn't say", async () => {
    const { employmentTypeFromText } = await import("../src/lib/job-schema");
    expect(employmentTypeFromText("This is a full-time, remote role.")).toBe("FULL_TIME");
    expect(employmentTypeFromText("A part-time position for students")).toBe("PART_TIME");
    expect(employmentTypeFromText("6-month contract role")).toBe("CONTRACTOR");
    expect(employmentTypeFromText("We sell software.")).toBeUndefined();
    const s = jobPostingSchema({ ...base, employment_type: null, description_raw: "Full time. Great team." }, "https://x.com");
    expect(s.employmentType).toBe("FULL_TIME");
  });
  it("valid for 30 days after we last saw it live", () => {
    const s = jobPostingSchema({ ...base, last_seen_at: "2026-10-27T00:00:00.000Z" }, "https://x.com");
    expect(s.validThrough).toBe("2026-11-26T00:00:00.000Z");
  });
});
