// Visit counting for the admin dashboard. No cookies, nothing stored that identifies a person.

import { createHash } from "node:crypto";

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http|java\/|scrapy|BraunBoard-HealthCheck/i;

export const isBot = (ua: string) => !ua || BOT_RE.test(ua);

export const deviceOf = (ua: string) => (/iPad|Tablet/i.test(ua) ? "Tablet" : /Mobi|Android|iPhone/i.test(ua) ? "Phone" : "Computer");

/** A code for "this browser, today". Changes every day, so nobody can be followed across days. */
export function visitorCode(ip: string, ua: string, secret: string, day = new Date().toISOString().slice(0, 10)): string {
  return createHash("sha256").update(`${secret}|${day}|${ip}|${ua}`).digest("base64url").slice(0, 16);
}

const SITES: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)(x|twitter)\.com$|^t\.co$/, "X"],
  [/(^|\.)facebook\.com$|^fb\.me$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)youtube\.com$/, "YouTube"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, "ChatGPT"],
  [/(^|\.)claude\.ai$/, "Claude"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)joshbraun\.com$/, "joshbraun.com"],
  [/mail\.|(^|\.)hey\.com$|outlook\.|(^|\.)substack\.com$|beehiiv/, "Email"],
];

/**
 * Where a visit came from. A tag on the link wins (?utm_source= or our own ?from=...-email),
 * then the site that sent them. Visits from Braun Board itself, or with no referrer, are "Direct".
 */
export function sourceOf(path: string, referrer: string, ownHost = "braunboard.com"): string {
  let params: URLSearchParams;
  try {
    params = new URL(path, "https://x.invalid").searchParams;
  } catch {
    params = new URLSearchParams();
  }
  const utm = (params.get("utm_source") ?? "").toLowerCase();
  const from = (params.get("from") ?? "").toLowerCase();
  if (/email|newsletter|picks/.test(utm) || /email/.test(from)) return "Email";
  if (utm) {
    for (const [re, name] of SITES) if (re.test(utm) || re.test(`${utm}.com`)) return name;
    return utm.slice(0, 40);
  }
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Direct";
  }
  if (!host || host === ownHost || host.endsWith(`.${ownHost}`) || host === "localhost") return "Direct";
  for (const [re, name] of SITES) if (re.test(host)) return name;
  return host.slice(0, 60);
}
