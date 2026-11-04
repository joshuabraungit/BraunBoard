import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { resumeGate, resumeIpHash } = await import("../src/lib/resume-limit");

describe("resumeGate", () => {
  it("lets a normal visitor through", () => {
    expect(resumeGate(0, 0, 5, 300)).toBe("ok");
    expect(resumeGate(4, 299, 5, 300)).toBe("ok");
  });
  it("slows one visitor down after the hourly cap", () => {
    expect(resumeGate(5, 10, 5, 300)).toBe("slow");
  });
  it("stops everyone once the site-wide daily cap is hit", () => {
    expect(resumeGate(0, 300, 5, 300)).toBe("busy");
  });
});

describe("resumeIpHash", () => {
  it("never stores the raw IP and is stable", () => {
    const h = resumeIpHash("203.0.113.9");
    expect(h).not.toContain("203.0.113.9");
    expect(h).toBe(resumeIpHash("203.0.113.9"));
    expect(h).not.toBe(resumeIpHash("203.0.113.10"));
  });
});
