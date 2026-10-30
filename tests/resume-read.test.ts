import { describe, expect, it } from "vitest";
import { cleanPrefill } from "../src/lib/resume-read";

describe("résumé prefill", () => {
  it("keeps valid answers and the summary", () => {
    const r = cleanPrefill({
      roles: ["sdr", "ae", "ae"],
      country: "US",
      location: "Los Angeles, CA",
      work: "remote",
      motion: "new",
      sizes: ["growth"],
      current_role: "SDR at Acme",
      years_selling: 1.4,
      sold_to: "restaurant owners",
      industries: "hospitality",
    });
    expect(r.answers.roles).toEqual(["sdr", "ae"]);
    expect(r.answers.country).toBe("US");
    expect(r.answers.work).toBe("remote");
    expect(r.answers.motion).toBe("new");
    expect(r.answers.sizes).toEqual(["growth"]);
    expect(r.saw.years_selling).toBe(1);
    expect(r.saw.sold_to).toBe("restaurant owners");
  });
  it("drops anything that isn't a real choice instead of guessing", () => {
    const r = cleanPrefill({ roles: ["ceo", 3], country: "France", work: "any", motion: "either", sizes: ["huge"], years_selling: -2, location: "  " });
    expect(r.answers).toEqual({});
    expect(r.saw).toEqual({ current_role: null, years_selling: null, sold_to: null, industries: null });
  });
  it("never passes pay or dealbreakers through", () => {
    const r = cleanPrefill({ roles: ["ae"], min_base: 120000, min_ote: 240000, dealbreakers: ["commission_only"] });
    expect(Object.keys(r.answers)).toEqual(["roles"]);
  });
});

describe("readResume", () => {
  it("sends a PDF as a document and reads the reply", async () => {
    const { readResume } = await import("../src/lib/resume-read");
    const { vi } = await import("vitest");
    let sent: { messages: { content: { type: string }[] }[] } | undefined;
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ content: [{ type: "text", text: 'Sure: {"roles":["ae"],"country":"US","current_role":"SDR at Acme"}' }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await readResume({ pdf: Buffer.from("%PDF-1.4 test") }, "test-key");
    vi.unstubAllGlobals();
    expect(sent!.messages[0].content[0].type).toBe("document");
    expect(r.answers).toEqual({ roles: ["ae"], country: "US" });
    expect(r.saw.current_role).toBe("SDR at Acme");
  });
});

describe("experience matching", () => {
  it("turns what they sold into matching words, skipping role words", async () => {
    const { experienceTerms } = await import("../src/lib/match");
    expect(experienceTerms("Restaurant owners; logistics, operations leaders")).toEqual(["restaurant", "logistic", "operation"]);
    expect(experienceTerms("VP of Sales, B2B SaaS")).toEqual(["sale"]);
  });
  it("boosts jobs selling to the same buyers and never penalizes others", async () => {
    const { experienceTerms, scoreMatch } = await import("../src/lib/match");
    const prefs = { role_families: ["Account Executive"], segments: [], motions: [], remote_types: [], locations: [], keywords: [], min_base: null, min_ote: null, dealbreakers: [], experience: experienceTerms("restaurant owners") } as never;
    const base = { title_raw: "AE", role_family: "Account Executive", sales_segment: "SMB", sales_motion: "New Logo", self_sourcing_level: "Unknown", remote_type: "Remote", city: null, state: null, salary_min: null, salary_max: null, ote_min: null, ote_max: null, description_raw: "" } as never;
    const toast = scoreMatch({ ...(base as object), buyer: "Restaurant owners and restaurateurs", industry: "Restaurants" } as never, prefs);
    const other = scoreMatch({ ...(base as object), buyer: "CTOs", industry: "Cloud" } as never, prefs);
    const unknown = scoreMatch(base, prefs);
    expect(toast.checks.some((c) => c.key === "experience" && c.result === "pass")).toBe(true);
    expect(other.checks.some((c) => c.key === "experience")).toBe(false);
    expect(other.score).toBe(unknown.score);
    expect(toast.score).toBeGreaterThanOrEqual(other.score!);
  });
});

describe("ranking with experience", () => {
  it("puts jobs selling to their buyers first when scores tie", async () => {
    const { rankForWatch } = await import("../src/lib/matching");
    const { experienceTerms } = await import("../src/lib/match");
    const prefs = { role_families: ["Account Executive"], segments: [], motions: [], remote_types: [], locations: [], keywords: [], min_base: null, min_ote: null, dealbreakers: [], experience: experienceTerms("restaurant owners") } as never;
    const job = (id: string, buyer: string, seen: string) =>
      ({ id, title_raw: "AE", role_family: "Account Executive", sales_segment: "SMB", sales_motion: "New Logo", self_sourcing_level: "Unknown", remote_type: "Remote", city: null, state: null, salary_min: null, salary_max: null, ote_min: null, ote_max: null, description_raw: "", buyer, industry: null, first_seen_at: seen, markets: ["US"] }) as never;
    const r = rankForWatch([job("cloud", "CTOs", "2026-10-30"), job("toast", "Restaurant owners", "2026-10-01")], prefs);
    expect(r.jobs.map((j) => j.id)).toEqual(["toast", "cloud"]);
  });
});
