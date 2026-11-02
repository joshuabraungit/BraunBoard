import { describe, expect, it } from "vitest";
import { germanLevel } from "../src/lib/german";
import { euRemoteScope } from "../src/lib/eu-remote";
import { parseLocation } from "../src/lib/ingest/location";
import { formatLocation } from "../src/lib/format";
import { computeFlags } from "../src/lib/flags";

// Phrasings copied from live Germany postings.
describe("germanLevel", () => {
  it("native", () => {
    for (const t of [
      "Native-level German proficiency is required for this role.",
      "- Native-level or near-native German language skills (C1/C2), with the ability to confidently engage",
      "- Native German speaker and fluent in Engish",
      "- Native/Bilingual written and verbal German Language skills required",
    ]) expect(germanLevel(t), t).toBe("native");
  });
  it("fluent", () => {
    for (const t of [
      "Fluent in German and English, with the credibility to engage, challenge, and lead",
      "- Fluency in English & German is reuired, French - a big plus",
      "- Excellent spoken and written German and English skills, Polish or Czech a plus",
      "- Excellent communication and presentation skills in German (native or fluent) and English",
      "- Native/Professional Proficiency in German",
      "You have native-level or full business proficiency in German, alongside strong working proficiency in English.",
      "- Fluency in German (ideally native) and English",
      "- Fluency in English and German is required (minimum C1 proficiency in both, native fluency preferred)",
      "- Language: English and German&nbsp;",
      "- German and English speaker",
      "Conduct executive presentations, and manage stakeholder interactions in German.",
      "Fluent German and English; additional European languages are an advantage",
      "Account Manager (German speaking, Hamburg based)",
      "- You have full professional written and verbal proficiency in German and English (other languages are a plus)",
    ]) expect(germanLevel(t), t).toBe("fluent");
  });
  it("a plus", () => {
    for (const t of [
      "· Fluency in German is a strong advantage",
      " German is a plus ",
      " - Fluency in English; German or French is a plus",
      "- Excellent communication skills in English; German highly preferred for DACH engagements",
      "German language skills are a strong advantage, particularly for customer negotiations",
      " - Nice to have: Proficiency in Spanish, German, or French",
      "- German / French / Spanish / Italian - an advantage",
    ]) expect(germanLevel(t), t).toBe("plus");
  });
  it("ignores the German market", () => {
    for (const t of [
      "Celonis is investing heavily through 2029 in its German public sector business.",
      "- Full German Driving license",
      "- 5+ years of direct, proven experience selling into the German Public Sector",
      "the front line of our revenue growth in the German-speaking and CEMEA markets",
      "- Several years of professional experience within the German police, ideally in a leadership role",
      "Experience managing the German, Swiss, Austrian markets preferred but not required",
      "Fluent English required.",
    ]) expect(germanLevel(t), t).toBeNull();
  });
  it("a requirement beats a plus elsewhere", () => {
    expect(germanLevel("German is a plus.\nNative German required.")).toBe("native");
  });
});

describe("German flags", () => {
  const base = { salary_min: null, salary_max: null, ote_min: null, ote_max: null, self_sourcing_level: "Unknown", disclosures: null };
  const codes = (d: string) => computeFlags({ ...base, description_raw: d }).map((f) => f.code);
  it("one level per posting", () => {
    expect(codes("Native-level German proficiency is required.")).toEqual(expect.arrayContaining(["german_native"]));
    expect(codes("Native-level German proficiency is required.")).not.toContain("german_required");
    expect(codes("Fluent German and English.")).toContain("german_required");
    expect(codes("German is a plus.")).toContain("german_plus");
    expect(codes("German is a plus.")).not.toContain("german_required");
  });
  it("none count against the verdict", () => {
    for (const d of ["Native German required.", "Fluent German required.", "German is a plus."])
      for (const f of computeFlags({ ...base, description_raw: d }).filter((x) => x.code.startsWith("german"))) expect(f.scored).toBe(false);
  });
});

describe("remote across Europe", () => {
  it("is open to Germany", () => {
    for (const raw of ["Remote - EU", "Europe (Remote)", "Remote, EMEA", "Remote - Europe", "EU Remote"]) {
      const loc = parseLocation(raw);
      expect(loc.markets, raw).toEqual(["DE"]);
      expect(loc.country, raw).toBe("DE");
    }
    expect(parseLocation("Europe", { workplace: "Remote" }).markets).toEqual(["DE"]);
  });
  it("one other country isn't EU-wide", () => {
    for (const raw of ["Remote - Spain", "Remote - France", "Remote - Europe (Netherlands)", "Remote, Nordics"]) expect(parseLocation(raw).markets, raw).toEqual([]);
  });
  it("an office in Europe isn't remote", () => {
    expect(parseLocation("Europe").markets).toEqual([]);
    expect(parseLocation("Hybrid - EMEA").markets).toEqual([]);
  });
  it("keeps Germany-only remote as Germany", () => {
    const loc = parseLocation("Remote - Germany");
    expect(formatLocation({ ...loc, location_raw: "Remote - Germany" })).toBe("Remote · Germany");
  });
  it("labels it the way the posting does", () => {
    const show = (raw: string) => formatLocation({ ...parseLocation(raw), location_raw: raw });
    expect(show("Remote - EU")).toBe("Remote · Anywhere in the EU");
    expect(show("Europe (Remote)")).toBe("Remote · Anywhere in Europe");
    expect(show("Remote, EMEA")).toBe("Remote · Anywhere in EMEA");
    expect(show("Remote - US / Remote - Europe")).toBe("Remote · Anywhere in Europe + US");
    expect(euRemoteScope("Remote - Spain")).toBeNull();
    expect(show("Remote, Germany, EMEA")).toBe("Remote · Germany");
  });
  it("leaves US remote alone", () => {
    expect(parseLocation("Remote - US").markets).toEqual(["US"]);
    expect(parseLocation("Remote").markets).toEqual(["US"]);
  });
});
