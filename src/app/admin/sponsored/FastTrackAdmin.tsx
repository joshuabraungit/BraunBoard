import { claimedCodes, type FastTrackConfig } from "@/lib/fast-track";
import { saveFastTrack } from "./actions";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

/** Admin: turn a sponsor's Fast Track box on, and see who claimed which code. */
export async function FastTrackAdmin({ id, cfg }: { id: string; cfg: FastTrackConfig }) {
  const codes = cfg.fast_track_total ? await claimedCodes(id) : [];
  const claimed = codes.filter((c) => c.claimed_at);
  return (
    <details className="mt-3 rounded-lg border border-line px-3 py-2" open={!!cfg.fast_track_total}>
      <summary className="cursor-pointer text-sm font-semibold">
        Fast Track {cfg.fast_track_total ? `· ${claimed.length} of ${codes.length} claimed` : "· off"}
      </summary>
      {claimed.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <tbody>
            {claimed.map((c) => (
              <tr key={c.code} className="border-t border-line">
                <td className="py-1 pr-3 font-mono font-semibold">{c.code}</td>
                <td className="py-1 pr-3">{c.name}</td>
                <td className="break-all py-1 pr-3">{c.email}</td>
                <td className="py-1 text-ink-3">{when(c.claimed_at!)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form action={saveFastTrack} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={id} />
        <label className="block">
          <span className="text-xs text-ink-2">Number of codes (blank = off). Codes are BB-FT1, BB-FT2, and so on.</span>
          <input name="fast_track_total" defaultValue={cfg.fast_track_total ?? ""} inputMode="numeric" className="mt-1 w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-ink-2">Their application form (blank = the job link)</span>
          <input name="fast_track_url" defaultValue={cfg.fast_track_url ?? ""} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-ink-2">Screening call length in minutes (blank = 25)</span>
          <input name="fast_track_minutes" defaultValue={cfg.fast_track_minutes ?? ""} inputMode="numeric" className="mt-1 w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-ink-2">Where the code goes on their application</span>
          <textarea name="fast_track_where" defaultValue={cfg.fast_track_where ?? ""} rows={3} maxLength={500} className="mt-1 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm" />
        </label>
        <button className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">Save Fast Track</button>
        <p className="text-xs text-ink-3">The box shows on the job page while the job is live. Claimed codes are never handed out twice.</p>
      </form>
    </details>
  );
}
