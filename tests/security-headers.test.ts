import { describe, expect, it } from "vitest";
import { enforcedCsp, reportOnlyCsp, securityHeaders } from "../src/lib/security-headers";

const get = (h: { key: string; value: string }[], k: string) => h.find((x) => x.key === k)?.value;

describe("security headers", () => {
  const h = securityHeaders({ supabaseUrl: "https://abc.supabase.co" });
  it("blocks framing two ways", () => {
    expect(get(h, "X-Frame-Options")).toBe("DENY");
    expect(enforcedCsp()).toContain("frame-ancestors 'none'");
  });
  it("sends nosniff, a referrer policy and a permissions policy", () => {
    expect(get(h, "X-Content-Type-Options")).toBe("nosniff");
    expect(get(h, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    const pp = get(h, "Permissions-Policy")!;
    expect(pp).toContain("camera=()");
    expect(pp).toContain("clipboard-write=(self)"); // copy buttons keep working
    expect(pp).toContain("fullscreen=(self)"); // video player keeps working
  });
  it("lets the renewal form hand off to Stripe Checkout", () => {
    expect(enforcedCsp()).toContain("form-action 'self' https://checkout.stripe.com");
  });
  it("report-only policy allows Supabase and the logo hosts, nothing wildcard-wide", () => {
    const csp = reportOnlyCsp({ supabaseUrl: "https://abc.supabase.co" });
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co");
    expect(csp).toContain("https://img.logo.dev");
    expect(csp).not.toMatch(/\s\*(\s|;|$)/);
    expect(csp).not.toContain("https:;");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("vercel.live");
  });
  it("only adds dev and preview extras where they belong", () => {
    expect(reportOnlyCsp({ dev: true })).toContain("'unsafe-eval'");
    expect(reportOnlyCsp({ preview: true })).toContain("https://vercel.live");
  });
  it("doesn't touch HSTS (Vercel already sends it)", () => {
    expect(get(h, "Strict-Transport-Security")).toBeUndefined();
  });
});
