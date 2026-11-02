// A company's own home page, as plain text. Used when its job postings never say what it sells:
// the home page almost always does, and it's still the company's own words, so the story stays quote-backed.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', mdash: "-", ndash: "-", hellip: "..." };

function decode(s: string): string {
  return s.replace(/&(#?\w+);/g, (m, e: string) => {
    if (ENTITIES[e]) return ENTITIES[e];
    if (/^#\d+$/.test(e)) return String.fromCodePoint(Number(e.slice(1)));
    if (/^#x[0-9a-f]+$/i.test(e)) return String.fromCodePoint(parseInt(e.slice(2), 16));
    return m;
  });
}

/** The readable words on a page: title, meta descriptions, then body text. Capped so prompts stay small. */
export function htmlToText(html: string, max = 6000): string {
  const metas: string[] = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) metas.push(title);
  for (const m of html.matchAll(/<meta\s[^>]*>/gi)) {
    const tag = m[0];
    if (!/(name|property)\s*=\s*["'](description|og:description|twitter:description)["']/i.test(tag)) continue;
    const content = tag.match(/content\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/content\s*=\s*'([^']*)'/i)?.[1];
    if (content) metas.push(content);
  }
  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Block-level tags become line breaks so sentences don't run together.
    .replace(/<\/?(p|div|h[1-6]|li|section|article|header|footer|br|tr|td|ul|ol|nav|main)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const lines = [...metas, ...body.split("\n")]
    .map((l) => decode(l).replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1);
  return [...new Set(lines)].join("\n").slice(0, max).trim();
}

/** The home page URL to read: the stored website, else the company's domain. Null if neither looks usable. */
export function homeUrl(website: string | null | undefined, domain: string | null | undefined): string | null {
  for (const raw of [website, domain]) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`);
      // Job-board hosts aren't the company's site.
      if (/(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|linkedin\.com)$/i.test(u.hostname)) continue;
      return `${u.protocol}//${u.hostname}/`;
    } catch {
      continue;
    }
  }
  return null;
}

/** Fetch a home page and return its text, or null if it can't be read (timeouts, blocks, non-HTML). Never throws. */
export async function fetchSiteText(url: string, timeoutMs = 15_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "Mozilla/5.0 (compatible; BraunBoardBot/1.0; +https://braunboard.com)", accept: "text/html" },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    const text = htmlToText(await res.text());
    // Too little to say what they sell (a blank JS shell, a cookie wall).
    return text.split(/\s+/).length >= 25 ? text : null;
  } catch {
    return null;
  }
}
