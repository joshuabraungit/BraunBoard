import { describe, expect, it } from "vitest";
import { withEuMarket } from "../src/lib/eu-remote";
import { formatLocation } from "../src/lib/format";
import { MARKET_CHOICES } from "../src/lib/market";
import { openInCountries } from "../src/lib/match";

describe("Remote across Europe", () => {
  it("tags remote roles open across Europe", () => {
    for (const loc of ["Remote - EU", "Europe (Remote)", "Remote, EMEA", "Remote - Europe"])
      expect(withEuMarket(["DE"], "Remote", loc), loc).toEqual(["DE", "EU"]);
  });
  it("leaves single-country and office roles alone", () => {
    expect(withEuMarket(["DE"], "Remote", "Remote - Spain")).toEqual(["DE"]);
    expect(withEuMarket(["DE"], "Hybrid", "Berlin, EMEA")).toEqual(["DE"]);
    expect(withEuMarket(["UK"], "Remote", "Remote - UK")).toEqual(["UK"]);
    expect(withEuMarket(["DE"], "Remote", "Remote, Germany")).toEqual(["DE"]);
  });
  it("tags roles open in several European countries", () => {
    for (const loc of [
      "Remote - European Union / United Kingdom / Germany / Ireland / Netherlands / France",
      "Austria, Remote ; Germany, Remote; Poland, Remote",
      "England / Portugal / Spain / Italy / Germany",
    ]) expect(withEuMarket(["DE"], "Remote", loc), loc).toContain("EU");
    expect(withEuMarket(["DE"], "Remote", "Dublin or Germany (Berlin or Remote)")).toEqual(["DE"]);
    expect(withEuMarket(["DE"], "Remote", "Germany / Switzerland")).toEqual(["DE"]);
  });
  it("doesn't double-tag", () => {
    expect(withEuMarket(["DE", "EU"], "Remote", "Remote - EU")).toEqual(["DE", "EU"]);
    expect(withEuMarket(["DE", "EU"], "Remote", "Remote - Spain")).toEqual(["DE"]);
  });
  it("the tag never shows as a place", () => {
    expect(formatLocation({ remote_type: "Remote", city: null, state: null, location_raw: "Remote, EMEA", markets: ["DE", "EU"] })).toBe("Remote · Anywhere in EMEA");
  });
  it("filter and watches find tagged jobs", () => {
    expect(MARKET_CHOICES.EU.markets).toEqual(["EU"]);
    expect(openInCountries({ markets: ["DE", "EU"] }, { countries: ["EU"] })).toBe(true);
    expect(openInCountries({ markets: ["DE"] }, { countries: ["EU"] })).toBe(false);
  });
});
