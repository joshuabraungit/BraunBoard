import { beforeAll, describe, expect, it } from "vitest";
import { offToken, readOffToken } from "../src/lib/alerts/off";
import { renderAlert } from "../src/lib/alerts/email";

beforeAll(() => { process.env.ALERTS_LINK_SECRET = "test-secret"; });

describe("turn-off links", () => {
  const u = "4a754425-c807-4bd1-9db5-635fa638afd9", w = "0b6f6f3e-1111-4222-8333-944455556666";
  it("round-trips a watch and the watched-companies email", () => {
    expect(readOffToken(offToken(u, w))).toEqual({ userId: u, watchId: w });
    expect(readOffToken(offToken(u, null))).toEqual({ userId: u, watchId: null });
  });
  it("rejects tampered or missing codes", () => {
    const t = offToken(u, w);
    const [body] = t.split(".");
    const other = Buffer.from(`${u}.someone-elses-watch`).toString("base64url");
    expect(readOffToken(`${other}.${t.split(".")[1]}`)).toBeNull();
    expect(readOffToken(`${body}.nope`)).toBeNull();
    expect(readOffToken("")).toBeNull();
  });
  it("puts the link in the email footer, html and text", () => {
    const item = { match_id: "m", job_slug: "j", title: "AE", company: "Acme", score: 1, salary_min: null, salary_max: null, ote_min: null, ote_max: null, remote_type: "Remote", location: null };
    const msg = renderAlert("SDR/BDR", [item], "https://x.test", "https://x.test/alerts/off?t=abc");
    expect(msg.html).toContain("Turn off these alerts");
    expect(msg.text).toContain("https://x.test/alerts/off?t=abc");
  });
});
