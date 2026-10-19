import { describe, expect, it } from "vitest";
import { productCards, type ProductCompany, type ProductJob } from "../src/lib/products";

const co = (id: string, extra: Partial<ProductCompany> = {}): ProductCompany => ({
  id, slug: id, name: id.toUpperCase(), domain: null, logo_url: null, story: `${id} story`, short: `${id} short`, quote: "q",
  category: "Security", checked: true, trend: "steady", new_30d: 0, closed_30d: 0, ...extra,
});
const job = (company_id: string, role_family: string, posted_at: string, markets = ["US"]): ProductJob => ({
  slug: `${company_id}-${role_family}-${posted_at}`, title_raw: role_family, role_family, seniority: "Individual Contributor", remote_type: "Remote",
  city: null, state: null, location_raw: null, salary_min: null, salary_max: null, ote_min: null, ote_max: null, currency: "USD", markets, posted_at, company_id,
});

const data = {
  companies: [co("a"), co("b", { category: "AI & data", trend: "ramping" }), co("c", { story: null, short: null, category: null }), co("d")],
  jobs: [
    job("a", "Account Executive", "2026-10-01"), job("a", "SDR/BDR", "2026-10-02"), job("a", "Account Executive", "2026-09-01"),
    job("b", "Sales Engineer", "2026-10-10"),
    job("c", "Account Executive", "2026-10-11"), job("c", "Account Executive", "2026-10-12"), job("c", "Account Executive", "2026-10-13"), job("c", "Account Executive", "2026-10-14"),
    job("d", "Account Executive", "2026-10-15", ["UK"]),
  ],
};

describe("productCards", () => {
  it("sorts by open roles, newest jobs first, and puts companies with no story last", () => {
    const cards = productCards(data, { markets: ["US"] });
    expect(cards.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(cards[0]!.jobs[0]!.posted_at).toBe("2026-10-02");
  });
  it("filters by product, role, country and search", () => {
    expect(productCards(data, { category: "AI & data" }).map((c) => c.id)).toEqual(["b"]);
    const sdr = productCards(data, { role: "sdr", markets: ["US"] });
    expect(sdr.map((c) => [c.id, c.open])).toEqual([["a", 1]]);
    expect(productCards(data, { markets: ["UK"] }).map((c) => c.id)).toEqual(["d"]);
    expect(productCards(data, { q: "B SHORT" }).map((c) => c.id)).toEqual(["b"]);
  });
  it("can sort by hiring fastest and newest", () => {
    expect(productCards(data, { sort: "fastest", markets: ["US"] })[0]!.id).toBe("b");
    expect(productCards(data, { sort: "newest", markets: ["US"] }).map((c) => c.id)).toEqual(["b", "a", "c"]);
  });
});
