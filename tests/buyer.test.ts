import { describe, expect, it } from "vitest";
import { cleanBuyer, quoteInPosting } from "../src/lib/ingest/buyer";

const POSTING = "Engage with CFOs and finance leaders regularly. Experience selling into professional sports, media, or live-events organizations.";

describe("buyer extraction cleanup", () => {
  it("keeps a specific buyer backed by a real quote", () => {
    expect(cleanBuyer({ buyer: "CFOs and finance leaders", buyer_quote: "Engage with CFOs and finance leaders regularly" }, POSTING).buyer).toBe("CFOs and finance leaders");
  });
  it("tolerates curly quotes and spacing", () => {
    expect(quoteInPosting("engage  with CFOs and finance leaders", POSTING)).toBe(true);
  });
  it("drops answers whose quote isn't in the posting", () => {
    expect(cleanBuyer({ buyer: "CFOs", buyer_quote: "sell to CFOs at banks" }, POSTING).buyer).toBeNull();
  });
  it("drops generic buyers", () => {
    expect(cleanBuyer({ buyer: "C-suite executives", buyer_quote: "Engage with CFOs and finance leaders" }, POSTING).buyer).toBeNull();
    expect(cleanBuyer({ buyer: "Decision makers", buyer_quote: "Engage with CFOs and finance leaders" }, POSTING).buyer).toBeNull();
  });
  it("keeps a quoted industry", () => {
    expect(cleanBuyer({ industry: "Sports and media", industry_quote: "professional sports, media, or live-events organizations" }, POSTING).industry).toBe("Sports and media");
  });
});

import { firstJsonObject } from "../src/lib/ingest/buyer";
describe("reply parsing", () => {
  it("reads the first JSON object even with text after it", () => {
    expect(firstJsonObject('{"buyer": "Lenders", "x": {"y": 1}}\n\nNote: {extra}')).toEqual({ buyer: "Lenders", x: { y: 1 } });
  });
});
