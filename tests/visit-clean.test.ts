import { describe, expect, it } from "vitest";
import { cleanPath, cleanReferrer } from "../src/lib/visit-clean";
import { sourceOf } from "../src/lib/visits";

describe("analytics never keeps secrets from the address", () => {
  it("drops tokens, sign-in codes, Stripe session ids and emails", () => {
    expect(cleanPath("/sponsor/renew?t=SYNTHETIC_TOKEN_123")).toBe("/sponsor/renew");
    expect(cleanPath("/alerts/off?t=abc.def")).toBe("/alerts/off");
    expect(cleanPath("/email/unsubscribe?t=abc")).toBe("/email/unsubscribe");
    expect(cleanPath("/picks/unsubscribe?s=abc")).toBe("/picks/unsubscribe");
    expect(cleanPath("/sponsor/thanks?session_id=cs_test_SYNTHETIC")).toBe("/sponsor/thanks");
    expect(cleanPath("/?code=SYNTHETIC_OAUTH_CODE&token_hash=x&type=magiclink")).toBe("/");
    expect(cleanPath("/kit?email=test%40example.com")).toBe("/kit");
    expect(cleanPath("/jobs#access_token=SYNTHETIC")).toBe("/jobs");
  });
  it("masks the token in a review link", () => {
    expect(cleanPath("/review/SYNTHETIC_REVIEW_TOKEN")).toBe("/review/[token]");
    expect(cleanPath("/review/SYNTHETIC_REVIEW_TOKEN?x=1")).toBe("/review/[token]");
  });
  it("keeps the link tags the Visitors page needs", () => {
    expect(cleanPath("/kit?from=alert-email&t=secret")).toBe("/kit?from=alert-email");
    expect(cleanPath("/?utm_source=linkedin&utm_campaign=report&fbclid=zzz")).toBe("/?utm_source=linkedin&utm_campaign=report");
    expect(cleanPath("/?utm_source=someone%40example.com")).toBe("/");
  });
  it("rejects things that aren't our own paths", () => {
    expect(cleanPath("https://evil.example/x")).toBe("");
    expect(cleanPath("//evil.example/x")).toBe("");
    expect(cleanPath("")).toBe("");
  });
  it("referrer becomes just the site", () => {
    expect(cleanReferrer("https://www.linkedin.com/feed/?trk=abc&token=zzz")).toBe("https://www.linkedin.com");
    expect(cleanReferrer("https://mail.google.com/mail/u/0/#inbox/SECRET")).toBe("https://mail.google.com");
    expect(cleanReferrer("javascript:alert(1)")).toBe("");
    expect(cleanReferrer("not a url")).toBe("");
  });
  it("sources still come out the same after cleaning", () => {
    expect(sourceOf(cleanPath("/kit?from=alert-email&t=x"), cleanReferrer("https://mail.google.com/x"))).toBe("Email");
    expect(sourceOf(cleanPath("/?utm_source=linkedin"), "")).toBe("LinkedIn");
    expect(sourceOf(cleanPath("/jobs"), cleanReferrer("https://www.reddit.com/r/sales/comments/1"))).toBe("Reddit");
    expect(sourceOf(cleanPath("/jobs"), cleanReferrer("https://www.braunboard.com/kit?t=1"))).toBe("Direct");
  });
});
