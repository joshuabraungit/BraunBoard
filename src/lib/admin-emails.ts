/** Who can open /admin and who gets Picks previews. Comma-separated ADMIN_EMAILS overrides. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "josh@joshbraun.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
