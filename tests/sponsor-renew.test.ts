import { beforeAll, describe, expect, it } from "vitest";
import { readRenewToken, renderRenewReminder, renewToken } from "../src/lib/sponsor-renew";

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
  const o = { id, job_title: "Director of Growth", company: "Embold Research", contact_name: "Abbe Vacek", email: "a@x.com", ends_at: "2026-12-02T13:00:00Z" };
  it("is low pressure and says what happens either way", () => {
    const m = renderRenewReminder(o, "https://www.braunboard.com", 75000);
    expect(m.subject).toBe("Director of Growth has 5 days left on Braun Board");
    expect(m.text).toContain("another LinkedIn post and another newsletter send");
    expect(m.text).toContain("Hi Abbe,");
    expect(m.text).toContain("Wednesday, December 2");
    expect(m.text).toContain("If you've found your person, congrats.");
    expect(m.text).toContain("$750, one payment");
    expect(m.text).toContain("Nothing renews on its own");
    expect(m.text).toContain(`https://www.braunboard.com/sponsor/renew?t=${renewToken(id)}`);
    expect(m.html).toContain("Renew for 30 more days");
    expect(m.text).not.toMatch(/—/);
  });
});
