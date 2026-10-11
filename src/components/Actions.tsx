// Server-rendered toggle buttons. Work without JS; signed-out users get sent to sign in.
import { toggleSaveJob, toggleWatchCompany, hideJob } from "@/app/actions";

function Toggle({
  action,
  id,
  on,
  back,
  labels,
  className,
}: {
  action: (fd: FormData) => Promise<void>;
  id: string;
  on: boolean;
  back: string;
  labels: [string, string];
  className?: string;
}) {
  return (
    <form action={action} className="contents">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="on" value={on ? "1" : "0"} />
      <input type="hidden" name="back" value={back} />
      <button className={className} aria-pressed={on}>
        {on ? labels[1] : labels[0]}
      </button>
    </form>
  );
}

export function SaveJobButton(p: { jobId: string; saved: boolean; back: string; className?: string; compact?: boolean }) {
  return (
    <Toggle
      action={toggleSaveJob}
      id={p.jobId}
      on={p.saved}
      back={p.back}
      labels={p.compact ? ["♡ Save", "♥ Saved"] : ["Save Job", "♥ Saved"]}
      className={p.className}
    />
  );
}

export function WatchCompanyButton(p: { companyId: string; on: boolean; back: string; className?: string }) {
  return <Toggle action={toggleWatchCompany} id={p.companyId} on={p.on} back={p.back} labels={["♡ Watch Company", "♥ Watching"]} className={p.className} />;
}

export function HideJobButton(p: { jobId: string; back: string }) {
  return <Toggle action={hideJob} id={p.jobId} on={false} back={p.back} labels={["Not for me", "Hidden"]} className="text-ink-3 hover:text-ink" />;
}
