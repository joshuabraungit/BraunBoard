import { describe, expect, it } from "vitest";
import { cleanAsk, renderAsk } from "../src/lib/ask";

describe("cleanAsk", () => {
  it("rejects a bad email or a too-short message", () => {
    expect(cleanAsk({ email: "nope", message: "Is this offer any good?" })).toEqual({ ok: false, status: "invalid" });
    expect(cleanAsk({ email: "a@b.com", message: "hi" })).toEqual({ ok: false, status: "short" });
  });
  it("trims, lowercases the email and caps lengths", () => {
    const r = cleanAsk({ email: "  Rep@Example.COM ", message: "x".repeat(5000), offer: " $150K OTE " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("rep@example.com");
      expect(r.value.message.length).toBe(3000);
      expect(r.value.offer).toBe("$150K OTE");
    }
  });
});

describe("renderAsk", () => {
  const job = { id: "1", slug: "ae-acme", title_raw: "Account Executive", company_name: "Acme", salary_min: null, salary_max: null, ote_min: 200000, ote_max: 240000 };
  it("names the job in the subject and links to it", () => {
    const m = renderAsk({ email: "rep@x.com", name: "Sam", message: "Is the OTE real?", offer: "" }, job, "https://www.braunboard.com");
    expect(m.subject).toBe("Ask Josh: Account Executive at Acme");
    expect(m.html).toContain("https://www.braunboard.com/jobs/ae-acme");
    expect(m.text).toContain("Sam (rep@x.com)");
  });
  it("escapes what people type", () => {
    const m = renderAsk({ email: "rep@x.com", name: "", message: "<script>alert(1)</script> ok", offer: "" }, null, "https://x");
    expect(m.html).not.toContain("<script>");
    expect(m.subject).toBe("Ask Josh: a question from rep@x.com");
  });
});
