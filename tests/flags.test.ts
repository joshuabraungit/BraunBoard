import { describe, expect, it } from "vitest";
import { cardFlags, braunRead, computeFlags, flagsFromCodes, type ReadInput } from "../src/lib/flags";

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
    expect(codes({ description_raw: "A desire to take on a bigger challenge and a no excuses mindset." })).toContain("hustle_language");
    expect(codes({ description_raw: "Life here is all gas, no brakes." })).toContain("hustle_language");
  });

  it("credits a spelled-out promotion path for reps only", () => {
    const sdr = { role_family: "SDR/BDR", seniority: "Individual Contributor" };
    expect(codes({ ...sdr, description_raw: "Why join us? Clear path to AE within a year." })).toContain("promotion_path");
    expect(codes({ ...sdr, description_raw: "A clear path to becoming an account executive through training." })).toContain("promotion_path");
    expect(codes({ ...sdr, description_raw: "Structured, performance-based promotion pathway." })).toContain("promotion_path");
    // Sales phrases that aren't about your career.
    expect(codes({ role_family: "Account Executive", description_raw: "Confirm a clear path to purchase and a clear path to expansion." })).not.toContain("promotion_path");
    // A manager building career paths for their team isn't a promise to the reader.
    expect(codes({ role_family: "Sales Manager", seniority: "Manager", description_raw: "Build a clear path to AE for every rep." })).not.toContain("promotion_path");
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
      description_raw: "3-month ramp, accelerators above 100%, supported by an SDR. Last year 70% of our reps hit quota.",
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
      company: { open_roles: 3, new_30d: 1, closed_30d: 0, trend: "steady" },
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
    const r = braunRead({ ...base, first_seen_at: old, company: { open_roles: 40, new_30d: 20, closed_30d: 2, trend: "ramping" } });
    expect(r.checks.find((c) => c.label === "Time on market")?.grade).toBe("bad");
    expect(r.checks.find((c) => c.label === "Company hiring")?.detail).toMatch(/churn/);
  });

  it("marks a company that's pulling back", () => {
    const r = braunRead({ ...base, company: { open_roles: 4, new_30d: 0, closed_30d: 9, trend: "pulling_back" } });
    const c = r.checks.find((x) => x.label === "Company hiring");
    expect(c?.grade).toBe("bad");
    expect(c?.detail).toMatch(/Pulling back/);
  });
});

describe("dial quotas", () => {
  it("only fires on an explicit daily number", () => {
    expect(codes({ description_raw: "Make 50-80 calls per day" })).toContain("dial_quotas");
    expect(codes({ description_raw: "Generate pipeline through high-volume outbound prospecting" })).not.toContain("dial_quotas");
  });
});

describe("pipeline support", () => {
  it("doesn't call a self-sourced role supported", () => {
    expect(codes({ self_sourcing_level: "High", description_raw: "Follow up on inbound leads and prospect" })).not.toContain("pipeline_support");
    expect(codes({ self_sourcing_level: "Medium", description_raw: "supported by an SDR" })).toContain("pipeline_support");
  });
});

describe("data-backed flags", () => {
  it("flags pay ranges too wide to mean much", () => {
    expect(codes({ ote_min: 120000, ote_max: 275000 })).toContain("wide_pay_range");
    expect(codes({ ote_min: 250000, ote_max: 300000 })).not.toContain("wide_pay_range");
  });
  it("flags roles open 90+ days, mass postings and player-coach leaders", () => {
    expect(codes({ first_seen_at: new Date(Date.now() - 100 * 86_400_000).toISOString() })).toContain("open_90_days");
    expect(codes({ same_title_open: 12 })).toContain("mass_posting");
    expect(codes({ same_title_open: 3 })).not.toContain("mass_posting");
    expect(codes({ description_raw: "This is a player-coach role", role_family: "Sales Manager" })).toContain("player_coach");
    expect(codes({ description_raw: "be a player-coach across accounts", role_family: "Account Executive" })).not.toContain("player_coach");
  });
  it("keeps heads-ups out of the verdict", () => {
    const fresh = { ...base, salary_min: 140000, ote_min: 280000, self_sourcing_level: "Medium", disclosures: { quota_attainment: true, territory: true } };
    const r = braunRead({ ...fresh, flags: ["mass_posting"], description_raw: "x" });
    expect(r.flags.map((f) => f.code)).toContain("mass_posting");
    expect(r.verdict).toBe("Strong posting");
  });
});

describe("card chips", () => {
  it("leave out flags the card already shows", () => {
    expect(cardFlags(flagsFromCodes(["open_90_days", "publishes_ote", "mass_posting"])).map((f) => f.code)).toEqual(["mass_posting"]);
  });
});
