import { describe, expect, it } from "vitest";
import { classifyTitle, normalizeTitle } from "../src/lib/ingest/classify";

describe("classifyTitle: spec section 8 examples", () => {
  it.each([
    "Sr. Enterprise Account Executive",
    "Enterprise AE",
    "Enterprise Sales Executive",
    "Strategic Enterprise Account Executive",
  ])("%s -> Account Executive", (t) => {
    const c = classifyTitle(t)!;
    expect(c.role_family).toBe("Account Executive");
    expect(["Enterprise", "Strategic"]).toContain(c.sales_segment);
  });

  it("segments from title", () => {
    expect(classifyTitle("Sr. Enterprise Account Executive")!.sales_segment).toBe("Enterprise");
    expect(classifyTitle("Strategic Account Executive")!.sales_segment).toBe("Strategic");
    expect(classifyTitle("Mid-Market Account Executive")!.sales_segment).toBe("Mid-Market");
    expect(classifyTitle("SMB Account Executive")!.sales_segment).toBe("SMB");
    expect(classifyTitle("Account Executive")!.sales_segment).toBe("Unknown");
  });
});

describe("classifyTitle: included roles (spec section 3)", () => {
  it.each([
    ["Sales Development Representative", "SDR/BDR"],
    ["BDR, Outbound", "SDR/BDR"],
    ["Business Development Representative", "SDR/BDR"],
    ["Account Executive, Mid-Market", "Account Executive"],
    ["Account Manager", "Account Manager"],
    ["Expansion Account Executive", "Customer Expansion"],
    ["Solutions Engineer", "Sales Engineer"],
    ["Senior Sales Engineer", "Sales Engineer"],
    ["Sales Manager, West", "Sales Manager"],
    ["Manager, Sales Development", "Sales Manager"],
    ["Director of Sales", "Sales Director"],
    ["Regional Sales Director", "Sales Director"],
    ["VP of Sales", "VP Sales"],
    ["Vice President, Enterprise Sales", "VP Sales"],
    ["Chief Revenue Officer", "CRO"],
  ])("%s -> %s", (title, family) => {
    expect(classifyTitle(title)?.role_family).toBe(family);
  });

  it("assigns seniority", () => {
    expect(classifyTitle("Account Executive")!.seniority).toBe("Individual Contributor");
    expect(classifyTitle("Sales Manager")!.seniority).toBe("Manager");
    expect(classifyTitle("Director of Sales")!.seniority).toBe("Director");
    expect(classifyTitle("VP Sales")!.seniority).toBe("Executive");
  });

  it("flags channel roles", () => {
    expect(classifyTitle("Channel Account Executive")!.is_channel).toBe(true);
  });

  it.each([
    "Partner Manager, RFQ",
    "Strategic Account Executive - AI & LLM Partnerships",
    "Startups Sales Manager, Platform Partnerships",
    "Alliances Manager",
    "Technical Business Development Manager, Startup & VC Ecosystem",
  ])("%s -> partnerships", (t) => {
    expect(classifyTitle(t)!.is_channel).toBe(true);
  });

  it.each([
    ["Partnerships Manager", "Account Executive"],
    ["Channel Manager", "Account Executive"],
    ["Channel Account Manager", "Account Manager"],
    ["Head of Partnerships", "VP Sales"],
    ["Head of Channel Sales", "VP Sales"],
    ["Partnerships Director", "Sales Director"],
    ["Channel Director", "Sales Director"],
    ["VP Partnerships", "VP Sales"],
    ["VP Channel", "VP Sales"],
    ["Chief Partnerships Officer", "CRO"],
  ])("%s -> %s, partnerships", (t, family) => {
    const c = classifyTitle(t)!;
    expect(c.role_family).toBe(family);
    expect(c.is_channel).toBe(true);
  });

  it.each(["Partner Operations Manager", "Creator Partnerships Lead", "Director of Channel Marketing"])("%s -> excluded", (t) => {
    expect(classifyTitle(t)).toBeNull();
  });

  it.each(["Client Partner", "Client Partner, Scaled Accounts", "Account Partner - Crossix Enterprise Sales", "Enterprise Account Executive"])(
    "%s -> not partnerships",
    (t) => {
      expect(classifyTitle(t)?.is_channel ?? false).toBe(false);
    },
  );
});

describe("classifyTitle: excluded roles", () => {
  it.each([
    "Retail Sales Associate",
    "Insurance Sales Agent",
    "Real Estate Agent",
    "Commission-Only Sales Rep",
    "Store Associate",
    "Customer Service Representative",
    "Technical Recruiter",
    "Director, People Business Partner – AMER Field Sales",
    "People Business Partner, GTM (Post Sales & Sales Development)",
    "Product Marketing Manager",
    "Revenue Operations Manager",
    "Sales Operations Analyst",
    "Sales Enablement Manager",
    "Software Engineer",
    "Sales Development Intern",
  ])("%s -> excluded", (t) => {
    expect(classifyTitle(t)).toBeNull();
  });
});

describe("normalizeTitle", () => {
  it("collapses variants", () => {
    expect(normalizeTitle("Sr. Enterprise AE (Remote, US)")).toBe("senior enterprise account executive");
    expect(normalizeTitle("Senior Enterprise Account Executive - NYC")).toBe("senior enterprise account executive");
  });
});

describe("exclusions found in real data", () => {
  it.each(["Technical Account Manager 3", "Future Account Manager Opportunities", "Account Executive - General Application", "Sales Talent Community"])("%s -> excluded", (t) => {
    expect(classifyTitle(t)).toBeNull();
  });
  it("keeps real roles", () => {
    expect(classifyTitle("Account Executive, Select, Phoenix")?.role_family).toBe("Account Executive");
  });
});

describe("more exclusions + VP variants (seen in real data)", () => {
  it.each(["Engineering Manager, Growth Expansion", "Senior Software Engineer, Sales Tools", "Staff Engineer, Revenue Platform"])("%s -> excluded", (t) => {
    expect(classifyTitle(t)).toBeNull();
  });
  it.each(["Solutions Engineer", "Senior Legal Solutions Engineer", "Sales Engineer 2 (Customer Success)", "Value Engineer"])("%s still included", (t) => {
    expect(classifyTitle(t)?.role_family).toBe("Sales Engineer");
  });
  it("RVP is VP Sales", () => {
    expect(classifyTitle("RVP, Enterprise Sales - Northeast")?.role_family).toBe("VP Sales");
  });
});

describe("Strategic Cuisines", () => {
  it("is a restaurant category, not the Strategic segment", () => {
    expect(classifyTitle("Bilingual Strategic Cuisines Account Executive (Mandarin) - West Coast")?.sales_segment).toBe("Unknown");
    expect(classifyTitle("Strategic Account Executive")?.sales_segment).toBe("Strategic");
  });
});
