import { describe, expect, it } from "vitest";
import { firstNote, likelyManagers, linkedinSearch, midSentence } from "../src/lib/reach-out";
import { PROOF_PROMPT, proofPromptFor } from "../src/lib/proof-prompt";

describe("reach out", () => {
  it("guesses who owns the hire", () => {
    expect(likelyManagers("Account Executive")).toEqual(["Sales Manager", "VP of Sales"]);
    expect(likelyManagers("SDR/BDR", "startup")).toContain("Founder");
    expect(likelyManagers("CRO", "startup")).toEqual(["CEO"]);
  });
  it("builds a LinkedIn people search", () => {
    expect(linkedinSearch("Acme", "VP of Sales")).toBe("https://www.linkedin.com/search/results/people/?keywords=Acme%20VP%20of%20Sales");
  });
  it("reads headlines mid-sentence and keeps acronyms", () => {
    expect(midSentence("Scheduling tools for clinics.")).toBe("scheduling tools for clinics");
    expect(midSentence("AI tools for lawyers")).toBe("AI tools for lawyers");
  });
  it("writes the first note from what the posting says", () => {
    const n = firstNote({ title: "Account Executive", sells: "Scheduling tools for clinics", buyer: "Clinic owners" });
    expect(n.subject).toBe("Your Account Executive opening");
    expect(n.body).toContain("Saw you're hiring an Account Executive to sell scheduling tools for clinics to clinic owners. I applied");
    expect(n.body).toContain("the five companies I'd reach out to first");
    expect(n.body).toContain("Here it is: [your Proof page link]");
    expect(n.body).not.toMatch(/no worries|not sure|hope you find/i);
    expect(firstNote({ title: "AE", company: "Acme" }).subject).toBe("How I'd start at Acme");
    expect(n.body).not.toMatch(/\bbut\b/i);
  });
  it("still reads with nothing known", () => {
    expect(firstNote({ title: "SDR" }).body).toContain("Saw you're hiring an SDR. I applied");
    expect(firstNote({ title: "Sales Manager" }).body).toContain("hiring a Sales Manager. I applied");
  });
  it("fills the job into the Proof page prompt", () => {
    const p = proofPromptFor({ title: "Account Executive", company: "Acme", url: "https://x.test/job", sells: "Scheduling tools", buyer: "Clinic owners" });
    expect(p).not.toContain("The job posting: [paste]");
    expect(p).toContain("- The job: Account Executive at Acme. Posting: https://x.test/job");
    expect(p).toContain("- Who I'd sell to: Clinic owners");
    expect(PROOF_PROMPT).toContain("The job posting: [paste]");
  });
});
