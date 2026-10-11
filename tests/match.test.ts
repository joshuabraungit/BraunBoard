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
