import { describe, expect, it } from "vitest";
import type { JobView } from "../src/lib/data";
import { collapseOpenings, openingsLabel } from "../src/lib/openings";
import { sameRole } from "../src/lib/ingest/dedupe";

const job = (id: string, title: string, city: string | null, company = "Braze") =>
  ({ id, title_raw: title, company_name: company, city, state: city ? "NY" : null, remote_type: "Unknown", markets: ["US"] }) as unknown as JobView;

describe("collapseOpenings", () => {
  it("shows one card per company, title and place, counting the openings", () => {
    const r = collapseOpenings([
      job("a", "Account Executive, Enterprise", "New York"),
      job("b", "Account Executive, Enterprise", "Chicago"),
      job("c", "account executive, enterprise ", "New York"),
      job("d", "Account Executive, Enterprise", "New York", "Stripe"),
    ]);
    expect(r.map((x) => [x.job.id, x.openings])).toEqual([["a", 2], ["b", 1], ["d", 1]]);
  });
});

describe("one role in several cities", () => {
  const grouped = (id: string, city: string, root: string | null) => ({ ...job(id, "Account Executive, Enterprise", city), role_group: root }) as JobView;

  it("folds copies of a role into one card and says how many places", () => {
    const r = collapseOpenings([grouped("a", "New York", null), grouped("b", "Chicago", "a"), grouped("c", "Austin", "a"), job("d", "SDR", "Austin")]);
    expect(r.map((x) => [x.job.id, x.openings, x.locations])).toEqual([["a", 3, 3], ["d", 1, 1]]);
    expect(openingsLabel(r[0]!)).toBe("Open in 3 locations");
  });

  it("still finds the Austin copy when the first posting isn't in the list", () => {
    const r = collapseOpenings([grouped("c", "Austin", "a")]);
    expect(r.map((x) => x.job.id)).toEqual(["c"]);
    expect(openingsLabel(r[0]!)).toBeNull();
  });

  it("keeps the old wording for repeat openings in one city", () => {
    expect(openingsLabel({ openings: 2, locations: 1 })).toBe("2 openings");
  });
});

describe("sameRole", () => {
  const base = {
    title: "Account Executive, Enterprise",
    title_normalized: "account executive enterprise",
    markets: ["US"],
    remote_type: "Hybrid",
    posted_at: "2026-10-01T00:00:00Z",
    description: "You will own a book of enterprise logistics accounts in the Chicago area, run full cycle deals from discovery to close, and partner with a solutions engineer. ".repeat(4),
    places: ["Chicago"],
  };
  const other = { ...base, description: base.description.replaceAll("Chicago", "Austin"), places: ["Austin"] };

  it("matches the same posting with only the city swapped", () => {
    expect(sameRole(base, other)).toBe(true);
  });
  it("keeps territory seats separate when the title names the place", () => {
    expect(sameRole({ ...base, title: "Territory Manager - Chicago" }, { ...other, title: "Territory Manager - Austin" })).toBe(false);
  });
  it("keeps roles posted weeks apart separate", () => {
    expect(sameRole(base, { ...other, posted_at: "2026-10-20T00:00:00Z" })).toBe(false);
  });
  it("keeps a US role and a UK role separate", () => {
    expect(sameRole(base, { ...other, markets: ["UK"] })).toBe(false);
  });
  it("keeps different text separate", () => {
    expect(sameRole(base, { ...other, description: "Totally different SMB inbound role selling payroll software to restaurants. ".repeat(6) })).toBe(false);
  });
});
