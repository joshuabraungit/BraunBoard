import { describe, expect, it } from "vitest";
import { answersToPrefs, decodeWatchCookie, defaultWatchName, encodeWatchCookie, OnboardingAnswers } from "../src/lib/watch-prefs";
import { rankForWatch } from "../src/lib/matching";
import { SAMPLE_JOBS } from "../src/lib/sample-data";

const base = OnboardingAnswers.parse({ roles: ["ent_ae"], min_base: 150000, min_ote: 275000, work: "remote", location: "", motion: "new", dealbreakers: ["heavy_outbound"] });

describe("onboarding -> watch prefs", () => {
  it("maps Enterprise AE to AE + Enterprise segment", () => {
    const p = answersToPrefs(base);
    expect(p.role_families).toEqual(["Account Executive"]);
    expect(p.segments).toEqual(["Enterprise"]);
    expect(p.remote_types).toEqual(["Remote"]);
    expect(p.motions).toEqual(["New Logo"]);
  });

  it("plain AE alongside Enterprise AE means any segment", () => {
    expect(answersToPrefs({ ...base, roles: ["ae", "ent_ae"] }).segments).toEqual([]);
  });

  it("Sales Leader covers manager through CRO", () => {
    expect(answersToPrefs({ ...base, roles: ["leader"] }).role_families).toEqual(["Sales Manager", "Sales Director", "VP Sales", "CRO"]);
  });

  it("Any / Either mean no constraint", () => {
    const p = answersToPrefs({ ...base, work: "any", motion: "either" });
    expect(p.remote_types).toEqual([]);
    expect(p.motions).toEqual([]);
  });

  it("names the watch", () => {
    expect(defaultWatchName(base)).toBe("Enterprise AE · Remote · $275K+ OTE");
  });

  it("round-trips through the cookie and rejects junk", () => {
    const w = { name: "x", answers: base, prefs: answersToPrefs(base) };
    expect(decodeWatchCookie(encodeWatchCookie(w))).toEqual(w);
    expect(decodeWatchCookie("not-a-cookie")).toBeNull();
  });
});

describe("rankForWatch", () => {
  it("drops wrong roles, counts dealbreakers, sorts by score", () => {
    const r = rankForWatch(SAMPLE_JOBS, answersToPrefs({ ...base, roles: ["ent_ae", "strat_ae"], min_base: null, min_ote: 250000 }));
    expect(r.jobs.map((j) => j.id)).toEqual(["j3"]); // Quietpeak strategic AE
    expect(r.blocked).toBe(1); // Northwind enterprise AE is outbound-heavy
  });
});
