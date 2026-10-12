// ATS dates come as ISO strings or epoch milliseconds. Keep only sane ones.
export function validDate(v: string | number | null | undefined): string | null {
  if (v == null || v === "") return null;
  const d = new Date(v);
  const t = d.getTime();
  if (Number.isNaN(t)) return null;
  // Nothing before 2010, nothing in the future (a day of slack for time zones).
  if (t < Date.UTC(2010, 0, 1) || t > Date.now() + 86_400_000) return null;
  return d.toISOString();
}
