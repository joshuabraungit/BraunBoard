import { describe, expect, it } from "vitest";
import { parseLocation, titleNamesUkOnly, titleOutOfMarket } from "../src/lib/ingest/location";
import { findPayInText, payCurrency, resolveCompensation } from "../src/lib/ingest/compensation";
import { locate } from "../src/lib/ingest/pipeline";
import { formatComp, formatLocation, money } from "../src/lib/format";
import type { RawJob } from "../src/lib/ingest/types";

describe("UK locations", () => {
  it("reads common UK formats", () => {
    expect(parseLocation("London, UK")).toMatchObject({ city: "London", country: "UK", markets: ["UK"] });
    expect(parseLocation("London")).toMatchObject({ city: "London", markets: ["UK"] });
    expect(parseLocation("London, England, United Kingdom")).toMatchObject({ city: "London", markets: ["UK"] });
    expect(parseLocation("Manchester, England")).toMatchObject({ city: "Manchester", markets: ["UK"] });
    expect(parseLocation("Remote - UK")).toMatchObject({ remote_type: "Remote", country: "UK", markets: ["UK"] });
    expect(parseLocation("United Kingdom (Remote)").markets).toEqual(["UK"]);
    expect(parseLocation("Edinburgh").markets).toEqual(["UK"]);
  });
  it("uses the ATS country hint", () => {
    expect(parseLocation("Remote", { country: "GB" })).toMatchObject({ country: "UK", markets: ["UK"] });
    expect(parseLocation("London", { country: "United Kingdom", city: "London" })).toMatchObject({ city: "London", markets: ["UK"] });
  });
  it("keeps multi-country jobs in every market", () => {
    expect(parseLocation("New York, NY / London, UK").markets).toEqual(["US", "UK"]);
    expect(parseLocation("Toronto, ON; London, UK").markets).toEqual(["CA", "UK"]);
  });
  it("doesn't confuse lookalikes", () => {
    expect(parseLocation("London, ON").markets).toEqual(["CA"]);
    expect(parseLocation("Manchester, NH").markets).toEqual(["US"]);
    expect(parseLocation("Cambridge, MA").markets).toEqual(["US"]);
    expect(parseLocation("Birmingham, AL").markets).toEqual(["US"]);
    expect(parseLocation("Sydney, New South Wales").markets).toEqual([]);
    expect(parseLocation("Cambridge").markets).not.toContain("UK");
  });
});

describe("UK titles", () => {
  it("spots UK-only titles", () => {
    expect(titleNamesUkOnly("Enterprise Account Executive, UK&I")).toBe(true);
    expect(titleNamesUkOnly("Account Executive, London")).toBe(true);
    expect(titleNamesUkOnly("Account Executive (US/UK)")).toBe(false);
  });
  it("keeps Europe-wide titles for UK jobs but not for US jobs", () => {
    expect(titleOutOfMarket("Commercial Account Executive, DACH", ["UK"])).toBe(false);
    expect(titleOutOfMarket("Commercial Account Executive, DACH", ["US"])).toBe(true);
    expect(titleOutOfMarket("Account Executive, APAC", ["UK"])).toBe(true);
  });
  it("moves a UK-titled job listed under several offices to the UK", () => {
    const job = { title: "Enterprise AE, UK&I", location: "New York; London", description: "", source_provider: "greenhouse" } as RawJob;
    expect(locate(job)).toMatchObject({ markets: ["UK"], country: "UK", city: "London" });
  });
});

describe("UK pay", () => {
  it("reads pounds for UK jobs only", () => {
    const text = "Base salary: £70,000 - £85,000. OTE £140K - £170K.";
    expect(resolveCompensation({ min: null, max: null, currency: null }, text, "£")).toEqual({
      salary_min: 70000, salary_max: 85000, ote_min: 140000, ote_max: 170000, currency: "GBP",
    });
    // A US job never picks up a pound range.
    expect(findPayInText("UK base salary £70,000 - £85,000", "$")).toEqual([]);
  });
  it("doesn't read dollars as pounds", () => {
    expect(findPayInText("OTE $200K", "£")).toEqual([]);
  });
  it("picks GBP for UK-only jobs", () => {
    expect(payCurrency(null, "", ["UK"])).toBe("GBP");
    expect(payCurrency(null, "", ["US", "UK"])).toBe("USD");
    expect(payCurrency("GBP", "", ["US"])).toBe("GBP");
  });
  it("shows pounds and UK places", () => {
    expect(money(150000, "GBP")).toBe("£150K");
    expect(formatComp({ salary_min: 70000, salary_max: 85000, ote_min: null, ote_max: null, currency: "GBP" })).toBe("£70K–£85K base");
    expect(formatLocation({ remote_type: "Onsite", city: "London", state: null, markets: ["UK"] })).toBe("London, UK");
    expect(formatLocation({ remote_type: "Remote", city: null, state: null, markets: ["UK"] })).toBe("Remote · UK");
    expect(formatLocation({ remote_type: "Hybrid", city: "London", state: null, markets: ["UK"] })).toBe("Hybrid · London, UK");
    expect(formatLocation({ remote_type: "Onsite", city: "New York", state: "NY", markets: ["US", "UK"] })).toBe("New York, NY + UK");
  });
});

import { languageFor } from "../src/lib/format";
describe("language tags", () => {
  it("reads the language from the title", () => {
    expect(languageFor("Account Manager - Dutch speaking")).toBe("Dutch speaking");
    expect(languageFor("Partner Manager - German Speaker")).toBe("German speaking");
    expect(languageFor("Enterprise Account Executive")).toBeNull();
  });
});

describe("UK regressions", () => {
  it("doesn't move a job in India to the UK because the title says UKI", () => {
    const job = { title: "Senior Applied Value Engineer - UKI Energy", location: "Bangalore, India", description: "", source_provider: "lever" } as RawJob;
    expect(locate(job).markets).toEqual([]);
  });
  it("doesn't use a nation as the city", () => {
    expect(parseLocation("England, United Kingdom", { country: "United Kingdom", city: "England" })).toMatchObject({ city: null, markets: ["UK"] });
  });
  it("still moves a remote job titled for the UK", () => {
    const job = { title: "Account Executive, UK", location: "Remote", description: "", source_provider: "ashby" } as RawJob;
    expect(locate(job).markets).toEqual(["UK"]);
  });
});

describe("three markets", () => {
  it("lists three markets naturally", () => {
    expect(formatLocation({ remote_type: "Remote", city: null, state: null, markets: ["US", "CA", "UK"] })).toBe("Remote · US, Canada & UK");
  });
});
