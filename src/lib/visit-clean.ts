// Strips secrets out of page addresses and referrers before visit counting.
// No server-only imports, so the browser can use it too.

/**
 * The only query values worth counting: link tags that say where a visit came from.
 * Everything else (sign-in codes, unsubscribe/renewal tokens, Stripe session ids, emails) is dropped.
 */
export const KEPT_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "from"] as const;

// Pages whose address itself carries a secret. The secret part is swapped for a placeholder.
const SECRET_PATHS: [RegExp, string][] = [[/^\/review\/[^/?#]+/, "/review/[token]"]];

/** The page address with secrets taken out: no hash, only KEPT_PARAMS, token path parts masked. */
export function cleanPath(raw: string): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return "";
  let url: URL;
  try {
    url = new URL(raw, "https://x.invalid");
  } catch {
    return "";
  }
  if (url.origin !== "https://x.invalid") return "";
  let path = url.pathname;
  for (const [re, mask] of SECRET_PATHS) path = path.replace(re, mask);
  const kept = new URLSearchParams();
  for (const k of KEPT_PARAMS) {
    const v = url.searchParams.get(k);
    // Tags are short words. Anything that looks like an email or a long blob isn't a tag.
    if (v && v.length <= 60 && !/@|%40/.test(v)) kept.set(k, v);
  }
  const q = kept.toString();
  return (path + (q ? `?${q}` : "")).slice(0, 300);
}

/** Just the site a visitor came from (https://site.com), never the page or its query. */
export function cleanReferrer(raw: string): string {
  if (typeof raw !== "string" || !raw) return "";
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : "";
  } catch {
    return "";
  }
}
