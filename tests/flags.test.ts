import { describe, expect, it } from "vitest";
import { braunRead, computeFlags, flagsFromCodes, type ReadInput } from "../src/lib/flags";

const base: ReadInput = {
  description_raw: "",
  salary_min: null,
  salary_max: null,
  ote_min: null,
  ote_max: null,
  self_sourcing_level: "Unknown",
  disclosures: {},
  first_seen_at: new Date().toISOString(),
};
const codes = (j: Partial<ReadInput>) => computeFlags({ ...base, ...j }).map((f) => f.code);

describe("computeFlags", () => {
  it("catches commission-only and uncapped-without-numbers", () => {
    expect(codes({ description_raw: "This is a 100% commission role." })).toContain("commission_only");
    expect(codes({ description_raw: "Uncapped commission and unlimited earning potential!" })).toContain("uncapped_no_numbers");
    // Once real numbers are published, "uncapped" alone isn't a red flag.
    expect(codes({ description_raw: "Uncapped commission.", ote_min: 200000 })).not.toContain("uncapped_no_numbers");
  });

  it("catches hustle language but not ordinary words", () => {
    expect(codes({ description_raw: "We want a sales rockstar who can work hard, play hard." })).toContain("hustle_language");
    expect(codes({ description_raw: "Relentlessly focused on customers. Fast-paced team." })).not.toContain("hustle_language");
  });

  it("catches dial quotas, clawbacks and many hats", () => {
    expect(codes({ description_raw: "Make 80+ calls per day" })).toContain("dial_quotas");
    expect(codes({ description_raw: "Commissions are subject to clawback" })).toContain("clawbacks");
    expect(codes({ description_raw: "You'll wear many hats" })).toContain("many_hats");
  });

  it("flags a heavily variable split", () => {
    expect(codes({ salary_min: 80000, ote_min: 200000 })).toContain("aggressive_split");
    expect(codes({ salary_min: 120000, ote_min: 240000 })).not.toContain("aggressive_split");
  });

  it("gives green flags for transparency and support", () => {
    const c = codes({
      description_raw: "3-month ramp, accelerators above 100%, supported by an SDR",
      ote_min: 250000,
      disclosures: { quota_attainment: true, quota_size: true, average_deal_size: true },
    });
    expect(c).toEqual(
      expect.arrayContaining(["publishes_ote", "shares_attainment", "states_quota", "states_deal_size", "pipeline_support", "ramp_support", "accelerators"]),
    );
  });

  it("restores flags from stored codes, red first, ignoring unknown codes", () => {
    const f = flagsFromCodes(["publishes_ote", "nope", "clawbacks"]);
    expect(f.map((x) => x.code)).toEqual(["clawbacks", "publishes_ote"]);
  });
});

describe("braunRead", () => {
  it("calls a transparent posting strong", () => {
    const r = braunRead({
      ...base,
      salary_min: 140000,
      ote_min: 280000,
      self_sourcing_level: "Medium",
      disclosures: { quota_attainment: true, territory: true },
      companyOpenRoles: 3,
    });
    expect(r.verdict).toBe("Strong posting");
  });

  it("asks hard questions when pay is base only and nothing else is shared", () => {
    expect(braunRead({ ...base, salary_min: 90000, self_sourcing_level: "High" }).verdict).toBe("Ask hard questions");
  });

  it("is cautious with no pay and no detail, or with red flags", () => {
    expect(braunRead(base).verdict).toBe("Proceed with caution");
    expect(braunRead({ ...base, ote_min: 200000, description_raw: "100% commission. Wear many hats." }).verdict).toBe("Proceed with caution");
  });

  it("notes stale postings and heavy hiring", () => {
    const old = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const r = braunRead({ ...base, first_seen_at: old, companyOpenRoles: 40 });
    expect(r.checks.find((c) => c.label === "Time on market")?.grade).toBe("bad");
    expect(r.checks.find((c) => c.label === "Company hiring")?.detail).toMatch(/churn/);
  });
});

describe("dial quotas", () => {
  it("only fires on an explicit daily number", () => {
    expect(codes({ description_raw: "Make 50-80 calls per day" })).toContain("dial_quotas");
    expect(codes({ description_raw: "Generate pipeline through high-volume outbound prospecting" })).not.toContain("dial_quotas");
  });
});
