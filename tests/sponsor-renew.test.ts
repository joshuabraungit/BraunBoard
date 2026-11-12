import { beforeAll, describe, expect, it } from "vitest";
import { readRenewToken, renderRenewReminder, renderThanksEmail, renewToken } from "../src/lib/sponsor-renew";

beforeAll(() => { process.env.ALERTS_LINK_SECRET = "test-secret"; });

const id = "cc74e6c6-a268-47c5-9c30-7d2e2119c610";

describe("renew links", () => {
  it("round-trips and rejects tampering", () => {
    expect(readRenewToken(renewToken(id))).toBe(id);
    expect(readRenewToken(renewToken(id).slice(0, -1) + "x")).toBeNull();
    expect(readRenewToken(`${id.replace("c", "d")}.${renewToken(id).split(".")[1]}`)).toBeNull();
    expect(readRenewToken("")).toBeNull();
  });
});

describe("5 days left email", () => {
  const o = { id, job_title: "Director of Growth", company: "Embold Research", contact_name: "Abbe Vacek", email: "a@x.com", ends_at: "2026-12-03T13:18:00Z", review_token: "abc123" };
  it("shares results, asks how it went, offers the deck, never asks for money", () => {
    const m = renderRenewReminder(o);
    expect(m.subject).toBe("How'd the Director of Growth search go?");
    expect(m.text).toContain("Hi Abbe,");
    expect(m.text).toContain("Thursday, December 3");
    expect(m.text).toContain("/results/abc123");
    expect(m.text).toContain("Did you find your person?");
    expect(m.text).toContain("I'd be grateful for your honest take");
    expect(m.text).toMatch(/Either way, I'd like to send you a deck of Tongue Tied[\s\S]*Josh$/);
    expect(m.html).toContain("See your results");
    expect(m.text).not.toMatch(/renew|\$|\bbut\b|\blove\b/i);
    expect(m.text).not.toMatch(/\u2014/);
  });
});

describe("end-of-run thanks", () => {
  it("thanks them, offers the deck, and doesn't pitch", () => {
    const m = renderThanksEmail({ id, job_title: "Director of Growth", contact_name: "Abbe Vacek", email: "a@x.com" });
    expect(m.subject).toBe("Thanks for sponsoring Director of Growth");
    expect(m.text).toContain("Hi Abbe,");
    expect(m.text).toContain("Tongue Tied");
    expect(m.text).toContain("Did you find your person?");
    expect(m.text).toContain("Either way, I'd like to send you a deck of Tongue Tied");
    expect(m.text).toContain("I'd be grateful for your honest take");
    expect(m.text).not.toMatch(/renew|\$|\bbut\b/i);
    expect(m.text).not.toMatch(/\u2014/);
  });
});
