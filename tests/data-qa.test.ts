import { describe, expect, it } from "vitest";
import { baseLooksLikeOte, duplicateListings, germanPostings, missingMarkets, quietMarkets, type QaJob } from "../src/lib/data-qa";

const NOW = Date.parse("2026-11-02T12:00:00Z");
const today = "2026-11-02T08:00:00Z";
const lastMonth = "2026-10-01T08:00:00Z";
let n = 0;
const job = (o: Partial<QaJob>): QaJob => ({
  id: String(++n), slug: `job-${n}`, title_raw: "Account Executive", company_name: "Acme", location_raw: "Austin, TX", markets: ["US"], city: "Austin",
  role_family: "Account Executive", salary_max_usd: null, currency: "USD", salary_min: null, salary_max: null, first_seen_at: today, role_group: null, ...o,
});

describe("missingMarkets", () => {
  it("catches a job that lists Germany but isn't on the Germany board (what Dao found)", () => {
    const i = missingMarkets([job({ location_raw: "London, UK / Remote in Germany", markets: ["UK"], remote_type: "Remote" } as never)], NOW);
    expect(i?.examples[0]).toMatch(/missing Germany/);
  });
  it("leaves correct jobs alone", () => {
    expect(missingMarkets([job({ location_raw: "London, UK / Berlin, Germany", markets: ["UK", "DE"] })], NOW)).toBeNull();
  });
  it("skips a bare Remote, which the crawler places from the title", () => {
    expect(missingMarkets([job({ location_raw: "Distributed", markets: ["CA"] })], NOW)).toBeNull();
  });
  it("only flags new jobs", () => {
    expect(missingMarkets([job({ location_raw: "London, UK / Berlin, Germany", markets: ["UK"], first_seen_at: lastMonth })], NOW)).toBeNull();
  });
});

describe("baseLooksLikeOte", () => {
  it("flags an AE with a $300K base", () => {
    expect(baseLooksLikeOte([job({ salary_max: 300000, salary_max_usd: 300000 })], NOW)?.line).toMatch(/probably OTE/);
  });
  it("trusts a posting that says it's base", () => {
    expect(baseLooksLikeOte([job({ salary_max: 300000, salary_max_usd: 300000, description_raw: "Compensation - Base pay: $80,000 - $300,000" })], NOW)).toBeNull();
    expect(baseLooksLikeOte([job({ salary_max: 286000, salary_max_usd: 286000, description_raw: "The San Francisco, CA salary range for this role is $234,000-286,000 plus annual bonus." })], NOW)).toBeNull();
  });
  it("lets partnerships roles earn it", () => {
    expect(baseLooksLikeOte([job({ title_raw: "Sr. Partner Development Manager, Google Cloud", salary_max: 257250, salary_max_usd: 257250 })], NOW)).toBeNull();
  });
  it("lets leaders earn it", () => {
    expect(baseLooksLikeOte([job({ role_family: "VP Sales", salary_max: 320000, salary_max_usd: 320000 })], NOW)).toBeNull();
  });
});

describe("quietMarkets", () => {
  it("flags a market with nothing new in 3 days", () => {
    const jobs = [job({ markets: ["US"] }), job({ markets: ["CA"] }), job({ markets: ["UK"] }), job({ markets: ["DE"], first_seen_at: lastMonth })];
    expect(quietMarkets(jobs, NOW)?.line).toMatch(/Germany/);
    expect(quietMarkets([...jobs, job({ markets: ["DE"] })], NOW)).toBeNull();
  });
});

describe("germanPostings", () => {
  it("flags a German-language posting", () => {
    const de = "Wir wachsen schnell und suchen erfahrene Account Manager, die Bestandskunden strategisch entwickeln. In dieser Rolle übernimmst du ein bestehendes Portfolio im DACH-Markt und arbeitest eng mit unseren Teams. Du bist die Schnittstelle zwischen Kunden und unseren Teams in Sales, Implementation, Support und Product. Das bringst du mit: Erfahrung im B2B SaaS. Was du von uns erwarten kannst: Arbeite bis zu 60 Tage im Jahr remote. Wir freuen uns auf deine Bewerbung für die Rolle bei uns.";
    expect(germanPostings([job({ description_raw: de })], NOW)).not.toBeNull();
    expect(germanPostings([job({ description_raw: "You will close new business across DACH." })], NOW)).toBeNull();
  });
});

describe("duplicateListings", () => {
  const text = "MediaRadar equips marketing, sales and analytics leaders with the intelligence they need to stay ahead. You will own a book of agency accounts in New York and grow them.";
  it("flags the same job twice when one is new", () => {
    expect(duplicateListings([job({ first_seen_at: lastMonth, description_raw: text }), job({ description_raw: `Location: NYC Hybrid. ${text}` })], NOW)?.line).toMatch(/listed twice/);
  });
  it("leaves different jobs with the same title alone (a holding company's businesses)", () => {
    expect(duplicateListings([job({ description_raw: "Sadie is building technology for hospitality. Win new restaurant customers across the United States." }), job({ description_raw: "Variphy is the preferred reporting and analytics platform for unified communications." })], NOW)).toBeNull();
  });
  it("ignores old duplicates and grouped city copies", () => {
    expect(duplicateListings([job({ first_seen_at: lastMonth }), job({ first_seen_at: lastMonth })], NOW)).toBeNull();
    expect(duplicateListings([job({}), job({ role_group: "1" })], NOW)).toBeNull();
  });
});
