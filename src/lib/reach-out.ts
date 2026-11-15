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
  company?: string;
  sells?: string | null;
  buyer?: string | null;
}

/** First note to the hiring manager: what you noticed, what you built and what's in it, the link. */
export function firstNote(job: NoteJob): { subject: string; body: string } {
  const sells = job.sells ? midSentence(job.sells) : null;
  const buyer = job.buyer ? midSentence(job.buyer) : null;
  let obs = `Saw you're hiring ${article(job.title)} ${job.title}`;
  if (sells && buyer) obs += ` to sell ${sells} to ${buyer}`;
  else if (sells) obs += ` to sell ${sells}`;
  else if (buyer) obs += ` selling to ${buyer}`;
  obs += ". I applied, and I also put together a plan for how I'd start.";
  const body = [
    "Hey [first name],",
    obs,
    "It covers the five companies I'd reach out to first ([one of them] just [their reason to reach out now]), the email I'd send there, and what my first 90 days would look like.",
    "Here it is: [your Proof page link]",
    "[Your name]",
  ].join("\n\n");
  return { subject: job.company ? `How I'd start at ${job.company}` : `Your ${job.title} opening`, body };
}
