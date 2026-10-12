import { afterEach, describe, expect, it } from "vitest";
import { adminEmails, isAdmin } from "../src/lib/admin";

describe("admin access", () => {
  afterEach(() => delete process.env.ADMIN_EMAILS);
  it("defaults to Josh only, case-insensitive", () => {
    expect(adminEmails()).toEqual(["josh@joshbraun.com"]);
    expect(isAdmin({ email: "Josh@JoshBraun.com" })).toBe(true);
    expect(isAdmin({ email: "someone@else.com" })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
  it("reads a comma-separated list", () => {
    process.env.ADMIN_EMAILS = "a@x.com, b@y.com";
    expect(isAdmin({ email: "b@y.com" })).toBe(true);
  });
});
