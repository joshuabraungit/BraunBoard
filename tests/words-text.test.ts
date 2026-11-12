import { describe, expect, it } from "vitest";
import { applyAdds, applySwaps, buildCopy, copyFileName, toBlocks } from "../src/lib/job-tools/words-text";

const RESUME = `Jane Doe
jane@example.com
EXPERIENCE
Account Executive, Acme
• Found new customers by cold calling
restaurant owners across Florida
• Hit 120% of quota in 2024
EDUCATION
BA, State University`;

describe("their words copy", () => {
  it("swaps a line even when the PDF wrapped it, and keeps the rest", () => {
    const out = applySwaps(RESUME, [{ before: "Found new customers by cold calling restaurant owners across Florida", after: "Won new logos by cold calling restaurant owners across Florida" }]);
    expect(out).toContain("• Won new logos by cold calling restaurant owners across Florida");
    expect(out).toContain("• Hit 120% of quota in 2024");
    expect(out.split("\n")[0]).toBe("Jane Doe");
  });

  it("puts a new line under its job, or at the end when it can't tell", () => {
    const out = applyAdds(RESUME, [
      { text: "Ran a pilot with three restaurant groups", after: "Account Executive, Acme" },
      { text: "Coached two new SDRs", after: "" },
    ]);
    const lines = out.split("\n");
    // Lands at the end of that job's bullets, before the next section.
    expect(lines[lines.indexOf("EDUCATION") - 1]).toBe("• Ran a pilot with three restaurant groups");
    expect(out.trimEnd().endsWith("More experience\n• Coached two new SDRs")).toBe(true);
  });

  it("lays out name, headings and bullets without changing words", () => {
    const blocks = toBlocks(buildCopy(RESUME, [], []));
    expect(blocks[0]).toEqual({ kind: "name", text: "Jane Doe" });
    expect(blocks.find((b) => b.text === "EXPERIENCE")?.kind).toBe("heading");
    expect(blocks.find((b) => b.text.startsWith("Hit 120%"))?.kind).toBe("bullet");
    expect(blocks.find((b) => b.text === "Account Executive, Acme")?.kind).toBe("role");
    expect(blocks.find((b) => b.text === "jane@example.com")?.kind).toBe("line");
  });

  it("turns PDF column gaps into a dot", () => {
    expect(toBlocks("Jane\nAE, Acme          2021 – Present")[1]!.text).toBe("AE, Acme · 2021 – Present");
  });

  it("makes a safe file name", () => {
    expect(copyFileName("Embold Research", "AE / East", "docx")).toBe("Resume - Embold Research - AE East.docx");
  });
});
