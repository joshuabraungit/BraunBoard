// Plain-text helpers for "Say it in their words". Pure functions, no AI, no database,
// so the browser and the server build the exact same copy.

export interface Swap {
  before: string;
  after: string;
}

const BULLET = /^\s*[•\-*▪●◦·‣]\s*/;
const BULLET_START = /^\s*[•\-*▪●◦·‣]\s+/;
const CONTINUES = /^[a-z0-9$(&]/;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const quotes = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

/** Matches a quoted line even when the PDF wrapped it across lines or spaced it oddly. */
function looseRegex(line: string): RegExp | null {
  const words = quotes(line).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  return new RegExp(words.map(esc).join("\\s+"));
}

/** Swap lines in, keeping the résumé's line breaks everywhere else. */
export function applySwaps(text: string, swaps: Swap[]): string {
  let out = quotes(text);
  for (const s of swaps) {
    // Compare without bullet marks, so a rewrite never drops or doubles the line's bullet.
    const re = looseRegex(s.before.replace(BULLET_START, ""));
    if (!re) continue;
    out = out.replace(re, () => s.after.trim().replace(BULLET_START, ""));
  }
  return out;
}

export interface Add {
  /** The new line. */
  text: string;
  /** A line already on the résumé to put it under. Empty or not found: it goes at the end. */
  after: string;
}



/** Put new lines in as bullets under the line they belong with, or in a short section at the end. */
export function applyAdds(text: string, adds: Add[]): string {
  let out = text;
  const leftovers: string[] = [];
  for (const a of adds) {
    const line = a.text.trim().replace(BULLET, "");
    if (!line) continue;
    const re = a.after ? looseRegex(a.after) : null;
    const m = re ? re.exec(out) : null;
    if (!m) {
      leftovers.push(line);
      continue;
    }
    // After the anchor line and the bullets right under it, so it lands at the end of that job.
    let at = out.indexOf("\n", m.index + m[0].length);
    if (at === -1) at = out.length;
    while (at < out.length) {
      const next = out.indexOf("\n", at + 1);
      const nextLine = out.slice(at + 1, next === -1 ? out.length : next);
      // Bullets, and wrapped bullet lines (PDFs break a long bullet onto a line starting lowercase).
      if (!BULLET.test(nextLine) && !CONTINUES.test(nextLine.trim())) break;
      at = next === -1 ? out.length : next;
    }
    out = `${out.slice(0, at)}\n• ${line}${out.slice(at)}`;
  }
  if (leftovers.length) out = `${out.trimEnd()}\n\nMore experience\n${leftovers.map((l) => `• ${l}`).join("\n")}`;
  return out;
}

/** Join bullets a PDF wrapped onto two lines, so the AI sees (and quotes) whole bullets. */
export function unwrapLines(text: string): string {
  const out: string[] = [];
  for (const raw of text.split("\n")) {
    const l = raw.trimEnd();
    const prev = out[out.length - 1];
    if (prev && BULLET.test(prev) && l.trim() && CONTINUES.test(l.trim()) && !BULLET.test(l)) out[out.length - 1] = `${prev} ${l.trim()}`;
    else out.push(l);
  }
  return out.join("\n");
}

export function buildCopy(resume: string, swaps: Swap[], adds: Add[]): string {
  return applyAdds(applySwaps(resume, swaps), adds).replace(/\n{3,}/g, "\n\n").trim();
}

// ---- The plain template ----

export type Block = { kind: "name" | "heading" | "role" | "bullet" | "line"; text: string };

const HEADINGS = /^(summary|profile|about|experience|work experience|professional experience|employment|education|skills|certifications?|awards|achievements|accomplishments|more experience|languages|interests|volunteer|projects)$/i;

function isHeading(line: string): boolean {
  if (line.length > 40 || /[.,;:]$/.test(line)) return false;
  if (HEADINGS.test(line)) return true;
  const letters = line.replace(/[^A-Za-z]/g, "");
  return letters.length >= 3 && letters === letters.toUpperCase();
}

/**
 * Lay the text out for the one clean template: name on top, section headings, bullets,
 * everything else as plain lines. The words are never changed here.
 */
export function toBlocks(text: string): Block[] {
  // Wide gaps from PDF columns ("Account Executive, Acme        2021 – Present") become a dot.
  const raw = text.split("\n").map((l) => l.trim().replace(/\s{3,}|\t+/g, " · ")).filter(Boolean);
  // PDFs break a long bullet onto the next line. A line right after a bullet that starts
  // lowercase or with a number is the rest of that bullet, not a new line.
  const lines: string[] = [];
  for (const l of raw) {
    const prev = lines[lines.length - 1];
    if (prev && BULLET.test(prev) && CONTINUES.test(l) && !BULLET.test(l)) lines[lines.length - 1] = `${prev} ${l}`;
    else lines.push(l);
  }
  return lines.map((line, i): Block => {
    if (i === 0) return { kind: "name", text: line };
    if (BULLET.test(line)) return { kind: "bullet", text: line.replace(BULLET, "") };
    if (isHeading(line)) return { kind: "heading", text: line };
    // A plain line with bullets right under it is a job ("Account Executive, Acme · 2021 – Present").
    if (lines[i + 1] && BULLET.test(lines[i + 1]!)) return { kind: "role", text: line };
    return { kind: "line", text: line };
  });
}

/** "Résumé – Embold Research, Account Executive", made safe for a file name. */
export function copyFileName(company: string, title: string, ext: "docx" | "pdf"): string {
  const base = `Resume - ${company} - ${title}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
  return `${base}.${ext}`;
}
