"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; also?: string[] }[] = [
  { href: "/for-you", label: "For You" },
  { href: "/new", label: "New Today" },
  { href: "/products", label: "What You'd Sell" },
  { href: "/jobs", label: "All Jobs" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/salaries", label: "Salaries" },
  { href: "/outreach", label: "Toolkit", also: ["/kit", "/cold-call", "/proof-page"] },
  { href: "/alerts", label: "Alerts" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex gap-0.5 overflow-x-auto xl:gap-1 text-sm [scrollbar-width:none]">
      {ITEMS.map((i) => {
        const active = [i.href, ...(i.also ?? [])].some((h) => path === h || (h !== "/" && path.startsWith(h + "/")));
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`whitespace-nowrap rounded-md px-1.5 py-1.5 xl:px-2.5 ${active ? "bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-2 hover:text-ink"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
