// Pay that lives on the company's own careers page, not in the job system's feed.
// Stripe is the case that started this: its Greenhouse posting text stops before the pay section and the
// board hands over no pay range, but the same posting on stripe.com lists the range and says that for
// sales roles it's the OTE range. Without this, every Stripe sales job showed no pay at all.

import { htmlToText } from "./html";

const UA = "BraunBoardBot/0.1 (+https://joshbraun.com)";

/** "Account Executive, Enterprise - Hunter" -> "account-executive-enterprise-hunter" (Stripe's URL style). */
export function stripeSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Careers-page URL for a job, for companies whose pay only shows there. Null for everyone else. */
export function sitePayUrl(boardToken: string, jobId: string, title: string): string | null {
  if (boardToken.toLowerCase() === "stripe") return `https://stripe.com/jobs/listing/${stripeSlug(title)}/${jobId}`;
  return null;
}

/** Just the part of the page that talks about pay (keeps the text we parse small and on topic). */
export function payPassage(text: string): string | null {
  const t = text.replace(/\s+/g, " ");
  const at = t.search(/\b(salary range|base salary|pay range|on target earnings|\bOTE\b)/i);
  if (at < 0) return null;
  return t.slice(Math.max(0, at - 200), at + 2000);
}

/** The pay passage from the company's own page, or null if there isn't one or the page can't be read. */
export async function fetchSitePayText(boardToken: string, jobId: string, title: string): Promise<string | null> {
  const url = sitePayUrl(boardToken, jobId, title);
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US" }, signal: ctrl.signal });
    if (!res.ok) return null;
    return payPassage(htmlToText(await res.text()));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
