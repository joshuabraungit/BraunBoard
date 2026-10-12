/** Success / error banner driven by ?msg= or ?err= after an admin action. */
export function AdminNotice({ msg, err }: { msg?: string; err?: string }) {
  if (!msg && !err) return null;
  return (
    <p
      role="status"
      className={`mb-5 rounded-lg border px-4 py-2.5 text-sm ${err ? "border-red/30 bg-red-soft text-red" : "border-accent/30 bg-accent-soft text-accent"}`}
    >
      {err ?? msg}
    </p>
  );
}
