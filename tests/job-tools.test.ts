import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { applyEdits, keepBacked, keywordScore, noDashes, unsupported, vetEdits } from "../src/lib/job-tools/guard";
import { cleanChatter } from "../src/lib/job-tools/chatter";
import { cleanTune } from "../src/lib/job-tools/tune";
import { cleanLetter } from "../src/lib/job-tools/letter";
import { cleanPrep } from "../src/lib/job-tools/prep";

const RESUME = `Jane Smith
Account Executive, Acme Corp (2022 to now)
- Closed $1.2M in new business in 2023, 140% of quota
- Found new customers by cold calling restaurant owners
- Ran discovery calls and demos for mid-market accounts
SDR, Widgetly (2020 to 2022)
- Booked 25 meetings a month with outbound email and calls`;

describe("guard: unsupported", () => {
  it("passes a reworded line that adds nothing", () => {
    expect(unsupported("Won new logos by cold calling restaurant owners", RESUME)).toEqual([]);
  });
  it("catches an invented number", () => {
    expect(unsupported("Closed $2M in new business", RESUME)).toContain("2m");
  });
  it("catches a tool, company or method the résumé never mentions", () => {
    expect(unsupported("Ran discovery using MEDDICC in Salesforce", RESUME)).toEqual(expect.arrayContaining(["MEDDICC", "Salesforce"]));
  });
  it("catches an industry or segment claim", () => {
    expect(unsupported("Sold to healthcare systems at enterprise accounts", RESUME)).toEqual(expect.arrayContaining(["healthcare", "enterprise"]));
  });
  it("doesn't flag the first word of a sentence", () => {
    expect(unsupported("Generated pipeline with outbound calls", RESUME)).toEqual([]);
  });
});

describe("guard: vetEdits", () => {
  it("keeps honest rewrites and drops made-up ones", () => {
    const { kept, dropped } = vetEdits(RESUME, [
      { before: "- Found new customers by cold calling restaurant owners", after: "- Won new logos by cold calling restaurant owners", why: "their phrase" },
      { before: "- Closed $1.2M in new business in 2023, 140% of quota", after: "- Closed $1.2M in new business in 2023, 160% of quota", why: "" },
      { before: "Ran demos for enterprise", after: "Ran demos", why: "" },
      { before: "- Ran discovery calls and demos for mid-market accounts", after: "- Ran discovery and demos for healthcare accounts", why: "" },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.after).toContain("new logos");
    expect(dropped.map((d) => d.reason)).toEqual([expect.stringContaining("160%"), expect.stringContaining("word for word"), expect.stringContaining("healthcare")]);
  });
  it("won't move a number from one line to another", () => {
    const { kept } = vetEdits(RESUME, [{ before: "- Booked 25 meetings a month with outbound email and calls", after: "- Booked 140 meetings a month with outbound email and calls", why: "" }]);
    expect(kept).toHaveLength(0);
  });
});

describe("guard: keyword score", () => {
  it("counts keywords before and after edits", () => {
    const kws = ["new logos", "cold calling", "pipeline generation", "discovery"];
    expect(keywordScore(kws, RESUME)).toBe(50);
    const after = applyEdits(RESUME, [{ before: "Found new customers", after: "Won new logos", why: "" }]);
    expect(keywordScore(kws, after)).toBe(75);
  });
});

describe("guard: letters", () => {
  it("drops sentences with claims the résumé and posting don't back", () => {
    const r = keepBacked("Restaurants lose hours on scheduling. I closed $1.2M last year. I also won a Presidents Club trip in 2021.", `${RESUME}\nRestaurants lose hours on scheduling`);
    expect(r.text).toBe("Restaurants lose hours on scheduling. I closed $1.2M last year.");
    expect(r.removed).toHaveLength(1);
  });
  it("swaps em dashes for commas", () => {
    expect(noDashes("Short — and sweet")).toBe("Short, and sweet");
  });
});

describe("chatter", () => {
  const seen = [
    { url: "https://www.reddit.com/r/sales/comments/abc", title: "Acme" },
    { url: "https://www.glassdoor.com/Reviews/Acme", title: "x" },
  ];
  it("keeps lines with links it saw, drops made-up links and blocked sites", () => {
    const c = cleanChatter(
      {
        lines: [
          { tone: "yellow", text: "Reps on Reddit say leadership turned over twice this year.", url: "https://www.reddit.com/r/sales/comments/abc", source: "Reddit" },
          { tone: "red", text: "Layoffs", url: "https://made-up.example.com/x", source: "x" },
          { tone: "green", text: "Good reviews", url: "https://www.glassdoor.com/Reviews/Acme", source: "Glassdoor" },
          { tone: "purple", text: "nope", url: "https://www.reddit.com/r/sales/comments/abc" },
        ],
      },
      seen,
    );
    expect(c.lines).toHaveLength(1);
    expect(c.lines[0]!.tone).toBe("yellow");
    expect(c.thin).toBe(false);
  });
  it("calls it thin when nothing survives", () => {
    expect(cleanChatter({ lines: [] }, seen).thin).toBe(true);
  });
});

describe("tune", () => {
  it("vets edits, scores in code, and drops gaps the résumé already covers", () => {
    const t = cleanTune(
      {
        keywords: ["new logos", "cold calling", "discovery", "MEDDICC"],
        edits: [{ before: "- Found new customers by cold calling restaurant owners", after: "- Won new logos by cold calling restaurant owners", why: "their phrase" }],
        gaps: [
          { want: "MEDDICC", say: "Say you qualify with discovery calls and are happy to learn their framework." },
          { want: "cold calling", say: "x" },
        ],
      },
      RESUME,
    );
    expect(t.edits).toHaveLength(1);
    expect(t.score_before).toBe(50);
    expect(t.score_after).toBe(75);
    expect(t.gaps.map((g) => g.want)).toEqual(["MEDDICC"]);
  });
});

describe("letter", () => {
  it("keeps the greeting and sign-off, cuts invented claims", () => {
    const l = cleanLetter(
      {
        formal: "Dear Hiring Manager,\nRestaurants lose hours on scheduling. I closed $1.2M in new business in 2023. I also hit 300% at Google.\nJane",
        note: "Restaurants lose hours on scheduling — I sold to restaurant owners at Acme. Curious what separates reps who hit quota there?",
      },
      `${RESUME}\nRestaurants lose hours on scheduling\nDear Hiring Manager`,
    );
    expect(l.formal).toContain("Dear Hiring Manager,");
    expect(l.formal).not.toContain("Google");
    expect(l.formal).toContain("Jane");
    expect(l.note).not.toContain("—");
    expect(l.cut).toBe(1);
  });
});

describe("prep", () => {
  it("ignores interviewer bullets when no bio was pasted, keeps two stories max", () => {
    const p = cleanPrep(
      {
        interviewer: ["Probably loves MEDDICC"],
        stories: [
          { title: "The Acme deal", when: "Tell me about a big win", beats: ["Closed $1.2M in new business in 2023", "Made up $9M deal"] },
          { title: "Widgetly", when: "Tell me about a loss", beats: ["Booked 25 meetings a month"] },
          { title: "Third", when: "x", beats: ["y"] },
        ],
        questions: [{ text: "How do deals come in?", why: "Tells you how much you'll prospect." }],
      },
      RESUME,
      "",
    );
    expect(p.interviewer).toEqual([]);
    expect(p.stories).toHaveLength(2);
    expect(p.stories[0]!.beats).toEqual(["Closed $1.2M in new business in 2023"]);
    expect(p.questions).toHaveLength(1);
  });
});
