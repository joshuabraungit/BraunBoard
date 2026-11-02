import { describe, expect, it } from "vitest";
import { honestIntro, renderPicks } from "../src/lib/picks-email";
import { choosePicks, chooseSkip, cleanTitle, introFor, nextIssueDate, pickMeta, sendAtFor, skipTake, subjectFor, templateTake, type PickCandidate } from "../src/lib/picks";

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
    const ams = [job({ role_family: "Account Manager" }), job({ role_family: "Account Manager" }), job({ role_family: "Account Manager" })];
    const picks = choosePicks([a, b, ...ams, job({}), job({})], 5, NOW);
    expect(picks.filter((p) => p.company_id === "same")).toHaveLength(1);
    expect(picks.filter((p) => p.role_family === "Account Manager")).toHaveLength(2);
  });

  it("leaves Sales Engineers out (they don't carry a quota)", () => {
    expect(choosePicks([job({ role_family: "Sales Engineer" })], 5, NOW)).toHaveLength(0);
  });
});

describe("cleanup", () => {
  it("strips recruiter tags from titles", () => {
    expect(cleanTitle("Core AE Southeast [FY27][Pipeline]")).toBe("Core AE Southeast");
    expect(cleanTitle("Account Executive (FY27 Hire)")).toBe("Account Executive");
    expect(cleanTitle("Enterprise Sales Engineer - Majors, Healthcare")).toBe("Enterprise Sales Engineer - Majors, Healthcare");
    expect(cleanTitle("Account Executive, Enterprise - Hunter")).toBe("Account Executive, Enterprise - Hunter");
  });
  it("only tags a segment on quota roles", () => {
    const base = { remote_type: "Hybrid", city: "San Francisco", state: "CA", location_raw: null, markets: ["US"], sales_segment: "SMB" };
    expect(pickMeta({ ...base, role_family: "Sales Director" })).not.toMatch(/SMB/);
    expect(pickMeta({ ...base, role_family: "Account Executive" })).toMatch(/SMB/);
  });
  it("keeps the headline honest about the skip", () => {
    expect(introFor(5, true)).toBe("5 sales jobs I'd actually look at this week, and one I'd skip.");
    expect(introFor(4, false)).toBe("4 sales jobs I'd actually look at this week.");
    expect(honestIntro("5 sales jobs I'd actually look at this week, and one I'd skip.", false)).toBe("5 sales jobs I'd actually look at this week.");
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
    expect(nextIssueDate(new Date(Date.UTC(2026, 9, 13, 15)))).toBe("2026-10-20"); // Tuesday 11am ET -> next week
    expect(nextIssueDate(new Date(Date.UTC(2026, 9, 13, 9)))).toBe("2026-10-13"); // Tuesday 5am ET -> today
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
    expect(e.html).toContain("Hit reply");
    expect(e.html).toContain("https://x.com/picks?from=forward");
  });

  it("shows what you'd sell, the motion, the key light and days open", () => {
    const e = renderPicks(
      { subject: "S", intro: "5 sales jobs I'd actually look at this week, and one I'd skip.", opener: "Two of these don't list base.", stat_line: null, issue_date: "2026-11-03" },
      [{ id: "i1", kind: "pick", title: "Core AE Southeast [FY27][Pipeline]", company: "Samsara", pay: "$222K OTE", meta: "Remote", take: "Good." }],
      {
        siteUrl: "https://x.com",
        subscriberId: "s",
        extras: new Map([["i1", { motion: "New Business", sells: "Cameras and sensors for truck fleets.", sellsTo: "Fleet managers", light: { tone: "yellow" as const, text: "You find your own leads" }, postedAt: "2026-10-28T12:00:00Z" }]]),
      },
    );
    expect(e.html).toContain("Core AE Southeast · Samsara");
    expect(e.html).not.toContain("FY27");
    expect(e.html).toContain("What you'd sell:</span> Cameras and sensors for truck fleets<");
    expect(e.html).toContain("Yellow light:</b> You find your own leads");
    expect(e.html).toContain("Open 6 days");
    expect(e.html).toContain("Two of these don&#39;t list base.".replace("&#39;", "'"));
    expect(e.html).not.toContain("and one I'd skip"); // no skip item in this issue
    expect(e.text).toContain("New Business · Open 6 days");
  });
});
