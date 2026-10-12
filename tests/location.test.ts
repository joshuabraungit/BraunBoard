import { describe, expect, it } from "vitest";
import { parseLocation } from "../src/lib/ingest/location";

describe("parseLocation", () => {
  it.each([
    ["San Francisco, CA", "CA", "Unknown"],
    ["New York, New York", "NY", "Unknown"],
    ["Remote - US", null, "Remote"],
    ["Remote (United States)", null, "Remote"],
    ["Hybrid - Austin, TX", "TX", "Hybrid"],
    ["NYC", "NY", "Unknown"],
    ["London / New York, NY", "NY", "Unknown"],
  ])("%s is US", (raw, state, remote) => {
    const p = parseLocation(raw);
    expect(p.is_us).toBe(true);
    expect(p.state).toBe(state);
    expect(p.remote_type).toBe(remote);
  });

  it.each(["London, UK", "Toronto, ON", "Remote - EMEA", "Remote (Canada)", "Berlin"])("%s is not US", (raw) => {
    expect(parseLocation(raw).is_us).toBe(false);
  });

  it("uses structured hints", () => {
    const p = parseLocation("HQ", { country: "USA", region: "NY", city: "New York City", workplace: "Hybrid" });
    expect(p).toMatchObject({ is_us: true, state: "NY", remote_type: "Hybrid" });
  });

  it("keeps bare Remote but leaves country unknown so it's flagged for review", () => {
    const p = parseLocation("Remote");
    expect(p.is_us).toBe(true);
    expect(p.country).toBeNull();
  });
});

describe("foreign remote qualifiers (seen in real data)", () => {
  it.each(["Remote - Colombia", "Remote - China", "Remote (Brazil)", "Remote - LATAM", "Remote - Spain", "Remote, Philippines"])("%s is not US", (raw) => {
    expect(parseLocation(raw).is_us).toBe(false);
  });
  it.each(["Remote - US West", "Remote - US", "Remote (USA)", "Remote - California", "Remote - East Coast", "US DC - Remote", "Remote - Colombia / Remote - US"])("%s is US", (raw) => {
    expect(parseLocation(raw).is_us).toBe(true);
  });
});

describe("US remote qualifiers wrongly dropped in the first reprocess", () => {
  it.each(["Remote - Washington D.C.", "Remote - SF Bay Area", "Remote - Austin, TX", "Remote - NYC", "Remote - Pacific Northwest"])("%s is US", (raw) => {
    expect(parseLocation(raw).is_us).toBe(true);
  });
});

describe("city cleanup", () => {
  it("never uses 'Remote' as a city", () => {
    expect(parseLocation("Remote-Texas").city).toBeNull();
    expect(parseLocation("x", { country: "US", region: "TX", city: "Remote" }).city).toBeNull();
  });
});
