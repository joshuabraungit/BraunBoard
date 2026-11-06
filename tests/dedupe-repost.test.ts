import { describe, expect, it } from "vitest";
import { descriptionSimilarity, DUPLICATE_THRESHOLD, looksLikeRepost, sameTitle } from "../src/lib/ingest/dedupe";

const intro =
  "Stripe is a financial infrastructure platform for businesses. As an Account Executive on the Platforms team you will win new software platforms that embed payments for their users, own the full sales cycle from first call to signed contract, and work with product and solutions partners to land complex deals.";
const body = Array.from({ length: 12 }, (_, i) => `Requirement ${i}: experience selling technical products to platform companies with long sales cycles and many stakeholders in the room.`).join(" ");

describe("looksLikeRepost", () => {
  it("catches a repost with a paragraph changed and pay added, which the strict bar misses", () => {
    const original = `${intro} ${body}`;
    const repost = `${intro} ${body.slice(0, body.length / 2)} The annual US base salary range for this role is $120,000 to $180,000 plus commission and equity. We also offer a hybrid schedule with three days in the Chicago office each week and a generous learning budget.`;
    expect(descriptionSimilarity(original, repost)).toBeLessThan(DUPLICATE_THRESHOLD);
    expect(looksLikeRepost(original, repost)).toBe(true);
  });

  it("keeps two different openings apart even when the boilerplate matches", () => {
    const janitorial = `Sell janitorial contracts to office buildings across Tampa, meeting facility managers and building owners every week to grow the territory from scratch. ${body}`;
    const cbs = `Sell commercial building services like window washing, pressure washing and floor care to property managers in an existing book of business. ${body}`;
    expect(looksLikeRepost(janitorial, cbs)).toBe(false);
  });
});

describe("sameTitle", () => {
  it("ignores case and spacing only", () => {
    expect(sameTitle("Account Executive, Platforms - Hunter", "account executive,  platforms - hunter ")).toBe(true);
    expect(sameTitle("Account Executive, Platforms - Hunter", "Account Executive, Platforms (Hunter)")).toBe(false);
  });
});
