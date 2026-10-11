"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/for-you", label: "For You" },
  { href: "/new", label: "New Today" },
  { href: "/jobs", label: "All Jobs" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/companies", label: "Companies" },
  { href: "/alerts", label: "Alerts" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto text-sm [scrollbar-width:none]">
      {ITEMS.map((i) => {
        const active = path === i.href || (i.href !== "/" && path.startsWith(i.href + "/"));
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 ${active ? "bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-2 hover:text-ink"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
