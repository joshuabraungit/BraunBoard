import { describe, expect, it } from "vitest";
import { renderAlert, type AlertItem } from "../src/lib/alerts/email";

const item = (extra: Partial<AlertItem> = {}): AlertItem => ({
  match_id: "m1", job_slug: "ae-acme", title: "Account Executive", company: "Acme", score: 90,
  salary_min: 100000, salary_max: 120000, ote_min: 200000, ote_max: 240000, currency: "USD", remote_type: "Remote", location: null, ...extra,
});

describe("renderAlert", () => {
  it("shows red flags and questions under each job, in html and text", () => {
    const msg = renderAlert("My watch", [item({ redFlags: ["No quota attainment shared"], questions: ["What percentage of reps hit quota last year?"] })], "https://x.test");
    for (const body of [msg.html, msg.text]) {
      expect(body).toContain("No quota attainment shared");
      expect(body).toContain("What percentage of reps hit quota last year?");
      expect(body).toContain("Ask before you say yes");
    }
  });
  it("leaves them out when there are none", () => {
    const msg = renderAlert("My watch", [item()], "https://x.test");
    expect(msg.html).not.toContain("Ask before you say yes");
    expect(msg.text).not.toContain("Red flag:");
  });
});
