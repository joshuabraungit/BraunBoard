"use client";

// Small helpers for counting Products page actions. They never change what the click does.

export function track(event: string, company?: string, source = "products") {
  try {
    const body = JSON.stringify({ event, company, source });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/products/event", new Blob([body], { type: "application/json" }));
    else void fetch("/api/products/event", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    // ignore
  }
}

/** Wraps anything clickable (a form button, a link) and counts the click. */
export function TrackClick({ event, company, children, className }: { event: string; company?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={className ?? "contents"} onClickCapture={() => track(event, company)}>
      {children}
    </span>
  );
}

/** The "See jobs" expander on each card. Works without JS (it's a <details>); counts opens when JS is on. */
export function SeeJobs({ company, count, children }: { company: string; count: number; children: React.ReactNode }) {
  return (
    <details
      className="group"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) track("see_jobs", company);
      }}
    >
      <summary className="flex min-h-11 w-full cursor-pointer list-none items-center justify-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:opacity-90 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">See {count === 1 ? "the job" : `${count} jobs`} ↓</span>
        <span className="hidden group-open:inline">Hide jobs ↑</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
