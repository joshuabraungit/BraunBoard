import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkLogo, formatPrice, parseMoney, parseSponsorForm } from "../src/lib/sponsor-form";
import { formEncode, isSettled, verifyWebhook } from "../src/lib/stripe";

const good: Record<string, string> = {
  company: "Acme",
  contact_name: "Pat Lee",
  email: " Pat@Acme.com ",
  job_title: "Mid-Market AE",
  job_url: "https://acme.com/jobs/1",
  description: "Sell to ops leaders.",
  salary_min: "$90,000",
  salary_max: "110k",
  ote_min: "",
  ote_max: "",
  currency: "USD",
  location: "",
  remote_type: "Remote",
  start_date: "",
  notes: "",
  sales_role: "yes",
};
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("parseMoney", () => {
  it("reads the usual ways people type pay", () => {
    expect(parseMoney("$120,000")).toBe(120000);
    expect(parseMoney("120k")).toBe(120000);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("lots")).toBeNaN();
  });
});

describe("parseSponsorForm", () => {
  it("accepts a good order and cleans it up", () => {
    const r = parseSponsorForm(fd(good));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.order.email).toBe("pat@acme.com");
      expect(r.order.salary_min).toBe(90000);
      expect(r.order.salary_max).toBe(110000);
      expect(r.order.ote_min).toBeNull();
      expect(r.order.location).toBeNull();
    }
  });

  it("requires base pay, a sales role and a location for in-office jobs", () => {
    const r = parseSponsorForm(fd({ ...good, salary_min: "", sales_role: "", remote_type: "Hybrid" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["location", "salary_min", "sales_role"]);
  });

  it("catches backwards ranges, half an OTE and bad links", () => {
    const r = parseSponsorForm(fd({ ...good, salary_min: "150k", ote_min: "200k", job_url: "javascript:alert(1)" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.salary_max).toMatch(/at least/);
      expect(r.errors.ote_max).toMatch(/both/);
      expect(r.errors.job_url).toBeTruthy();
    }
  });

  it("rejects past start dates", () => {
    const r = parseSponsorForm(fd({ ...good, start_date: "2020-01-01" }));
    expect(r.ok).toBe(false);
  });
});

describe("checkLogo", () => {
  it("is optional and checks type and size", () => {
    expect(checkLogo(null)).toBeNull();
    expect(checkLogo(new File(["x"], "a.png", { type: "image/png" }))).toBeNull();
    expect(checkLogo(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/PNG/);
    expect(checkLogo(new File([new Uint8Array(3 * 1024 * 1024)], "a.png", { type: "image/png" }))).toMatch(/2MB/);
  });
});

describe("stripe helpers", () => {
  it("form-encodes nested params the way Stripe wants", () => {
    const s = formEncode({ line_items: [{ price_data: { unit_amount: 500 } }], mode: "payment" }).join("&");
    expect(s).toBe("line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=500&mode=payment");
  });

  it("verifies webhook signatures and rejects tampering or old events", () => {
    const secret = "whsec_test";
    const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    const t = 1_800_000_000;
    const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    expect(verifyWebhook(body, `t=${t},v1=${sig}`, secret, t)?.id).toBe("evt_1");
    expect(verifyWebhook(body + " ", `t=${t},v1=${sig}`, secret, t)).toBeNull();
    expect(verifyWebhook(body, `t=${t},v1=${sig}`, secret, t + 3600)).toBeNull();
    expect(verifyWebhook(body, null, secret, t)).toBeNull();
  });

  it("treats paid and fully discounted sessions as settled", () => {
    expect(isSettled({ status: "complete", payment_status: "paid" })).toBe(true);
    expect(isSettled({ status: "complete", payment_status: "no_payment_required" })).toBe(true);
    expect(isSettled({ status: "complete", payment_status: "unpaid" })).toBe(false);
    expect(isSettled({ status: "open", payment_status: "no_payment_required" })).toBe(false);
  });

  it("formats prices", () => {
    expect(formatPrice(150000)).toBe("$1,500");
    expect(formatPrice(49950)).toBe("$499.50");
  });
});
