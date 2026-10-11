export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** /jobs/gong-enterprise-account-executive-123 */
export function jobSlug(companySlug: string, title: string, sourceJobId: string): string {
  const shortId = sourceJobId.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase();
  return `${companySlug}-${slugify(title)}-${shortId}`;
}
