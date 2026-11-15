// The job page's Reach out box: who likely owns the hire, and a first note built from
// what the posting says. Pure functions, so they're easy to test.

import type { RoleFamily } from "./ingest/types";

/** Who a role usually reports to. A best guess, so the box says "likely". */
const MANAGER: Record<RoleFamily, string[]> = {
  "SDR/BDR": ["SDR Manager", "BDR Manager"],
  "Account Executive": ["Sales Manager", "VP of Sales"],
  "Account Manager": ["Head of Account Management", "VP of Sales"],
  "Customer Expansion": ["Head of Account Management", "VP of Sales"],
  "Sales Engineer": ["Head of Solutions Engineering"],
  "Sales Manager": ["Sales Director", "VP of Sales"],
  "Sales Director": ["VP of Sales"],
  "VP Sales": ["CRO", "CEO"],
  CRO: ["CEO"],
};

export function likelyManagers(role: RoleFamily, companySize?: string | null): string[] {
  const titles = MANAGER[role] ?? ["VP of Sales"];
  // At a startup the founder often owns the first sales hires.
  if (companySize === "startup" && !titles.includes("CEO")) return [...titles, "Founder"];
  return titles;
}

/** A LinkedIn people search for that title at that company. Opens in their own LinkedIn. */
export function linkedinSearch(company: string, title: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${company} ${title}`)}`;
}

/** Lower-case a headline so it reads mid-sentence, leaving acronyms ("AI tools") alone. */
export function midSentence(s: string): string {
  const t = s.trim().replace(/[.!]+$/, "");
  if (!t) return t;
  if (/^[A-Z]{2}/.test(t)) return t;
  return t[0].toLowerCase() + t.slice(1);
}

/** "an Account Executive", "an SDR", "a Sales Manager". Acronyms go by how the letter sounds. */
const article = (word: string) => (/^[A-Z]{2}/.test(word) ? (/^[AEFHILMNORSX]/.test(word) ? "an" : "a") : /^[aeiou]/i.test(word) ? "an" : "a");

export interface NoteJob {
  title: string;
  sells?: string | null;
  buyer?: string | null;
}

/** First note to the hiring manager. Observation, proof, the Proof page link, an easy out. */
export function firstNote(job: NoteJob): { subject: string; body: string } {
  const sells = job.sells ? midSentence(job.sells) : null;
  const buyer = job.buyer ? midSentence(job.buyer) : null;
  let obs = `Saw you're hiring ${article(job.title)} ${job.title}`;
  if (sells && buyer) obs += ` to sell ${sells} to ${buyer}`;
  else if (sells) obs += ` to sell ${sells}`;
  else if (buyer) obs += ` selling to ${buyer}`;
  obs += ".";
  const body = [
    "Hi [first name],",
    obs,
    "[One or two numbers that show you've done something like this. Like: \"Last year I closed 38 new accounts selling to clinic owners, 108% of plan.\"]",
    "I put my thinking on how I'd approach the role on one page: [your Proof page link]",
    "I applied through your site too. If it looks like a fit, I'd be glad to talk. If not, no worries.",
    "[Your name]",
  ].join("\n\n");
  return { subject: `Your ${job.title} opening`, body };
}
