import { describe, expect, it } from "vitest";
import { parseJobBlock, toRawJob, workableAccount } from "../src/lib/ingest/adapters/workable";
import { candidateNote, normalizeDomain } from "../src/lib/ingest/discover";
import { locate } from "../src/lib/ingest/pipeline";

// Shape from Workable's "Utilizing the XML Job Feed" help article.
const block = `<job>
  <title><![CDATA[Account Executive, Mid-Market]]></title>
  <date><![CDATA[Sun, 29 Dec 2019 11:02:25 UTC]]></date>
  <referencenumber><![CDATA[A1B2C3D4E5]]></referencenumber>
  <url><![CDATA[https://apply.workable.com/j/A1B2C3D4E5]]></url>
  <company><![CDATA[Acme Co]]></company>
  <city><![CDATA[Austin]]></city>
  <state><![CDATA[Texas]]></state>
  <country><![CDATA[US]]></country>
  <postalcode><![CDATA[78701]]></postalcode>
  <remote><![CDATA[false]]></remote>
  <description><![CDATA[<p>Sell our platform to <strong>mid-market</strong> finance teams.</p><ul><li>Base $90k, OTE $180k</li></ul>]]></description>
  <jobtype><![CDATA[Full-time]]></jobtype>
  <website><![CDATA[https://www.acme.co]]></website>
`;

describe("Workable feed", () => {
  it("parses a job and keeps the URL exactly as given", () => {
    const j = parseJobBlock(block)!;
    expect(j.title).toBe("Account Executive, Mid-Market");
    expect(j.account).toBe("acme.co");
    const raw = toRawJob(j, "Acme Co");
    expect(raw.apply_url).toBe("https://apply.workable.com/j/A1B2C3D4E5");
    expect(raw.source_job_id).toBe("A1B2C3D4E5");
    expect(raw.location).toBe("Austin, Texas, United States");
    expect(raw.description).toContain("Base $90k, OTE $180k");
    expect(raw.description).not.toContain("<");
    expect(raw.posted_at).toBe("2019-12-29T11:02:25.000Z");
  });

  it("doesn't read India's IN as Indiana", () => {
    const j = parseJobBlock(block.replace("<![CDATA[Austin]]>", "<![CDATA[Sriperumbudur]]>").replace("<![CDATA[Texas]]>", "<![CDATA[Tamil Nadu]]>").replace("<![CDATA[US]]>", "<![CDATA[IN]]>"))!;
    expect(locate(toRawJob(j, "Acme")).markets).toEqual([]);
  });

  it("marks remote jobs", () => {
    const j = parseJobBlock(block.replace("<![CDATA[false]]>", "<![CDATA[true]]>"))!;
    expect(toRawJob(j, "Acme").workplace_type).toBe("Remote");
  });

  it("keys a company by its website, or its name when there's none", () => {
    expect(workableAccount("https://www.Foo-Bar.com/jobs", "Foo Bar")).toBe("foo-bar.com");
    expect(workableAccount("", "Foo Bar, Inc.")).toBe("name:foo-bar-inc");
  });
});

describe("discovery checks", () => {
  it("flags recruiters, consumer sales and commission-only", () => {
    expect(candidateNote("Apex Staffing Group", ["Account Executive"], [""])).toMatch(/recruiter/);
    expect(candidateNote("Sunny Solar", ["Sales Rep"], [""])).toMatch(/consumer/);
    expect(candidateNote("Acme", ["SDR"], ["This is a 100% commission role"])).toMatch(/Commission/);
    expect(candidateNote("Acme", ["Account Executive"], ["Sell software to IT teams."])).toBeNull();
    expect(candidateNote("American Income Life", ["Sales Manager"], ["Help families protect their future."], "fisheragencies.com")).toMatch(/consumer/);
    expect(candidateNote("European Wax Center", ["Center Sales Director"], ["Lead the front desk team."], "ewcgrowth.com")).toMatch(/consumer/);
    expect(candidateNote("SmartRoof", ["Entry Level Sales Representative"], ["Meet homeowners."], "smartroof.com")).toMatch(/consumer/);
    expect(candidateNote("Glowly", ["Sales Representative"], ["Meet with families in their homes to explain our plans."])).toMatch(/B2B/);
  });
  it("cleans up domains", () => {
    expect(normalizeDomain("https://www.Acme.co/careers")).toBe("acme.co");
    expect(normalizeDomain("not a site")).toBeNull();
  });
});
