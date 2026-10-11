// Freshness labels based on Braun Board's first-seen time. Spec section 9.
// "18 min ago", "2h ago", "Today", "Yesterday", "3d ago"

export function freshnessLabel(firstSeen: Date | string, now: Date = new Date()): string {
  const seen = typeof firstSeen === "string" ? new Date(firstSeen) : firstSeen;
  const mins = Math.max(0, Math.floor((now.getTime() - seen.getTime()) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 12) return `${hours}h ago`;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (seen >= startOfToday) return "Today";
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  if (seen >= startOfYesterday) return "Yesterday";

  const seenDay = new Date(seen);
  seenDay.setHours(0, 0, 0, 0);
  const days = Math.max(2, Math.round((startOfToday.getTime() - seenDay.getTime()) / 86_400_000));
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function isFresh(firstSeen: Date | string, now: Date = new Date()): boolean {
  const seen = typeof firstSeen === "string" ? new Date(firstSeen) : firstSeen;
  return now.getTime() - seen.getTime() < 24 * 3_600_000;
}
