import { describe, expect, it } from "vitest";
import { mightBeFirstAe } from "../src/lib/ingest/first-ae";

describe("mightBeFirstAe (cheap first pass before the AI reads it)", () => {
  it("lets through junior titles and short experience asks", () => {
    expect(mightBeFirstAe("Associate Account Executive", "We sell software.", "Account Executive")).toBe(true);
    expect(mightBeFirstAe("SMB Account Executive", "1–3 years as an SDR, or 1–2 years of full-cycle sales", "Account Executive")).toBe(true);
    expect(mightBeFirstAe("Account Executive", "1+ years of closing experience", "Account Executive")).toBe(true);
  });
  it("skips senior titles and non-AE roles", () => {
    expect(mightBeFirstAe("Senior Account Executive", "1+ years of closing experience", "Account Executive")).toBe(false);
    expect(mightBeFirstAe("Lakebase Sales Specialist, Associate Director", "", "Account Executive")).toBe(false);
    expect(mightBeFirstAe("SDR", "0-2 years", "SDR/BDR")).toBe(false);
  });
  it("skips postings with no hint at all", () => {
    expect(mightBeFirstAe("Account Executive", "5+ years of enterprise closing experience.", "Account Executive")).toBe(false);
  });
});
