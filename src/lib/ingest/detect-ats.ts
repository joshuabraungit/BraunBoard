// ATS detection. Given a careers URL (best) or just a company name/domain,
// figure out which supported ATS hosts the company's public job board.

import type { AtsProvider } from "./types";
import { getJson, HttpError } from "./http";

export interface Detected {
  provider: AtsProvider;
  identifier: string;
}

const URL_PATTERNS: { provider: AtsProvider; re: RegExp }[] = [
  { provider: "greenhouse", re: /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i },
  { provider: "greenhouse", re: /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/i },
  { provider: "lever", re: /jobs\.(?:eu\.)?lever\.co\/([a-z0-9_.-]+)/i },
  { provider: "ashby", re: /jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/i },
];

/** Pure URL sniffing, no network. */
export function detectFromUrl(url: string): Detected | null {
  for (const { provider, re } of URL_PATTERNS) {
    const m = url.match(re);
    if (m) return { provider, identifier: decodeURIComponent(m[1]) };
  }
  return null;
}

/** Board-token guesses from a company name or domain: "Acme Corp" / acme.com -> acme, acmecorp, acme-corp */
export function candidateTokens(nameOrDomain: string): string[] {
  const base = nameOrDomain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|io|ai|co|net|org|app|dev|so|tech|us)(\/.*)?$/, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|co|technologies|technology|labs|hq)\b\.?/g, "")
    .trim();
  const words = base.split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set([words.join(""), words.join("-"), words[0], words.join("") + "hq"].filter(Boolean))];
}

async function exists(provider: AtsProvider, token: string): Promise<boolean> {
  const t = encodeURIComponent(token);
  const url =
    provider === "greenhouse"
      ? `https://boards-api.greenhouse.io/v1/boards/${t}`
      : provider === "lever"
        ? `https://api.lever.co/v0/postings/${t}?mode=json&limit=1`
        : `https://api.ashbyhq.com/posting-api/job-board/${t}`;
  try {
    const data = await getJson<unknown>(url, { retries: 0, timeoutMs: 10_000 });
    // Lever returns [] for unknown sites rather than 404
    return provider === "lever" ? Array.isArray(data) && data.length > 0 : true;
  } catch (err) {
    if (err instanceof HttpError) return false;
    throw err;
  }
}

/** Probe the public APIs with guessed tokens. Use when no careers URL is known. */
export async function detectByProbing(nameOrDomain: string): Promise<Detected | null> {
  for (const token of candidateTokens(nameOrDomain)) {
    for (const provider of ["greenhouse", "ashby", "lever"] as AtsProvider[]) {
      if (await exists(provider, token)) return { provider, identifier: token };
    }
  }
  return null;
}
