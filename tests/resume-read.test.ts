import { describe, expect, it } from "vitest";
import { cleanPrefill } from "../src/lib/resume-read";

describe("résumé prefill", () => {
  it("keeps valid answers and the summary", () => {
    const r = cleanPrefill({
      roles: ["sdr", "ae", "ae"],
      country: "US",
      location: "Los Angeles, CA",
      work: "remote",
      motion: "new",
      sizes: ["growth"],
      current_role: "SDR at Acme",
      years_selling: 1.4,
      sold_to: "restaurant owners",
      industries: "hospitality",
    });
    expect(r.answers.roles).toEqual(["sdr", "ae"]);
    expect(r.answers.country).toBe("US");
    expect(r.answers.work).toBe("remote");
    expect(r.answers.motion).toBe("new");
    expect(r.answers.sizes).toEqual(["growth"]);
    expect(r.saw.years_selling).toBe(1);
    expect(r.saw.sold_to).toBe("restaurant owners");
  });
  it("drops anything that isn't a real choice instead of guessing", () => {
    const r = cleanPrefill({ roles: ["ceo", 3], country: "France", work: "any", motion: "either", sizes: ["huge"], years_selling: -2, location: "  " });
    expect(r.answers).toEqual({});
    expect(r.saw).toEqual({ current_role: null, years_selling: null, sold_to: null, industries: null });
  });
  it("never passes pay or dealbreakers through", () => {
    const r = cleanPrefill({ roles: ["ae"], min_base: 120000, min_ote: 240000, dealbreakers: ["commission_only"] });
    expect(Object.keys(r.answers)).toEqual(["roles"]);
  });
});

describe("readResume", () => {
  it("sends a PDF as a document and reads the reply", async () => {
    const { readResume } = await import("../src/lib/resume-read");
    const { vi } = await import("vitest");
    let sent: { messages: { content: { type: string }[] }[] } | undefined;
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ content: [{ type: "text", text: 'Sure: {"roles":["ae"],"country":"US","current_role":"SDR at Acme"}' }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await readResume({ pdf: Buffer.from("%PDF-1.4 test") }, "test-key");
    vi.unstubAllGlobals();
    expect(sent!.messages[0].content[0].type).toBe("document");
    expect(r.answers).toEqual({ roles: ["ae"], country: "US" });
    expect(r.saw.current_role).toBe("SDR at Acme");
  });
});
