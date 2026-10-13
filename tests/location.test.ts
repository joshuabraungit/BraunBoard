import { describe, expect, it } from "vitest";
import { parseLocation } from "../src/lib/ingest/location";
import { titleNamesCanadaOnly, titleNamesForeignOnly } from "../src/lib/ingest/location";

describe("parseLocation", () => {
  it.each([
    ["San Francisco, CA", "CA", "Unknown"],
    ["New York, New York", "NY", "Unknown"],
    ["Remote - US", null, "Remote"],
    ["Remote (United States)", null, "Remote"],
    ["Hybrid - Austin, TX", "TX", "Hybrid"],
    ["NYC", "NY", "Unknown"],
    ["London / New York, NY", "NY", "Unknown"],
  ])("%s is US", (raw, state, remote) => {
    const p = parseLocation(raw);
    expect(p.is_us).toBe(true);
    expect(p.state).toBe(state);
    expect(p.remote_type).toBe(remote);
  });

  it.each(["London, UK", "Toronto, ON", "Remote - EMEA", "Remote (Canada)", "Berlin"])("%s is not US", (raw) => {
    expect(parseLocation(raw).is_us).toBe(false);
  });

  it("uses structured hints", () => {
    const p = parseLocation("HQ", { country: "USA", region: "NY", city: "New York City", workplace: "Hybrid" });
    expect(p).toMatchObject({ is_us: true, state: "NY", remote_type: "Hybrid" });
  });

  it("keeps bare Remote but leaves country unknown so it's flagged for review", () => {
    const p = parseLocation("Remote");
    expect(p.is_us).toBe(true);
    expect(p.country).toBeNull();
  });
});

describe("foreign remote qualifiers (seen in real data)", () => {
  it.each(["Remote - Colombia", "Remote - China", "Remote (Brazil)", "Remote - LATAM", "Remote - Spain", "Remote, Philippines"])("%s is not US", (raw) => {
    expect(parseLocation(raw).is_us).toBe(false);
  });
  it.each(["Remote - US West", "Remote - US", "Remote (USA)", "Remote - California", "Remote - East Coast", "US DC - Remote", "Remote - Colombia / Remote - US"])("%s is US", (raw) => {
    expect(parseLocation(raw).is_us).toBe(true);
  });
});

describe("US remote qualifiers wrongly dropped in the first reprocess", () => {
  it.each(["Remote - Washington D.C.", "Remote - SF Bay Area", "Remote - Austin, TX", "Remote - NYC", "Remote - Pacific Northwest"])("%s is US", (raw) => {
    expect(parseLocation(raw).is_us).toBe(true);
  });
});

describe("city cleanup", () => {
  it("never uses 'Remote' as a city", () => {
    expect(parseLocation("Remote-Texas").city).toBeNull();
    expect(parseLocation("x", { country: "US", region: "TX", city: "Remote" }).city).toBeNull();
  });
});

describe("titleNamesForeignOnly", () => {
  it("rejects titles that name only a territory outside the US and Canada", () => {
    expect(titleNamesForeignOnly("Enterprise AE, EMEA")).toBe(true);
    expect(titleNamesForeignOnly("Account Executive, London")).toBe(true);
    expect(titleNamesForeignOnly("Senior Majors Account Executive, Toronto")).toBe(false);
  });
  it("keeps titles that include the US", () => {
    expect(titleNamesForeignOnly("Business Development Representative (BDR) - New England and/or Canada")).toBe(false);
    expect(titleNamesForeignOnly("Enterprise Account Executive - Existing Customers (US/Canada)")).toBe(false);
    expect(titleNamesForeignOnly("Enterprise Account Executive - Americas (East)")).toBe(false);
    expect(titleNamesForeignOnly("Mid-Market AE, Healthcare")).toBe(false);
  });
});

describe("Canada", () => {
  it("reads Canadian cities and provinces", () => {
    expect(parseLocation("Toronto, ON")).toMatchObject({ city: "Toronto", state: "ON", country: "CA", markets: ["CA"], is_us: false });
    expect(parseLocation("Vancouver, British Columbia, Canada")).toMatchObject({ state: "BC", country: "CA", markets: ["CA"] });
    expect(parseLocation("Remote - Canada")).toMatchObject({ country: "CA", markets: ["CA"], remote_type: "Remote" });
    expect(parseLocation("Montréal")).toMatchObject({ city: "Montréal", state: "QC", markets: ["CA"] });
    expect(parseLocation("Calgary, Alberta")).toMatchObject({ state: "AB", markets: ["CA"] });
  });
  it("keeps California as California", () => {
    expect(parseLocation("San Francisco, CA")).toMatchObject({ state: "CA", country: "US", markets: ["US"] });
  });
  it("knows a job can be open in both", () => {
    expect(parseLocation("Remote - US / Remote - Canada")).toMatchObject({ country: "US", markets: ["US", "CA"] });
    expect(parseLocation("New York, NY; Toronto, ON")).toMatchObject({ city: "New York", markets: ["US", "CA"] });
  });
  it("uses ATS country hints", () => {
    expect(parseLocation("Remote", { country: "Canada", region: "Ontario" })).toMatchObject({ country: "CA", state: "ON", markets: ["CA"] });
    expect(parseLocation("Remote", { country: "CA" })).toMatchObject({ country: "CA", markets: ["CA"] });
  });
  it("still drops the rest of the world", () => {
    expect(parseLocation("Remote - Colombia").markets).toEqual([]);
    expect(parseLocation("Berlin, Germany").markets).toEqual([]);
    expect(parseLocation("Dublin, Ireland").markets).toEqual([]);
  });
  it("spots Canada-only titles", () => {
    expect(titleNamesCanadaOnly("Senior Majors Account Executive, Toronto")).toBe(true);
    expect(titleNamesCanadaOnly("Territory Account Executive, Eastern Canada")).toBe(true);
    expect(titleNamesCanadaOnly("Enterprise AE (US/Canada)")).toBe(false);
  });
});
