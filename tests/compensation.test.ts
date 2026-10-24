import { describe, expect, it } from "vitest";
import { findPayInText, payCurrency, resolveCompensation } from "../src/lib/ingest/compensation";

const none = { min: null, max: null, currency: null };

describe("trust rule: never invent compensation", () => {
  it("returns nulls when nothing is published", () => {
    const c = resolveCompensation(none, "Join our team selling to enterprise customers. Uncapped commission!");
    expect(c).toEqual({ salary_min: null, salary_max: null, ote_min: null, ote_max: null, currency: null });
  });

  it("ignores unlabeled ranges (could be base or OTE)", () => {
    const c = resolveCompensation(none, "Compensation: $150,000 - $300,000 depending on experience.");
    expect(c.salary_min).toBeNull();
    expect(c.ote_min).toBeNull();
  });

  it("ignores numbers that aren't money", () => {
    expect(findPayInText("Manage 150 - 200 accounts across 50 states")).toEqual([]);
  });
});

describe("labeled pay", () => {
  it("parses base and OTE written out", () => {
    const c = resolveCompensation(none, "The base salary range is $150,000 - $175,000. OTE is $300,000.");
    expect(c.salary_min).toBe(150000);
    expect(c.salary_max).toBe(175000);
    expect(c.ote_min).toBe(300000);
    expect(c.currency).toBe("USD");
  });

  it("parses K notation with OTE after the number", () => {
    const c = resolveCompensation(none, "Pay: $280K–$320K OTE with a 50/50 split.");
    expect(c.ote_min).toBe(280000);
    expect(c.ote_max).toBe(320000);
    expect(c.salary_min).toBeNull();
  });

  it("treats structured ATS ranges as base", () => {
    const c = resolveCompensation({ min: 140000, max: 160000, currency: "USD" }, "Great role.");
    expect(c.salary_min).toBe(140000);
    expect(c.ote_min).toBeNull();
  });

  it("re-labels a structured range as OTE when the posting says so", () => {
    const c = resolveCompensation(
      { min: 250000, max: 290000, currency: "USD" },
      "The on-target earnings for this role are $250,000 - $290,000.",
    );
    expect(c.ote_min).toBe(250000);
    expect(c.salary_min).toBeNull();
  });
});

describe("ATS OTE labels + plausibility (seen in real data)", () => {
  it("Ashby/Greenhouse ranges labeled OTE become OTE", () => {
    const c = resolveCompensation({ min: 310000, max: 407000, currency: "USD", isOte: true }, "");
    expect(c.ote_min).toBe(310000);
    expect(c.salary_min).toBeNull();
  });
  it("drops nonsense ranges like $14K-$214K", () => {
    const c = resolveCompensation({ min: 14000, max: 214000, currency: "USD" }, "");
    expect(c.salary_min).toBeNull();
    expect(c.ote_min).toBeNull();
  });
});

describe("OTE described as 'base + commission' (Verkada wording)", () => {
  const text =
    "Below is the annual on-target earnings (OTE) range for full-time employees for this position, comprised of base compensation and commissions (if applicable). Estimated Annual Pay Range $280,000-$320,000 USD";
  it("labels it OTE, never base", () => {
    const c = resolveCompensation({ min: 280000, max: 320000, currency: "USD" }, text);
    expect(c.ote_min).toBe(280000);
    expect(c.salary_min).toBeNull();
  });
  it("never shows the same range as both base and OTE", () => {
    const c = resolveCompensation({ min: 150000, max: 200000, currency: "USD" }, "Base salary: $150,000 - $200,000. OTE: $150,000 - $200,000.");
    expect(c.salary_min).toBeNull();
    expect(c.ote_min).toBe(150000);
  });
});

describe("crossed labels", () => {
  it("swaps base and OTE when OTE comes out lower than base", () => {
    const r = resolveCompensation(
      { min: 260000, max: 320000, currency: "USD" },
      "Salary Range: $260K-320k potential total on target earnings ($130K-$160k base + $130K-$160k commission), per year",
    );
    expect([r.salary_min, r.salary_max, r.ote_min, r.ote_max]).toEqual([130000, 160000, 260000, 320000]);
  });
});

describe("OTE phrasings seen in the wild", () => {
  const label = (t: string) => findPayInText(t)[0]?.label;
  it("reads total target cash after the range", () => {
    expect(label("Salary range: $74,000 - $112,000 total target cash (inclusive of bonus or commission)")).toBe("ote");
    expect(label("Salary Range: $240K-$300K potential total on target earnings (base + commission), per year")).toBe("ote");
  });
  it("reads OTE labels that also mention base or salary", () => {
    expect(label("The OTE salary range for candidates within the Greater Chicago Area is $208,170-$248,650")).toBe("ote");
    expect(label("the estimated range for total on target earnings (including base salary and on target incentive pay) for this role is $306,000 - $390,000 per year")).toBe("ote");
    expect(label("The OTE (base + variable) salary range for this position is $275,000 - $350,000 per year.")).toBe("ote");
  });
  it("reads a total-targeted-cash note far above per-zone ranges", () => {
    const t = "The estimated Total Targeted Cash compensation range for this role is listed below. Total Targeted Cash for this role includes base salary, commission, and bonus (if eligible). This role qualifies for uncapped commissions. The starting salary will be determined based on skills, experience, and geographic location. In addition to cash compensation, our total rewards components include benefits and equity (if eligible). You can learn more about how we align pay with local labor markets in our Geographic Pay Zone Philosophy.\n\nZone A\n$148,000-$237,000 USD";
    expect(label(t)).toBe("ote");
  });
  it("still reads plain base ranges as base", () => {
    expect(label("The salary range for this position is $120,000- $155,000 per year, and is eligible for on-target-earnings (OTE).")).toBe("base");
    expect(label("Base salary: $83,000-105,000; uncapped accelerators")).toBe("base");
  });
});

