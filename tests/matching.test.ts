import { describe, expect, it, vi } from "vitest";
import type { JobView } from "../src/lib/data";
import type { WatchPrefs } from "../src/lib/match";

const SCORES: Record<string, number> = { old100: 100, new95: 95, new80: 80, old85: 85, new60: 60 };
vi.mock("../src/lib/match", () => ({
  openInCountries: () => true,
  scoreMatch: (j: { id: string }) => ({ score: SCORES[j.id], checks: [] }),
}));
const { rankForWatch } = await import("../src/lib/matching");

const job = (id: string, daysAgo: number) => ({ id, first_seen_at: new Date(Date.UTC(2026, 9, 12) - daysAgo * 86_400_000).toISOString() }) as JobView;

describe("rankForWatch ordering", () => {
  it("treats close scores as a tie and puts the newer job first", () => {
    const r = rankForWatch([job("old100", 7), job("new60", 0), job("old85", 5), job("new80", 0), job("new95", 0)], {} as WatchPrefs);
    expect(r.jobs.map((j) => j.id)).toEqual(["new95", "old100", "new80", "old85", "new60"]);
  });
});
