import { describe, expect, it } from "vitest";
import { resolveCompensation } from "../src/lib/ingest/compensation";
import { motionFromTitle } from "../src/lib/hunter";
import { payPassage, sitePayUrl, stripeSlug } from "../src/lib/ingest/site-pay";

const none = { min: null, max: null, currency: null };

// Stripe's careers page, trimmed: the pay line says "base", a note further down says it's OTE for sales roles.
const STRIPE = `Pay and benefits
The annual US base salary range for this role is $283,600 - $425,400. This salary range may be inclusive of several career levels at Stripe and will be narrowed during the interview process based on a number of factors, including the candidate’s experience, qualifications, and location. Applicants interested in this role and who are not located in the US may request the annual salary range for their location during the interview process.
Additional benefits for this role may include: equity, company bonus or sales commissions/bonuses; 401(k) plan; medical, dental, and vision benefits; and wellness stipends.
For sales roles, the range provided is the role’s On Target Earnings ("OTE") range, meaning that the range includes both the sales commissions/sales bonuses target and annual base salary for the role.`;

describe("pay a note says is OTE", () => {
  it("reads Stripe's range as OTE, not base", () => {
    const c = resolveCompensation(none, STRIPE);
    expect(c.ote_min).toBe(283_600);
    expect(c.ote_max).toBe(425_400);
    expect(c.salary_min).toBeNull();
  });

  it("leaves a plain base range alone", () => {
    const c = resolveCompensation(none, "The annual US base salary range for this role is $150,000 - $175,000.");
    expect(c.salary_min).toBe(150_000);
    expect(c.ote_min).toBeNull();
  });

  it("builds Stripe's careers-page URL and finds the pay passage", () => {
    expect(stripeSlug("Account Executive, Enterprise - Hunter")).toBe("account-executive-enterprise-hunter");
    expect(sitePayUrl("stripe", "7994330", "Account Executive, Enterprise - Hunter")).toBe(
      "https://stripe.com/jobs/listing/account-executive-enterprise-hunter/7994330",
    );
    expect(sitePayUrl("acme", "1", "AE")).toBeNull();
    const p = payPassage(`Lots of words about Stripe. ${STRIPE}`)!;
    expect(resolveCompensation(none, p).ote_min).toBe(283_600);
  });
});

describe("hunter or farmer from the title", () => {
  it.each([
    ["Account Executive, Enterprise - Hunter", "New Logo"],
    ["Account Executive, Commercial (Hunter)", "New Logo"],
    ["New Business Account Executive", "New Logo"],
    ["Account Executive, Platforms (Grower)", "Expansion"],
    ["Account Executive, DACH, Commercial (Existing Business)", "Expansion"],
    ["Farmer AE, Mid-Market", "Expansion"],
    ["Account Executive, Hunter / Farmer", "Mixed"],
  ])("%s -> %s", (title, want) => {
    expect(motionFromTitle(title)).toBe(want);
  });

  it("says nothing when the title doesn't", () => {
    expect(motionFromTitle("Enterprise Account Executive")).toBeNull();
    expect(motionFromTitle("Account Executive, Bridge")).toBeNull();
  });
});

import { parseReread } from "../src/lib/ingest/motion-reread";

describe("second read for hunter or farmer", () => {
  const posting = "You will own a book of business of 40 existing accounts and grow them through upsell.";
  it("takes the answer when the quote is really in the posting", () => {
    const r = parseReread('{"answer":"Farmer","evidence":"own a book of business of 40 existing accounts"}', posting);
    expect(r.motion).toBe("Expansion");
  });
  it("throws out an answer whose quote isn't in the posting", () => {
    expect(parseReread('{"answer":"Hunter","evidence":"win net-new logos across the territory"}', posting).motion).toBe("Unknown");
  });
  it("keeps not stated as unknown", () => {
    expect(parseReread('{"answer":"Not stated","evidence":""}', posting).motion).toBe("Unknown");
  });
});
