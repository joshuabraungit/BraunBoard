import { describe, expect, it } from "vitest";
import { parseAttainment } from "../src/lib/attainment";
import { braunRead, computeFlags } from "../src/lib/flags";
import { questionsFor } from "../src/lib/questions";

const KONG = "Join a team where 49% of reps are achieving 100%+ of quota and fully ramped reps are averaging 117% attainment.\n\nCompetitive Earning Potential";
const VANTA = "The team is the top-performing team at Vanta. Our reps are averaging 145% quota attainment. The segment closed at 119% of target.";

describe("parseAttainment", () => {
  it("reads how many reps hit, in their words", () => {
    expect(parseAttainment(KONG)).toMatchObject({ kind: "hit", pct: 49 });
    expect(parseAttainment(KONG)!.quote).toContain("49% of reps are achieving 100%+ of quota");
    expect(parseAttainment("Last year 72% of our AEs hit quota.")).toMatchObject({ kind: "hit", pct: 72 });
    expect(parseAttainment("Over 80% of the sales team exceeded quota in 2025.")).toMatchObject({ kind: "hit", pct: 80 });
  });
  it("reads an average as an average", () => {
    expect(parseAttainment(VANTA)).toMatchObject({ kind: "average", pct: 145, quote: "Our reps are averaging 145% quota attainment." });
    expect(parseAttainment("Average attainment of 112% across the team.")).toMatchObject({ kind: "average", pct: 112 });
  });
  it("ignores talk about the candidate or expectations", () => {
    expect(parseAttainment("Generate results; consistent, reliable performance with 100% minimum attainment expected")).toBeNull();
    expect(parseAttainment("You are a proven hunter with a track record of quota attainment and overachievement.")).toBeNull();
    expect(parseAttainment("Showcase clear metrics such as pipeline created, meetings, conversion, quota attainment.")).toBeNull();
    expect(parseAttainment("Consistently achieved 120% of quota in prior roles.")).toBeNull();
    expect(parseAttainment("Commission is paid at 100% of quota.")).toBeNull();
  });
});

describe("attainment flags and questions", () => {
  const base = { salary_min: null, salary_max: null, ote_min: null, ote_max: null, self_sourcing_level: "Unknown", disclosures: {}, first_seen_at: new Date().toISOString() };
  it("gives full credit only for how many hit", () => {
    expect(computeFlags({ ...base, description_raw: KONG }).map((f) => f.code)).toContain("shares_attainment");
    const avg = computeFlags({ ...base, description_raw: VANTA });
    expect(avg.map((f) => f.code)).toContain("attainment_average");
    expect(avg.map((f) => f.code)).not.toContain("shares_attainment");
  });
  it("an average doesn't raise the verdict score like a real number does", () => {
    const plain = braunRead({ ...base, description_raw: "Great team." });
    const avg = braunRead({ ...base, description_raw: VANTA });
    expect(avg.verdict).toBe(plain.verdict);
  });
  it("asks the fully ramped question unless they told you how many hit", () => {
    const ask = (d: string) => questionsFor({ ...base, role_family: "Account Executive", flags: computeFlags({ ...base, description_raw: d }) });
    expect(ask("Great team.")[0]!.text).toBe("What percentage of fully ramped reps hit quota last year?");
    expect(ask(VANTA)[0]!.text).toBe("What percentage of fully ramped reps hit quota last year?");
    expect(ask(VANTA)[1]!.text).toBe("How much of last year's number came from your top two reps?");
    expect(ask(KONG).some((q) => /fully ramped/.test(q.text))).toBe(false);
  });
});
