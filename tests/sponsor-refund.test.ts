import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { canRefund, renderRefundEmail } = await import("../src/lib/sponsor");

const now = new Date("2026-11-02T15:00:00Z");
const order = { contact_name: "Sam Rivera", company: "Embold Research", job_title: "Director of Growth" } as never;

describe("cancel and refund", () => {
  it("only refunds jobs that aren't on the page yet", () => {
    expect(canRefund({ status: "paid", live_at: null }, now)).toBe(true);
    expect(canRefund({ status: "live", live_at: "2026-11-10T12:00:00Z" }, now)).toBe(true);
    expect(canRefund({ status: "live", live_at: "2026-11-01T12:00:00Z" }, now)).toBe(false);
    expect(canRefund({ status: "canceled", live_at: null }, now)).toBe(false);
  });

  it("writes a plain refund email, with Josh's reason when given", () => {
    const m = renderRefundEmail(order, 75000, "Sponsored jobs have to be sales roles.");
    expect(m.text).toContain("Hi Sam,");
    expect(m.text).toContain("I can't run this one on Braun Board. Sponsored jobs have to be sales roles.");
    expect(m.text).toContain("refunded the full $750");
    expect(m.text).not.toMatch(/—/); // no em dashes
    expect(renderRefundEmail(order, 0, null).text).toContain("Nothing was charged");
  });
});
