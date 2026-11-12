import { afterEach, describe, expect, it, vi } from "vitest";
import { guessJobBasics, readJobBasics } from "../src/lib/sponsor-read";

const jd = "## Mid-Market Account Executive\nHybrid, 3 days a week in our Austin, TX office.\nSell to ops leaders.";
const reply = (text: string) =>
  new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status: 200, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("guessJobBasics", () => {
  it("takes the first short line as the title and spots hybrid/remote", () => {
    expect(guessJobBasics(jd)).toEqual({ job_title: "Mid-Market Account Executive", remote_type: "Hybrid", location: null });
    expect(guessJobBasics("AE\nFully remote, US only").remote_type).toBe("Remote");
    expect(guessJobBasics("AE\nIn our NYC office").remote_type).toBe("On-site");
  });
});

describe("readJobBasics", () => {
  it("uses the model's read when it's sensible", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply('{"job_title":"Mid-Market AE","remote_type":"Hybrid","location":"Austin, TX"}')));
    expect(await readJobBasics(jd, "key")).toEqual({ job_title: "Mid-Market AE", remote_type: "Hybrid", location: "Austin, TX" });
  });

  it("falls back to the plain guess on junk or errors, and never throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply('{"job_title":"","remote_type":"Sometimes"}')));
    expect(await readJobBasics(jd, "key")).toEqual(guessJobBasics(jd));
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await readJobBasics(jd, "key")).toEqual(guessJobBasics(jd));
    expect(await readJobBasics(jd, "")).toEqual(guessJobBasics(jd));
  });
});
