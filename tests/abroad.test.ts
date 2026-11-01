import { describe, expect, it } from "vitest";
import { descriptionPlacesRoleAbroad, titleOutOfMarket } from "../src/lib/ingest/location";

describe("posting text that puts the job abroad", () => {
  it("catches a Korea role listed as United States", () => {
    const d =
      "Lead growth across Databricks' largest strategic accounts in Korea. You will report to the Director of Sales, Korea. " +
      "Grow a portfolio of Korea's largest enterprise accounts. Networks across major Korean conglomerates. Native-level fluency in Korean is required. " +
      "It is within Employer's discretion whether to apply for a U.S. export license.";
    expect(descriptionPlacesRoleAbroad(d, ["US"])).toBe("Korea");
  });
  it("catches an explicit foreign location", () => {
    expect(descriptionPlacesRoleAbroad("Available Location: Canberra, Australia. Sell to government.", ["US"])).toBe("Australia");
  });
  it("leaves a US role that mentions other regions alone", () => {
    const d = "Our operations run out of Asia, and customers expand into Europe, Australia, and APAC. Support AEs in Europe, Australia, and APAC. Deal cycles in Australia.";
    expect(descriptionPlacesRoleAbroad(d, ["US"])).toBeNull();
  });
  it("doesn't read Indiana as India", () => {
    expect(descriptionPlacesRoleAbroad("Cover Indiana and Ohio. Partners across Indiana. Based near Indianapolis, Indiana.", ["US"])).toBeNull();
  });
  it("lets UK jobs sell into Europe", () => {
    expect(descriptionPlacesRoleAbroad("Sell to Belgium and the Netherlands. Belgium is key. Grow Belgium accounts.", ["UK"])).toBeNull();
  });
  it("leaves a normal US posting alone", () => {
    expect(descriptionPlacesRoleAbroad("Sell to mid-market companies across the United States. Remote, US only.", ["US"])).toBeNull();
  });
  it("now reads Canberra and Seoul in titles", () => {
    expect(titleOutOfMarket("Senior Named Account Executive (FedGov), Canberra", ["US"])).toBe(true);
    expect(titleOutOfMarket("Account Executive, Seoul", ["US"])).toBe(true);
  });
});

describe("location lines that still include one of our countries", () => {
  it("keeps jobs open in the UK or abroad", () => {
    expect(descriptionPlacesRoleAbroad("Location: UK or Singapore. Join our sales team.", ["UK"])).toBeNull();
    expect(descriptionPlacesRoleAbroad("Location: International (UK / UAE). Partner role.", ["UK"])).toBeNull();
    expect(descriptionPlacesRoleAbroad("You should be based in the UK or Ireland.", ["US"])).toBeNull();
  });
  it("ignores offsite trivia", () => {
    expect(descriptionPlacesRoleAbroad("We meet once a year in a new location - past offsites have included Croatia, Italy and Portugal.", ["US"])).toBeNull();
  });
  it("drops a LatAm role labeled United States", () => {
    expect(descriptionPlacesRoleAbroad("Location: Colombia, Brazil, Costa Rica, Mexico. Work US hours.", ["US"])).toBe("Brazil");
  });
});

describe("regression cases from live postings", () => {
  it("doesn't drop a Denver company that mentions teammates abroad", () => {
    expect(descriptionPlacesRoleAbroad("Headquartered and based in Denver, Colorado, our team spans the globe, with teammates across Brazil, Poland, the Philippines, Mexico. Sell to home services pros.", ["US"])).toBeNull();
  });
  it("still catches the Korea role when the boilerplate says worldwide", () => {
    const d =
      "Lead growth across our largest strategic accounts in Korea. You will report to the Director of Sales, Korea. Korea's largest enterprise accounts. " +
      "Work with global partners. More than 20,000 organizations worldwide trust us.";
    expect(descriptionPlacesRoleAbroad(d, ["US"])).toBe("Korea");
  });
});
