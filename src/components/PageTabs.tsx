import Link from "next/link";

/**
 * Tabs at the top of a section ("All · For You · New today"). The menu has one entry per section;
 * the views inside a section live here instead of crowding the menu.
 */
export function PageTabs({ tabs, active }: { tabs: { href: string; label: string }[]; active: string }) {
  return (
    <nav aria-label="Views" className="-mx-1 mb-4 flex gap-1 overflow-x-auto text-sm [scrollbar-width:none]">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === active ? "page" : undefined}
          className="whitespace-nowrap rounded-full border border-line px-3 py-1 text-ink-2 hover:border-line-strong hover:text-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export const JOB_TABS = [
  { href: "/jobs", label: "All jobs" },
  { href: "/for-you", label: "For You" },
  { href: "/new", label: "New today" },
];

export const SAVED_TABS = [
  { href: "/watchlist", label: "Saved jobs & searches" },
  { href: "/alerts", label: "Alert emails" },
];
