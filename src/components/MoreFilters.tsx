"use client";

import { useEffect, useRef, type ReactNode } from "react";

const KEY = "bb-more-filters-open";

/**
 * "More filters", closed by default so the jobs show up first. Each pick reloads the page, so
 * if you opened it, it stays open until you close it (remembered for this browser tab).
 */
export function MoreFilters({ active, children }: { active: number; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1" && ref.current) ref.current.open = true;
    } catch {
      /* storage blocked: just start closed */
    }
  }, []);
  return (
    <details
      ref={ref}
      className="group"
      onToggle={(e) => {
        try {
          sessionStorage.setItem(KEY, (e.currentTarget as HTMLDetailsElement).open ? "1" : "0");
        } catch {
          /* ignore */
        }
      }}
    >
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-1 py-1 text-sm font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="transition group-open:rotate-90">›</span> More filters
        {active > 0 && <span className="rounded-full bg-ink px-1.5 text-xs text-white">{active}</span>}
      </summary>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </details>
  );
}
