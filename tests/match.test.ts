import { describe, expect, it } from "vitest";
import { scoreMatch, shouldAlert, type MatchableJob, type WatchPrefs } from "../src/lib/match";

const job: MatchableJob = {
  title_raw: "Enterprise Account Executive",
  role_family: "Account Executive",
  sales_segment: "Enterprise",
  sales_motion: "New Logo",
  self_sourcing_level: "Medium",
  remote_type: "Remote",
  city: null,
  state: null,
  salary_min: 160000,
  salary_max: 180000,
  ote_min: 320000,
  ote_max: 320000,
  description_raw: "",
};

const dream: WatchPrefs = {
  role_families: ["Account Executive"],
  segments: ["Enterprise"],
  motions: ["New Logo"],
  remote_types: ["Remote"],
  locations: [],
  keywords: [],
  min_base: 150000,
  min_ote: 275000,
  dealbreakers: ["heavy_outbound"],
};

describe("scoreMatch", () => {
  it("scores a perfect match 100 with every check passing", () => {
    const m = scoreMatch(job, dream);
    expect(m.score).toBe(100);
    expect(m.checks.every((c) => c.result === "pass")).toBe(true);
    expect(shouldAlert(m)).toBe(true);
  });

  it("doesn't count unknowns against the job", () => {
    const m = scoreMatch({ ...job, sales_motion: "Unknown", salary_min: null, salary_max: null, ote_min: null, ote_max: null }, dream);
    expect(m.checks.find((c) => c.key === "motion")!.result).toBe("unknown");
    expect(m.checks.find((c) => c.key === "compensation")!.result).toBe("unknown");
    expect(m.score).toBeGreaterThanOrEqual(90);
    expect(shouldAlert(m)).toBe(true);
  });

  it("fails comp when published pay is below the floor", () => {
    const m = scoreMatch({ ...job, salary_max: 120000, salary_min: 110000 }, dream);
    expect(m.checks.find((c) => c.key === "compensation")!.result).toBe("fail");
    expect(m.score!).toBeLessThan(100);
  });

  it("blocks on a dealbreaker", () => {
    const m = scoreMatch({ ...job, self_sourcing_level: "High" }, dream);
    expect(m.score).toBeNull();
    expect(m.blocked_by).toBe("heavy_outbound");
    expect(shouldAlert(m)).toBe(false);
  });

  it("never alerts on the wrong role", () => {
    const m = scoreMatch({ ...job, role_family: "SDR/BDR" }, dream);
    expect(shouldAlert(m)).toBe(false);
  });
});

describe("text checks done in the database", () => {
  const noHits = { commission_only: false, greenfield: false, keyword: false };

  it("blocks commission-only and greenfield jobs from the database answers alone", () => {
    const prefs = { ...dream, dealbreakers: ["commission_only", "greenfield_territory"] } as WatchPrefs;
    expect(scoreMatch({ ...job, description_raw: null, text_hits: { ...noHits, commission_only: true } }, prefs).blocked_by).toBe("commission_only");
    expect(scoreMatch({ ...job, description_raw: null, text_hits: { ...noHits, greenfield: true } }, prefs).blocked_by).toBe("greenfield_territory");
    expect(scoreMatch({ ...job, description_raw: null, text_hits: noHits }, prefs).blocked_by).toBeNull();
  });

  it("gives the same answer as reading the description", () => {
    const prefs = { ...dream, keywords: ["fintech"], dealbreakers: ["commission_only"] } as WatchPrefs;
    const withText = scoreMatch({ ...job, description_raw: "A fintech role. 100% commission." }, prefs);
    const withHits = scoreMatch({ ...job, description_raw: null, text_hits: { commission_only: true, greenfield: false, keyword: true } }, prefs);
    expect(withHits).toEqual(withText);
    const plain = scoreMatch({ ...job, description_raw: "A payments role." }, { ...prefs, dealbreakers: [] });
    const plainHits = scoreMatch({ ...job, description_raw: null, text_hits: noHits }, { ...prefs, dealbreakers: [] });
    expect(plainHits).toEqual(plain);
  });
});
