import { describe, expect, it } from "vitest";
import { renderPicks } from "../src/lib/picks-email";
import { choosePicks, chooseSkip, nextIssueDate, sendAtFor, skipTake, subjectFor, templateTake, type PickCandidate } from "../src/lib/picks";

const NOW = Date.UTC(2026, 9, 12, 18); // Mon Oct 12 2026, 2pm ET
const fresh = new Date(NOW - 2 * 86_400_000).toISOString();

let n = 0;
const job = (p: Partial<PickCandidate>): PickCandidate => ({
  id: `j${++n}`,
  slug: `job-${n}`,
  title_raw: "Enterprise Account Executive",
  company_id: `c${n}`,
  company_name: `Co ${n}`,
  role_family: "Account Executive",
  sales_segment: "Enterprise",
  remote_type: "Remote",
  city: null,
  state: null,
  summary: "Sell things to big companies.",
  description_raw: null,
  salary_min: 150000,
  salary_max: 160000,
  ote_min: 300000,
  ote_max: 320000,
  self_sourcing_level: "Medium",
  disclosures: { quota_attainment: true, territory: true },
  first_seen_at: fresh,
  flags: ["publishes_ote", "shares_attainment"],
  ...p,
});

describe("choosePicks", () => {
  it("only picks strong, fresh postings with pay", () => {
    const good = job({});
    const noPay = job({ salary_min: null, salary_max: null, ote_min: null, ote_max: null, flags: [] });
    const stale = job({ first_seen_at: new Date(NOW - 40 * 86_400_000).toISOString() });
    const redFlag = job({ flags: ["publishes_ote", "hustle_language"] });
    expect(choosePicks([noPay, stale, redFlag, good], 5, NOW).map((j) => j.id)).toEqual([good.id]);
  });

  it("keeps variety: one per company, two per role", () => {
    const a = job({ company_id: "same" });
    const b = job({ company_id: "same" });
    const ses = [job({ role_family: "Sales Engineer" }), job({ role_family: "Sales Engineer" }), job({ role_family: "Sales Engineer" })];
    const picks = choosePicks([a, b, ...ses, job({}), job({})], 5, NOW);
    expect(picks.filter((p) => p.company_id === "same")).toHaveLength(1);
    expect(picks.filter((p) => p.role_family === "Sales Engineer")).toHaveLength(2);
  });
});

describe("chooseSkip", () => {
  it("picks the worst red-flag posting and never a picked company", () => {
    const meh = job({ flags: ["many_hats"], company_id: "x" });
    const worst = job({ salary_min: null, salary_max: null, ote_min: null, ote_max: null, flags: ["uncapped_no_numbers", "dial_quotas"] });
    expect(chooseSkip([meh, worst], new Set(), NOW)?.id).toBe(worst.id);
    expect(chooseSkip([meh], new Set(["x"]), NOW)).toBeNull();
  });
  it("describes the posting, not the company", () => {
    const t = skipTake(job({ salary_min: null, salary_max: null, ote_min: null, ote_max: null, flags: ["uncapped_no_numbers", "dial_quotas"], company_name: "Acme" }));
    expect(t).toMatch(/^One posting this week/);
    expect(t).not.toMatch(/Acme/);
  });
});

describe("copy", () => {
  it("writes a take from real facts only", () => {
    expect(templateTake(job({}))).toMatch(/how many reps hit quota/);
  });
  it("builds a subject from the top OTE", () => {
    expect(subjectFor([job({ ote_max: 400000, company_name: "Databricks" }), job({})])).toBe("Braun's Picks: $400K OTE at Databricks + 1 more");
  });
});

describe("schedule", () => {
  it("targets the next Tuesday in New York", () => {
    expect(nextIssueDate(new Date(NOW))).toBe("2026-10-13");
    expect(nextIssueDate(new Date(Date.UTC(2026, 9, 13, 15)))).toBe("2026-10-20"); // a Tuesday -> next week
  });
  it("sends at 8am New York time across daylight saving", () => {
    expect(sendAtFor("2026-10-13")).toBe("2026-10-13T12:00:00.000Z"); // EDT
    expect(sendAtFor("2026-11-10")).toBe("2026-11-10T13:00:00.000Z"); // EST
  });
});

describe("renderPicks", () => {
  it("tracks clicks per subscriber and includes one-click unsubscribe", () => {
    const e = renderPicks(
      { subject: "S", intro: "Hi <there>", stat_line: "42%", issue_date: "2026-10-13" },
      [
        { id: "i1", kind: "pick", title: "AE", company: "Acme", pay: "$300K OTE", meta: "Remote", take: "Good." },
        { id: "i2", kind: "skip", title: "Bad", company: null, pay: null, meta: null, take: "One posting this week..." },
      ],
      { siteUrl: "https://x.com", subscriberId: "sub-1" },
    );
    expect(e.html).toContain("https://x.com/p/i1?s=sub-1");
    expect(e.html).toContain("Hi &lt;there&gt;");
    expect(e.html).toContain("One to skip");
    expect(e.oneClick).toBe("https://x.com/api/picks/unsubscribe?s=sub-1");
    expect(e.text).toContain("Josh's take: Good.");
  });
});
