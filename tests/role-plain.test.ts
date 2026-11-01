import { describe, expect, it } from "vitest";
import { rolePlainProblems, roleJargonIn } from "../src/lib/ingest/role-plain";

describe("what you'd do, in plain English", () => {
  it("catches sales jargon", () => {
    expect(roleJargonIn("Sell to enterprise buyers in EMEA, covering new logos and expansion.")).toEqual(expect.arrayContaining(["enterprise", "emea", "new logos", "expansion"]));
  });
  it("passes a plain line", () => {
    expect(rolePlainProblems("Find and win new customers at very big companies in Europe. You'll book most of your own meetings.")).toEqual([]);
  });
  it("flags long lines and em dashes", () => {
    expect(rolePlainProblems(`${"word ".repeat(50)}`).length).toBe(1);
    expect(rolePlainProblems("Sell to restaurants — mostly by phone.")).toContain("No em dashes.");
  });
});
