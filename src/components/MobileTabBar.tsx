"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, SECTIONS } from "./Nav";

// Simple line icons, drawn here so there's no icon library to load.
const ICON: Record<string, React.ReactNode> = {
  home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
  jobs: <path d="M4 8h16v11H4zM9 8V5h6v3" />,
  sell: <path d="M4 12l8-8h7v7l-8 8zM15 8.5h.01" />,
  saved: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  ask: <path d="M5 5h14v10H9l-4 4zM9 10h.01M12 10h.01M15 10h.01" />,
};

function Icon({ name, on }: { name: string; on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICON[name]}
    </svg>
  );
}

const TABS = [
  { key: "home", label: "Home", section: { href: "/", label: "Home", also: [] as string[] } },
  { key: "jobs", label: "Jobs", section: SECTIONS[0]! },
  { key: "sell", label: "You'd Sell", section: SECTIONS[1]! },
  { key: "saved", label: "Saved", section: SECTIONS[4]! },
  { key: "ask", label: "Ask Josh", section: { href: "/ask", label: "Ask Josh", also: [] as string[] } },
];

/**
 * Phones: the main menu at the bottom, under your thumb, like an app. Everything else is in the
 * ☰ menu at the top. White bar with a strong top line so it doesn't blend into the page or
 * Safari's own bar. Hidden on a job's own page, which has its own Save / Apply bar in the same spot.
 */
export function MobileTabBar() {
  const path = usePathname();
  const onJobPage = /^\/jobs\/[^/]+$/.test(path);
  if (onJobPage || path.startsWith("/admin") || path.startsWith("/review")) return null;

  return (
    <nav
      aria-label="Menu"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(22,20,15,0.08)] sm:hidden"
    >
      {TABS.map((t) => {
        const on = t.key === "home" ? path === "/" : isActive(path, t.section);
        return (
          <Link
            key={t.key}
            href={t.section.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-xs ${on ? "font-semibold text-accent" : "font-medium text-ink"}`}
          >
            {on && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-accent" />}
            <Icon name={t.key} on={on} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