describe("payCurrency", () => {
  it("trusts the ATS, then the posting, then the market", () => {
    expect(payCurrency("CAD", "", ["US"])).toBe("CAD");
    expect(payCurrency(null, "Salary: C$120,000 - C$140,000", ["CA"])).toBe("CAD");
    expect(payCurrency(null, "Base $120,000 - $140,000 CAD", ["US", "CA"])).toBe("CAD");
    expect(payCurrency(null, "Base $120,000 - $140,000", ["CA"])).toBe("CAD");
    expect(payCurrency(null, "Base $120,000 - $140,000", ["US", "CA"])).toBe("USD");
    expect(payCurrency(null, "Base $120,000 - $140,000", ["US"])).toBe("USD");
  });
});

describe("pay labels from real postings (Oct 2026 report check)", () => {
  it("doesn't take the next figure's label (Help Scout)", () => {
    const t = "pay is the same no matter where in the u.s. you live. Base salary: $71,000 - $77,000 On-target earnings (OTE): $102,000 - $111,000 Company equity";
    expect(resolveCompensation({ min: 71000, max: 77000, currency: "USD", isOte: true }, t)).toMatchObject({ salary_min: 71000, salary_max: 77000, ote_min: 102000, ote_max: 111000 });
  });
  it("lets the posting's words beat the job system's OTE label (Elastic, Klaviyo)", () => {
    const e = "The typical starting salary range for this role is: $46,200-$73,000 USD The typical starting target variable range for this role is: $19,700-$31,200 USD The typical starting on-target earnings (OTE) range for this role is: $65,900-$104,200 USD";
    expect(resolveCompensation({ min: 46200, max: 73000, currency: "USD", isOte: true }, e)).toMatchObject({ salary_min: 46200, salary_max: 73000, ote_min: 65900, ote_max: 104200 });
    const k = "Base pay range for US locations: $164,000-$246,000 USD This role may require up to 10% travel";
    expect(resolveCompensation({ min: 164000, max: 246000, currency: "USD", isOte: true }, k)).toMatchObject({ salary_min: 164000, ote_min: null });
  });
  it("reads a salary that includes incentive as OTE (Cloudflare)", () => {
    const t = "For Bay Area based hires: Estimated annual salary of $284,000 - $360,000. This role is eligible to earn incentive compensation under Cloudflare's Sales Compensation Plan. The estimated annual salary range includes the on-target incentive compensation that may be attained in this role.";
    expect(resolveCompensation({ min: 284000, max: 360000, currency: "USD" }, t)).toMatchObject({ salary_min: null, ote_min: 284000, ote_max: 360000 });
  });
  it("reads ranges explained as starting salary just after them (Twilio)", () => {
    const t = "Compensation The estimated pay ranges for this role are as follows: Based in New York: $167,440 - $209,300. This role may be eligible to participate in Twilio's equity plan and corporate bonus plan. The successful candidate's starting salary will be determined based on permissible, non-discriminatory factors.";
    expect(resolveCompensation({ min: null, max: null, currency: null }, t)).toMatchObject({ salary_min: 167440, salary_max: 209300 });
  });
  it("keeps a single base figure that's clearly labeled (SpotOn)", () => {
    const t = "Compensation: A full-time, W2 position with an annual salary of $60,000 and total on-target earnings of up to $120,000-$275,000.";
    expect(resolveCompensation({ min: null, max: null, currency: null }, t)).toMatchObject({ salary_min: 60000, salary_max: 60000, ote_min: 120000, ote_max: 275000 });
  });
});

describe("pay labels: cases the first fix got wrong", () => {
  it("keeps a 'salary range' that the posting explains is OTE (Netskope)", () => {
    const t = "The on target earnings (OTE) range for the role, which is the sum of base salary and target commission amount at 100% goal achievement. In addition to salary, candidates may be eligible for a stock award program. Salary Range $185,000-$280,500 USD Netskope is committed";
    expect(resolveCompensation({ min: 185000, max: 280500, currency: "USD", isOte: true }, t)).toMatchObject({ salary_min: null, ote_min: 185000, ote_max: 280500 });
  });
  it("doesn't read 'may include variable compensation' as OTE (Datadog)", () => {
    const t = "Datadog offers a competitive salary and equity package, and may include variable compensation. The reasonably estimated yearly salary for this role at Datadog is: $98,000-$130,000 USD";
    expect(resolveCompensation({ min: 98000, max: 130000, currency: "USD" }, t)).toMatchObject({ salary_min: 98000, ote_min: null });
  });
  it("keeps a single OTE figure with more numbers after it (Carta, Owner.com)", () => {
    const c = "Our cash compensation (salary + commission) range for this role is: - $150K OTE in New York City, NY (equivalent to an hourly rate of $36.06).";
    expect(resolveCompensation({ min: null, max: null, currency: null }, c)).toMatchObject({ ote_min: 150000, ote_max: 150000 });
    const o = "The compensation range for this role is $270,000 OTE CAD (135,000k salary + 135,000k variable) plus equity.";
    expect(resolveCompensation({ min: null, max: null, currency: null }, o)).toMatchObject({ ote_min: 270000 });
  });
  it("reads base and OTE when both are spelled out (Trulioo)", () => {
    const t = "The expected base salary range for this position is $90,000–$110,000 CAD, with an on-target earnings (OTE) range of approximately $150,000–$183,333 CAD.";
    expect(resolveCompensation({ min: 90000, max: 110000, currency: "CAD", isOte: true }, t)).toMatchObject({ salary_min: 90000, salary_max: 110000, ote_min: 150000, ote_max: 183333 });
  });
});
