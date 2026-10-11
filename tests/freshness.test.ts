import { describe, expect, it } from "vitest";
import { freshnessLabel } from "../src/lib/freshness";
import { descriptionSimilarity } from "../src/lib/ingest/dedupe";
import { detectFromUrl, candidateTokens } from "../src/lib/ingest/detect-ats";

describe("freshnessLabel", () => {
  const now = new Date("2026-10-11T18:00:00");
  const ago = (mins: number) => new Date(now.getTime() - mins * 60_000);
  it.each([
    [18, "18 min ago"],
    [120, "2h ago"],
    [60 * 15, "Today"],
    [60 * 24, "Yesterday"],
    [60 * 24 * 3, "3d ago"],
  ])("%i minutes -> %s", (mins, label) => {
    expect(freshnessLabel(ago(mins), now)).toBe(label);
  });
});

describe("dedupe similarity", () => {
  const a = "You will own a territory of enterprise accounts in the northeast and work closely with solutions engineers to close new business across financial services.";
  it("identical text is 1", () => expect(descriptionSimilarity(a, a)).toBe(1));
  it("unrelated text is ~0", () => expect(descriptionSimilarity(a, "We are hiring a backend engineer to scale our Postgres clusters and build internal tooling for developers.")).toBeLessThan(0.1));
});

describe("ATS detection", () => {
  it.each([
    ["https://boards.greenhouse.io/acme", "greenhouse", "acme"],
    ["https://job-boards.greenhouse.io/acme/jobs/123", "greenhouse", "acme"],
    ["https://jobs.lever.co/acme-co", "lever", "acme-co"],
    ["https://jobs.ashbyhq.com/ramp", "ashby", "ramp"],
  ])("%s", (url, provider, identifier) => {
    expect(detectFromUrl(url)).toEqual({ provider, identifier });
  });
  it("guesses tokens", () => {
    expect(candidateTokens("Acme Labs Inc")).toContain("acme");
    expect(candidateTokens("datadoghq.com")).toContain("datadoghq");
  });
});
