// Logo resolution order (spec section 5):
// 1. Logo from ATS  2. Company site metadata  3. Favicon  4. Domain logo service  5. Initials
// 1 and 2 land in companies.logo_url when we have them. 3 and 4 are resolved here.
// Note: we try the logo service before the favicon, because Google's favicon
// endpoint always returns *something* (a generic globe), so it would never fall through.
// Initials are the final fallback inside <CompanyLogo/> when every image fails.

export function logoCandidates(c: { logo_url: string | null; domain: string | null }): string[] {
  const out: string[] = [];
  if (c.logo_url) out.push(c.logo_url);
  if (c.domain) {
    const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
    if (token) out.push(`https://img.logo.dev/${c.domain}?token=${token}&size=128&format=png`);
    out.push(`https://www.google.com/s2/favicons?domain=${c.domain}&sz=128`);
  }
  return out;
}
