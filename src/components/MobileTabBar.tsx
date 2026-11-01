"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions";
import { isActive, SECTIONS } from "./Nav";
import { useMe } from "./useMe";

// Simple line icons, drawn here so there's no icon library to load.
const ICON: Record<string, React.ReactNode> = {
  jobs: <path d="M4 8h16v11H4zM9 8V5h6v3" />,
  sell: <path d="M4 12l8-8h7v7l-8 8zM15 8.5h.01" />,
  saved: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  ask: <path d="M5 5h14v10H9l-4 4zM9 10h.01M12 10h.01M15 10h.01" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICON[name]}
    </svg>
  );
}

const TABS = [
  { key: "jobs", label: "Jobs", section: SECTIONS[0]! },
  { key: "sell", label: "You'd Sell", section: SECTIONS[1]! },
  { key: "saved", label: "Saved", section: SECTIONS[4]! },
  { key: "ask", label: "Ask Josh", section: { href: "/ask", label: "Ask Josh", also: [] } },
];

/**
 * Phones: the menu lives at the bottom, under your thumb, like an app. Five tabs, the rest under More.
 * Hidden on a job's own page, which has its own Save / Apply bar in the same spot.
 */
export function MobileTabBar() {
  const path = usePathname();
  const me = useMe();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const onJobPage = /^\/jobs\/[^/]+$/.test(path);
  if (onJobPage || path.startsWith("/admin") || path.startsWith("/review")) return null;

  const more = [
    { href: "/salaries", label: "Salaries" },
    { href: "/outreach", label: "Toolkit" },
    { href: "/alerts", label: "Alert emails" },
    { href: "/employers", label: "Employers: sponsor a job" },
    ...(me?.admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  const moreActive = more.some((m) => path === m.href || path.startsWith(m.href + "/")) || ["/kit", "/cold-call", "/proof-page"].some((h) => path.startsWith(h));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink/20 sm:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-line bg-bg p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {more.map((m) => (
              <Link key={m.href} href={m.href} className="block rounded-lg px-4 py-3 text-[15px] hover:bg-surface">
                {m.label}
              </Link>
            ))}
            <div className="mt-1 border-t border-line pt-1">
              {me ? (
                <form action={signOut}>
                  <button className="w-full rounded-lg px-4 py-3 text-left text-[15px] text-ink-2 hover:bg-surface">
                    Sign out{me.email && <span className="block truncate text-xs text-ink-3">{me.email}</span>}
                  </button>
                </form>
              ) : (
                <Link href="/login" className="block rounded-lg px-4 py-3 text-[15px] font-semibold hover:bg-surface">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      <nav
        aria-label="Menu"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {TABS.map((t) => {
          const on = isActive(path, t.section);
          return (
            <Link
              key={t.key}
              href={t.section.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${on ? "font-semibold text-ink" : "text-ink-3"} ${t.key === "ask" && !on ? "text-accent" : ""}`}
            >
              <Icon name={t.key} />
              {t.label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${open || moreActive ? "font-semibold text-ink" : "text-ink-3"}`}
        >
          <Icon name="more" />
          More
        </button>
      </nav>
    </>
  );
}
