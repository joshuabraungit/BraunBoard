import { describe, expect, it } from "vitest";
import { deviceOf, isBot, sourceOf, visitorCode } from "../src/lib/visits";

describe("where visits come from", () => {
  it("names the big sites", () => {
    expect(sourceOf("/jobs", "https://www.linkedin.com/")).toBe("LinkedIn");
    expect(sourceOf("/jobs", "https://lnkd.in/abc")).toBe("LinkedIn");
    expect(sourceOf("/", "https://www.google.co.uk/")).toBe("Google");
    expect(sourceOf("/", "https://old.reddit.com/r/sales")).toBe("Reddit");
    expect(sourceOf("/", "https://t.co/x")).toBe("X");
    expect(sourceOf("/", "https://chatgpt.com/")).toBe("ChatGPT");
  });
  it("our own pages and no referrer are Direct", () => {
    expect(sourceOf("/jobs", "")).toBe("Direct");
    expect(sourceOf("/jobs", "https://www.braunboard.com/kit")).toBe("Direct");
  });
  it("link tags win over the referrer", () => {
    expect(sourceOf("/kit?from=alert-email#top-five", "https://mail.google.com/")).toBe("Email");
    expect(sourceOf("/?utm_source=linkedin", "")).toBe("LinkedIn");
    expect(sourceOf("/?utm_source=picks", "")).toBe("Email");
  });
  it("other sites show their address", () => {
    expect(sourceOf("/", "https://news.ycombinator.com/item?id=1")).toBe("news.ycombinator.com");
  });
});

describe("counting people, not bots", () => {
  it("skips bots and our own health check", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("LinkedInBot/1.0")).toBe(true);
    expect(isBot("BraunBoard-HealthCheck")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe(false);
  });
  it("tells phones from computers", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari")).toBe("Phone");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari")).toBe("Computer");
  });
  it("the visitor code changes every day", () => {
    const a = visitorCode("1.2.3.4", "ua", "s", "2026-10-26");
    expect(visitorCode("1.2.3.4", "ua", "s", "2026-10-26")).toBe(a);
    expect(visitorCode("1.2.3.4", "ua", "s", "2026-10-27")).not.toBe(a);
  });
});
